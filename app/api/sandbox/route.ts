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

Apply Rigid Sequential Execution for ALEXSCRIPT.pdf.

1. Forced Opener (Stage 1): You are strictly forbidden from writing a custom greeting. You must use the exact text from the PDF: 'Hi [Name], I'm Alex from Edge Talent in London. Just getting in touch regarding your recent model application. I've got some good news for you!'

2. The Sequential Gate System: You must move through these stages in order. Do not skip ahead to booking until all qualification questions are answered.

Stage 1: The Hook. Use the 'perfect fit for commercial modelling' pitch from Page 1.

Stage 2: Connection. Ask about their previous experience and what they do for work/study.

Stage 3: The 4-Point Qualification (MANDATORY). You must ask these exactly as written on Page 3:

'Have you ever done a professional test shoot before?'

'I see you are [Age] from your application—is that correct?' (Verify the lead data).

'Are you currently in employment or a student? (This is to see if you can manage the side-hustle investment if successful).'

'Are you a UK resident?'

Stage 4: Education. Explain the 3-5 different outfits and the professional studio environment (Page 4-5).

Stage 5: Headless Close. Instead of sending the link on Page 7, say: 'I'm about to forward your details to the studio team. What day this week or weekend works best for you to come in for that shoot?'

3. Handling Resistance: If a lead objects (Location, 'Didn't apply', etc.), you must use the 'Handling Rejection' scripts on Page 1 and Page 6 word-for-word. After addressing the objection, you must attempt to return to the last uncompleted Stage.

4. Memory & Accuracy: Use your Thinking Budget to check off which stage you are currently in. Do not provide information about outfits until Stage 4 is reached.

STRUCTURED AI PROTOCOL (STATE MACHINE ENFORCEMENT):

1. Strict Sequential Gating: You are now a state machine. You are strictly forbidden from proceeding to a new Stage until you receive a user response for the current Stage.

2. The [WAIT] Command: For every section marked [WAIT FOR USER RESPONSE], you must terminate your turn and wait for the lead to reply. You must NEVER combine Stage 1 and Stage 2 in the same outbound message. Each stage requires a separate user response.

3. Token Usage Logic: Use the Thinking Budget to identify the current 'Stage' (1 through 6). If the lead asks a question, answer it using the Asset Lab, then explicitly state: 'Returning to Stage [X]' in your thoughts and re-ask the last pending qualification question.

4. One Stage Per Turn: You must only advance ONE stage per message. After completing a stage's action (asking a question, making a pitch, etc.), you MUST stop and wait for user input before proceeding.

INTERRUPTION & PIVOT PROTOCOL (HIGHEST PRIORITY):
Listen First: Before generating any script line, check the user's latest message for a Question (e.g., 'Cost?', 'Where is it?', 'Do I need makeup?').
Answer First: If a question is detected, you MUST answer it directly and succinctly. Suspend the script to address their concern.
Pivot Second: Only after the answer is given, pivot back to the qualification flow (e.g., '...The investment is typically £X. To ensure we tailor this...').`;


export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { lead_id, message, simulate_latency, action, lead_context, skip_user_insert } = body;

        if (!lead_id) {
            return NextResponse.json({ error: 'Missing lead_id' }, { status: 400 });
        }

        // --- OUTBOUND INITIATION LOGIC ---
        if (action === 'initiate') {
            const { name, age } = lead_context || {};
            console.log('[API] Initiating Outbound Conversation...', { name, age });

            // Dynamic AI Opener Generation (System Wake-Up Event)
            const openerPrompt = `
${SALES_PERSONA_PROMPT}

SYSTEM EVENT:
Role: System
Content: "New Lead Connected: ${name || 'Lead'}, Age ${age || 'Unknown'}. The user has not spoken yet. You must initiate the conversation now using the 'Good News' opening from ALEXSCRIPT.PDF."

INSTRUCTION:
Generate the opening SMS now.`;

            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            const result = await model.generateContent(openerPrompt);
            const initialMessage = result.response.text().trim();

            console.log('[API] AI Generated Opener:', initialMessage);

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
            supabase.from('messages').select('id, sender_type, content').eq('lead_id', lead_id).order('timestamp', { ascending: true }).limit(50),

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

        // --- DEMENTIA FIX (Context Injection) ---
        // Ensure the CURRENT user message is in the history, even if DB insert is pending.
        const userMsgPreview = `Customer: ${message.trim()}`;
        if (!chatHistory.includes(message.trim())) {
            console.log('[API] Injecting pending user message into context...');
            chatHistory += `${userMsgPreview}\n`;
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
2. THEN, write the Final SMS Response.
   - WRAP THIS IN DELIMITERS: [[[RESPONSE]]] ... [[[END_RESPONSE]]]
   - Strict 2-sentence limit for SMS.

Respond as Alex:`;

        // Race Condition Check (1) - Pre-Generation
        const initialMsgCount = historyResult.data ? historyResult.data.length : 0;

        const result = await model.generateContent(finalPrompt);

        // Race Condition Check (2) - Post-Generation
        // If the user sent a message while we were thinking, our context is stale.
        // We should ABORT and let the *new* request (triggered by the user's new message) handle it.
        const { count: currentMsgCount } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('lead_id', lead_id);

        // Check if we received a new USER message (Total count increased)
        // Note: We use >= because we might have just inserted the user's message in this request, 
        // but if *another* one came in, count would be even higher.
        // Actually, safest is: Fetch the LATEST message. If it's from 'lead' and NOT the one we just processed...
        // Simplified: If count changed significantly, bail.
        // Better: client provided `message` (User's input). We inserted it (or client did).
        // If DB has MORE messages than (initialMsgCount + 1), then user double-texted.

        if (currentMsgCount !== null && currentMsgCount > (initialMsgCount + 1)) {
            console.log(`🛑 INTERRUPT DETECTED: Msg Count moved from ${initialMsgCount} to ${currentMsgCount}. Aborting old response.`);
            return NextResponse.json({ status: 'Interrupted', response: null });
        }

        let responseText = result.response.text();

        // **SAFEGUARD: Extract pure response if Thinking/Thoughts are included**
        const thoughtRegex = /\[\[\[THOUGHT\]\]\]([\s\S]*?)\[\[\[END_THOUGHT\]\]\]/i;
        const responseRegex = /\[\[\[RESPONSE\]\]\]([\s\S]*?)\[\[\[END_RESPONSE\]\]\]/i;

        const thoughtMatch = responseText.match(thoughtRegex);
        const responseMatch = responseText.match(responseRegex);

        let thoughtContent = "";

        // 1. Extract Thought
        // @ts-ignore hiding official property check for brevity
        if (result.response.candidates?.[0]?.content?.parts?.[0]?.thought) {
            // @ts-ignore
            thoughtContent = result.response.candidates[0].content.parts[0].thought;
            console.log('[API] Native Thought Content Found:', thoughtContent, typeof thoughtContent);
        } else if (thoughtMatch) {
            thoughtContent = thoughtMatch[1].trim();
            console.log('[API] Regex Thought Content Found:', thoughtContent.substring(0, 50));
        }

        // 2. Extract Response (Prioritize Explicit Tags)
        if (responseMatch) {
            responseText = responseMatch[1].trim();
        } else if (thoughtMatch) {
            // Fallback: If no response tags, take everything AFTER the thought block
            // This handles cases where model forgets [[[RESPONSE]]] tags but faithfully used [[[THOUGHT]]]
            const textAfterThought = responseText.split(thoughtMatch[0])[1];
            if (textAfterThought && textAfterThought.trim().length > 0) {
                responseText = textAfterThought.trim();
            } else {
                // Fatal: Model outputted thoughts but NO response text
                console.warn('Model outputted thoughts but no response text.');
                // responseText = "..."; // Let it fall through, might be legacy format
            }
        }

        // 3. Last Result Fallback (Legacy/Loose "Thoughts:" format)
        if (!responseMatch && !thoughtMatch) {
            const looseMatch = responseText.match(/Thoughts?:[\s\S]*?\n\n/i);
            if (looseMatch) {
                thoughtContent = looseMatch[0].trim();
                responseText = responseText.replace(looseMatch[0], "").trim();
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

            // 1. Save User Message (Unless handled by client)
            const p1 = !skip_user_insert ? supabase.from('messages').insert({
                lead_id,
                content: message,
                sender_type: 'lead',
                sentiment_score: sentimentScore,
                sentiment_label: sentimentScore > 0.3 ? 'Positive' : (sentimentScore < -0.3 ? 'Negative' : 'Neutral')
            }) : Promise.resolve();

            // 2. Save Bot Message (Include thought_content if enabled)
            const p2 = supabase.from('messages').insert({
                lead_id,
                content: responseText.trim(),
                sender_type: 'bot',
                thought_content: thoughtContent || null // Save if present
            });

            // 3. Ethics Scan of Bot Response (Validation)
            // (Existing logic...)

            // --- INSTANTIATE FAST MODEL (NO THINKING) FOR UTILITY TASKS ---
            const fastModel = genAI.getGenerativeModel({
                model: "gemini-2.5-flash",
                generationConfig: {
                    temperature: 0.1, // Low temp for deterministic JSON/Scoring
                    topP: 0.95,
                    maxOutputTokens: 1024
                }
            });

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
                const memRes = await fastModel.generateContent(memPrompt); // Use fastModel

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
                const scoreRes = await fastModel.generateContent(scorePrompt); // Use fastModel
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
