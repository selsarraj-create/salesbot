import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

// Initialize Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Alex Persona Prompt - Consultative Approach (2026)
// Alex Persona Prompt - Trusted Studio Advisor (2026)
const SALES_PERSONA_PROMPT = `You are 'Alex', the Senior Booking Manager at London Photography Studio.

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
        console.log('Sandbox Request:', body);

        const { lead_id, message, simulate_latency } = body;

        if (!lead_id || !message) {
            return NextResponse.json({ error: 'Missing lead_id or message' }, { status: 400 });
        }

        // 0. Analyze Sentiment & Check Guardrails
        console.log('Step 0: Analyzing sentiment...');
        let sentimentScore = 0;
        try {
            const { analyzeSentiment } = await import('@/lib/utils/ai');
            sentimentScore = await analyzeSentiment(message);
            console.log('Step 0: User Sentiment:', sentimentScore);

            // SENTIMENT GUARDRAIL: If < -0.5, trigger Human Callback
            if (sentimentScore < -0.5) {
                console.log('⚠️ SENTIMENT GUARDRAIL TRIGGERED');
                const humanHandoffMsg = "I feel I might not be explaining this well. Would you prefer a quick call from one of our senior team members to clear things up?";

                // Save bot response
                await supabase.from('messages').insert({
                    lead_id: lead_id,
                    content: humanHandoffMsg,
                    sender_type: 'bot'
                });

                await supabase.from('leads').update({ status: 'Human_Required' }).eq('id', lead_id);

                return NextResponse.json({ response: humanHandoffMsg });
            }
        } catch (e) {
            console.error('Sentiment check failed', e);
        }

        // 1. Get Lead Details
        console.log('Step 1: Fetching lead...');
        const { data: lead, error: leadError } = await supabase
            .from('leads')
            .select('*')
            .eq('id', lead_id)
            .single();

        if (leadError || !lead) {
            console.error('Lead fetch error:', leadError);
            return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
        }
        console.log('Step 1: Lead fetched successfully');

        const leadName = lead.name || 'there';
        const currentStatus = lead.status || 'New';
        const contextMemory = lead.context_memory || {};
        console.log('Step 1: Context Memory:', contextMemory);

        // 2. Save User Message
        console.log('Step 2: Saving user message...');
        let sentimentLabel = 'Neutral';
        if (sentimentScore > 0.3) sentimentLabel = 'Positive';
        else if (sentimentScore < -0.3) sentimentLabel = 'Negative';

        const { error: msgError } = await supabase
            .from('messages')
            .insert({
                lead_id: lead_id,
                content: message,
                sender_type: 'lead',
                sentiment_score: sentimentScore,
                sentiment_label: sentimentLabel
            });

        if (msgError) console.error('Error saving user message:', msgError);
        else console.log('Step 2: User message saved');

        // 3. Simulate Latency
        if (simulate_latency) {
            console.log('Step 3: Simulating latency...');
            const delay = Math.floor(Math.random() * (3000 - 1000 + 1) + 1000); // 1-3 seconds
            await new Promise(resolve => setTimeout(resolve, delay));
            console.log('Step 3: Latency done');
        }

        // 4. Get Chat History
        console.log('Step 4: Fetching history...');
        const { data: history } = await supabase
            .from('messages')
            .select('sender_type, content')
            .eq('lead_id', lead_id)
            .order('timestamp', { ascending: true })
            .limit(20);
        console.log(`Step 4: History fetched (${history?.length || 0} msgs)`);

        // Format history for Gemini
        let chatHistory = "Previous conversation:\n";
        if (history) {
            history.forEach((msg: any) => {
                const sender = msg.sender_type === 'lead' ? 'Customer' : 'Alex (You)';
                chatHistory += `${sender}: ${msg.content}\n`;
            });
        }

        // 5. Search Knowledge Base & Gold Standards
        console.log('Step 5: Searching knowledge base...');
        let knowledgeContext = '';
        let goldStandardContext = '';

        try {
            const { searchKnowledge, searchGoldStandards } = await import('@/lib/utils/ai');

            // Search uploaded knowledge (audio transcripts, documents)
            const knowledgeResults = await searchKnowledge(message, 3);
            if (knowledgeResults.length > 0) {
                knowledgeContext = '\n\nRELEVANT KNOWLEDGE FROM TRAINING MATERIALS:\n';
                knowledgeResults.forEach((result: any, idx: number) => {
                    knowledgeContext += `\n${idx + 1}. ${result.content.substring(0, 300)}...\n`;
                });
                console.log(`Step 5: Found ${knowledgeResults.length} knowledge matches`);
            }

            // Search Gold Standard examples
            const goldResults = await searchGoldStandards(message, 3);
            if (goldResults.length > 0) {
                goldStandardContext = '\n\nGOLD STANDARD EXAMPLES (proven successful responses):\n';
                goldResults.forEach((result: any, idx: number) => {
                    const response = result.manager_correction || result.ai_response;
                    goldStandardContext += `\n${idx + 1}. ${response}\n`;
                });
                console.log(`Step 5: Found ${goldResults.length} Gold Standard matches`);
            }
        } catch (error) {
            console.error('Step 5: Vector search failed:', error);
        }

        // Detect Local Guide Keywords
        const locationKeywords = ['parking', 'driving', 'location', 'get there', 'directions', 'train', 'tube', 'bus'];
        const needsLocationHelp = locationKeywords.some(w => message.toLowerCase().includes(w));

        let localGuideInstruction = "";
        if (needsLocationHelp) {
            localGuideInstruction = `
SPECIAL INSTRUCTION - LOCAL GUIDE TRIGGERED:
The user is asking about location/travel.
1. MENTION: "I've just sent over a quick guide on the best ways to get to our Kentish Town studio. Most people find the Northern Line easiest, but if you're driving, definitely check out Regis Road for parking!"
2. LANDMARKS: Mention "The O2 Forum" or "Kentish Town Station" to orient them.
3. BE HELPFUL: Do not push for booking in this specific response. Focus on helping them arrive stress-free.`;
        }

        // --- ETHICS & COMPLIANCE LOGIC (STRICT) ---
        const lowerMsg = message.toLowerCase();

        // 1. AGENCY AUTO-CORRECTION
        let agencyCorrectionInstruction = "";
        if (lowerMsg.includes('agency')) {
            agencyCorrectionInstruction = `
CRITICAL INSTRUCTION - AGENCY CORRECTION REQUIRED:
The user referred to us as an 'agency'. 
YOU MUST CORRECT THIS IMMEDIATELY in a polite, professional way.
Script: "Just to be clear, we are a professional photography studio, not an agency. We don't find work for you, but we create the industry-standard portfolio you need to apply to agencies yourself."
DO NOT proceed with booking until you have made this distinction clear.`;
        }

        // 2. HIGH-RISK KEYWORDS & GUARANTEE TRACKING
        const RISK_KEYWORDS = ['guarantee', 'job', 'work', 'money', 'income', 'paid', 'earnings'];
        const isRiskMsg = RISK_KEYWORDS.some(w => lowerMsg.includes(w));

        let ethicsContext = "";
        let guaranteeCounter = contextMemory.guarantee_asks || 0;

        if (isRiskMsg) {
            // Increment counter
            guaranteeCounter++;

            // 3. HUMAN ALERT TRIGGER (If > 2 asks)
            if (guaranteeCounter > 2) {
                console.log('⚠️ ETHICS TRIGGER: Persistent Guarantee Asks. STOPPING BOT.');
                const interventionMsg = "I want to be completely transparent with you. Since you've asked about guaranteed work multiple times, I think it's best if a senior manager speaks with you directly to explain exactly how the industry works. I've flagged this for them to give you a call.";

                await supabase.from('messages').insert({
                    lead_id: lead_id, content: interventionMsg, sender_type: 'bot'
                });
                await supabase.from('leads').update({ status: 'Human_Intervention', context_memory: { ...contextMemory, guarantee_asks: guaranteeCounter } }).eq('id', lead_id);

                return NextResponse.json({ response: interventionMsg });
            }

            // Otherwise, inject Ethics Guidelines
            ethicsContext = `
WARNING - HIGH RISK TOPIC DETECTED:
The user is asking about guarantees, jobs, or money.
REFER TO ETHICS GUIDELINES:
- "No legitimate company can guarantee work."
- "We provide the TOOLS (photos), not the JOBS."
- "Success depends on market demand."
You must be transparent. DO NOT promise success.`;
        }

        // --- NEW CONTEXT INJECTION (Wardrobe/Safeguarding) ---
        let prepContext = "";
        const wardrobeKeywords = ['wear', 'bring', 'clothes', 'outfit', 'jeans', 'shirt', 'dress'];
        const safeKeywords = ['safe', 'child', 'security', 'dbs', 'guardian', 'parent', 'scam', 'background'];

        if (wardrobeKeywords.some(w => lowerMsg.includes(w))) {
            const fs = require('fs');
            const path = require('path');
            const wPath = path.join(process.cwd(), 'features', 'wardrobe_and_prep_standards.txt');
            if (fs.existsSync(wPath)) {
                prepContext += `\n\n[USER ASKED ABOUT WARDROBE. USE THIS KNOWLEDGE]:\n${fs.readFileSync(wPath, 'utf8')}\n`;
            }
        }

        if (safeKeywords.some(w => lowerMsg.includes(w))) {
            const fs = require('fs');
            const path = require('path');
            const sPath = path.join(process.cwd(), 'features', 'safeguarding_policy_summary.txt');
            if (fs.existsSync(sPath)) {
                prepContext += `\n\n[USER ASKED ABOUT SAFETY. USE THIS KNOWLEDGE]:\n${fs.readFileSync(sPath, 'utf8')}\n`;
            }
        }
        // -----------------------------------------------------

        // Update memory with new counter (will be saved after generation)
        contextMemory.guarantee_asks = guaranteeCounter;
        // ------------------------------------------

        // 6. Generate Response with Gemini
        console.log('Step 6: Calling Gemini (gemini-3-flash-preview)...');
        try {
            const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

            const prompt = `${SALES_PERSONA_PROMPT}

CUSTOMER CONTEXT:
Name: ${leadName}
Status: ${currentStatus}
Memory (Concerns/Goals): ${JSON.stringify(contextMemory)}

${chatHistory}
${knowledgeContext}
${goldStandardContext}

${localGuideInstruction}
${agencyCorrectionInstruction}
${ethicsContext}
${prepContext}

Customer's Last Message: "${message}"

INSTRUCTION:
1. CHECK MEMORY: Reference their specific goals/concerns if relevant.
2. FORMULA: Use [Acknowledge] -> [Value Statement] -> [Discovery Question]
3. SHORT: Keep response under 160 chars.

Respond as Alex:`;

            const result = await model.generateContent(prompt);
            const responseText = result.response.text().trim();
            console.log('Step 5: Gemini response received');

            // 6. ETHICS GUARDRAIL: Forbidden Words Scan
            const FORBIDDEN_WORDS = ['guarantee', 'guaranteed', 'job', 'income', 'salary', 'promise'];
            const FORBIDDEN_PHRASES = ['our agency', 'we are an agency', 'join the agency', 'signed to the agency'];

            const lowerResponse = responseText.toLowerCase();

            let foundViolation = FORBIDDEN_WORDS.find(word => lowerResponse.includes(word));

            if (!foundViolation) {
                foundViolation = FORBIDDEN_PHRASES.find(phrase => lowerResponse.includes(phrase));
            }

            if (foundViolation) {
                console.warn(`⚠️ ETHICS VIOLATION: Bot used forbidden term '${foundViolation}'`);
                // Flag the lead for review
                await supabase
                    .from('leads')
                    .update({
                        review_reason: `Flagged: Used forbidden term "${foundViolation}" in conversation.`
                    })
                    .eq('id', lead_id);
            }
            // 7. Update Context Memory (Async)
            try {
                const memoryPrompt = `Analyze this conversation turn.
User: "${message}"
Bot: "${responseText}"
Current Memory: ${JSON.stringify(contextMemory)}

Update the memory with any new specific goals (e.g. "fashion model"), concerns (e.g. "student", "cost"), or key facts.
Return ONLY the updated JSON memory object.`;

                const memoryResult = await model.generateContent(memoryPrompt);
                const newMemoryText = memoryResult.response.text();
                // Extract JSON
                const jsonMatch = newMemoryText.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const newMemory = JSON.parse(jsonMatch[0]);
                    newMemory.guarantee_asks = contextMemory.guarantee_asks; // Persist guarantee counter
                    await supabase.from('leads').update({ context_memory: newMemory }).eq('id', lead_id);
                    console.log('Step 7: Memory updated:', newMemory);
                }
            } catch (memSafeError) {
                console.error('Memory update failed (non-fatal):', memSafeError);
            }

            // 8. Save Bot Response
            console.log('Step 8: Saving bot response...');
            const { error: botMsgError } = await supabase
                .from('messages')
                .insert({
                    lead_id: lead_id,
                    content: responseText,
                    sender_type: 'bot'
                });

            if (botMsgError) console.error('Error saving bot message:', botMsgError);
            else console.log('Step 8: Bot response saved');

            // 9. Predictive Lead Scoring (Async)
            try {
                const scorePrompt = `Analyze the lead's "Intent to Book" based on this conversation.
Lead: "${message}"
Bot: "${responseText}"
Current Status: ${currentStatus}

Rate their intent from 0 to 100.
0 = Hostile/Not interested
50 = Neutral/Questioning
100 = Ready to book instantly

Return ONLY the number.`;

                const scoreResult = await model.generateContent(scorePrompt);
                const scoreText = scoreResult.response.text().trim();
                const priorityScore = parseInt(scoreText.replace(/\D/g, '')) || 0;

                console.log('Step 9: Priority Score:', priorityScore);

                await supabase.from('leads').update({ priority_score: priorityScore }).eq('id', lead_id);
            } catch (scoreError) {
                console.error('Lead scoring failed:', scoreError);
            }

            return NextResponse.json({
                success: true,
                response: responseText,
                status: currentStatus,
                analysis: {}
            });
        } catch (geminiError: any) {
            console.error('Gemini Generation Error:', geminiError);
            // Return 500 so client sees error
            return NextResponse.json({ detail: geminiError.message || 'Gemini Generation Error' }, { status: 500 });
        }

    } catch (error: any) {
        console.error('Sandbox Error:', error);
        return NextResponse.json({ detail: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
