/**
 * Browser-side Supabase client.
 * Uses standard createClient with localStorage for session management.
 *
 * IMPORTANT: The Web Locks API is disabled via a no-op lock function.
 * Without this, window.location.href page navigations orphan the browser
 * lock, and the next page's Supabase client "steals" it, causing the
 * error: "Lock broken by another request with the 'steal' option."
 * This wipes the session and breaks auth on every second login.
 *
 * Since this is a single-tab app, we don't need cross-tab session locking.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storageKey: 'sb-auth-token',
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'implicit',
        // Disable Web Locks API — it causes "Lock broken by steal" errors
        // when navigating between pages with window.location.href
        lock: async (_name: string, _acquireTimeout: number, fn: () => Promise<any>) => {
            return await fn();
        },
    },
});

/**
 * Subscribe to real-time changes on the messages table.
 */
export function subscribeToMessages(
    leadId: string | null,
    callback: (payload: any) => void
) {
    const channel = supabase
        .channel('messages-changes')
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: leadId ? `lead_id=eq.${leadId}` : undefined,
            },
            callback
        )
        .subscribe();

    return channel;
}

/**
 * Subscribe to real-time changes on the leads table.
 */
export function subscribeToLeads(callback: (payload: any) => void) {
    const channel = supabase
        .channel('leads-changes')
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'leads',
            },
            callback
        )
        .subscribe();

    return channel;
}
