import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// AI Critique Prompt
const CRITIQUE_PROMPT = `You are an expert sales coach analyzing a sales conversation or script.

Provide a 3-point critique with scores from 1-10:

1. **Objection Quality** (1-10): How well are objections anticipated and handled?
2. **Tone** (1-10): Is the tone professional, empathetic, and persuasive?
3. **Closing Power** (1-10): How effective is the call-to-action and booking flow?

Also provide a brief summary (2-3 sentences) of the overall quality.

Return your response in this exact JSON format:
{
  "objection_quality": <number>,
  "tone": <number>,
  "closing_power": <number>,
  "summary": "<text>"
}`;

export async function POST(req: Request) {
    try {
        console.log('[Upload API] Processing upload...');

        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        console.log('[Upload API] File received:', file.name, file.type, file.size);

        let content = '';
        let contentType: 'audio_transcript' | 'document' = 'document';
        const metadata: any = {
            filename: file.name,
            file_size: file.size,
            mime_type: file.type
        };

        // Process based on file type
        if (file.type.startsWith('audio/')) {
            console.log('[Upload API] Processing audio file...');
            contentType = 'audio_transcript';

            // Convert file to base64 for Gemini
            const arrayBuffer = await file.arrayBuffer();
            const base64Audio = Buffer.from(arrayBuffer).toString('base64');

            // Transcribe with Gemini
            const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
            const result = await model.generateContent([
                {
                    inlineData: {
                        mimeType: file.type,
                        data: base64Audio
                    }
                },
                { text: 'Transcribe this audio file. Provide only the transcription, no additional commentary.' }
            ]);

            content = result.response.text();
            console.log('[Upload API] Audio transcribed, length:', content.length);

        } else if (file.type === 'application/pdf' || file.type === 'text/plain' || file.type.includes('document')) {
            console.log('[Upload API] Processing document...');
            contentType = 'document';

            // For now, just extract text (you can add PDF parsing later)
            if (file.type === 'text/plain') {
                content = await file.text();
            } else {
                // For PDFs and other docs, use Gemini to extract and summarize
                const arrayBuffer = await file.arrayBuffer();
                const base64Doc = Buffer.from(arrayBuffer).toString('base64');

                const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
                const result = await model.generateContent([
                    {
                        inlineData: {
                            mimeType: file.type,
                            data: base64Doc
                        }
                    },
                    { text: 'Extract and summarize the key sales techniques, objection handling, and closing strategies from this document.' }
                ]);

                content = result.response.text();
            }

            console.log('[Upload API] Document processed, length:', content.length);
        } else {
            return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
        }

        // Generate AI Critique
        console.log('[Upload API] Generating AI critique...');
        const critiqueModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const critiqueResult = await critiqueModel.generateContent(`${CRITIQUE_PROMPT}\n\nContent to analyze:\n${content}`);
        const critiqueText = critiqueResult.response.text();

        // Parse JSON from critique
        let critique;
        try {
            // Extract JSON from markdown code blocks if present
            const jsonMatch = critiqueText.match(/```json\n([\s\S]*?)\n```/) || critiqueText.match(/\{[\s\S]*\}/);
            critique = JSON.parse(jsonMatch ? jsonMatch[1] || jsonMatch[0] : critiqueText);
        } catch (e) {
            console.error('[Upload API] Failed to parse critique JSON:', e);
            critique = {
                objection_quality: 5,
                tone: 5,
                closing_power: 5,
                summary: 'Unable to generate critique'
            };
        }

        console.log('[Upload API] Critique generated:', critique);

        // Generate embedding
        console.log('[Upload API] Generating embedding...');
        const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });
        const embeddingResult = await embeddingModel.embedContent(content);
        const embedding = embeddingResult.embedding.values;

        console.log('[Upload API] Embedding generated, dimensions:', embedding.length);

        // Store in database
        const { data, error } = await supabase
            .from('knowledge_vectors')
            .insert({
                content,
                content_type: contentType,
                metadata,
                embedding,
                critique
            })
            .select()
            .single();

        if (error) {
            console.error('[Upload API] Database error:', error);
            throw error;
        }

        console.log('[Upload API] Stored in database:', data.id);

        return NextResponse.json({
            success: true,
            id: data.id,
            content: content.substring(0, 500) + '...', // Preview
            critique,
            metadata
        });

    } catch (error: any) {
        console.error('[Upload API] Error:', error);
        return NextResponse.json({
            error: error.message || 'Upload failed',
            details: error.toString()
        }, { status: 500 });
    }
}
