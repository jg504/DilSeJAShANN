// iCalendar generation, shared by the per-function and all-functions endpoints.
//
// Kept in one place so the two can never disagree about times, folding or
// timezone handling.

export type Fn = {
  name: string;
  date: string;
  startTime?: string;
  venue: string;
  address: string;
  ceremonies?: { name: string; startTime: string }[];
};

const HOURS = 60 * 60 * 1000;
const RUNS_FOR = 4;

/** "18:30" or "6:30 pm" -> minutes since midnight, or null if unparseable. */
export function minutes(raw: string | undefined): number | null {
  if (!raw) return null;
  const m = raw.trim().match(/^(\d{1,2})[:.](\d{2})\s*(am|pm)?$/i);
  if (!m) return null;
  let h = Number(m[1]);
  const mm = Number(m[2]);
  const ap = m[3]?.toLowerCase();
  if (ap === 'pm' && h < 12) h += 12;
  if (ap === 'am' && h === 12) h = 0;
  if (h > 23 || mm > 59) return null;
  return h * 60 + mm;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Local wall-clock stamp, paired with TZID=Asia/Kolkata. */
const stamp = (date: string, mins: number) =>
  `${date.replace(/-/g, '')}T${pad(Math.floor(mins / 60))}${pad(mins % 60)}00`;

export const esc = (s: string) =>
  String(s).replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');

/**
 * RFC 5545 content lines must not exceed 75 octets. Longer ones fold onto a
 * continuation line beginning with a single space.
 *
 * A real venue plus a Gurugram address runs past 140 octets, and clients differ
 * on whether they truncate an over-long line or reject the file. Counted in
 * OCTETS, not characters, and never split mid-sequence — that would emit
 * invalid UTF-8.
 */
export function fold(line: string): string {
  const enc = new TextEncoder();
  const dec = new TextDecoder();
  const bytes = enc.encode(line);
  if (bytes.length <= 75) return line;

  const parts: string[] = [];
  let start = 0;
  let limit = 75;
  while (start < bytes.length) {
    let end = Math.min(start + limit, bytes.length);
    while (end > start && end < bytes.length && (bytes[end] & 0xc0) === 0x80) end--;
    parts.push(dec.decode(bytes.subarray(start, end)));
    start = end;
    limit = 74;
  }
  return parts.join('\r\n ');
}

/** One VEVENT. Returns the lines, unfolded. */
export function event(fn: Fn, uid: string, now: string): string[] {
  // The Wedding carries two ceremonies. The earlier one is when a guest must
  // actually arrive, so that is what the entry starts at.
  const mins = (fn.ceremonies?.length ? fn.ceremonies.map((c) => c.startTime) : [fn.startTime])
    .map(minutes)
    .filter((v): v is number => v !== null)
    .sort((a, b) => a - b);

  const summary = fn.ceremonies?.length
    ? `${fn.name} — ${fn.ceremonies.map((c) => c.name).join(' & ')}`
    : fn.name;

  const description = fn.ceremonies?.length
    ? fn.ceremonies.map((c) => `${c.name}: ${c.startTime}`).join('\n')
    : '';

  const lines = ['BEGIN:VEVENT', `UID:${uid}`, `DTSTAMP:${now}`, `SUMMARY:${esc(summary)}`];

  if (mins.length === 0) {
    // No usable time yet — an all-day entry still puts the guest in the right
    // place on the right day rather than emitting a broken timestamp.
    const d = fn.date.replace(/-/g, '');
    const next = new Date(`${fn.date}T00:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    lines.push(`DTSTART;VALUE=DATE:${d}`);
    lines.push(`DTEND;VALUE=DATE:${next.toISOString().slice(0, 10).replace(/-/g, '')}`);
  } else {
    const start = mins[0];
    const end = Math.min(mins[mins.length - 1] + RUNS_FOR * 60, 23 * 60 + 59);
    lines.push(`DTSTART;TZID=Asia/Kolkata:${stamp(fn.date, start)}`);
    lines.push(`DTEND;TZID=Asia/Kolkata:${stamp(fn.date, end)}`);
  }

  if (description) lines.push(`DESCRIPTION:${esc(description)}`);
  lines.push(`LOCATION:${esc(`${fn.venue}, ${fn.address}`)}`);
  lines.push('END:VEVENT');
  return lines;
}

/** Wrap events in a VCALENDAR, fold every line, and terminate with CRLF. */
export function calendar(events: string[][]): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//dilsejashann//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...events.flat(),
    'END:VCALENDAR',
  ];
  return lines.map(fold).join('\r\n') + '\r\n';
}

export const nowStamp = () =>
  new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

export const HOUR_MS = HOURS;
