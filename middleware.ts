/**
 * Middleware is intentionally a no-op.
 *
 * Auth is handled entirely client-side:
 * - Browser client uses localStorage for session management
 * - AuthProvider handles redirects for unauthenticated users
 * - Server API routes use service role key
 *
 * The previous middleware called supabase.auth.getUser() to refresh
 * session cookies, but since we no longer use cookie-based auth,
 * this was writing empty/stale cookies that interfered with the
 * browser's localStorage session.
 */

export function middleware() {
    // Pass through — no auth processing needed
}

export const config = {
    matcher: [],
};
