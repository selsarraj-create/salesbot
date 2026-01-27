
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Asset ID is required' }, { status: 400 });
        }

        console.log(`[Asset API] Deleting asset ${id}...`);

        const { error } = await supabase
            .from('knowledge_vectors')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('[Asset API] Delete error:', error);
            throw error;
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('[Asset API] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
