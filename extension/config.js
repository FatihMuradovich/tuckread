// Where the Tuckread web app runs. When you deploy, change this AND "host_permissions" in manifest.json.
export const TUCKREAD_URL = "http://localhost:3000";

// Pages larger than this are saved by link and fetched by the server instead (matches the server limit).
export const MAX_HTML_LENGTH = 5 * 1024 * 1024;
