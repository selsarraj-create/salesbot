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
        if (!lead) { setMessages([]); return; }

        async function fetchMessages() {
            if (!lead) return;
            setLoading(true);
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .eq('lead_id', lead.id)
                .order('timestamp', { ascending: true });

            if (error) console.error('Error fetching messages:', error);
            else setMessages(data || []);
            setLoading(false);
        }

        fetchMessages();

        const channel = subscribeToMessages(lead.id, (payload) => {
            if (payload.eventType === 'INSERT') {
                setMessages((prev) => [...prev, payload.new as Message]);
            }
        });

        return () => { channel.unsubscribe(); };
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
                body: JSON.stringify({ lead_id: lead.id, message: manualMessage.trim() }),
            });
            if (response.ok) setManualMessage('');
            else {
                const error = await response.json();
                alert(`Error: ${error.detail || 'Failed to send message'}`);
            }
        } catch (error) {
            console.error('Error sending manual message:', error);
            alert('Failed to send message');
        } finally { setSending(false); }
    };

    /* ── Empty state ── */
    if (!lead) {
        return (
            <div className="rd-chat-empty">
                <div className="rd-chat-empty-inner">
                    <div className="rd-chat-empty-icon">💬</div>
                    <h2 className="rd-chat-empty-h2">Select a conversation</h2>
                    <p className="rd-chat-empty-p">
                        Choose a lead from the sidebar to view their conversation.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="rd-chat">
            {/* ── Chat header ── */}
            <div className="rd-chat-header">
                <div className="rd-chat-header-left">
                    <h3 className="rd-chat-header-name">
                        Conversation: {lead.name || lead.phone}
                        <span className="rd-chat-header-dot" />
                    </h3>
                    <span className="rd-chat-header-code">{lead.lead_code}</span>
                </div>
                <div className="rd-chat-header-right">
                    <button
                        onClick={() => onToggleTakeover(lead.id, !lead.is_manual_mode)}
                        className={`rd-takeover-btn ${lead.is_manual_mode ? 'rd-takeover-active' : ''}`}
                    >
                        {lead.is_manual_mode ? '🤖 Release to AI' : '🙋 Takeover'}
                    </button>
                </div>
            </div>

            {/* ── Messages ── */}
            <div className="rd-chat-messages">
                {loading ? (
                    <div className="rd-chat-loading">
                        <div className="rd-spinner" />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="rd-chat-no-messages">No messages yet</div>
                ) : (
                    messages.map((message) => {
                        const isLead = message.sender_type === 'lead';
                        const time = message.timestamp
                            ? new Date(message.timestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                            })
                            : '';
                        return (
                            <div
                                key={message.id}
                                className={`rd-msg ${isLead ? 'rd-msg-lead' : 'rd-msg-bot'}`}
                            >
                                {!isLead && (
                                    <span className="rd-msg-label">Bot:</span>
                                )}
                                <div className={`rd-msg-bubble ${isLead ? 'rd-bubble-lead' : 'rd-bubble-bot'}`}>
                                    {isLead && (
                                        <span className="rd-msg-sender-inline">
                                            {(lead.name || 'Lead').split(' ').map(w => w[0]).join('')}:
                                        </span>
                                    )}
                                    <span>{message.content}</span>
                                    {isLead && (
                                        <span className="rd-msg-avatar">
                                            {(lead.name || 'L').split(' ').map(w => w[0]).join('').slice(0, 2)}
                                        </span>
                                    )}
                                </div>
                                <span className="rd-msg-time">{time}</span>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* ── Input ── */}
            <div className="rd-chat-input-bar">
                <button className="rd-chat-attach" aria-label="Attach file">📎</button>
                <input
                    type="text"
                    value={manualMessage}
                    onChange={(e) => setManualMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendManualMessage()}
                    placeholder={lead.is_manual_mode ? 'Type your message…' : 'Enable takeover to send messages'}
                    className="rd-chat-input"
                    disabled={sending || !lead.is_manual_mode}
                />
                <button
                    onClick={handleSendManualMessage}
                    disabled={sending || !manualMessage.trim() || !lead.is_manual_mode}
                    className="rd-chat-send"
                    aria-label="Send message"
                >
                    ➤
                </button>
            </div>

            {lead.is_manual_mode && (
                <div className="rd-manual-indicator">
                    <span className="rd-manual-pulse" />
                    Manual mode active — AI paused
                </div>
            )}
        </div>
    );
}
