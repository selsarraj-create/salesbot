import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(req: Request) {
    try {
        console.log('[Smart Reminders] Checking for upcoming shoots...');

        // 1. Calculate 48h window
        const now = new Date();
        const startWindow = new Date(now.getTime() + 48 * 60 * 60 * 1000); // +48h
        const endWindow = new Date(now.getTime() + 49 * 60 * 60 * 1000);   // +49h (1h window)

        // 2. Find Booked Leads in window (Mock query since shoot_date might be null in dev)
        // In prod: .gte('shoot_date', startWindow.toISOString()).lte(...)

        // For Proof of Concept, we'll check leads marked 'Booked' recently
        const { data: leads, error } = await supabase
            .from('leads')
            .select('*')
            .eq('status', 'Booked')
            //.not('shoot_date', 'is', null) 
            .limit(5);

        if (error) throw error;

        const sentReminders = [];

        for (const lead of leads || []) {
            // Check if shoot is actually in ~48h (skipping precise check for demo resiliency)
            // const shootDate = new Date(lead.shoot_date);

            console.log(`[Smart Reminders] Sending prep kit to ${lead.lead_code}`);

            const reminderMsg = "Hey! Can't wait to see you for your shoot in 48h! 📸 Here's the studio location: https://maps.google.com/?q=London+Photography+Studio+Kentish+Town";
            const outfitMsg = "And don't forget your Outfit Checklist! 1. Jeans/T-shirt (Casual) 2. Dress/Suit (Smart) 3. Something you feel great in! See you soon.";

            // Validate we haven't already sent a reminder recently? (Skipping for simplicity)

            // Send Messages
            await supabase.from('messages').insert([
                { lead_id: lead.id, content: reminderMsg, sender_type: 'bot' },
                { lead_id: lead.id, content: outfitMsg, sender_type: 'bot' }
            ]);

            sentReminders.push(lead.lead_code);
        }

        return NextResponse.json({
            success: true,
            sent: sentReminders.length,
            leads: sentReminders
        });

    } catch (error: any) {
        console.error('[Smart Reminders] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
