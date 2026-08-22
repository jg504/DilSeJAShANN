// Tests for iCalendar generation.
//
// Add to Calendar is the one button a guest presses on a phone, and a malformed
// file fails differently in every client — some truncate, some reject outright.
// The RFC 5545 rules that bite are line folding and CRLF.
//
// Run with `npm test`.

const I = await import('../src/lib/ics.ts');

let passed = 0;
const failures = [];
const eq = (label, got, want) => {
  if (JSON.stringify(got) === JSON.stringify(want)) passed++;
  else failures.push(`${label}\n      got  ${JSON.stringify(got)}\n      want ${JSON.stringify(want)}`);
};
const ok = (label, cond) => (cond ? passed++ : failures.push(label));

const octets = (s) => Buffer.byteLength(s, 'utf8');

/** Reverse the folding, the way a parser does: strip CRLF followed by a space. */
const unfold = (s) => s.replace(/\r\n /g, '');

// --- folding ----------------------------------------------------------------
eq('a short line is untouched', I.fold('SUMMARY:Wedding'), 'SUMMARY:Wedding');

const exactly75 = 'X'.repeat(75);
eq('exactly 75 octets is untouched', I.fold(exactly75), exactly75);

const seventySix = 'X'.repeat(76);
ok('76 octets folds', I.fold(seventySix).includes('\r\n '));
eq('folded content round-trips', unfold(I.fold(seventySix)), seventySix);

const long = 'LOCATION:' + 'A'.repeat(400);
const folded = I.fold(long);
ok('every folded line is within the limit',
  folded.split('\r\n').every((l) => octets(l) <= 75));
eq('long line round-trips exactly', unfold(folded), long);

// Multi-byte characters must never be split across a fold. An em dash is three
// octets; place them so a naive 75-byte cut lands mid-sequence.
const emDashes = 'SUMMARY:' + '—'.repeat(60);
const foldedDash = I.fold(emDashes);
ok('multi-byte line stays within the limit',
  foldedDash.split('\r\n').every((l) => octets(l) <= 75));
eq('multi-byte round-trips exactly', unfold(foldedDash), emDashes);
ok('no replacement characters introduced', !foldedDash.includes('�'));

// Devanagari, in case a venue name is not in Latin script.
const hindi = 'LOCATION:' + 'गुरुद्वारा साहिब गुरुग्राम '.repeat(8);
const foldedHindi = I.fold(hindi);
ok('devanagari stays within the limit',
  foldedHindi.split('\r\n').every((l) => octets(l) <= 75));
eq('devanagari round-trips exactly', unfold(foldedHindi), hindi);

// --- escaping ----------------------------------------------------------------
eq('commas escaped', I.esc('Gurugram, Haryana'), 'Gurugram\\, Haryana');
eq('semicolons escaped', I.esc('a;b'), 'a\\;b');
eq('backslashes escaped', I.esc('a\\b'), 'a\\\\b');
eq('newlines become literal \\n', I.esc('a\nb'), 'a\\nb');

// --- events -------------------------------------------------------------------
const NOW = '20260101T000000Z';
const timed = {
  name: 'Cocktails', date: '2026-12-26', startTime: '7:30 pm',
  venue: 'The Venue', address: 'Gurugram',
};
const ev = I.event(timed, 'uid@x', NOW).join('\n');
ok('timed event starts at the given time', ev.includes('DTSTART;TZID=Asia/Kolkata:20261226T193000'));
ok('timed event runs four hours', ev.includes('DTEND;TZID=Asia/Kolkata:20261226T233000'));
ok('location joins venue and address', ev.includes('LOCATION:The Venue\\, Gurugram'));

// A late start must not roll the end past midnight into the wrong day.
const late = { ...timed, startTime: '10:30 pm' };
const evLate = I.event(late, 'uid@x', NOW).join('\n');
ok('a late event is capped at the end of the day',
  evLate.includes('DTEND;TZID=Asia/Kolkata:20261226T235900'));

// Two ceremonies: start at the earlier, because that is when to arrive.
const wedding = {
  name: 'Wedding', date: '2026-12-27',
  ceremonies: [
    { name: 'Anand Karaj', startTime: '11:00 am' },
    { name: 'Phere', startTime: '4:30 pm' },
  ],
  venue: 'V', address: 'A',
};
const evW = I.event(wedding, 'uid@x', NOW).join('\n');
ok('starts at the earlier ceremony', evW.includes('DTSTART;TZID=Asia/Kolkata:20261227T110000'));
ok('ends four hours after the later one', evW.includes('DTEND;TZID=Asia/Kolkata:20261227T203000'));
ok('summary names both ceremonies', evW.includes('SUMMARY:Wedding — Anand Karaj & Phere'));
ok('description lists both times', evW.includes('Anand Karaj: 11:00 am\\nPhere: 4:30 pm'));

// Ceremonies given out of order must still produce the earlier start.
const reversed = { ...wedding, ceremonies: [...wedding.ceremonies].reverse() };
ok('ceremony order in the data does not matter',
  I.event(reversed, 'uid@x', NOW).join('\n').includes('DTSTART;TZID=Asia/Kolkata:20261227T110000'));

// An unfilled time degrades to all-day rather than emitting a broken stamp.
const unfilled = { ...timed, startTime: '<<FILL>>' };
const evU = I.event(unfilled, 'uid@x', NOW).join('\n');
ok('unfilled time becomes an all-day event', evU.includes('DTSTART;VALUE=DATE:20261226'));
ok('all-day ends on the following day', evU.includes('DTEND;VALUE=DATE:20261227'));
// Checked against the DTSTART/DTEND lines specifically — DTSTAMP legitimately
// carries a time, so scanning the whole event would match itself.
ok('all-day carries no time on its start or end',
  I.event(unfilled, 'uid@x', NOW)
    .filter((l) => l.startsWith('DTSTART') || l.startsWith('DTEND'))
    .every((l) => !/T\d{6}/.test(l)));
ok('all-day uses VALUE=DATE on both',
  I.event(unfilled, 'uid@x', NOW)
    .filter((l) => l.startsWith('DTSTART') || l.startsWith('DTEND'))
    .every((l) => l.includes('VALUE=DATE')));

// All-day spanning a month boundary must roll the month, not just the day.
const monthEnd = { ...unfilled, date: '2026-12-31' };
ok('all-day rolls across a year boundary',
  I.event(monthEnd, 'uid@x', NOW).join('\n').includes('DTEND;VALUE=DATE:20270101'));

// --- calendar wrapper -----------------------------------------------------------
const cal = I.calendar([I.event(timed, 'a@x', NOW), I.event(wedding, 'b@x', NOW)]);
ok('CRLF throughout', !cal.replace(/\r\n/g, '').includes('\n'));
ok('ends with CRLF', cal.endsWith('\r\n'));
eq('two events', (cal.match(/BEGIN:VEVENT/g) || []).length, 2);
eq('one calendar', (cal.match(/BEGIN:VCALENDAR/g) || []).length, 1);
for (const req of ['VERSION:2.0', 'PRODID:', 'CALSCALE:GREGORIAN', 'END:VCALENDAR']) {
  ok(`contains ${req}`, cal.includes(req));
}
ok('every line within the limit',
  cal.split('\r\n').every((l) => octets(l) <= 75));

// A real venue and Gurugram address — the case that was actually broken.
const realistic = {
  name: 'Wedding', date: '2026-12-27',
  venue: 'Gurudwara Sri Guru Singh Sabha and The Trident Hotel Ballroom',
  address: '443 Udyog Vihar Phase V, Sector 19, Gurugram, Haryana 122016, India',
  startTime: '11:00 am',
};
const calR = I.calendar([I.event(realistic, 'c@x', NOW)]);
ok('a realistic address stays within the limit',
  calR.split('\r\n').every((l) => octets(l) <= 75));
ok('and still contains the whole address',
  unfold(calR).includes('Haryana 122016\\, India'));

// --- report -----------------------------------------------------------------------
if (failures.length) {
  console.error(`\nICS TESTS FAILED — ${failures.length} of ${passed + failures.length}:\n`);
  for (const f of failures) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}
console.log(`\nICS TESTS PASSED — ${passed} assertions.\n`);
