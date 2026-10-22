# RaghusLogicLab — main domain website

A simple static website (no server, no database) that you can host on any domain.

## Files

| File | What it is |
|---|---|
| `index.html` | Home page: hero, **Projects ▾ dropdown**, project grid, daily Lab Log, About, Contact |
| `project.html` | One page per project — this is the **customer link** (`project.html?p=link-name`) |
| `admin.html` | **Project Studio** — Create Project, Manage Projects, Daily Update, Settings & Publish |
| `data/site-data.js` | All your content: settings, projects and updates |
| `assets/style.css`, `assets/app.js` | Design and shared code |
| `tools/` | Tools, one HTML page each (Aadhaar DoB Annexure Maker, Aadhaar Name Update Affidavit Maker) |

## Try it now
Double-click `index.html` — it opens in your browser and works offline.

## Create a project (any time)
1. Open the **Projects ▾** menu → **+ Create Project** (or open `admin.html`).
2. Fill in name, status, visibility, and the project's own website/subdomain if it has one.
3. Click **Create project** → you get the **customer link** to copy and send.
   - *Public* projects show in the menu and on the home page.
   - *Unlisted* projects are hidden — only people with the link can open them.

Changes are saved in your browser as a **draft** and appear on your pages in *Preview mode* (only you see them).

## Tools
The **Tools ▾** menu and the *Tools* section on the home page list everything in the `tools` array at the bottom of `data/site-data.js`.
To add a tool:
1. Put its page in the `tools/` folder (one self-contained HTML file).
2. Add an entry to `"tools"` in `data/site-data.js` (copy an existing one and change `id`, `slug`, `name`, `tagline`, `description`, `url`, `color`, `added`).
3. Set `"visibility": "unlisted"` to hide a tool from the menu without deleting it.

Tool pages download PDF/Word files straight from the browser. They need internet for the PDF/Word libraries (loaded from cdnjs/unpkg).

## Daily update routine
1. `admin.html` → **Daily Update** → write what changed → **Add to Lab Log**.
2. **Settings & Publish** → **Download site-data.js**.
3. Replace `data/site-data.js` on your host with the downloaded file. Done — customers see it.

## Put it on your domain
- Set **Your domain** in *Settings & Publish* (e.g. `https://raghuslogiclab.com`) so customer links use it.
- Upload the whole folder to any static host: Netlify (drag & drop), GitHub Pages, Cloudflare Pages, or Hostinger/cPanel `public_html`.
- **Subdomains:** create them at your DNS/host (e.g. `tools.raghuslogiclab.com`), point each at that project's site, then put the address in the project's *website / subdomain* field.

## Good to know
- `admin.html` can't change the live site on its own — only uploading `site-data.js` does — so visitors who open it can't alter anything. It is marked `noindex` so search engines skip it. If you prefer, don't upload `admin.html` at all and keep it only on your computer.
- Unlisted links are hidden, not password-protected. Don't put secrets in project descriptions.
- Drafts live in one browser. Use **Import site-data.js** to continue on another computer.

## Ideas to add next (scope for daily growth)
Project screenshots/gallery · search box · customer enquiry form (Formspree/Netlify Forms) · per-project changelog pages · RSS feed of the Lab Log · real login for private client areas (needs a backend such as Supabase/Firebase) · analytics.
