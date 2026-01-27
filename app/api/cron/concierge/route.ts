import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { getTflStatus, getWeather } from '@/lib/concierge';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        console.log('[Concierge] Checking stats...');

        // 1. Get Live Status
        const [tfl, weather] = await Promise.all([
            getTflStatus(),
            getWeather('NW5')
        ]);

        const northernLine = tfl.find(t => t.line === 'Northern Line');
        const thameslink = tfl.find(t => t.line === 'Thameslink');

        const isTubeDelay = northernLine?.status !== 'Good Service';
        const isRailDelay = thameslink?.status !== 'Good Service';
        const isBadWeather = ['Rain', 'Heavy Rain', 'Storm'].includes(weather.condition);

        if (!isTubeDelay && !isRailDelay && !isBadWeather) {
            console.log('[Concierge] All clear. No alerts needed.');
            return NextResponse.json({ status: 'No Alerts', tfl, weather });
        }

        // 2. Find Booked Leads (Next 4 Hours)
        // Mock query since we might not have 'shoot_date' populated in dev
        const { data: leads } = await supabase
            .from('leads')
            .select('*')
            .eq('status', 'Booked')
            .is('alert_sent_at', null) // Only valid if we haven't alerted yet
            .limit(5);

        if (!leads || leads.length === 0) {
            return NextResponse.json({ status: 'No leads to alert', tfl, weather });
        }

        const sentAlerts = [];
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 250,
                topP: 0.8
            }
        });

        for (const lead of leads) {
            console.log(`[Concierge] Alerting ${lead.lead_code}`);

            let prompt = `Draft a helpful, friendly SMS alert for a photography lead named ${lead.name || 'there'}.
Context: They have a shoot coming up in Kentish Town.
Studio Name: London Photography Studio.
`;

            if (isTubeDelay) {
                prompt += `Alert: Northern Line has ${northernLine?.status}.
Instruction: Advise them to leave 15 mins early. Be helpful.`;
            } else if (isRailDelay) {
                prompt += `Alert: Thameslink has ${thameslink?.status}.
Instruction: Advise checking train times as delays are expected. Suggest Northern Line as backup if possible.`;
            } else if (isBadWeather) {
                prompt += `Alert: Current weather is ${weather.condition}.
Instruction: Remind them to bring an umbrella for the walk from the station. Reassure them we have styling kits so "helmet hair" isn't an issue.`;
            }

            const result = await model.generateContent(prompt);
            const message = result.response.text().trim();

            await supabase.from('messages').insert({
                lead_id: lead.id,
                content: message,
                sender_type: 'bot'
            });

            await supabase.from('leads')
                .update({ alert_sent_at: new Date().toISOString() })
                .eq('id', lead.id);

            sentAlerts.push(lead.lead_code);
        }

        return NextResponse.json({ success: true, alerts: sentAlerts, conditions: { tfl, weather } });

    } catch (error: any) {
        console.error('[Concierge] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
