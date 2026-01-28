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
                // Deduplicate by ID
                if (prev.find(m => m.id === newMsg.id)) return prev;

                // Smart Replacement: If real 'lead' message arrives, remove the optimistic placeholder
                if (newMsg.sender_type === 'lead') {
                    // Find optimistic message with same content
                    const optIndex = prev.findIndex(m => m.id.startsWith('opt-') && m.content === newMsg.content);
                    if (optIndex !== -1) {
                        // Replace clean
                        const updated = [...prev];
                        updated[optIndex] = newMsg;
                        return updated;
                    }
                }

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
        // ... (lines 72-105 remain same)
        console.log('Initiating outbound conversation for lead:', leadId);
        setThinking(true);
        try {
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
                // Optimization: Don't wait for subscription for the very first message?
                // No, standard flow is fine.
            }
        } catch (e) {
            console.error('Failed to initiate:', e);
        } finally {
            setThinking(false);
        }
    };

    // ... (lines 107-264 remain same, jumping to thinking bubble)

    {
        thinking && (
            <div className="flex justify-end">
                <div className="max-w-xs lg:max-w-md px-4 py-3 rounded-lg glass-effect bg-surface/50 border border-electric-cyan/20">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-electric-cyan font-medium">Alex is typing</span>
                        <div className="flex gap-1 h-full pt-1">
                            <div className="w-1.5 h-1.5 bg-electric-cyan rounded-full animate-bounce"></div>
                            <div className="w-1.5 h-1.5 bg-electric-cyan rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-1.5 h-1.5 bg-electric-cyan rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    <div ref={messagesEndRef} />
            </CardContent >

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
        </Card >
    );
}
