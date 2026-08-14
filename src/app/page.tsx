import { redirect } from "next/navigation";

import { AdhyayaApp } from "@/components/adhyaya-app";
import { auth, authConfigured } from "@/lib/auth";
import { getWorkspaceBootstrap, requireViewer } from "@/lib/dal";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  if (!authConfigured) return <ConfigurationNotice />;
  const { data } = await auth.getSession();
  if (!data?.user) redirect("/auth/sign-in");
  const context = await requireViewer();
  if (!context.onboardingComplete) redirect("/onboarding");
  return <AdhyayaApp initialData={await getWorkspaceBootstrap(context)} />;
}

function ConfigurationNotice() {
  return <main className="paper grid min-h-screen place-items-center px-5"><section className="max-w-xl border-y border-[var(--line)] py-10"><p className="text-sm font-semibold tracking-[.14em] text-[var(--clay)]">ADHYAYA ADMIN SETUP</p><h1 className="serif mt-3 text-5xl font-bold">Identity needs its production configuration.</h1><p className="mt-5 text-lg leading-8 text-[var(--muted)]">Set <code>DATABASE_URL</code>, <code>NEON_AUTH_BASE_URL</code>, and <code>NEON_AUTH_COOKIE_SECRET</code> in the deployment environment, then return here to sign in securely.</p></section></main>;
}
