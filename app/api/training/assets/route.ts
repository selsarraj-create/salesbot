
import { getServerSupabase } from '@/lib/supabase/server-client';
import { NextResponse } from 'next/server';

export async function DELETE(req: Request) {
    try {
        const supabase = getServerSupabase();
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Asset ID is required' }, { status: 400 });
        }

        // Delete the knowledge vector entry
        const { error: dbError } = await supabase
            .from('knowledge_vectors')
            .delete()
            .eq('id', id);

        if (dbError) {
            throw new Error(`Database delete failed: ${dbError.message}`);
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error deleting asset:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
