'use client';

import { useEffect, useState } from 'react';
import { supabase, subscribeToLeads } from '@/lib/supabase/client';
import type { Lead, LeadStatus } from '@/lib/supabase/types';

interface LeadsSidebarProps {
    selectedLeadId: string | null;
    onSelectLead: (leadId: string) => void;
}

const STATUS_COLORS: Record<LeadStatus, string> = {
    'New': 'bg-status-new',
    'Qualifying': 'bg-status-qualifying',
    'Booking_Offered': 'bg-status-booking',
    'Booked': 'bg-status-booked',
    'Objection_Distance': 'bg-status-distance',
    'Human_Required': 'bg-status-human',
};

const STATUS_LABELS: Record<LeadStatus, string> = {
    'New': 'New',
    'Qualifying': 'Qualifying',
    'Booking_Offered': 'Booking',
    'Booked': 'Booked',
    'Objection_Distance': 'Distance',
    'Human_Required': 'Human',
};

export default function LeadsSidebar({ selectedLeadId, onSelectLead }: LeadsSidebarProps) {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fetch initial leads
        async function fetchLeads() {
            const { data, error } = await supabase
                .from('leads')
                .select('*')
                .order('updated_at', { ascending: false });

            if (error) {
                console.error('Error fetching leads:', error);
            } else {
                setLeads(data || []);
            }
            setLoading(false);
        }

        fetchLeads();

        // Subscribe to real-time updates
        const channel = subscribeToLeads((payload) => {
            console.log('Lead update:', payload);

            if (payload.eventType === 'INSERT') {
                setLeads((prev) => [payload.new as Lead, ...prev]);
            } else if (payload.eventType === 'UPDATE') {
                setLeads((prev) =>
                    prev.map((lead) =>
                        lead.id === payload.new.id ? (payload.new as Lead) : lead
                    )
                );
            } else if (payload.eventType === 'DELETE') {
                setLeads((prev) => prev.filter((lead) => lead.id !== payload.old.id));
            }
        });

        return () => {
            channel.unsubscribe();
        };
    }, []);

    if (loading) {
        return (
            <div className="w-80 bg-surface border-r border-surface-light p-4">
                <div className="animate-pulse">
                    <div className="h-8 bg-surface-light rounded mb-4"></div>
                    <div className="space-y-3">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="h-20 bg-surface-light rounded"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-80 bg-surface border-r border-surface-light flex flex-col h-screen">
            <div className="p-4 border-b border-surface-light">
                <h2 className="text-xl font-bold text-text-primary">Active Leads</h2>
                <p className="text-sm text-text-secondary">{leads.length} total</p>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
                {leads.length === 0 ? (
                    <div className="text-center text-text-secondary mt-8">
                        <p>No leads yet</p>
                        <p className="text-sm">Waiting for SMS messages...</p>
                    </div>
                ) : (
                    leads.map((lead) => (
                        <button
                            key={lead.id}
                            onClick={() => onSelectLead(lead.id)}
                            className={`w-full text-left p-3 rounded-lg border transition-all ${selectedLeadId === lead.id
                                    ? 'glow-active border-electric-cyan/50'
                                    : 'bg-charcoal border-surface-light hover:bg-surface-light hover:border-electric-cyan/30'
                                }`}
                        >
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                    <p className="font-semibold text-text-primary">
                                        {lead.name || lead.phone}
                                    </p>
                                    {lead.name && (
                                        <p className="text-xs text-text-secondary">{lead.phone}</p>
                                    )}
                                </div>
                                <div className="flex gap-1">
                                    {lead.is_test && (
                                        <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded border border-yellow-500/30">
                                            TEST
                                        </span>
                                    )}
                                    {lead.is_manual_mode && (
                                        <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded border border-purple-500/30">
                                            Manual
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <span
                                    className={`text-xs px-2 py-1 rounded text-white ${STATUS_COLORS[lead.status]
                                        }`}
                                >
                                    {STATUS_LABELS[lead.status]}
                                </span>
                                <span className="text-xs text-text-secondary">{lead.lead_code}</span>
                            </div>
                        </button>
                    ))
                )}
            </div>
        </div>
    );
}
