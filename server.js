const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const { URL } = require('node:url');
const { DatabaseSync } = require('node:sqlite');

loadDotEnv(path.join(__dirname, '.env'));

const APP_VERSION = '2.0.0-phase2';
const HOST = process.env.HOST || '0.0.0.0';
const PORT = Number(process.env.PORT || 4173);
const SESSION_TTL_HOURS = Number(process.env.SESSION_TTL_HOURS || 168);
const BODY_LIMIT_BYTES = Math.max(1, Number(process.env.API_BODY_LIMIT_MB || process.env.STORAGE_MAX_UPLOAD_MB || 20)) * 1024 * 1024;
const ALLOW_PUBLIC_REGISTRATION = `${process.env.ALLOW_PUBLIC_REGISTRATION ?? 'true'}` !== 'false';
const CONTENT_SECURITY_POLICY_ENABLED = `${process.env.CONTENT_SECURITY_POLICY_ENABLED ?? 'true'}` !== 'false';
const SESSION_SECRET = process.env.AUTH_SESSION_SECRET || 'receipt-hub-phase2-session-secret';
const DATABASE_FILE = resolveDatabasePath();
const STATIC_ROOT = __dirname;
const DEFAULT_LOOKUPS = {
  businesses: [
    { id: 'business-personal', name: 'Personal' },
    { id: 'business-main', name: 'Main Business' },
  ],
  categories: [
    { id: 'category-office', name: 'Office Supplies' },
    { id: 'category-travel', name: 'Travel' },
    { id: 'category-meals', name: 'Meals' },
    { id: 'category-software', name: 'Software' },
  ],
};
const DEFAULT_SETTINGS = {
  theme: 'light',
  currency: 'AUD',
  locale: 'en-AU',
  googleClientId: '',
  googleBackupFileName: 'receipt-backup.json',
  googleDriveFolder: 'appDataFolder',
};

fs.mkdirSync(path.dirname(DATABASE_FILE), { recursive: true });

const db = new DatabaseSync(DATABASE_FILE);
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    display_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    last_login_at TEXT
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    last_used_at TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT
  );

  CREATE TABLE IF NOT EXISTS receipts (
    id TEXT NOT NULL,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source_name TEXT,
    mime_type TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    merchant_name TEXT,
    abn TEXT,
    date_time TEXT,
    gst REAL,
    total REAL,
    payment_method TEXT,
    financial_year TEXT,
    business_id TEXT,
    category_id TEXT,
    status TEXT,
    notes TEXT,
    tags_json TEXT,
    ocr_text TEXT,
    ocr_confidence REAL,
    extraction_confidence REAL,
    fingerprint TEXT,
    duplicate_of TEXT,
    preview_data_url TEXT,
    thumbnail_data_url TEXT,
    PRIMARY KEY (id, user_id)
  );

  CREATE INDEX IF NOT EXISTS idx_receipts_user_updated ON receipts (user_id, updated_at DESC);
  CREATE INDEX IF NOT EXISTS idx_receipts_user_fingerprint ON receipts (user_id, fingerprint);

  CREATE TABLE IF NOT EXISTS receipt_files (
    receipt_id TEXT NOT NULL,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source_blob_data_url TEXT,
    preview_blob_data_url TEXT,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (receipt_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS businesses (
    id TEXT NOT NULL,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    PRIMARY KEY (id, user_id)
  );

  CREATE TABLE IF NOT EXISTS categories (
    id TEXT NOT NULL,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    PRIMARY KEY (id, user_id)
  );

  CREATE TABLE IF NOT EXISTS settings (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    theme TEXT,
    currency TEXT,
    locale TEXT,
    google_client_id TEXT,
    google_backup_file_name TEXT,
    google_drive_folder TEXT,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT,
    metadata_json TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at TEXT NOT NULL
  );
`);

seedAdminUser();
cleanupExpiredSessions();

const server = http.createServer(async (req, res) => {
  try {
    applySecurityHeaders(res);
    applyCorsHeaders(req, res);

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

    if (parsedUrl.pathname.startsWith('/api/')) {
      await handleApiRequest(req, res, parsedUrl);
      return;
    }

    serveStaticFile(req, res, parsedUrl.pathname);
  } catch (error) {
    console.error(error);
    sendJson(res, 500, { error: 'Internal server error.' });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Receipt Hub Phase 2 server listening on http://${HOST}:${PORT}`);
  console.log(`Using database: ${DATABASE_FILE}`);
});

function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/u);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    if (!key || Object.prototype.hasOwnProperty.call(process.env, key)) continue;
    process.env[key] = rawValue.replace(/^['"]|['"]$/g, '');
  }
}

function resolveDatabasePath() {
  const configured = process.env.DATABASE_URL || process.env.DATABASE_NAME;
  if (!configured || configured === 'receipts') {
    return path.join(__dirname, 'data', 'receipt-hub.sqlite');
  }
  return path.isAbsolute(configured) ? configured : path.join(__dirname, configured);
}

function nowIso() {
  return new Date().toISOString();
}

function uid(prefix = 'id') {
  return `${prefix}-${crypto.randomUUID()}`;
}

function hashToken(token) {
  return crypto.createHash('sha256').update(`${SESSION_SECRET}:${token}`).digest('hex');
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

function verifyPassword(password, user) {
  const candidate = crypto.scryptSync(password, user.password_salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(candidate, 'hex'), Buffer.from(user.password_hash, 'hex'));
}

function normaliseEmail(value = '') {
  return String(value).trim().toLowerCase();
}

function applySecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  if (CONTENT_SECURITY_POLICY_ENABLED) {
    res.setHeader(
      'Content-Security-Policy',
      [
        "default-src 'self' blob: data:",
        "script-src 'self' 'unsafe-eval'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' blob: data:",
        "connect-src 'self' https://www.googleapis.com https://accounts.google.com",
        "worker-src 'self' blob:",
        "frame-src https://accounts.google.com",
        "font-src 'self' data:",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join('; '),
    );
  }
}

function applyCorsHeaders(req, res) {
  const configuredOrigins = String(process.env.CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const requestOrigin = req.headers.origin;
  if (!requestOrigin) return;
  if (!configuredOrigins.length || configuredOrigins.includes(requestOrigin)) {
    res.setHeader('Access-Control-Allow-Origin', requestOrigin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  }
}

function enforceRateLimit(req) {
  const maxRequests = Number(process.env.RATE_LIMIT_PER_MINUTE || 60);
  if (!maxRequests) return;
  const bucketKey = `${getRequestIp(req)}:${new Date().toISOString().slice(0, 16)}`;
  const count = enforceRateLimit.buckets.get(bucketKey) ?? 0;
  if (count >= maxRequests) {
    const error = new Error('Rate limit exceeded.');
    error.statusCode = 429;
    throw error;
  }
  enforceRateLimit.buckets.set(bucketKey, count + 1);
}
enforceRateLimit.buckets = new Map();

function getRequestIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

async function readJsonBody(req) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > BODY_LIMIT_BYTES) {
      const error = new Error('Request body exceeds the configured size limit.');
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    const error = new Error('Request body must be valid JSON.');
    error.statusCode = 400;
    throw error;
  }
}

async function authenticate(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) {
    const error = new Error('Authentication is required.');
    error.statusCode = 401;
    throw error;
  }
  cleanupExpiredSessions();
  const session = db.prepare(`
    SELECT
      sessions.token_hash,
      sessions.user_id,
      sessions.expires_at,
      users.email,
      users.display_name,
      users.role
    FROM sessions
    JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ?
  `).get(hashToken(token));
  if (!session) {
    const error = new Error('Your session has expired. Please sign in again.');
    error.statusCode = 401;
    throw error;
  }
  db.prepare('UPDATE sessions SET last_used_at = ? WHERE token_hash = ?').run(nowIso(), session.token_hash);
  return {
    id: session.user_id,
    email: session.email,
    displayName: session.display_name,
    role: session.role,
  };
}

function createSession(user, req) {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const createdAt = nowIso();
  const expiresAt = new Date(Date.now() + (SESSION_TTL_HOURS * 60 * 60 * 1000)).toISOString();
  db.prepare(`
    INSERT INTO sessions (token_hash, user_id, created_at, expires_at, last_used_at, ip_address, user_agent)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(tokenHash, user.id, createdAt, expiresAt, createdAt, getRequestIp(req), req.headers['user-agent'] || '');
  return rawToken;
}

function cleanupExpiredSessions() {
  db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(nowIso());
}

function serialiseUser(user) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
  };
}

function saveAuditLog(userId, action, targetType, targetId, metadata, req) {
  db.prepare(`
    INSERT INTO audit_logs (id, user_id, action, target_type, target_id, metadata_json, ip_address, user_agent, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    uid('audit'),
    userId || null,
    action,
    targetType,
    targetId || null,
    metadata ? JSON.stringify(metadata) : null,
    getRequestIp(req),
    req.headers['user-agent'] || '',
    nowIso(),
  );
}

function ensureDefaultsForUser(userId) {
  const lookupCount = db.prepare('SELECT COUNT(*) AS count FROM businesses WHERE user_id = ?').get(userId).count;
  if (!lookupCount) {
    const insertBusiness = db.prepare('INSERT INTO businesses (id, user_id, name) VALUES (?, ?, ?)');
    for (const business of DEFAULT_LOOKUPS.businesses) insertBusiness.run(business.id, userId, business.name);
  }
  const categoryCount = db.prepare('SELECT COUNT(*) AS count FROM categories WHERE user_id = ?').get(userId).count;
  if (!categoryCount) {
    const insertCategory = db.prepare('INSERT INTO categories (id, user_id, name) VALUES (?, ?, ?)');
    for (const category of DEFAULT_LOOKUPS.categories) insertCategory.run(category.id, userId, category.name);
  }
  const settings = db.prepare('SELECT user_id FROM settings WHERE user_id = ?').get(userId);
  if (!settings) {
    db.prepare(`
      INSERT INTO settings (user_id, theme, currency, locale, google_client_id, google_backup_file_name, google_drive_folder, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId,
      DEFAULT_SETTINGS.theme,
      DEFAULT_SETTINGS.currency,
      DEFAULT_SETTINGS.locale,
      DEFAULT_SETTINGS.googleClientId,
      DEFAULT_SETTINGS.googleBackupFileName,
      DEFAULT_SETTINGS.googleDriveFolder,
      nowIso(),
    );
  }
}

function getLookups(userId) {
  ensureDefaultsForUser(userId);
  return {
    businesses: db.prepare('SELECT id, name FROM businesses WHERE user_id = ? ORDER BY lower(name) ASC').all(userId),
    categories: db.prepare('SELECT id, name FROM categories WHERE user_id = ? ORDER BY lower(name) ASC').all(userId),
  };
}

function replaceLookups(userId, lookups) {
  ensureDefaultsForUser(userId);
  db.prepare('DELETE FROM businesses WHERE user_id = ?').run(userId);
  db.prepare('DELETE FROM categories WHERE user_id = ?').run(userId);
  const insertBusiness = db.prepare('INSERT INTO businesses (id, user_id, name) VALUES (?, ?, ?)');
  for (const business of Array.isArray(lookups.businesses) ? lookups.businesses : []) {
    insertBusiness.run(String(business.id), userId, String(business.name || '').trim());
  }
  const insertCategory = db.prepare('INSERT INTO categories (id, user_id, name) VALUES (?, ?, ?)');
  for (const category of Array.isArray(lookups.categories) ? lookups.categories : []) {
    insertCategory.run(String(category.id), userId, String(category.name || '').trim());
  }
  return getLookups(userId);
}

function getSettings(userId) {
  ensureDefaultsForUser(userId);
  const row = db.prepare(`
    SELECT theme, currency, locale, google_client_id, google_backup_file_name, google_drive_folder
    FROM settings
    WHERE user_id = ?
  `).get(userId);
  return {
    ...DEFAULT_SETTINGS,
    ...(row ? {
      theme: row.theme,
      currency: row.currency,
      locale: row.locale,
      googleClientId: row.google_client_id,
      googleBackupFileName: row.google_backup_file_name,
      googleDriveFolder: row.google_drive_folder,
    } : {}),
  };
}

function saveSettings(userId, payload) {
  const merged = { ...getSettings(userId), ...payload };
  db.prepare(`
    INSERT INTO settings (user_id, theme, currency, locale, google_client_id, google_backup_file_name, google_drive_folder, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      theme = excluded.theme,
      currency = excluded.currency,
      locale = excluded.locale,
      google_client_id = excluded.google_client_id,
      google_backup_file_name = excluded.google_backup_file_name,
      google_drive_folder = excluded.google_drive_folder,
      updated_at = excluded.updated_at
  `).run(
    userId,
    String(merged.theme || DEFAULT_SETTINGS.theme),
    String(merged.currency || DEFAULT_SETTINGS.currency),
    String(merged.locale || DEFAULT_SETTINGS.locale),
    String(merged.googleClientId || ''),
    String(merged.googleBackupFileName || DEFAULT_SETTINGS.googleBackupFileName),
    String(merged.googleDriveFolder || DEFAULT_SETTINGS.googleDriveFolder),
    nowIso(),
  );
  return getSettings(userId);
}

function rowToReceipt(row) {
  return {
    id: row.id,
    sourceName: row.source_name,
    mimeType: row.mime_type,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    merchantName: row.merchant_name,
    abn: row.abn,
    dateTime: row.date_time,
    gst: row.gst,
    total: row.total,
    paymentMethod: row.payment_method,
    financialYear: row.financial_year,
    businessId: row.business_id,
    categoryId: row.category_id,
    status: row.status,
    notes: row.notes,
    tags: safeJsonParse(row.tags_json, []),
    ocrText: row.ocr_text,
    ocrConfidence: row.ocr_confidence,
    extractionConfidence: row.extraction_confidence,
    fingerprint: row.fingerprint,
    duplicateOf: row.duplicate_of,
    previewDataUrl: row.preview_data_url,
    thumbnailDataUrl: row.thumbnail_data_url,
  };
}

function getReceipts(userId) {
  return db.prepare(`
    SELECT *
    FROM receipts
    WHERE user_id = ?
    ORDER BY datetime(updated_at) DESC, rowid DESC
  `).all(userId).map(rowToReceipt);
}

function saveReceipt(userId, receipt) {
  const now = nowIso();
  db.prepare(`
    INSERT INTO receipts (
      id, user_id, source_name, mime_type, created_at, updated_at, merchant_name, abn, date_time,
      gst, total, payment_method, financial_year, business_id, category_id, status, notes, tags_json,
      ocr_text, ocr_confidence, extraction_confidence, fingerprint, duplicate_of, preview_data_url,
      thumbnail_data_url
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id, user_id) DO UPDATE SET
      source_name = excluded.source_name,
      mime_type = excluded.mime_type,
      created_at = excluded.created_at,
      updated_at = excluded.updated_at,
      merchant_name = excluded.merchant_name,
      abn = excluded.abn,
      date_time = excluded.date_time,
      gst = excluded.gst,
      total = excluded.total,
      payment_method = excluded.payment_method,
      financial_year = excluded.financial_year,
      business_id = excluded.business_id,
      category_id = excluded.category_id,
      status = excluded.status,
      notes = excluded.notes,
      tags_json = excluded.tags_json,
      ocr_text = excluded.ocr_text,
      ocr_confidence = excluded.ocr_confidence,
      extraction_confidence = excluded.extraction_confidence,
      fingerprint = excluded.fingerprint,
      duplicate_of = excluded.duplicate_of,
      preview_data_url = excluded.preview_data_url,
      thumbnail_data_url = excluded.thumbnail_data_url
  `).run(
    String(receipt.id),
    userId,
    String(receipt.sourceName || ''),
    String(receipt.mimeType || ''),
    String(receipt.createdAt || now),
    String(receipt.updatedAt || now),
    String(receipt.merchantName || ''),
    String(receipt.abn || ''),
    String(receipt.dateTime || ''),
    Number(receipt.gst || 0),
    Number(receipt.total || 0),
    String(receipt.paymentMethod || 'Unknown'),
    String(receipt.financialYear || ''),
    String(receipt.businessId || ''),
    String(receipt.categoryId || ''),
    String(receipt.status || 'new'),
    String(receipt.notes || ''),
    JSON.stringify(Array.isArray(receipt.tags) ? receipt.tags : []),
    String(receipt.ocrText || ''),
    Number(receipt.ocrConfidence || 0),
    Number(receipt.extractionConfidence || 0),
    String(receipt.fingerprint || ''),
    String(receipt.duplicateOf || ''),
    String(receipt.previewDataUrl || ''),
    String(receipt.thumbnailDataUrl || ''),
  );
  return db.prepare('SELECT * FROM receipts WHERE id = ? AND user_id = ?').get(String(receipt.id), userId);
}

function saveReceiptFile(userId, receiptId, payload) {
  db.prepare(`
    INSERT INTO receipt_files (receipt_id, user_id, source_blob_data_url, preview_blob_data_url, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(receipt_id, user_id) DO UPDATE SET
      source_blob_data_url = excluded.source_blob_data_url,
      preview_blob_data_url = excluded.preview_blob_data_url,
      updated_at = excluded.updated_at
  `).run(
    receiptId,
    userId,
    String(payload.sourceBlob || ''),
    String(payload.previewBlob || ''),
    nowIso(),
  );
}

function getReceiptFile(userId, receiptId) {
  const row = db.prepare(`
    SELECT source_blob_data_url, preview_blob_data_url
    FROM receipt_files
    WHERE receipt_id = ? AND user_id = ?
  `).get(receiptId, userId);
  if (!row) return null;
  return {
    sourceBlob: row.source_blob_data_url,
    previewBlob: row.preview_blob_data_url,
  };
}

function deleteReceipt(userId, receiptId) {
  db.prepare('DELETE FROM receipt_files WHERE receipt_id = ? AND user_id = ?').run(receiptId, userId);
  db.prepare('DELETE FROM receipts WHERE id = ? AND user_id = ?').run(receiptId, userId);
}

function findDuplicate(userId, fingerprint, receiptId) {
  if (!fingerprint) return null;
  return db.prepare(`
    SELECT *
    FROM receipts
    WHERE user_id = ? AND fingerprint = ? AND id != COALESCE(?, '')
    ORDER BY datetime(updated_at) DESC
    LIMIT 1
  `).get(userId, fingerprint, receiptId || null);
}

async function handleApiRequest(req, res, parsedUrl) {
  enforceRateLimit(req);

  if (req.method === 'GET' && parsedUrl.pathname === '/api/config') {
    sendJson(res, 200, {
      mode: 'server',
      allowRegistration: ALLOW_PUBLIC_REGISTRATION,
      version: APP_VERSION,
    });
    return;
  }

  if (req.method === 'POST' && parsedUrl.pathname === '/api/auth/register') {
    const body = await readJsonBody(req);
    if (!ALLOW_PUBLIC_REGISTRATION) {
      sendJson(res, 403, { error: 'Public registration is disabled.' });
      return;
    }
    const email = normaliseEmail(body.email);
    const password = String(body.password || '');
    const displayName = String(body.displayName || body.name || '').trim();
    if (!email || !email.includes('@')) {
      sendJson(res, 400, { error: 'A valid email address is required.' });
      return;
    }
    if (password.length < 8) {
      sendJson(res, 400, { error: 'Passwords must be at least 8 characters long.' });
      return;
    }
    if (!displayName) {
      sendJson(res, 400, { error: 'A display name is required.' });
      return;
    }
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      sendJson(res, 409, { error: 'That email address is already registered.' });
      return;
    }
    const passwordData = hashPassword(password);
    const user = {
      id: uid('user'),
      email,
      displayName,
      role: email === normaliseEmail(process.env.ADMIN_EMAIL) ? 'admin' : 'user',
    };
    const timestamp = nowIso();
    db.prepare(`
      INSERT INTO users (id, email, password_hash, password_salt, display_name, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(user.id, user.email, passwordData.hash, passwordData.salt, user.displayName, user.role, timestamp, timestamp);
    ensureDefaultsForUser(user.id);
    const token = createSession(user, req);
    db.prepare('UPDATE users SET last_login_at = ?, updated_at = ? WHERE id = ?').run(timestamp, timestamp, user.id);
    saveAuditLog(user.id, 'user.registered', 'user', user.id, { email: user.email }, req);
    sendJson(res, 201, { token, user: serialiseUser(user) });
    return;
  }

  if (req.method === 'POST' && parsedUrl.pathname === '/api/auth/login') {
    const body = await readJsonBody(req);
    const email = normaliseEmail(body.email);
    const password = String(body.password || '');
    const userRow = db.prepare(`
      SELECT id, email, password_hash, password_salt, display_name, role
      FROM users
      WHERE email = ?
    `).get(email);
    if (!userRow || !verifyPassword(password, userRow)) {
      sendJson(res, 401, { error: 'Incorrect email or password.' });
      return;
    }
    const user = {
      id: userRow.id,
      email: userRow.email,
      displayName: userRow.display_name,
      role: userRow.role,
    };
    const token = createSession(user, req);
    db.prepare('UPDATE users SET last_login_at = ?, updated_at = ? WHERE id = ?').run(nowIso(), nowIso(), user.id);
    saveAuditLog(user.id, 'user.logged_in', 'session', user.id, null, req);
    sendJson(res, 200, { token, user: serialiseUser(user) });
    return;
  }

  if (req.method === 'POST' && parsedUrl.pathname === '/api/auth/logout') {
    try {
      const user = await authenticate(req);
      const tokenHash = hashToken((req.headers.authorization || '').slice(7).trim());
      db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
      saveAuditLog(user.id, 'user.logged_out', 'session', user.id, null, req);
    } catch {
      // Ignore expired sessions during logout.
    }
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === 'GET' && parsedUrl.pathname === '/api/auth/session') {
    const user = await authenticate(req);
    ensureDefaultsForUser(user.id);
    sendJson(res, 200, { user: serialiseUser(user) });
    return;
  }

  if (req.method === 'GET' && parsedUrl.pathname === '/api/lookups') {
    const user = await authenticate(req);
    sendJson(res, 200, getLookups(user.id));
    return;
  }

  if (req.method === 'PUT' && parsedUrl.pathname === '/api/lookups') {
    const user = await authenticate(req);
    const body = await readJsonBody(req);
    const lookups = replaceLookups(user.id, body);
    saveAuditLog(user.id, 'lookups.updated', 'lookups', user.id, {
      businesses: lookups.businesses.length,
      categories: lookups.categories.length,
    }, req);
    sendJson(res, 200, lookups);
    return;
  }

  if (req.method === 'GET' && parsedUrl.pathname === '/api/settings') {
    const user = await authenticate(req);
    sendJson(res, 200, getSettings(user.id));
    return;
  }

  if (req.method === 'PUT' && parsedUrl.pathname === '/api/settings') {
    const user = await authenticate(req);
    const body = await readJsonBody(req);
    const settings = saveSettings(user.id, body);
    saveAuditLog(user.id, 'settings.updated', 'settings', user.id, settings, req);
    sendJson(res, 200, settings);
    return;
  }

  if (req.method === 'GET' && parsedUrl.pathname === '/api/receipts') {
    const user = await authenticate(req);
    sendJson(res, 200, { receipts: getReceipts(user.id) });
    return;
  }

  if (req.method === 'GET' && parsedUrl.pathname === '/api/receipts/duplicates') {
    const user = await authenticate(req);
    const fingerprint = parsedUrl.searchParams.get('fingerprint') || '';
    const receiptId = parsedUrl.searchParams.get('receiptId') || '';
    const duplicate = findDuplicate(user.id, fingerprint, receiptId);
    sendJson(res, 200, { receipt: duplicate ? rowToReceipt(duplicate) : null });
    return;
  }

  if (req.method === 'GET' && parsedUrl.pathname === '/api/audit-logs') {
    const user = await authenticate(req);
    const limit = Math.min(50, Math.max(1, Number(parsedUrl.searchParams.get('limit') || 12)));
    const logs = db.prepare(`
      SELECT action, target_type, target_id, metadata_json, created_at
      FROM audit_logs
      WHERE user_id = ?
      ORDER BY datetime(created_at) DESC, rowid DESC
      LIMIT ?
    `).all(user.id, limit).map((row) => ({
      action: row.action,
      targetType: row.target_type,
      targetId: row.target_id,
      metadata: safeJsonParse(row.metadata_json, {}),
      createdAt: row.created_at,
    }));
    sendJson(res, 200, { logs });
    return;
  }

  const fileMatch = parsedUrl.pathname.match(/^\/api\/receipts\/([^/]+)\/file$/u);
  if (fileMatch) {
    const receiptId = decodeURIComponent(fileMatch[1]);
    const user = await authenticate(req);
    if (req.method === 'GET') {
      const filePayload = getReceiptFile(user.id, receiptId);
      if (!filePayload) {
        sendJson(res, 404, { error: 'Receipt file not found.' });
        return;
      }
      sendJson(res, 200, filePayload);
      return;
    }
    if (req.method === 'PUT') {
      const body = await readJsonBody(req);
      saveReceiptFile(user.id, receiptId, body);
      saveAuditLog(user.id, 'receipt.file_saved', 'receipt', receiptId, null, req);
      sendJson(res, 200, { ok: true });
      return;
    }
  }

  const receiptMatch = parsedUrl.pathname.match(/^\/api\/receipts\/([^/]+)$/u);
  if (receiptMatch) {
    const receiptId = decodeURIComponent(receiptMatch[1]);
    const user = await authenticate(req);
    if (req.method === 'PUT') {
      const body = await readJsonBody(req);
      const saved = saveReceipt(user.id, { ...body, id: receiptId });
      saveAuditLog(user.id, 'receipt.saved', 'receipt', receiptId, {
        total: Number(body.total || 0),
        status: String(body.status || 'new'),
      }, req);
      sendJson(res, 200, { receipt: rowToReceipt(saved) });
      return;
    }
    if (req.method === 'DELETE') {
      deleteReceipt(user.id, receiptId);
      saveAuditLog(user.id, 'receipt.deleted', 'receipt', receiptId, null, req);
      sendJson(res, 200, { ok: true });
      return;
    }
  }

  sendJson(res, 404, { error: 'Route not found.' });
}

function safeJsonParse(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function serveStaticFile(req, res, pathnameValue) {
  const requestedPath = pathnameValue === '/' ? '/index.html' : pathnameValue;
  const cleanPath = path.normalize(decodeURIComponent(requestedPath)).replace(/^(\.\.[/\\])+/, '');
  if (cleanPath.includes(`${path.sep}.git`) || cleanPath.includes('node_modules')) {
    sendJson(res, 404, { error: 'Not found.' });
    return;
  }

  let filePath = path.join(STATIC_ROOT, cleanPath);
  if (!filePath.startsWith(STATIC_ROOT)) {
    sendJson(res, 403, { error: 'Forbidden.' });
    return;
  }
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(STATIC_ROOT, 'index.html');
  }

  const extension = path.extname(filePath).toLowerCase();
  const contentTypes = {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.webmanifest': 'application/manifest+json; charset=utf-8',
    '.wasm': 'application/wasm',
    '.gz': 'application/gzip',
  };
  res.writeHead(200, {
    'Content-Type': contentTypes[extension] || 'application/octet-stream',
    'Cache-Control': extension === '.html' ? 'no-cache' : 'public, max-age=3600',
  });
  fs.createReadStream(filePath).pipe(res);
}

function seedAdminUser() {
  const email = normaliseEmail(process.env.ADMIN_EMAIL || '');
  const password = String(process.env.ADMIN_PASSWORD || '');
  if (!email || !password) return;
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return;
  const passwordData = hashPassword(password);
  const id = uid('user');
  const timestamp = nowIso();
  db.prepare(`
    INSERT INTO users (id, email, password_hash, password_salt, display_name, role, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, email, passwordData.hash, passwordData.salt, 'Administrator', 'admin', timestamp, timestamp);
  ensureDefaultsForUser(id);
  console.log(`Seeded administrator account for ${email}`);
}
