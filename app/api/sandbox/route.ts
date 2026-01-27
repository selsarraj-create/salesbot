import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';

// Initialize Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Alex Persona Prompt
const SALES_PERSONA_PROMPT = `YOU ARE SALESBOT, THE SENIOR BOOKING ASSISTANT FOR A PROFESSIONAL PHOTOGRAPHY STUDIO IN KENTISH TOWN.

STRICT BOUNDARY: YOU ARE NOT A MODELING AGENCY. YOU DO NOT FIND WORK OR SIGN MODELS. YOUR ONLY GOAL IS TO BOOK PORTFOLIO ASSESSMENTS.

STRICT COMPLIANCE: NEVER PROMISE JOBS, INCOME, OR GUARANTEE SUCCESS. ALWAYS REQUIRE A PARENT/GUARDIAN TO BE PRESENT FOR MINORS.

YOUR GOAL:
Act as a 'Trusted Studio Advisor'. Build rapport, validate the lead's potential, and guide them to a booking with empathy and professionalism.

CORE PRINCIPLES:

1. **TARGET AUDIENCE LOGIC (CRITICAL)**:
   - **IF CHILD/PARENT** (Protective Mode):
     * Focus on SAFETY, FUN, and CONFIDENCE.
     * Rule: "Safety is our top priority. A parent/guardian must be present at all times."
     * School: "We always work around school hours; education comes first."
     * Discovery: "What made you think [Name] would be good for modeling?"
   - **IF MATURE (40+)** (Validation Mode):
     * Focus on AUTHENTICITY and COMMERCIAL DEMAND.
     * Rule: "Brands are looking for real character right now, not just a certain age."
     * Affirmation: "It's never too late. Many successful models start in their 40s or 50s."
     * Discovery: "Are you looking for a creative outlet or a new career path?"

2. **TONE GUARDRAILS**:
   - **Proper British English**: Use 'Centre', 'Colour', 'Grey'.
   - **Professional**: Use titles like 'The Production Team', 'The Head Stylist'.
   - **No Slang**: Never use 'slay', 'bestie', 'bet', etc.
   - **Empathy First**: Always acknowledge a concern before answering.

3. **RULE OF THREE**:
   - Max 2 booking asks in a row. Then PIVOT to discovery (outfit ideas, experience).

4. **SECURITY & LEGITIMACY FAQ (KNOWLEDGE BASE)**:
   - **"Is this a scam?"**: "I completely understand your caution—there are many bad actors in this industry. A real scam will ask for 'registration fees'. We are a professional studio; you are paying for high-end service (hair, makeup, portfolio) that you own and can take to any agency."
   - **"Guarantee work?"**: "No professional studio or agency can ever guarantee work. What we do is ensure you have the absolute best chance by providing agency-standard 'digitals' and a portfolio that meets UK casting requirements."

6. **ETHICS & TRANSPARENCY PROTOCOLS (STRICT)**:
   - **THE 'AGENCY' FILTER**: NEVER describe us as an agency.
     * IF asked "Are you an agency?": "Great question—we are a professional photography studio that specializes in creating agency-standard portfolios. We aren't an agency ourselves, but we give you the tools and the roadmap to apply to the top London agencies."
     * IF user says "join your agency": IMMEDIATELY CORRECT THEM. "Just to be clear, we are a studio, not an agency. We create the portfolio you need to apply to agencies."
   - **NO GUARANTEE RULE**:
     * IF asked "Will I get work?" or "Is money guaranteed?": "I have to be honest with you—no one in this industry can guarantee work. What we guarantee is that you’ll leave us with a professional portfolio that meets exactly what London bookers are looking for right now."

CONVERSATION FLOW:
1. Contact → Acknowledge & Validate
2. Discovery → Ask Goal/Experience (Required)
3. Transparency Check → Correct 'Agency' misconceptions if present
4. Value → Explain Assessment (Fun/Safe/Professional)
5. Soft Ask → "Would you like to schedule something?"

Remember: You are helpful, professional, and British. You are NOT a pushy salesperson.`;


export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { lead_id, message, simulate_latency, action } = body;

        if (!lead_id) {
            return NextResponse.json({ error: 'Missing lead_id' }, { status: 400 });
        }

        // --- OUTBOUND INITIATION LOGIC ---
        if (action === 'initiate') {
            console.log('[API] Initiating Outbound Conversation...');
            const { data: lead } = await supabase.from('leads').select('*').eq('id', lead_id).single();
            if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

            const leadName = lead.name || 'there';
            // Infer interest from lead_code or goal if available, default to "Modeling"
            const interest = (lead.lead_code?.includes('KIDS') || lead.lead_code?.includes('Teen')) ? 'Teen/Child' : 'Commercial/Fashion';

            // Read Pitch Template
            const fs = require('fs');
            const path = require('path');
            let pitchTemplate = "";
            try {
                const pPath = path.join(process.cwd(), 'features', 'alex_pitch_template.txt');
                if (fs.existsSync(pPath)) pitchTemplate = fs.readFileSync(pPath, 'utf8');
            } catch (e) {
                console.error('Pitch load error:', e);
                pitchTemplate = "Hi [Name], it's Alex from the studio. Saw you were interested in modeling?";
            }

            const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
            const prompt = `YOU ARE ALEX (SalesBot). 
GOAL: Initiate a conversation via SMS.
Lead Name: ${leadName}
Interest: ${interest}

PITCH TEMPLATE:
${pitchTemplate}

INSTRUCTION:
Write the FIRST SMS message to this lead.
- Adapt the template dynamically. 
- Do NOT copy it verbatim.
- Keep it under 160 chars.
- Be natural and friendly.

Message:`;

            const result = await model.generateContent(prompt);
            const openingMsg = result.response.text().trim();

            // Save Bot Message
            await supabase.from('messages').insert({
                lead_id,
                content: openingMsg,
                sender_type: 'bot'
            });

            return NextResponse.json({ response: openingMsg });
        }

        if (!message) {
            return NextResponse.json({ error: 'Missing message' }, { status: 400 });
        }

        console.log('[API] Starting Parallel Fetch...');

        // 1. Parallelize Fetching all Context
        // We import analyzeSentiment dynamically to update it based on user request (though standard import is fine too)
        const { analyzeSentiment, searchKnowledge, searchGoldStandards } = await import('@/lib/utils/ai');

        const [
            sentimentScore,
            leadResult,
            rulesResult,
            historyResult,
            knowledgeResult,
            goldResult
        ] = await Promise.all([
            // Step 0: Sentiment Analysis (Async Parallel)
            analyzeSentiment(message).catch(e => { console.error(e); return 0; }),

            // Step 1: Lead Data
            supabase.from('leads').select('*').eq('id', lead_id).single(),

            // Step 3.5: System Rules
            supabase.from('system_rules').select('rule_text, category').eq('is_active', true),

            // Step 4: Chat History
            supabase.from('messages').select('sender_type, content').eq('lead_id', lead_id).order('timestamp', { ascending: true }).limit(20),

            // Step 5: Vector Search (Knowledge)
            searchKnowledge(message, 3).catch(e => []),

            // Step 5: Gold Standards
            searchGoldStandards(message, 3).catch(e => [])
        ]);

        console.log('[API] Parallel Fetch Complete');

        // --- SENTIMENT GUARDRAIL (Blocking) ---
        if (sentimentScore < -0.5) {
            console.log('⚠️ SENTIMENT GUARDRAIL TRIGGERED');
            const humanHandoffMsg = "I feel I might not be explaining this well. Would you prefer a quick call from one of our senior team members to clear things up?";

            // Async Logging for Guardrail
            waitUntil((async () => {
                await Promise.all([
                    supabase.from('messages').insert({ lead_id, content: message, sender_type: 'lead', sentiment_score: sentimentScore }),
                    supabase.from('messages').insert({ lead_id, content: humanHandoffMsg, sender_type: 'bot' }),
                    supabase.from('leads').update({ status: 'Human_Required' }).eq('id', lead_id)
                ]);
            })());

            return NextResponse.json({ response: humanHandoffMsg });
        }

        // --- PREPARE CONTEXT ---
        const lead = leadResult.data;
        if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

        const leadName = lead.name || 'there';
        const currentStatus = lead.status || 'New';
        const contextMemory = lead.context_memory || {};

        // Rules
        let dynamicBehaviors = "";
        let dynamicConstraints = "";
        if (rulesResult.data) {
            rulesResult.data.forEach(r => {
                if (r.category === 'behavior') dynamicBehaviors += `- [DYNAMIC RULE]: ${r.rule_text}\n`;
                if (r.category === 'constraint') dynamicConstraints += `- [RESTRICTION]: ${r.rule_text}\n`;
            });
        }

        // History
        let chatHistory = "Previous conversation:\n";
        if (historyResult.data) {
            historyResult.data.forEach((msg: any) => {
                const sender = msg.sender_type === 'lead' ? 'Customer' : 'Alex (You)';
                chatHistory += `${sender}: ${msg.content}\n`;
            });
        }

        // Knowledge & Gold Standards
        let knowledgeContext = '';
        if (knowledgeResult.length > 0) {
            knowledgeContext = '\n\nRELEVANT KNOWLEDGE:\n' + knowledgeResult.map((r, i) => `${i + 1}. ${r.content.substring(0, 300)}...`).join('\n');
        }

        let goldStandardContext = '';
        if (goldResult.length > 0) {
            goldStandardContext = '\n\nGOLD STANDARD EXAMPLES:\n' + goldResult.map((r, i) => `${i + 1}. ${r.manager_correction || r.ai_response}`).join('\n');
        }

        // Extra Logic (Local Guide / Ethics)
        const locationKeywords = ['parking', 'driving', 'location', 'get there', 'directions', 'train', 'tube', 'bus'];
        const needsLocationHelp = locationKeywords.some(w => message.toLowerCase().includes(w));
        let localGuideInstruction = needsLocationHelp ?
            `SPECIAL INSTRUCTION: MENTION "I've sent a map guide. Northern Line is easiest, or Regis Road for parking!"` : "";

        // Agency/Ethics logic
        const lowerMsg = message.toLowerCase();
        let agencyCorrectionInstruction = lowerMsg.includes('agency') ?
            `CRITICAL: CORRECT THEM. WE ARE A STUDIO, NOT AN AGENCY. DO NOT PROMISE WORK.` : "";

        let ethicsContext = "";
        let guaranteeCounter = contextMemory.guarantee_asks || 0;
        const RISK_KEYWORDS = ['guarantee', 'job', 'work', 'money', 'income', 'paid', 'earnings'];

        if (RISK_KEYWORDS.some(w => lowerMsg.includes(w))) {
            guaranteeCounter++;
            if (guaranteeCounter > 2) {
                const interventionMsg = "I want to be completely transparent... it's best if a senior manager speaks with you directly.";
                waitUntil((async () => {
                    await Promise.all([
                        supabase.from('messages').insert({ lead_id, content: message, sender_type: 'lead' }),
                        supabase.from('messages').insert({ lead_id, content: interventionMsg, sender_type: 'bot' }),
                        supabase.from('leads').update({ status: 'Human_Intervention', context_memory: { ...contextMemory, guarantee_asks: guaranteeCounter } }).eq('id', lead_id)
                    ]);
                })());
                return NextResponse.json({ response: interventionMsg });
            }
            ethicsContext = `WARNING: User asked about jobs/money. STATE CLEARLY: "No guarantees. We provide the portfolio tools, not jobs."`;
        }

        // Prep/Wardrobe (File reads - let's make these non-blocking or just skipped for speed if not essential, but for now we'll keep it simple or quick read)
        // Since we are optimizing, reading from disk in Next.js serverless is fast enough, but we should cache it? 
        // For now, I will include it if keywords match, but synchronous fs read is fast. 
        // I will omit the detailed implementation of reading files here to keep the route clean, OR assume it's part of 'knowledge search' in the future. 
        // Re-adding the existing logic for safety:
        let prepContext = "";
        const wardrobeKeywords = ['wear', 'bring', 'clothes', 'outfit'];
        const safeKeywords = ['safe', 'child', 'security', 'dbs', 'guardian'];

        if (wardrobeKeywords.some(w => lowerMsg.includes(w)) || safeKeywords.some(w => lowerMsg.includes(w))) {
            // We can optimize this by loading these into constants/memory on cold start, 
            // but for now, rely on FS cache.
            const fs = require('fs');
            const path = require('path');
            try {
                if (wardrobeKeywords.some(w => lowerMsg.includes(w))) {
                    const wPath = path.join(process.cwd(), 'features', 'wardrobe_and_prep_standards.txt');
                    if (fs.existsSync(wPath)) prepContext += `\n[WARDROBE]: ${fs.readFileSync(wPath, 'utf8')}\n`;
                }
                if (safeKeywords.some(w => lowerMsg.includes(w))) {
                    const sPath = path.join(process.cwd(), 'features', 'safeguarding_policy_summary.txt');
                    if (fs.existsSync(sPath)) prepContext += `\n[SAFETY]: ${fs.readFileSync(sPath, 'utf8')}\n`;
                }
            } catch (e) { console.error(e); }
        }

        // --- GENERATE RESPONSE ---
        if (simulate_latency) {
            // Reduced latency for "Optimization" phase (1s max)
            await new Promise(r => setTimeout(r, Math.random() * 500 + 500));
        }

        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
        const prompt = `${SALES_PERSONA_PROMPT}

CUSTOM SYSTEM RULES:
${dynamicBehaviors}
${dynamicConstraints}

CUSTOMER CONTEXT:
Name: ${leadName}
Status: ${currentStatus}
Memory: ${JSON.stringify(contextMemory)}

${chatHistory}
${knowledgeContext}
${goldStandardContext}

${localGuideInstruction}
${agencyCorrectionInstruction}
${ethicsContext}
${prepContext}

Customer's Last Message: "${message}"

INSTRUCTION:
1. CHECK MEMORY: Reference goals.
2. FORMULA: Acknowledge -> Value -> Discovery Question
3. SHORT: Under 160 chars.

Respond as Alex:`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text().trim();

        // --- ASYNC BACKGROUND TASKS (Fire & Forget via waitUntil) ---
        waitUntil((async () => {
            console.log('[Background] Starting post-processing...');

            // 1. Save User Message
            const p1 = supabase.from('messages').insert({
                lead_id,
                content: message,
                sender_type: 'lead',
                sentiment_score: sentimentScore,
                sentiment_label: sentimentScore > 0.3 ? 'Positive' : (sentimentScore < -0.3 ? 'Negative' : 'Neutral')
            });

            // 2. Save Bot Message
            const p2 = supabase.from('messages').insert({
                lead_id,
                content: responseText,
                sender_type: 'bot'
            });

            // 3. Ethics Scan of Bot Response (Validation)
            const p3 = (async () => {
                const lowerResp = responseText.toLowerCase();
                const FORBIDDEN = ['guarantee', 'guaranteed', 'job', 'income', 'salary', 'promise', 'our agency'];
                const violation = FORBIDDEN.find(w => lowerResp.includes(w));
                if (violation) {
                    await supabase.from('leads').update({ review_reason: `Flagged: Used term "${violation}"` }).eq('id', lead_id);
                }
            })();

            // 4. Update Memory
            const p4 = (async () => {
                const memPrompt = `Update memory JSON based on:\nUser: "${message}"\nBot: "${responseText}"\nCurrent: ${JSON.stringify(contextMemory)}\nReturn ONE JSON object.`;
                const memRes = await model.generateContent(memPrompt);
                const jsonMatch = memRes.response.text().match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const newMem = JSON.parse(jsonMatch[0]);
                    newMem.guarantee_asks = guaranteeCounter;
                    await supabase.from('leads').update({ context_memory: newMem }).eq('id', lead_id);
                }
            })();

            // 5. Lead Scoring
            const p5 = (async () => {
                const scorePrompt = `Rate Intent (0-100) based on:\n"${message}" -> "${responseText}"\nStatus: ${currentStatus}\nReturn NUMBER only.`;
                const scoreRes = await model.generateContent(scorePrompt);
                const score = parseInt(scoreRes.response.text().replace(/\D/g, '')) || 0;
                await supabase.from('leads').update({ priority_score: score }).eq('id', lead_id);
            })();

            await Promise.all([p1, p2, p3, p4, p5]);
            console.log('[Background] Tasks complete');
        })());

        return NextResponse.json({
            success: true,
            response: responseText,
            status: currentStatus,
            analysis: {
                sentiment: sentimentScore
            }
        });

    } catch (error: any) {
        console.error('Sandbox Error:', error);
        return NextResponse.json({ detail: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
