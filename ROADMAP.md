# Tuckread roadmap

What's built and what comes next, in order. Tick items off as they ship.

## Shipped

- [x] Brand: name, palette, logo, fonts, landing page
- [x] Email sign-up and sign-in (Supabase Auth)
- [x] Save by link with Readability extraction, SSRF guards and sanitized HTML
- [x] Link-only fallback for sites that block servers
- [x] Library (unread and archive) and reading view
- [x] Chrome extension: one-click save of the page as the reader sees it
- [x] README with screenshots and setup steps
- [x] Live on Vercel at https://tuckread.vercel.app; extension saves there by default (2026-11-12)

## Phase 1: Reading experience (~1 week)

The reading view is where people spend their time, so it comes first.

- [x] Highlights and notes: select text to highlight, add a note, see all highlights on one page
- [x] Reader settings: font size, line width, light / dark / sepia theme
- [x] Reading progress: remember where you stopped, progress bar, mark as read automatically
- [x] Tags and search: tag articles, full-text search across the library

Migration `20261112120000_reading_experience.sql` was run on production on 2026-11-12.

## Phase 2: Launch (~3–4 days)

- [x] Deploy to Vercel with a real address
- [x] Import from Pocket and Instapaper export files (and browser bookmarks); "Fetch the article text" for link-only articles
- [x] Export the whole library as Markdown, JSON or Pocket-compatible CSV
- [x] Settings page with account deletion, and a privacy policy page (needed for the Web Store)
- [ ] Publish the extension to the Chrome Web Store (needs the deployed address)

## Phase 3: Smart features (~1 week)

- [ ] AI summary: three sentences before you commit to a long read (promised on the landing page), with a daily limit to control cost
- [ ] Listen mode: read articles aloud with the browser's built-in speech engine
- [ ] Tag suggestions from AI when an article is saved

## Phase 4: Habits and mobile (~1 week)

- [ ] Installable app (PWA) with the phone's Share menu saving to Tuckread
- [ ] Offline reading
- [ ] Weekly email: "You saved 5 articles this week; here are 3 for the weekend"
- [ ] Reading stats: minutes read, streaks

## Later

- [ ] GitHub Actions: lint and build on every pull request
- [ ] Revisit pinned `jsdom` 26.1.0 and `sanitize-html` 2.17.0: newer versions pull in ES-module-only packages that crash on Vercel (`ERR_REQUIRE_ESM`). Only upgrade after testing a deploy.
- [ ] Custom domain (tuckread.app / tuckread.com were free on 2026-11-11)
- [ ] Custom SMTP for auth emails (Supabase's built-in sender has a low hourly limit)
- [ ] Wikipedia infobox cleanup in the reading view
