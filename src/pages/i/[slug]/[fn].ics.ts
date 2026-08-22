// Add-to-calendar, one file per function.
//
// Real .ics files emitted at build time rather than a data: URI, because iOS
// Safari handles a data: download badly and this is the one button a guest
// presses on a phone.
//
// TIER PRIVACY: getStaticPaths emits routes only for the functions on that
// link, so /i/<slug>/f1.ics simply does not exist for a link without f1.
import type { APIRoute } from 'astro';
import data from '../../../data/invites.json';
import { calendar, event, nowStamp, type Fn } from '../../../lib/ics';

export function getStaticPaths() {
  return data.invites.flatMap((invite) =>
    invite.functions.map((id) => ({
      params: { slug: invite.slug, fn: id },
      props: { fn: data.functions[id as keyof typeof data.functions] as Fn },
    }))
  );
}

export const GET: APIRoute = ({ props, params }) => {
  const fn = props.fn as Fn;
  const body = calendar([event(fn, `${params.slug}-${params.fn}@dilsejashann.com`, nowStamp())]);

  return new Response(body, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${params.fn}.ics"`,
    },
  });
};
