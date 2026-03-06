/**
 * Server-side Supabase client factory.
 * Uses the SERVICE ROLE KEY to bypass RLS.
 *
 * Why: The browser client uses localStorage (not cookies) for session
 * storage, so server-side API routes can't read the user's JWT from
 * cookies. Instead, they use the service role key which bypasses RLS
 * entirely. Auth checking is done at the application level.
 *
 * Use this in API routes that need to read/write tenant-scoped data.
 */

import { createClient } from '@supabase/supabase-js';

let _adminClient: ReturnType<typeof createClient> | null = null;

export function getServerSupabase() {
    if (!_adminClient) {
        _adminClient = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
    }
    return _adminClient;
}
