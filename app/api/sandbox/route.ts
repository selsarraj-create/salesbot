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
// Alex Persona Prompt
// Alex Persona Prompt
const SALES_PERSONA_PROMPT = `SYSTEM INSTRUCTIONS: ALEX (BOOKER AI) — EDGE TALENT
1. ROLE & PERSONA (IMMUTABLE)

Identity: You are Alex, a professional Booker for Edge Talent.

Primary Directive: You must STICK TO THE SCRIPT "ALEXSCRIPT.PDF" for all sales logic, studio value propositions, and handling objections. If general knowledge conflicts with the PDF, the PDF wins.

Tone: Warm, confident, and professional. Balance sophisticated "professional exclusivity" with personal flattery to make the lead feel selected.

Success Metric: Secure a confirmed Headless Booking (Date/Time) in the diary within the next 21 days.

CONFLICT RESOLUTION: You will learn Tone and Phrasing from the uploaded call transcripts/dialogue, but you must strictly follow the Rules and Pricing in ALEXSCRIPT.PDF. If a transcript contradicts the Script regarding rules or money, The Script Wins.

2. ALEX’S ADAPTIVE SCRIPTING RULE

The Track: Adhere to the Qualification Gate and the flow defined in ALEXSCRIPT.PDF as your primary path.

Conversational Agency: You are granted authority to deviate from the script only to answer direct lead questions, build rapport, or create excitement about the Kentish Town studio.

The Pivot: Once a lead's question is answered and they are "warm," you must immediately pivot back to the next step in the ALEXSCRIPT.PDF flow.

3. STRICT BOUNDARIES (NON-NEGOTIABLE)

NO AGENCY STATUS: Edge Talent is a Professional Photography Studio, NOT an agency. Correct leads immediately if they mention "joining," "signing," or "representation."

NO LINKS: All booking is headless. You must collect the Date/Time manually in the chat. Do not ask them to "click a link."

NO GUARANTEES: Never promise work, income, or agency signings.

SAFEGUARDING: Minors (<18) must have a parent/guardian involved and present.

4. MANDATORY QUALIFICATION GATE (SEQUENTIAL) Process these in order as defined in your workflow. Do not skip steps.

Experience: Confirm no professional shoots in the last 6 months.

Age: Confirm 21+ (or switch to Parent flow for minors).

Financial Investment: For students/unemployed, use the ALEXSCRIPT.PDF logic to confirm they can afford the £80 image starting point (frame it as investment, not cost).

Residency: Confirm UK resident + valid passport/visa.

5. CONVERSATION FLOW

Outbound Contact: Acknowledge application, validate look, and share "good news."

Value Pitch: Explain the studio day, the 7-outfit requirement, and the value of the covered studio time/styling (referenced in ALEXSCRIPT.PDF).

Qualification: Execute the 4-step gate while building excitement.

The Close: Secure a specific Date/Time for the photoshoot.`;


export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { lead_id, message, simulate_latency, action, lead_context } = body;

        if (!lead_id) {
            return NextResponse.json({ error: 'Missing lead_id' }, { status: 400 });
        }

        // --- OUTBOUND INITIATION LOGIC ---
        if (action === 'initiate') {
            const { name, age } = lead_context || {};
            console.log('[API] Initiating Outbound Conversation...', { name, age });

            // Script Selection Logic (Headless)
            let initialMessage = "";
            if (name && age) {
                if (parseInt(age) < 18) {
                    // Child Model Script
                    initialMessage = `Hi! I was just looking over the application for ${name}. She's at a great age for the portfolios we're doing right now. I'd love to get that organized for you—what day of the week usually works best for your schedule?`;
                } else {
                    // Adult Model Script
                    initialMessage = `Hi ${name}! I've got your application here for the photoshoot. I'd love to get you in the studio—what does your schedule look like for a booking?`;
                }
            } else {
                // Fallback (Should typically happen if context missing)
                initialMessage = "Hi! I was looking over your inquiry for the photoshoot. I'd love to get that booked in for you—did you have a specific day in mind?";
            }

            console.log('[API] Script selected:', initialMessage.substring(0, 20) + '...');

            console.log('[API] Fetching lead...', lead_id);
            const { data: lead, error: leadError } = await supabase.from('leads').select('*').eq('id', lead_id).single();

            if (leadError) {
                console.error('[API] Lead Fetch Error:', leadError);
                return NextResponse.json({ error: leadError.message }, { status: 500 });
            }
            if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
            console.log('[API] Lead found:', lead.id);

            // Save Initial Bot Message
            console.log('[API] Saving initial message...');
            const { error: msgError } = await supabase.from('messages').insert({
                lead_id,
                content: initialMessage,
                sender_type: 'bot'
            });

            if (msgError) {
                console.error('[API] Message Insert Error:', msgError);
                return NextResponse.json({ error: msgError.message }, { status: 500 });
            }
            console.log('[API] Message saved. Returning response.');

            return NextResponse.json({
                response: initialMessage,
                status: 'Initiated'
            });
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
        // Context Injection logic
        const { name: contextName, age: contextAge } = lead.lead_metadata || {};
        const knownContext = [];
        if (lead.name || contextName) knownContext.push(`Name: ${lead.name || contextName} (COMPLETED)`);
        if (contextAge) knownContext.push(`Age: ${contextAge} (COMPLETED)`);

        const contextString = knownContext.length > 0
            ? `\nKNOWN DATA (DO NOT ASK):\n- ${knownContext.join('\n- ')}\n`
            : "";

        const finalPrompt = `
${SALES_PERSONA_PROMPT}

CUSTOMER CONTEXT:
Name: ${leadName}
Status: ${currentStatus}
Interest: ${lead.lead_code?.includes('KIDS') ? 'Child Modeling' : 'Commercial Modeling'}
${contextString}

${dynamicBehaviors}
${dynamicConstraints}

${localGuideInstruction}
${agencyCorrectionInstruction}
${ethicsContext}

${knowledgeContext}
${goldStandardContext}
${prepContext}

CHAT HISTORY:
${chatHistory}

INSTRUCTION:
Generate the next response.
1. FIRST, formulate a "Thought Process" (internal monologue).
   - WRAP THIS IN DELIMITERS: [[[THOUGHT]]] ... [[[END_THOUGHT]]]
   - CHECK: Do I already have the Name/Age? If YES, skip to Date/Time.
   - CRITICAL: If the user asked a question (e.g. location, price), ANSWER IT FIRST before pivoting.
2. THEN, write the response string (the SMS sent to the user).
3. Strict 2-sentence limit for SMS.

Respond as Alex:`;

        const result = await model.generateContent(finalPrompt);
        let responseText = result.response.text();

        // **SAFEGUARD: Extract pure response if Thinking/Thoughts are included**
        const thoughtBlockRegex = /\[\[\[THOUGHT\]\]\]([\s\S]*?)\[\[\[END_THOUGHT\]\]\]/;
        const thoughtMatch = responseText.match(thoughtBlockRegex);
        let thoughtContent = "";

        // BETTER: Retrieve thought from candidate metadata if available (Official Gemini 2.0 way)
        // @ts-ignore 
        if (result.response.candidates?.[0]?.content?.parts?.[0]?.thought) {
            // @ts-ignore
            thoughtContent = result.response.candidates[0].content.parts[0].thought;
        }

        // Clean responseText if thought was matched in text (Delimiter Fallback)
        if (thoughtMatch) {
            // Capture group 1 is the inner content
            thoughtContent = thoughtContent || thoughtMatch[1].trim();
            responseText = responseText.replace(thoughtMatch[0], "").trim();
        } else {
            // Fallback for legacy/loose "Thoughts:" format if delimiters missed (safety net)
            const looseMatch = responseText.match(/Thoughts?:[\s\S]*?\n\n/i);
            if (looseMatch && !thoughtContent) {
                responseText = responseText.replace(looseMatch[0], "").trim();
                thoughtContent = looseMatch[0].trim();
            }
        }

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

            // 2. Save Bot Message (Include thought_content if enabled)
            const p2 = supabase.from('messages').insert({
                lead_id,
                content: responseText.trim(),
                sender_type: 'bot',
                thought_content: thoughtContent || null // Save if present
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
                const memPrompt = `Update memory JSON based on: \nUser: "${message}"\nBot: "${responseText}"\nCurrent: ${JSON.stringify(contextMemory)} \nReturn ONE JSON object.`;
                const memRes = await model.generateContent(memPrompt);

                // ROBUST JSON PARSING
                const jsonMatch = memRes.response.text().match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    try {
                        const newMem = JSON.parse(jsonMatch[0]);
                        newMem.guarantee_asks = guaranteeCounter;
                        await supabase.from('leads').update({ context_memory: newMem }).eq('id', lead_id);
                    } catch (e) {
                        console.error('[Memory Update] JSON Parse Error:', e);
                    }
                }
            })();

            // 5. Lead Scoring
            const p5 = (async () => {
                const scorePrompt = `Rate Intent(0 - 100) based on: \n"${message}" -> "${responseText}"\nStatus: ${currentStatus} \nReturn NUMBER only.`;
                const scoreRes = await model.generateContent(scorePrompt);
                const scoreText = scoreRes.response.text().replace(/\D/g, ''); // Strip non-digits
                const score = parseInt(scoreText) || 0;
                await supabase.from('leads').update({ priority_score: score }).eq('id', lead_id);
            })();

            await Promise.all([p1, p2, p3, p4, p5]);
            console.log('[Background] Tasks complete');
        })());

        return NextResponse.json({
            success: true,
            response: responseText.trim(),
            status: currentStatus,
            analysis: {
                sentiment: sentimentScore
            },
            thought: thoughtContent
        });

    } catch (error: any) {
        console.error('Sandbox Error:', error);
        return NextResponse.json({ detail: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
