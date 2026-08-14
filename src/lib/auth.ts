import "server-only";

import { createNeonAuth } from "@neondatabase/auth/next/server";

const fallbackSecret = "development-only-neon-auth-cookie-secret-change-before-production";
const authBaseUrl = process.env.NEON_AUTH_BASE_URL;
const authCookieSecret = process.env.NEON_AUTH_COOKIE_SECRET;

export const authConfigured = Boolean(authBaseUrl && authCookieSecret);

export const auth = createNeonAuth({
  baseUrl: authBaseUrl ?? "http://localhost:3000/api/auth",
  cookies: { secret: authCookieSecret ?? fallbackSecret },
});
