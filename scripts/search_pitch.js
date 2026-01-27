
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function search() {
    const query = "Alex agent pitch opening hook";
    const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
    const result = await model.embedContent(query);
    const embedding = result.embedding.values;

    const { data, error } = await supabase.rpc('match_knowledge_vectors', {
        query_embedding: embedding,
        match_threshold: 0.5,
        match_count: 5,
        filter_content_type: null
    });

    if (error) console.error(error);
    else console.log(JSON.stringify(data, null, 2));
}

search();
