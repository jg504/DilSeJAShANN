// Derived RSVP reports.
//
// Pure functions over raw sheet rows, deliberately separated from the DOM so
// the arithmetic can be tested directly — bed-nights decide how many beds are
// booked, and a silent off-by-one there is expensive.
//
// Nothing here is ever stored. See docs/schema.md.

export type Row = Record<string, string> & { _tab?: string };

export const num = (v: unknown): number => {
  const n = parseInt(String(v ?? ''), 10);
  return Number.isNaN(n) ? 0 : n;
};

/** Superseded rows are history. Every report runs on current rows only. */
export const current = (rows: Row[]): Row[] => rows.filter((r) => r.superseded !== 'yes');

/** Total people per function across current rows. */
export function headcount(rows: Row[]): Record<'f1' | 'f2' | 'f3', number> {
  const out = { f1: 0, f2: 0, f3: 0 };
  for (const r of current(rows)) {
    out.f1 += num(r.count_f1);
    out.f2 += num(r.count_f2);
    out.f3 += num(r.count_f3);
  }
  return out;
}

/** A row with zeros everywhere is a decline — there is no `attending` column. */
export const declined = (rows: Row[]): Row[] =>
  current(rows).filter((r) => num(r.count_f1) + num(r.count_f2) + num(r.count_f3) === 0);

/**
 * People needing a bed on each night.
 *
 * NOT a room count — rooms are shared and paired manually by phone. A guest is
 * counted on a night only if they asked for accommodation AND listed it.
 */
export function bedNights(rows: Row[]): Record<'26' | '27' | '28', number> {
  const out = { '26': 0, '27': 0, '28': 0 };
  for (const r of current(rows)) {
    if (r.accommodation !== 'yes') continue;
    const nights = String(r.nights ?? '').split('|').filter(Boolean);
    for (const n of nights) {
      if (n === '26' || n === '27' || n === '28') out[n] += num(r.travellers);
    }
  }
  return out;
}

/** Exception-only. Blank means standard. Printed and handed over on paper. */
export const kitchen = (rows: Row[]): Row[] =>
  current(rows).filter((r) => String(r.dietary ?? '').trim() !== '');

const BED_WORDS = /\b(stay|stays|staying|room|rooms|hotel|night|nights|accommodat\w*|bed|beds|lodg\w*)\b/i;

/**
 * Guests on links that were never offered accommodation who asked for it in
 * the free-text note. These get buried otherwise, and they are exactly the
 * cases that matter — an elderly relative who cannot manage a same-day return.
 */
export const buried = (rows: Row[], accomSlugs: string[]): Row[] =>
  current(rows).filter(
    (r) => !accomSlugs.includes(r.slug) && BED_WORDS.test(String(r.notes ?? ''))
  );

/**
 * Two classes of repeat, which mean opposite things:
 *  - `duplicates`: more than one CURRENT row for a number. Supersede failed;
 *    this is a problem and the headcount is double-counting.
 *  - `resubmitted`: several rows but exactly one current. Working as designed.
 */
export function repeats(rows: Row[]): { duplicates: string[]; resubmitted: string[] } {
  const byPhone = new Map<string, Row[]>();
  for (const r of rows) {
    const p = r.phone_e164;
    if (!p) continue;
    byPhone.set(p, [...(byPhone.get(p) ?? []), r]);
  }
  const duplicates: string[] = [];
  const resubmitted: string[] = [];
  for (const [phone, all] of byPhone) {
    const live = all.filter((r) => r.superseded !== 'yes').length;
    if (live > 1) duplicates.push(phone);
    else if (all.length > 1) resubmitted.push(phone);
  }
  return { duplicates, resubmitted };
}
