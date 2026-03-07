'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/auth-context';

export default function AiPerformance() {
    const { user, tenant } = useAuth();
    const [stats, setStats] = useState({
        total: 0,
        booked: 0,
        humanRequired: 0,
        avgResponseSec: 0,
    });
    const [adSpend, setAdSpend] = useState(0);

    useEffect(() => {
        if (!user) return;

        async function fetchStats() {
            // Fetch leads
            const { data: leads } = await supabase.from('leads').select('status').neq('is_test', true);
            const all = (leads as any[]) || [];
            const total = all.length;
            const booked = all.filter(l => l.status === 'Booked').length;
            const humanRequired = all.filter(l => l.status === 'Human_Required').length;

            // Fetch avg response time (time between lead msg → bot reply)
            const { data: messages } = await supabase
                .from('messages')
                .select('lead_id, sender_type, timestamp, created_at')
                .order('timestamp', { ascending: true })
                .limit(500);

            let totalDelay = 0;
            let pairCount = 0;
            if (messages) {
                const msgs = messages as any[];
                for (let i = 1; i < msgs.length; i++) {
                    if (
                        msgs[i].sender_type === 'bot' &&
                        msgs[i - 1].sender_type === 'lead' &&
                        msgs[i].lead_id === msgs[i - 1].lead_id
                    ) {
                        const t1 = new Date(msgs[i - 1].timestamp || msgs[i - 1].created_at).getTime();
                        const t2 = new Date(msgs[i].timestamp || msgs[i].created_at).getTime();
                        const diff = (t2 - t1) / 1000;
                        if (diff > 0 && diff < 3600) {
                            totalDelay += diff;
                            pairCount++;
                        }
                    }
                }
            }

            setStats({
                total,
                booked,
                humanRequired,
                avgResponseSec: pairCount > 0 ? Math.round(totalDelay / pairCount) : 0,
            });
        }

        fetchStats();
    }, [user]);

    useEffect(() => {
        if (tenant) {
            setAdSpend(tenant.monthly_ad_spend || 0);
        }
    }, [tenant]);

    const convRate = stats.total > 0 ? Math.round((stats.booked / stats.total) * 100) : 0;
    const costPerLead = adSpend > 0 && stats.total > 0 ? (adSpend / stats.total).toFixed(2) : '—';
    const costPerBooking = adSpend > 0 && stats.booked > 0 ? (adSpend / stats.booked).toFixed(2) : '—';

    const formatTime = (secs: number) => {
        if (secs === 0) return '—';
        if (secs < 60) return `${secs}s`;
        return `${Math.floor(secs / 60)}m ${secs % 60}s`;
    };

    return (
        <div className="rd-analytics-card rd-ai-perf">
            <h3 className="rd-analytics-card-title">🤖 AI Performance</h3>

            {/* Hero stat */}
            <div className="rd-perf-hero">
                <span className="rd-perf-hero-num">{convRate}%</span>
                <span className="rd-perf-hero-label">
                    Booking Rate — {stats.booked} of {stats.total} leads
                </span>
            </div>

            {/* Stats grid */}
            <div className="rd-perf-grid">
                <div className="rd-perf-stat">
                    <span className="rd-perf-stat-value">{formatTime(stats.avgResponseSec)}</span>
                    <span className="rd-perf-stat-label">Avg Response</span>
                </div>
                <div className="rd-perf-stat">
                    <span className="rd-perf-stat-value">{stats.humanRequired}</span>
                    <span className="rd-perf-stat-label">Human Handoffs</span>
                </div>
                <div className="rd-perf-stat">
                    <span className="rd-perf-stat-value">£{costPerLead}</span>
                    <span className="rd-perf-stat-label">Cost per Lead</span>
                </div>
                <div className="rd-perf-stat">
                    <span className="rd-perf-stat-value">£{costPerBooking}</span>
                    <span className="rd-perf-stat-label">Cost per Booking</span>
                </div>
            </div>
        </div>
    );
}
