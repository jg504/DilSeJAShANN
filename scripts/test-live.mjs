// Tests for live mode.
//
// This runs unattended across the three wedding days and cannot be fixed while
// it is running, so every state, every transition and every timezone is pinned
// down here rather than checked by hand in December.
//
// Run with `npm test`.

const L = await import('../src/lib/live.ts');
const T = await import('../src/lib/time.ts');

let passed = 0;
const failures = [];
const eq = (label, got, want) => {
  if (JSON.stringify(got) === JSON.stringify(want)) passed++;
  else failures.push(`${label}\n      got  ${JSON.stringify(got)}\n      want ${JSON.stringify(want)}`);
};

const fn = (name, date, times, venue = 'V') => ({ name, date, venue, mapsUrl: 'M', times });

// The full three-day shape: Cocktails, the Wedding with two ceremonies, the
// Reception.
const ALL = [
  fn('Cocktails', '2026-12-26', [{ label: '', at: '7:30 pm' }]),
  fn('Wedding', '2026-12-27', [
    { label: 'Anand Karaj', at: '11:00 am' },
    { label: 'Phere', at: '4:30 pm' },
  ]),
  fn('Reception', '2026-12-28', [{ label: '', at: '8:00 pm' }]),
];

const at = (s) => T.fakedNow(s);
const state = (fns, when) => {
  const st = L.stateAt(L.plan(fns), at(when));
  return st.kind === 'now' || st.kind === 'next' ? `${st.kind}:${st.fn.name}` : st.kind;
};

// --- the three states and both transitions ---------------------------------
eq('long before', state(ALL, '2026-08-22T10:00'), 'before');
eq('day before', state(ALL, '2026-12-25T12:00'), 'before');
eq('one minute before the window', state(ALL, '2026-12-25T23:59'), 'before');
eq('the instant the window opens', state(ALL, '2026-12-26T00:00'), 'next:Cocktails');
eq('morning of the first day', state(ALL, '2026-12-26T09:00'), 'next:Cocktails');
eq('one minute before cocktails', state(ALL, '2026-12-26T19:29'), 'next:Cocktails');
eq('cocktails start exactly', state(ALL, '2026-12-26T19:30'), 'now:Cocktails');
eq('during cocktails', state(ALL, '2026-12-26T21:00'), 'now:Cocktails');
eq('cocktails just ended', state(ALL, '2026-12-26T23:31'), 'next:Wedding');
eq('wedding morning before start', state(ALL, '2026-12-27T09:00'), 'next:Wedding');
eq('anand karaj', state(ALL, '2026-12-27T11:30'), 'now:Wedding');
eq('between the two ceremonies', state(ALL, '2026-12-27T14:00'), 'now:Wedding');
eq('phere', state(ALL, '2026-12-27T17:00'), 'now:Wedding');
eq('after the wedding', state(ALL, '2026-12-27T22:00'), 'next:Reception');
eq('reception day, before it starts', state(ALL, '2026-12-28T12:00'), 'next:Reception');
eq('during the reception', state(ALL, '2026-12-28T21:00'), 'now:Reception');
eq('the morning after', state(ALL, '2026-12-29T09:00'), 'after');
eq('months later', state(ALL, '2027-06-01T09:00'), 'after');

// --- per-tier windows --------------------------------------------------------
// A Reception-only guest must see nothing while the Wedding is happening.
const RECEPTION_ONLY = [ALL[2]];
eq('reception-only, during the wedding', state(RECEPTION_ONLY, '2026-12-27T11:30'), 'before');
eq('reception-only, window opens on the 28th', state(RECEPTION_ONLY, '2026-12-28T00:00'), 'next:Reception');
eq('reception-only, during their event', state(RECEPTION_ONLY, '2026-12-28T21:00'), 'now:Reception');

// A Wedding-only guest is finished a day before everyone else.
const WEDDING_ONLY = [ALL[1]];
eq('wedding-only, during cocktails', state(WEDDING_ONLY, '2026-12-26T20:00'), 'before');
eq('wedding-only, their own day', state(WEDDING_ONLY, '2026-12-27T12:00'), 'now:Wedding');
eq('wedding-only, during the reception', state(WEDDING_ONLY, '2026-12-28T21:00'), 'after');

// --- timezone independence ---------------------------------------------------
// The same instant, written three ways, must give the same answer.
const SAME_INSTANT = ['2026-12-26T20:00+05:30', '2026-12-26T14:30+00:00', '2026-12-26T06:30-08:00'];
eq('same instant across timezones', SAME_INSTANT.map((w) => state(ALL, w)),
  ['now:Cocktails', 'now:Cocktails', 'now:Cocktails']);

// A bare time with no offset is read as IST, not as the machine's local zone.
eq('bare time is read as IST', at('2026-12-26T20:00'), Date.parse('2026-12-26T20:00:00+05:30'));

// --- unparseable and missing times -------------------------------------------
const NO_TIMES = [fn('Wedding', '2026-12-27', [{ label: '', at: '<<FILL>>' }])];
eq('unfilled time becomes all-day, not dropped', L.plan(NO_TIMES)[0].allDay, true);
eq('all-day event is live all day', state(NO_TIMES, '2026-12-27T03:00'), 'now:Wedding');
eq('all-day event is over the next day', state(NO_TIMES, '2026-12-28T00:01'), 'after');
eq('all-day event prints no time', L.timeLine(L.plan(NO_TIMES)[0]), '');

// One ceremony parseable, one not — the good one must still be used.
const HALF = [fn('Wedding', '2026-12-27', [
  { label: 'Anand Karaj', at: '11:00 am' },
  { label: 'Phere', at: '<<FILL>>' },
])];
eq('a half-filled function is not all-day', L.plan(HALF)[0].allDay, false);
eq('only the parseable time is printed', L.timeLine(L.plan(HALF)[0]), 'Anand Karaj 11:00 am');
eq('half-filled still goes live at the known time', state(HALF, '2026-12-27T11:30'), 'now:Wedding');

// --- ordering ----------------------------------------------------------------
// Functions listed out of order must still be planned chronologically.
const SHUFFLED = [ALL[2], ALL[0], ALL[1]];
eq('plan sorts by start', L.plan(SHUFFLED).map((p) => p.name), ['Cocktails', 'Wedding', 'Reception']);
eq('shuffled input gives the same state', state(SHUFFLED, '2026-12-27T11:30'), 'now:Wedding');

// --- degenerate input ---------------------------------------------------------
eq('no functions', L.stateAt(L.plan([]), at('2026-12-27T11:30')).kind, 'before');
eq('an unparseable ?now= falls back to before', L.stateAt(L.plan(ALL), NaN).kind, 'before');
eq('garbage ?now= is rejected', T.fakedNow('not-a-date'), null);
eq('empty ?now= is rejected', T.fakedNow(''), null);

// --- time parsing --------------------------------------------------------------
eq('24h', T.minutes('18:30'), 18 * 60 + 30);
eq('12h pm', T.minutes('6:30 pm'), 18 * 60 + 30);
eq('12h am', T.minutes('6:30 am'), 6 * 60 + 30);
eq('midnight is zero, not noon', T.minutes('12:00 am'), 0);
eq('noon stays noon', T.minutes('12:00 pm'), 12 * 60);
eq('dot separator', T.minutes('6.30pm'), 18 * 60 + 30);
eq('uppercase meridiem', T.minutes('6:30 PM'), 18 * 60 + 30);
eq('out of range hour', T.minutes('25:00'), null);
eq('out of range minute', T.minutes('10:75'), null);
eq('placeholder', T.minutes('<<FILL>>'), null);
eq('empty', T.minutes(''), null);
eq('undefined', T.minutes(undefined), null);

// --- day labels ----------------------------------------------------------------
const planned = L.plan(ALL);
eq('today', L.dayLabel(planned[1], at('2026-12-27T09:00')), 'Today');
eq('not today', L.dayLabel(planned[2], at('2026-12-27T09:00')), '28 December');
// Late on the 27th in IST is still the 27th, even though it is a different
// date in UTC.
eq('late IST evening is still today', L.dayLabel(planned[1], at('2026-12-27T23:30')), 'Today');


// --- countdown day maths ------------------------------------------------------
// Rounds up, so any part of the day before counts as one. Zero or negative
// means the day has arrived and live mode owns the page.
eq('a week out', T.daysUntil('2026-12-26', at('2026-12-19T00:00')), 7);
eq('two days out', T.daysUntil('2026-12-26', at('2026-12-24T00:00')), 2);
eq('the eve, morning', T.daysUntil('2026-12-26', at('2026-12-25T09:00')), 1);
eq('the eve, one minute to midnight', T.daysUntil('2026-12-26', at('2026-12-25T23:59')), 1);
eq('midnight exactly is zero', T.daysUntil('2026-12-26', at('2026-12-26T00:00')), 0);
eq('during the day is zero or less', T.daysUntil('2026-12-26', at('2026-12-26T12:00')), 0);
eq('the day after is negative', T.daysUntil('2026-12-26', at('2026-12-27T12:00')), -1);
// A guest on a London clock at 20:00 GMT on the 25th is already past midnight
// IST on the 26th, so their countdown must be over, not showing "Tomorrow".
eq('london clock past IST midnight', T.daysUntil('2026-12-26', at('2026-12-25T20:00+00:00')), 0);
eq('garbage date is safe', T.daysUntil('not-a-date', at('2026-12-25T09:00')), 0);


// --- which venue to send a guest to, right now --------------------------------
// The Wedding runs across two venues next door to each other. Showing the
// function's venue all day would send someone arriving for the Anand Karaj into
// the wrong building.
const TWO_VENUE = [fn('Wedding', '2026-12-27', [
  { label: 'Anand Karaj', at: '11:00 am', venue: 'Gurudwara', mapsUrl: 'G' },
  { label: 'Phere', at: '2:00 pm', venue: 'Club Patio', mapsUrl: 'C' },
], 'Club Patio')];
const tv = L.plan(TWO_VENUE)[0];

eq('before either ceremony, point at the first',
  L.whereNow(tv, at('2026-12-27T09:00')).venue, 'Gurudwara');
eq('at the anand karaj', L.whereNow(tv, at('2026-12-27T11:30')).venue, 'Gurudwara');
eq('one minute before the phere', L.whereNow(tv, at('2026-12-27T13:59')).venue, 'Gurudwara');
eq('at the phere exactly', L.whereNow(tv, at('2026-12-27T14:00')).venue, 'Club Patio');
eq('during the phere', L.whereNow(tv, at('2026-12-27T16:00')).venue, 'Club Patio');
eq('the pin follows the venue', L.whereNow(tv, at('2026-12-27T11:30')).mapsUrl, 'G');
eq('and switches with it', L.whereNow(tv, at('2026-12-27T16:00')).mapsUrl, 'C');

// Ceremonies listed out of order must not change the answer.
const REVERSED = [fn('Wedding', '2026-12-27', [
  { label: 'Phere', at: '2:00 pm', venue: 'Club Patio', mapsUrl: 'C' },
  { label: 'Anand Karaj', at: '11:00 am', venue: 'Gurudwara', mapsUrl: 'G' },
], 'Club Patio')];
eq('order in the data does not matter',
  L.whereNow(L.plan(REVERSED)[0], at('2026-12-27T11:30')).venue, 'Gurudwara');

// A function with one venue falls back to its own.
const ONE_VENUE = [fn('Reception', '2026-12-28', [{ label: '', at: '8:00 pm' }], 'The Oberoi')];
eq('single-venue function uses its own',
  L.whereNow(L.plan(ONE_VENUE)[0], at('2026-12-28T21:00')).venue, 'The Oberoi');

// An all-day function has no segments at all.
const ALLDAY = [fn('Wedding', '2026-12-27', [{ label: '', at: '<<FILL>>' }], 'Somewhere')];
eq('all-day falls back to the function venue',
  L.whereNow(L.plan(ALLDAY)[0], at('2026-12-27T12:00')).venue, 'Somewhere');
eq('all-day has no active segment',
  L.activeSegment(L.plan(ALLDAY)[0], at('2026-12-27T12:00')), null);

// A ceremony with a time but no venue of its own inherits the function's.
const PARTIAL = [fn('Wedding', '2026-12-27', [
  { label: 'Anand Karaj', at: '11:00 am' },
  { label: 'Phere', at: '2:00 pm', venue: 'Club Patio', mapsUrl: 'C' },
], 'Main Hall')];
eq('a ceremony without its own venue inherits',
  L.whereNow(L.plan(PARTIAL)[0], at('2026-12-27T11:30')).venue, 'Main Hall');

// --- report ---------------------------------------------------------------------
if (failures.length) {
  console.error(`\nLIVE MODE TESTS FAILED — ${failures.length} of ${passed + failures.length}:\n`);
  for (const f of failures) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}
console.log(`\nLIVE MODE TESTS PASSED — ${passed} assertions.\n`);
