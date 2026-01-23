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

            if (error) {
                console.error('Error fetching metrics:', error);
                return;
            }

            const leadsData = (leads as any[]) || [];
            const total = leadsData.length;
            const newLeads = leadsData.filter((l) => l.status === 'New').length;
            const qualifying = leadsData.filter((l) => l.status === 'Qualifying').length;
            const booked = leadsData.filter((l) => l.status === 'Booked').length;

            setMetrics({ total, new: newLeads, qualifying, booked });
        }

        fetchMetrics();

        // Subscribe to changes
        const channel = supabase
            .channel('metrics-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'leads',
                },
                () => {
                    fetchMetrics();
                }
            )
            .subscribe();

        return () => {
            channel.unsubscribe();
        };
    }, []);

    return (
        <div className="w-80 bg-surface border-l border-surface-light p-6 overflow-y-auto custom-scrollbar">
            <h2 className="text-xl font-bold text-text-primary mb-6">Lead Stats</h2>

            <div className="space-y-4">
                {/* Total Leads */}
                <div className="glass-effect p-4 rounded-lg">
                    <p className="text-3xl font-bold text-electric-cyan">{metrics.total}</p>
                    <p className="text-sm text-text-secondary mt-1">Total Leads</p>
                </div>

                {/* New Leads */}
                <div className="glass-effect p-4 rounded-lg">
                    <p className="text-3xl font-bold text-status-new">{metrics.new}</p>
                    <p className="text-sm text-text-secondary mt-1">New</p>
                </div>

                {/* Qualifying */}
                <div className="glass-effect p-4 rounded-lg">
                    <p className="text-3xl font-bold text-status-qualifying">{metrics.qualifying}</p>
                    <p className="text-sm text-text-secondary mt-1">Qualifying</p>
                </div>

                {/* Booked */}
                <div className="glass-effect p-4 rounded-lg">
                    <p className="text-3xl font-bold text-status-booked">{metrics.booked}</p>
                    <p className="text-sm text-text-secondary mt-1">Booked</p>
                </div>
            </div>

            {/* System Status */}
            <div className="mt-8 glass-effect p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-electric-cyan rounded-full animate-pulse"></div>
                    <p className="text-sm font-medium text-text-primary">System Online</p>
                </div>
                <p className="text-xs text-text-secondary">
                    Real-time monitoring active
                </p>
            </div>
        </div>
    );
}
