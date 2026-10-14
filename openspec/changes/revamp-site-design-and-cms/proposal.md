## Why

isfa.dev still looks like the stock Klise Jekyll theme, and only blog posts are editable through TinaCMS. The profile (name, bio, avatar), home page sections (News, Slides), the About page, navigation and social icons are hard-coded in `_config.yml`, `_data/*.yml` and Markdown, so every non-post edit needs a code change. A refreshed visual identity plus CMS coverage for all personal content lets the site be maintained from the browser.

## What Changes

- New design system: CSS custom-property tokens for color (light + dark), an editorial typography system (Source Serif 4 headings, Inter body, JetBrains Mono for code and labels), a warm paper color palette, spacing and radius tokens. Restyle layouts, home, post, about, blog list, tags and 404 pages on top of those tokens.
- Theme toggle keeps working (dark default per `_config.yml`), honoring the visitor's saved choice.
- Keep TinaCMS (free tier, already wired into the GitHub Actions build) as the CMS instead of building a custom one; extend its schema beyond posts:
  - **Profile**: name, tagline/bio, avatar image, social links with icons (moved out of `_config.yml` `author:` into `_data/profile.yml`).
  - **Home**: hero intro text and ordered sections, editable News (`_data/pers.yml`) and Slides (`_data/links.yml`) lists including icons and thumbnails.
  - **About**: the About page body and front matter.
  - **Navigation**: menu items (`_data/menus.yml`).
  - Image uploads (avatar, icons, thumbnails, post images) go to `assets/images/uploads` via Tina media.
- Templates read profile data from the new data file instead of `site.author`. **BREAKING** (internal only): `site.author.*` fields in `_config.yml` are no longer the source of truth for profile content.

## Capabilities

### New Capabilities
- `site-design-system`: Visual tokens (color, typography, spacing), light/dark theming, and consistent styling across all public pages.
- `content-management`: Browser-based editing via the CMS of posts, profile/avatar, home sections, About page, navigation and icons, with changes published through the existing build.

### Modified Capabilities
<!-- none: openspec/specs/ is empty -->

## Impact

- Code: `_sass/` (rewrite of `klise/*` into tokenized partials), `_layouts/*`, `_includes/{author,navbar,footer,header}.html`, `index.md`, `about.md`, `assets/js` (theme toggle).
- Data: new `_data/profile.yml`, `_data/home.yml`; existing `_data/{menus,links,pers}.yml` become CMS-managed.
- CMS: `tina/config.ts` gains collections; `admin/` and `tina/__generated__` rebuilt; `tina-lock.json` updated (TinaCloud schema must be re-indexed).
- CI: `.github/workflows/jekyll.yml` unchanged in shape; still needs `TINA_*` secrets.
- No new paid services; fonts self-hosted or via Google Fonts.
