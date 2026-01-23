'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function SourceIntelligence() {
    // Mock data for now - will be replaced by real DB query
    const data = [
        { source: '#TikTok', conversion: 45, volume: 150, color: '#FF3366' }, // Video
        { source: '#Instagram', conversion: 40, volume: 120, color: '#C13584' }, // Photo
        { source: '#Google', conversion: 65, volume: 80, color: '#4285F4' }, // Search (Higher intent)
        { source: '#Referral', conversion: 80, volume: 30, color: '#00FF88' }, // Trust
    ];

    return (
        <Card className="bg-surface border-surface-light">
            <CardHeader>
                <CardTitle className="text-text-primary text-lg">Lead Source Intelligence</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart layout="vertical" data={data} margin={{ left: 20 }}>
                            <XAxis type="number" hide />
                            <YAxis
                                dataKey="source"
                                type="category"
                                stroke="#888888"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                width={80}
                            />
                            <Tooltip
                                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                contentStyle={{ backgroundColor: '#1A1F2E', borderColor: '#2A2F3E', color: '#fff' }}
                            />
                            <Bar dataKey="conversion" name="Conversion Rate %" radius={[0, 4, 4, 0]}>
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <p className="text-xs text-center text-text-secondary mt-2">
                    Top Performer: #Referral (80% Conv.) • Highest Volume: #TikTok
                </p>
            </CardContent>
        </Card>
    );
}
