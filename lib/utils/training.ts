import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client (Server-side usage primarily)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export interface GoldExample {
    original_prompt: string;
    response: string; // Either manager_correction or ai_response
}

export async function getGoldStandardExamples(limit: number = 5): Promise<string> {
    try {
        const { data, error } = await supabase
            .from('training_feedback')
            .select('original_prompt, ai_response, manager_correction, is_gold_standard')
            .eq('is_gold_standard', true)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error || !data || data.length === 0) {
            return "";
        }

        const examples = data.map(item => {
            // If manager corrected it, that's the gold response. Otherwise the AI's response was gold.
            const bestResponse = item.manager_correction || item.ai_response;
            // Ensure we have a prompt (sometimes it might be missing if inferred, but we validted in migration)
            const prompt = item.original_prompt || "Lead Message";

            return `Q: ${prompt}\nA: ${bestResponse}`;
        }).join("\n\n");

        return `
*** GOLD STANDARD EXAMPLES (LEARN FROM THESE) ***
${examples}
*** END EXAMPLES ***
`;

    } catch (error) {
        console.error("Error fetching gold standard examples:", error);
        return "";
    }
}
