# HostGator Deployment

## SECTION A — Shared Hosting (Phase 1 Static)

### Prerequisites
- HostGator shared hosting account with cPanel access
- Domain name pointed to HostGator nameservers

### Step-by-step deployment
1. Log in to cPanel at `https://yourdomain.com/cpanel`.
2. Open File Manager and navigate to `public_html/`.
3. Upload all project files.
4. Verify `public_html/index.html` exists.
5. Visit `https://yourdomain.com`.
6. Enable SSL via AutoSSL / Let's Encrypt in cPanel.
7. Set permissions (files 644, folders 755).

### `.htaccess`
```apache
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]

Header always set X-Content-Type-Options nosniff
Header always set X-Frame-Options SAMEORIGIN
Header always set Referrer-Policy strict-origin-when-cross-origin
```

### Updating
- Upload changed files and overwrite existing files, or use FTP.

### Troubleshooting (Shared Hosting)
- Blank page: verify module paths and browser console.
- 404 assets: check case-sensitive file names.
- SSL not working: wait for AutoSSL provisioning.
- HEIC upload fails: ensure browser support and heic2any fallback.

## SECTION B — VPS Hosting with Docker (Phase 1 Static + Phase 2+)

### Prerequisites
- HostGator VPS with SSH access
- Ubuntu 22.04 LTS recommended
- Domain pointed to VPS IP

### Steps
1. SSH to VPS: `ssh root@your-vps-ip`
2. Install Docker: `curl -fsSL https://get.docker.com | sh`
3. Install compose plugin: `apt install docker-compose-plugin -y`
4. Clone project to `/opt/receipt-platform`
5. Deploy: `docker compose -f deploy/docker/docker-compose.yml up -d`
6. Verify with `docker compose ps` and `curl http://localhost:80`
7. Configure HTTPS with certbot
8. Configure firewall (`ufw allow OpenSSH`, `ufw allow 'Nginx Full'`)

### Updating
```bash
cd /opt/receipt-platform
git pull origin main
docker compose -f deploy/docker/docker-compose.yml up -d --build
```

### Troubleshooting (VPS + Docker)
- Port conflicts on 80/443
- Review `docker compose logs` if startup fails
- Confirm DNS before certbot runs
- Run `docker system prune` when disk is full
