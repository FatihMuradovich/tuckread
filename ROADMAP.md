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

## Phase 1: Reading experience (~1 week)

The reading view is where people spend their time, so it comes first.

- [ ] Highlights and notes: select text to highlight, add a note, see all highlights on one page (`highlights` table exists)
- [ ] Reader settings: font size, line width, light / dark / sepia theme
- [ ] Reading progress: remember where you stopped, progress bar, mark as read automatically
- [ ] Tags and search: tag articles, full-text search across the library (`tags` and `article_tags` tables exist)

## Phase 2: Launch (~3–4 days)

- [ ] Deploy to Vercel with a real address
- [ ] Import from Pocket and Instapaper export files
- [ ] Export the whole library as Markdown or JSON
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
- [ ] Custom domain (tuckread.app / tuckread.com were free on 2026-11-11)
- [ ] Custom SMTP for auth emails (Supabase's built-in sender has a low hourly limit)
- [ ] Wikipedia infobox cleanup in the reading view
