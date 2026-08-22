// Post-build verification against dist/.
//
// validate-invites.mjs checks the CONTENT before a build. This checks the
// OUTPUT after one — the invariants that would be catastrophic to get wrong and
// are invisible in source review, above all tier privacy.
//
// Run with `npm run verify` after any build. It exits non-zero on failure.

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = join(root, 'dist');
const invites = JSON.parse(readFileSync(join(root, 'src/data/invites.json'), 'utf8'));

const fails = [];
const notes = [];
const fail = (m) => fails.push(m);
const read = (p) => readFileSync(join(dist, p), 'utf8');
const size = (p) => (existsSync(join(dist, p)) ? statSync(join(dist, p)).size : 0);

const slugs = invites.invites.map((i) => i.slug);
const byS = Object.fromEntries(invites.invites.map((i) => [i.slug, i]));
const fnName = { f1: invites.functions.f1.name, f2: invites.functions.f2.name, f3: invites.functions.f3.name };

if (!existsSync(dist)) {
  console.error('dist/ does not exist — run a build first.');
  process.exit(1);
}

// ---------------------------------------------------------------- routes
for (const s of slugs) {
  for (const p of [`i/${s}/index.html`, `i/${s}/rsvp/index.html`]) {
    if (!existsSync(join(dist, p))) fail(`missing route: ${p}`);
  }
}
for (const p of ['index.html', '404.html', 'photos/index.html', 'ceremonies/index.html', 'robots.txt', 'og.png']) {
  if (!existsSync(join(dist, p))) fail(`missing: ${p}`);
}

// ---------------------------------------------------------------- stale output
// Astro only empties the top level of dist/, and Cloudflare restores a build
// output cache, so a directory from a slug that no longer exists can survive
// and ship. That would publish an invitation nobody is meant to hold.
const iDir = join(dist, 'i');
if (existsSync(iDir)) {
  for (const d of readdirSync(iDir)) {
    if (!slugs.includes(d)) fail(`stale directory in dist/i/: ${d} — run npm run clean`);
  }
}
for (const s of slugs) {
  // all.ics is the combined calendar and is expected on any link with more
  // than one function; every other .ics must correspond to a function.
  const allowed = [...byS[s].functions, ...(byS[s].functions.length > 1 ? ['all'] : [])];
  for (const f of readdirSync(join(dist, 'i', s))) {
    if (f.endsWith('.ics') && !allowed.includes(f.replace('.ics', ''))) {
      fail(`stale file: i/${s}/${f}`);
    }
  }
}

// ---------------------------------------------------------------- tier privacy
// The single most important rule in the repo. A guest discovering that other
// tiers exist is worse than any bug in this codebase.
const guestPages = [];
for (const s of slugs) {
  guestPages.push([`i/${s}/index.html`, s]);
  guestPages.push([`i/${s}/rsvp/index.html`, s]);
}

for (const [page, own] of guestPages) {
  const html = read(page);
  const isRsvp = page.endsWith('rsvp/index.html');

  for (const other of slugs) {
    if (other !== own && html.includes(other)) fail(`${page}: leaks slug ${other}`);
  }

  // The RSVP page must carry `side` — the sheet routes on it — but it is never
  // rendered, and the invitation page must not contain it at all.
  if (!isRsvp) {
    for (const w of ['groom', 'bride']) {
      if (new RegExp(`\\b${w}\\b`, 'i').test(html)) fail(`${page}: contains side name "${w}"`);
    }
  }
  for (const w of ['tier', 'Tier']) {
    if (new RegExp(`\\b${w}\\b`).test(html)) fail(`${page}: contains "${w}"`);
  }

  if (!html.includes('noindex')) fail(`${page}: missing noindex`);
  if (html.includes('/admin')) fail(`${page}: links to /admin`);
  if (/href="\/?share/.test(html)) fail(`${page}: links to /share`);
  if (html.includes('<<FILL')) notes.push(`${page}: still contains <<FILL>> (expected pre-launch)`);
}

// ---------------------------------------------------------------- gating
for (const s of slugs) {
  const inv = byS[s];
  const html = read(`i/${s}/index.html`);
  const rsvp = read(`i/${s}/rsvp/index.html`);

  for (const id of ['f1', 'f2', 'f3']) {
    const invited = inv.functions.includes(id);
    if (html.includes(`>${fnName[id]}<`) !== invited) {
      fail(`i/${s}: ${fnName[id]} ${invited ? 'missing' : 'present but not invited'}`);
    }
    // .ics endpoints must exist only for this link's functions.
    const ics = existsSync(join(dist, `i/${s}/${id}.ics`));
    if (ics !== invited) fail(`i/${s}/${id}.ics ${invited ? 'missing' : 'should not exist'}`);
    // RSVP steppers.
    const stepper = rsvp.includes(`data-fn="${id}"`);
    if (stepper !== invited) fail(`i/${s}/rsvp: stepper ${id} ${invited ? 'missing' : 'should not exist'}`);
  }

  // /ceremonies is linked only from invitations containing f2.
  const wantsCer = inv.functions.includes('f2');
  if (html.includes('/ceremonies') !== wantsCer) {
    fail(`i/${s}: ceremonies link should be ${wantsCer}`);
  }

  // accom is the only switch controlling the accommodation block. These strings
  // appear only in markup, never in the client script, so the whole document is
  // searched — an earlier attempt split on the first <script> and silently
  // discarded the entire body, since the head carries an inline script.
  const body = rsvp;
  if (body.includes('Do you need somewhere to stay') !== inv.accom) {
    fail(`i/${s}/rsvp: accommodation block should be ${inv.accom}`);
  }
  if (html.includes('Staying with us') !== inv.accom) {
    fail(`i/${s}: hotel block should be ${inv.accom}`);
  }

  // The hero date range must never imply days this guest is not invited to.
  const days = new Set([...html.matchAll(/\b(2[678]) December/g)].map((m) => m[1]));
  const want = new Set(inv.functions.map((f) => invites.functions[f].date.slice(8, 10).replace(/^0/, '')));
  if ([...days].sort().join() !== [...want].sort().join()) {
    fail(`i/${s}: dates ${[...days].sort()} but invited to ${[...want].sort()}`);
  }

  // The word "room" must not appear in the guest-facing form.
  if (/\broom/i.test(body)) fail(`i/${s}/rsvp: contains the word "room"`);
}

// ---------------------------------------------------------------- accessibility
// Each of these was a real defect found by auditing the built output, so each
// is now checked on every build rather than remembered.
for (const [page] of guestPages) {
  const html = read(page);
  const h1s = (html.match(/<h1[\s>]/g) || []).length;
  if (h1s !== 1) fail(`${page}: has ${h1s} <h1> elements, expected exactly 1`);
  if (!/<html[^>]*\blang=/.test(html)) fail(`${page}: <html> has no lang`);
  if (!html.includes('favicon.svg')) fail(`${page}: no favicon link`);
  if (!html.includes('theme-color')) fail(`${page}: no theme-color`);
  if (!html.includes('focus-visible')) fail(`${page}: no :focus-visible styles`);

  // Heading levels must not skip — h1 then h3 leaves a gap in the outline.
  const levels = [...html.matchAll(/<h([1-6])[\s>]/g)].map((m) => Number(m[1]));
  for (let i = 1; i < levels.length; i++) {
    if (levels[i] > levels[i - 1] + 1) {
      fail(`${page}: heading jumps from h${levels[i - 1]} to h${levels[i]}`);
    }
  }
}

for (const s of slugs) {
  const rsvp = read(`i/${s}/rsvp/index.html`);
  // A guest with JavaScript off must not meet a form that silently does nothing.
  if (!rsvp.includes('<noscript')) fail(`i/${s}/rsvp: no <noscript> fallback`);
  // Validation errors have to be announced, not just displayed.
  if (!rsvp.includes('role="alert"')) fail(`i/${s}/rsvp: errors are not announced`);
  if (!rsvp.includes('aria-live')) fail(`i/${s}/rsvp: step changes are not announced`);
  // Enter must advance, and back must step back rather than leave the form.
  if (!rsvp.includes('popstate')) fail(`i/${s}/rsvp: no history handling`);
}

for (const p of ['favicon.svg', 'favicon.ico', 'apple-touch-icon.png', '_headers']) {
  if (!existsSync(join(dist, p))) fail(`missing: ${p}`);
}

// ---------------------------------------------------------------- ics validity
// RFC 5545: content lines must not exceed 75 octets, and the file uses CRLF.
for (const s of slugs) {
  for (const id of byS[s].functions) {
    const p = join(dist, 'i', s, `${id}.ics`);
    if (!existsSync(p)) continue;
    const raw = readFileSync(p, 'utf8');
    if (!raw.includes('\r\n')) fail(`i/${s}/${id}.ics: not CRLF terminated`);
    for (const line of raw.split('\r\n')) {
      const octets = Buffer.byteLength(line, 'utf8');
      if (octets > 75) fail(`i/${s}/${id}.ics: ${octets}-octet line exceeds the RFC 5545 limit of 75`);
    }
    for (const req of ['BEGIN:VCALENDAR', 'BEGIN:VEVENT', 'UID:', 'DTSTAMP:', 'DTSTART', 'END:VCALENDAR']) {
      if (!raw.includes(req)) fail(`i/${s}/${id}.ics: missing ${req}`);
    }
  }
}

// ---------------------------------------------------------------- OG tags
const tagsOf = (html) =>
  Object.fromEntries(
    [...html.matchAll(/<meta (?:property|name)="((?:og|twitter):[^"]+)" content="([^"]*)"/g)].map((m) => [m[1], m[2]])
  );

let baseTags = null;
for (const s of slugs) {
  const t = tagsOf(read(`i/${s}/index.html`));
  const shared = { ...t };
  delete shared['og:url'];
  if (!baseTags) baseTags = shared;
  else if (JSON.stringify(shared) !== JSON.stringify(baseTags)) {
    fail(`i/${s}: preview copy differs from the other links`);
  }
  if (t['og:url'] !== `https://dilsejashann.com/i/${s}/`) fail(`i/${s}: wrong og:url`);
  for (const [k, v] of Object.entries(t)) {
    if (k === 'og:url') continue;
    for (const w of ['groom', 'bride', 'Cocktails', 'Wedding', 'Reception', '26', '27', '28']) {
      if (v.includes(w)) fail(`i/${s}: ${k} contains tier-revealing "${w}"`);
    }
  }
}
for (const p of ['index.html', '404.html']) {
  if (read(p).includes('og:image')) fail(`${p}: should carry no preview card`);
}

// ---------------------------------------------------------------- admin
// Astro loads .env at build time via Vite; plain node does not. Without this
// the check compares a build that had the key against a verifier that did not.
let envKey = process.env.ADMIN_KEY;
if (!envKey && existsSync(join(root, '.env'))) {
  const m = readFileSync(join(root, '.env'), 'utf8').match(/^ADMIN_KEY=(.*)$/m);
  if (m) envKey = m[1].trim();
}
const adminKeySet = Boolean(envKey);
for (const p of ['admin/groom/index.html', 'admin/bride/index.html', 'admin/combined/index.html']) {
  if (!existsSync(join(dist, p))) {
    fail(`missing: ${p}`);
    continue;
  }
  const html = read(p);
  if (!adminKeySet && html.includes('script.google.com')) {
    fail(`${p}: ships the endpoint without ADMIN_KEY set`);
  }
  if (!html.includes('noindex')) fail(`${p}: missing noindex`);
}
const share = read('share/index.html');
const shareHasSlugs = slugs.some((s) => share.includes(s));
if (shareHasSlugs !== adminKeySet) {
  fail(`share: links ${shareHasSlugs ? 'exposed' : 'withheld'} but ADMIN_KEY is ${adminKeySet ? 'set' : 'unset'}`);
}

// ---------------------------------------------------------------- robots
const robots = read('robots.txt');
if (!/User-agent:\s*\*/i.test(robots) || !/Disallow:\s*\//.test(robots)) {
  fail('robots.txt does not disallow everything');
}

// ---------------------------------------------------------------- motion
// Animating anything that triggers layout janks visibly on a low-end Android.
const cssDir = join(dist, '_astro');
const LAYOUT_PROPS = /(?:^|[\s,;{])(?:transition|animation)[^;}]*\b(width|height|top|left|right|bottom|margin|padding)\b/g;
if (existsSync(cssDir)) {
  for (const f of readdirSync(cssDir).filter((f) => f.endsWith('.css'))) {
    const css = readFileSync(join(cssDir, f), 'utf8');
    for (const m of css.matchAll(LAYOUT_PROPS)) {
      fail(`${f}: animates layout-triggering property "${m[1]}"`);
    }
  }
}

// ---------------------------------------------------------------- weight
// Class A budget: above the fold under ~800KB. LCP under 2.5s on Slow 4G.
const fonts = ['fonts/playfair-display-latin.woff2', 'fonts/source-sans-3-latin.woff2'].reduce(
  (a, f) => a + size(f),
  0
);
let css = 0;
let js = 0;
if (existsSync(cssDir)) {
  for (const f of readdirSync(cssDir)) {
    const s = statSync(join(cssDir, f)).size;
    if (f.endsWith('.css')) css += s;
    else if (f.endsWith('.js')) js += s;
  }
}
const inviteHtml = size(`i/${slugs[0]}/index.html`);
const aboveFold = inviteHtml + css + js + fonts;
const KB = (n) => `${(n / 1024).toFixed(1)}KB`;
notes.push(
  `invitation page weight: html ${KB(inviteHtml)} + css ${KB(css)} + js ${KB(js)} + fonts ${KB(fonts)} = ${KB(aboveFold)}`
);
if (aboveFold > 800 * 1024) fail(`above-the-fold payload ${KB(aboveFold)} exceeds the 800KB budget`);
if (size('og.png') > 300 * 1024) fail(`og.png ${KB(size('og.png'))} exceeds 300KB`);

// ---------------------------------------------------------------- report
for (const n of notes) console.log(`  note: ${n}`);
if (fails.length) {
  console.error(`\nVERIFY FAILED — ${fails.length} problem(s):\n`);
  for (const f of fails) console.error(`  ✗ ${f}`);
  console.error('');
  process.exit(1);
}
console.log(`\nVERIFY PASSED — ${slugs.length} invitations checked against dist/.\n`);
