import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Initialize Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(req: Request) {
    try {
        // Fetch recent bot messages that haven't been reviewed yet
        // Joining with messages is tricky in Supabase basic client without explicit foreign key embedding sometimes,
        // so we'll fetch messages and check if they have feedback.
        // Ideally, we'd use a left join: messages LEFT JOIN training_feedback ON messages.id = training_feedback.message_id WHERE training_feedback.id IS NULL

        // For MVP, we'll fetch recent bot messages and then client-side or second-step filter if needed, 
        // OR just fetch all and let the client explicitly showing "Reviewed" status.

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

        if (error) throw error;

        // Fetch existing feedback to filter or annotate
        const messageIds = messages.map(m => m.id);
        const { data: feedbackData, error: feedbackError } = await supabase
            .from('training_feedback')
            .select('message_id, is_gold_standard')
            .in('message_id', messageIds);

        if (feedbackError) throw feedbackError;

        // Attach review status
        const feedbackMap = new Map(feedbackData?.map(f => [f.message_id, f]));

        const reviewQueue = messages.map(msg => ({
            ...msg,
            has_feedback: feedbackMap.has(msg.id),
            is_gold: feedbackMap.get(msg.id)?.is_gold_standard || false,
            lead_context: msg.leads // Data from join
        }));

        // Filter to only unreviewed for the "Queue" view? 
        // Or return all sorted by "Needs Review" (unreviewed first).
        // Let's return unreviewed first.
        const sortedQueue = reviewQueue.sort((a, b) => {
            if (a.has_feedback === b.has_feedback) return 0;
            return a.has_feedback ? 1 : -1;
        });

        return NextResponse.json({ queue: sortedQueue });

    } catch (error: any) {
        console.error('Error fetching review queue:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
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
