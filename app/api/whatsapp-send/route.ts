import { NextResponse } from 'next/server';

// Send a WhatsApp message via Twilio (WhatsApp Sandbox)
export async function POST(req: Request) {
    try {
        const { to, message } = await req.json();

        if (!to || !message) {
            return NextResponse.json({ error: 'Missing "to" or "message"' }, { status: 400 });
        }

        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const fromNumber = process.env.TWILIO_PHONE_NUMBER;

        if (!accountSid || !authToken || !fromNumber) {
            return NextResponse.json({ error: 'Twilio credentials not configured' }, { status: 500 });
        }

        // Twilio REST API — send WhatsApp message
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
        const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

        const body = new URLSearchParams({
            To: `whatsapp:${to}`,
            From: `whatsapp:${fromNumber}`,
            Body: message,
        });

        const twilioRes = await fetch(twilioUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: body.toString(),
        });

        const result = await twilioRes.json();

        if (!twilioRes.ok) {
            console.error('[WhatsApp Send] Twilio Error:', result);
            return NextResponse.json({ error: result.message || 'Failed to send' }, { status: twilioRes.status });
        }

        return NextResponse.json({
            success: true,
            sid: result.sid,
            to,
        });
    } catch (error: any) {
        console.error('[WhatsApp Send] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
