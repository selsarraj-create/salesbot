'use client';

import { useState, useEffect } from 'react';
import TestLeadForm from '../components/TestLeadForm';
import TestChatWindow from '../components/TestChatWindow';
import { supabase } from '@/lib/supabase/client';
import type { Lead } from '@/lib/supabase/types';
import { Badge } from '@/components/ui/badge';

export default function TestingPage() {
    const [testLeads, setTestLeads] = useState<Lead[]>([]);
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchTestLeads = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('leads')
            .select('*')
            .eq('is_test', true)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching test leads:', error);
        } else {
            setTestLeads(data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchTestLeads();

        const channel = supabase
            .channel('test-leads-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'leads',
                    filter: 'is_test=eq.true',
                },
                () => {
                    fetchTestLeads();
                }
            )
            .subscribe();

        return () => {
            channel.unsubscribe();
        };
    }, []);

    return (
        <div className="min-h-screen bg-charcoal p-6">
            {/* Warning Banner */}
            <div className="mb-6 bg-yellow-500/10 border-l-4 border-yellow-500 p-4 rounded">
                <div className="flex">
                    <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <div className="ml-3">
                        <h3 className="text-sm font-medium text-yellow-400">Testing Sandbox Mode</h3>
                        <div className="mt-2 text-sm text-yellow-300">
                            <p>
                                All leads created here are marked as test leads. They will NOT trigger actual SMS messages or incur Twilio costs.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Lead Generator + Test Lead List */}
                <div className="space-y-6">
                    <TestLeadForm onLeadCreated={fetchTestLeads} />

                    {/* Test Leads List */}
                    <div className="bg-surface rounded-lg border border-surface-light p-4">
                        <h3 className="font-semibold text-text-primary mb-4">Test Leads ({testLeads.length})</h3>
                        {loading ? (
                            <p className="text-sm text-text-secondary">Loading...</p>
                        ) : testLeads.length === 0 ? (
                            <p className="text-sm text-text-secondary">No test leads yet. Create one above!</p>
                        ) : (
                            <div className="space-y-2">
                                {testLeads.map((lead) => (
                                    <button
                                        key={lead.id}
                                        onClick={() => setSelectedLead(lead)}
                                        className={`w-full text-left p-3 rounded-lg border transition-all ${selectedLead?.id === lead.id
                                                ? 'glow-active border-electric-cyan/50'
                                                : 'bg-charcoal border-surface-light hover:bg-surface-light hover:border-electric-cyan/30'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <p className="font-medium text-sm text-text-primary">{lead.name || lead.phone}</p>
                                            <Badge variant="secondary" className="text-xs bg-yellow-500/20 text-yellow-400 border-yellow-500/30">TEST</Badge>
                                        </div>
                                        <p className="text-xs text-text-secondary">{lead.lead_code}</p>
                                        <p className="text-xs text-text-secondary mt-1">{lead.status}</p>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Test Chat Window */}
                <div className="lg:col-span-2 h-[calc(100vh-200px)]">
                    <TestChatWindow lead={selectedLead} />
                </div>
            </div>
        </div>
    );
}
