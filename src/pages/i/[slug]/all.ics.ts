// Every function on this link, in one calendar file.
//
// Three taps became one. The per-function files still exist for a guest who
// only wants one of them in their calendar.
//
// TIER PRIVACY: built from this link's own functions only, exactly like the
// per-function routes — this file can never contain an event the guest was not
// invited to.
import type { APIRoute } from 'astro';
import data from '../../../data/invites.json';
import { calendar, event, nowStamp, type Fn } from '../../../lib/ics';

export function getStaticPaths() {
  // Only where it is actually offered. On a single-function link this file
  // would duplicate the per-function one and go unlinked.
  return data.invites
    .filter((invite) => invite.functions.length > 1)
    .map((invite) => ({
      params: { slug: invite.slug },
      props: {
        fns: invite.functions.map((id) => ({
          id,
          fn: data.functions[id as keyof typeof data.functions] as Fn,
        })),
      },
    }));
}

export const GET: APIRoute = ({ props, params }) => {
  const fns = props.fns as { id: string; fn: Fn }[];
  const now = nowStamp();

  // Same UIDs as the per-function files on purpose: a guest who adds one
  // function and then adds them all ends up with one entry per event rather
  // than a duplicate.
  const body = calendar(
    fns.map(({ id, fn }) => event(fn, `${params.slug}-${id}@dilsejashann.com`, now))
  );

  return new Response(body, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="dilsejashann.ics"',
    },
  });
};
