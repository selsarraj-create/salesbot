import { getServerSupabase } from '@/lib/supabase/server-client';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const supabase = getServerSupabase() as any;
        const { data, error } = await supabase
            .from('ai_config')
            .select('*')
            .single();

        if (error) throw error;

        return NextResponse.json({ config: data });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const supabase = getServerSupabase() as any;
        const body = await req.json();
        const { temperature, top_p, frequency_penalty, full_context_mode, thinking_budget, show_thoughts } = body;

        const updates: any = { updated_at: new Date().toISOString() };
        if (temperature !== undefined) updates.temperature = temperature;
        if (top_p !== undefined) updates.top_p = top_p;
        if (frequency_penalty !== undefined) updates.frequency_penalty = frequency_penalty;
        if (full_context_mode !== undefined) updates.full_context_mode = full_context_mode;
        if (thinking_budget !== undefined) updates.thinking_budget = thinking_budget;
        if (show_thoughts !== undefined) updates.show_thoughts = show_thoughts;

        const { data, error } = await supabase
            .from('ai_config')
            .update(updates)
            .eq('id', 1)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ config: data });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
