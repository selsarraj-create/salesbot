import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
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
        const body = await req.json();
        // Allow partial updates
        const { temperature, top_p, frequency_penalty, full_context_mode } = body;

        const updates: any = { updated_at: new Date().toISOString() };
        if (temperature !== undefined) updates.temperature = temperature;
        if (top_p !== undefined) updates.top_p = top_p;
        if (frequency_penalty !== undefined) updates.frequency_penalty = frequency_penalty;
        if (full_context_mode !== undefined) updates.full_context_mode = full_context_mode;

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
