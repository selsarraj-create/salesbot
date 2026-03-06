'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { supabase, subscribeToMessages } from '@/lib/supabase/client';
import type { Message, Lead } from '@/lib/supabase/types';

import { Trash2, Download, Smartphone } from 'lucide-react';

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
    const [whatsappMode, setWhatsappMode] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

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

    // Scroll to bottom (within container only, not the whole page)
    const scrollToBottom = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, thinking]);

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
                // If WhatsApp mode is ON, also send the opener via WhatsApp
                if (whatsappMode && data.response && lead?.phone) {
                    await sendWhatsApp(lead.phone, data.response);
                }
            }
        } catch (e) {
            console.error('Failed to initiate:', e);
        } finally {
            setThinking(false);
        }
    };

    // Send a message via Twilio WhatsApp
    const sendWhatsApp = async (to: string, message: string) => {
        try {
            const res = await fetch('/api/whatsapp-send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ to, message })
            });
            if (!res.ok) {
                const err = await res.json();
                console.error('WhatsApp send failed:', err);
            } else {
                console.log('WhatsApp message sent successfully');
            }
        } catch (e) {
            console.error('WhatsApp send error:', e);
        }
    };

    // Toggle WhatsApp mode on/off and update the lead in Supabase
    const handleWhatsAppToggle = async (enabled: boolean) => {
        setWhatsappMode(enabled);
        if (lead) {
            await (supabase as any).from('leads').update({ whatsapp_mode: enabled }).eq('id', lead.id);
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
            timestamp: new Date().toISOString()
            // sentiment_score removed to fix build
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

    const handleExportChat = () => {
        if (!lead || messages.length === 0) return;

        const lines: string[] = [
            `=== Chat Export: ${lead.name || lead.phone} ===`,
            `Lead Code: ${lead.lead_code}`,
            `Status: ${lead.status}`,
            `Exported: ${new Date().toLocaleString()}`,
            `Total Messages: ${messages.length}`,
            '='.repeat(50),
            ''
        ];

        messages.forEach((msg) => {
            const time = msg.timestamp ? new Date(msg.timestamp).toLocaleString() : 'N/A';
            const sender = msg.sender_type === 'lead' ? 'Lead' : (msg.sender_type as string) === 'human' ? 'Human' : 'Bot';

            if (msg.thought_content) {
                lines.push(`[THOUGHT @ ${time}]`);
                lines.push(msg.thought_content);
                lines.push('');
            }

            lines.push(`[${sender} @ ${time}]`);
            lines.push(msg.content);
            lines.push('');
        });

        const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chat_${lead.lead_code || lead.id}_${new Date().toISOString().slice(0, 10)}.txt`;
        a.click();
        URL.revokeObjectURL(url);
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
                            {whatsappMode && (
                                <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30">📱 WhatsApp</Badge>
                            )}
                        </CardTitle>
                        <CardDescription className="text-text-secondary">
                            {lead.lead_code} • {lead.status} • ⚠️ No SMS Costs
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleExportChat}
                            disabled={messages.length === 0}
                            title="Export Chat"
                            className="text-text-secondary hover:text-electric-cyan hover:bg-electric-cyan/10"
                        >
                            <Download className="h-5 w-5" />
                        </Button>
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
                </div>
            </CardHeader>

            <CardContent ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
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
                )}

                <div ref={messagesEndRef} />
            </CardContent>

            <div className="border-t border-surface-light p-4 space-y-3">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Switch
                            checked={simulateLatency}
                            onCheckedChange={setSimulateLatency}
                            id="latency-toggle"
                            disabled={whatsappMode}
                        />
                        <label htmlFor="latency-toggle" className="text-sm cursor-pointer text-text-primary">
                            Simulate SMS Latency
                        </label>
                    </div>
                    <div className="flex items-center gap-2">
                        <Switch
                            checked={whatsappMode}
                            onCheckedChange={handleWhatsAppToggle}
                            id="whatsapp-toggle"
                            className="data-[state=checked]:bg-green-500"
                        />
                        <label htmlFor="whatsapp-toggle" className="text-sm cursor-pointer text-text-primary flex items-center gap-1">
                            <Smartphone className="h-4 w-4" /> WhatsApp Mode
                        </label>
                    </div>
                </div>

                {whatsappMode ? (
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-center">
                        <p className="text-sm text-green-400 font-medium">📱 WhatsApp Mode Active</p>
                        <p className="text-xs text-green-300/70 mt-1">Reply from your phone. Messages will appear here in real-time.</p>
                    </div>
                ) : (
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
                )}
            </div>
        </Card>
    );
}
