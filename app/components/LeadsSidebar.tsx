'use client';

import { useEffect, useState } from 'react';
import { supabase, subscribeToLeads } from '@/lib/supabase/client';
import type { Lead, LeadStatus } from '@/lib/supabase/types';

interface LeadsSidebarProps {
    selectedLeadId: string | null;
    onSelectLead: (leadId: string) => void;
}

const STATUS_COLORS: Record<LeadStatus, string> = {
    'New': 'bg-slate-500/10 text-slate-300',
    'Qualifying': 'bg-amber-500/10 text-amber-400',
    'Booking_Offered': 'bg-indigo-500/10 text-indigo-400',
    'Booked': 'bg-emerald-500/10 text-emerald-400',
    'Objection_Distance': 'bg-rose-500/10 text-rose-400',
    'Human_Required': 'bg-red-500/10 text-red-500',
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
                .order('priority_score', { ascending: false, nullsFirst: false })
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
            <div className="w-80 bg-sidebar-bg border-r border-sidebar-surface p-4">
                <div className="animate-pulse">
                    <div className="h-8 bg-sidebar-surface rounded mb-4"></div>
                    <div className="space-y-3">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="h-20 bg-sidebar-surface rounded"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-80 bg-sidebar-bg border-r border-sidebar-surface flex flex-col h-screen">
            <div className="p-5 border-b border-sidebar-surface">
                <h2 className="text-xl font-semibold text-text-light tracking-tight">Active Leads</h2>
                <p className="text-sm text-text-muted-light mt-1">{leads.length} total</p>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1">
                {leads.length === 0 ? (
                    <div className="text-center text-text-muted-light mt-8">
                        <p>No leads yet</p>
                        <p className="text-sm">Waiting for SMS messages...</p>
                    </div>
                ) : (
                    leads.map((lead) => (
                        <button
                            key={lead.id}
                            onClick={() => onSelectLead(lead.id)}
                            className={`w-full text-left p-4 rounded-xl transition-all duration-200 group ${selectedLeadId === lead.id
                                ? 'bg-brand-blue shadow-sm'
                                : 'bg-transparent hover:bg-sidebar-surface'
                                }`}
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1 min-w-0 pr-2">
                                    <h3 className={`text-base font-medium truncate ${selectedLeadId === lead.id ? 'text-white' : 'text-text-light'}`}>
                                        {lead.name || lead.phone}
                                    </h3>
                                    {lead.name && (
                                        <p className={`text-xs mt-0.5 truncate ${selectedLeadId === lead.id ? 'text-blue-100' : 'text-text-muted-light'}`}>{lead.phone}</p>
                                    )}
                                </div>
                                <div className="text-right flex flex-col items-end gap-1 shrink-0">
                                    <span className={`text-[10px] font-mono ${selectedLeadId === lead.id ? 'text-blue-200' : 'text-text-muted-light/70'}`}>{lead.lead_code}</span>
                                    {(lead.priority_score || 0) > 0 && (
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${(lead.priority_score || 0) >= 80 ? 'text-emerald-400 bg-emerald-400/10' :
                                            (lead.priority_score || 0) >= 50 ? 'text-amber-400 bg-amber-400/10' :
                                                (selectedLeadId === lead.id ? 'text-blue-200 bg-white/10' : 'text-text-muted-light bg-sidebar-surface')
                                            }`}>
                                            ★ {lead.priority_score}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center justify-between mt-auto">
                                <div className="flex gap-1.5">
                                    {lead.is_test && (
                                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${selectedLeadId === lead.id ? 'bg-white/20 text-white' : 'bg-amber-500/10 text-amber-500'}`}>
                                            TEST
                                        </span>
                                    )}
                                    {lead.is_manual_mode && (
                                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${selectedLeadId === lead.id ? 'bg-white/20 text-white' : 'bg-purple-500/10 text-purple-400'}`}>
                                            MANUAL
                                        </span>
                                    )}
                                </div>
                                <span
                                    className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full ${STATUS_COLORS[lead.status as LeadStatus]
                                        }`}
                                >
                                    {STATUS_LABELS[lead.status as LeadStatus]}
                                </span>
                            </div>
                        </button>
                    ))
                )}
            </div>
        </div>
    );
}
