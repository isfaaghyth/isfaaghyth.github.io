---
name: tech-article
description: Write a technical post for this Jekyll blog (isfa.dev) in Isfa's personal voice about a project they built or reverse engineered (why, what we found, how-to with real code, result). Use when the user asks to write, draft, or revise an article, blog post, or write-up about their own project.
---

# Tech article in the user's voice

Posts live in `_posts/` of this repo. The reader is a fellow developer who might want to repeat the project. The article is a personal story backed by real, working code from the project.

## Before writing

1. Read the project itself: READMEs, specs or plans (for example `openspec/`), and the actual source files. Every code snippet, number, file path and command must come from the repo, never be invented.
2. Run any cheap check you quote (for example a Node one-liner that prints computed values) so the numbers in the article are verified.
3. Find out from the user, or from what they already said: why they started, how long they waited or struggled, and what the app or result is called.

## Structure

Start with Jekyll front matter, then the body. Do not write an `# H1` title in the body; the layout renders `title`. Use `##` for sections and `###` inside them. Put a `***` line before the Result section.

```yaml
---
title: Building an Adzan App for the Xiaomi Watch S1 Active
emoticon: ⌚️
toc: true
date: 2026-10-14T16:46:21.952Z
categories:
  - exploration
tags:
  - reverse
---
```

File name: `_posts/YYYY-MM-DD-<slug-of-title>.md`. The title is short and plain: what was built, for what device or platform.

1. **Intro / Why** (no heading): first person, how long the user has lived with the problem, what they kept trying, what changed (often AI tools). Name the exact models or tools used and for what (e.g. "GLM 5.2 (for reverse) and Claude Opus 5.5 (for building the app)"). End the intro with the goal in their phrasing, naming the app in italics: "and to build my first app: *Adzan Reminder*."
3. **Why this app**: the personal, everyday reason (faith, habit, daily life), then why it is also a good technical test.
4. **What we discovered**: one `###` subsection per finding. Explain the wrong assumption first, then what the evidence showed. Use tables and file trees where they help.
5. **How to do it yourself**: give the tested device, firmware and versions, then numbered `###` steps with commands.
6. **Building the app, step by step**: walk through the real source files in build order (config, core logic, UI or page logic, generator, build script, install). Show real snippets from the repo, trimmed with `// ...` or `# ...` when long. Explain each snippet in one or two sentences before it.
7. **The Result**: the heading is "The Result, <App Name> <Platform> app" (e.g. "The Result, Sholat Watch app"). Then the concrete numbers, an honest "Limitations" list, and "What comes next" from the plan.
8. **What I learned** (optional, only if the user wants it): about working with AI, where it was wrong and what turned guesses into facts.

## Voice and wording

- **Never use em dashes (—) or en dashes (–).** Use commas, colons, periods or parentheses. Run `grep -nE '—|–' <file>` before finishing; it must print nothing.
- First person ("I") for the personal story, "we" for the work done with the AI.
- Plain, direct, a bit warm. Short paragraphs. No marketing hype.
- Label warnings with plain, slightly formal words: write "One Caveat:" not "One gotcha:"; write "**Warning:**" for things that can break the reader's setup.
- Describe the main part of a script plainly: "The core builder of it is three steps:" rather than metaphors like "the heart of it".
- Headings in Title Case when they name a result or a product. Use a comma, not a colon, between the heading and the product name.
- Give the app its real name and use local terms where the user does (e.g. Subuh, Dzuhur, Ashar, Maghrib, Isya, *ihtiyat*).
- Be honest about what is not done yet. Never present planned work as finished.

## Code and commands

- One shell command per ` ```bash ` block, no `$` prompt.
- Snippets are copied from the repo, with the file path given in the subsection heading or the sentence before it.
- Give a way to test logic off-device when one exists (e.g. run the math with Node).

## Images

- When the user gives an image URL, download it into `assets/images/uploads/` (where Tina CMS uploads go), look at it, and crop it to the ratio they ask for (default 3:4 portrait) so the subject stays centered. On macOS: `sips -c <height> <width> --cropOffset <top> <left> in.jpg --out out.jpg`. Check the crop by viewing it, and delete the uncropped original.
- Place the main photo of the result at the very top of the post body, right after the front matter and before the first intro paragraph, unless the user asks for another spot.
- Reference it with an absolute path: `![alt](/assets/images/uploads/<name>.jpg)`.
- Use descriptive alt text: what is shown and the key value on screen.

## Finish

- Save in `_posts/` with the file name and front matter above. If the user already edited the post, read it first and keep their changes; apply only the requested edits.
- Run the dash check.
- Tell the user in a few lines what each section covers, and anything they should check (credits for tools or models, repo links, whether paths are public).
