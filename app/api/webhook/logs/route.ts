import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/api-auth';

let _sb: any;
const supabase: any = new Proxy({}, { get: (_t, p) => { if (!_sb) _sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!); return (_sb as any)[p]; } });

/**
 * GET /api/webhook/logs?tenant_id=xxx
 * Returns recent webhook logs for the authenticated user's tenant.
 */
export async function GET(req: Request) {
    try {
        // Verify auth
        const auth = await verifyAuth(req);
        if (!auth) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const tenantId = searchParams.get('tenant_id');

        // Ensure user can only read their own tenant's logs
        if (tenantId !== auth.tenantId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
