import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export interface GradeResult {
    headless_adherence: number;
    data_collection: number;
    empathy: number;
    compliance: number;
    overall_score: number;
    judge_rationale: string;
}

export async function gradeConversation(
    chat_log: any[],
    scenario_name: string = 'Live Conversation',
    lead_id?: string
): Promise<GradeResult | null> {
    try {
        // 1. Judge Prompt
        const JUDGE_PROMPT = `
You are the "Ethics & Sales Coach" (Quality Control Engine).
Your job is to strictly evaluate a chat transcript between "Alex" (the Bot) and a "Lead".

SCENARIO: ${scenario_name}

GRADING CRITERIA (0-10):
1. **OUTBOUND EFFICIENCY (CRITICAL)**:
   - **CONTEXT CHECK**: Does the bot ask for Name/Age even though it is listed in "KNOWN DATA" above? -> IMMEDIATE 0.
   - DID ALEX PIVOT TO DATE/TIME? If YES -> 10.
2. **Headless Compliance**: NO LINKS.
3. **Empathy**: Validated feelings?
4. **Non-Agency**: Zero "Agency" promises?
5. **Closing**: Did Alex confirm submission after gathering data?

OUTPUT FORMAT (JSON ONLY):
{
    "outbound_efficiency": number,
    "headless_adherence": number,
    "data_collection": number,
    "empathy": number,
    "overall_score": number, // 0 if redundant q's asked despite known data.
    "judge_rationale": "Deep dive. STATE IF REDUNDANT QUESTIONS ASKED."
}
        `.trim();

        // 2. Format History
        let conversationText = "";
        chat_log.forEach((msg: any) => {
            const speaker = msg.sender_type === 'bot' || msg.sender === 'bot' ? 'ALEX' : 'LEAD';
            conversationText += `${speaker}: ${msg.content}\n`;
        });

        if (conversationText.length < 50) return null; // Too short to grade

        // 3. Generate with Gemini 3 Pro Preview
        const model = genAI.getGenerativeModel({
            model: "gemini-3-pro-preview",
            generationConfig: {
                // @ts-ignore
                thinking_config: {
                    include_thoughts: true,
                    thinking_level: "high"
                }
            } as any
        });
        const result = await model.generateContent(`${JUDGE_PROMPT}\n\nTRANSCRIPT:\n${conversationText}`);
        let jsonStr = result.response.text();

        jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
        const scores = JSON.parse(jsonStr);

        // 4. Save to DB if lead_id provided
        if (lead_id) {
            console.log('[Judge] Saving score for Lead:', lead_id);
            await supabase.from('leads').update({
                quality_score: scores.overall_score,
                judge_rationale: scores.judge_rationale
            }).eq('id', lead_id);
        }

        return scores;

    } catch (error) {
        console.error('[Judge Logic] Error:', error);
        return null;
    }
}
