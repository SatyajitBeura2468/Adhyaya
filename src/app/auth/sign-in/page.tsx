"use client";

import { createAuthClient } from "@neondatabase/auth/next";
import { BookOpen, LogIn } from "lucide-react";
import { useState } from "react";

const authClient = createAuthClient();

export default function SignInPage() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const continueWithGoogle = async () => {
    setPending(true); setError(null);
    const result = await authClient.signIn.social({ provider: "google", callbackURL: "/" });
    if (result?.error) { setError(result.error.message ?? "Google sign-in could not start."); setPending(false); }
  };
  return <main className="paper grid min-h-screen place-items-center px-5"><section className="w-full max-w-md border-y border-[var(--line)] py-10"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-full border border-[var(--green)] text-[var(--green)]"><BookOpen /></span><span className="serif text-4xl font-bold">Adhyaya</span></div><p className="mt-10 text-sm font-semibold tracking-[.14em] text-[var(--clay)]">YOUR TEACHING WORKSPACE</p><h1 className="serif mt-3 text-5xl font-bold">Plan with a clear desk.</h1><p className="mt-5 leading-7 text-[var(--muted)]">Sign in with your Google account. Your workspace, timetable, and plans stay private to you and your school team.</p><button onClick={continueWithGoogle} disabled={pending} className="focus-ring mt-9 flex min-h-14 w-full items-center justify-center gap-3 rounded-md bg-[var(--green)] px-5 font-semibold text-white enabled:hover:bg-[#0e3726] disabled:opacity-60"><LogIn className="size-5" />{pending ? "Taking you to Google…" : "Continue with Google"}</button>{error && <p role="alert" className="mt-4 text-sm text-[var(--clay)]">{error}</p>}</section></main>;
}
