'use client';

import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import type { UserProfile, Tenant } from '@/lib/supabase/types';
import type { User } from '@supabase/supabase-js';

const PUBLIC_PATHS = ['/login', '/signup', '/homepage', '/diag'];

interface AuthContextType {
    user: User | null;
    profile: UserProfile | null;
    tenant: Tenant | null;
    loading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    profile: null,
    tenant: null,
    loading: true,
    signOut: async () => { },
});

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [tenant, setTenant] = useState<Tenant | null>(null);
    const [loading, setLoading] = useState(true);
    const hasRedirected = useRef(false);

    const fetchProfileAndTenant = async (userId: string) => {
        try {
            const { data: profileData } = await supabase
                .from('user_profiles' as any)
                .select('*')
                .eq('id', userId)
                .single();

            if (profileData) {
                const typedProfile = profileData as unknown as UserProfile;
                setProfile(typedProfile);

                const { data: tenantData } = await supabase
                    .from('tenants' as any)
                    .select('*')
                    .eq('id', typedProfile.tenant_id)
                    .single();

                if (tenantData) setTenant(tenantData as unknown as Tenant);
            }
        } catch (err) {
            console.error('Error fetching profile/tenant:', err);
        }
    };

    useEffect(() => {
        let mounted = true;

        // Step 1: Read session from localStorage via getSession() (no API call, no lock)
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!mounted) return;
            const currentUser = session?.user ?? null;
            setUser(currentUser);
            if (currentUser) {
                fetchProfileAndTenant(currentUser.id).then(() => {
                    if (mounted) setLoading(false);
                });
            } else {
                setLoading(false);
            }
        });

        // Step 2: Listen for subsequent auth changes (sign-in, sign-out, token refresh)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                // Skip INITIAL_SESSION — already handled by getSession() above
                if (event === 'INITIAL_SESSION') return;
                if (!mounted) return;

                const currentUser = session?.user ?? null;
                setUser(currentUser);

                if (currentUser) {
                    await fetchProfileAndTenant(currentUser.id);
                } else {
                    setProfile(null);
                    setTenant(null);
                }
            }
        );

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    // Client-side auth redirect — only fires ONCE
    useEffect(() => {
        if (!loading && !user && !hasRedirected.current && !PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
            hasRedirected.current = true;
            window.location.href = pathname === '/' ? '/homepage' : '/login';
        }
    }, [loading, user, pathname]);

    const signOut = async () => {
        setUser(null);
        setProfile(null);
        setTenant(null);
    };

    return (
        <AuthContext.Provider value={{ user, profile, tenant, loading, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}
