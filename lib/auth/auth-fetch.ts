/**
 * Authenticated fetch wrapper for client-side API calls.
 * Automatically attaches the Supabase access token to requests.
 */

import { supabase } from '@/lib/supabase/client';

export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const headers = new Headers(options.headers);
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }
    if (!headers.has('Content-Type') && options.body) {
        headers.set('Content-Type', 'application/json');
    }

    return fetch(url, { ...options, headers });
}
