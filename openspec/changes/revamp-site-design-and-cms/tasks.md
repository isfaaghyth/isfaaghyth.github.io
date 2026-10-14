## 1. Content model migration

- [x] 1.1 Create `_data/profile.yml` (name, bio, avatar, social links with icon keys) from `_config.yml` `author:`; verify `bundle exec jekyll build` passes
- [x] 1.2 Create `_data/home.yml` with `intro`, `news` (from `pers.yml`) and `slides` (from `links.yml`); remove old files; verify home renders the same entries in the same order
- [x] 1.3 Wrap `_data/menus.yml` as `{ items: [...] }` and update `_includes/navbar.html`; verify nav links unchanged
- [x] 1.4 Update `_includes/author.html`, `_layouts/post.html`, `about.md` social links to read `site.data.profile`; verify no remaining `site.author.avatar`/`bio` usages via grep

## 2. Design system

- [x] 2.1 Produce a quick mockup of the palette with Manrope typography (light/dark) and confirm with the owner before restyling — owner opted to review the built result instead; preview via `_drafts/design-preview.md`
- [x] 2.2 Add token partials (`_sass/tokens/*`) with light and dark values; verify AA contrast of text/link/accent pairs with a contrast checker
- [x] 2.3 Self-host Manrope (variable woff2) and JetBrains Mono in `assets/fonts` with `font-display: swap`, and set type-scale tokens (post body 17–18px, line-height ~1.7, headings 600–800); verify fonts load locally in network panel and no raw.githubusercontent requests remain
- [x] 2.9 Replace Manrope with Newsreader (headings) + Inter (body) self-hosted woff2, use JetBrains Mono for small uppercase labels; verify computed fonts on home and post pages and that Manrope files are removed
- [x] 2.10 Switch color tokens to the warm paper palette (light) and warm charcoal (dark); verify AA contrast with the contrast script and visually in both themes
- [x] 2.4 Restructure Sass into base/layout/components/pages using tokens only; remove `_dark.scss`; verify `grep` finds no hex colors outside token files
- [x] 2.5 Implement no-flash theme toggle in `<head>` with persisted preference; verify reload and navigation keep the selected theme
- [x] 2.6 Add `_includes/icon.html` inline-SVG set using `currentColor`; verify icons render in both themes
- [x] 2.7 Restyle home (hero with avatar/intro, posts, news, slides cards), blog list, post, tags, about and 404; verify each page at 375px and 1280px in both themes with no horizontal scroll
- [x] 2.8 Restyle syntax highlighting for both themes; verify an existing post with code blocks is legible

- [x] 2.11 Tighten the type scale (one size per role across pages) and Newsreader heading spacing; verify computed sizes for titles/labels/body match across home, blog, post, about
- [x] 2.12 Restore stacked home hero (avatar, name, short intro), use a 🪴 brand emoji instead of the avatar, update tagline and email, translate site copy to English (except News titles); verify on home, about, 404
- [x] 2.13 Add a work experience section to home from `_data/home.yml`; verify it renders and is editable in Tina
- [x] 2.15 Replace Newsreader with Source Serif 4 for headings and apply the owner's copy edits (bio with inline GitHub/X handles, top-6 experience with teams, About lede, gear, sign-off); verify computed heading font and content on home/about
- [x] 2.14 Add build-time slide thumbnail cache plugin, placeholder and lazy loading, plus CI cache step; verify thumbnails load from `/assets/cache/slides/` and a broken URL shows the placeholder
- [x] 2.16 Home refinements: new photo, "I'm Isfa" heading, updated tagline, socials only in footer, 1rem post-list titles, ghost containers instead of dividers, experience as one paragraph with inline company logos and a LinkedIn link; verified on home at 320px and desktop
- [x] 2.17 Move bio and GitHub/X handles into the Experience box, outline-only ghost containers with smaller radius and color-only hover, dailyfriend.ai logo, 🪴 favicon set (Twemoji, CC-BY attribution in `assets/favicons/ATTRIBUTION.txt`); verified hover state, favicon and logo responses
- [x] 2.18 Blog and tags lists use the same outlined cards as home; post table of contents in the right margin (≥1260px, sticky, bold active section, click-to-jump, per-post `toc: false`); verified highlight on scroll and click, hidden at 1100px, no overflow at 1260/1280px
- [x] 2.19 Replace "about" with "project" in the navigation (About page stays reachable at /about/); add /projects/ page using a shared thumbnail card include (title + platforms subtitle), `_data/projects.yml`, Tina "Projects" collection, and thumbnail caching for projects; verified page, menu active state and home slides unaffected

## 3. CMS schema

- [x] 3.1 Add Tina `profile` collection (single doc, image field for avatar, list of social links with icon select + optional image) for `_data/profile.yml`; verify edit+save in `npm run dev` updates the file
- [x] 3.2 Add Tina `home` collection (intro, reorderable news and slides lists with icon/thumbnail image fields); verify reorder in admin changes YAML order
- [x] 3.3 Add Tina `navigation` collection for `_data/menus.yml`; verify adding an external item renders with `target="_blank"`
- [x] 3.4 Add Tina `pages` collection for `about.md` (title, permalink, excerpt, rich-text body); verify an edit appears at `/about/` locally
- [x] 3.5 Add `emoticon` field to posts and confirm required title/date validation; verify a post without title cannot be saved
- [ ] 3.6 Run `npx tinacms build`, commit regenerated `admin/`, `tina/__generated__`, `tina-lock.json`; verify build succeeds without TinaCloud schema mismatch errors

## 4. Release verification

- [ ] 4.1 Push to `main` and confirm the GitHub Actions build/deploy succeeds and isfa.dev serves the new design
- [ ] 4.2 In production `/admin`, edit avatar, a social link, a slide and the About text; verify each change is committed and live after the build
- [ ] 4.3 Check existing post URLs, `/blog/`, `/tags/` and `/feed.xml` still resolve
