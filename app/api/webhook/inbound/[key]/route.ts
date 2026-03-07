import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

let _sb: any;
const supabase: any = new Proxy({}, { get: (_t, p) => { if (!_sb) _sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!); return _sb[p]; } });

/**
 * POST /api/webhook/inbound/[key]
 * Receives leads from external CRMs.
 * Authenticates via API key in the URL path.
 *
 * Expected payload:
 * {
 *   "name": "Jane Smith",
 *   "phone": "+447123456789",
 *   "email": "jane@example.com",
 *   "source": "Instagram Ad",
 *   "notes": "Interested in headshots"
 * }
 */
export async function POST(
    req: Request,
    { params }: { params: { key: string } }
) {
    const startTime = Date.now();
    let tenantId = '';

    try {
        const apiKeyRaw = params.key;
        if (!apiKeyRaw || apiKeyRaw.length < 8) {
            return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
        }

        // Hash the key and look it up
        const keyHash = crypto.createHash('sha256').update(apiKeyRaw).digest('hex');
        const keyPrefix = apiKeyRaw.substring(0, 8);

        const { data: keyRecord, error: keyError } = await supabase
            .from('api_keys')
            .select('tenant_id')
            .eq('key_hash', keyHash)
            .single();

        if (keyError || !keyRecord) {
            // Try prefix match as fallback
            const { data: prefixRecord } = await supabase
                .from('api_keys')
                .select('tenant_id')
                .eq('key_prefix', keyPrefix)
                .single();

            if (!prefixRecord) {
                return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
            }
            tenantId = prefixRecord.tenant_id;
        } else {
            tenantId = keyRecord.tenant_id;
        }

        // Update last_used_at
        await supabase
            .from('api_keys')
            .update({ last_used_at: new Date().toISOString() })
            .eq('key_hash', keyHash);

        // Parse payload
        const body = await req.json();
        const { name, phone, email, source, notes, ...extra } = body;

        if (!phone && !name) {
            await logWebhook(tenantId, 'inbound', 400, body, { error: 'name or phone required' });
            return NextResponse.json({ error: 'At least "name" or "phone" is required' }, { status: 400 });
        }

        // Generate lead code
        const leadCode = `CRM-${Date.now().toString(36).toUpperCase()}`;

        // Create lead
        const { data: lead, error: leadError } = await supabase
            .from('leads')
            .insert({
                tenant_id: tenantId,
                name: name || 'Unknown',
                phone: phone || '',
                lead_code: leadCode,
                status: 'New',
                lead_metadata: {
                    source: source || 'CRM Webhook',
                    email: email || null,
                    notes: notes || null,
                    ...extra,
                    webhook_received_at: new Date().toISOString(),
                },
            })
            .select()
            .single();

        if (leadError) {
            console.error('[Webhook Inbound] Lead creation error:', leadError);
            await logWebhook(tenantId, 'inbound', 500, body, { error: leadError.message });
            return NextResponse.json({ error: 'Failed to create lead', details: leadError.message }, { status: 500 });
        }

        const duration = Date.now() - startTime;
        await logWebhook(tenantId, 'inbound', 200, body, { lead_id: lead.id, lead_code: leadCode }, duration);

        console.log(`[Webhook Inbound] Lead created: ${leadCode} for tenant ${tenantId} (${duration}ms)`);

        return NextResponse.json({
            success: true,
            lead_id: lead.id,
            lead_code: leadCode,
            message: `Lead "${name || phone}" created successfully`,
        }, { status: 201 });

    } catch (error: any) {
        console.error('[Webhook Inbound] Error:', error);
        if (tenantId) await logWebhook(tenantId, 'inbound', 500, null, { error: error.message });
        return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
    }
}

async function logWebhook(
    tenantId: string,
    direction: 'inbound' | 'outbound',
    statusCode: number,
    payload: any,
    response: any,
    durationMs?: number
) {
    try {
        await supabase.from('webhook_logs').insert({
            tenant_id: tenantId,
            direction,
            status_code: statusCode,
            payload: payload ? JSON.stringify(payload).substring(0, 2000) : null,
            response: response ? JSON.stringify(response).substring(0, 500) : null,
            duration_ms: durationMs || null,
        });
    } catch (e) {
        // Non-fatal — webhook_logs table might not exist yet
        console.warn('[Webhook] Failed to log:', e);
    }
}
