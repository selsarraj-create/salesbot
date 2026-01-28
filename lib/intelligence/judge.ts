import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export interface GradeResult {
    adaptive_pivot_score: number;
    qualification_score: number;
    headless_adherence: number;
    non_agency_score: number;
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
1. **ADAPTIVE PIVOT (CRITICAL)**:
   - DID ALEX ANSWER A QUESTION? If YES, DID SHE PIVOT BACK TO THE SCRIPT? (e.g. "Great question... Now, regarding your experience...")
   - Score 10 for Answer + Pivot. Score 5 for Answer only. Score 0 if ignored.
2. **Qualification Gate**: Did Alex follow the sequence (Experience -> Age -> Financials -> Residency)?
3. **Non-Agency**: Zero "Agency" promises? Did she correct misconceptions?
4. **Headless Compliance**: NO LINKS. Did she collect Date/Time directly?
5. **Empathy**: Validated feelings ("That happens a lot") before pivoting?

OUTPUT FORMAT (JSON ONLY):
{
    "adaptive_pivot_score": number, // 10 = Answered + Pivoted
    "qualification_score": number,
    "headless_adherence": number,
    "non_agency_score": number,
    "overall_score": number, 
    "judge_rationale": "Deep dive. STATE IF PIVOT FAILED."
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
