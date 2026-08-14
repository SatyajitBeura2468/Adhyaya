import { auth } from "@/lib/auth";
import type { NextRequest } from "next/server";

// Next.js 16 calls this file `proxy.ts`. Neon Auth uses it to exchange the
// OAuth verifier for app-domain session cookies before protected pages render.
const authProxy = auth.middleware({
  loginUrl: "/auth/sign-in",
});

export function proxy(request: NextRequest) {
  return authProxy(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
