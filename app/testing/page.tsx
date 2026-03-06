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
        <div className="min-h-screen bg-panel-bg p-6">
            {/* Warning Banner */}
            <div className="mb-6 bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
                <div className="flex">
                    <div className="shrink-0">
                        <svg className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <div className="ml-3">
                        <h3 className="text-sm font-semibold text-blue-700">Testing Sandbox Mode</h3>
                        <div className="mt-1 text-sm text-blue-600/80">
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
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                        <h3 className="font-semibold text-text-dark mb-4">Test Leads ({testLeads.length})</h3>
                        {loading ? (
                            <p className="text-sm text-text-muted-dark">Loading...</p>
                        ) : testLeads.length === 0 ? (
                            <p className="text-sm text-text-muted-dark">No test leads yet. Create one above!</p>
                        ) : (
                            <div className="space-y-2.5">
                                {testLeads.map((lead) => (
                                    <button
                                        key={lead.id}
                                        onClick={() => setSelectedLead(lead)}
                                        className={`w-full text-left p-3.5 rounded-xl border transition-all ${selectedLead?.id === lead.id
                                            ? 'bg-brand-blue/5 border-brand-blue ring-1 ring-brand-blue/50 shadow-sm'
                                            : 'bg-white border-gray-100 hover:bg-gray-50 hover:border-brand-blue/30'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between mb-1.5">
                                            <p className="font-medium text-[15px] text-text-dark">{lead.name || lead.phone}</p>
                                            <Badge variant="secondary" className="text-xs bg-yellow-50 text-yellow-600 border-yellow-200">TEST</Badge>
                                        </div>
                                        <p className="text-xs font-mono text-text-muted-dark/80">{lead.lead_code}</p>
                                        <p className="text-xs font-medium text-text-muted-dark mt-1.5">{lead.status}</p>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Test Chat Window */}
                <div className="lg:col-span-2 h-[calc(100vh-200px)]">
                    <TestChatWindow
                        lead={selectedLead}
                        onDelete={() => setSelectedLead(null)}
                    />
                </div>
            </div>
        </div>
    );
}
