import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Keywords that trigger a "Safety Lock"
const SAFETY_KEYWORDS = ['agency', 'guarantee', 'promise', 'legal', 'scam'];

export async function GET(req: Request) {
    try {
        const { data: rules, error } = await supabase
            .from('system_rules')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json({ rules });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { rule_text, category } = await req.json();

        if (!rule_text || !category) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Check for safety keywords to auto-lock
        const is_locked = SAFETY_KEYWORDS.some(keyword =>
            rule_text.toLowerCase().includes(keyword)
        );

        const { data, error } = await supabase
            .from('system_rules')
            .insert({
                rule_text,
                category,
                is_active: true,
                is_locked
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, rule: data });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        // Check if locked before deleting
        const { data: rule } = await supabase
            .from('system_rules')
            .select('is_locked')
            .eq('id', id)
            .single();

        if (rule?.is_locked) {
            return NextResponse.json({
                error: 'This rule is LOCKED for safety/legal reasons and cannot be deleted.'
            }, { status: 403 });
        }

        const { error } = await supabase
            .from('system_rules')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ success: true });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const { id, is_active } = await req.json();

        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        const { data, error } = await supabase
            .from('system_rules')
            .update({ is_active })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, rule: data });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
