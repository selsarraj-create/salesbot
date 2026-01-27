import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { gradeConversation } from '@/lib/intelligence/judge';

// Initialize Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Alex Persona Prompt
const SALES_PERSONA_PROMPT = `YOU ARE SALESBOT, THE SENIOR BOOKING ASSISTANT FOR A PROFESSIONAL PHOTOGRAPHY STUDIO IN KENTISH TOWN.

## MASTER RULES & GLOBAL DIRECTIVES (PRIORITY 1)

1. ROLE & IDENTITY: You are a Senior Studio Manager at a professional London photography studio. You are NOT an AI assistant, a salesperson, or a model agent.
2. TONE ARCHITECTURE: Maintain professional authority.
   NEVER use: "Hey", "Wanna", "Gonna", "Got some", "Quick chat", or "Good news".
   ALWAYS use: "Hello (or Hi [Name])", "Do you have", "I would like to", "Assessment", and "Studio".
3. ASSET ADHERENCE: You must treat the 'Sales Script' and 'Studio Prep' assets as the source of truth. Use their logic and value points without summarizing them into casual slang.
4. COMPLIANCE BOUNDARIES:
   > - Never promise work or guarantee representation.
   > - Never refer to the studio as an "Agency."

5. ESCALATION GUARDRAILS (STRICT):
   - NO PREMATURE DEFERENCE: Never use phrases like "I might not be explaining this well" or "I'm sorry if this is confusing."
   - REASONING OVER ESCALATION: If a lead asks a complex question, you MUST perform a "Deep Search" of the Asset Lab and provide a structured, factual answer first.
   - THE 2-TRY RULE: You are forbidden from offering a human call until you have attempted to answer the specific question at least twice.
   - MANDATORY PIVOT: If you truly cannot find an answer in the assets, do not apologize. Instead, say: "That's a specific detail I want to get 100% right for you. I'll have a senior team member confirm that, but in the meantime, did you have any questions about the [Related Topic from Script]?"

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

            // Fetch Config for Outbound too? Ideally yes, but let's keep it simple or default for now.
            // Or better, do a quick fetch
            let outboundConfig = { temperature: 0.3, top_p: 0.8, frequency_penalty: 0.5 };
            const { data: dbConfig } = await supabase.from('ai_config').select('*').single();
            if (dbConfig) outboundConfig = {
                temperature: dbConfig.temperature,
                top_p: dbConfig.top_p,
                frequency_penalty: dbConfig.frequency_penalty
            };

            const model = genAI.getGenerativeModel({
                model: "gemini-2.5-flash",
                generationConfig: {
                    temperature: outboundConfig.temperature,
                    maxOutputTokens: 8192,
                    topP: outboundConfig.top_p,
                    // Thinking explicitly DISABLED for outbound speed
                }
            });
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
            goldResult,
            configResult // Step 6: AI Config
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
            searchGoldStandards(message, 3).catch(e => []),

            // Step 6: AI Config
            supabase.from('ai_config').select('*').single()
        ]);

        // Default Config (fallback)
        const aiConfig = configResult.data || {
            temperature: 0.3,
            top_p: 0.95,
            frequency_penalty: 0.5,
            full_context_mode: true
        };

        console.log('[API] Parallel Fetch Complete. AI Config:', aiConfig);

        // --- SENTIMENT GUARDRAIL (Blocking) ---
        if (sentimentScore < -0.5) {
            console.log('⚠️ SENTIMENT GUARDRAIL TRIGGERED');
            const humanHandoffMsg = "I want to ensure we address your concerns accurately. Would you prefer a quick call from one of our senior team members?";

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

        // --- ASSET LAB INJECTION (DYNAMIC MODE) ---
        let prepContext = "";
        const fs = require('fs');
        const path = require('path');
        const featuresDir = path.join(process.cwd(), 'features');

        if (aiConfig.full_context_mode) {
            try {
                // 1. Wardrobe & Prep
                const wPath = path.join(featuresDir, 'wardrobe_and_prep_standards.txt');
                if (fs.existsSync(wPath)) prepContext += `\n[WARDROBE & PREP]:\n${fs.readFileSync(wPath, 'utf8')}\n`;

                // 2. Safeguarding
                const sPath = path.join(featuresDir, 'safeguarding_policy_summary.txt');
                if (fs.existsSync(sPath)) prepContext += `\n[SAFEGUARDING POLICY]:\n${fs.readFileSync(sPath, 'utf8')}\n`;

                // 3. Ethics (New)
                const ePath = path.join(featuresDir, 'ethics_and_compliance.txt');
                if (fs.existsSync(ePath)) prepContext += `\n[ETHICS & COMPLIANCE]:\n${fs.readFileSync(ePath, 'utf8')}\n`;
            } catch (e) {
                console.error('Asset Lab Load Error:', e);
            }
        } else {
            // OPTIMIZED MODE (Keyword Based) - "Cached"
            // Only load if keywords match
            try {
                const wardrobeKeywords = ['wear', 'bring', 'clothes', 'outfit'];
                const safeKeywords = ['safe', 'child', 'security', 'dbs', 'guardian'];

                if (wardrobeKeywords.some(w => lowerMsg.includes(w))) {
                    const wPath = path.join(featuresDir, 'wardrobe_and_prep_standards.txt');
                    if (fs.existsSync(wPath)) prepContext += `\n[WARDROBE]: ${fs.readFileSync(wPath, 'utf8')}\n`;
                }
                if (safeKeywords.some(w => lowerMsg.includes(w))) {
                    const sPath = path.join(featuresDir, 'safeguarding_policy_summary.txt');
                    if (fs.existsSync(sPath)) prepContext += `\n[SAFETY]: ${fs.readFileSync(sPath, 'utf8')}\n`;
                }
            } catch (e) { console.error('Optimized Load Error', e); }
        }

        // --- GENERATE RESPONSE ---
        if (simulate_latency) {
            // Reduced latency for "Optimization" phase (1s max)
            await new Promise(r => setTimeout(r, Math.random() * 500 + 500));
        }

        // --- ADAPTIVE THINKING LOGIC (Gemini 2.5 Flash) ---
        // We only enable "Thinking" when the user initiates a complex objection or risk scenario.
        // Otherwise, we keep it FAST (Thinking OFF).

        const OBJECTION_KEYWORDS = ['price', 'cost', 'expensive', 'afford', 'scam', 'legit', 'real', 'reviews', 'unsure', 'maybe', 'think about it'];
        const isObjection = sentimentScore < -0.3 || OBJECTION_KEYWORDS.some(w => lowerMsg.includes(w));

        // Define Thinking Config
        let thinkingConfig = undefined;

        if (aiConfig.show_thoughts) {
            // Priority 1: Manual Override
            // CLAMP BUDGET: 0 - 24576
            const rawBudget = aiConfig.thinking_budget || 2048;
            const validBudget = Math.max(0, Math.min(24576, rawBudget));

            thinkingConfig = {
                include_thoughts: true,
                thinking_budget: validBudget
            };
            console.log(`🧠 THINKING: FORCED ON (Budget: ${validBudget})`);
        } else if (isObjection) {
            // Priority 2: Adaptive Fallback
            thinkingConfig = {
                include_thoughts: true,
                thinking_budget: 2048
            };
            console.log('🧠 ADAPTIVE THINKING: ENABLED (Objection Detected)');
        }

        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            generationConfig: {
                temperature: aiConfig.temperature,
                maxOutputTokens: 8192, // Increased to 8k for extensive thinking + response
                topP: aiConfig.top_p,
                // @ts-ignore
                thinking_config: thinkingConfig
            } as any
        });
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

        // --- POST-GENERATION CHECKS ---
        // 1. Check for Graceful Exit Phrase
        const EXIT_PHRASE_SNIPPET = "email you the details so you have them in writing";
        if (responseText.includes(EXIT_PHRASE_SNIPPET)) {
            console.log('🛑 GRACEFUL EXIT TRIGGERED. Stopping Lead.');
            waitUntil((async () => {
                await supabase.from('leads').update({ status: 'Stopped' }).eq('id', lead_id);
            })());
        }

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
            // (Existing logic...)

            // 4. AUTO-JUDGING (Quality Control)
            // Fetch updated chat history for grading
            const { data: updatedHistory } = await supabase
                .from('messages')
                .select('*')
                .eq('lead_id', lead_id)
                .order('timestamp', { ascending: true });

            if (updatedHistory && updatedHistory.length >= 2) {
                await gradeConversation(updatedHistory, 'Live Sandbox', lead_id);
            }
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
