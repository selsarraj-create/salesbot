
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export async function POST(req: Request) {
    try {
        const { chat_log, scenario_name, scenario_id, lead_persona_name } = await req.json();

        // 1. The Judge Prompt
        const JUDGE_PROMPT = `
You are the "Ethics & Sales Coach" for a Photography Studio AI.
Your job is to strictly evaluate a chat transcript between "Alex" (the Bot) and a "Lead" (Simulated Customer).

SCENARIO: ${scenario_name}

GRADING CRITERIA (0-10):
1. Empathy: Did Alex acknowledge feelings before pitching? (7+ requires active listening phrases).
2. Non-Agency Compliance: Did Alex make it clear this is a Studio Service, NOT an Agency? (Critical failure if "Agency" is confirmed).
3. Technical Accuracy: Did Alex use correct local info (Kentish Town, Tube) or industry terms?
4. Conversion Logic: Did Alex move the conversation toward an assessment naturally?

OUTPUT FORMAT (JSON ONLY):
{
    "empathy": number,
    "compliance": number,
    "technical": number,
    "conversion": number,
    "overall_score": number,
    "coach_note": "1 sentence specific feedback."
}
        `.trim();

        // Format history for Judge
        let conversationText = "";
        chat_log.forEach((msg: any) => {
            const speaker = msg.sender === 'bot' ? 'ALEX' : 'LEAD';
            conversationText += `${speaker}: ${msg.content}\n`;
        });

        // 2. Generate Grade
        // 2. Generate Grade
        // Upgraded to Gemini 2.5 Flash for better reasoning
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent(`${JUDGE_PROMPT}\n\nTRANSCRIPT:\n${conversationText}`);
        let jsonStr = result.response.text();

        // Clean JSON
        jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
        const scores = JSON.parse(jsonStr);

        // 3. Save to File System (MVP fallback since migration failed)
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
                    coach_note: scores.coach_note,
                    chat_log_preview: chat_log // Save full log if needed, or truncate
                };

                results.push(newResult);
                fs.writeFileSync(filePath, JSON.stringify(results, null, 2));
                console.log('[Judge] Saved result to', filePath);
            } catch (saveError) {
                console.error('[Judge] Save failed (non-fatal):', saveError);
                // We don't block the response if save fails
            }
        }

        return NextResponse.json({ success: true, scores });

    } catch (error: any) {
        console.error('[Judge] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
