/**
 * Supabase client for browser-side operations.
 * Includes Realtime subscription helpers.
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    realtime: {
        params: {
            eventsPerSecond: 10,
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
