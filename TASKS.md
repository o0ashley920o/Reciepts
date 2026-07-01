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
- [ ] Setup ES6 module architecture
- [ ] Setup IndexedDB storage (LocalForage)
- [ ] Build base UI layout (sidebar + dashboard)

---

## Receipt Upload
- [ ] Image upload (JPG/PNG/HEIC/WebP)
- [ ] Camera capture
- [ ] Drag & drop upload
- [ ] Batch upload
- [ ] PDF support

---

## OCR System
- [ ] Tesseract.js integration
- [ ] OpenCV image preprocessing
- [ ] Extract receipt fields:
  - [ ] Merchant name
  - [ ] ABN
  - [ ] Date/time
  - [ ] GST
  - [ ] Total
  - [ ] Payment method
- [ ] OCR confidence scoring
- [ ] Editable OCR UI

---

## Financial System
- [ ] Australian financial year logic (1 July–30 June)
- [ ] Auto assign financial year
- [ ] Manual override financial year
- [ ] Local business system
- [ ] Local category system

---

## Core UI
- [ ] Dashboard + charts (Chart.js)
- [ ] Receipt viewer (zoom/rotate/edit)
- [ ] Search system
- [ ] Filters system
- [ ] Notes & tags
- [ ] Dark/light mode

---

## Storage
- [ ] IndexedDB schema design
- [ ] CRUD receipts
- [ ] Duplicate detection
- [ ] Offline persistence (10k+ receipts)

---

## Export
- [ ] Excel export (.xlsx)
- [ ] CSV export
- [ ] JSON backup
- [ ] ZIP export (images grouped by business/year)

---

## PWA
- [ ] Service worker
- [ ] Offline caching
- [ ] Installable PWA

---

## Optional Cloud
- [ ] Google Drive backup (optional)

---

## PHASE 1 FINALIZATION
- [ ] Full integration testing
- [ ] Fix bugs
- [ ] Performance optimization
- [ ] COMPLETE README.md (mandatory sections below)

---

# 📘 README REQUIREMENTS (MANDATORY FOR EVERY PHASE)

Must include:

- Overview
- Features
- Architecture
- Installation instructions
- Configuration
- Deployment methods
- Backup & restore
- Troubleshooting
- FAQ
- Changelog
- Contribution guide

---

# 🌐 GITHUB PAGES GUIDE (MANDATORY)

- Creating repo
- Uploading code
- Enabling Pages
- Deploying
- Updating

---

# 🧩 HOSTGATOR INSTALLATION GUIDE (MANDATORY)

## Shared Hosting
- cPanel usage
- File Manager upload
- public_html setup
- domain setup
- SSL configuration
- permissions
- troubleshooting

## VPS Hosting
- SSH setup
- Docker installation
- Docker Compose deployment
- reverse proxy setup
- HTTPS setup
- auto restart services
- updates & maintenance

---

# 🐳 DOCKER INSTALLATION GUIDE (ALL PLATFORMS)

- Windows (Docker Desktop + WSL2)
- macOS (Intel + Apple Silicon)
- Ubuntu
- Debian
- Raspberry Pi OS
- Synology NAS
- Unraid
- TrueNAS

---

# ⚙️ ENVIRONMENT CONFIGURATION

Provide `.env.example` with:

- Database config
- Auth secrets
- Google Drive config
- Email config
- Storage config
- Security settings

Explain each variable clearly.

---

# 🗄 DATABASE DOCUMENTATION

Include:
- Schema diagrams
- Table descriptions
- Relationships
- Migration steps
- Backup/restore

---

# 🛠 TROUBLESHOOTING GUIDE

Cover:
- Docker issues
- Login failures
- Sync problems
- OCR errors
- Email issues
- Hosting issues
- Performance issues

---

# 👤 ADMIN & USER GUIDES

## Admin Guide
- Users
- Roles
- Security
- Logs
- Backups
- System monitoring

## User Guide
- Upload receipts
- OCR editing
- Search & filtering
- Reports
- Exporting
- Sync usage

---

# ⬆ UPGRADE GUIDE

Each release must include:
- Changes
- Migration steps
- Breaking changes
- Rollback instructions

---

# PHASE COMPLETION RULE

Each phase is ONLY complete when:
- All tasks done
- No TODOs remain
- Documentation fully written
- System stable
- No console errors

---

# FINAL SUCCESS CRITERIA

The system must:

- Start as a GitHub Pages offline app
- Evolve into multi-user SaaS
- Remain self-hostable
- Never require paid services
- Support Australian accounting rules
- Handle 10,000+ receipts
- Provide OCR + manual editing
- Support exports (Excel, CSV, JSON, ZIP)
- Include audit logging
- Include collaboration + workflows
- Include integrations + AI features
- Be secure, scalable, production-ready
