## Purpose

Lets the site owner edit all personal content of isfa.dev — blog posts, profile and avatar, home page sections, About page, navigation and icons — from a browser-based CMS, with changes published through the normal site build.

## ADDED Requirements

### Requirement: Authenticated CMS access
The CMS editor SHALL be reachable at `/admin` and SHALL only allow content changes by an authenticated owner account.

#### Scenario: Anonymous visitor
- **WHEN** an unauthenticated visitor opens `/admin`
- **THEN** they are asked to sign in and cannot view or save content edits

### Requirement: Blog post publishing
The owner SHALL be able to create, edit and delete blog posts with title, date, categories, tags, optional emoticon, rich-text body and inline images, and saved posts SHALL appear on the site after the next build.

#### Scenario: Publish a new post
- **WHEN** the owner creates a post titled "Hello KMP" dated 2026-10-20 and saves it
- **THEN** a post file is committed to the repository and, after the build completes, the post appears on the home "Latest Posts" list and at its permalink

#### Scenario: Missing required field
- **WHEN** the owner tries to save a post without a title or date
- **THEN** the CMS blocks the save and indicates the missing field

### Requirement: Editable profile
The owner SHALL be able to edit their display name, short bio, avatar image, and a list of social links (label, URL, icon) through the CMS, and every page that shows profile information SHALL use these values.

#### Scenario: Replace avatar
- **WHEN** the owner uploads a new avatar image and saves the profile
- **THEN** after the build the new avatar is shown wherever the avatar appears on the site

#### Scenario: Add a social link
- **WHEN** the owner adds a social link with label "LinkedIn", a URL and an icon, then saves
- **THEN** the link with its icon appears in the site's social links after the build

### Requirement: Editable home page
The owner SHALL be able to edit the home page intro text, a short work experience paragraph whose company mentions render with the company logo and link, plus a link to the full history (e.g. LinkedIn), and the News and Slides lists (title, subtitle/event, URL, icon, thumbnail), including adding, removing and reordering entries.

#### Scenario: Reorder slides
- **WHEN** the owner moves a Slides entry to the top of the list and saves
- **THEN** that entry is shown first in the Slides section after the build

#### Scenario: Add work experience
- **WHEN** the owner adds a company with a logo and mentions it in the experience paragraph, then saves
- **THEN** after the build the paragraph shows that company name with its logo, linking to its URL

### Requirement: Resilient slide thumbnails
Slide thumbnails SHALL be lazy-loaded, remote thumbnails SHALL be fetched at build time and served from the site itself, and a styled placeholder SHALL be shown when an entry has no thumbnail or its image fails to load.

#### Scenario: Remote thumbnail unavailable
- **WHEN** a slide's thumbnail URL cannot be downloaded during the build and also fails in the browser
- **THEN** the slide card shows a placeholder instead of a broken image, and the build still succeeds

#### Scenario: Repeat visit
- **WHEN** a visitor loads the home page
- **THEN** cached thumbnails are requested from the site's own domain, not from the third-party host

### Requirement: Editable projects page
The site SHALL provide a Projects page linked from the main navigation that lists the owner's personal projects as thumbnail cards (thumbnail, title, and target platforms as the subtitle, e.g. "Android / iOS / Web"), and the owner SHALL be able to add, remove, reorder and edit projects through the CMS.

#### Scenario: Add a project
- **WHEN** the owner adds a project with a title, platforms Android and iOS, a URL and a thumbnail, then saves
- **THEN** after the build the Projects page shows a card with that thumbnail, title and "Android / iOS" subtitle linking to the URL

#### Scenario: Project without thumbnail
- **WHEN** a project has no thumbnail
- **THEN** its card shows the placeholder with the project icon, if any

### Requirement: Editable About page
The owner SHALL be able to edit the About page title, excerpt and rich-text body through the CMS.

#### Scenario: Update About text
- **WHEN** the owner changes a paragraph on the About page and saves
- **THEN** the updated text is shown at `/about/` after the build

### Requirement: Editable navigation
The owner SHALL be able to add, remove, rename and reorder navigation menu items and mark items as external links.

#### Scenario: Add external menu item
- **WHEN** the owner adds a menu item "talks" pointing to an external URL marked external, then saves
- **THEN** the item appears in the navigation and opens in a new tab

### Requirement: Media uploads
The CMS SHALL let the owner upload and choose images (avatar, icons, thumbnails, post images) and SHALL store uploads inside the repository so they are served by the site.

#### Scenario: Pick an uploaded icon
- **WHEN** the owner uploads an SVG/PNG icon and selects it for a Slides entry
- **THEN** the file is stored under the site's uploads folder and the entry renders with that icon

### Requirement: Content changes publish through the build
Content saved in the CMS SHALL be committed to the repository's main branch and published by the existing automated build, and a failing build SHALL leave the previously published site intact.

#### Scenario: Build failure
- **WHEN** a CMS save produces content that makes the build fail
- **THEN** the live site continues serving the last successful version
