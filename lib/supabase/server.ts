/**
 * Server-side Supabase client for API routes and server components.
 * Uses service_role key for admin operations (bypasses RLS).
 * Uses user JWT for tenant-scoped operations (RLS enforced).
 */

import { createClient } from '@supabase/supabase-js';
import { createServerClient as createSSRServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from './types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Auth-aware server client — respects RLS policies.
 * Use this for all tenant-scoped operations.
 */
export function createServerClient() {
    const cookieStore = cookies();

    return createSSRServerClient<Database>(supabaseUrl, supabaseAnonKey, {
        cookies: {
            getAll() {
                return cookieStore.getAll();
            },
            setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
                try {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        cookieStore.set(name, value, options)
                    );
                } catch {
                    // The `setAll` method was called from a Server Component.
                    // This can be ignored if you have middleware refreshing sessions.
                }
            },
        },
    });
}

/**
 * Admin client — bypasses RLS entirely.
 * Use ONLY for:
 * - Webhook handlers (Twilio inbound — no user session)
 * - Cron jobs
 * - Cross-tenant operations (super admin)
 * - Onboarding (creating tenants/profiles before user has session)
 */
export function createAdminClient() {
    return createClient<Database>(supabaseUrl, supabaseServiceKey);
}
