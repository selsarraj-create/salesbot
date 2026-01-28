'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { supabase, subscribeToMessages } from '@/lib/supabase/client';
import type { Message, Lead } from '@/lib/supabase/types';

import { Trash2 } from 'lucide-react';

interface TestChatWindowProps {
    lead: Lead | null;
    onDelete?: () => void;
}

export default function TestChatWindow({ lead, onDelete }: TestChatWindowProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [simulateLatency, setSimulateLatency] = useState(true);
    const [thinking, setThinking] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Fetch messages & Subscribe
    useEffect(() => {
        if (!lead) return;

        const fetchMessages = async () => {
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .eq('lead_id', lead.id)
                .order('timestamp', { ascending: true });

            if (error) {
                console.error('Error fetching messages:', error);
            } else {
                setMessages(data || []);

                // --- OUTBOUND INITIATION (If empty) ---
                if (data && data.length === 0) {
                    initiateOutbound(lead.id);
                }
            }
        };

        fetchMessages();

        const channel = subscribeToMessages(lead.id, (payload) => {
            const newMsg = payload.new as Message;
            setMessages((prev) => {
                // Deduplicate
                if (prev.find(m => m.id === newMsg.id)) return prev;
                return [...prev, newMsg];
            });
        });

        return () => {
            channel.unsubscribe();
        };
    }, [lead]);

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const initiateOutbound = async (leadId: string) => {
        console.log('Initiating outbound conversation for lead:', leadId);
        setThinking(true);
        try {
            // Extract metadata safely
            const meta = (lead?.lead_metadata as any) || {};

            const res = await fetch('/api/sandbox', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lead_id: leadId,
                    action: 'initiate',
                    lead_context: {
                        name: lead?.name,
                        age: meta.age || '22'
                    }
                })
            });

            if (res.ok) {
                const data = await res.json();
                if (data.response) {
                    // We rely on subscription to add the message, 
                    // but we can optimistic update if subscription is slow?
                    // Safe to wait for subscription usually, but let's be robust.
                }
            }
        } catch (e) {
            console.error('Failed to initiate:', e);
        } finally {
            setThinking(false);
        }
    };

    const handleDeleteLead = async () => {
        if (!lead || !onDelete) return;

        if (!window.confirm('Are you sure you want to delete this test lead? This cannot be undone.')) {
            return;
        }

        setDeleting(true);
        try {
            // Delete messages first (safeguard against no cascade)
            await supabase.from('messages').delete().eq('lead_id', lead.id);

            // Delete lead
            const { error } = await supabase.from('leads').delete().eq('id', lead.id);

            if (error) throw error;

            onDelete();
        } catch (error: any) {
            console.error('Error deleting lead:', error);
            alert('Failed to delete lead: ' + error.message);
        } finally {
            setDeleting(false);
        }
    };

    const handleSendMessage = async () => {
        if (!lead || !inputMessage.trim()) return;

        // Optimistic UI Update
        const optimisticId = 'opt-' + Date.now();
        const optimisticMsg: Message = {
            id: optimisticId,
            lead_id: lead.id,
            content: inputMessage.trim(),
            sender_type: 'lead',
            timestamp: new Date().toISOString(),
            is_otp_verified: false,
            sentiment_score: 0
        };
        setMessages(prev => [...prev, optimisticMsg]);
        setInputMessage('');

        setSending(true);
        setThinking(true);

        try {
            const response = await fetch('/api/sandbox', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lead_id: lead.id,
                    message: inputMessage.trim(), // Use inputMessage directly
                    simulate_latency: simulateLatency
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to send message');
            }

            const data = await response.json();
            console.log('Test chat response:', data);

            // Do NOT manually add bot response. 
            // The API inserts it into DB -> Subscription adds it.

        } catch (error: any) {
            console.error('Error sending test message:', error);
            alert(`Error: ${error.message}`);
        } finally {
            setThinking(false);
            setSending(false);
        }


    };

    if (!lead) {
        return (
            <Card className="h-full bg-surface border-surface-light">
                <CardContent className="flex items-center justify-center h-full">
                    <div className="text-center text-text-secondary">
                        <p className="text-lg font-medium">Select a test lead to start chatting</p>
                        <p className="text-sm mt-2">Create a test lead using the form on the left</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="h-full flex flex-col bg-surface border-surface-light">
            <CardHeader className="border-b border-surface-light">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-text-primary">
                            {lead.name || lead.phone}
                            <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">TEST</Badge>
                        </CardTitle>
                        <CardDescription className="text-text-secondary">
                            {lead.lead_code} • {lead.status} • ⚠️ No SMS Costs
                        </CardDescription>
                    </div>
                    {onDelete && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleDeleteLead}
                            disabled={deleting}
                            className="text-text-secondary hover:text-red-400 hover:bg-red-500/10"
                        >
                            <Trash2 className="h-5 w-5" />
                        </Button>
                    )}
                </div>
            </CardHeader>

            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-text-secondary">
                        <p>No messages yet. Start the conversation!</p>
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
                                    {/* Render Thought Process (Bot Only) */}
                                    {message.thought_content && (
                                        <div className="mb-2 p-2 rounded bg-black/20 border-l-2 border-blue-400/50">
                                            <p className="text-xs font-mono text-blue-300 whitespace-pre-wrap">
                                                {message.thought_content}
                                            </p>
                                        </div>
                                    )}

                                    <p className="text-sm text-text-primary whitespace-pre-wrap">{message.content}</p>
                                    <p className="text-xs mt-1 text-text-secondary">
                                        {message.timestamp ? new Date(message.timestamp).toLocaleTimeString() : ''} •{' '}
                                        {isLead ? 'Lead' : 'Bot'}
                                    </p>
                                </div>
                            </div>
                        );
                    })
                )}

                {thinking && (
                    <div className="flex justify-end">
                        <div className="max-w-xs lg:max-w-md px-4 py-3 rounded-lg glass-effect bg-surface/50">
                            <p className="text-sm text-text-secondary">Thinking...</p>
                            <div className="flex gap-1 mt-1">
                                <div className="w-2 h-2 bg-electric-cyan rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-electric-cyan rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                <div className="w-2 h-2 bg-electric-cyan rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </CardContent>

            <div className="border-t border-surface-light p-4 space-y-3">
                <div className="flex items-center gap-2">
                    <Switch
                        checked={simulateLatency}
                        onCheckedChange={setSimulateLatency}
                        id="latency-toggle"
                    />
                    <label htmlFor="latency-toggle" className="text-sm cursor-pointer text-text-primary">
                        Simulate SMS Latency (1-3s delay)
                    </label>
                </div>

                <div className="flex gap-2">
                    <Input
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && !sending && handleSendMessage()}
                        placeholder="Type your message..."
                        disabled={sending}
                        className="bg-charcoal border-surface-light text-text-primary"
                    />
                    <Button
                        onClick={handleSendMessage}
                        disabled={sending || !inputMessage.trim()}
                        className="bg-electric-cyan text-charcoal hover:bg-electric-cyan/90"
                    >
                        {sending ? 'Sending...' : 'Send'}
                    </Button>
                </div>
            </div>
        </Card>
    );
}
