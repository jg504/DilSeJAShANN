// Add-to-calendar files, one per function per link.
//
// Real .ics files emitted at build time rather than a data: URI, because iOS
// Safari handles a data: download badly and this is the one button a guest
// presses on a phone.
//
// TIER PRIVACY: getStaticPaths emits routes only for the functions on that
// link, so /i/<slug>/f1.ics simply does not exist for a link without f1.
import type { APIRoute } from 'astro';
import data from '../../../data/invites.json';

type Fn = {
  name: string;
  date: string;
  startTime?: string;
  venue: string;
  address: string;
  ceremonies?: { name: string; startTime: string }[];
};

export function getStaticPaths() {
  return data.invites.flatMap((invite) =>
    invite.functions.map((id) => ({
      params: { slug: invite.slug, fn: id },
      props: { fn: data.functions[id as keyof typeof data.functions] as Fn },
    }))
  );
}

/** "18:30" or "6:30 pm" -> minutes since midnight, or null if unparseable. */
function minutes(raw: string | undefined): number | null {
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

/** Local wall-clock stamp. Paired with TZID=Asia/Kolkata below. */
function stamp(date: string, mins: number) {
  return `${date.replace(/-/g, '')}T${pad(Math.floor(mins / 60))}${pad(mins % 60)}00`;
}

const esc = (s: string) => String(s).replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');

export const GET: APIRoute = ({ props, params }) => {
  const fn = props.fn as Fn;

  // The Wedding carries two ceremonies. The earlier one is when a guest must
  // actually arrive, so that is what the calendar entry uses.
  const start =
    fn.ceremonies?.length
      ? fn.ceremonies.map((c) => minutes(c.startTime)).filter((v): v is number => v !== null).sort((a, b) => a - b)[0] ?? null
      : minutes(fn.startTime);

  const uid = `${params.slug}-${params.fn}@dilsejashann.com`;
  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  const summary = fn.ceremonies?.length
    ? `${fn.name} — ${fn.ceremonies.map((c) => c.name).join(' & ')}`
    : fn.name;

  const description = fn.ceremonies?.length
    ? fn.ceremonies.map((c) => `${c.name}: ${c.startTime}`).join('\n')
    : '';

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//dilsejashann//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `SUMMARY:${esc(summary)}`,
  ];

  if (start === null) {
    // No usable time yet — an all-day entry still gets the date into the
    // guest's calendar rather than emitting a broken timestamp.
    const d = fn.date.replace(/-/g, '');
    const next = new Date(`${fn.date}T00:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    lines.push(`DTSTART;VALUE=DATE:${d}`);
    lines.push(`DTEND;VALUE=DATE:${next.toISOString().slice(0, 10).replace(/-/g, '')}`);
  } else {
    lines.push(`DTSTART;TZID=Asia/Kolkata:${stamp(fn.date, start)}`);
    lines.push(`DTEND;TZID=Asia/Kolkata:${stamp(fn.date, Math.min(start + 240, 23 * 60 + 59))}`);
  }

  if (description) lines.push(`DESCRIPTION:${esc(description)}`);
  lines.push(`LOCATION:${esc(`${fn.venue}, ${fn.address}`)}`);
  lines.push('END:VEVENT', 'END:VCALENDAR');

  return new Response(lines.join('\r\n') + '\r\n', {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${params.fn}.ics"`,
    },
  });
};
