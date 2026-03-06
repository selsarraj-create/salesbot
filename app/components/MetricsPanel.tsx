'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export default function MetricsPanel() {
    const [metrics, setMetrics] = useState({
        total: 0,
        new: 0,
        qualifying: 0,
        booked: 0,
    });

    useEffect(() => {
        async function fetchMetrics() {
            const { data: leads, error } = await supabase
                .from('leads')
                .select('status');

            if (error) { console.error('Error fetching metrics:', error); return; }

            const leadsData = (leads as any[]) || [];
            const total = leadsData.length;
            const newLeads = leadsData.filter((l) => l.status === 'New').length;
            const qualifying = leadsData.filter((l) => l.status === 'Qualifying').length;
            const booked = leadsData.filter((l) => l.status === 'Booked').length;

            setMetrics({ total, new: newLeads, qualifying, booked });
        }

        fetchMetrics();

        const channel = supabase
            .channel('metrics-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
                fetchMetrics();
            })
            .subscribe();

        return () => { channel.unsubscribe(); };
    }, []);

    const convRate = metrics.total > 0 ? Math.round((metrics.booked / metrics.total) * 100) : 0;
    // SVG donut params
    const radius = 52;
    const circumference = 2 * Math.PI * radius;
    const filled = (convRate / 100) * circumference;
    const remaining = circumference - filled;

    return (
        <aside className="rd-metrics">
            <h2 className="rd-metrics-heading">Analytics Metrics</h2>

            {/* ── Conversion donut ── */}
            <div className="rd-metric-card rd-metric-donut-card">
                <div className="rd-donut-wrap">
                    <svg viewBox="0 0 120 120" className="rd-donut-svg">
                        <circle
                            cx="60" cy="60" r={radius}
                            fill="none" stroke="#e5e7eb" strokeWidth="10"
                        />
                        <circle
                            cx="60" cy="60" r={radius}
                            fill="none" stroke="#3b82f6" strokeWidth="10"
                            strokeDasharray={`${filled} ${remaining}`}
                            strokeDashoffset={circumference / 4}
                            strokeLinecap="round"
                            className="rd-donut-arc"
                        />
                    </svg>
                    <div className="rd-donut-label">
                        <span className="rd-donut-pct">{convRate}%</span>
                        <span className="rd-donut-sub">Conversion<br />Rate</span>
                    </div>
                </div>
                <div className="rd-donut-detail">
                    <span className="rd-donut-detail-label">Conversion Rate</span>
                    <span className="rd-donut-detail-value">
                        Completed {metrics.booked} / {metrics.total}
                    </span>
                </div>
            </div>

            {/* ── Lead Count ── */}
            <div className="rd-metric-card">
                <div className="rd-metric-content">
                    <span className="rd-metric-label">Lead Count</span>
                    <div className="rd-metric-row">
                        <span className="rd-metric-big">{metrics.total.toLocaleString()}</span>
                        <span className="rd-metric-badge rd-badge-green">
                            +{metrics.new > 0 ? metrics.new : 0} new
                        </span>
                    </div>
                    <span className="rd-metric-sublabel">Total leads</span>
                </div>
            </div>

            {/* ── Booking Count ── */}
            <div className="rd-metric-card">
                <div className="rd-metric-content">
                    <span className="rd-metric-label">Booking Count</span>
                    <div className="rd-metric-row">
                        <span className="rd-metric-big">{metrics.booked}</span>
                        <span className="rd-metric-badge rd-badge-blue">
                            {convRate}%
                        </span>
                    </div>
                    <span className="rd-metric-sublabel">Total bookings</span>
                </div>
            </div>

            {/* ── System status ── */}
            <div className="rd-metric-card rd-metric-status">
                <div className="rd-status-row">
                    <span className="rd-status-pulse" />
                    <span className="rd-status-text">System Online</span>
                </div>
                <span className="rd-status-sub">Real-time monitoring active</span>
            </div>
        </aside>
    );
}
