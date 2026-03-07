'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/auth-context';

interface Reason {
    label: string;
    count: number;
    color: string;
}

export default function LostReasons() {
    const { user } = useAuth();
    const [reasons, setReasons] = useState<Reason[]>([]);

    useEffect(() => {
        if (!user) return;

        async function fetchReasons() {
            const { data: leads } = await supabase
                .from('leads')
                .select('status, follow_up_count, last_contacted_at')
                .neq('status', 'Booked')
                .neq('is_test', true);

            if (!leads) return;

            const all = leads as any[];
            const now = Date.now();
            const DAY = 86400000;

            let ghosted = 0;
            let distanceObj = 0;
            let humanReq = 0;
            let qualifying = 0;
            let newLeads = 0;
            let other = 0;

            for (const l of all) {
                if (l.status === 'Human_Required') {
                    humanReq++;
                } else if (l.status === 'Objection_Distance') {
                    distanceObj++;
                } else if (l.status === 'Qualifying') {
                    qualifying++;
                } else if (l.status === 'New') {
                    // Check if ghosted (no reply 7d+)
                    const lastContact = l.last_contacted_at ? new Date(l.last_contacted_at).getTime() : 0;
                    if (lastContact > 0 && now - lastContact > 7 * DAY) {
                        ghosted++;
                    } else {
                        newLeads++;
                    }
                } else {
                    // Check ghosted by follow-up count
                    if ((l.follow_up_count || 0) >= 3) {
                        ghosted++;
                    } else {
                        other++;
                    }
                }
            }

            setReasons([
                { label: 'Ghosted (7d+)', count: ghosted, color: '#94a3b8' },
                { label: 'Distance Objection', count: distanceObj, color: '#f59e0b' },
                { label: 'Human Required', count: humanReq, color: '#ef4444' },
                { label: 'Still Qualifying', count: qualifying, color: '#3b82f6' },
                { label: 'New (No Reply Yet)', count: newLeads, color: '#10b981' },
                { label: 'Other', count: other, color: '#8b5cf6' },
            ].filter(r => r.count > 0));
        }

        fetchReasons();
    }, [user]);

    const total = reasons.reduce((sum, r) => sum + r.count, 0);

    return (
        <div className="rd-analytics-card">
            <h3 className="rd-analytics-card-title">❌ Why They Didn't Book</h3>
            {reasons.length === 0 ? (
                <p className="rd-analytics-empty">Everyone booked! 🎉</p>
            ) : (
                <div className="rd-lost-reasons">
                    {reasons.map(r => (
                        <div key={r.label} className="rd-lost-row">
                            <div className="rd-lost-bar-wrap">
                                <div
                                    className="rd-lost-bar"
                                    style={{
                                        width: `${Math.max((r.count / total) * 100, 6)}%`,
                                        backgroundColor: r.color,
                                    }}
                                />
                            </div>
                            <span className="rd-lost-label">{r.label}</span>
                            <span className="rd-lost-count">{r.count}</span>
                            <span className="rd-lost-pct">
                                {Math.round((r.count / total) * 100)}%
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
