/**
 * Parses reading-list exports from other apps into one shape. Runs in the browser (so large files never
 * have to be uploaded whole) and in tests. No DOM needed.
 *
 * Supported:
 * - Pocket CSV:        title,url,time_added,tags,status   (tags separated by "|", status unread|archive)
 * - Pocket HTML:       <h1>Unread</h1><ul><li><a href time_added tags="a,b">Title</a> ... <h1>Read Archive</h1>
 * - Instapaper CSV:    URL,Title,Selection,Folder,Timestamp   (Folder: Unread, Archive, Starred or a custom name)
 * - Browser bookmarks: Netscape bookmark HTML with ADD_DATE / TAGS attributes (Chrome, Firefox, Safari, Raindrop...)
 * - Any CSV with a "url" column (optional title / tags / status / date columns)
 */

export type ImportItem = {
  url: string;
  title: string;
  /** ISO date the article was originally saved, if known. */
  savedAt: string | null;
  status: "unread" | "archived";
  favorite: boolean;
  tags: string[];
};

export type ParseResult = { source: string; items: ImportItem[]; skipped: number };

/** Items sent to the server per request (keeps each request well under the 1 MB Server Action limit). */
export const IMPORT_BATCH_SIZE = 200;

export function parseExport(fileName: string, text: string): ParseResult {
  const trimmed = text.replace(/^﻿/, "").trim();
  if (!trimmed) return { source: "empty file", items: [], skipped: 0 };
  const looksHtml = /\.html?$/i.test(fileName) || /^</.test(trimmed) || /<a\s/i.test(trimmed.slice(0, 5000));
  const result = looksHtml ? parseHtml(trimmed) : parseCsvExport(trimmed);
  // One entry per URL: keep the first occurrence.
  const seen = new Set<string>();
  const items = result.items.filter((i) => (seen.has(i.url) ? false : (seen.add(i.url), true)));
  return { ...result, items, skipped: result.skipped + (result.items.length - items.length) };
}

// ---------------- HTML (Pocket / browser bookmarks) ----------------

function parseHtml(html: string): ParseResult {
  const isPocket = /time_added=/i.test(html);
  const items: ImportItem[] = [];
  let skipped = 0;

  // Section headings change the status in Pocket files ("Unread", then "Read Archive").
  const token = /<h1[^>]*>([\s\S]*?)<\/h1>|<a\s([^>]*)>([\s\S]*?)<\/a>/gi;
  let status: ImportItem["status"] = "unread";
  for (let m = token.exec(html); m; m = token.exec(html)) {
    if (m[1] !== undefined) {
      status = /archive/i.test(stripTags(m[1])) ? "archived" : "unread";
      continue;
    }
    const attrs = parseAttributes(m[2]);
    const url = cleanUrl(attrs.href);
    if (!url) {
      skipped++;
      continue;
    }
    const time = attrs.time_added ?? attrs.add_date;
    const tags = splitTags(attrs.tags ?? "", /,/);
    items.push({
      url,
      title: decodeEntities(stripTags(m[3])).trim(),
      savedAt: unixToIso(time),
      status: isPocket ? status : "unread",
      favorite: false,
      tags,
    });
  }
  return { source: isPocket ? "Pocket (HTML)" : "Bookmarks (HTML)", items, skipped };
}

function parseAttributes(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /([a-zA-Z_:-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/g;
  for (let m = re.exec(raw); m; m = re.exec(raw)) {
    out[m[1].toLowerCase()] = decodeEntities(m[3] ?? m[4] ?? m[5] ?? "");
  }
  return out;
}

// ---------------- CSV (Pocket / Instapaper / generic) ----------------

function parseCsvExport(text: string): ParseResult {
  const rows = parseCsv(text);
  if (rows.length === 0) return { source: "CSV", items: [], skipped: 0 };
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const col = (...names: string[]) => header.findIndex((h) => names.includes(h));

  const iUrl = col("url", "link", "href");
  if (iUrl === -1) return { source: "unknown CSV (no url column)", items: [], skipped: rows.length - 1 };
  const iTitle = col("title", "name");
  const iTags = col("tags", "tag");
  const iStatus = col("status", "state");
  const iFolder = col("folder");
  const iTime = col("time_added", "timestamp", "created", "date", "added", "saved_at");
  const isPocket = header.includes("time_added") && header.includes("status");
  const isInstapaper = iFolder !== -1 && header.includes("selection");

  const items: ImportItem[] = [];
  let skipped = 0;
  for (const row of rows.slice(1)) {
    if (row.every((c) => !c.trim())) continue; // blank line
    const url = cleanUrl(row[iUrl]);
    if (!url) {
      skipped++;
      continue;
    }
    let status: ImportItem["status"] = "unread";
    let favorite = false;
    let tags = iTags === -1 ? [] : splitTags(row[iTags] ?? "", isPocket ? /\|/ : /[|,;]/);

    if (iFolder !== -1) {
      const folder = (row[iFolder] ?? "").trim();
      if (/^archive$/i.test(folder)) status = "archived";
      else if (/^starred$/i.test(folder)) favorite = true;
      else if (folder && !/^unread$/i.test(folder)) tags = [...tags, cleanTag(folder)].filter(Boolean);
    }
    if (iStatus !== -1 && /archiv|read$/i.test(row[iStatus] ?? "") && !/unread/i.test(row[iStatus] ?? "")) {
      status = "archived";
    }

    items.push({
      url,
      title: decodeEntities((iTitle === -1 ? "" : row[iTitle]) ?? "").trim(),
      savedAt: iTime === -1 ? null : toIso(row[iTime]),
      status,
      favorite,
      tags: [...new Set(tags)],
    });
  }
  const source = isPocket ? "Pocket (CSV)" : isInstapaper ? "Instapaper (CSV)" : "CSV";
  return { source, items, skipped };
}

/** RFC 4180 CSV: quoted fields, "" escapes, commas and newlines inside quotes. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
    } else if (c === '"' && field === "") quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

// ---------------- helpers ----------------

function cleanUrl(raw: string | undefined): string | null {
  const s = (raw ?? "").trim();
  if (!/^https?:\/\//i.test(s)) return null; // skips instapaper-private://, javascript:, place: ...
  try {
    return new URL(s).toString();
  } catch {
    return null;
  }
}

function cleanTag(t: string) {
  return t.trim().replace(/\s+/g, " ").toLowerCase().slice(0, 40);
}

function splitTags(raw: string, sep: RegExp): string[] {
  return [...new Set(raw.split(sep).map(cleanTag).filter(Boolean))].slice(0, 20);
}

function unixToIso(raw: string | undefined): string | null {
  const n = Number(raw);
  if (!raw || !Number.isFinite(n) || n <= 0) return null;
  return plausible(new Date(n > 1e12 ? n : n * 1000)); // seconds or milliseconds
}

function toIso(raw: string | undefined): string | null {
  const s = (raw ?? "").trim();
  if (!s) return null;
  if (/^\d+(\.\d+)?$/.test(s)) return unixToIso(s);
  return plausible(new Date(s));
}

/** Only keep dates between 1995 and tomorrow; anything else is probably a parsing accident. */
function plausible(d: Date): string | null {
  const t = d.getTime();
  return Number.isFinite(t) && t > Date.UTC(1995, 0, 1) && t < Date.now() + 86_400_000 ? d.toISOString() : null;
}

function stripTags(s: string) {
  return s.replace(/<[^>]*>/g, "");
}

function decodeEntities(s: string) {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}
