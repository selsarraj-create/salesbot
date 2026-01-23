import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { lead_id, message, simulate_latency } = body;

        if (!lead_id || !message) {
            return NextResponse.json(
                { error: 'Missing lead_id or message' },
                { status: 400 }
            );
        }

        // Get lead details
        const { data: lead, error: leadError } = await supabase
            .from('leads')
            .select('*')
            .eq('id', lead_id)
            .single();

        if (leadError || !lead) {
            return NextResponse.json(
                { error: 'Lead not found' },
                { status: 404 }
            );
        }

        // SAFETY CHECK: Verify this is a test lead
        if (!lead.is_test) {
            return NextResponse.json(
                { error: 'This endpoint only works with test leads' },
                { status: 400 }
            );
        }

        // Save incoming message
        await supabase.from('messages').insert({
            lead_id: lead_id,
            content: message,
            sender_type: 'lead',
        });

        // Simulate AI processing
        let botResponse = "Thanks for your message! I'm a test bot response.";

        // Simple response logic based on message content
        const lowerMessage = message.toLowerCase();
        if (lowerMessage.includes('hi') || lowerMessage.includes('hello')) {
            botResponse = "Hello! Thanks for reaching out. I'd love to help you explore our photography services. What type of shoot are you interested in?";
        } else if (lowerMessage.includes('price') || lowerMessage.includes('cost')) {
            botResponse = "Our photography packages start at £299. We offer various options to suit different needs. Would you like to schedule a quick call to discuss what would work best for you?";
        } else if (lowerMessage.includes('book') || lowerMessage.includes('schedule')) {
            botResponse = "Fantastic! I'd love to get you booked in. What dates work best for you? We have availability this week and next.";
        } else if (lowerMessage.includes('location') || lowerMessage.includes('where')) {
            botResponse = "We're based in London but travel throughout the UK for shoots. Where are you located?";
        } else {
            botResponse = `I understand you're interested in "${message}". Let me help you with that! Could you tell me a bit more about what you're looking for?`;
        }

        // Simulate latency if requested
        if (simulate_latency) {
            const delay = Math.floor(Math.random() * 2000) + 1000; // 1-3 seconds
            await new Promise(resolve => setTimeout(resolve, delay));
        }

        // Save bot response
        await supabase.from('messages').insert({
            lead_id: lead_id,
            content: botResponse,
            sender_type: 'bot',
        });

        return NextResponse.json({
            success: true,
            response: botResponse,
            thinking_time_ms: simulate_latency ? 1500 : 100,
            analysis: {
                intent: 'inquiry',
                sentiment: 'positive',
                new_status: lead.status,
            },
        });
    } catch (error: any) {
        console.error('Test chat error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
