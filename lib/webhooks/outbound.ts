/**
 * Outbound webhook dispatcher.
 * Fires webhooks to the client's configured URL when lead events occur.
 */

import { createClient } from '@supabase/supabase-js';

let _sb: any;
function getSb() {
    if (!_sb) _sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    return _sb;
}

export type WebhookEvent =
    | 'lead.created'
    | 'lead.status_changed'
    | 'lead.booked'
    | 'message.received';

interface WebhookPayload {
    event: WebhookEvent;
    timestamp: string;
    tenant_id: string;
    data: any;
}

export async function fireWebhook(
    tenantId: string,
    event: WebhookEvent,
    data: any
) {
    try {
        // Get tenant's outbound webhook URL
        const { data: tenant } = await getSb()
            .from('tenants')
            .select('outbound_webhook_url')
            .eq('id', tenantId)
            .single();

        const url = tenant?.outbound_webhook_url;
        if (!url) return; // No webhook configured

        const payload: WebhookPayload = {
            event,
            timestamp: new Date().toISOString(),
            tenant_id: tenantId,
            data,
        };

        const startTime = Date.now();

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Webhook-Event': event,
                'User-Agent': 'ReplyDesk-Webhook/1.0',
            },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(10000), // 10s timeout
        });

        const duration = Date.now() - startTime;
        const statusCode = response.status;

        let responseBody: string;
        try {
            responseBody = await response.text();
        } catch {
            responseBody = '(no body)';
        }

        // Log the webhook
        await logOutboundWebhook(tenantId, statusCode, payload, responseBody, duration);

        if (!response.ok) {
            console.warn(`[Webhook Outbound] ${event} failed: ${statusCode} (${duration}ms)`);
        } else {
            console.log(`[Webhook Outbound] ${event} sent to ${url} (${statusCode}, ${duration}ms)`);
        }

    } catch (error: any) {
        console.error(`[Webhook Outbound] Error firing ${event}:`, error.message);
        await logOutboundWebhook(tenantId, 0, { event, data }, error.message, 0);
    }
}

async function logOutboundWebhook(
    tenantId: string,
    statusCode: number,
    payload: any,
    response: string,
    durationMs: number
) {
    try {
        await getSb().from('webhook_logs').insert({
            tenant_id: tenantId,
            direction: 'outbound',
            status_code: statusCode,
            payload: JSON.stringify(payload).substring(0, 2000),
            response: response.substring(0, 500),
            duration_ms: durationMs,
        });
    } catch {
        // Non-fatal
    }
}
