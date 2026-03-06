'use client';

import { useState, useEffect } from 'react';
import TestLeadForm from '../components/TestLeadForm';
import TestChatWindow from '../components/TestChatWindow';
import { supabase } from '@/lib/supabase/client';
import type { Lead } from '@/lib/supabase/types';
import { Badge } from '@/components/ui/badge';
import { Trash2, CheckSquare, Square, MinusSquare } from 'lucide-react';

export default function TestingPage() {
    const [testLeads, setTestLeads] = useState<Lead[]>([]);
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(false);

    const isAllChecked = testLeads.length > 0 && checkedIds.size === testLeads.length;
    const isSomeChecked = checkedIds.size > 0 && checkedIds.size < testLeads.length;

    const toggleCheck = (e: React.MouseEvent, leadId: string) => {
        e.stopPropagation();
        setCheckedIds(prev => {
            const next = new Set(prev);
            if (next.has(leadId)) next.delete(leadId);
            else next.add(leadId);
            return next;
        });
    };

    const toggleAll = () => {
        if (isAllChecked || isSomeChecked) {
            setCheckedIds(new Set());
        } else {
            setCheckedIds(new Set(testLeads.map(l => l.id)));
        }
    };

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

    const deleteByIds = async (ids: string[]) => {
        setDeleting(true);
        try {
            const { error: msgError } = await supabase
                .from('messages')
                .delete()
                .in('lead_id', ids);
            if (msgError) console.error('Error deleting messages:', msgError);

            const { error: leadError } = await supabase
                .from('leads')
                .delete()
                .in('id', ids);

            if (leadError) {
                console.error('Error deleting leads:', leadError);
                alert('Failed to delete leads');
            } else {
                if (selectedLead && ids.includes(selectedLead.id)) setSelectedLead(null);
                setTestLeads(prev => prev.filter(l => !ids.includes(l.id)));
                setCheckedIds(new Set());
            }
        } catch (err) {
            console.error('Delete error:', err);
            alert('Failed to delete leads');
        } finally {
            setDeleting(false);
        }
    };

    const deleteSelected = async () => {
        const ids = Array.from(checkedIds);
        if (!confirm(`Delete ${ids.length} selected test lead${ids.length > 1 ? 's' : ''} and their messages? This cannot be undone.`)) return;
        await deleteByIds(ids);
    };

    const deleteAllTestLeads = async () => {
        if (!confirm(`Delete all ${testLeads.length} test leads and their messages? This cannot be undone.`)) return;
        await deleteByIds(testLeads.map(l => l.id));
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
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                {testLeads.length > 0 && (
                                    <button onClick={toggleAll} className="text-text-muted-dark hover:text-brand-blue transition-colors" title={isAllChecked ? 'Deselect all' : 'Select all'}>
                                        {isAllChecked ? (
                                            <CheckSquare className="w-5 h-5 text-brand-blue" />
                                        ) : isSomeChecked ? (
                                            <MinusSquare className="w-5 h-5 text-brand-blue" />
                                        ) : (
                                            <Square className="w-5 h-5" />
                                        )}
                                    </button>
                                )}
                                <h3 className="font-semibold text-text-dark">Test Leads ({testLeads.length})</h3>
                            </div>
                            <div className="flex items-center gap-2">
                                {checkedIds.size > 0 && (
                                    <button
                                        onClick={deleteSelected}
                                        disabled={deleting}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-rose-500 hover:bg-rose-600 rounded-lg transition-colors disabled:opacity-50 shadow-sm"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        {deleting ? 'Deleting...' : `Delete Selected (${checkedIds.size})`}
                                    </button>
                                )}
                                {testLeads.length > 0 && checkedIds.size === 0 && (
                                    <button
                                        onClick={deleteAllTestLeads}
                                        disabled={deleting}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors disabled:opacity-50"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        {deleting ? 'Deleting...' : 'Delete All'}
                                    </button>
                                )}
                            </div>
                        </div>
                        {loading ? (
                            <p className="text-sm text-text-muted-dark">Loading...</p>
                        ) : testLeads.length === 0 ? (
                            <p className="text-sm text-text-muted-dark">No test leads yet. Create one above!</p>
                        ) : (
                            <div className="space-y-2.5">
                                {testLeads.map((lead) => {
                                    const isChecked = checkedIds.has(lead.id);
                                    return (
                                        <div
                                            key={lead.id}
                                            className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all group cursor-pointer ${isChecked
                                                    ? 'bg-rose-50/50 border-rose-200'
                                                    : selectedLead?.id === lead.id
                                                        ? 'bg-brand-blue/5 border-brand-blue ring-1 ring-brand-blue/50 shadow-sm'
                                                        : 'bg-white border-gray-100 hover:bg-gray-50 hover:border-brand-blue/30'
                                                }`}
                                            onClick={() => setSelectedLead(lead)}
                                        >
                                            {/* Checkbox */}
                                            <button
                                                onClick={(e) => toggleCheck(e, lead.id)}
                                                className="mt-0.5 shrink-0 text-text-muted-dark hover:text-brand-blue transition-colors"
                                            >
                                                {isChecked ? (
                                                    <CheckSquare className="w-4.5 h-4.5 text-rose-500" />
                                                ) : (
                                                    <Square className="w-4.5 h-4.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                )}
                                            </button>

                                            {/* Lead info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <p className="font-medium text-[15px] text-text-dark truncate">{lead.name || lead.phone}</p>
                                                    <Badge variant="secondary" className="text-xs bg-yellow-50 text-yellow-600 border-yellow-200 shrink-0">TEST</Badge>
                                                </div>
                                                <p className="text-xs font-mono text-text-muted-dark/80">{lead.lead_code}</p>
                                                <p className="text-xs font-medium text-text-muted-dark mt-1.5">{lead.status}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Test Chat Window */}
                <div className="lg:col-span-2 h-[calc(100vh-200px)]">
                    <TestChatWindow
                        lead={selectedLead}
                        onDelete={() => { setSelectedLead(null); fetchTestLeads(); }}
                    />
                </div>
            </div>
        </div>
    );
}
