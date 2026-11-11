import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/Logo";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in · Tuckread" };

const ERRORS: Record<string, string> = {
  confirm: "That confirmation link didn't work. It may have expired or been opened in another browser. Sign in, or create your account again.",
};

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="grid w-full max-w-sm gap-8">
        <Link href="/" className="justify-self-center">
          <Logo />
        </Link>
        <div className="grid gap-6 rounded-3xl border border-line bg-surface p-6 sm:p-8">
          <div className="grid gap-1.5 text-center">
            <h1 className="font-display text-2xl font-bold tracking-[-0.02em]">Welcome to Tuckread</h1>
            <p className="text-sm text-muted">Your reading list, saved and waiting.</p>
          </div>
          <Suspense fallback={<LoginForm />}>
            <LoginFormWithError searchParams={searchParams} />
          </Suspense>
        </div>
      </div>
    </main>
  );
}

async function LoginFormWithError({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const { error } = await searchParams;
  const message = typeof error === "string" ? ERRORS[error] : undefined;
  return <LoginForm initialError={message} />;
}
