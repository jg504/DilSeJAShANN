// Time parsing shared by the calendar files and live mode.
//
// Everything about this wedding happens in IST. The offset is written into
// parsed strings explicitly rather than relying on the runtime's timezone,
// because guests will be holding phones set to London, Dubai and California,
// and the build machine is on neither.

export const IST = '+05:30';

/** "18:30", "6:30 pm", "6.30PM" -> minutes since midnight, or null. */
export function minutes(raw: string | undefined | null): number | null {
  if (!raw) return null;
  const m = String(raw).trim().match(/^(\d{1,2})[:.](\d{2})\s*(am|pm)?$/i);
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

/** Epoch milliseconds for an IST wall-clock time on a given date. */
export const istAt = (date: string, mins = 0): number =>
  Date.parse(`${date}T${pad(Math.floor(mins / 60))}:${pad(mins % 60)}:00${IST}`);

/**
 * Read a faked clock from a `?now=` value. Treated as IST unless it already
 * carries an offset, so `?now=2026-12-27T16:00` means 4pm in Gurgaon whatever
 * the device is set to.
 */
export function fakedNow(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const ms = Date.parse(/[+-]\d{2}:\d{2}$/.test(raw) ? raw : raw + IST);
  return Number.isNaN(ms) ? null : ms;
}

/**
 * Whole days from now until midnight IST on `date`.
 *
 * Rounds up, so any part of the day before counts as one: at 23:00 on the 25th
 * the answer is 1, which reads as "Tomorrow" rather than "today". Zero or
 * negative means the day has arrived or passed, and live mode owns the page
 * from that point.
 */
export function daysUntil(date: string, now: number): number {
  const start = istAt(date);
  if (Number.isNaN(start) || Number.isNaN(now)) return 0;
  return Math.ceil((start - now) / 86400000);
}
