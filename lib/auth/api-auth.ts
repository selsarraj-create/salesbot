/**
 * Server-side auth verification for API routes.
 * Extracts the Supabase access token from the Authorization header
 * and verifies it to get the user + tenant info.
 */

import { createClient } from '@supabase/supabase-js';

let _sb: any;
function getAdminClient() {
    if (!_sb) _sb = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    return _sb;
}

export interface AuthResult {
    userId: string;
    tenantId: string;
    role: string;
}

/**
 * Verify the request is from an authenticated user.
 * Expects: Authorization: Bearer <supabase-access-token>
 * Returns user info + tenant_id, or null if invalid.
 */
export async function verifyAuth(req: Request): Promise<AuthResult | null> {
    try {
        const authHeader = req.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) return null;

        const token = authHeader.substring(7);
        if (!token) return null;

        // Create a client with the user's token to verify it
        const userClient = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                global: { headers: { Authorization: `Bearer ${token}` } },
            }
        );

        const { data: { user }, error } = await userClient.auth.getUser(token);
        if (error || !user) return null;

        // Fetch their profile to get tenant_id
        const admin = getAdminClient();
        const { data: profile } = await admin
            .from('user_profiles')
            .select('tenant_id, role')
            .eq('id', user.id)
            .single();

        if (!profile) return null;

        return {
            userId: user.id,
            tenantId: profile.tenant_id,
            role: profile.role,
        };
    } catch {
        return null;
    }
}

/**
 * Verify CRON_SECRET for cron routes.
 * Expects: Authorization: Bearer <CRON_SECRET>
 */
export function verifyCronSecret(req: Request): boolean {
    const secret = process.env.CRON_SECRET;
    if (!secret) return false; // No secret configured = block all

    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) return false;

    return authHeader.substring(7) === secret;
}

/**
 * Simple in-memory rate limiter.
 * Returns true if the request should be BLOCKED.
 */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function isRateLimited(key: string, maxPerMinute: number = 60): boolean {
    const now = Date.now();
    const entry = rateLimitMap.get(key);

    if (!entry || now > entry.resetAt) {
        rateLimitMap.set(key, { count: 1, resetAt: now + 60000 });
        return false;
    }

    entry.count++;
    if (entry.count > maxPerMinute) return true;

    return false;
}
