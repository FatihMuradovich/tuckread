"use client";

import { useActionState, useState } from "react";
import { authenticate, type AuthState } from "./actions";

export function LoginForm({ initialError }: { initialError?: string }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [state, action, pending] = useActionState<AuthState, FormData>(authenticate, {
    error: initialError,
  });

  const isSignup = mode === "signup";

  return (
    <div className="grid gap-6">
      <div className="grid grid-cols-2 rounded-full border border-line bg-bg p-1 text-sm font-semibold" role="tablist">
        {(["signin", "signup"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={`rounded-full px-4 py-2 transition ${
              mode === m ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"
            }`}
          >
            {m === "signin" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>

      <form action={action} className="grid gap-4">
        <input type="hidden" name="mode" value={mode} />
        <label className="grid gap-1.5 text-sm font-semibold" htmlFor="email">
          Email
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            defaultValue={state.email}
            key={`email-${state.email ?? ""}`}
            className="rounded-xl border border-line bg-bg px-4 py-3 text-base font-normal outline-none focus:border-primary"
          />
        </label>
        <label className="grid gap-1.5 text-sm font-semibold" htmlFor="password">
          Password
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={isSignup ? 8 : undefined}
            autoComplete={isSignup ? "new-password" : "current-password"}
            className="rounded-xl border border-line bg-bg px-4 py-3 text-base font-normal outline-none focus:border-primary"
          />
          {isSignup && <span className="text-xs font-normal text-muted">At least 8 characters.</span>}
        </label>

        {state.error && (
          <p role="alert" className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            {state.error}
          </p>
        )}
        {state.message && (
          <p role="status" className="rounded-xl bg-primary/12 px-4 py-3 text-sm text-ink">
            {state.message}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-primary px-6 py-3 font-semibold text-on-primary transition hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "One moment…" : isSignup ? "Create account" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
