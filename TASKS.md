# Receipt Management Platform — TASKS.md
# Version: 3.0
# Last updated: see git log

This is the SINGLE SOURCE OF TRUTH for Copilot execution.

## Rules
- Work top-down only — never skip ahead
- Only action tasks in the CURRENT active phase
- Mark `[x]` DONE only when acceptance criterion is fully met
- Never implement future-phase features early
- Read `docs/SCHEMA.md` and `docs/CONVENTIONS.md` before every session

---

# STACK LOCK

## Phase 1 (active) — NO BUILD TOOL
- Vanilla JS ES6 modules (native browser `import`)
- LocalForage via CDN (IndexedDB wrapper)
- Tesseract.js via CDN (OCR)
- heic2any via CDN (HEIC → JPEG conversion for iPhone photos)
- Chart.js via CDN (dashboard charts)
- SheetJS/xlsx via CDN (Excel export)
- JSZip via CDN (ZIP export)
- NO npm · NO webpack · NO Vite · NO React · NO TypeScript · NO build step

## Phase 2+ (locked — do not implement yet)
- Node.js + Express
- PostgreSQL
- Docker + Docker Compose
- Nginx reverse proxy
- JWT authentication
- Cloudflare Workers (optional serverless API)

---

# DEPLOYMENT TARGETS

Three supported deployment methods — all must be documented by end of each phase:

| Target | Phase 1 | Phase 2+ |
|---|---|---|
| GitHub Pages | ✅ Static PWA | ❌ (no server) |
| Cloudflare Pages | ✅ Static PWA | ✅ via Workers |
| HostGator Shared | ✅ Static upload | ❌ (no Docker) |
| HostGator VPS | ✅ Static | ✅ via Docker |

---

# PROJECT STRUCTURE

```
receipt-platform/
│
├── index.html                  # App shell — imports all JS modules
├── manifest.json               # PWA manifest
├── sw.js                       # Service worker (must stay at root for scope)
│
├── css/
│   ├── reset.css               # Box-sizing, margin resets
│   ├── tokens.css              # CSS custom properties (colour, spacing, type)
│   ├── layout.css              # Sidebar + main panel grid
│   ├── components.css          # Buttons, cards, modals, forms
│   └── dark.css                # Dark mode (prefers-color-scheme)
│
├── js/
│   ├── app.js                  # Entry point — init all modules, boot router
│   ├── db/
│   │   ├── schema.js           # Store definitions + DB version constant
│   │   ├── db.js               # LocalForage CRUD helpers
│   │   └── migrate.js          # Schema migration runner
│   ├── ocr/
│   │   ├── ocr.js              # Tesseract.js worker wrapper
│   │   ├── preprocess.js       # Canvas image preprocessing (grayscale, contrast)
│   │   └── parser.js           # Field extraction from raw OCR text
│   ├── upload/
│   │   ├── upload.js           # File picker + drag-and-drop
│   │   ├── camera.js           # getUserMedia camera capture
│   │   ├── batch.js            # Multi-file queue processor
│   │   └── heic.js             # heic2any conversion wrapper
│   ├── finance/
│   │   ├── fy.js               # Australian FY logic (1 Jul–30 Jun)
│   │   ├── business.js         # Business entity CRUD
│   │   └── category.js         # Category entity CRUD
│   ├── ui/
│   │   ├── router.js           # Hash-based client router (#/dashboard etc.)
│   │   ├── sidebar.js          # Navigation sidebar
│   │   ├── dashboard.js        # Dashboard view + Chart.js charts
│   │   ├── receipt-viewer.js   # Zoom/rotate/edit single receipt
│   │   ├── receipt-list.js     # List/grid view with search + filter
│   │   ├── ocr-editor.js       # Editable OCR result form
│   │   ├── modal.js            # Reusable modal component
│   │   ├── toast.js            # Toast notification system
│   │   └── theme.js            # Dark/light toggle + persistence
│   ├── search/
│   │   ├── search.js           # Full-text search
│   │   └── filters.js          # Filter state manager
│   ├── export/
│   │   ├── excel.js            # SheetJS .xlsx export
│   │   ├── csv.js              # CSV export
│   │   ├── json.js             # JSON backup
│   │   └── zip.js              # JSZip export (images + data)
│   └── utils/
│       ├── events.js           # Typed EventBus (inter-module comms)
│       ├── date.js             # Date formatting helpers
│       ├── hash.js             # SHA-256 (duplicate detection)
│       ├── format.js           # Currency (cents→$), ABN formatting
│       └── uuid.js             # UUID v4 generator
│
├── assets/
│   ├── icons/                  # SVG icons
│   └── pwa/
│       ├── icon-192.png
│       └── icon-512.png
│
├── deploy/
│   ├── docker/
│   │   ├── Dockerfile
│   │   ├── docker-compose.yml
│   │   ├── docker-compose.prod.yml
│   │   └── nginx.conf
│   └── cloudflare/
│       ├── wrangler.toml       # Cloudflare Workers config (Phase 2+)
│       └── _redirects          # Cloudflare Pages routing rules
│
├── docs/
│   ├── SCHEMA.md               # Data models (Receipt, Business, Category)
│   ├── CONVENTIONS.md          # Naming rules, code style
│   ├── SMOKE_TESTS.md          # Manual test checklist per phase
│   └── deployment/
│       ├── GITHUB_PAGES.md
│       ├── CLOUDFLARE.md
│       └── HOSTGATOR.md
│
├── .env.example                # Environment variable template (Phase 2+)
├── TASKS.md                    # This file
├── README.md                   # Phase 1 deployment guide
└── FUTURE.md                   # Phase 2+ architecture stub
```

---

# PHASE 1 — OFFLINE SINGLE-USER PWA

## TASK GROUP 1 — Project Initialisation
✓ AC: Folder structure exists, `index.html` loads in browser, no console errors, EventBus and router operational.

- [ ] TASK-001 — Create full folder and file structure per §PROJECT STRUCTURE above
- [ ] TASK-002 — Create `js/utils/events.js` — typed EventBus (on/emit/once/off)
- [ ] TASK-003 — Create `js/utils/uuid.js` — UUID v4 generator (crypto.randomUUID with fallback)
- [ ] TASK-004 — Create `js/utils/format.js` — currency (cents to AUD string), ABN formatter
- [ ] TASK-005 — Create `js/utils/date.js` — ISO 8601 helpers, display formatters
- [ ] TASK-006 — Create `js/utils/hash.js` — SHA-256 via Web Crypto API (for duplicate detection)
- [ ] TASK-007 — Create `css/tokens.css` — full CSS custom property system (colour, spacing, type, radius)
- [ ] TASK-008 — Create `css/reset.css`, `css/layout.css`, `css/components.css`, `css/dark.css`
- [ ] TASK-009 — Create `index.html` — app shell with sidebar + main panel, imports all CSS and `app.js`
- [ ] TASK-010 — Create `js/ui/router.js` — hash-based router (#/dashboard, #/receipts, #/settings)
- [ ] TASK-011 — Create `js/ui/toast.js` — toast notifications (success/error/info, auto-dismiss 4s)
- [ ] TASK-012 — Create `js/ui/modal.js` — reusable modal (open/close/confirm pattern)
- [ ] TASK-013 — Create `js/ui/theme.js` — dark/light toggle, persists to localStorage
- [ ] TASK-014 — Create `js/ui/sidebar.js` — navigation with active state, fires `view:change` events
- [ ] TASK-015 — Create `js/app.js` — entry point, initialises all modules in correct order

---

## TASK GROUP 2 — Database & Schema
✓ AC: IndexedDB initialises on first load, all CRUD operations work, schema version upgrades without data loss.

- [ ] TASK-016 — Create `docs/SCHEMA.md` — full data models for Receipt, Business, Category, Settings
- [ ] TASK-017 — Create `js/db/schema.js` — store names, DB version, object shapes (matches SCHEMA.md exactly)
- [ ] TASK-018 — Create `js/db/db.js` — LocalForage init, CRUD helpers (create/read/update/delete/list/query)
- [ ] TASK-019 — Create `js/db/migrate.js` — version migration runner (v1 baseline; extensible for future versions)
- [ ] TASK-020 — Image storage strategy — compress uploaded image to max 1200px longest side before storing; store as base64 JPEG thumbnail in IndexedDB
  ✓ AC: A 5MB photo is stored as <200KB thumbnail; original filename and hash preserved

---

## TASK GROUP 3 — Receipt Upload
✓ AC: All listed file types can be uploaded, stored in IndexedDB, and appear in receipt list. Duplicates trigger a warning, not silent rejection.

- [ ] TASK-021 — Create `js/upload/upload.js` — file picker accepting image/jpeg, image/png, image/webp, image/heic, application/pdf
- [ ] TASK-022 — Create `js/upload/heic.js` — heic2any CDN wrapper; converts HEIC to JPEG before processing
- [ ] TASK-023 — Create `js/upload/camera.js` — getUserMedia camera capture (mobile + desktop); outputs same format as file upload
- [ ] TASK-024 — Drag-and-drop upload — drop zone on dashboard and receipt list; fires same `receipt:file-ready` event as file picker
- [ ] TASK-025 — Create `js/upload/batch.js` — multi-file queue (up to 20 files); shows per-file progress; processes sequentially
- [ ] TASK-026 — PDF support — render first page via PDF.js (CDN) to canvas; treat resulting image as receipt photo
- [ ] TASK-027 — Duplicate detection — SHA-256 hash of file on upload; query IndexedDB for matching hash; show warning modal if duplicate found (user can still save)

---

## TASK GROUP 4 — OCR System
✓ AC: Clear receipt photo produces merchant, date, and total with >70% confidence. Confidence <60% auto-opens manual entry. All fields are editable post-OCR.

- [ ] TASK-028 — Create `js/ocr/preprocess.js` — Canvas pipeline: grayscale → contrast boost → sharpen; output canvas element
- [ ] TASK-029 — Create `js/ocr/ocr.js` — Tesseract.js worker wrapper; lazy-loads worker; emits `receipt:ocr:progress` and `receipt:ocr:done`
- [ ] TASK-030 — Cache Tesseract worker + eng.traineddata in service worker (see TASK-060) for offline OCR
- [ ] TASK-031 — Create `js/ocr/parser.js` — extract fields from raw OCR text:
  - Merchant name (first non-blank line heuristic)
  - ABN (regex: XX XXX XXX XXX)
  - Date (multiple format support: DD/MM/YYYY, YYYY-MM-DD, DD Mon YYYY)
  - Time (HH:MM am/pm variants)
  - GST (look for "GST" label + adjacent number)
  - Total (look for "TOTAL", "AMOUNT DUE" + largest dollar value)
  - Payment method (EFTPOS, VISA, MASTERCARD, CASH keywords)
- [ ] TASK-032 — OCR confidence scoring — per-field confidence; overall score = average; store in receipt.ocrConfidence
- [ ] TASK-033 — OCR failure fallback — if overall confidence <60%, auto-open manual entry form; show confidence score to user
- [ ] TASK-034 — Create `js/ui/ocr-editor.js` — editable form for all OCR fields; marks receipt.ocrEdited = true on any change; live currency formatting on total/GST fields

---

## TASK GROUP 5 — Financial System
✓ AC: Every receipt is assigned a financial year automatically. Businesses and categories can be created, edited, deleted. Manual FY override works and persists.

- [ ] TASK-035 — Create `js/finance/fy.js`:
  - `getFY(date)` → "2024-25"
  - `getFYRange(fy)` → { start: Date, end: Date }
  - `getCurrentFY()` → current FY string
  - `getFYList(fromYear)` → array of FY strings, most recent first
  - `isInFY(date, fy)` → boolean
- [ ] TASK-036 — Auto-assign FY on receipt save — use receipt.date field; fall back to upload date if date blank
- [ ] TASK-037 — Manual FY override — dropdown in OCR editor allows selecting any FY from getFYList(); persists to receipt.financialYear
- [ ] TASK-038 — Create `js/finance/business.js`:
  - Business entity: { id, name, abn, address, defaultCategoryId, colour, createdAt }
  - CRUD via db.js
  - Fires `business:created`, `business:updated`, `business:deleted` events
- [ ] TASK-039 — Business CRUD UI — modal form (name required, ABN optional with format validation, colour picker)
- [ ] TASK-040 — Create `js/finance/category.js`:
  - Category entity: { id, name, parentId, taxCode, colour, createdAt }
  - parentId = null for top-level; supports one level of nesting
  - Tax codes: GST | FRE | BAS | N/A
- [ ] TASK-041 — Category CRUD UI — flat list with optional parent selector; colour and tax code fields

---

## TASK GROUP 6 — Core UI
✓ AC: Dashboard shows accurate charts. Receipt viewer allows zoom, rotate, edit. Search and filters return correct results. Tags and notes save and persist. Dark mode works system-wide with toggle override.

- [ ] TASK-042 — Create `js/ui/dashboard.js`:
  - Total spend by FY (bar chart)
  - Spend by category (doughnut chart)
  - Spend by business (bar chart)
  - Monthly trend (line chart)
  - All charts update when receipts change
- [ ] TASK-043 — Create `js/ui/receipt-list.js` — grid/list toggle, sort (date, amount, merchant), pagination (50/page)
- [ ] TASK-044 — Create `js/ui/receipt-viewer.js`:
  - Image zoom (pinch + scroll)
  - Rotate (90° increments, persists to receipt)
  - Side-by-side: image left, edit form right (desktop); stacked (mobile)
- [ ] TASK-045 — Create `js/search/search.js` — full-text search across merchant, notes, tags, ABN; debounced 300ms; minimum 2 characters
- [ ] TASK-046 — Create `js/search/filters.js` — filter state: FY, business, category, date range, amount range, payment method, has-GST flag
- [ ] TASK-047 — Notes and tags — tags: comma-separated string → stored as string[]; notes: plain text textarea; both editable in receipt viewer
- [ ] TASK-048 — Create `js/ui/theme.js` — dark/light toggle; respects prefers-color-scheme on first load; persists override to localStorage

---

## TASK GROUP 7 — Storage & Data Integrity
✓ AC: App survives browser close/reopen with all data intact. 500 test receipts load in under 2 seconds.

- [ ] TASK-049 — IndexedDB schema design — finalise stores: receipts, businesses, categories, settings; add indexes on: date, financialYear, businessId, categoryId, imageHash
- [ ] TASK-050 — CRUD receipts — full create/read/update/delete via db.js; all operations emit events via EventBus
- [ ] TASK-051 — Offline persistence verification — manual smoke test: add receipt → close tab → reopen → receipt present; document result in SMOKE_TESTS.md
- [ ] TASK-052 — Performance — list query with 500 receipts completes in <500ms; implement cursor-based pagination in db.js if needed

---

## TASK GROUP 8 — Export
✓ AC: All four export formats download correctly and contain accurate data. ZIP folder structure matches spec.

- [ ] TASK-053 — Create `js/export/excel.js` — SheetJS .xlsx; columns: Date, Merchant, ABN, Category, Business, GST, Total, Payment Method, FY, Notes, Tags; one row per receipt
- [ ] TASK-054 — Create `js/export/csv.js` — same columns as Excel; UTF-8 BOM for Excel compatibility
- [ ] TASK-055 — Create `js/export/json.js` — full receipt array export including all fields; formatted JSON; timestamp in filename
- [ ] TASK-056 — Create `js/export/zip.js` — JSZip export:
  ```
  /{financial_year}/{business_name}/{YYYY-MM-DD}_{merchant}_{total_cents}.jpg
  /receipts.json
  ```
  Filenames sanitised (no special chars). Max 500 receipts per ZIP; batch if more.
- [ ] TASK-057 — Export UI — export panel in settings; options: date range, FY filter, business filter; shows estimated file size before download

---

## TASK GROUP 9 — PWA
✓ AC: App installs on iOS and Android. Works fully offline after first load. Tesseract OCR works offline.

- [ ] TASK-058 — Create `manifest.json`:
  ```json
  {
    "name": "Receipt Manager",
    "short_name": "Receipts",
    "display": "standalone",
    "start_url": "/",
    "theme_color": "#1e1e2e",
    "background_color": "#1e1e2e",
    "icons": [
      { "src": "assets/pwa/icon-192.png", "sizes": "192x192", "type": "image/png" },
      { "src": "assets/pwa/icon-512.png", "sizes": "512x512", "type": "image/png" }
    ]
  }
  ```
- [ ] TASK-059 — Create `sw.js` — service worker with cache-first strategy for all app assets
- [ ] TASK-060 — Cache Tesseract worker script + `eng.traineddata` in service worker — enables true offline OCR (no CDN required after first load)
- [ ] TASK-061 — Offline indicator — banner shown when navigator.onLine is false; disappears on reconnect

---

## TASK GROUP 10 — Optional Cloud Backup
✓ AC: User can connect their own Google account. Backup exports JSON to Drive. Restore imports from Drive. No Anthropic/vendor Google accounts required.

- [ ] TASK-062 — Google Drive backup (optional) — user provides their own OAuth client ID via settings; JSON backup uploaded to user's Drive folder "Receipt Manager Backups"
- [ ] TASK-063 — Restore from Google Drive — browse and select backup file; import merges with existing data (no duplicates via hash check)

---

## TASK GROUP 11 — Phase 1 Finalisation
✓ AC: All smoke tests pass. No console errors. All three deployment methods documented and verified.

- [ ] TASK-064 — Full integration testing — run all SMOKE_TESTS.md items; fix any failures before continuing
- [ ] TASK-065 — Performance optimisation — profile with DevTools; ensure 10k receipt list renders without jank; lazy-load chart library
- [ ] TASK-066 — Create `docs/SMOKE_TESTS.md` — Phase 1 manual test checklist (see §SMOKE TEST TEMPLATE below)
- [ ] TASK-067 — Create `docs/CONVENTIONS.md` — JS naming (camelCase), CSS (kebab-case), constants (UPPER_SNAKE), events (noun:verb pattern), file names (kebab-case)
- [ ] TASK-068 — Complete `README.md` (see §README REQUIREMENTS below)
- [ ] TASK-069 — Complete `docs/deployment/GITHUB_PAGES.md` (see §GITHUB PAGES GUIDE below)
- [ ] TASK-070 — Complete `docs/deployment/CLOUDFLARE.md` (see §CLOUDFLARE GUIDE below)
- [ ] TASK-071 — Complete `docs/deployment/HOSTGATOR.md` (see §HOSTGATOR GUIDE below)
- [ ] TASK-072 — Create `deploy/docker/Dockerfile` + `docker-compose.yml` (Phase 1 static server only — nginx serving static files; no backend yet)
- [ ] TASK-073 — Create `deploy/cloudflare/_redirects` — SPA routing fallback for Cloudflare Pages
- [ ] TASK-074 — Create `FUTURE.md` — Phase 2+ architecture stub (multi-user, auth, PostgreSQL, Docker full-stack)
- [ ] TASK-075 — Merge `dev` → `main`; verify deployment on GitHub Pages; tag release `v1.0.0`

---

# PHASE 1 SMOKE TEST TEMPLATE

Include all of these in `docs/SMOKE_TESTS.md`:

```
PHASE 1 SMOKE TESTS

[ ] ST-01 Fresh load — open app in incognito; no console errors; sidebar and dashboard visible
[ ] ST-02 Upload JPEG — upload a receipt photo; thumbnail appears in receipt list
[ ] ST-03 Upload HEIC — upload an iPhone .heic photo; converts and appears in list
[ ] ST-04 Camera capture — use camera button; photo captured and appears in list
[ ] ST-05 OCR — scan a clear receipt; merchant, date, total populated with >70% confidence
[ ] ST-06 OCR low confidence — scan a blurry image; manual entry form opens automatically
[ ] ST-07 Duplicate — upload same file twice; duplicate warning appears; second save still works
[ ] ST-08 Financial year — upload receipt dated 1 Aug 2024; FY shows "2024-25"
[ ] ST-09 Financial year — upload receipt dated 1 May 2024; FY shows "2023-24"
[ ] ST-10 Business CRUD — create, edit, delete a business; list updates correctly
[ ] ST-11 Category CRUD — create, edit, delete a category; list updates correctly
[ ] ST-12 Search — search for merchant name; correct receipts returned
[ ] ST-13 Filters — filter by FY; only matching receipts shown
[ ] ST-14 Dark mode — toggle dark/light; reload; preference persists
[ ] ST-15 Excel export — export; open file in Excel/Numbers; all columns present
[ ] ST-16 ZIP export — export; folder structure matches spec
[ ] ST-17 Offline — disable network in DevTools; reload; app loads; can add receipt manually
[ ] ST-18 Persistence — add receipt; close tab; reopen; receipt still present
[ ] ST-19 PWA install — install on mobile; opens standalone; works offline
[ ] ST-20 10k load — import 500 receipts; list loads in <2 seconds
```

---

# README REQUIREMENTS

`README.md` must include:

- Overview and feature list
- Tech stack (Phase 1)
- Architecture diagram (ASCII is fine)
- Quick start (open index.html locally)
- GitHub Pages deployment (link to docs/deployment/GITHUB_PAGES.md)
- Cloudflare Pages deployment (link to docs/deployment/CLOUDFLARE.md)
- HostGator deployment (link to docs/deployment/HOSTGATOR.md)
- Docker deployment (link to deploy/docker/)
- Backup and restore
- Troubleshooting (OCR errors, storage full, HEIC not converting)
- FAQ
- Changelog
- Contributing guide

---

# GITHUB PAGES DEPLOYMENT GUIDE

`docs/deployment/GITHUB_PAGES.md` must cover:

1. Create GitHub repository (public or private)
2. Upload project files (drag-and-drop or git push)
3. Settings → Pages → Source: Deploy from `main` branch, root folder
4. Visit `https://yourusername.github.io/receipt-platform/`
5. Updating: push to `main`; Pages redeploys automatically (~60 seconds)
6. Custom domain: CNAME record setup
7. Troubleshooting: 404 on reload (hash routing doesn't need server config), HEIC on older Safari

---

# CLOUDFLARE DEPLOYMENT GUIDE

`docs/deployment/CLOUDFLARE.md` must cover:

## Cloudflare Pages (Phase 1 — Static)
1. Log in to Cloudflare Dashboard → Pages → Create a project
2. Connect GitHub repository
3. Build settings: no build command; output directory: `/` (root)
4. Deploy — Cloudflare assigns `https://receipt-platform.pages.dev`
5. Custom domain: add domain in Pages settings → automatic SSL
6. `deploy/cloudflare/_redirects` — include `/* /index.html 200` for SPA routing
7. Updating: push to `main`; Cloudflare redeploys automatically

## Cloudflare Workers (Phase 2+ API — not yet)
- Document that Phase 2 will use Workers for backend API
- Stub `deploy/cloudflare/wrangler.toml` with placeholder config

## Cloudflare-specific notes
- Free plan: 500 builds/month, unlimited requests, global CDN — more than sufficient for Phase 1
- Enable "Always Use HTTPS" in SSL/TLS settings
- Enable "Auto Minify" (JS + CSS + HTML) in Speed settings
- Purge cache after deployment if stale assets appear

---

# HOSTGATOR DEPLOYMENT GUIDE

`docs/deployment/HOSTGATOR.md` must cover ALL sections below:

## SECTION A — Shared Hosting (Phase 1 Static)

### Prerequisites
- HostGator shared hosting account with cPanel access
- Domain name pointed to HostGator nameservers

### Step-by-step deployment
1. **Log in to cPanel** — `https://yourdomain.com/cpanel`
2. **File Manager** → navigate to `public_html/`
3. **Upload files** — upload all project files to `public_html/` (or a subdirectory for subdomains)
4. **Verify structure** — `public_html/index.html` must exist
5. **Visit your domain** — `https://yourdomain.com` — app loads
6. **SSL** — cPanel → SSL/TLS → Install Let's Encrypt certificate (free via AutoSSL)
7. **File permissions** — files: 644, folders: 755 (set via File Manager → Permissions)

### `.htaccess` (required for clean URLs and HTTPS redirect)
```apache
# Force HTTPS
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# SPA fallback — serve index.html for all routes (hash routing doesn't need this, but included for safety)
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]

# Security headers
Header always set X-Content-Type-Options nosniff
Header always set X-Frame-Options SAMEORIGIN
Header always set Referrer-Policy strict-origin-when-cross-origin
```

### Updating
- Upload changed files via File Manager (overwrite existing)
- Or use FTP client: FileZilla with HostGator FTP credentials from cPanel

### Troubleshooting (Shared Hosting)
- **Blank page** — check browser console; likely a JS module path issue; ensure all `import` paths are relative
- **404 on assets** — verify file names match exactly (Linux is case-sensitive)
- **SSL not working** — wait up to 24h for Let's Encrypt; check cPanel AutoSSL status
- **HEIC upload fails** — check browser; Safari on iOS 16+ supports HEIC uploads; earlier versions need heic2any fallback

---

## SECTION B — VPS Hosting with Docker (Phase 1 Static + Phase 2+)

### Prerequisites
- HostGator VPS plan (or any VPS with SSH access)
- Ubuntu 22.04 LTS recommended
- Domain pointed to VPS IP

### Step 1 — SSH into your VPS
```bash
ssh root@your-vps-ip
```

### Step 2 — Install Docker
```bash
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker
```

### Step 3 — Install Docker Compose
```bash
apt install docker-compose-plugin -y
docker compose version  # verify
```

### Step 4 — Clone your repository
```bash
git clone https://github.com/yourusername/receipt-platform.git /opt/receipt-platform
cd /opt/receipt-platform
```

### Step 5 — Deploy with Docker Compose
```bash
docker compose -f deploy/docker/docker-compose.yml up -d
```

### Step 6 — Verify
```bash
docker compose ps          # all services should show "running"
curl http://localhost:80   # should return HTML
```

### Step 7 — Configure SSL with Certbot
```bash
apt install certbot python3-certbot-nginx -y
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```
Certbot auto-renews via cron. Verify: `certbot renew --dry-run`

### Step 8 — Configure firewall
```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
```

### Updating
```bash
cd /opt/receipt-platform
git pull origin main
docker compose -f deploy/docker/docker-compose.yml up -d --build
```

### Auto-restart on reboot
Docker Compose services with `restart: unless-stopped` auto-restart on VPS reboot. Verify with:
```bash
reboot
# after reboot:
docker compose -f deploy/docker/docker-compose.yml ps
```

### Troubleshooting (VPS + Docker)
- **Port 80/443 in use** — `lsof -i :80` to find conflict; stop conflicting service
- **Container won't start** — `docker compose logs` to see error output
- **SSL certificate errors** — ensure DNS propagated before running certbot; check `dig yourdomain.com`
- **Out of disk space** — `docker system prune` to remove unused images/containers
- **Performance** — HostGator VPS minimum 2GB RAM recommended; 1GB may swap under load

---

# DOCKER INSTALLATION GUIDE

`deploy/docker/Dockerfile` (Phase 1 — nginx static server):
```dockerfile
FROM nginx:alpine
COPY . /usr/share/nginx/html
COPY deploy/docker/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

`deploy/docker/nginx.conf`:
```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # SPA routing fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options SAMEORIGIN;
    add_header Referrer-Policy strict-origin-when-cross-origin;
}
```

`deploy/docker/docker-compose.yml`:
```yaml
version: '3.9'
services:
  app:
    build:
      context: ../..
      dockerfile: deploy/docker/Dockerfile
    ports:
      - "80:80"
    restart: unless-stopped
```

## Platform-specific Docker installation

### Windows (Docker Desktop + WSL2)
1. Enable WSL2: `wsl --install` in PowerShell (admin)
2. Download Docker Desktop from docker.com
3. Install → Settings → WSL2 backend enabled → Apply
4. Open terminal: `docker compose up -d`

### macOS (Intel + Apple Silicon)
1. Download Docker Desktop for Mac (choose Apple Silicon or Intel build)
2. Install → Open Docker Desktop → wait for engine to start
3. Terminal: `docker compose up -d`

### Ubuntu 22.04 / Debian 12
```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER  # run docker without sudo
newgrp docker
docker compose version
```

### Raspberry Pi OS (ARM64)
```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker pi
# Use arm64 nginx image — the standard nginx:alpine image supports ARM64 natively
docker compose up -d
```

### Synology NAS
1. Package Center → Install Docker
2. Open Docker → Registry → search nginx → download alpine tag
3. Or SSH into NAS: `sudo docker compose up -d` (DSM 7.2+)

### Unraid
1. Community Applications → search "nginx" → install
2. Map host path to `/usr/share/nginx/html`
3. Or use Docker Compose Manager plugin with `docker-compose.yml`

### TrueNAS Scale
1. Apps → Custom App → paste docker-compose.yml
2. Or use TrueNAS CLI: `k3s kubectl apply -f deploy/docker/docker-compose.yml`

---

# ENVIRONMENT CONFIGURATION

`.env.example` (Phase 2+ variables — not used in Phase 1):
```env
# ── Database ──────────────────────────────────────────
DB_HOST=localhost
DB_PORT=5432
DB_NAME=receipt_platform
DB_USER=receiptapp
DB_PASSWORD=change_me_in_production

# ── Authentication ────────────────────────────────────
JWT_SECRET=replace_with_64_char_random_string
JWT_EXPIRES_IN=7d
SESSION_SECRET=replace_with_64_char_random_string

# ── Google Drive (optional backup) ────────────────────
# User provides their OWN Google OAuth credentials
# No Anthropic/vendor account required
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=https://yourdomain.com/auth/google/callback

# ── Email (optional notifications) ────────────────────
SMTP_HOST=mail.yourdomain.com
SMTP_PORT=587
SMTP_USER=noreply@yourdomain.com
SMTP_PASSWORD=your_email_password
SMTP_FROM=Receipt Manager <noreply@yourdomain.com>

# ── Storage ───────────────────────────────────────────
STORAGE_PATH=/data/uploads
MAX_UPLOAD_MB=25

# ── Security ──────────────────────────────────────────
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
NODE_ENV=production
```

---

# DATABASE DOCUMENTATION (Phase 2+)

Document in `docs/SCHEMA.md`:

## Receipt table
| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| created_at | TIMESTAMPTZ | Auto |
| updated_at | TIMESTAMPTZ | Auto-updated |
| image_hash | VARCHAR(64) | SHA-256 for dedup |
| thumbnail | TEXT | Base64 JPEG |
| merchant | VARCHAR(255) | |
| abn | VARCHAR(14) | Formatted XX XXX XXX XXX |
| receipt_date | DATE | |
| receipt_time | TIME | Nullable |
| gst_cents | INTEGER | Stored as cents |
| total_cents | INTEGER | Stored as cents |
| payment_method | VARCHAR(50) | |
| business_id | UUID FK | businesses.id |
| category_id | UUID FK | categories.id |
| financial_year | VARCHAR(7) | e.g. "2024-25" |
| tags | TEXT[] | PostgreSQL array |
| notes | TEXT | |
| ocr_confidence | SMALLINT | 0–100 |
| ocr_raw | TEXT | Raw Tesseract output |
| ocr_edited | BOOLEAN | User corrected flag |

## Backup / restore
- Phase 1: JSON export/import via `js/export/json.js`
- Phase 2+: `pg_dump` / `pg_restore` with Docker volume backup

---

# TROUBLESHOOTING GUIDE

Document in README.md troubleshooting section:

| Problem | Cause | Fix |
|---|---|---|
| OCR returns garbage | Low contrast image | Preprocess auto-applies; advise user to retake photo with better lighting |
| OCR worker fails to load | No internet on first load | Service worker must cache worker after first online load |
| HEIC photo not converting | heic2any not loaded | Check CDN link in index.html; check console for 404 |
| Storage full warning | >250MB in IndexedDB | Prompt user to export + delete old receipts |
| Docker container exits | Port conflict | Run `lsof -i :80`; stop conflicting process |
| SSL not working (HostGator) | DNS not propagated | Wait 24–48h; check with `dig yourdomain.com` |
| Cloudflare 1020 error | Firewall rule blocking | Check Cloudflare WAF settings; whitelist your IP |
| App not updating after deploy | Service worker caching | Hard refresh (Ctrl+Shift+R); or increment SW cache version |
| Receipts missing after browser update | IndexedDB cleared | Explain browser storage is not guaranteed; encourage regular JSON export |

---

# PHASE COMPLETION RULE

A phase is ONLY complete when:
- All tasks in phase are `[x]`
- No TODOs remain in any file
- `docs/SMOKE_TESTS.md` checklist passes manually
- All three deployment methods documented
- `README.md` updated for this phase
- No console errors on fresh load in Chrome, Firefox, and Safari
- `dev` merged to `main`; release tagged

---

# FUTURE PHASES (stubs — do not implement yet)

## PHASE 2 — Multi-User Self-Hosted SaaS
- User authentication (JWT)
- Role-based access (admin, accountant, viewer)
- PostgreSQL database
- Node.js + Express API
- Docker full-stack deployment
- Email notifications
- Audit logging
- Data sync across devices

## PHASE 3 — Collaboration + Workflows
- Shared receipt libraries
- Approval workflows
- Comments + annotations
- Multi-business workspaces
- Team reporting

## PHASE 4 — Accounting Integrations + AI
- Xero integration
- MYOB integration
- AI categorisation
- Anomaly detection
- Automated GST reconciliation
- BAS report generation




