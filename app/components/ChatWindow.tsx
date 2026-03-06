'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase, subscribeToMessages } from '@/lib/supabase/client';
import type { Message, Lead } from '@/lib/supabase/types';

interface ChatWindowProps {
    lead: Lead | null;
    onToggleTakeover: (leadId: string, enabled: boolean) => void;
}

export default function ChatWindow({ lead, onToggleTakeover }: ChatWindowProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);
    const [manualMessage, setManualMessage] = useState('');
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!lead) {
            setMessages([]);
            return;
        }

        async function fetchMessages() {
            if (!lead) return;

            setLoading(true);
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .eq('lead_id', lead.id)
                .order('timestamp', { ascending: true });

            if (error) {
                console.error('Error fetching messages:', error);
            } else {
                setMessages(data || []);
            }
            setLoading(false);
        }

        fetchMessages();

        const channel = subscribeToMessages(lead.id, (payload) => {
            if (payload.eventType === 'INSERT') {
                setMessages((prev) => [...prev, payload.new as Message]);
            }
        });

        return () => {
            channel.unsubscribe();
        };
    }, [lead?.id]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendManualMessage = async () => {
        if (!lead || !manualMessage.trim()) return;

        setSending(true);
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
            const response = await fetch(`${apiUrl}/api/manual_message`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lead_id: lead.id,
                    message: manualMessage.trim(),
                }),
            });

            if (response.ok) {
                setManualMessage('');
            } else {
                const error = await response.json();
                alert(`Error: ${error.detail || 'Failed to send message'}`);
            }
        } catch (error) {
            console.error('Error sending manual message:', error);
            alert('Failed to send message');
        } finally {
            setSending(false);
        }
    };

    const handleToggleTakeover = async () => {
        if (!lead) return;
        onToggleTakeover(lead.id, !lead.is_manual_mode);
    };

    if (!lead) {
        return (
            <div className="flex-1 flex items-center justify-center bg-charcoal p-8">
                <div className="max-w-xl w-full">
                    <div className="mb-8 relative">
                        <div className="absolute inset-0 bg-electric-cyan/20 blur-[100px] rounded-full" />
                        <h2 className="text-3xl font-light text-text-primary mb-2 relative">Welcome back, Alex.</h2>
                        <p className="text-text-secondary relative">Select a lead from the sidebar to start engaging, or use the quick actions below.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 relative">
                        <div className="bg-surface/40 hover:bg-surface/60 transition-colors p-5 rounded-2xl border border-surface-light/30 cursor-pointer group">
                            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4 group-hover:bg-emerald-500/20 transition-colors">
                                <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                            </div>
                            <h3 className="text-sm font-medium text-text-primary mb-1">Create Test Lead</h3>
                            <p className="text-xs text-text-secondary">Simulate a new conversation in the sandbox environment.</p>
                        </div>

                        <div className="bg-surface/40 hover:bg-surface/60 transition-colors p-5 rounded-2xl border border-surface-light/30 cursor-pointer group">
                            <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center mb-4 group-hover:bg-indigo-500/20 transition-colors">
                                <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                            </div>
                            <h3 className="text-sm font-medium text-text-primary mb-1">View Analytics</h3>
                            <p className="text-xs text-text-secondary">Analyze conversion rates and AI response quality.</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col bg-charcoal relative">
            {/* Header */}
            <div className="px-6 py-5 border-b border-surface/50 bg-charcoal/80 backdrop-blur-xl z-10">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-medium text-text-primary tracking-tight">
                            {lead.name || lead.phone}
                        </h3>
                        <div className="flex items-center gap-3 mt-1">
                            <span className="text-[11px] font-mono text-text-secondary/70">{lead.lead_code}</span>
                            <span className="text-[11px] text-text-secondary">{lead.status}</span>
                        </div>
                    </div>
                    <button
                        onClick={handleToggleTakeover}
                        className={`px-4 py-2 text-sm rounded-full font-medium transition-all duration-300 ${lead.is_manual_mode
                            ? 'bg-electric-cyan text-charcoal shadow-[0_0_15px_rgba(56,189,248,0.4)]'
                            : 'bg-surface/50 text-text-primary hover:bg-surface border border-surface-light/30'
                            }`}
                    >
                        {lead.is_manual_mode ? '🔓 Release to AI' : '🔒 Takeover Chat'}
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-cyan"></div>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-text-secondary">
                        <p>No messages yet</p>
                    </div>
                ) : (
                    messages.map((message) => {
                        const isLead = message.sender_type === 'lead';

                        return (
                            <div
                                key={message.id}
                                className={`flex ${isLead ? 'justify-start' : 'justify-end'}`}
                            >
                                <div
                                    className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg glass-effect ${isLead
                                        ? 'bg-surface/50'
                                        : 'bg-electric-cyan/10 border-electric-cyan/30'
                                        }`}
                                >
                                    <p className="text-sm text-text-primary">{message.content}</p>
                                    <p className="text-xs mt-1 text-text-secondary">
                                        {message.timestamp ? new Date(message.timestamp).toLocaleTimeString() : ''} •{' '}
                                        {isLead ? 'Lead' : 'Bot'}
                                    </p>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Manual message input */}
            {lead.is_manual_mode && (
                <div className="p-4 border-t border-surface-light bg-surface">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={manualMessage}
                            onChange={(e) => setManualMessage(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSendManualMessage()}
                            placeholder="Type your message..."
                            className="flex-1 px-4 py-2 bg-charcoal border border-surface-light rounded-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-electric-cyan"
                            disabled={sending}
                        />
                        <button
                            onClick={handleSendManualMessage}
                            disabled={sending || !manualMessage.trim()}
                            className="px-6 py-2 bg-electric-cyan text-charcoal rounded-lg font-medium hover:bg-electric-cyan/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {sending ? 'Sending...' : 'Send'}
                        </button>
                    </div>
                    <p className="text-xs text-electric-cyan mt-2">
                        Manual mode active - AI responses paused
                    </p>
                </div>
            )}
        </div>
    );
}
