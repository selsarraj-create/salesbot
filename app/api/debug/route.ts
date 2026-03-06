/**
 * Auth check endpoint — verifies if the session is being passed correctly.
 * Uses the user's auth session (not admin) to see what RLS allows.
 * DELETE THIS ROUTE after debugging.
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
    const cookieStore = cookies();

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        );
                    } catch { }
                },
            },
        }
    );

    // 1. Check auth session
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    // 2. If we have a user, try querying leads with their session (RLS applies)
    let leadsCount = null;
    let leadsError = null;
    if (user) {
        const { count, error } = await supabase
            .from('leads')
            .select('*', { count: 'exact', head: true });
        leadsCount = count;
        leadsError = error?.message;
    }

    // 3. List all cookies for debugging
    const allCookies = cookieStore.getAll().map(c => ({ name: c.name, hasValue: !!c.value }));

    return NextResponse.json({
        auth: {
            hasUser: !!user,
            userId: user?.id || null,
            email: user?.email || null,
            error: authError?.message || null,
        },
        rls: {
            leadsVisible: leadsCount,
            error: leadsError,
        },
        cookies: allCookies,
    });
}
