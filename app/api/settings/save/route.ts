import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAuth } from '@/lib/auth/api-auth';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
    try {
        const auth = await verifyAuth(req);
        if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { name, chatbot_name, monthly_ad_spend, quiet_hours_start, quiet_hours_end, quiet_hours_tz } = body;

        const { data, error } = await supabaseAdmin
            .from('tenants')
            .update({
                name,
                chatbot_name,
                monthly_ad_spend: monthly_ad_spend || 0,
                quiet_hours_start: quiet_hours_start || null,
                quiet_hours_end: quiet_hours_end || null,
                quiet_hours_tz: quiet_hours_tz || 'Europe/London',
            })
            .eq('id', auth.tenantId)
            .select()
            .single();

        if (error) {
            console.error('[Settings API] Update error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, tenant: data });
    } catch (err: any) {
        console.error('[Settings API] Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
