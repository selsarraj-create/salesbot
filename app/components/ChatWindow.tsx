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
            const response = await fetch('/api/manual_message', {
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
            <div className="flex-1 flex items-center justify-center bg-charcoal">
                <div className="text-center text-text-secondary">
                    <svg
                        className="mx-auto h-12 w-12 text-text-secondary mb-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                        />
                    </svg>
                    <p className="text-lg font-medium">Select a lead to view conversation</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col bg-charcoal">
            {/* Header */}
            <div className="p-4 border-b border-surface-light bg-surface">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-text-primary">
                            {lead.name || lead.phone}
                        </h3>
                        <p className="text-sm text-text-secondary">
                            {lead.lead_code} • {lead.status}
                        </p>
                    </div>
                    <button
                        onClick={handleToggleTakeover}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${lead.is_manual_mode
                            ? 'bg-electric-cyan text-charcoal hover:bg-electric-cyan/90 shadow-glow'
                            : 'bg-surface-light text-text-primary hover:bg-surface border border-surface-light'
                            }`}
                    >
                        {lead.is_manual_mode ? '🔓 Release' : '🔒 Takeover'}
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
                                        : isHuman
                                            ? 'bg-purple-500/20 border-purple-500/30'
                                            : 'bg-electric-cyan/10 border-electric-cyan/30'
                                        }`}
                                >
                                    <p className="text-sm text-text-primary">{message.content}</p>
                                    <p className="text-xs mt-1 text-text-secondary">
                                        {new Date(message.timestamp).toLocaleTimeString()} •{' '}
                                        {isHuman ? 'You' : isLead ? 'Lead' : 'Bot'}
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
