'use client';

import { useState } from 'react';
import LeadsSidebar from './LeadsSidebar';
import ChatWindow from './ChatWindow';
import MetricsPanel from './MetricsPanel';
import AiPerformance from './analytics/AiPerformance';
import ConversionFunnel from './analytics/ConversionFunnel';
import BookingsFeed from './analytics/BookingsFeed';
import LostReasons from './analytics/LostReasons';
import { supabase } from '@/lib/supabase/client';
import type { Lead } from '@/lib/supabase/types';

export default function Dashboard() {
    const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [showAnalytics, setShowAnalytics] = useState(true);

    const handleSelectLead = async (leadId: string) => {
        setSelectedLeadId(leadId);
        const { data, error } = await supabase
            .from('leads')
            .select('*')
            .eq('id', leadId)
            .single();

        if (error) console.error('Error fetching lead:', error);
        else setSelectedLead(data);
    };

    const handleToggleTakeover = async (leadId: string, enabled: boolean) => {
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
            const response = await fetch(`${apiUrl}/api/toggle_takeover`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lead_id: leadId, enabled }),
            });

            if (response.ok) {
                setSelectedLead((prev) =>
                    prev ? { ...prev, is_manual_mode: enabled } : null
                );
            } else {
                const error = await response.json();
                alert(`Error: ${error.detail || 'Failed to toggle takeover'}`);
            }
        } catch (error) {
            console.error('Error toggling takeover:', error);
            alert('Failed to toggle takeover');
        }
    };

    return (
        <div className="rd-app">
            <LeadsSidebar
                selectedLeadId={selectedLeadId}
                onSelectLead={handleSelectLead}
            />

            <div className="rd-main">
                {/* ── Top bar ── */}
                <header className="rd-topbar">
                    <h1 className="rd-topbar-title">Dashboard</h1>
                    <div className="rd-topbar-right">
                        <button
                            className={`rd-topbar-toggle ${showAnalytics ? 'active' : ''}`}
                            onClick={() => setShowAnalytics(!showAnalytics)}
                        >
                            📊 Analytics
                        </button>
                        <button className="rd-topbar-icon" aria-label="Notifications">
                            🔔
                        </button>
                        <div className="rd-topbar-avatar">
                            <span>RD</span>
                        </div>
                    </div>
                </header>

                {/* ── Content area ── */}
                <div className="rd-content-wrap">
                    {showAnalytics ? (
                        <div className="rd-analytics-view">
                            {/* Top row: AI Performance full-width */}
                            <AiPerformance />

                            {/* Grid: Funnel + Bookings */}
                            <div className="rd-analytics-grid">
                                <ConversionFunnel />
                                <BookingsFeed />
                            </div>

                            {/* Bottom: Lost Reasons */}
                            <LostReasons />
                        </div>
                    ) : (
                        <div className="rd-content">
                            <ChatWindow lead={selectedLead} onToggleTakeover={handleToggleTakeover} />
                            <MetricsPanel />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
