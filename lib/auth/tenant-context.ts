/**
 * Tenant context helpers for server-side usage.
 * Extracts tenant info and enforces role-based access control.
 */

import { createServerClient } from '@/lib/supabase/server';
import type { UserRole, UserProfile, Tenant } from '@/lib/supabase/types';

export class AuthError extends Error {
    status: number;
    constructor(message: string, status: number = 401) {
        super(message);
        this.name = 'AuthError';
        this.status = status;
    }
}

/**
 * Get the current authenticated user's profile (includes tenant_id and role).
 * Throws AuthError if not authenticated or profile not found.
 */
export async function getUserProfile(): Promise<UserProfile> {
    const supabase = createServerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        throw new AuthError('Not authenticated');
    }

    const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (profileError || !profile) {
        throw new AuthError('User profile not found. Please contact support.');
    }

    return profile;
}

/**
 * Get the current user's tenant_id.
 */
export async function getTenantId(): Promise<string> {
    const profile = await getUserProfile();
    return profile.tenant_id;
}

/**
 * Get full tenant details for the current user.
 */
export async function getTenant(): Promise<Tenant> {
    const supabase = createServerClient();
    const profile = await getUserProfile();

    const { data: tenant, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', profile.tenant_id)
        .single();

    if (error || !tenant) {
        throw new AuthError('Tenant not found', 404);
    }

    return tenant;
}

/**
 * Require a minimum role level. Throws if the user doesn't have sufficient permissions.
 * Role hierarchy: super_admin > owner > manager > agent
 */
const ROLE_HIERARCHY: Record<UserRole, number> = {
    agent: 0,
    manager: 1,
    owner: 2,
    super_admin: 3,
};

export async function requireRole(minimumRole: UserRole): Promise<UserProfile> {
    const profile = await getUserProfile();
    const userLevel = ROLE_HIERARCHY[profile.role];
    const requiredLevel = ROLE_HIERARCHY[minimumRole];

    if (userLevel < requiredLevel) {
        throw new AuthError(
            `Insufficient permissions. Required: ${minimumRole}, Current: ${profile.role}`,
            403
        );
    }

    return profile;
}

/**
 * Check if the current user is a super admin.
 */
export async function isSuperAdmin(): Promise<boolean> {
    try {
        const profile = await getUserProfile();
        return profile.role === 'super_admin';
    } catch {
        return false;
    }
}
