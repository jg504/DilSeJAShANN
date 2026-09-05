// Post-build verification against dist/.
//
// validate-invites.mjs checks the CONTENT before a build. This checks the
// OUTPUT after one — the invariants that would be catastrophic to get wrong and
// are invisible in source review, above all tier privacy.
//
// Run with `npm run verify` after any build. It exits non-zero on failure.

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
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

/**
 * A page's HTML plus every script bundle it loads.
 *
 * Astro inlines small scripts but bundles ones that import a module, so
 * behaviour checked in the HTML alone silently "disappears" the moment a
 * script gains an import — which is exactly what happened when the phone
 * logic moved into a tested module.
 */
function pageAndScripts(page) {
  let text = read(page);
  for (const m of text.matchAll(/<script[^>]+src="([^"]+\.js)"/g)) {
    const p = join(dist, m[1].replace(/^\//, ''));
    if (existsSync(p)) text += '\n' + readFileSync(p, 'utf8');
  }
  return text;
}

for (const s of slugs) {
  const rsvp = read(`i/${s}/rsvp/index.html`);
  const withJs = pageAndScripts(`i/${s}/rsvp/index.html`);
  // A guest with JavaScript off must not meet a form that silently does nothing.
  if (!rsvp.includes('<noscript')) fail(`i/${s}/rsvp: no <noscript> fallback`);
  // Validation errors have to be announced, not just displayed.
  if (!rsvp.includes('role="alert"')) fail(`i/${s}/rsvp: errors are not announced`);
  if (!rsvp.includes('aria-live')) fail(`i/${s}/rsvp: step changes are not announced`);
  // Enter must advance, and back must step back rather than leave the form.
  if (!withJs.includes('popstate')) fail(`i/${s}/rsvp: no history handling`);
  // The record key must come from the tested module, not a private copy.
  if (!/normalis|replace\(\/\\D\/g/.test(withJs)) {
    fail(`i/${s}/rsvp: no phone normalisation reachable from the page`);
  }
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
function envVar(name) {
  if (process.env[name]) return process.env[name];
  if (existsSync(join(root, '.env'))) {
    const m = readFileSync(join(root, '.env'), 'utf8').match(new RegExp(`^${name}=(.*)$`, 'm'));
    if (m) return m[1].trim();
  }
  return '';
}
// The two gates are deliberately different, and this mirrors them exactly:
//
//   /share  needs ACCESS_READY only — it embeds no token, just the links.
//   /admin  needs ACCESS_READY AND ADMIN_KEY — it embeds a token that can read
//           every guest's name and phone number.
//
// Keying either off the token alone would publish all seven links the moment
// someone set ADMIN_KEY to make the dashboards work, which is a normal thing
// to do and is exactly how this nearly went wrong.
const accessReady = Boolean(envVar('ACCESS_READY'));
const adminKeySet = Boolean(envVar('ADMIN_KEY')) && accessReady;
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
if (shareHasSlugs !== accessReady) {
  fail(
    `share: links ${shareHasSlugs ? 'exposed' : 'withheld'} but ACCESS_READY is ${accessReady ? 'set' : 'unset'}`
  );
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
// Measured per page and gzipped, as Cloudflare actually serves it. Summing
// every file in _astro overstates it — a page loads only its own bundles.
const KB = (n) => `${(n / 1024).toFixed(1)}KB`;
const gz = (rel) => (existsSync(join(dist, rel)) ? gzipSync(readFileSync(join(dist, rel)), { level: 9 }).length : 0);

const raw = (rel) => (existsSync(join(dist, rel)) ? statSync(join(dist, rel)).size : 0);

/**
 * Images, counted at their RAW size — they are already compressed, and gzipping
 * a webp again measures nothing anyone will ever download.
 *
 * Only eagerly-loaded images count against the above-the-fold budget; a lazy
 * one costs nothing until the guest scrolls to it. Where an image offers a
 * srcset, the LARGEST candidate is counted, because that is what a 2x or 3x
 * phone actually fetches — and every guest is on a phone.
 *
 * This existed as a hole until 2026-09-05: the weight check matched only .js
 * and .css, so the monogram was invisible to it. Harmless at 6KB. Not harmless
 * when the photographs land, which is the exact case CLAUDE.md calls "the
 * entire performance story".
 */
function images(html) {
  let eagerBytes = 0;
  let eager = 0;
  let lazy = 0;
  for (const tag of html.matchAll(/<img\b[^>]*>/g)) {
    const t = tag[0];
    const isLazy = /loading="lazy"/.test(t);
    const candidates = [...t.matchAll(/\/_astro\/[^\s"',]+\.(?:webp|avif|png|jpe?g|gif|svg)/g)].map((m) =>
      m[0].replace(/^\//, '')
    );
    if (!candidates.length) continue;
    if (isLazy) {
      lazy++;
      continue;
    }
    eager++;
    eagerBytes += Math.max(...candidates.map(raw));
  }
  return { eagerBytes, eager, lazy };
}

function pageWeight(page) {
  const html = read(page);
  let bytes = gz(page);
  let requests = 1;
  for (const m of html.matchAll(/(?:src|href)="(\/_astro\/[^"]+\.(?:js|css))"/g)) {
    bytes += gz(m[1].replace(/^\//, ''));
    requests++;
  }
  const img = images(html);
  return { bytes: bytes + img.eagerBytes, requests: requests + img.eager, ...img };
}

const fontBytes = ['fonts/playfair-display-latin.woff2', 'fonts/source-sans-3-latin.woff2'].reduce(
  (a, f) => a + size(f),
  0
);

const invite = pageWeight(`i/${slugs[0]}/index.html`);
const rsvp = pageWeight(`i/${slugs[0]}/rsvp/index.html`);
// Class B: no meaningful weight cap below the fold, but the first screen still
// has to arrive. This is the page the photographs land on, so it is the one
// worth watching once they do.
const story = pageWeight('story/index.html');
const aboveFold = invite.bytes + fontBytes;

notes.push(
  `invitation: ${KB(invite.bytes)} gz + ${KB(fontBytes)} fonts = ${KB(aboveFold)} in ${invite.requests + 2} requests` +
    ` (${invite.eager} eager image${invite.eager === 1 ? '' : 's'}, ${invite.lazy} lazy)`
);
notes.push(`rsvp page:  ${KB(rsvp.bytes)} gz in ${rsvp.requests} requests`);
notes.push(
  `story page: ${KB(story.bytes + fontBytes)} first screen in ${story.requests + 2} requests` +
    ` (${story.eager} eager image${story.eager === 1 ? '' : 's'}, ${story.lazy} lazy)`
);

// Class A budget: above the fold under ~800KB, LCP under 2.5s on Slow 4G.
if (aboveFold > 800 * 1024) fail(`above-the-fold payload ${KB(aboveFold)} exceeds the 800KB budget`);
if (size('og.png') > 300 * 1024) fail(`og.png ${KB(size('og.png'))} exceeds 300KB`);

// Class B first screen, per CLAUDE.md. Only eager images count — everything
// below the fold is lazy and costs nothing until the guest scrolls.
const storyFirstScreen = story.bytes + fontBytes;
if (storyFirstScreen > 1024 * 1024) {
  fail(`story page first screen ${KB(storyFirstScreen)} exceeds the 1MB budget`);
}

// What actually costs LCP is render-BLOCKING work, not request count. A
// type="module" script is deferred and cannot delay first paint, so counting
// all sub-resources equally flagged a change that was in fact free.
const inviteHtml = read(`i/${slugs[0]}/index.html`);
const blockingCss = [...inviteHtml.matchAll(/<link[^>]+rel="stylesheet"[^>]*>/g)].length;
const blockingJs = [...inviteHtml.matchAll(/<script([^>]*\ssrc=[^>]*)>/g)].filter(
  (m) => !/\btype="module"/.test(m[1]) && !/\bdefer\b/.test(m[1]) && !/\basync\b/.test(m[1])
).length;

if (blockingCss > 1) fail(`invitation page has ${blockingCss} blocking stylesheets, expected 1`);
if (blockingJs > 0) fail(`invitation page has ${blockingJs} render-blocking script(s), expected 0`);
notes.push(`invitation blocking resources: ${blockingCss} css, ${blockingJs} js`);

// ---------------------------------------------------------------- report
for (const n of notes) console.log(`  note: ${n}`);
if (fails.length) {
  console.error(`\nVERIFY FAILED — ${fails.length} problem(s):\n`);
  for (const f of fails) console.error(`  ✗ ${f}`);
  console.error('');
  process.exit(1);
}
console.log(`\nVERIFY PASSED — ${slugs.length} invitations checked against dist/.\n`);
