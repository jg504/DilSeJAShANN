// Phone handling for the RSVP form.
//
// phone_e164 is the record key for the whole sheet — resubmission matches on
// it, and the admin dashboard builds wa.me links from it. A number mangled here
// is a guest who cannot be chased in December, so the logic is pure and tested
// rather than living inline in a page script.

export type Country = { dial: string; min: number; max: number; group?: number[] };

/**
 * The national part, stripped of everything a person might type.
 *
 * Removes spaces, brackets, dashes and dots; drops the trunk zero people add
 * out of habit; and removes a country code typed into the national field, which
 * is the single most common mistake — but only when the result is still too
 * long, so a genuine number that happens to begin with its own dial digits is
 * left alone.
 */
export function national(raw: string, c: Country): string {
  let d = String(raw ?? '').replace(/\D/g, '').replace(/^0+/, '');
  if (d.startsWith(c.dial) && d.length > c.max) d = d.slice(c.dial.length);
  return d;
}

/** Full E.164, e.g. +14155552671. Empty string when there is nothing to format. */
export function e164(raw: string, c: Country): string {
  const d = national(raw, c);
  return d ? `+${c.dial}${d}` : '';
}

export type Problem = 'empty' | 'too-short' | 'too-long' | null;

/** Length validation per country. Catches the common cases, not every case. */
export function problem(raw: string, c: Country): Problem {
  const d = national(raw, c);
  if (!d) return 'empty';
  if (d.length < c.min) return 'too-short';
  if (d.length > c.max) return 'too-long';
  return null;
}

/**
 * Readable form for the confirmation echo, e.g. "+1 415 555 2671".
 *
 * The echo is the check that actually works, because it makes a human look at
 * the number. Falls back to an ungrouped form when the digit count does not
 * match the country's grouping, so an unusual-but-valid number still reads.
 */
export function pretty(raw: string, c: Country): string {
  const d = national(raw, c);
  if (!d) return '';
  const g = c.group ?? [];
  if (!g.length || g.reduce((a, b) => a + b, 0) !== d.length) return `+${c.dial} ${d}`;
  let i = 0;
  return `+${c.dial} ` + g.map((n) => d.slice(i, (i += n))).join(' ');
}
