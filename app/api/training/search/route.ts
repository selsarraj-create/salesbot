import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { query, limit = 5, content_type } = body;

        if (!query) {
            return NextResponse.json({ error: 'Query is required' }, { status: 400 });
        }

        console.log('[Search API] Searching for:', query, 'limit:', limit);

        // Generate embedding for query
        const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });
        const embeddingResult = await embeddingModel.embedContent(query);
        const queryEmbedding = embeddingResult.embedding.values;

        console.log('[Search API] Query embedding generated');

        // Perform vector similarity search using Supabase RPC
        // Note: You'll need to create this function in Supabase
        const { data, error } = await supabase.rpc('match_knowledge_vectors', {
            query_embedding: queryEmbedding,
            match_threshold: 0.7,
            match_count: limit,
            filter_content_type: content_type || null
        });

        if (error) {
            console.error('[Search API] Search error:', error);
            throw error;
        }

        console.log('[Search API] Found', data?.length || 0, 'matches');

        return NextResponse.json({
            success: true,
            results: data || []
        });

    } catch (error: any) {
        console.error('[Search API] Error:', error);
        return NextResponse.json({
            error: error.message || 'Search failed',
            details: error.toString()
        }, { status: 500 });
    }
}
