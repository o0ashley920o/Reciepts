/**
 * schema.js — IndexedDB store definitions, schema version, and canonical object shapes.
 *
 * This file is the single source of truth for the offline storage layout.
 * It is consumed by storage.js (store creation) and migrate.js (upgrades).
 * All shapes must match docs/SCHEMA.md exactly.
 */

export const DB_NAME = 'receipt-management-platform';
export const DB_VERSION = 1;

export const STORE_NAMES = {
  RECEIPTS: 'receipts',
  FILES: 'receipt-files',
  LOOKUPS: 'lookups',
  SETTINGS: 'settings',
  META: 'meta',
};

/**
 * Canonical Receipt shape.
 * @typedef {Object} Receipt
 * @property {string}   id                 UUID prefixed with "receipt-"
 * @property {string}   createdAt          ISO-8601
 * @property {string}   updatedAt          ISO-8601
 * @property {string}   sourceName         Original file name
 * @property {string}   mimeType           "image/jpeg" | "image/png" | "image/webp" | "image/heic" | "application/pdf"
 * @property {string}   fingerprint        SHA-256 hex of raw file (for duplicate detection)
 * @property {string}   thumbnailDataUrl   data:image/jpeg base64 thumbnail (≤ 320 px longest side)
 * @property {string}   previewDataUrl     data:image/jpeg base64 preprocessed preview
 * @property {string}   merchantName       Extracted or manually entered merchant name
 * @property {string}   abn                Extracted ABN, formatted as "XX XXX XXX XXX"
 * @property {string}   dateTime           ISO-8601 receipt date/time
 * @property {number}   gst                GST amount (dollars)
 * @property {number}   total              Total amount (dollars)
 * @property {string}   paymentMethod      One of PAYMENT_METHODS constant values
 * @property {string}   businessId         References a Business id (or "")
 * @property {string}   categoryId         References a Category id (or "")
 * @property {string}   financialYear      "YYYY-YY" e.g. "2024-25"
 * @property {string[]} tags               Array of tag strings
 * @property {string}   notes              Free-text notes
 * @property {string}   ocrText            Raw Tesseract output
 * @property {number}   ocrConfidence      0–100 (Tesseract overall confidence)
 * @property {number}   extractionConfidence 0–100 (field coverage heuristic)
 * @property {boolean}  ocrEdited          True if any OCR field was manually changed
 * @property {string}   status             "new" | "reviewed" | "duplicate"
 * @property {string}   duplicateOf        id of the original receipt, or ""
 */

/**
 * Canonical Business shape.
 * @typedef {Object} Business
 * @property {string} id                UUID prefixed with "business-"
 * @property {string} name              Display name (required)
 * @property {string} abn               ABN string (optional)
 * @property {string} address           Street address (optional)
 * @property {string} defaultCategoryId Default category id for new receipts (optional)
 * @property {string} colour            Hex colour e.g. "#2563eb" (optional)
 * @property {string} createdAt         ISO-8601
 */

/**
 * Canonical Category shape.
 * @typedef {Object} Category
 * @property {string}      id        UUID prefixed with "category-"
 * @property {string}      name      Display name (required)
 * @property {string|null} parentId  Parent category id, or null for top-level
 * @property {string}      taxCode   "GST" | "FRE" | "BAS" | "N/A"
 * @property {string}      colour    Hex colour (optional)
 * @property {string}      createdAt ISO-8601
 */

/**
 * Canonical Settings shape.
 * @typedef {Object} Settings
 * @property {string}  currency             ISO 4217 code, default "AUD"
 * @property {string}  locale               BCP 47 locale, default "en-AU"
 * @property {string}  theme                "light" | "dark"
 * @property {string}  googleClientId       OAuth client ID (optional)
 * @property {string}  googleBackupFileName Drive backup file name
 * @property {string}  googleDriveFolder    Drive folder name or "appDataFolder"
 */
