'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/auth-context';

interface FunnelStep {
    label: string;
    count: number;
    color: string;
}

export default function ConversionFunnel() {
    const { user } = useAuth();
    const [steps, setSteps] = useState<FunnelStep[]>([]);

    useEffect(() => {
        if (!user) return;

        async function fetchFunnel() {
            const { data: leads, error } = await supabase
                .from('leads')
                .select('status')
                .neq('is_test', true);

            if (error || !leads) return;

            const all = leads as any[];
            const total = all.length;
            const newCount = all.filter(l => l.status === 'New').length;
            const qualifying = all.filter(l => l.status === 'Qualifying').length;
            const offered = all.filter(l => l.status === 'Booking_Offered').length;
            const booked = all.filter(l => l.status === 'Booked').length;
            const human = all.filter(l => l.status === 'Human_Required').length;

            setSteps([
                { label: 'Total Leads', count: total, color: '#6366f1' },
                { label: 'New', count: newCount, color: '#818cf8' },
                { label: 'Qualifying', count: qualifying, color: '#3b82f6' },
                { label: 'Booking Offered', count: offered, color: '#f59e0b' },
                { label: 'Booked', count: booked, color: '#10b981' },
                { label: 'Human Required', count: human, color: '#ef4444' },
            ]);
        }

        fetchFunnel();
    }, [user]);

    const maxCount = steps.length > 0 ? Math.max(...steps.map(s => s.count), 1) : 1;

    return (
        <div className="rd-analytics-card">
            <h3 className="rd-analytics-card-title">📊 Conversion Funnel</h3>
            <div className="rd-funnel">
                {steps.map((step, i) => (
                    <div key={step.label} className="rd-funnel-row">
                        <span className="rd-funnel-label">{step.label}</span>
                        <div className="rd-funnel-bar-wrap">
                            <div
                                className="rd-funnel-bar"
                                style={{
                                    width: `${Math.max((step.count / maxCount) * 100, 4)}%`,
                                    backgroundColor: step.color,
                                }}
                            />
                        </div>
                        <span className="rd-funnel-count">{step.count}</span>
                        {i > 0 && steps[0].count > 0 && (
                            <span className="rd-funnel-pct">
                                {Math.round((step.count / steps[0].count) * 100)}%
                            </span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
