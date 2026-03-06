'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Message } from '@/lib/supabase/types';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';

interface SentimentHeatmapProps {
    messages: Message[];
}

export default function SentimentHeatmap({ messages }: SentimentHeatmapProps) {
    // Filter for lead messages only as they have the relevant sentiment
    const data = messages
        .filter(m => m.sender_type === 'lead')
        .map((m, index) => ({
            id: m.id,
            index: index + 1,
            sentiment: (m as any).sentiment_score || 0, // Fallback if not set
            content: m.content,
            timestamp: m.timestamp
        }));

    const getBarColor = (sentiment: number) => {
        if (sentiment >= 0.3) return '#10B981'; // Emerald-500
        if (sentiment <= -0.3) return '#F43F5E'; // Rose-500
        return '#F59E0B'; // Amber-500
    };

    // Calculate Friction Points (drops > 0.5)
    let frictionPoints = 0;
    for (let i = 1; i < data.length; i++) {
        if (data[i - 1].sentiment - data[i].sentiment > 0.5) {
            frictionPoints++;
        }
    }

    const avgSentiment = data.length > 0
        ? (data.reduce((acc, curr) => acc + curr.sentiment, 0) / data.length).toFixed(2)
        : '0.00';

    return (
        <Card className="bg-white border border-gray-100 shadow-sm">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-text-dark text-lg">Sentiment Heatmap</CardTitle>
                    <div className="flex gap-2">
                        <Badge variant="outline" className={`${Number(avgSentiment) > 0 ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : 'text-rose-600 bg-rose-50 border-rose-200'}`}>
                            Avg: {avgSentiment}
                        </Badge>
                        {frictionPoints > 0 && (
                            <Badge variant="destructive" className="flex items-center gap-1 bg-rose-500">
                                <AlertTriangle className="w-3 h-3" />
                                {frictionPoints} Friction Points
                            </Badge>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="h-[200px] w-full">
                    {data.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-text-muted-dark text-sm">
                            No sentiment data available
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data}>
                                <XAxis
                                    dataKey="index"
                                    stroke="#D1D5DB"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    domain={[-1, 1]}
                                    hide
                                />
                                <Tooltip
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            const item = payload[0].payload;
                                            return (
                                                <div className="bg-white border border-gray-200 p-3 rounded-xl shadow-lg max-w-xs">
                                                    <p className="text-sm font-medium mb-1 text-text-dark">
                                                        Msg #{item.index}: {item.sentiment.toFixed(2)}
                                                    </p>
                                                    <p className="text-xs text-text-muted-dark truncate">
                                                        {item.content}
                                                    </p>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <ReferenceLine y={0} stroke="#E5E7EB" strokeDasharray="3 3" />
                                <Bar dataKey="sentiment" radius={[4, 4, 0, 0]}>
                                    {data.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={getBarColor(entry.sentiment)} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
                <div className="flex justify-between text-xs text-text-muted-dark mt-2">
                    <span>Start of Convo</span>
                    <span>Recent</span>
                </div>
            </CardContent>
        </Card>
    );
}
