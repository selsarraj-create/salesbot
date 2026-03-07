/**
 * Onboarding API — creates tenant + user profile after signup.
 * Uses admin (service_role) client because the user just signed up
 * and doesn't have a profile yet (RLS would block them).
 */

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Use raw createClient with service key — bypasses RLS, no Database generic needed
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: Request) {
    try {
        const { userId, email, displayName, studioName, studioSlug } = await req.json();

        if (!userId || !email || !studioName || !studioSlug) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Lightweight auth: verify the caller owns this userId
        const authHeader = req.headers.get('authorization');
        if (authHeader?.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const verifyClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
                global: { headers: { Authorization: `Bearer ${token}` } },
            });
            const { data: { user } } = await verifyClient.auth.getUser(token);
            if (!user || user.id !== userId) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }
        } else {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // 1. Check if slug is taken
        const { data: existing } = await supabase
            .from('tenants')
            .select('id')
            .eq('slug', studioSlug)
            .single();

        if (existing) {
            return NextResponse.json({ error: 'Studio ID is already taken. Please choose another.' }, { status: 409 });
        }

        // 2. Create tenant
        const { data: tenant, error: tenantError } = await supabase
            .from('tenants')
            .insert({
                name: studioName,
                slug: studioSlug,
            })
            .select()
            .single();

        if (tenantError || !tenant) {
            console.error('Tenant creation error:', tenantError);
            return NextResponse.json({ error: 'Failed to create studio' }, { status: 500 });
        }

        // 3. Create user profile (linked to tenant, role = owner)
        const { error: profileError } = await supabase
            .from('user_profiles')
            .insert({
                id: userId,
                tenant_id: tenant.id,
                role: 'owner',
                display_name: displayName || null,
                email,
            });

        if (profileError) {
            console.error('Profile creation error:', profileError);
            // Clean up: delete the tenant we just created
            await supabase.from('tenants').delete().eq('id', tenant.id);
            return NextResponse.json({ error: 'Failed to create user profile' }, { status: 500 });
        }

        // 4. Create default ai_config for the new tenant
        const { error: configError } = await supabase
            .from('ai_config')
            .insert({
                tenant_id: tenant.id,
                temperature: 0.3,
                top_p: 0.95,
                frequency_penalty: 0.5,
                full_context_mode: true,
                thinking_budget: 2048,
                show_thoughts: false,
            });

        if (configError) {
            console.error('AI config creation error:', configError);
        }

        return NextResponse.json({ success: true, tenantId: tenant.id });

    } catch (error: any) {
        console.error('Onboarding error:', error);
        return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
    }
}
