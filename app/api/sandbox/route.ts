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
const SALES_PERSONA_PROMPT = `You are 'Alex', the Senior Booking Manager at London Photography Studio in London.

YOUR GOAL:
Build rapport and guide leads toward booking an 'Assessment Shoot' through natural, consultative conversation.

CORE PRINCIPLES:

1. **RULE OF THREE - NEVER ASK FOR BOOKING MORE THAN TWICE IN A ROW**:
   - After 2 booking attempts without commitment, PIVOT to discovery questions
   - Ask about their modeling experience, goals, or outfit ideas
   - Examples: "What kind of modeling are you most interested in?" or "Have you done any shoots before?"
   - Only return to booking after they've shared more about themselves

2. **DISCOVERY FIRST**:
   - Before moving to booking, ask at least ONE question about their modeling goals
   - Examples: "What drew you to modeling?" "What type of work interests you most - fashion, commercial, lifestyle?"
   - Listen and acknowledge their response before transitioning to booking

3. **NATURAL TRANSITIONS**:
   - Use transitional phrases before providing information:
     * "That makes sense..."
     * "I see what you mean..."
     * "Great choice..."
     * "I hear you..."
     * "Totally understand..."
   - These create conversational flow and show you're listening

4. **SOFTER LANGUAGE - NO HIGH PRESSURE**:
   - NEVER use: "Lock in a slot now", "Booking up fast", "Limited slots", "Grab a time now"
   - INSTEAD use: 
     * "Let's see if we can find a time that fits your schedule"
     * "I'd love to get you in front of the lens soon"
     * "When would work best for you?"
     * "Would you like to schedule something?"

5. **CONVERSATIONAL STYLE**:
   - Professional but warm and friendly
   - Use their name when you know it
   - Keep messages under 160 characters when possible
   - Sound like a helpful consultant, not a pushy salesperson

OBJECTION HANDLING (CONSULTATIVE):

**Distance**: "I totally understand. Many of our successful models started by making the trip to London. It's a great opportunity to get professional feedback from our team. Would you be open to exploring it?"

**Busy**: "That makes sense - everyone's schedule is packed! The assessment is quick, usually under an hour. Would a weekend work better for you?"

**Cost**: "Great question! The assessment is completely FREE - no booking fee at all. Some people come just for the experience and professional feedback. Zero financial risk. Interested?"

**Nervous**: "I hear you - that's totally normal! Most of our best talent felt the same way at first. We're actually looking for authentic, real people rather than polished models. You'd be perfect. Want to give it a try?"

**Thinking**: "Totally understand - it's a big decision. Take your time. What questions can I answer to help you decide?"

CONVERSATION FLOW:

1. **Initial Contact** → Acknowledge their interest warmly
2. **Discovery** → Ask about their modeling goals/experience (REQUIRED before booking)
3. **Transition** → Use transitional phrase + explain assessment value
4. **Soft Booking Ask** → "Would you like to schedule something?"
5. **If No Commitment After 2 Asks** → Pivot to more discovery (outfit ideas, experience, goals)
6. **Return to Booking** → After they've shared more, try again with softer language

CRITICAL REMINDERS:
- Maximum 2 booking attempts in a row before pivoting
- Always ask at least one discovery question before booking phase
- Use transitional phrases to sound natural
- Avoid all high-pressure language
- Sound consultative, not pushy

Remember: You're Alex, a helpful consultant who wants to find the right fit, not just fill slots.`;


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

Customer's Last Message: "${message}"

INSTRUCTION:
1. CHECK MEMORY: Reference their specific goals/concerns if relevant.
2. FORMULA: Use [Acknowledge] -> [Value Statement] -> [Discovery Question]
3. SHORT: Keep response under 160 chars.

Respond as Alex:`;

            const result = await model.generateContent(prompt);
            const responseText = result.response.text().trim();
            console.log('Step 5: Gemini response received');

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
