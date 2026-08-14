import "server-only";

import { createNeonAuth } from "@neondatabase/auth/next/server";

const fallbackSecret = "development-only-neon-auth-cookie-secret-change-before-production";

export const authConfigured = Boolean(process.env.NEON_AUTH_BASE_URL && process.env.NEON_AUTH_COOKIE_SECRET);

export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL ?? "http://localhost:3000/api/auth",
  cookies: { secret: process.env.NEON_AUTH_COOKIE_SECRET ?? fallbackSecret },
  logLevel: "silent",
});
