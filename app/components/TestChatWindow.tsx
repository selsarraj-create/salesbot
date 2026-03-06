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
            // Delete training_feedback first (FK → messages)
            const { data: msgs } = await supabase
                .from('messages')
                .select('id')
                .eq('lead_id', lead.id);
            const msgIds = (msgs || []).map((m: any) => m.id);

            if (msgIds.length > 0) {
                await supabase.from('training_feedback').delete().in('message_id', msgIds);
            }

            // Delete messages (FK → leads)
            const { error: msgError } = await supabase
                .from('messages')
                .delete()
                .eq('lead_id', lead.id);

            if (msgError) {
                console.error('Error deleting messages:', msgError);
                throw new Error('Failed to delete messages: ' + msgError.message);
            }

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
            <Card className="h-full bg-white border border-gray-100 shadow-sm">
                <CardContent className="flex items-center justify-center h-full">
                    <div className="text-center text-text-muted-dark">
                        <p className="text-lg font-medium">Select a test lead to start chatting</p>
                        <p className="text-sm mt-2">Create a test lead using the form on the left</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="h-full flex flex-col bg-white border border-gray-100 shadow-sm">
            <CardHeader className="border-b border-gray-100 bg-panel-bg py-4">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-text-dark text-lg">
                            {lead.name || lead.phone}
                            <Badge variant="secondary" className="bg-yellow-50 text-yellow-600 border-yellow-200">TEST</Badge>
                            {whatsappMode && (
                                <Badge variant="secondary" className="bg-green-50 text-green-600 border-green-200">📱 WhatsApp</Badge>
                            )}
                        </CardTitle>
                        <CardDescription className="text-text-muted-dark mt-1">
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
                            className="text-text-muted-dark hover:text-brand-blue hover:bg-brand-blue/10"
                        >
                            <Download className="h-5 w-5" />
                        </Button>
                        {onDelete && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleDeleteLead}
                                disabled={deleting}
                                className="text-text-muted-dark hover:text-red-500 hover:bg-red-500/10"
                            >
                                <Trash2 className="h-5 w-5" />
                            </Button>
                        )}
                    </div>
                </div>
            </CardHeader>

            <CardContent ref={scrollContainerRef} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-main-bg">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-text-muted-dark">
                        <div className="w-12 h-12 rounded-full bg-brand-blue/5 border border-brand-blue/10 flex items-center justify-center mb-3">
                            <Smartphone className="w-6 h-6 text-brand-blue/60" />
                        </div>
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
                                    className={`max-w-xs lg:max-w-md px-5 py-3.5 rounded-2xl ${isLead
                                        ? 'bg-white border border-gray-100 shadow-sm rounded-tl-sm'
                                        : 'bg-panel-bg text-text-dark rounded-tr-sm'
                                        }`}
                                >
                                    {/* Render Thought Process (Bot Only) */}
                                    {message.thought_content && (
                                        <div className="mb-3 p-2.5 rounded-lg bg-white/50 border border-brand-blue/20">
                                            <p className="text-[11px] font-mono text-brand-blue/80 whitespace-pre-wrap leading-relaxed">
                                                {message.thought_content}
                                            </p>
                                        </div>
                                    )}

                                    <p className="text-[15px] leading-relaxed text-text-dark whitespace-pre-wrap">{message.content}</p>
                                    <p className="text-[11px] mt-1.5 text-text-muted-dark/80 font-medium">
                                        {message.timestamp ? new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                    </p>
                                </div>
                            </div>
                        );
                    })
                )}

                {thinking && (
                    <div className="flex justify-end">
                        <div className="max-w-xs lg:max-w-md px-5 py-3.5 rounded-2xl bg-panel-bg border border-gray-100 rounded-tr-sm">
                            <div className="flex items-center gap-2">
                                <span className="text-[13px] text-text-muted-dark font-medium">Alex is typing</span>
                                <div className="flex gap-1 h-full pt-1">
                                    <div className="w-1.5 h-1.5 bg-brand-blue/50 rounded-full animate-bounce"></div>
                                    <div className="w-1.5 h-1.5 bg-brand-blue/50 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                    <div className="w-1.5 h-1.5 bg-brand-blue/50 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </CardContent>

            <div className="border-t border-gray-100 p-5 space-y-4 bg-white">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <Switch
                            checked={simulateLatency}
                            onCheckedChange={setSimulateLatency}
                            id="latency-toggle"
                            disabled={whatsappMode}
                            className="data-[state=checked]:bg-brand-blue"
                        />
                        <label htmlFor="latency-toggle" className="text-sm cursor-pointer text-text-dark font-medium">
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
                        <label htmlFor="whatsapp-toggle" className="text-sm cursor-pointer text-text-dark font-medium flex items-center gap-1">
                            <Smartphone className="h-4 w-4 text-text-muted-dark" /> WhatsApp Mode
                        </label>
                    </div>
                </div>

                {whatsappMode ? (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-3.5 text-center shadow-sm">
                        <p className="text-sm text-green-700 font-medium">📱 WhatsApp Mode Active</p>
                        <p className="text-xs text-green-600 mt-1">Reply from your phone. Messages will appear here in real-time.</p>
                    </div>
                ) : (
                    <div className="flex gap-3">
                        <Input
                            value={inputMessage}
                            onChange={(e) => setInputMessage(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && !sending && handleSendMessage()}
                            placeholder="Type sumulated response..."
                            disabled={sending}
                            className="bg-panel-bg border-gray-200 text-text-dark placeholder:text-text-muted-dark focus:ring-brand-blue/50 h-11 rounded-xl"
                        />
                        <Button
                            onClick={handleSendMessage}
                            disabled={sending || !inputMessage.trim()}
                            className="bg-brand-blue text-white hover:bg-blue-600 h-11 px-6 rounded-xl shadow-sm transition-all"
                        >
                            {sending ? 'Sending...' : 'Send'}
                        </Button>
                    </div>
                )}
            </div>
        </Card>
    );
}
