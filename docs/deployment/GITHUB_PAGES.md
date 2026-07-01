# GitHub Pages Deployment

1. Create a GitHub repository (public or private).
2. Upload project files using drag-and-drop in the web UI or `git push`.
3. Open **Settings → Pages** and set **Source** to deploy from the `main` branch, root folder.
4. Visit `https://yourusername.github.io/receipt-platform/`.
5. Updating: push changes to `main`; GitHub Pages redeploys automatically (usually ~60 seconds).
6. Custom domain: add a `CNAME` record and configure the custom domain in Pages settings.
7. Troubleshooting:
   - 404 on reload: this app uses hash routing, so no extra server config is required.
   - HEIC on older Safari: use JPEG upload fallback when conversion is unsupported.
