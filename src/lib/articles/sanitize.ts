import sanitizeHtml from "sanitize-html";

/** Keeps only the tags a reader needs; strips scripts, styles, iframes, forms and event handlers. */
export function sanitizeArticleHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      "p", "br", "hr", "h2", "h3", "h4", "h5", "h6", "blockquote", "pre", "code",
      "em", "strong", "i", "b", "u", "s", "sub", "sup", "mark", "small", "abbr",
      "ul", "ol", "li", "dl", "dt", "dd", "a", "img", "figure", "figcaption",
      "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption",
    ],
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
      img: ["src", "alt", "title", "width", "height", "loading", "referrerpolicy"],
      abbr: ["title"],
      th: ["colspan", "rowspan"],
      td: ["colspan", "rowspan"],
    },
    allowedSchemes: ["http", "https"],
    allowedSchemesByTag: { img: ["https"] },
    transformTags: {
      h1: "h2",
      a: (tagName, attribs) => ({
        tagName,
        attribs: { ...attribs, target: "_blank", rel: "noopener noreferrer nofollow" },
      }),
      img: (tagName, attribs) => ({
        tagName,
        attribs: { ...attribs, loading: "lazy", referrerpolicy: "no-referrer" },
      }),
    },
  });
}
