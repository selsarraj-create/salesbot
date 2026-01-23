'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { supabase, subscribeToMessages } from '@/lib/supabase/client';
import type { Message, Lead } from '@/lib/supabase/types';

interface TestChatWindowProps {
    lead: Lead | null;
}

export default function TestChatWindow({ lead }: TestChatWindowProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [simulateLatency, setSimulateLatency] = useState(true);
    const [thinking, setThinking] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!lead) {
            setMessages([]);
            return;
        }

        async function fetchMessages() {
            if (!lead) return;

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
        }

        fetchMessages();

        const channel = subscribeToMessages(lead.id, (payload) => {
            if (payload.eventType === 'INSERT') {
                setMessages((prev) => [...prev, payload.new as Message]);
                setThinking(false);
            }
        });

        return () => {
            channel.unsubscribe();
        };
    }, [lead?.id]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, thinking]);

    const handleSendMessage = async () => {
        if (!lead || !inputMessage.trim()) return;

        setSending(true);
        setThinking(true);

        try {
            const response = await fetch('/api/test_chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lead_id: lead.id,
                    message: inputMessage.trim(),
                    simulate_latency: simulateLatency
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to send message');
            }

            const data = await response.json();
            console.log('Test chat response:', data);

            setInputMessage('');
        } catch (error: any) {
            console.error('Error sending test message:', error);
            alert(`Error: ${error.message}`);
            setThinking(false);
        } finally {
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
                                    <p className="text-sm text-text-primary">{message.content}</p>
                                    <p className="text-xs mt-1 text-text-secondary">
                                        {new Date(message.timestamp).toLocaleTimeString()} •{' '}
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
