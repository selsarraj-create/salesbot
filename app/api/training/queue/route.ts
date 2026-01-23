import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Initialize Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(req: Request) {
    try {
        console.log('[Training Queue API] Starting fetch...');

        // Fetch recent bot messages
        console.log('[Training Queue API] Querying messages table...');
        const { data: messages, error } = await supabase
            .from('messages')
            .select(`
                *,
                leads (
                    lead_code,
                    status
                )
            `)
            .eq('sender_type', 'bot')
            .order('timestamp', { ascending: false })
            .limit(50);

        if (error) {
            console.error('[Training Queue API] Supabase error:', error);
            throw error;
        }

        console.log(`[Training Queue API] Found ${messages?.length || 0} bot messages`);

        if (!messages || messages.length === 0) {
            console.log('[Training Queue API] No messages found, returning empty queue');
            return NextResponse.json({ queue: [] });
        }

        // Fetch existing feedback to filter or annotate
        const messageIds = messages.map(m => m.id);
        console.log(`[Training Queue API] Fetching feedback for ${messageIds.length} messages...`);

        const { data: feedbackData, error: feedbackError } = await supabase
            .from('training_feedback')
            .select('message_id, is_gold_standard')
            .in('message_id', messageIds);

        if (feedbackError) {
            console.error('[Training Queue API] Feedback fetch error:', feedbackError);
            throw feedbackError;
        }

        console.log(`[Training Queue API] Found ${feedbackData?.length || 0} feedback entries`);

        // Attach review status
        const feedbackMap = new Map(feedbackData?.map(f => [f.message_id, f]));

        const reviewQueue = messages.map(msg => ({
            ...msg,
            has_feedback: feedbackMap.has(msg.id),
            is_gold: feedbackMap.get(msg.id)?.is_gold_standard || false,
            lead_context: msg.leads // Data from join
        }));

        // Sort: unreviewed first
        const sortedQueue = reviewQueue.sort((a, b) => {
            if (a.has_feedback === b.has_feedback) return 0;
            return a.has_feedback ? 1 : -1;
        });

        console.log(`[Training Queue API] Returning ${sortedQueue.length} items`);
        return NextResponse.json({ queue: sortedQueue });

    } catch (error: any) {
        console.error('[Training Queue API] Fatal error:', error);
        console.error('[Training Queue API] Error stack:', error.stack);
        return NextResponse.json({
            error: error.message || 'Internal server error',
            details: error.toString()
        }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const {
            message_id,
            original_prompt,
            ai_response,
            manager_correction,
            is_gold_standard,
            objection_type,
            confidence_score
        } = body;

        const { data, error } = await supabase
            .from('training_feedback')
            .insert({
                message_id,
                original_prompt,
                ai_response,
                manager_correction,
                is_gold_standard,
                objection_type,
                confidence_score
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, feedback: data });

    } catch (error: any) {
        console.error('Error submitting feedback:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
