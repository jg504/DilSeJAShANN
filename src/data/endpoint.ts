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

// Shown only after every retry and the read-back check have failed. The link
// opens WhatsApp with the guest's full answers already written into the message,
// so the data survives even when the sheet write does not. Digits only, E.164
// without the plus.
export const FALLBACK_WHATSAPP = '919521393039';

// A write is only called successful once the row reads back. These control how
// hard the form tries before giving up and showing the WhatsApp fallback.
export const MAX_ATTEMPTS = 3;
export const RETRY_BASE_MS = 700;
