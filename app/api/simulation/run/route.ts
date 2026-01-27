import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { history, persona, scenario_name } = body;

        // "Attacker" System Prompt
        const ATTACKER_PROMPT = `
You are roleplaying a specific customer persona in a chat with a Sales Bot named Alex.
Your goal is to stay IN CHARACTER at all times.

SCENARIO: ${scenario_name}
YOUR PERSONA:
${persona}

CONTEXT:
You are chatting with a booking manager for a photography studio.
Keep your responses realistic to the persona.
If the persona is "Angry", be short, rude, and skeptical.
If "Nervous", ask for reassurance.
If "Price Conscious", keep asking about money.

Length: Keep responses under 2-3 sentences, like a real SMS/WhatsApp chat.
    `.trim();

        // Format history for Gemini
        // History comes in as [{sender: 'bot'|'lead', content: '...'}]
        // We need to map this to Gemini format using the Attacker's perspective
        // If sender is 'bot', that's the "model" (user) for the Attacker AI.
        // If sender is 'lead', that's the "user" (model) for the Attacker AI.
        // Actually, easier:

        let chatHistory = "Conversation History:\n";
        history.forEach((msg: any) => {
            const speaker = msg.sender === 'bot' ? 'Alex (Sales Agent)' : 'You (Customer)';
            chatHistory += `${speaker}: ${msg.content}\n`;
        });

        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
            generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 250,
                topP: 0.8,
                frequencyPenalty: 0.3,
            }
        });

        // Using a simple generation call instead of startChat for statelessness simplicity here,
        // though startChat is better for long context, we pass full history anyway.
        const prompt = `${ATTACKER_PROMPT}\n\n${chatHistory}\n\nYou (Customer):`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text().trim();

        return NextResponse.json({
            attacker_message: responseText
        });

    } catch (error: any) {
        console.error('Simulation Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
