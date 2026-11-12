// Where the extension can save to. The first one is the default.
// Every URL here must also be listed in "host_permissions" in manifest.json.
export const SERVERS = [
  { label: "tuckread.vercel.app", url: "https://tuckread.vercel.app" },
  { label: "localhost:3000 (dev)", url: "http://localhost:3000" },
];

// Pages larger than this are saved by link and fetched by the server instead (matches the server limit).
export const MAX_HTML_LENGTH = 5 * 1024 * 1024;
