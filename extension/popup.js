import { MAX_HTML_LENGTH, SERVERS } from "./config.js";

const el = (id) => document.getElementById(id);

/** The Tuckread address chosen in the "Saving to" menu, remembered between clicks. */
async function loadServer() {
  let saved;
  try {
    ({ server: saved } = await chrome.storage.local.get("server"));
  } catch {
    // storage unavailable: use the default
  }
  return SERVERS.some((s) => s.url === saved) ? saved : SERVERS[0].url;
}

function setUpServerMenu(current) {
  const select = el("server");
  for (const s of SERVERS) select.add(new Option(s.label, s.url, false, s.url === current));
  select.addEventListener("change", async () => {
    await chrome.storage.local.set({ server: select.value });
    location.reload(); // save again, this time to the newly chosen address
  });
}

const TUCKREAD_URL = await loadServer();
setUpServerMenu(TUCKREAD_URL);
el("library-link").href = `${TUCKREAD_URL}/library`;

/** Updates the popup. All text goes through textContent, never innerHTML. */
function show(state, statusText, detail = "", button = null) {
  el("card").dataset.state = state;
  el("status-text").textContent = statusText;
  el("detail").textContent = detail;
  el("detail").hidden = !detail;
  const primary = el("primary");
  primary.hidden = !button;
  if (button) {
    primary.textContent = button.label;
    primary.href = button.href;
  }
}

/** Runs inside the page: returns the page as the reader currently sees it (after scripts have run). */
function capturePage() {
  return {
    url: location.href,
    title: document.title,
    html: document.documentElement.outerHTML,
  };
}

async function save() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab?.id || !/^https?:\/\//.test(tab.url ?? "")) {
    el("page-title").textContent = tab?.title || "This page";
    show("error", "This page can't be saved", "Tuckread saves regular web pages (http or https), not browser or extension pages.");
    return;
  }

  el("page-title").textContent = tab.title || tab.url;

  // Capture the page from the reader's own tab. Some pages (e.g. the Chrome Web Store) don't allow this;
  // then we send just the link and the server fetches it.
  let page = { url: tab.url, title: tab.title, html: null };
  try {
    const [injection] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: capturePage });
    if (injection?.result) page = injection.result;
  } catch {
    // Keep the link-only payload.
  }
  if (page.html && page.html.length > MAX_HTML_LENGTH) page.html = null;

  let response;
  try {
    response = await fetch(`${TUCKREAD_URL}/api/save`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(page),
    });
  } catch {
    show("error", "Couldn't reach Tuckread", `Make sure Tuckread is running at ${TUCKREAD_URL}, then try again.`);
    return;
  }

  const data = await response.json().catch(() => ({}));

  if (response.status === 401) {
    show("signin", "Sign in to save pages", "Sign in to Tuckread in this browser, then click the button again.", {
      label: "Sign in to Tuckread",
      href: `${TUCKREAD_URL}/login`,
    });
    return;
  }

  if (!response.ok) {
    show("error", "Couldn't save this page", data.message || "Something went wrong. Try again in a moment.");
    return;
  }

  if (data.title) el("page-title").textContent = data.title;
  const read = { label: data.linkOnly ? "Open in library" : "Read it now", href: data.readUrl };

  if (data.status === "exists") {
    show("saved", "Already in your library", "", read);
  } else if (data.status === "updated") {
    show("saved", "Tucked away", "We added the full text to the link you saved earlier.", read);
  } else {
    show(
      "saved",
      "Tucked away",
      data.linkOnly ? "We couldn't pull a clean reading view, so we saved the link." : "",
      read,
    );
  }
}

save();
