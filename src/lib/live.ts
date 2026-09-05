// Live mode's state machine.
//
// During 26-28 December the invitation leads with what is happening now, or
// what is next. THIS CANNOT BE FIXED WHILE IT IS RUNNING, so the logic is pure
// and tested rather than living inside a page script — see
// scripts/test-live.mjs.
//
// Only ever fed this link's own functions, so it can never announce a function
// the guest was not invited to.

import { istAt, minutes } from './time.ts';

const HOURS = 60 * 60 * 1000;
const RUNS_FOR = 4 * HOURS;

export type Time = { label: string; at: string; venue?: string; mapsUrl?: string };

export type Fn = {
  name: string;
  date: string;
  venue: string;
  mapsUrl: string;
  times: Time[];
};

export type Planned = Fn & { start: number; end: number; allDay: boolean };

export type State =
  | { kind: 'before' }
  | { kind: 'now'; fn: Planned }
  | { kind: 'next'; fn: Planned }
  | { kind: 'after' };

/**
 * Resolve each function to an absolute window, sorted by start.
 *
 * A function whose time is missing or unparseable becomes all-day rather than
 * being dropped — a guest still needs to be in the right place on the right
 * day. Where a function carries several ceremonies, it starts at the earliest,
 * because that is when a guest must actually arrive.
 */
export function plan(fns: Fn[]): Planned[] {
  return fns
    .map((f) => {
      const mins = f.times.map((t) => minutes(t.at)).filter((v): v is number => v !== null);
      const allDay = mins.length === 0;
      const start = allDay ? istAt(f.date) : istAt(f.date, Math.min(...mins));
      const end = allDay ? istAt(f.date) + 24 * HOURS : istAt(f.date, Math.max(...mins)) + RUNS_FOR;
      return { ...f, start, end, allDay };
    })
    .sort((a, b) => a.start - b.start);
}

/**
 * Which state the page is in.
 *
 * `before` means nothing is shown at all — the banner belongs to the wedding
 * days, and the window opens at midnight IST on the first day this guest is
 * invited to, not on the 26th for everyone.
 */
export function stateAt(planned: Planned[], now: number): State {
  if (!planned.length || Number.isNaN(now)) return { kind: 'before' };

  const windowStart = istAt(planned[0].date);
  if (now < windowStart) return { kind: 'before' };

  const live = planned.find((e) => now >= e.start && now < e.end);
  if (live) return { kind: 'now', fn: live };

  const next = planned.find((e) => now < e.start);
  if (next) return { kind: 'next', fn: next };

  return { kind: 'after' };
}

/**
 * Where the guest should be RIGHT NOW, which is not always the function's venue.
 *
 * The Wedding runs across two venues — the Anand Karaj at the Gurudwara, the
 * phere next door at Club Patio. Showing the function's venue all day would
 * send someone arriving at 11am to the wrong building. Resolves to the latest
 * ceremony that has already started, or the first one if none has.
 *
 * Returns null when there are no usable times, so the caller falls back to the
 * function's own venue.
 */
export function activeSegment(e: Planned, now: number): Time | null {
  const timed = e.times
    .map((t) => ({ t, mins: minutes(t.at) }))
    .filter((x): x is { t: Time; mins: number } => x.mins !== null)
    .sort((a, b) => a.mins - b.mins);
  if (!timed.length) return null;

  let active = timed[0];
  for (const x of timed) {
    if (now >= istAt(e.date, x.mins)) active = x;
  }
  return active.t;
}

export type Segment = Time & { venue: string; mapsUrl: string; active: boolean };

/**
 * Every ceremony in this function, in time order, each bound to its OWN venue.
 *
 * The banner used to print "Anand Karaj 11:00 am · Vivaah 2:00 pm" on one line
 * and a single venue underneath it. Both times, one place — so at 11:30 it read
 * as though the 2 pm Vivaah were also at the Gurudwara. Jaskaran read it that
 * way himself, and he knows the answer; a guest would drive to the wrong
 * building. A time is never shown apart from its venue again.
 */
export function segments(e: Planned, now: number): Segment[] {
  const active = activeSegment(e, now);
  return e.times
    .map((t) => ({ t, mins: minutes(t.at) }))
    .filter((x): x is { t: Time; mins: number } => x.mins !== null)
    .sort((a, b) => a.mins - b.mins)
    .map(({ t }) => ({
      ...t,
      venue: t.venue ?? e.venue,
      mapsUrl: t.mapsUrl ?? e.mapsUrl,
      active: t === active,
    }));
}

/** Venue and pin for where to go now, falling back to the function's own. */
export function whereNow(e: Planned, now: number): { venue: string; mapsUrl: string } {
  const seg = activeSegment(e, now);
  return {
    venue: seg?.venue ?? e.venue,
    mapsUrl: seg?.mapsUrl ?? e.mapsUrl,
  };
}

/** The times to print, skipping any that could not be parsed. */
export const timeLine = (e: Planned): string =>
  e.allDay
    ? ''
    : e.times
        .filter((t) => minutes(t.at) !== null)
        .map((t) => (t.label ? `${t.label} ${t.at}` : t.at))
        .join(' · ');

/** "Today" when the event falls on the current IST date, otherwise the date. */
export function dayLabel(e: Planned, now: number): string {
  const fmt = (ms: number) =>
    new Date(ms).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      timeZone: 'Asia/Kolkata',
    });
  return fmt(e.start) === fmt(now) ? 'Today' : fmt(e.start);
}
