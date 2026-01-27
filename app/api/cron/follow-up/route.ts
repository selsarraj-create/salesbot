import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export const dynamic = 'force-dynamic';

// Time Window Configuration (Server Time UTC)
// Assuming UK Business Hours (London is UTC+0/1)
// 11 AM - 2 PM (Lunch)
// 7 PM - 9 PM (Evening)
const ALLOWED_WINDOWS = [
    { start: 11, end: 14 },
    { start: 19, end: 21 }
];

export async function GET(req: Request) {
    try {
        console.log('[Follow-up Engine] Cron started...');

        // 1. Check Time Window
        const now = new Date();
        const currentHour = now.getUTCHours() + 1; // Approx London time (adjust logic as needed)

        // Simple check: Is it roughly lunch or evening? 
        // Note: For production, use exact timezone handling.
        console.log(`[Follow-up Engine] Current Hour (UTC+1 estimated): ${currentHour}`);

        const isAllowed = ALLOWED_WINDOWS.some(w => currentHour >= w.start && currentHour < w.end);

        // OVERRIDE for testing: check query param ?force=true
        const url = new URL(req.url);
        const force = url.searchParams.get('force') === 'true';

        if (!isAllowed && !force) {
            console.log('[Follow-up Engine] Outside allowed time windows. Skipping.');
            return NextResponse.json({ status: 'skipped', reason: 'Time window' });
        }

        // 2. Fetch Stale Leads
        // Leads who haven't replied in:
        // 24h (Stage 1), 72h (Stage 2), 7 days (Stage 3)
        // AND haven't been followed up with for that stage yet.

        // Logic: 
        // If follow_up_count = 0 AND last_contacted > 24h ago -> Trigger Stage 1
        // If follow_up_count = 1 AND last_contacted > 72h ago -> Trigger Stage 2
        // ...

        const { data: leads, error } = await supabase
            .from('leads')
            .select('*')
            .neq('status', 'Booked') // Don't annoy booked leads
            .neq('status', 'Human_Required') // Don't annoy flagged leads
            .order('last_contacted_at', { ascending: true })
            .limit(10); // Process in batches

        if (error) throw error;
        console.log(`[Follow-up Engine] Checking ${leads?.length || 0} candidates...`);

        const processed = [];

        for (const lead of leads || []) {
            const lastContact = new Date(lead.last_contacted_at || lead.created_at).getTime();
            const diffHours = (now.getTime() - lastContact) / (1000 * 60 * 60);

            let stage: 1 | 2 | 3 | null = null;

            if (lead.follow_up_count === 0 && diffHours >= 24) stage = 1;
            else if (lead.follow_up_count === 1 && diffHours >= 72) stage = 2;
            else if (lead.follow_up_count === 2 && diffHours >= 168) stage = 3;

            if (!stage) continue;

            console.log(`[Follow-up Engine] Processing Lead ${lead.lead_code} for Stage ${stage}`);

            // 3. Sentiment & Guardrail Check
            // Check last conversation turn or stored sentiment
            const memory = lead.context_memory || {};

            // Should add a stored 'sentiment' field to lead for efficiency, 
            // but for now let's assume if they haven't replied, we check the last few messages.

            // Get last message from lead
            const { data: lastMsg } = await supabase
                .from('messages')
                .select('content, sender_type')
                .eq('lead_id', lead.id)
                .eq('sender_type', 'lead')
                .order('timestamp', { ascending: false })
                .limit(1)
                .single();

            if (lastMsg) {
                // If last sentiment was bad, SKIP
                const { analyzeSentiment } = await import('@/lib/utils/ai');
                const sentiment = await analyzeSentiment(lastMsg.content);
                if (sentiment < -0.5) {
                    console.log(`[Follow-up Engine] Lead ${lead.lead_code} has negative sentiment. Skipping.`);
                    await supabase.from('leads').update({ status: 'Human_Required' }).eq('id', lead.id);
                    continue;
                }
            }

            // 4. Generate Messaging
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

            let prompt = "";
            const baseContext = `Lead Name: ${lead.name || 'there'}
Context Memory: ${JSON.stringify(memory)}
Goal: Re-engage this lead who hasn't replied.
Style: Casual, helpful, non-pushy.`;

            if (stage === 1) {
                prompt = `${baseContext}
Stage 1 (24h Nudge):
Draft a short, low-pressure message.
"Hey [Name], just checking if you caught my last message about the Saturday slots? No rush, just didn't want you to miss out since Saturdays go fast! 📸"
- Reference specific concern from memory if any.
- Keep it under 160 chars.`;
            } else if (stage === 2) {
                prompt = `${baseContext}
Stage 2 (3 Days Value Add):
Draft a helpful resource message.
"Hi [Name]! I was just looking at some [Topic relevant to memory] briefs we have coming up. Thought you'd find this outfit guide helpful for when you're ready to come in! [Link]"
- If they mentioned "fashion", mention fashion briefs.
- Keep it friendly.`;
            } else if (stage === 3) {
                prompt = `${baseContext}
Stage 3 (7 Days Takeaway):
Draft a breakup message.
"Hey [Name], I haven't heard back so I'll assume the assessment isn't a priority right now. I'll take you off the follow-up list, but feel free to reach out if things change! Best, Alex."
- Psychological shift: remove the offer.`;
            }

            const result = await model.generateContent(prompt);
            const message = result.response.text().trim();

            // 5. Send (Simulate) & Update DB
            console.log(`[Follow-up Engine] Sending to ${lead.lead_code}: "${message}"`);

            await supabase.from('messages').insert({
                lead_id: lead.id,
                content: message,
                sender_type: 'bot'
            });

            await supabase.from('leads').update({
                follow_up_count: (lead.follow_up_count || 0) + 1,
                last_contacted_at: new Date().toISOString()
            }).eq('id', lead.id);

            processed.push({ lead: lead.lead_code, stage, message });
        }

        return NextResponse.json({ success: true, processed });

    } catch (error: any) {
        console.error('[Follow-up Engine] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
