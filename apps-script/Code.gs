/**
 * RSVP endpoint for dilsejashann.com
 *
 * Two tabs, `groom` and `bride`, in one spreadsheet. Identical headers,
 * identical column order — the moment they diverge, anything reading both
 * breaks. The column contract is docs/schema.md and it is frozen at seventeen.
 *
 * Run setup() once from the editor before deploying. It creates both tabs,
 * writes the header row, and formats the phone column as plain text.
 */

// Paste the spreadsheet id from its URL:
// docs.google.com/spreadsheets/d/<THIS PART>/edit
const SHEET_ID = '<<FILL>>';

const TABS = ['groom', 'bride'];

// Frozen. Do not add, rename, remove or reorder. See docs/schema.md.
const HEADERS = [
  'submission_id',
  'timestamp',
  'slug',
  'index',
  'side',
  'name',
  'phone_e164',
  'additional_guests',
  'count_f1',
  'count_f2',
  'count_f3',
  'accommodation',
  'travellers',
  'nights',
  'dietary',
  'notes',
  'superseded',
];

const COL = {}; // 1-based column lookup by name
HEADERS.forEach(function (h, i) {
  COL[h] = i + 1;
});

const LOCK_TIMEOUT_MS = 30000;

/**
 * One-time setup. Run this from the Apps Script editor before deploying.
 * Safe to re-run — it will not touch existing rows.
 */
function setup() {
  const ss = SpreadsheetApp.openById(SHEET_ID);

  TABS.forEach(function (name) {
    let sheet = ss.getSheetByName(name);
    if (!sheet) sheet = ss.insertSheet(name);

    // Header row, written every time so the two tabs cannot drift apart.
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold');
    sheet.setFrozenRows(1);

    // Sheets turns long numeric strings into scientific notation and reads a
    // leading + as a formula. Format the whole phone column as plain text
    // before any writes happen.
    sheet.getRange(1, COL.phone_e164, sheet.getMaxRows(), 1).setNumberFormat('@');

    // Same reason — these are digit strings, not numbers.
    sheet.getRange(1, COL.nights, sheet.getMaxRows(), 1).setNumberFormat('@');
  });

  const def = ss.getSheetByName('Sheet1');
  if (def && TABS.indexOf('Sheet1') === -1 && def.getLastRow() === 0) {
    ss.deleteSheet(def);
  }

  return 'setup complete';
}

/**
 * Health check, and read-back verification.
 *
 *   ?check=<submission_id>  ->  { ok: true, found: true|false }
 *
 * The form calls this after every POST. A write is only treated as successful
 * once the row can actually be read back, so a submission can never be lost
 * silently. It is also what makes a retry safe: if the first attempt landed but
 * the response was lost, the retry finds the row instead of writing a duplicate.
 */
function doGet(e) {
  const p = (e && e.parameter) || {};

  // Read-back of the whole sheet, for the admin dashboards.
  //
  // GUARDED BY A TOKEN. The write path is deliberately unauthenticated —
  // worst case there is a junk row. Reading is a different matter: without a
  // token this URL would hand anyone every guest's name and phone number, and
  // the URL itself is visible in client JS on every RSVP page.
  //
  // The token lives in Script Properties, never in this file. Set it with
  // File → Project properties → Script properties, key ADMIN_KEY.
  if (p.report) {
    const key = PropertiesService.getScriptProperties().getProperty('ADMIN_KEY');
    if (!key) return reply({ ok: false, error: 'ADMIN_KEY not set' });
    if (p.key !== key) return reply({ ok: false, error: 'unauthorised' });
    return reply({ ok: true, tabs: readTabs(p.report) });
  }

  const id = p.check;
  if (!id) return reply({ ok: true, service: 'dilsejashann rsvp' });

  const ss = SpreadsheetApp.openById(SHEET_ID);
  for (let t = 0; t < TABS.length; t++) {
    const sheet = ss.getSheetByName(TABS[t]);
    if (!sheet) continue;
    const last = sheet.getLastRow();
    if (last < 2) continue;
    const ids = sheet.getRange(2, COL.submission_id, last - 1, 1).getValues();
    for (let i = 0; i < ids.length; i++) {
      if (String(ids[i][0]) === String(id)) {
        return reply({ ok: true, found: true, tab: TABS[t], row: i + 2 });
      }
    }
  }
  return reply({ ok: true, found: false });
}

function doPost(e) {
  const lock = LockService.getScriptLock();

  // Everyone submits in the first 72 hours after distribution. Without the
  // lock, concurrent appends drop rows silently.
  try {
    lock.waitLock(LOCK_TIMEOUT_MS);
  } catch (err) {
    return reply({ ok: false, error: 'busy' });
  }

  try {
    const body = JSON.parse(e.postData.contents);
    const side = String(body.side || '').toLowerCase();

    if (TABS.indexOf(side) === -1) {
      return reply({ ok: false, error: 'bad side' });
    }

    const phone = normalisePhone(body.phone_e164);
    if (!phone) {
      return reply({ ok: false, error: 'bad phone' });
    }

    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(side);
    if (!sheet) return reply({ ok: false, error: 'missing tab' });

    // Resubmission upserts on the normalised phone number. The old row is
    // marked superseded rather than overwritten — history costs nothing and a
    // wrong number stays recoverable.
    supersede(sheet, phone);

    const row = HEADERS.map(function (h) {
      switch (h) {
        case 'timestamp':
          return Utilities.formatDate(new Date(), 'Asia/Kolkata', "yyyy-MM-dd'T'HH:mm:ssXXX");
        case 'phone_e164':
          return phone;
        case 'superseded':
          return '';
        case 'count_f1':
        case 'count_f2':
        case 'count_f3':
          return clampCount(body[h]);
        // Written as empty strings on non-accom links. Never omitted, never
        // null — a ragged row breaks the sheet.
        case 'accommodation':
        case 'travellers':
        case 'nights':
          return body[h] === undefined || body[h] === null ? '' : String(body[h]);
        default:
          return body[h] === undefined || body[h] === null ? '' : String(body[h]);
      }
    });

    sheet.appendRow(row);

    // appendRow can reset formatting on a fresh row.
    const last = sheet.getLastRow();
    sheet.getRange(last, COL.phone_e164).setNumberFormat('@').setValue(phone);

    return reply({ ok: true, row: last });
  } catch (err) {
    return reply({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Rows as objects keyed by header, for one tab or both.
 *
 * Returns raw rows only. Headcounts, bed-nights, duplicates and the kitchen
 * list are all derived in the admin view and never stored — see docs/schema.md.
 */
function readTabs(which) {
  const want = which === 'both' ? TABS : TABS.filter(function (t) { return t === which; });
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const out = {};

  want.forEach(function (name) {
    const sheet = ss.getSheetByName(name);
    if (!sheet) {
      out[name] = [];
      return;
    }
    const last = sheet.getLastRow();
    if (last < 2) {
      out[name] = [];
      return;
    }
    const values = sheet.getRange(2, 1, last - 1, HEADERS.length).getValues();
    out[name] = values.map(function (row) {
      const o = {};
      HEADERS.forEach(function (h, i) {
        o[h] = row[i] === null || row[i] === undefined ? '' : String(row[i]);
      });
      return o;
    });
  });

  return out;
}

/** Mark every current row with this phone number as superseded. */
function supersede(sheet, phone) {
  const last = sheet.getLastRow();
  if (last < 2) return;

  const phones = sheet.getRange(2, COL.phone_e164, last - 1, 1).getValues();
  const flags = sheet.getRange(2, COL.superseded, last - 1, 1).getValues();

  for (let i = 0; i < phones.length; i++) {
    if (normalisePhone(phones[i][0]) === phone && flags[i][0] !== 'yes') {
      sheet.getRange(i + 2, COL.superseded).setValue('yes');
    }
  }
}

/**
 * Strip spaces, dashes, brackets and any stray characters, keeping a single
 * leading +. The client sends E.164 already; this is a safety net so that
 * matching on resubmission is not defeated by a formatting difference.
 */
function normalisePhone(value) {
  if (value === undefined || value === null) return '';
  const raw = String(value).trim();
  if (!raw) return '';
  const digits = raw.replace(/[^0-9]/g, '');
  if (!digits) return '';
  return '+' + digits;
}

/** Counts are 0-8 and zero is valid — it means skipping that function. */
function clampCount(value) {
  const n = parseInt(value, 10);
  if (isNaN(n) || n < 0) return 0;
  return n > 8 ? 8 : n;
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}
