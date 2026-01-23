'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase/client';
import SentimentHeatmap from '@/app/components/analytics/SentimentHeatmap';
import SourceIntelligence from '@/app/components/analytics/SourceIntelligence';
import { Message } from '@/lib/supabase/types';

export default function AnalyticsDashboard() {
    const [messages, setMessages] = useState<Message[]>([]);

    useEffect(() => {
        const fetchRecentMessages = async () => {
            // Just fetching recent messages to show *some* data for now
            // In reality this might be aggregated or specific to a selected lead
            const { data } = await supabase
                .from('messages')
                .select('*')
                .order('timestamp', { ascending: true }) // Chronological for heatmap
                .limit(50);

            if (data) setMessages(data);
        };
        fetchRecentMessages();
    }, []);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
                <SentimentHeatmap messages={messages} />
            </div>
            <SourceIntelligence />

            {/* Placeholder for Follow-up Stats */}
            <Card className="bg-surface border-surface-light">
                <CardHeader>
                    <CardTitle className="text-text-primary">Follow-up Performance</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center h-[200px] text-text-secondary text-sm italic">
                        Processing 24h/72h recovery data...
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
