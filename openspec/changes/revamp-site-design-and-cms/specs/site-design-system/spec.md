## Purpose

Defines the visual identity of isfa.dev — color palette, typography, spacing and theming — so every public page looks consistent and remains readable and accessible in both light and dark modes.

## ADDED Requirements

### Requirement: Centralized design tokens
The site SHALL define its colors, font families, type scale, spacing and corner radii as named design tokens in one place, and page styles SHALL reference tokens rather than literal values.

#### Scenario: Changing an accent color
- **WHEN** the accent color token value is changed and the site is rebuilt
- **THEN** links, buttons, active menu items and other accent-colored elements on every page reflect the new color without further edits

### Requirement: Light and dark color schemes
The site SHALL provide a light and a dark color scheme, default to the scheme configured for the site (dark), let the visitor toggle between them, and remember the visitor's choice across page loads.

#### Scenario: Visitor toggles theme
- **WHEN** a visitor on dark mode activates the theme toggle and then navigates to another page
- **THEN** the new page renders in light mode without a flash of the dark scheme

#### Scenario: First visit
- **WHEN** a visitor with no saved preference opens any page
- **THEN** the page renders in the site's default scheme

### Requirement: Accessible contrast
Body text, headings, links and UI controls SHALL meet WCAG 2.1 AA contrast (4.5:1 for normal text, 3:1 for large text and UI components) in both color schemes.

#### Scenario: Contrast audit
- **WHEN** the home, post and about pages are audited in light and dark mode
- **THEN** no text or control falls below the AA contrast thresholds

### Requirement: Typography system
The site SHALL use a defined font pairing for body and headings, a monospace font for code, and a single consistent type scale in which elements of the same role (page titles, item titles, labels, body) share the same size on every page; fonts SHALL load without blocking text rendering.

#### Scenario: Slow font load
- **WHEN** a page loads on a slow connection before web fonts arrive
- **THEN** text is visible immediately in a fallback font and swaps to the web font once loaded

#### Scenario: Code block
- **WHEN** a post contains a fenced code block
- **THEN** it renders in the monospace font with syntax highlighting colors that are legible in both schemes

### Requirement: Consistent restyled pages
The home, blog list, post, tags, about and 404 pages SHALL all use the new design system, and the layout SHALL work from 320px wide phones to desktop without horizontal scrolling.

#### Scenario: Mobile view
- **WHEN** any public page is viewed at 375px width
- **THEN** content fits the viewport with no horizontal scroll and navigation is reachable via the mobile menu

### Requirement: Post table of contents
On wide screens, a post with two or more section headings SHALL show a clickable table of contents in the right margin that stays visible while scrolling and marks the section currently being read in bold; it SHALL be hidden on narrower screens without causing horizontal scrolling, and a post MAY opt out.

#### Scenario: Reading a long post
- **WHEN** a reader on a 1440px-wide screen scrolls past the second section heading
- **THEN** that section's entry in the table of contents is bold and the others are not

#### Scenario: Jumping to a section
- **WHEN** the reader clicks a table of contents entry
- **THEN** the page scrolls so the heading sits below the sticky navbar and the clicked entry is highlighted

#### Scenario: Narrow screen
- **WHEN** the post is viewed below 1260px wide
- **THEN** no table of contents is shown and the page has no horizontal scroll

### Requirement: English site copy
All interface text authored by the site (bio, 404 page, buttons, labels) SHALL be in English; externally sourced titles such as News headlines MAY keep their original language.

#### Scenario: 404 page
- **WHEN** a visitor opens a missing URL
- **THEN** the 404 message and its link are in English

### Requirement: Existing URLs preserved
The redesign SHALL NOT change public URLs of posts, pages, tags or the RSS feed.

#### Scenario: Old post link
- **WHEN** a visitor opens a post URL that worked before the redesign
- **THEN** the same post renders with the new styling
