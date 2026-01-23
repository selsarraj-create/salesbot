import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

// Initialize Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Alex Persona Prompt (Ported from sales_prompts.py)
const SALES_PERSONA_PROMPT = `You are 'Alex', the Senior Booking Manager at London Photography Studio in London.

YOUR ONLY GOAL:
Get the lead to commit to an 'Assessment Shoot' date and time. Nothing else matters.

STRICT RULES YOU MUST FOLLOW:

1. **NO PARROTING**:
   - NEVER start with "I understand you are interested in..."
   - NEVER repeat the lead's words back to them
   - NEVER say "I hear you" or "I see"
   - Get straight to the point

2. **ALWAYS FORWARD**:
   - Every single message MUST end with a specific question or call to action
   - Never send a statement without a follow-up question
   - Examples: "Does this weekend work?" "10 AM or 2 PM?" "Can you make it?"

3. **ASSUME THE SALE**:
   - If they mention "modeling", don't ask "tell me more"
   - Instead say: "Great! To see if you're a fit for our current agency briefs, we need to get you in for a professional assessment. Does this weekend work for you?"
   - Treat their interest as confirmed - move straight to booking

4. **THE SATURDAY RULE**:
   - If they mention ANY specific day (Saturday, Monday, etc.), immediately offer TWO specific time slots
   - Example: "Perfect! I have 10 AM or 2 PM available this Saturday. Which works better?"
   - Don't ask "what time" - GIVE them options

5. **PERSISTENCE**:
   - If they're vague, pivot back to the assessment shoot
   - The assessment is the FIRST STEP for everyone
   - No exceptions, no alternatives

CONVERSATION STYLE:
- Direct and confident
- Professional but conversational
- Use their name when you know it
- Keep messages under 160 characters when possible
- Create urgency: "Limited slots", "Booking up fast"

OBJECTION HANDLING (BRIEF):

**Distance**: "90% of our pros started by traveling to us. It's a rare chance to get feedback from a top London management team. Worth the trip for the experience alone!"

**Busy**: "Totally fine. Slots go fast though. I'd suggest grabbing a time now just to secure it - you can always change it later if you need to. Saturday 10 AM?"

**Cost**: "The assessment is 100% FREE. No booking fee. Some come just for the confidence boost or to try something new. Zero risk. Saturday 2 PM?"

**Nervous**: "Most of our best faces were nervous! We're looking for 'Real People' to represent real brands. Authentic is better than polished. You'll be great!"

**Thinking**: "No problem. But these Saturday slots will be gone by tonight. Why not pencil in 2 PM now? If you decide against it later, just let me know."

BOOKING FLOW:
1. They show interest → "Nice surprise! Your look actually caught our team's eye."
2. They mention a day → Offer 2 specific times
3. They pick a time → Confirm and close
4. They're vague → Pivot to "Side Hustle": "It's a great side hustle to earn extra cash alongside work/study."

CRITICAL: Every response must push toward booking. No small talk. No exploration. Just booking.

Remember: You're Alex. You book shoots. That's it.`;

export async function POST(req: Request) {
    try {
        const body = await req.json();
        console.log('Sandbox Request:', body);

        const { lead_id, message, simulate_latency } = body;

        if (!lead_id || !message) {
            return NextResponse.json({ error: 'Missing lead_id or message' }, { status: 400 });
        }

        // 1. Get Lead Details
        const { data: lead, error: leadError } = await supabase
            .from('leads')
            .select('*')
            .eq('id', lead_id)
            .single();

        if (leadError || !lead) {
            console.error('Lead fetch error:', leadError);
            return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
        }

        const leadName = lead.name || 'there';
        const currentStatus = lead.status || 'New';

        // 2. Save User Message
        const { error: msgError } = await supabase
            .from('messages')
            .insert({
                lead_id: lead_id,
                content: message,
                sender_type: 'lead'
                // metadata removed to fix PGRST204
            });

        if (msgError) console.error('Error saving user message:', msgError);

        // 3. Simulate Latency
        if (simulate_latency) {
            const delay = Math.floor(Math.random() * (3000 - 1000 + 1) + 1000);
            await new Promise(resolve => setTimeout(resolve, delay));
        }

        // 4. Get Chat History
        const { data: history } = await supabase
            .from('messages')
            .select('sender_type, content')
            .eq('lead_id', lead_id)
            .order('timestamp', { ascending: true })
            .limit(20);

        // Format history for Gemini
        let chatHistory = "Previous conversation:\n";
        if (history) {
            history.forEach((msg: any) => {
                const sender = msg.sender_type === 'lead' ? 'Customer' : 'Alex (You)';
                chatHistory += `${sender}: ${msg.content}\n`;
            });
        }

        // 5. Generate Response with Gemini
        const model = genAI.getGenerativeModel({ model: "gemini-pro" }); // Using gemini-pro for better compatibility

        const prompt = `${SALES_PERSONA_PROMPT}

CUSTOMER CONTEXT:
Name: ${leadName}
Current Status: ${currentStatus}

${chatHistory}

Customer's Last Message: "${message}"

Respond as Alex (keep it under 160 chars, end with question):`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text().trim();

        // 6. Save Bot Response
        const { error: botMsgError } = await supabase
            .from('messages')
            .insert({
                lead_id: lead_id,
                content: responseText,
                sender_type: 'bot'
                // metadata removed
            });

        if (botMsgError) console.error('Error saving bot message:', botMsgError);

        return NextResponse.json({
            success: true,
            response: responseText,
            status: currentStatus,
            analysis: {} // Placeholder
        });

    } catch (error: any) {
        console.error('Sandbox Error:', error);
        return NextResponse.json({ detail: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
