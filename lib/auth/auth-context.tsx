'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
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

    const fetchProfileAndTenant = async (userId: string) => {
        try {
            // Fetch user profile
            const { data: profileData } = await supabase
                .from('user_profiles' as any)
                .select('*')
                .eq('id', userId)
                .single();

            if (profileData) {
                const typedProfile = profileData as unknown as UserProfile;
                setProfile(typedProfile);

                // Fetch tenant
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
        // Only use onAuthStateChange — it fires INITIAL_SESSION on setup.
        // Do NOT also call getUser() — that causes lock contention
        // ("Lock broken by another request with the 'steal' option").
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                const currentUser = session?.user ?? null;
                setUser(currentUser);

                if (currentUser) {
                    await fetchProfileAndTenant(currentUser.id);
                } else {
                    setProfile(null);
                    setTenant(null);
                }
                setLoading(false);
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    // Client-side auth redirect
    useEffect(() => {
        if (!loading && !user && !PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
            // Unauthenticated visitors on root go to the marketing homepage
            window.location.href = pathname === '/' ? '/homepage' : '/login';
        }
    }, [loading, user, pathname]);

    const signOut = async () => {
        await supabase.auth.signOut();
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
