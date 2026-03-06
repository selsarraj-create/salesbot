/**
 * Server-side Supabase client factory.
 * Uses the SERVICE ROLE KEY to bypass RLS.
 * Lazily initialized to avoid build-time crashes.
 */

import { createClient } from '@supabase/supabase-js';

let _adminClient: any = null;

export function getServerSupabase(): any {
    if (!_adminClient) {
        _adminClient = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
    }
    return _adminClient;
}
