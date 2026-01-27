
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export async function POST(req: Request) {
    try {
        const { chat_log, scenario_name, scenario_id, lead_persona_name } = await req.json();

        // 1. The Judge Prompt (Deep Reasoning Mode)
        const JUDGE_PROMPT = `
You are the "Ethics & Sales Coach" (Quality Control Engine).
Your job is to strictly evaluate a chat transcript between "Alex" (the Bot) and a "Lead" (Simulated Customer or Real Lead).

SCENARIO: ${scenario_name || 'Live Conversation'}

GRADING CRITERIA (0-10):
1. Empathy: Did Alex acknowledge feelings before pitching? (7+ requires active listening phrases).
2. Non-Agency Compliance: Critical failure if "Agency" is confirmed or implied.
3. Technical Accuracy: Correct local info (Kentish Town, Tube) or industry terms?
4. Conversion Logic: Natural progression to assessment?
5. Senior Handoff: Did Alex defer correctly if stuck?

OUTPUT FORMAT (JSON ONLY):
{
    "empathy": number,
    "compliance": number,
    "technical": number,
    "conversion": number,
    "overall_score": number,
    "judge_rationale": "Brief deep-dive explanation. Highlight specific violations (e.g., 'Used 'Agency' at line 5')."
}
        `.trim();

        // Format history for Judge
        let conversationText = "";
        let leadIdFromLog = null;
        chat_log.forEach((msg: any) => {
            const speaker = msg.sender === 'bot' ? 'ALEX' : 'LEAD';
            conversationText += `${speaker}: ${msg.content}\n`;
            if (msg.lead_id && !leadIdFromLog) leadIdFromLog = msg.lead_id;
        });

        // 2. Generate Grade (Gemini 3 Pro)
        // User requested gemini-3-pro for "Deep Think" capability
        const model = genAI.getGenerativeModel({ model: "gemini-3-pro" });
        const result = await model.generateContent(`${JUDGE_PROMPT}\n\nTRANSCRIPT:\n${conversationText}`);
        let jsonStr = result.response.text();

        // Clean JSON
        jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
        const scores = JSON.parse(jsonStr);

        // 3. Save Logic

        // (A) Real/Sandbox Lead Sync (if lead_id exists in log)
        if (leadIdFromLog) {
            console.log('[Judge] Updating DB for Lead:', leadIdFromLog);
            const { error } = await supabase.from('leads').update({
                quality_score: scores.overall_score,
                judge_rationale: scores.judge_rationale
            }).eq('id', leadIdFromLog);

            if (error) console.error('[Judge] DB Error:', error);
        }

        // (B) Simulation File Save (Fallback/Sim)
        if (scenario_id) {
            try {
                const fs = require('fs');
                const path = require('path');
                const crypto = require('crypto');
                const dataDir = path.join(process.cwd(), 'data');

                // Ensure directory exists
                if (!fs.existsSync(dataDir)) {
                    fs.mkdirSync(dataDir, { recursive: true });
                }

                const filePath = path.join(dataDir, 'sim_results.json');

                let results = [];
                if (fs.existsSync(filePath)) {
                    results = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                }

                const newResult = {
                    id: crypto.randomUUID(),
                    created_at: new Date().toISOString(),
                    scenario_id,
                    lead_persona_name,
                    scores,
                    coach_note: scores.judge_rationale, // Map rationale to coach note
                    chat_log_preview: chat_log
                };

                results.push(newResult);
                fs.writeFileSync(filePath, JSON.stringify(results, null, 2));
                console.log('[Judge] Saved result to', filePath);
            } catch (saveError) {
                console.error('[Judge] Save failed (non-fatal):', saveError);
            }
        }

        return NextResponse.json({ success: true, scores });

    } catch (error: any) {
        console.error('[Judge] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
