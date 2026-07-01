# Cloudflare Deployment

## Cloudflare Pages (Phase 1 — Static)

1. Log in to Cloudflare Dashboard → Pages → Create a project.
2. Connect the GitHub repository.
3. Build settings: no build command, output directory `/` (root).
4. Deploy and use the generated domain like `https://receipt-platform.pages.dev`.
5. Add a custom domain in Pages settings (SSL is automatic).
6. Add `deploy/cloudflare/_redirects` with `/* /index.html 200` for SPA fallback.
7. Updating: push to `main`; Cloudflare redeploys automatically.

## Cloudflare Workers (Phase 2+ API — stub)

Phase 2 can add backend APIs through Cloudflare Workers. See `deploy/cloudflare/wrangler.toml` placeholder config.

## Cloudflare notes

- Free plan limits are sufficient for Phase 1 static hosting.
- Enable **Always Use HTTPS**.
- Enable **Auto Minify** for JS, CSS, and HTML.
- Purge cache after deployment if stale assets appear.
