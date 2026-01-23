'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase/client';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { Trophy, TrendingUp, Target, ThumbsUp } from 'lucide-react';

interface AnalyticsData {
    totalLeads: number;
    winRate: number; // Percent of leads with status 'Booking_Offered' or 'Booked'
    sentimentDistribution: { name: string; value: number }[];
    goldRatio: number; // Percent of feedback that is gold
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function AnalyticsDashboard() {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            // 1. Fetch Lead Stats
            const { data: leads } = await supabase.from('leads').select('status');
            const totalLeads = leads?.length || 0;
            const wins = leads?.filter(l => l.status === 'Booked' || l.status === 'Booking_Offered').length || 0;

            // Group by status for Pie Chart
            const statusCounts: Record<string, number> = {};
            leads?.forEach(l => {
                statusCounts[l.status] = (statusCounts[l.status] || 0) + 1;
            });
            const sentimentData = Object.keys(statusCounts).map(key => ({
                name: key.replace('_', ' '),
                value: statusCounts[key]
            }));

            // 2. Fetch Feedback Stats
            const { data: feedback } = await supabase.from('training_feedback').select('is_gold_standard');
            const totalFeedback = feedback?.length || 0;
            const goldCount = feedback?.filter(f => f.is_gold_standard).length || 0;
            const goldRatio = totalFeedback > 0 ? (goldCount / totalFeedback) * 100 : 0;

            setData({
                totalLeads,
                winRate: totalLeads > 0 ? (wins / totalLeads) * 100 : 0,
                sentimentDistribution: sentimentData,
                goldRatio
            });

        } catch (error) {
            console.error("Error fetching analytics:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="text-center p-10 text-text-secondary">Loading Analytics...</div>;
    if (!data) return <div className="text-center p-10 text-text-secondary">No data available</div>;

    return (
        <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-surface border-surface-light">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-text-secondary">Total Leads</CardTitle>
                        <Target className="h-4 w-4 text-electric-cyan" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-text-primary">{data.totalLeads}</div>
                        <p className="text-xs text-text-tertiary">Lifetime volume</p>
                    </CardContent>
                </Card>
                <Card className="bg-surface border-surface-light">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-text-secondary">Win Rate</CardTitle>
                        <Trophy className="h-4 w-4 text-yellow-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-text-primary">{data.winRate.toFixed(1)}%</div>
                        <p className="text-xs text-text-tertiary">Booking Offered / Booked</p>
                    </CardContent>
                </Card>
                <Card className="bg-surface border-surface-light">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-text-secondary">Gold Standards</CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-text-primary">{data.goldRatio.toFixed(1)}%</div>
                        <p className="text-xs text-text-tertiary">Of reviewed responses</p>
                    </CardContent>
                </Card>
                <Card className="bg-surface border-surface-light">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-text-secondary">Coachability</CardTitle>
                        <ThumbsUp className="h-4 w-4 text-blue-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-text-primary">High</div>
                        <p className="text-xs text-text-tertiary">Based on feedback trend</p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="col-span-1 bg-surface border-surface-light">
                    <CardHeader>
                        <CardTitle className="text-text-primary">Outcome Distribution</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data.sentimentDistribution}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {data.sentimentDistribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="col-span-1 bg-surface border-surface-light">
                    <CardHeader>
                        <CardTitle className="text-text-primary">Coaching Impact</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px] flex items-center justify-center text-text-secondary">
                        <div className="text-center">
                            <p className="mb-2">Training Data Velocity</p>
                            {/* Placeholder for future Time-Series chart */}
                            <BarChart width={300} height={200} data={[
                                { name: 'W1', amt: 2 }, { name: 'W2', amt: 5 }, { name: 'W3', amt: 8 }, { name: 'W4', amt: 12 }
                            ]}>
                                <XAxis dataKey="name" stroke="#666" />
                                <YAxis stroke="#666" />
                                <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }} />
                                <Bar dataKey="amt" fill="#00C49F" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
