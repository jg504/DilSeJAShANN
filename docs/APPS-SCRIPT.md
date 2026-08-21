# Apps Script setup — the RSVP data path

Build steps 2.1 to 2.7. **Do this before any form UI exists.** It is the least
predictable part of the build, and a form written against an unverified endpoint is
wasted work.

The code is `apps-script/Code.gs`. It is kept in this repo so it is versioned; the
Apps Script editor is the deployment target, not the source of truth.

---

## 1. The spreadsheet

1. Create one Google Sheet. Name it anything.
2. Copy the id out of the URL — `docs.google.com/spreadsheets/d/`**`THIS PART`**`/edit`.

Do **not** create the tabs by hand. `setup()` does it, so both tabs are guaranteed
identical.

## 2. The script

1. In the sheet: **Extensions → Apps Script**.
2. Delete the placeholder `Code.gs` contents and paste in `apps-script/Code.gs`.
3. Replace `<<FILL>>` on the `SHEET_ID` line with the id from step 1.
4. Save.

## 3. Run setup once

1. In the editor, choose `setup` from the function dropdown and press **Run**.
2. Grant the permissions prompt. It will warn that the app is unverified — this is
   your own script in your own account; continue through the advanced link.
3. Check the sheet. Both tabs exist, each with the same bold seventeen-column header.

`setup()` is safe to re-run and will not touch existing rows.

## 4. Deploy as a Web App

**Deploy → New deployment → Web app.**

- **Execute as:** Me
- **Who has access:** Anyone

Copy the `/exec` URL. That is the endpoint.

**Every code change needs a new deployment version** — editing the script does not
update a live deployment. Use **Deploy → Manage deployments → Edit → New version**, which
keeps the same URL. Creating a whole new deployment gives a different URL and silently
strands the site on the old one.

## 5. Verify end to end

`public/_rsvp-test.html` is a temporary diagnostic page for exactly this.

1. Open `https://dilsejashann.com/_rsvp-test.html` — **the deployed site, not
   localhost.** CORS behaves differently from a `file://` or `localhost` origin, and
   localhost success proves nothing.
2. Paste the `/exec` URL.
3. **Ping (GET)** should return `{"ok":true,…}`.
4. **Send test row** with the tab set to `groom`. Check the row lands in the `groom`
   tab, not `bride`.
5. Repeat with `bride`.
6. **Check the phone cell reads `+919000000001`** — not `9.19E+11`, not `#ERROR!`.
   Verify this with a real submission, not by typing into the cell.
7. Send twice with the same number. The first row's `superseded` column becomes `yes`;
   the second stays blank.
8. Delete the test rows.

## 6. Before launch

- [ ] **Delete `public/_rsvp-test.html`.** It is unlinked and noindexed but it is still
      a public URL.
- [ ] Delete every test row from both tabs.

---

## Notes

**The endpoint is public and its URL is visible in client JS.** Accepted; there is no
shared secret. Worst case is junk rows, which is cheaper than a login for guests.

**CORS — corrected 2026-08-21.** Apps Script **does** send CORS headers, on GET and on
POST. Verified from a browser on another origin against the live deployment: a
`mode: 'cors'` POST returns a readable `{"ok":true,"row":N}`. The original plan of
`mode: 'no-cors'` plus "assume success" was based on outdated behaviour and would have
made every failure invisible.

The form uses `mode: 'cors'` with a `text/plain` content type — text/plain keeps it a
simple request, so there is no preflight for Apps Script to mishandle.

**No submission can be lost silently.** The order is:

1. POST, and require `ok: true` in the parsed response
2. **Read the row back** with `?check=<submission_id>` — a response alone is not proof
3. On any failure, check whether the row landed anyway, then retry (3 attempts,
   backing off). Checking first means a retry can never write a duplicate
4. The payload is written to `localStorage` before the first attempt and cleared only
   once the row is confirmed. A killed tab or a dead connection does not destroy it;
   the next visit finishes the submission in the background
5. Only after all of that fails does the guest see the WhatsApp fallback — and that
   link is pre-filled with every answer they gave, including accommodation, so the
   data survives even when the sheet write does not

The confirmation screen is shown **only** after the row reads back.

**`LockService`** wraps every write with a 30-second timeout. Everyone submits in the
first 72 hours; without it, concurrent appends drop rows silently.

**Resubmission** matches on the normalised phone number only — no name matching. Two
people in one household sharing a number will overwrite each other. Known and accepted;
the `superseded` column makes it recoverable.
