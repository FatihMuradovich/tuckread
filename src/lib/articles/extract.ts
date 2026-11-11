import { lookup } from "node:dns/promises";
import net from "node:net";
import { Readability } from "@mozilla/readability";
import { JSDOM, VirtualConsole } from "jsdom";
import { sanitizeArticleHtml } from "./sanitize";

/**
 * An error whose message is safe and useful to show to the reader.
 * `linkOnly` means the page exists but we can't read its text (blocked, paywalled, a PDF...),
 * so the link can still be saved without a reading view.
 */
export class SaveError extends Error {
  constructor(message: string, readonly linkOnly = false) {
    super(message);
  }
}

/** Builds a readable title from a URL slug, e.g. ".../the-quiet-case-for-reading-1a2b3c4d5e6f" → "The quiet case for reading". */
export function titleFromUrl(url: URL): string {
  const segment = url.pathname.split("/").filter(Boolean).pop() ?? "";
  let words = segment;
  try {
    words = decodeURIComponent(segment);
  } catch {}
  words = words
    .replace(/\.(html?|php|aspx?)$/i, "")
    .replace(/-[0-9a-f]{8,16}$/i, "") // Medium-style id suffix
    .replace(/[-_+]+/g, " ")
    .trim();
  const host = url.hostname.replace(/^www\./, "");
  if (!words) return host;
  return (words.charAt(0).toUpperCase() + words.slice(1)).slice(0, 300);
}

export type ExtractedArticle = {
  title: string;
  siteName: string | null;
  byline: string | null;
  excerpt: string | null;
  contentHtml: string | null;
  wordCount: number;
  readingMinutes: number;
};

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_REDIRECTS = 5;
const TIMEOUT_MS = 10_000;
const WORDS_PER_MINUTE = 230;

/** Turns what the user typed into a URL, adding https:// when it is missing. */
export function parseUserUrl(raw: string): URL {
  const text = raw.trim();
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? text : `https://${text}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw new SaveError("That doesn't look like a link. Check it and try again.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new SaveError("Only http and https links can be saved.");
  }
  if (!url.hostname.includes(".") && !net.isIP(url.hostname)) {
    throw new SaveError("That doesn't look like a link. Check it and try again.");
  }
  url.hash = "";
  // Drop campaign tracking so the same article isn't saved twice under different links.
  for (const key of [...url.searchParams.keys()]) {
    if (/^(utm_|fbclid$|gclid$|mc_cid$|mc_eid$)/i.test(key)) url.searchParams.delete(key);
  }
  return url;
}

/** Fetches a page from our server and extracts the article. */
export async function extractArticle(url: URL): Promise<ExtractedArticle> {
  const { html, finalUrl } = await fetchHtml(url);
  return parseArticleHtml(html, finalUrl);
}

/** Extracts the article from HTML we already have, e.g. a page captured by the browser extension. */
export function parseArticleHtml(html: string, pageUrl: URL): ExtractedArticle {
  const finalUrl = pageUrl;
  const virtualConsole = new VirtualConsole(); // swallow CSS and script noise from the page
  const dom = new JSDOM(html, { url: finalUrl.toString(), virtualConsole });
  const doc = dom.window.document;

  const meta = (selector: string) => doc.querySelector<HTMLMetaElement>(selector)?.content?.trim() || null;
  const fallbackTitle = meta('meta[property="og:title"]') || doc.title?.trim() || finalUrl.hostname;
  const siteName = meta('meta[property="og:site_name"]') || finalUrl.hostname.replace(/^www\./, "");

  const parsed = new Readability(doc).parse();
  dom.window.close();

  const text = parsed?.textContent ?? "";
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  return {
    title: (parsed?.title?.trim() || fallbackTitle).slice(0, 300),
    siteName: meta('meta[property="og:site_name"]') || parsed?.siteName?.trim() || siteName,
    byline: parsed?.byline?.trim() || null,
    excerpt: parsed?.excerpt?.trim()?.slice(0, 500) || meta('meta[name="description"]'),
    contentHtml: parsed?.content ? sanitizeArticleHtml(parsed.content) : null,
    wordCount,
    readingMinutes: Math.max(1, Math.round(wordCount / WORDS_PER_MINUTE)),
  };
}

/** Fetches a page, following redirects by hand so every hop is checked against private addresses. */
async function fetchHtml(start: URL): Promise<{ html: string; finalUrl: URL }> {
  let current = start;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublicHost(current);

    let res: Response;
    try {
      res = await fetch(current, {
        redirect: "manual",
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: {
          "user-agent": "Mozilla/5.0 (compatible; TuckreadBot/0.1; +https://tuckread.app)",
          accept: "text/html,application/xhtml+xml",
        },
      });
    } catch {
      throw new SaveError("We couldn't reach that page right now.", true);
    }

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) break;
      current = new URL(location, current);
      if (current.protocol !== "http:" && current.protocol !== "https:") break;
      continue;
    }

    if (res.status === 404 || res.status === 410) {
      throw new SaveError("That page doesn't exist. Check the link for typos.");
    }
    if (res.status === 401 || res.status === 403 || res.status === 429) {
      throw new SaveError("This site blocks reading apps.", true);
    }
    if (!res.ok) throw new SaveError(`That page answered with an error (${res.status}).`, true);

    const type = res.headers.get("content-type") ?? "";
    if (!/text\/html|application\/xhtml\+xml/i.test(type)) {
      throw new SaveError("That link isn't a web page, such as a PDF or an image.", true);
    }

    return { html: await readLimited(res), finalUrl: current };
  }

  throw new SaveError("That link redirects too many times.");
}

async function readLimited(res: Response): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BYTES) {
      await reader.cancel();
      throw new SaveError("That page is too large to read here.", true);
    }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

/**
 * Blocks links that point at this server or a private network (SSRF protection).
 * DNS can still change between this check and the fetch; good enough for an MVP, revisit before scale.
 */
async function assertPublicHost(url: URL) {
  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  const blockedName =
    host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal");
  if (blockedName) throw new SaveError("That link points to a private address and can't be saved.");

  let addresses: string[];
  if (net.isIP(host)) {
    addresses = [host];
  } else {
    try {
      addresses = (await lookup(host, { all: true })).map((a) => a.address);
    } catch {
      throw new SaveError("We couldn't find that website. Check the link for typos.");
    }
  }

  if (addresses.length === 0 || addresses.some(isPrivateIp)) {
    throw new SaveError("That link points to a private address and can't be saved.");
  }
}

function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    );
  }
  const v6 = ip.toLowerCase();
  if (v6.startsWith("::ffff:")) return isPrivateIp(v6.slice(7));
  return (
    v6 === "::" ||
    v6 === "::1" ||
    v6.startsWith("fc") ||
    v6.startsWith("fd") ||
    v6.startsWith("fe8") ||
    v6.startsWith("fe9") ||
    v6.startsWith("fea") ||
    v6.startsWith("feb")
  );
}
