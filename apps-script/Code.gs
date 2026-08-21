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

/** Health check — open the Web App URL in a browser to confirm it is live. */
function doGet() {
  return ContentService.createTextOutput(
    JSON.stringify({ ok: true, service: 'dilsejashann rsvp' })
  ).setMimeType(ContentService.MimeType.JSON);
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
