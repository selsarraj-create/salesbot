'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { UserProfile, Tenant } from '@/lib/supabase/types';
import type { User } from '@supabase/supabase-js';

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
        // Get initial session
        supabase.auth.getUser().then(({ data: { user: currentUser } }) => {
            setUser(currentUser);
            if (currentUser) {
                fetchProfileAndTenant(currentUser.id);
            }
            setLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
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
