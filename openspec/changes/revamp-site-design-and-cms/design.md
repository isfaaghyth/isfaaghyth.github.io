## Context

The site is Jekyll on GitHub Pages (built by `.github/workflows/jekyll.yml`), using the Klise theme vendored in `_sass/klise/*`. TinaCMS 2.x (TinaCloud, free tier) is already configured in `tina/config.ts` with a single `posts` collection; `admin/` is built into the repo root. Profile data lives in `_config.yml` under `author:`, home sections in `_data/pers.yml` and `_data/links.yml`, nav in `_data/menus.yml`, About in `about.md`. Recent commits show friction keeping the Tina schema in sync with TinaCloud (`tina-lock.json`). See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**
- Token-based Sass/CSS architecture replacing Klise's ad-hoc variables.
- Every piece of personal content editable in Tina with Jekyll consuming it unchanged at build time.

**Non-Goals:**
- Migrating away from Jekyll or GitHub Pages.
- Building a bespoke CMS backend, multi-author support, comments, or search changes.
- Rewriting existing post content.

## Decisions

1. **Keep TinaCMS rather than a custom CMS or Decap/Strapi.** It is free for one user, Git-backed (no DB/hosting), already authenticated via TinaCloud and integrated in CI. Alternatives: Decap CMS (free, Git-based, but needs Netlify Identity or an OAuth proxy on GitHub Pages and would discard working setup); custom CMS (needs hosting, auth, and maintenance — disproportionate for a personal site); headless SaaS like Sanity/Contentful (content leaves the repo, requires a fetch step).
2. **Content in Jekyll data files, edited as Tina single-document collections.** Add Tina collections with `format: "yaml"` and `ui.allowedActions: { create: false, delete: false }` for `_data/profile.yml` and `_data/home.yml` (intro + list of `news` and `slides`) and `_data/menus.yml` wrapped as `{ items: [...] }`. Tina requires an object root, so list-root files (`links.yml`, `pers.yml`, `menus.yml`) are migrated into object-rooted files; templates updated accordingly. Alternative of keeping list-root YAML is not supported by Tina.
3. **About as a Tina `pages` collection** matching `about.md` (and optionally `404.md`) with `match.include`, fields title/permalink/excerpt/body. `layout` is not exposed (relies on file front matter / Jekyll defaults, consistent with commit a268419).
4. **Profile source of truth moves to `_data/profile.yml`.** Templates use `site.data.profile`; `_config.yml` `author:` kept only for SEO plugin fields that must stay in config (name, twitter) to avoid breaking `header.html` meta, and documented as derived.
5. **Icons**: social links use a small inline-SVG icon set selected by key (`github`, `x`, `linkedin`, `email`, `rss`, `mastodon`, `youtube`) via an `_includes/icon.html` include, plus an optional uploaded image override. Keeps icons themeable with `currentColor`.
6. **Design tokens as CSS custom properties** defined in `_sass/tokens/_colors.scss`, `_typography.scss`, `_spacing.scss`, with `:root` (light) and `[data-theme="dark"]` overrides. Sass partials restructured as `base/`, `layout/`, `components/`, `pages/`. Existing `_dark.scss` duplicating rules goes away.
7. **Typography — editorial pairing**: Source Serif 4 (variable serif with optical sizing; weight 600, italic for emphasis) for headings — chosen over Newsreader, which the owner found too newspaper-like next to Inter; Inter (variable, 400) for body/UI at ~17.5px, line-height 1.7, measure ≈ 68ch; JetBrains Mono for code and for small uppercase labels (eyebrows, dates, nav, section titles). All self-hosted as latin woff2 in `assets/fonts` with `font-display: swap`. Alternative considered and rejected after review: Manrope everywhere — its geometric shapes at heavy weights read as too strong and tiring for long posts. Inspired by the owner's reference site (evanpurnama.com); only the type system and palette mood are borrowed, not layout or branding.
   **Palette — warm paper**: light mode uses a warm paper background (≈ `#F3EFE4`), near-black ink text, warm muted grey; dark mode is a warm charcoal counterpart. The site keeps its own deep-green accent. Primary buttons use ink-on-paper inversion.
9. **Slide thumbnail cache**: a Jekyll generator plugin (`_plugins/slide_thumbnails.rb`, allowed because CI runs `jekyll build` itself) downloads remote thumbnails into `.cache/thumbs/` using content-hashed filenames, registers them as static files under `/assets/cache/slides/`, and falls back silently on failure. CI persists `.cache/thumbs` with `actions/cache` so unchanged thumbnails are not re-downloaded. Browser side: `loading="lazy"`, fixed aspect ratio, and an `onerror` swap to a CSS placeholder. Alternative: committing thumbnails by hand — rejected because CMS-added slides with remote URLs would bypass it.
8. **Theme toggle**: inline script in `<head>` reads `localStorage` (try/catch) and sets `data-theme` before paint to avoid flash; falls back to `site.mode`.

## Risks / Trade-offs

- [TinaCloud schema drift breaks CMS editing] → regenerate `tina-lock.json` with `tinacms build` locally and commit with the schema change; verify in TinaCloud dashboard after deploy.
- [Data-file shape change breaks templates] → migrate files and templates in the same commit; `jekyll build` must pass in CI.
- [Restyle regresses readability of old posts] → spot-check several existing posts with code, images and tables in both themes.
- [Free tier limits (TinaCloud users/requests)] → single-owner use well within limits; content remains plain files in Git if Tina is ever dropped.

## Migration Plan

1. Land data-file migration + templates + Tina schema (site looks the same).
2. Land design system and restyle.
3. Deploy via push to `main`; rollback by reverting the commit(s) — content is in Git, so no data migration to undo.

## Open Questions

- Exact palette is chosen during the mockup task; any choice satisfies the specs.
