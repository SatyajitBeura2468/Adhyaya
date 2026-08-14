import { auth } from "@/lib/auth";

// Next.js 16 calls this file `proxy.ts`. Neon Auth uses it to keep the
// server-side session cache in sync with the browser cookie on protected pages.
export default auth.middleware({
  loginUrl: "/auth/sign-in",
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
