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
        <div className="w-80 bg-charcoal border-l border-surface/50 p-6 overflow-y-auto custom-scrollbar">
            <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-6">Overview</h2>

            <div className="grid grid-cols-2 gap-3">
                {/* Total Leads */}
                <div className="bg-surface/40 p-4 rounded-2xl flex flex-col justify-center">
                    <p className="text-3xl font-light text-text-primary mb-1">{metrics.total}</p>
                    <p className="text-[11px] font-medium text-text-secondary uppercase tracking-wider">Total Leads</p>
                </div>

                {/* New Leads */}
                <div className="bg-slate-500/5 p-4 rounded-2xl flex flex-col justify-center">
                    <p className="text-3xl font-light text-slate-300 mb-1">{metrics.new}</p>
                    <p className="text-[11px] font-medium text-text-secondary uppercase tracking-wider">New</p>
                </div>

                {/* Qualifying */}
                <div className="bg-amber-500/5 p-4 rounded-2xl flex flex-col justify-center">
                    <p className="text-3xl font-light text-amber-400 mb-1">{metrics.qualifying}</p>
                    <p className="text-[11px] font-medium text-text-secondary uppercase tracking-wider">Qualifying</p>
                </div>

                {/* Booked */}
                <div className="bg-emerald-500/5 p-4 rounded-2xl flex flex-col justify-center">
                    <p className="text-3xl font-light text-emerald-400 mb-1">{metrics.booked}</p>
                    <p className="text-[11px] font-medium text-text-secondary uppercase tracking-wider">Booked</p>
                </div>
            </div>

            {/* System Status */}
            <div className="mt-8 bg-surface/30 p-5 rounded-2xl">
                <div className="flex items-center gap-3 mb-2">
                    <div className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-electric-cyan opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-electric-cyan"></span>
                    </div>
                    <p className="text-sm font-medium text-text-primary">System Online</p>
                </div>
                <p className="text-xs text-text-secondary">
                    Real-time monitoring active
                </p>
            </div>
        </div>
    );
}
