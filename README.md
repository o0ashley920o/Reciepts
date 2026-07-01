# Receipt Management Platform

## Overview

Receipt Management Platform is a Phase 1 offline-first bookkeeping app built for GitHub Pages and other static hosts. It captures receipt images or PDFs, preprocesses them in the browser, runs OCR with editable extraction results, auto-assigns Australian financial years, stores data locally in IndexedDB through LocalForage, and exports data without requiring paid services.

## Features

- Offline single-user workflow with installable PWA support
- ES6 module architecture with clear separation for OCR, storage, exports, finance, UI, and backup logic
- Receipt upload via file picker, drag and drop, camera capture, batch processing, and PDF ingestion
- HEIC/HEIF conversion, OpenCV preprocessing, and Tesseract.js OCR
- Automatic extraction for merchant, ABN, date/time, GST, total, and payment method with editable confidence-aware fields
- Australian financial year assignment (1 July to 30 June) with manual override
- Local business and category management
- Dashboard charts powered by Chart.js
- Receipt viewer with zoom, rotate, and editable metadata
- Search, filters, notes, tags, duplicate detection, and local persistence
- Export to Excel, CSV, JSON backup, and ZIP grouped by business and financial year
- Optional Google Drive backup using user-supplied Google OAuth credentials

## Architecture

### Front-end modules

- `/home/runner/work/Reciepts/Reciepts/index.html` — static shell and application layout
- `/home/runner/work/Reciepts/Reciepts/src/scripts/app.js` — app bootstrap, event wiring, and orchestration
- `/home/runner/work/Reciepts/Reciepts/src/scripts/storage.js` — LocalForage-backed IndexedDB schema and CRUD helpers
- `/home/runner/work/Reciepts/Reciepts/src/scripts/ocr.js` — upload normalization, OpenCV preprocessing, PDF rendering, and Tesseract OCR
- `/home/runner/work/Reciepts/Reciepts/src/scripts/finance.js` — Australian financial year logic
- `/home/runner/work/Reciepts/Reciepts/src/scripts/exports.js` — Excel, CSV, JSON, and ZIP export flows
- `/home/runner/work/Reciepts/Reciepts/src/scripts/drive.js` — optional Google Drive backup connector
- `/home/runner/work/Reciepts/Reciepts/src/scripts/ui.js` — rendering, charts, theme handling, and notifications
- `/home/runner/work/Reciepts/Reciepts/sw.js` — offline caching service worker
- `/home/runner/work/Reciepts/Reciepts/manifest.webmanifest` — installable PWA manifest

### Runtime libraries

- LocalForage for IndexedDB persistence
- Tesseract.js for OCR
- OpenCV.js for preprocessing
- Chart.js for dashboard visualisations
- pdf.js for first-page PDF rendering
- SheetJS for `.xlsx` export
- JSZip for archive generation
- heic2any for HEIC and HEIF conversion

### Data flow

1. Upload receipts from camera, drag-and-drop, file picker, or PDF batch upload.
2. Normalize files, convert unsupported image formats, render PDFs, and preprocess with OpenCV.
3. Run OCR and field extraction in-browser.
4. Save metadata plus source blobs to IndexedDB via LocalForage.
5. Display charts, search results, and editable receipt detail.
6. Export or back up data to local files or optional Google Drive.

## Installation instructions

### Local preview

```bash
npm run preview
```

Then open `http://127.0.0.1:4173/`.

### Static hosting prerequisites

- Modern Chromium, Safari, or Firefox browser with IndexedDB support
- JavaScript enabled
- Ability to serve the committed static files, including `src/vendor/` assets

### First-time setup

1. Start the app.
2. Add or rename businesses and categories in the sidebar.
3. Open Settings and confirm locale, currency, and optional Google Drive values.
4. Upload sample receipts and verify OCR output before large-scale use.
5. Install the PWA if you want a desktop-like shortcut.

## Configuration

### UI settings

The Settings panel persists:

- `currency` — display currency, default `AUD`
- `locale` — number and date locale, default `en-AU`
- `googleClientId` — optional OAuth client for Drive backups
- `googleBackupFileName` — file name used during Drive backup
- `googleDriveFolder` — `appDataFolder` or another Drive target
- `theme` — light or dark display mode

### Environment configuration

The repository includes `/home/runner/work/Reciepts/Reciepts/.env.example` for future hosted or multi-user deployments.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Optional external database connection string for future server-backed modes |
| `DATABASE_NAME` | Logical database name used by hosted deployments |
| `DATABASE_BACKUP_PATH` | Default filesystem path for automated backups |
| `AUTH_JWT_SECRET` | Secret used to sign JWT tokens in future authenticated modes |
| `AUTH_SESSION_SECRET` | Secret used for browser session signing |
| `ADMIN_EMAIL` | Bootstrap administrator email |
| `ADMIN_PASSWORD` | Bootstrap administrator password |
| `GOOGLE_CLIENT_ID` | OAuth client ID for Google Drive backup |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret for hosted flows |
| `GOOGLE_REDIRECT_URI` | Redirect URL registered with Google OAuth |
| `GOOGLE_DRIVE_FOLDER` | Preferred Drive folder or `appDataFolder` |
| `SMTP_HOST` | Email server host |
| `SMTP_PORT` | Email server port |
| `SMTP_SECURE` | Whether TLS is required |
| `SMTP_USERNAME` | SMTP login name |
| `SMTP_PASSWORD` | SMTP password |
| `SMTP_FROM` | Default sender address |
| `STORAGE_DRIVER` | Preferred persistence engine, default `indexeddb` |
| `STORAGE_MAX_RECEIPTS` | Operational receipt target for capacity planning |
| `STORAGE_MAX_UPLOAD_MB` | Recommended single-upload limit |
| `STORAGE_ZIP_EXPORT_PATH` | Hosted export destination |
| `APP_ENV` | Runtime environment label |
| `CORS_ALLOWED_ORIGINS` | Allowed origins for hosted APIs |
| `CONTENT_SECURITY_POLICY_ENABLED` | Whether CSP headers are enabled |
| `RATE_LIMIT_PER_MINUTE` | Hosted API rate limit |
| `LOG_LEVEL` | Logging verbosity |

## Deployment methods

### GitHub Pages guide

#### Creating repo

1. Create a GitHub repository.
2. Push the contents of this project to the default branch.
3. Confirm the repository is public or that Pages is enabled for your plan.

#### Uploading code

1. Commit all project files, including `index.html`, `manifest.webmanifest`, `sw.js`, and the `src/` directory.
2. Avoid rewriting Git history after users have installed the PWA, because service-worker URLs should stay stable.

#### Enabling Pages

1. Open repository **Settings**.
2. Go to **Pages**.
3. Select the branch and root directory that contains `index.html`.
4. Save and wait for the Pages build to finish.

#### Deploying

1. Visit the published Pages URL once while online.
2. Verify the browser registers the service worker and offers install support.
3. Upload a sample receipt and confirm IndexedDB data persists after refresh.

#### Updating

1. Commit your changes.
2. Push to the Pages source branch.
3. Refresh the deployed site and allow the service worker to update.
4. Re-test OCR, exports, and backup flows after each release.

### HostGator installation guide

#### Shared Hosting

- **cPanel usage** — log in to cPanel and open File Manager.
- **File Manager upload** — upload the full project archive or sync the project directory.
- **`public_html` setup** — place the site contents so `index.html` sits directly inside `public_html` or the target subdirectory.
- **Domain setup** — point the domain or subdomain document root to the deployment folder.
- **SSL configuration** — enable AutoSSL or install a certificate before using PWA features.
- **Permissions** — standard `644` file and `755` directory permissions are sufficient for a static deployment.
- **Troubleshooting** — clear HostGator cache, confirm MIME types for `.webmanifest`, and verify service-worker files are served over HTTPS.

#### VPS Hosting

- **SSH setup** — connect with a non-root sudo user and set up SSH keys.
- **Docker installation** — install Docker Engine and Docker Compose Plugin.
- **Docker Compose deployment** — serve the static files with Nginx or Caddy in a compose stack.
- **Reverse proxy setup** — route your domain to the static container.
- **HTTPS setup** — terminate TLS with Caddy, Traefik, or Nginx plus Certbot.
- **Auto restart services** — set `restart: unless-stopped` in Compose.
- **Updates and maintenance** — redeploy after each release and keep browser-accessible asset URLs stable.

### Docker installation guide

- **Windows (Docker Desktop + WSL2)** — install Docker Desktop, enable WSL2 integration, then run a static web server container pointed at the repository.
- **macOS (Intel + Apple Silicon)** — install Docker Desktop, mount the project into an Nginx or Caddy container, and publish port `4173` or `80`.
- **Ubuntu** — install Docker Engine and Compose Plugin from Docker’s apt repository.
- **Debian** — install Docker Engine and Compose Plugin from Docker’s apt repository.
- **Raspberry Pi OS** — install the ARM-compatible Docker packages and use multi-arch images.
- **Synology NAS** — use Container Manager or SSH plus Docker CLI to serve the static folder.
- **Unraid** — deploy an Nginx or Caddy container from Community Apps and map the project folder.
- **TrueNAS** — create an application or custom container that exposes the static site through HTTPS.

## Backup & restore

### Local JSON backup

1. Click **Export JSON backup**.
2. Store the generated file in secure local or cloud storage.
3. To restore, use **Import JSON backup** and select the JSON file.

### ZIP export

The ZIP export groups source images by business and financial year and includes a `metadata.json` manifest.

### Google Drive backup

1. Create a Google OAuth client for a web application.
2. Add the client ID in Settings.
3. Click **Connect Google Drive**.
4. Click **Backup to Drive** to upload a JSON snapshot.

### Restore strategy

- Restore JSON backups into the same browser profile or another modern browser.
- Reconfirm settings, businesses, and categories after importing.
- Re-run OCR on critical receipts if you suspect stale extraction rules.

## Database documentation

### Schema diagram

```text
+-------------------+        +--------------------+
| receipts store    |        | receipt-files store|
|-------------------|        |--------------------|
| id (primary key)  |<-----> | receiptId          |
| merchantName      |        | sourceBlob         |
| abn               |        | previewBlob        |
| dateTime          |        +--------------------+
| total             |
| gst               |        +--------------------+
| paymentMethod     |        | lookups store      |
| financialYear     |        |--------------------|
| businessId        |        | businesses[]       |
| categoryId        |        | categories[]       |
| status            |        +--------------------+
| notes             |
| tags[]            |        +--------------------+
| ocrText           |        | settings store     |
| confidence fields |        |--------------------|
| fingerprint       |        | theme              |
| duplicateOf       |        | locale             |
+-------------------+        | currency           |
                             | googleClientId     |
                             +--------------------+
```

### Table descriptions

- **receipts store** — metadata for each receipt, extraction result, lookup references, and duplicate fingerprint
- **receipt-files store** — original uploaded blob and generated preview blob
- **lookups store** — local businesses and categories
- **settings store** — UI and backup preferences

### Relationships

- `receipts.businessId` references an item inside `lookups.businesses`
- `receipts.categoryId` references an item inside `lookups.categories`
- `receipt-files.receiptId` matches `receipts.id`
- `receipts.duplicateOf` links to another record in the same store when a fingerprint collision occurs

### Migration steps

1. Increment the local schema version in backup exports when the data shape changes.
2. Add migration logic in `storage.js` before hydrating old backups.
3. Test import and export before releasing a schema change.
4. Keep derived values such as `financialYear` rebuildable from the raw fields.

### Backup/restore

- Use JSON backup for full database snapshots.
- Use ZIP export when you need files grouped by business and financial year.
- Keep multiple dated snapshots before changing schema or OCR logic.

## Troubleshooting

### Docker issues

- Verify your container serves `index.html` from the document root.
- Confirm `manifest.webmanifest` and `sw.js` are not blocked by proxy rules.

### Login failures

Phase 1 does not require sign-in. If Google Drive backup fails, recheck the Google OAuth client ID and authorised origin.

### Sync problems

Phase 1 is local-only. If data appears missing, verify you are using the same browser profile and that IndexedDB storage has not been cleared.

### OCR errors

- Re-run OCR after rotating or replacing low-quality scans.
- Prefer high-contrast images and well-lit camera captures.
- Confirm the bundled OpenCV and Tesseract assets inside `src/vendor/` are being served correctly.

### Email issues

Email flows are reserved for future hosted deployments. Keep SMTP variables blank in static mode.

### Hosting issues

- Use HTTPS for PWA installation and service-worker registration.
- Ensure the host returns the correct MIME type for `.webmanifest`.
- Ensure the `src/vendor/` directory is deployed with the rest of the static site.

### Performance issues

- Use batch uploads in smaller groups if OCR is slow on low-power devices.
- Export and archive older years to keep the active working set smaller.
- Limit very large PDF scans to the most relevant pages before upload.

## FAQ

### Does the app work offline?

Yes. After the first online load, the service worker caches the static shell and the app stores receipt data locally in IndexedDB.

### Does it support Australian accounting rules?

Yes. The app automatically assigns Australian financial years using the 1 July to 30 June boundary and allows manual overrides.

### Can I edit OCR mistakes?

Yes. Every extracted field and the raw OCR text can be edited from the receipt detail form.

### How are duplicates detected?

The app calculates a SHA-256 fingerprint of the uploaded file and flags later receipts that match an existing fingerprint.

### Is Google Drive required?

No. Google Drive backup is optional. Local JSON and ZIP exports work without it.

## Admin guide

Phase 1 is single-user and browser-local, so the current administrator is effectively the browser owner.

- **Users** — only the local browser user has access
- **Roles** — no multi-role model yet
- **Security** — use device access controls, browser profile protection, and encrypted backups
- **Logs** — review browser console logs during troubleshooting and keep exported snapshots for audit history
- **Backups** — schedule JSON exports before cleanup or browser resets
- **System monitoring** — watch storage quotas, OCR performance, and service-worker registration status

## User guide

- **Upload receipts** — use Upload files, Use camera, or drag-and-drop
- **OCR editing** — review merchant, ABN, date, GST, total, payment method, notes, tags, and OCR text in the detail form
- **Search and filtering** — use the dashboard search box and filter row to narrow by business, category, financial year, payment method, or status
- **Reports** — review dashboard totals plus category and financial-year charts
- **Exporting** — use CSV, Excel, JSON, and ZIP export buttons
- **Sync usage** — Phase 1 has no multi-device sync; use JSON or Google Drive backup for manual transfer

## Upgrade guide

Each release should document:

- **Changes** — summarise new features and schema updates
- **Migration steps** — explain required import/export or storage migrations
- **Breaking changes** — list removed fields, renamed settings, or browser support changes
- **Rollback instructions** — restore the previous deployment and import the most recent compatible JSON backup

## Changelog

### v1.0.0-phase1

- Added the offline single-user receipt management app shell
- Added IndexedDB persistence with LocalForage
- Added OCR, financial year logic, exports, PWA support, and optional Google Drive backup
- Added complete Phase 1 deployment and operations documentation

## Contribution guide

1. Read `TASKS.md` and work top-down.
2. Keep Phase boundaries intact.
3. Preserve ES6 module separation.
4. Validate browser behaviour, offline caching, OCR, and exports before merging.
5. Update `README.md` and `TASKS.md` with every completed task group.
