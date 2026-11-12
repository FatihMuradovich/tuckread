/**
 * Text anchoring for highlights.
 *
 * A highlight is stored as the quoted text plus a little context before (prefix) and after (suffix),
 * like the W3C "TextQuoteSelector". To draw it again we search the article's text for the quote and
 * pick the occurrence whose surrounding text matches best. Works with plain DOM APIs, so it runs in
 * the browser and in tests (jsdom) alike.
 */

export type TextAnchor = { quote: string; prefix: string; suffix: string };

export const CONTEXT_LENGTH = 32;

type Segment = { node: Text; start: number; end: number };

/** All text nodes under `root`, with their character offsets in the combined text. */
export function textSegments(root: Node): { text: string; segments: Segment[] } {
  const doc = root.ownerDocument ?? (root as Document);
  const walker = doc.createTreeWalker(root, 4 /* NodeFilter.SHOW_TEXT */);
  const segments: Segment[] = [];
  let text = "";
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const node = n as Text;
    segments.push({ node, start: text.length, end: text.length + node.data.length });
    text += node.data;
  }
  return { text, segments };
}

/** Converts a DOM Range inside `root` into character offsets of root's text, or null if it's outside. */
export function rangeToOffsets(root: Node, range: Range): { start: number; end: number } | null {
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) return null;
  const { segments } = textSegments(root);

  const offsetOf = (container: Node, offset: number, atEnd: boolean): number | null => {
    if (container.nodeType === 3) {
      const seg = segments.find((s) => s.node === container);
      return seg ? seg.start + offset : null;
    }
    // Element boundary: find the first text node at or after the boundary point.
    const child = container.childNodes[offset];
    for (const seg of segments) {
      if (child ? child.contains(seg.node) || isAfter(seg.node, child) : isAfter(seg.node, container)) {
        return seg.start;
      }
    }
    return atEnd ? (segments.at(-1)?.end ?? 0) : null;
  };

  const start = offsetOf(range.startContainer, range.startOffset, false);
  const end = offsetOf(range.endContainer, range.endOffset, true);
  if (start == null || end == null || end <= start) return null;
  return { start, end };
}

function isAfter(node: Node, ref: Node): boolean {
  return Boolean(ref.compareDocumentPosition(node) & 4 /* DOCUMENT_POSITION_FOLLOWING */) && !ref.contains(node);
}

/** Builds the anchor (quote + context) for the text between two offsets. */
export function anchorFromOffsets(text: string, start: number, end: number): TextAnchor {
  return {
    quote: text.slice(start, end),
    prefix: text.slice(Math.max(0, start - CONTEXT_LENGTH), start),
    suffix: text.slice(end, end + CONTEXT_LENGTH),
  };
}

/** Finds where an anchor sits in `text`. Prefers the occurrence with the best-matching context. */
export function locateAnchor(text: string, anchor: TextAnchor): { start: number; end: number } | null {
  const { quote } = anchor;
  if (!quote) return null;

  let best: { start: number; score: number } | null = null;
  for (let i = text.indexOf(quote); i !== -1; i = text.indexOf(quote, i + 1)) {
    const score =
      commonSuffixLength(text.slice(Math.max(0, i - anchor.prefix.length), i), anchor.prefix) +
      commonPrefixLength(text.slice(i + quote.length, i + quote.length + anchor.suffix.length), anchor.suffix);
    if (!best || score > best.score) best = { start: i, score };
    if (score === anchor.prefix.length + anchor.suffix.length) break; // perfect match
  }
  return best ? { start: best.start, end: best.start + quote.length } : null;
}

function commonPrefixLength(a: string, b: string) {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
}

function commonSuffixLength(a: string, b: string) {
  let i = 0;
  while (i < a.length && i < b.length && a[a.length - 1 - i] === b[b.length - 1 - i]) i++;
  return i;
}

/**
 * Wraps the text between two offsets in elements made by `make()`. A highlight can span several
 * paragraphs or inline tags, so each text node in the range gets its own wrapper. Returns them all.
 */
export function wrapOffsets(root: Node, start: number, end: number, make: () => HTMLElement): HTMLElement[] {
  const { segments } = textSegments(root);
  const wrappers: HTMLElement[] = [];

  for (const seg of segments) {
    if (seg.end <= start || seg.start >= end) continue;
    let node = seg.node;
    const from = Math.max(start, seg.start) - seg.start;
    const to = Math.min(end, seg.end) - seg.start;
    if (!node.data.slice(from, to).trim()) continue; // skip whitespace between blocks

    if (to < node.data.length) node.splitText(to);
    if (from > 0) node = node.splitText(from);

    const wrapper = make();
    node.parentNode!.insertBefore(wrapper, node);
    wrapper.appendChild(node);
    wrappers.push(wrapper);
  }
  return wrappers;
}

/** Removes wrappers made by wrapOffsets, putting their text back in place. */
export function unwrap(elements: Element[]) {
  for (const el of elements) {
    const parent = el.parentNode;
    if (!parent) continue;
    while (el.firstChild) parent.insertBefore(el.firstChild, el);
    parent.removeChild(el);
    parent.normalize();
  }
}
