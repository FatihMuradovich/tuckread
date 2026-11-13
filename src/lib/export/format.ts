/** Turns a user's library into downloadable files. Pure functions, so they can be tested. */

export type ExportArticle = {
  url: string;
  title: string;
  site_name: string | null;
  byline: string | null;
  excerpt: string | null;
  status: "unread" | "archived";
  is_favorite: boolean;
  progress: number;
  saved_at: string;
  read_at: string | null;
  word_count: number;
  tags: string[];
  highlights: { quote: string; note: string | null; created_at: string }[];
};

export const EXPORT_FORMATS = {
  json: { ext: "json", type: "application/json" },
  markdown: { ext: "md", type: "text/markdown; charset=utf-8" },
  csv: { ext: "csv", type: "text/csv; charset=utf-8" },
} as const;
export type ExportFormat = keyof typeof EXPORT_FORMATS;

export function toJson(articles: ExportArticle[], exportedAt = new Date()): string {
  return JSON.stringify({ app: "Tuckread", version: 1, exported_at: exportedAt.toISOString(), articles }, null, 2);
}

/** Readable Markdown: one section per article, highlights as quotes. Works in Obsidian, Notion, any editor. */
export function toMarkdown(articles: ExportArticle[], exportedAt = new Date()): string {
  const lines = [
    "# Tuckread library",
    "",
    `Exported ${exportedAt.toISOString().slice(0, 10)} · ${articles.length} article${articles.length === 1 ? "" : "s"}`,
    "",
  ];
  for (const a of articles) {
    lines.push(`## [${escapeMd(a.title)}](${a.url})`, "");
    const meta = [
      a.site_name,
      a.byline,
      `saved ${a.saved_at.slice(0, 10)}`,
      a.read_at ? "read" : a.status === "archived" ? "archived" : a.progress >= 0.03 ? `${Math.round(a.progress * 100)}% read` : "unread",
      a.is_favorite ? "★ favorite" : null,
    ].filter(Boolean);
    lines.push(`*${meta.map((m) => escapeMd(String(m))).join(" · ")}*`);
    if (a.tags.length) lines.push("", a.tags.map((t) => `#${t.replace(/\s+/g, "-")}`).join(" "));
    if (a.excerpt) lines.push("", escapeMd(a.excerpt));
    for (const h of a.highlights) {
      lines.push("", ...h.quote.split(/\r?\n/).map((l) => `> ${l}`));
      if (h.note) lines.push("", `**Note:** ${escapeMd(h.note)}`);
    }
    lines.push("", "---", "");
  }
  return lines.join("\n");
}

/** Same columns as Pocket's export, so the file can be imported into Tuckread or other read-later apps. */
export function toPocketCsv(articles: ExportArticle[]): string {
  const rows = [["title", "url", "time_added", "tags", "status"]];
  for (const a of articles) {
    rows.push([
      a.title,
      a.url,
      String(Math.floor(new Date(a.saved_at).getTime() / 1000)),
      a.tags.join("|"),
      a.status === "archived" ? "archive" : "unread",
    ]);
  }
  return rows.map((r) => r.map(csvField).join(",")).join("\n") + "\n";
}

function csvField(value: string) {
  // Quote when needed; prefix formula-like values so spreadsheets don't execute them (CSV injection).
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

function escapeMd(s: string) {
  return s.replace(/([\\`*_[\]<>])/g, "\\$1");
}
