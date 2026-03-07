import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

let _sb: any;
const supabase: any = new Proxy({}, { get: (_t, p) => { if (!_sb) _sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!); return _sb[p]; } });

/**
 * GET /api/webhook/logs?tenant_id=xxx
 * Returns recent webhook logs for a tenant.
 */
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const tenantId = searchParams.get('tenant_id');

        if (!tenantId) {
            return NextResponse.json({ error: 'tenant_id required' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('webhook_logs')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ logs: data || [] });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
