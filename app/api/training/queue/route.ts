import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Initialize Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const filterHighValue = searchParams.get('high_value') === 'true';
        const ignoreShort = searchParams.get('ignore_short') === 'true';
        const filterFailuresOnly = searchParams.get('failures_only') === 'true';

        console.log(`[Training Queue API] Fetching queue. HighValue: ${filterHighValue}, IgnoreShort: ${ignoreShort}, FailuresOnly: ${filterFailuresOnly}`);

        // Base query: Bot messages that are pending review
        let query = supabase
            .from('messages')
            .select('*')
            .eq('sender_type', 'bot')
            .eq('review_status', 'pending')
            .order('timestamp', { ascending: false })
            .limit(100);

        const { data: messages, error } = await query;

        if (error) {
            console.error('[Training Queue API] Supabase error:', error);
            throw error;
        }

        if (!messages || messages.length === 0) {
            return NextResponse.json({ queue: [] });
        }

        // Apply filters in memory (Supabase text search is limited without full setup)
        let filteredMessages = messages;

        // 1. Ignore Short Messages (< 15 chars)
        if (ignoreShort) {
            filteredMessages = filteredMessages.filter(m => m.content.length >= 15);
        }

        // 2. High Value Filter (Keywords)
        if (filterHighValue) {
            const TRIGGERS = ['price', 'cost', 'how much', 'book', 'appointment', 'schedule', 'location', 'parking', 'drive', 'train'];
            filteredMessages = filteredMessages.filter(m => {
                const lower = m.content.toLowerCase();
                // Check if message contains high intent triggers OR has negative sentiment (needs review)
                const hasTrigger = TRIGGERS.some(t => lower.includes(t));
                const lowScore = (m.sentiment_score !== undefined && m.sentiment_score !== null && Math.abs(m.sentiment_score) > 0.5); // High emotion is often high value/risk
                return hasTrigger || lowScore;
            });
        }

        if (filteredMessages.length === 0) {
            return NextResponse.json({ queue: [] });
        }

        // Fetch lead data
        const leadIds = Array.from(new Set(filteredMessages.map(m => m.lead_id)));
        const { data: leads } = await supabase
            .from('leads')
            .select('id, lead_code, status, priority_score, quality_score, manual_score, judge_rationale')
            .in('id', leadIds);

        const leadsMap = new Map(leads?.map(l => [l.id, l]) || []);

        // Fetch previous context
        const richQueue = (await Promise.all(filteredMessages.map(async (msg) => {
            const leadData = leadsMap.get(msg.lead_id);

            // Check Failure Filter
            if (filterFailuresOnly) {
                const score = leadData?.manual_score ?? leadData?.quality_score ?? 10; // Default to 10 (pass) if unknown
                if (score >= 6) return null; // Skip non-failures
            }

            // Get previous message
            const { data: prevMsg } = await supabase
                .from('messages')
                .select('content')
                .eq('lead_id', msg.lead_id)
                .eq('sender_type', 'lead')
                .lt('timestamp', msg.timestamp)
                .order('timestamp', { ascending: false })
                .limit(1)
                .single();

            // Check if ignored due to length defaults (if we want to be aggressive, but user wants toggle)
            return {
                ...msg,
                has_feedback: false, // filtered by review_status='pending', so always false
                is_gold: false,
                lead_context: leadData ? {
                    lead_code: leadData.lead_code,
                    status: leadData.status,
                    priority_score: leadData.priority_score
                } : null,
                quality_score: leadData?.quality_score,
                manual_score: leadData?.manual_score,
                judge_rationale: leadData?.judge_rationale,
                previous_message: prevMsg?.content || '(No context found)'
            };
        }))).filter(Boolean);

        return NextResponse.json({ queue: richQueue });

    } catch (error: any) {
        console.error('[Training Queue API] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const {
            action, // 'approve', 'intervene', 'gold', 'skip', 'bulk_skip'
            message_ids, // for bulk
            message_id, // for single
            // Feedback fields
            original_prompt,
            ai_response,
            manager_correction,
            is_gold_standard,
            objection_type,
            confidence_score,
            lead_id
        } = body;

        console.log(`[Training Queue API] Action: ${action}`);

        // --- BULK ACTION ---
        if (action === 'bulk_skip' || action === 'bulk_archive') {
            if (!message_ids || !Array.isArray(message_ids)) {
                return NextResponse.json({ error: 'message_ids array required for bulk action' }, { status: 400 });
            }

            const { error } = await supabase
                .from('messages')
                .update({ review_status: 'skipped' })
                .in('id', message_ids);

            if (error) throw error;
            return NextResponse.json({ success: true, count: message_ids.length });
        }

        // --- SINGLE ACTIONS ---
        const targetId = message_id;
        if (!targetId) return NextResponse.json({ error: 'message_id required' }, { status: 400 });

        let newStatus = 'approved';
        if (action === 'skip') newStatus = 'skipped';
        if (action === 'intervene') newStatus = 'corrected';
        if (action === 'gold') newStatus = 'gold';

        // 1. Update Message Status
        const { error: statusError } = await supabase
            .from('messages')
            .update({ review_status: newStatus })
            .eq('id', targetId);

        if (statusError) throw statusError;

        // 2. Insert Feedback (Only if NOT skipped)
        if (action !== 'skip') {
            // Check sentiment/embedding logic here if needed (reused from prev implementation)
            let sentiment_score = null;
            let embedding = null;

            if (is_gold_standard) {
                try {
                    const { generateEmbedding } = await import('@/lib/utils/ai');
                    embedding = await generateEmbedding(manager_correction || ai_response);
                } catch (e) {
                    console.error('Embedding failed', e);
                }
            }

            const { error: feedbackError } = await supabase
                .from('training_feedback')
                .insert({
                    message_id: targetId,
                    original_prompt: original_prompt || 'Unknown',
                    ai_response,
                    manager_correction,
                    is_gold_standard: is_gold_standard || false,
                    objection_type,
                    confidence_score,
                    sentiment_score,
                    embedding
                });

            if (feedbackError) throw feedbackError;

            // 3. Update Manual Score if Intervening/Gold and we have lead_id
            if (lead_id && (action === 'gold' || action === 'intervene')) {
                const score = action === 'gold' ? 10 : 0; // Gold=10, Correction=0 (placeholder logic, user might want explicit score later)
                await supabase.from('leads').update({ manual_score: score }).eq('id', lead_id);
            }
        }

        return NextResponse.json({ success: true, status: newStatus });

    } catch (error: any) {
        console.error('[Training Queue API] Error submitting feedback:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
