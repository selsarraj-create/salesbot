'use client';

import { useState } from 'react';
import LeadsSidebar from './LeadsSidebar';
import ChatWindow from './ChatWindow';
import MetricsPanel from './MetricsPanel';
import { supabase } from '@/lib/supabase/client';
import type { Lead } from '@/lib/supabase/types';

export default function Dashboard() {
    const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

    const handleSelectLead = async (leadId: string) => {
        setSelectedLeadId(leadId);

        // Fetch full lead details
        const { data, error } = await supabase
            .from('leads')
            .select('*')
            .eq('id', leadId)
            .single();

        if (error) {
            console.error('Error fetching lead:', error);
        } else {
            setSelectedLead(data);
        }
    };

    const handleToggleTakeover = async (leadId: string, enabled: boolean) => {
        try {
            const response = await fetch('/api/toggle_takeover', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lead_id: leadId, enabled }),
            });

            if (response.ok) {
                // Update local state
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
        <div className="flex h-screen bg-charcoal">
            <LeadsSidebar
                selectedLeadId={selectedLeadId}
                onSelectLead={handleSelectLead}
            />
            <ChatWindow lead={selectedLead} onToggleTakeover={handleToggleTakeover} />
            <MetricsPanel />
        </div>
    );
}
