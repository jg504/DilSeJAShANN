// Tests for the derived RSVP reports.
//
// These numbers decide how many beds are booked and how much food is ordered,
// so the arithmetic is checked against a fixture worked out by hand rather
// than eyeballed in a dashboard.
//
// Run with `npm test`.

// Node 23+ strips TypeScript types on import, so the module under test is
// loaded directly. No test runner and no build step added to the project.
const R = await import('../src/lib/report.ts');

let passed = 0;
const failures = [];
const eq = (label, got, want) => {
  const a = JSON.stringify(got);
  const b = JSON.stringify(want);
  if (a === b) passed++;
  else failures.push(`${label}\n      got  ${a}\n      want ${b}`);
};

const row = (o) => ({
  submission_id: '', timestamp: '', slug: '', index: '', side: 'groom', name: '',
  phone_e164: '', additional_guests: '', count_f1: '0', count_f2: '0', count_f3: '0',
  accommodation: '', travellers: '', nights: '', dietary: '', notes: '', superseded: '',
  ...o,
});

// --- fixture, worked out by hand ------------------------------------------
// accom links in this fixture: ACCOM1. Everything else was never offered a bed.
const ACCOM = ['ACCOM1'];

const rows = [
  // 1. full house, needs beds on the 27th and 28th, has a dietary note
  row({ name: 'Aarti', phone_e164: '+911', slug: 'ACCOM1', count_f1: '2', count_f2: '4', count_f3: '4',
        accommodation: 'yes', travellers: '3', nights: '27|28', dietary: 'Jain' }),
  // 2. attending, no bed
  row({ name: 'Bala', phone_e164: '+912', slug: 'PLAIN2', count_f2: '2', count_f3: '2' }),
  // 3. declined — zeros everywhere
  row({ name: 'Chetan', phone_e164: '+913', slug: 'PLAIN2' }),
  // 4 + 5. resubmission: the old row is superseded, one current row remains
  row({ name: 'Dev old', phone_e164: '+914', slug: 'PLAIN2', count_f2: '2', superseded: 'yes' }),
  row({ name: 'Dev new', phone_e164: '+914', slug: 'PLAIN2', count_f2: '3' }),
  // 6. never offered a bed, but asks for one in the notes
  row({ name: 'Eshan', phone_e164: '+915', slug: 'PLAIN3', count_f2: '1',
        notes: 'Might we need a room for the night? Travelling from Pune.' }),
  // 7 + 8. supersede failed — two live rows for one number
  row({ name: 'Farah A', phone_e164: '+916', slug: 'PLAIN2', count_f2: '2' }),
  row({ name: 'Farah B', phone_e164: '+916', slug: 'PLAIN2', count_f2: '1' }),
  // 9. accom asked for but no nights ticked — must not count toward any night
  row({ name: 'Gita', phone_e164: '+917', slug: 'ACCOM1', count_f2: '1',
        accommodation: 'yes', travellers: '2', nights: '' }),
  // 10. said no to accommodation but a traveller count lingers from the UI
  row({ name: 'Hari', phone_e164: '+918', slug: 'ACCOM1', count_f2: '1',
        accommodation: 'no', travellers: '4', nights: '26|27' }),
];

eq('current rows excludes superseded', R.current(rows).length, 9);

// f1: 2. f2: 4+2+0+3+1+2+1+1+1 = 15. f3: 4+2 = 6
eq('headcount per function', R.headcount(rows), { f1: 2, f2: 15, f3: 6 });

eq('declines are zero-rows only', R.declined(rows).map((r) => r.name), ['Chetan']);

// Only Aarti counts: 3 people on the 27th and the 28th. Gita listed no nights,
// and Hari answered no, so neither contributes.
eq('bed-nights', R.bedNights(rows), { '26': 0, '27': 3, '28': 3 });

eq('kitchen list', R.kitchen(rows).map((r) => r.name), ['Aarti']);

eq('buried accommodation requests', R.buried(rows, ACCOM).map((r) => r.name), ['Eshan']);

const rep = R.repeats(rows);
eq('duplicate live rows flagged', rep.duplicates, ['+916']);
eq('clean resubmission not flagged as duplicate', rep.resubmitted, ['+914']);

// --- edge cases -------------------------------------------------------------
eq('empty input is safe', R.headcount([]), { f1: 0, f2: 0, f3: 0 });
eq('empty input bed-nights', R.bedNights([]), { '26': 0, '27': 0, '28': 0 });
eq('non-numeric counts treated as zero', R.num('abc'), 0);
eq('missing value treated as zero', R.num(undefined), 0);
eq('a stray night value is ignored',
  R.bedNights([row({ accommodation: 'yes', travellers: '5', nights: '25|27' })]),
  { '26': 0, '27': 5, '28': 0 });
eq('blank dietary is not a kitchen entry',
  R.kitchen([row({ dietary: '   ' })]).length, 0);
eq('notes without a bed word are not flagged',
  R.buried([row({ slug: 'PLAIN2', notes: 'Looking forward to it!' })], ACCOM).length, 0);
eq('a guest on an accom link is never flagged as buried',
  R.buried([row({ slug: 'ACCOM1', notes: 'need a room' })], ACCOM).length, 0);

// --- report -----------------------------------------------------------------
if (failures.length) {
  console.error(`\nREPORT TESTS FAILED — ${failures.length} of ${passed + failures.length}:\n`);
  for (const f of failures) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}
console.log(`\nREPORT TESTS PASSED — ${passed} assertions.\n`);
