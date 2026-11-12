"use client";

import { useEffect, useRef, useState } from "react";
import { applyPrefs, DEFAULT_PREFS, readPrefs, type ReaderPrefs } from "@/lib/reader-prefs";

const THEMES: { value: ReaderPrefs["theme"]; label: string; swatch: string }[] = [
  { value: "auto", label: "Auto", swatch: "linear-gradient(135deg,#f1f3ee 50%,#121814 50%)" },
  { value: "light", label: "Light", swatch: "#f1f3ee" },
  { value: "sepia", label: "Sepia", swatch: "#f3ead7" },
  { value: "dark", label: "Dark", swatch: "#121814" },
];
const SIZES: { value: ReaderPrefs["size"]; label: string; px: number }[] = [
  { value: "s", label: "Small", px: 13 },
  { value: "m", label: "Medium", px: 15 },
  { value: "l", label: "Large", px: 17 },
  { value: "xl", label: "Extra large", px: 19 },
];
const WIDTHS: { value: ReaderPrefs["width"]; label: string }[] = [
  { value: "narrow", label: "Narrow" },
  { value: "regular", label: "Regular" },
  { value: "wide", label: "Wide" },
];

export function ReaderSettings() {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState<ReaderPrefs>(DEFAULT_PREFS);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !panelRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  function update(patch: Partial<ReaderPrefs>) {
    // Build on the latest settings, so quick successive clicks don't undo each other.
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      applyPrefs(next); // idempotent, safe if React calls this twice in development
      return next;
    });
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => {
          // localStorage only exists in the browser, so read saved settings when the panel opens.
          if (!open) setPrefs(readPrefs());
          setOpen(!open);
        }}
        aria-expanded={open}
        aria-label="Reading settings"
        className="flex items-center gap-1 rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-semibold hover:border-primary"
      >
        <span className="font-read text-xs">A</span>
        <span className="font-read text-base leading-none">A</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Reading settings"
          className="absolute right-0 z-30 mt-2 grid w-72 gap-4 rounded-2xl border border-line bg-surface p-4 shadow-xl"
        >
          <Group label="Theme">
            {THEMES.map((t) => (
              <Option key={t.value} active={prefs.theme === t.value} onClick={() => update({ theme: t.value })}>
                <span className="size-4 rounded-full border border-line" style={{ background: t.swatch }} aria-hidden="true" />
                {t.label}
              </Option>
            ))}
          </Group>
          <Group label="Text size">
            {SIZES.map((s) => (
              <Option key={s.value} active={prefs.size === s.value} onClick={() => update({ size: s.value })} label={s.label}>
                <span className="font-read" style={{ fontSize: s.px }}>Aa</span>
              </Option>
            ))}
          </Group>
          <Group label="Line width">
            {WIDTHS.map((w) => (
              <Option key={w.value} active={prefs.width === w.value} onClick={() => update({ width: w.value })}>
                {w.label}
              </Option>
            ))}
          </Group>
        </div>
      )}
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-2 text-xs font-semibold tracking-[0.08em] text-muted uppercase">{label}</legend>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </fieldset>
  );
}

function Option({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm ${
        active ? "border-primary bg-primary/12 font-semibold text-primary" : "border-line hover:border-primary"
      }`}
    >
      {children}
    </button>
  );
}
