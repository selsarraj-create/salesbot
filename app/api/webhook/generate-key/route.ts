import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

let _sb: any;
const supabase: any = new Proxy({}, { get: (_t, p) => { if (!_sb) _sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!); return _sb[p]; } });

/**
 * POST /api/webhook/generate-key
 * Generates a new API key for a tenant.
 */
export async function POST(req: Request) {
    try {
        const { tenant_id } = await req.json();
        if (!tenant_id) {
            return NextResponse.json({ error: 'tenant_id required' }, { status: 400 });
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

        // Return the raw key — only shown ONCE
        return NextResponse.json({
            success: true,
            api_key: rawKey,
            message: 'Save this key — it will not be shown again.',
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
