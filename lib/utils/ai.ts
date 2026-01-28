import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

/**
 * Analyze sentiment of a message
 * Returns a score from -1 (very negative) to +1 (very positive)
 */
export async function analyzeSentiment(text: string): Promise<number> {
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const result = await model.generateContent(`Analyze the sentiment of this message and return ONLY a number from -1 to 1, where -1 is very negative, 0 is neutral, and 1 is very positive. No explanation, just the number.

Message: "${text}"`);

        const score = parseFloat(result.response.text().trim());
        return isNaN(score) ? 0 : Math.max(-1, Math.min(1, score));
    } catch (error) {
        console.error('Sentiment analysis error:', error);
        return 0;
    }
}

/**
 * Generate embedding for text using Gemini
 */
export async function generateEmbedding(text: string): Promise<number[]> {
    try {
        const model = genAI.getGenerativeModel({ model: 'models/gemini-embedding-001' });
        const result = await model.embedContent(text);
        return result.embedding.values;
    } catch (error) {
        console.error('Embedding generation error:', error);
        throw error;
    }
}

/**
 * Search for similar Gold Standard examples
 */
export async function searchGoldStandards(query: string, limit: number = 3): Promise<any[]> {
    try {
        const embedding = await generateEmbedding(query);

        const { data, error } = await supabase.rpc('match_gold_standards', {
            query_embedding: embedding,
            match_threshold: 0.7,
            match_count: limit
        });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Gold Standard search error:', error);
        return [];
    }
}

/**
 * Search knowledge base for relevant context
 */
export async function searchKnowledge(query: string, limit: number = 5): Promise<any[]> {
    try {
        const embedding = await generateEmbedding(query);

        const { data, error } = await supabase.rpc('match_knowledge_vectors', {
            query_embedding: embedding,
            match_threshold: 0.7,
            match_count: limit,
            filter_content_type: null
        });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Knowledge search error:', error);
        return [];
    }
}
