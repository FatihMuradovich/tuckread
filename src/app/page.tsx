import Link from "next/link";
import { Logo, Wordmark } from "@/components/Logo";

const savedItems = [
  { title: "The quiet case for reading slowly", source: "essays.example", minutes: 9, tag: "focus", unread: true },
  { title: "What an old library card catalog teaches us about search", source: "design.example", minutes: 14, tag: "design", unread: true },
  { title: "How sourdough starters stay alive for decades", source: "food.example", minutes: 6, tag: "cooking", unread: false },
];

const features = [
  {
    title: "Save in one click",
    body: "Press the browser button or paste a link. The article waits in your library until you have time for it.",
    icon: (
      <path d="M6 4h12v16l-6-4.5L6 20z" strokeLinejoin="round" />
    ),
  },
  {
    title: "Read without the noise",
    body: "No ads, pop-ups or sidebars. Just the text in a typeface made for long reading, in light or dark.",
    icon: (
      <>
        <path d="M4 6h16M4 11h16M4 16h10" strokeLinecap="round" />
      </>
    ),
  },
  {
    title: "Summaries when time is short",
    body: "Get a three-sentence summary before you commit to a long read. Highlight the lines worth keeping.",
    icon: (
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" strokeLinejoin="round" />
    ),
  },
  {
    title: "Your library stays yours",
    body: "Export everything as Markdown or JSON whenever you like. No lock-in, no surprises.",
    icon: (
      <path d="M12 4v11m0 0l-4-4m4 4l4-4M5 20h14" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
];

function AppPreview() {
  return (
    <div
      className="w-full overflow-hidden rounded-3xl border border-line bg-surface shadow-[0_40px_80px_-40px_rgba(24,34,28,0.45)]"
      aria-label="Preview of the Tuckread library"
      role="img"
    >
      <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-3">
        <Wordmark className="text-xl" />
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-bold text-on-primary">
          <span className="size-2 bg-accent [clip-path:polygon(0_0,100%_0,100%_100%)]" />
          Tuck it
        </span>
      </div>
      <div className="flex flex-wrap gap-2 px-5 pb-4 text-xs">
        <span className="rounded-full bg-ink px-3 py-1 text-bg">Unread · 6</span>
        <span className="rounded-full border border-line px-3 py-1 text-muted">Favorites</span>
        <span className="rounded-full border border-line px-3 py-1 text-muted">Archive</span>
      </div>
      <ul>
        {savedItems.map((item, i) => (
          <li key={item.title} className="grid gap-1.5 border-t border-line px-5 py-4">
            <p className="font-read text-[1.02rem] leading-snug font-semibold">{item.title}</p>
            <p className="flex flex-wrap items-center gap-2 text-xs text-muted">
              {item.unread && <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />}
              <span>{item.source}</span>
              <span>{item.minutes} min</span>
              <span className="rounded-md bg-primary/12 px-1.5 py-px font-semibold text-primary">{item.tag}</span>
            </p>
            {i === 0 && (
              <div className="mt-2 grid gap-1 rounded-xl bg-bg px-3.5 py-3 text-sm">
                <span className="text-[0.68rem] font-bold tracking-[0.08em] text-primary uppercase">Summary</span>
                <p className="font-read leading-relaxed">
                  Skimming feels efficient but leaves little behind.{" "}
                  <mark className="rounded-sm bg-highlight px-0.5 text-ink">
                    Slower reading builds memory and understanding.
                  </mark>{" "}
                  One calm block a day is enough to start.
                </p>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-6">
        <Logo />
        <Link
          href="/login"
          className="rounded-full border border-line bg-surface px-4 py-1.5 text-sm font-semibold transition hover:border-primary"
        >
          Sign in
        </Link>
      </header>

      <main className="flex-1">
        <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 pt-10 pb-20 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pt-16">
          <div className="grid gap-6">
            <p className="text-sm font-semibold tracking-[0.08em] text-primary uppercase">
              Read-it-later, without the noise
            </p>
            <h1 className="font-display text-5xl leading-[1.02] font-bold tracking-[-0.03em] sm:text-6xl lg:text-7xl">
              Tuck it away.
              <br />
              <span className="text-primary">Read it later.</span>
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-muted">
              A calm, free home for the articles you want to read. Save them in one click, read them
              without ads or clutter, and take your library with you whenever you like.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/login"
                className="rounded-full bg-primary px-6 py-3 font-semibold text-on-primary transition hover:opacity-90"
              >
                Start reading, it&apos;s free
              </Link>
              <a
                href="#pocket"
                className="rounded-full border border-line bg-surface px-6 py-3 font-semibold transition hover:border-primary"
              >
                Coming from Pocket?
              </a>
            </div>
            <p className="text-sm text-muted">Free · No ads · Export anytime</p>
          </div>
          <AppPreview />
        </section>

        <section id="how" className="border-t border-line bg-surface">
          <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-20 sm:px-6">
            <h2 className="max-w-2xl font-display text-3xl font-bold tracking-[-0.02em] sm:text-4xl">
              Everything a reading list needs. Nothing it doesn&apos;t.
            </h2>
            <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((f) => (
                <div key={f.title} className="grid content-start gap-3">
                  <span className="grid size-11 place-items-center rounded-xl bg-primary/12 text-primary">
                    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      {f.icon}
                    </svg>
                  </span>
                  <h3 className="font-display text-lg font-bold">{f.title}</h3>
                  <p className="leading-relaxed text-muted">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="pocket" className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
          <div className="grid gap-6 rounded-3xl bg-moss px-6 py-10 text-paper sm:px-10 lg:grid-cols-[1.4fr_1fr] lg:items-center">
            <div className="grid gap-3">
              <h2 className="font-display text-3xl font-bold tracking-[-0.02em]">
                Pocket closed in July 2025. Your reading list deserves a new home.
              </h2>
              <p className="max-w-xl leading-relaxed text-paper/80">
                Bring the export file from Pocket or Instapaper and pick up where you left off, with your
                tags and saved dates in place.
              </p>
              <Link
                href="/settings#import"
                className="mt-2 justify-self-start rounded-full bg-accent px-5 py-2.5 font-semibold text-moss hover:opacity-90"
              >
                Import your Pocket file
              </Link>
            </div>
            <ol className="grid gap-3 text-paper/90">
              {["Upload your export file", "We bring in your articles and tags", "Keep reading"].map((step, i) => (
                <li key={step} className="flex items-center gap-3">
                  <span className="grid size-7 flex-none place-items-center rounded-full bg-accent text-sm font-bold text-moss">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-muted sm:px-6">
          <Logo className="scale-90 origin-left" />
          <span className="flex flex-wrap gap-x-4 gap-y-1">
            <span>Built in the open as a portfolio project.</span>
            <Link href="/privacy" className="underline underline-offset-2 hover:text-ink">
              Privacy
            </Link>
          </span>
        </div>
      </footer>
    </div>
  );
}
