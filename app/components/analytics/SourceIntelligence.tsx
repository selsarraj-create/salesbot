'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function SourceIntelligence() {
    // Mock data for now - will be replaced by real DB query
    const data = [
        { source: '#TikTok', conversion: 45, volume: 150, color: '#F43F5E' }, // Rose
        { source: '#Instagram', conversion: 40, volume: 120, color: '#A855F7' }, // Purple
        { source: '#Google', conversion: 65, volume: 80, color: '#0066FF' }, // Brand Blue
        { source: '#Referral', conversion: 80, volume: 30, color: '#10B981' }, // Emerald
    ];

    return (
        <Card className="bg-white border border-gray-100 shadow-sm">
            <CardHeader>
                <CardTitle className="text-text-dark text-lg">Lead Source Intelligence</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart layout="vertical" data={data} margin={{ left: 20 }}>
                            <XAxis type="number" hide />
                            <YAxis
                                dataKey="source"
                                type="category"
                                stroke="#9CA3AF"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                width={80}
                            />
                            <Tooltip
                                cursor={{ fill: 'rgba(0,0,0,0.03)' }}
                                contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB', color: '#1F2937', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                            />
                            <Bar dataKey="conversion" name="Conversion Rate %" radius={[0, 6, 6, 0]}>
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <p className="text-xs text-center text-text-muted-dark mt-2">
                    Top Performer: #Referral (80% Conv.) • Highest Volume: #TikTok
                </p>
            </CardContent>
        </Card>
    );
}
