// Tests for phone normalisation.
//
// phone_e164 is the record key for the sheet. A number mangled here is a guest
// who cannot be chased in December, so the awkward inputs people actually type
// are all pinned down here.
//
// Run with `npm test`.

const P = await import('../src/lib/phone.ts');
const { PRIORITY, REST } = await import('../src/data/countries.ts');

const byName = Object.fromEntries([...PRIORITY, ...REST].map((c, i) => [c.name + (i < PRIORITY.length ? '' : ''), c]));
const IN = PRIORITY[0]; // India   +91, 10 digits, 5-5
const US = PRIORITY[1]; // US      +1,  10 digits, 3-3-4
const AU = PRIORITY[3]; // AU      +61, 9 digits
const AE = PRIORITY[4]; // UAE     +971, 8-9 digits
const UK = PRIORITY[5]; // UK      +44, 10 digits
const SG = PRIORITY[6]; // SG      +65, 8 digits

let passed = 0;
const failures = [];
const eq = (label, got, want) => {
  if (JSON.stringify(got) === JSON.stringify(want)) passed++;
  else failures.push(`${label}\n      got  ${JSON.stringify(got)}\n      want ${JSON.stringify(want)}`);
};

// --- formatting a person actually types ------------------------------------
eq('plain indian', P.e164('9876543210', IN), '+919876543210');
eq('spaces', P.e164('98765 43210', IN), '+919876543210');
eq('trunk zero', P.e164('098765 43210', IN), '+919876543210');
eq('many leading zeros', P.e164('0098765 43210', IN), '+919876543210');
eq('dashes and brackets', P.e164('(415) 555-2671', US), '+14155552671');
eq('dots', P.e164('415.555.2671', US), '+14155552671');
eq('non-breaking space', P.e164('415 555 2671', US), '+14155552671');
eq('leading plus retyped', P.e164('+91 98765 43210', IN), '+919876543210');
eq('letters ignored', P.e164('call me 9876543210', IN), '+919876543210');

// --- the duplicated country code, the commonest mistake ---------------------
eq('country code typed twice, india', P.e164('919876543210', IN), '+919876543210');
eq('country code typed twice, us', P.e164('14155552671', US), '+14155552671');
eq('country code typed twice, uae', P.e164('971501234567', AE), '+971501234567');

// A genuine number whose own digits begin with the dial code must survive.
// 9198765432 is a valid-length 10-digit Indian number starting "91".
eq('national number that starts with its dial code is kept', P.e164('9198765432', IN), '+919198765432');
// Singapore +65: 65123456 is a real 8-digit number beginning "65".
eq('singapore number beginning 65 is kept', P.e164('65123456', SG), '+6565123456');

// --- validation --------------------------------------------------------------
eq('empty', P.problem('', IN), 'empty');
eq('only punctuation', P.problem('()- ', IN), 'empty');
eq('nine digits is short for india', P.problem('987654321', IN), 'too-short');
eq('ten digits is right for india', P.problem('9876543210', IN), null);
eq('eleven digits is long for india', P.problem('98765432109', IN), 'too-long');
eq('nine digits is right for australia', P.problem('412345678', AU), null);
eq('eight digits is right for singapore', P.problem('61234567', SG), null);
eq('uae accepts eight or nine', [P.problem('50123456', AE), P.problem('501234567', AE)], [null, null]);
eq('uk ten digits', P.problem('7911123456', UK), null);

// --- the confirmation echo ----------------------------------------------------
eq('echo us', P.pretty('4155552671', US), '+1 415 555 2671');
eq('echo india', P.pretty('9876543210', IN), '+91 98765 43210');
eq('echo singapore', P.pretty('61234567', SG), '+65 6123 4567');
eq('echo falls back when the grouping does not fit',
  P.pretty('12345', { dial: '91', min: 1, max: 20, group: [5, 5] }), '+91 12345');
eq('echo with no grouping defined',
  P.pretty('12345678', { dial: '99', min: 1, max: 20 }), '+99 12345678');
eq('echo of nothing is nothing', P.pretty('', IN), '');

// --- every country in the list is coherent -----------------------------------
for (const c of [...PRIORITY, ...REST]) {
  if (!/^\d{1,4}$/.test(c.dial)) failures.push(`${c.name}: dial "${c.dial}" is not 1-4 digits`);
  else if (c.min > c.max) failures.push(`${c.name}: min ${c.min} exceeds max ${c.max}`);
  else if (c.min < 4 || c.max > 15) failures.push(`${c.name}: length range ${c.min}-${c.max} is implausible`);
  else if (c.group && c.group.reduce((a, b) => a + b, 0) > c.max)
    failures.push(`${c.name}: grouping sums past max`);
  else passed++;
}

// India must be first — the list is ordered by guest spread, not alphabet.
eq('india is the first option', PRIORITY[0].name, 'India');
eq('priority list is the expected seven', PRIORITY.map((c) => c.name), [
  'India', 'United States', 'Canada', 'Australia', 'United Arab Emirates',
  'United Kingdom', 'Singapore',
]);
eq('rest of the list is alphabetical',
  REST.map((c) => c.name), [...REST.map((c) => c.name)].sort((a, b) => a.localeCompare(b)));

// --- report -------------------------------------------------------------------
if (failures.length) {
  console.error(`\nPHONE TESTS FAILED — ${failures.length} of ${passed + failures.length}:\n`);
  for (const f of failures) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}
console.log(`\nPHONE TESTS PASSED — ${passed} assertions.\n`);
