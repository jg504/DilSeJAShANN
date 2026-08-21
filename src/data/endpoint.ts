// The Apps Script Web App URL.
//
// Public by design. It appears in client JS on every RSVP page, and CLAUDE.md
// accepts that: there is no shared secret and no guest auth. Worst case is junk
// rows in the sheet, which is cheaper than making guests log in.
//
// Changing the Apps Script code does NOT change this URL, as long as you
// redeploy via Manage deployments → Edit → New version. Creating a brand new
// deployment issues a different URL and strands the site on the old one.
export const RSVP_ENDPOINT =
  'https://script.google.com/macros/s/AKfycbzEqwax5hSzUdZhpo5e8Az7ZWeLC4CBkyKQZo4WBOL31ZABz5bOwVNiuCVAkv8mH2g/exec';

// Shown only on the failure path, so a guest whose submission did not go
// through has somewhere to go instead of giving up. Digits only, E.164 without
// the plus — it is used to build a wa.me link.
export const FALLBACK_WHATSAPP = '<<FILL>>';
