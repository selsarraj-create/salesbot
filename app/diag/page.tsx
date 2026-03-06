'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

interface DiagState {
    session: any;
    user: any;
    leadsQuery: any;
    rulesQuery: any;
    profileQuery: any;
    error: string | null;
}

export default function DiagPage() {
    const [diag, setDiag] = useState<DiagState | null>(null);
    const [running, setRunning] = useState(true);

    useEffect(() => {
        async function runDiag() {
            const result: DiagState = {
                session: null,
                user: null,
                leadsQuery: null,
                rulesQuery: null,
                profileQuery: null,
                error: null,
            };

            try {
                // Step 1: Check session
                const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
                result.session = {
                    hasSession: !!sessionData?.session,
                    accessTokenPrefix: sessionData?.session?.access_token?.substring(0, 20) + '...',
                    expiresAt: sessionData?.session?.expires_at
                        ? new Date(sessionData.session.expires_at * 1000).toISOString()
                        : null,
                    userId: sessionData?.session?.user?.id || null,
                    email: sessionData?.session?.user?.email || null,
                    error: sessionErr?.message || null,
                };

                // Step 2: Check user
                const { data: userData, error: userErr } = await supabase.auth.getUser();
                result.user = {
                    hasUser: !!userData?.user,
                    id: userData?.user?.id || null,
                    email: userData?.user?.email || null,
                    error: userErr?.message || null,
                };

                // Step 3: Query leads (RLS applies)
                const { data: leads, error: leadsErr, count } = await supabase
                    .from('leads')
                    .select('id, name, tenant_id', { count: 'exact' })
                    .limit(3);
                result.leadsQuery = {
                    count,
                    sample: leads,
                    error: leadsErr?.message || null,
                    hint: leadsErr?.hint || null,
                    code: leadsErr?.code || null,
                };

                // Step 4: Query system_rules (RLS applies)
                const { data: rules, error: rulesErr } = await supabase
                    .from('system_rules')
                    .select('id, tenant_id, rule_text')
                    .limit(3);
                result.rulesQuery = {
                    count: rules?.length ?? 0,
                    sample: rules,
                    error: rulesErr?.message || null,
                };

                // Step 5: Query user_profiles (RLS applies)
                const { data: profile, error: profileErr } = await supabase
                    .from('user_profiles')
                    .select('id, tenant_id, role, email')
                    .limit(5);
                result.profileQuery = {
                    count: profile?.length ?? 0,
                    data: profile,
                    error: profileErr?.message || null,
                };
            } catch (err: any) {
                result.error = err.message;
            }

            setDiag(result);
            setRunning(false);
        }

        runDiag();
    }, []);

    const handleSignOut = () => {
        // Absolute bare-bones sign-out: clear everything, redirect
        document.cookie.split(';').forEach((c) => {
            document.cookie = c.trim().split('=')[0] + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
        });
        try { localStorage.clear(); } catch { }
        try { sessionStorage.clear(); } catch { }
        window.location.href = '/login';
    };

    return (
        <div style={{ padding: 40, fontFamily: 'monospace', background: '#111', color: '#0f0', minHeight: '100vh' }}>
            <h1 style={{ fontSize: 24, marginBottom: 20 }}>🔍 Auth &amp; RLS Diagnostic</h1>

            <button
                onClick={handleSignOut}
                style={{ padding: '12px 24px', background: '#e00', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 16, marginBottom: 20 }}
            >
                🚪 FORCE SIGN OUT (clears all cookies + storage)
            </button>

            {running ? (
                <p>Running diagnostics...</p>
            ) : (
                <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', lineHeight: 1.6 }}>
                    {JSON.stringify(diag, null, 2)}
                </pre>
            )}
        </div>
    );
}
