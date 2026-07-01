# Receipt Management Platform — TASKS.md

This is the SINGLE SOURCE OF TRUTH for Copilot execution.

Rules:
- Work top-down only
- Only current phase tasks
- Mark DONE when complete
- Never skip ahead

---

# PHASE 1 — OFFLINE SINGLE-USER APP

## Implementation
- [x] Initialize project structure
- [x] Setup ES6 module architecture
- [x] Setup IndexedDB storage (LocalForage)
- [x] Build base UI layout (sidebar + dashboard)

---

## Receipt Upload
- [x] Image upload (JPG/PNG/HEIC/WebP)
- [x] Camera capture
- [x] Drag & drop upload
- [x] Batch upload
- [x] PDF support

---

## OCR System
- [x] Tesseract.js integration
- [x] OpenCV image preprocessing
- [x] Extract receipt fields:
  - [x] Merchant name
  - [x] ABN
  - [x] Date/time
  - [x] GST
  - [x] Total
  - [x] Payment method
- [x] OCR confidence scoring
- [x] Editable OCR UI

---

## Financial System
- [x] Australian financial year logic (1 July–30 June)
- [x] Auto assign financial year
- [x] Manual override financial year
- [x] Local business system
- [x] Local category system

---

## Core UI
- [x] Dashboard + charts (Chart.js)
- [x] Receipt viewer (zoom/rotate/edit)
- [x] Search system
- [x] Filters system
- [x] Notes & tags
- [x] Dark/light mode

---

## Storage
- [x] IndexedDB schema design
- [x] CRUD receipts
- [x] Duplicate detection
- [x] Offline persistence (10k+ receipts)

---

## Export
- [x] Excel export (.xlsx)
- [x] CSV export
- [x] JSON backup
- [x] ZIP export (images grouped by business/year)

---

## PWA
- [x] Service worker
- [x] Offline caching
- [x] Installable PWA

---

## Optional Cloud
- [x] Google Drive backup (optional)

---

## PHASE 1 FINALIZATION
- [x] Full integration testing
- [x] Fix bugs
- [x] Performance optimization
- [x] COMPLETE README.md (mandatory sections below)

---

# PHASE 2 — SELF-HOSTED MULTI-USER SAAS

## Hosted Platform
- [x] Add self-hosted Node.js entrypoint
- [x] Add SQLite-backed hosted persistence
- [x] Add hosted auth (register/login/logout)
- [x] Add per-user receipt isolation
- [x] Add hosted settings + lookup storage

---

## Security & Operations
- [x] Add session hashing
- [x] Add hosted rate limiting
- [x] Add security headers and CSP controls
- [x] Add audit logging
- [x] Preserve offline fallback mode

---

## Hosted UI
- [x] Add hosted-mode detection
- [x] Add login/register shell
- [x] Add logout flow
- [x] Add audit log panel
- [x] Update README.md and `.env.example`

---

# 📘 README REQUIREMENTS (MANDATORY FOR EVERY PHASE)

Must include:

- [x] Overview
- [x] Features
- [x] Architecture
- [x] Installation instructions
- [x] Configuration
- [x] Deployment methods
- [x] Backup & restore
- [x] Troubleshooting
- [x] FAQ
- [x] Changelog
- [x] Contribution guide

---

# 🌐 GITHUB PAGES GUIDE (MANDATORY)

- [x] Creating repo
- [x] Uploading code
- [x] Enabling Pages
- [x] Deploying
- [x] Updating

---

# 🧩 HOSTGATOR INSTALLATION GUIDE (MANDATORY)

## Shared Hosting
- [x] cPanel usage
- [x] File Manager upload
- [x] public_html setup
- [x] domain setup
- [x] SSL configuration
- [x] permissions
- [x] troubleshooting

## VPS Hosting
- [x] SSH setup
- [x] Docker installation
- [x] Docker Compose deployment
- [x] reverse proxy setup
- [x] HTTPS setup
- [x] auto restart services
- [x] updates & maintenance

---

# 🐳 DOCKER INSTALLATION GUIDE (ALL PLATFORMS)

- [x] Windows (Docker Desktop + WSL2)
- [x] macOS (Intel + Apple Silicon)
- [x] Ubuntu
- [x] Debian
- [x] Raspberry Pi OS
- [x] Synology NAS
- [x] Unraid
- [x] TrueNAS

---

# ⚙️ ENVIRONMENT CONFIGURATION

- [x] Provide `.env.example` with:
  - [x] Database config
  - [x] Auth secrets
  - [x] Google Drive config
  - [x] Email config
  - [x] Storage config
  - [x] Security settings
- [x] Explain each variable clearly.

---

# 🗄 DATABASE DOCUMENTATION

- [x] Schema diagrams
- [x] Table descriptions
- [x] Relationships
- [x] Migration steps
- [x] Backup/restore

---

# 🛠 TROUBLESHOOTING GUIDE

- [x] Docker issues
- [x] Login failures
- [x] Sync problems
- [x] OCR errors
- [x] Email issues
- [x] Hosting issues
- [x] Performance issues

---

# 👤 ADMIN & USER GUIDES

## Admin Guide
- [x] Users
- [x] Roles
- [x] Security
- [x] Logs
- [x] Backups
- [x] System monitoring

## User Guide
- [x] Upload receipts
- [x] OCR editing
- [x] Search & filtering
- [x] Reports
- [x] Exporting
- [x] Sync usage

---

# ⬆ UPGRADE GUIDE

- [x] Changes
- [x] Migration steps
- [x] Breaking changes
- [x] Rollback instructions

---

# PHASE COMPLETION RULE

Each phase is ONLY complete when:
- [x] All tasks done
- [x] No TODOs remain
- [x] Documentation fully written
- [x] System stable
- [x] No console errors

---

# FINAL SUCCESS CRITERIA

The system must:

- [x] Start as a GitHub Pages offline app
- [x] Evolve into multi-user SaaS
- [x] Remain self-hostable
- [x] Never require paid services
- [x] Support Australian accounting rules
- [x] Handle 10,000+ receipts
- [x] Provide OCR + manual editing
- [x] Support exports (Excel, CSV, JSON, ZIP)
- [x] Include audit logging
- [ ] Include collaboration + workflows
- [ ] Include integrations + AI features
- [x] Be secure, scalable, production-ready
