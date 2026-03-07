import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { verifyAuth } from '@/lib/auth/api-auth';

let _sb: any;
const supabase: any = new Proxy({}, { get: (_t, p) => { if (!_sb) _sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!); return (_sb as any)[p]; } });

/**
 * POST /api/webhook/generate-key
 * Generates a new API key for the authenticated user's tenant.
 */
export async function POST(req: Request) {
    try {
        // Verify auth
        const auth = await verifyAuth(req);
        if (!auth) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { tenant_id } = await req.json();

        // Ensure user can only generate keys for their own tenant
        if (tenant_id !== auth.tenantId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Generate a random key
        const rawKey = `rdk_${crypto.randomBytes(24).toString('hex')}`;
        const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
        const keyPrefix = rawKey.substring(0, 8);

        const { error } = await supabase
            .from('api_keys')
            .insert({
                tenant_id,
                key_hash: keyHash,
                key_prefix: keyPrefix,
                label: 'CRM Integration',
            });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            api_key: rawKey,
            message: 'Save this key — it will not be shown again.',
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
