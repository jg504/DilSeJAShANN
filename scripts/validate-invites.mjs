// Build-time validation for src/data/invites.json.
//
// Two people edit that file. A record missing a venue, or still holding a
// <<FILL>>, must never ship as a live invitation page. This runs as `prebuild`,
// so `npm run build` fails loudly. `npm run build:draft` skips it on purpose so
// UI work can continue before the content lands.
//
// Every problem is collected and printed at once rather than failing on the
// first — whoever is filling the file in should see the whole list.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const FILE = fileURLToPath(new URL('../src/data/invites.json', import.meta.url));

// The tier table from CLAUDE.md. Fixed once the links are distributed.
const TIERS = {
  1: { side: 'groom', functions: ['f1', 'f2', 'f3'], accom: true },
  2: { side: 'groom', functions: ['f2', 'f3'], accom: false },
  3: { side: 'groom', functions: ['f2'], accom: false },
  4: { side: 'groom', functions: ['f3'], accom: false },
  5: { side: 'bride', functions: ['f2', 'f3'], accom: true },
  6: { side: 'bride', functions: ['f2'], accom: false },
  7: { side: 'bride', functions: ['f3'], accom: false },
};

const SLUG = /^[a-z0-9]{5}[a-z][1-7]$/;
const VALID_NIGHTS = ['26', '27', '28'];

const errors = [];
const fail = (msg) => errors.push(msg);

const data = JSON.parse(readFileSync(FILE, 'utf8'));

// --- <<FILL>> anywhere in the tree ------------------------------------------
const scanFill = (node, path) => {
  if (typeof node === 'string') {
    if (node.includes('<<FILL')) fail(`${path} is still <<FILL>>`);
  } else if (Array.isArray(node)) {
    node.forEach((v, i) => scanFill(v, `${path}[${i}]`));
  } else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) scanFill(v, `${path}.${k}`);
  }
};
scanFill(data, 'invites.json');

// --- required shape ----------------------------------------------------------
const require = (obj, keys, path) => {
  for (const k of keys) {
    if (obj?.[k] === undefined || obj?.[k] === null) fail(`${path}.${k} is missing`);
  }
};

const FUNCTION_KEYS = ['name', 'date', 'venue', 'address', 'mapsUrl', 'dressCode', 'dressColors'];

for (const [id, fn] of Object.entries(data.functions ?? {})) {
  require(fn, FUNCTION_KEYS, `functions.${id}`);
  const hasCeremonies = Array.isArray(fn.ceremonies) && fn.ceremonies.length > 0;
  if (!hasCeremonies && !fn.startTime) {
    fail(`functions.${id} needs either startTime or a ceremonies array`);
  }
  // The Wedding carries two ceremonies in one function. A guest reading only
  // one start time arrives at the wrong hour.
  if (hasCeremonies) {
    fn.ceremonies.forEach((c, i) => require(c, ['name', 'startTime'], `functions.${id}.ceremonies[${i}]`));
  }
}

for (const [name, side] of Object.entries(data.sides ?? {})) {
  require(side, ['greeting', 'contacts', 'hotel', 'travel'], `sides.${name}`);
  require(side.hotel, ['name', 'address', 'mapsUrl', 'note'], `sides.${name}.hotel`);
  require(side.travel, ['airport', 'station', 'cabNote'], `sides.${name}.travel`);
  if (!Array.isArray(side.contacts) || side.contacts.length === 0) {
    fail(`sides.${name}.contacts must have at least one contact`);
  } else {
    side.contacts.forEach((c, i) => require(c, ['name', 'phone'], `sides.${name}.contacts[${i}]`));
  }
}

// --- the seven records -------------------------------------------------------
const invites = data.invites ?? [];
if (invites.length !== 7) fail(`expected 7 invites, found ${invites.length}`);

const seenSlugs = new Set();
const seenIndexes = new Set();

for (const inv of invites) {
  const at = `invite ${inv.index ?? '?'}`;

  if (!SLUG.test(inv.slug ?? '')) {
    fail(`${at}: slug "${inv.slug}" must be 5 alphanumerics, a letter, then the index digit`);
  } else if (inv.slug.slice(-1) !== String(inv.index)) {
    fail(`${at}: slug "${inv.slug}" does not end in its own index digit`);
  }

  if (seenSlugs.has(inv.slug)) fail(`${at}: duplicate slug "${inv.slug}"`);
  seenSlugs.add(inv.slug);

  if (seenIndexes.has(inv.index)) fail(`${at}: duplicate index`);
  seenIndexes.add(inv.index);

  const tier = TIERS[inv.index];
  if (!tier) {
    fail(`${at}: index must be 1–7`);
    continue;
  }

  if (inv.side !== tier.side) fail(`${at}: side is "${inv.side}", expected "${tier.side}"`);

  if (JSON.stringify(inv.functions) !== JSON.stringify(tier.functions)) {
    fail(`${at}: functions ${JSON.stringify(inv.functions)}, expected ${JSON.stringify(tier.functions)}`);
  }

  for (const id of inv.functions ?? []) {
    if (!data.functions?.[id]) fail(`${at}: references unknown function "${id}"`);
  }

  if (!data.sides?.[inv.side]) fail(`${at}: references unknown side "${inv.side}"`);

  if (inv.accom !== tier.accom) fail(`${at}: accom is ${inv.accom}, expected ${tier.accom}`);

  // accom is the only switch controlling the accommodation block.
  if (tier.accom) {
    if (!Array.isArray(inv.nights) || inv.nights.length === 0) {
      fail(`${at}: accom is true but nights is empty`);
    } else {
      for (const n of inv.nights) {
        if (!VALID_NIGHTS.includes(n)) fail(`${at}: night "${n}" is not 26, 27 or 28`);
      }
    }
  } else if (inv.nights !== undefined) {
    fail(`${at}: accom is false but nights is set`);
  }
}

// --- report ------------------------------------------------------------------
if (errors.length > 0) {
  console.error(`\ninvites.json is not ready to ship — ${errors.length} problem(s):\n`);
  for (const e of errors) console.error(`  • ${e}`);
  console.error('\nRun `npm run build:draft` to build anyway while content is pending.\n');
  process.exit(1);
}

console.log(`invites.json OK — ${invites.length} records, all fields present.`);
