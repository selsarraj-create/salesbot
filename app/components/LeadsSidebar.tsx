'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { supabase, subscribeToLeads } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/auth-context';
import type { Lead, LeadStatus } from '@/lib/supabase/types';

interface LeadsSidebarProps {
    selectedLeadId: string | null;
    onSelectLead: (leadId: string) => void;
}

const STATUS_DOT: Record<LeadStatus, string> = {
    'New': 'bg-slate-400',
    'Qualifying': 'bg-amber-400',
    'Booking_Offered': 'bg-indigo-400',
    'Booked': 'bg-emerald-400',
    'Objection_Distance': 'bg-orange-400',
    'Human_Required': 'bg-rose-500',
};

const STATUS_LABELS: Record<LeadStatus, string> = {
    'New': 'New',
    'Qualifying': 'Qualifying',
    'Booking_Offered': 'Booking',
    'Booked': 'Booked',
    'Objection_Distance': 'Distance',
    'Human_Required': 'Human',
};

const NAV_ITEMS = [
    { href: '/', label: 'Dashboard', icon: '📊' },
    { href: '/testing', label: 'Inbox', icon: '📥' },
    { href: '/training', label: 'Training', icon: '⚡' },
];

export default function LeadsSidebar({ selectedLeadId, onSelectLead }: LeadsSidebarProps) {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const pathname = usePathname();
    const { user, profile } = useAuth();

    const handleSignOut = async () => {
        try {
            await supabase.auth.signOut();
        } catch (error) {
            console.error('Error during global sign out:', error);
        } finally {
            // Force local cleanup just in case
            localStorage.clear();
            window.location.href = '/login';
        }
    };

    useEffect(() => {
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

        const channel = subscribeToLeads((payload) => {
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

        return () => { channel.unsubscribe(); };
    }, []);

    return (
        <aside className="rd-sidebar">
            {/* ── Logo ── */}
            <div className="rd-sidebar-logo">
                <span className="rd-sidebar-logo-icon">💬</span>
                <span className="rd-sidebar-logo-text">Reply Desk</span>
            </div>

            {/* ── Nav ── */}
            <nav className="rd-sidebar-nav">
                {NAV_ITEMS.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`rd-sidebar-nav-item ${isActive ? 'rd-active' : ''}`}
                        >
                            <span className="rd-sidebar-nav-icon">{item.icon}</span>
                            <span>{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* ── Leads section ── */}
            <div className="rd-sidebar-leads-header">
                <span className="rd-sidebar-leads-title">LEADS</span>
                <span className="rd-sidebar-leads-count">{leads.length}</span>
            </div>

            <div className="rd-sidebar-leads-list">
                {loading ? (
                    <div className="rd-sidebar-loading">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="rd-skeleton-lead" />
                        ))}
                    </div>
                ) : leads.length === 0 ? (
                    <div className="rd-sidebar-empty">
                        <p>No leads yet</p>
                        <p className="rd-sidebar-empty-sub">Waiting for messages…</p>
                    </div>
                ) : (
                    leads.map((lead) => {
                        const isSelected = selectedLeadId === lead.id;
                        return (
                            <button
                                key={lead.id}
                                onClick={() => onSelectLead(lead.id)}
                                className={`rd-lead-card ${isSelected ? 'rd-lead-active' : ''}`}
                            >
                                <div className="rd-lead-row">
                                    <span className={`rd-lead-dot ${STATUS_DOT[lead.status as LeadStatus] || 'bg-slate-400'}`} />
                                    <div className="rd-lead-info">
                                        <span className="rd-lead-name">{lead.name || lead.phone}</span>
                                        <span className="rd-lead-meta">
                                            {STATUS_LABELS[lead.status as LeadStatus] || lead.status}
                                            {lead.is_manual_mode && ' · Manual'}
                                        </span>
                                    </div>
                                </div>
                            </button>
                        );
                    })
                )}
            </div>

            {/* ── Sign out ── */}
            {user && (
                <div className="rd-sidebar-footer">
                    <div className="rd-sidebar-user">
                        <span className="rd-sidebar-user-email">
                            {profile?.display_name || user.email}
                        </span>
                    </div>
                    <button onClick={handleSignOut} className="rd-sidebar-signout">
                        🚪 Sign Out
                    </button>
                </div>
            )}
        </aside>
    );
}
