'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Check, X, Star, ThumbsDown, MessageSquare } from 'lucide-react';

interface ReviewItem {
    id: string;
    content: string;
    sender_type: string;
    timestamp: string;
    has_feedback: boolean;
    is_gold: boolean;
    lead_context?: {
        lead_code: string;
        status: string;
    };
}

export default function ReviewQueue() {
    const [queue, setQueue] = useState<ReviewItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [correction, setCorrection] = useState('');
    const [selectedId, setSelectedId] = useState<string | null>(null);

    useEffect(() => {
        fetchQueue();
    }, []);

    const fetchQueue = async () => {
        try {
            const res = await fetch('/api/training/queue');
            if (!res.ok) throw new Error('Failed to fetch queue');
            const data = await res.json();
            setQueue(data.queue || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitFeedback = async (messageId: string, isGold: boolean, correctionText: string | null) => {
        try {
            const item = queue.find(q => q.id === messageId);
            if (!item) return;

            const res = await fetch('/api/training/queue', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message_id: messageId,
                    original_prompt: "Unknown (Inferred)", // Ideally we capture this at generation time
                    ai_response: item.content,
                    manager_correction: correctionText,
                    is_gold_standard: isGold,
                    confidence_score: 0.0 // Placeholder
                })
            });

            if (!res.ok) throw new Error('Failed to submit feedback');

            // Optimistic update
            setQueue(prev => prev.map(q =>
                q.id === messageId ? { ...q, has_feedback: true, is_gold: isGold } : q
            ));

            if (selectedId === messageId) {
                setCorrection('');
                setSelectedId(null);
            }

        } catch (error) {
            console.error(error);
            alert('Failed to save feedback');
        }
    };

    if (loading) return <div className="p-8 text-center text-text-secondary">Loading review queue...</div>;

    const unreviewedCount = queue.filter(q => !q.has_feedback).length;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-text-primary">RLHF Review Queue</h2>
                    <p className="text-text-secondary">Review AI responses to improve performance.</p>
                </div>
                <Badge variant={unreviewedCount > 0 ? "destructive" : "secondary"}>
                    {unreviewedCount} Pending
                </Badge>
            </div>

            <div className="grid gap-4">
                {queue.length === 0 ? (
                    <Card className="bg-surface border-surface-light">
                        <CardContent className="p-8 text-center text-text-secondary">
                            All caught up! No messages to review.
                        </CardContent>
                    </Card>
                ) : (
                    queue.map((item) => (
                        <Card key={item.id} className={`bg-surface border-surface-light ${item.has_feedback ? 'opacity-60' : ''}`}>
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="border-electric-cyan text-electric-cyan">
                                            {item.lead_context?.lead_code || 'Lead'}
                                        </Badge>
                                        <span className="text-xs text-text-tertiary">
                                            {new Date(item.timestamp).toLocaleString()}
                                        </span>
                                    </div>
                                    {item.is_gold && <Star className="w-4 h-4 text-yellow-400 fill-current" />}
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="bg-charcoal p-3 rounded-md border border-surface-light">
                                    <p className="text-text-primary">{item.content}</p>
                                </div>

                                {selectedId === item.id && !item.has_feedback && (
                                    <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                                        <label className="text-sm text-text-secondary mb-1 block">Manager Correction:</label>
                                        <Textarea
                                            value={correction}
                                            onChange={(e) => setCorrection(e.target.value)}
                                            placeholder="Type how Alex SHOULD have responded..."
                                            className="bg-background border-surface-light text-text-primary"
                                        />
                                        <div className="flex justify-end gap-2 mt-2">
                                            <Button variant="ghost" onClick={() => setSelectedId(null)}>Cancel</Button>
                                            <Button
                                                variant="default"
                                                className="bg-electric-cyan text-charcoal"
                                                onClick={() => handleSubmitFeedback(item.id, false, correction)}
                                            >
                                                Save Correction
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </CardContent>

                            {!item.has_feedback && selectedId !== item.id && (
                                <CardFooter className="flex justify-end gap-2 pt-0">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                        onClick={() => setSelectedId(item.id)}
                                    >
                                        <ThumbsDown className="w-4 h-4 mr-2" />
                                        Needs Correction
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10"
                                        onClick={() => handleSubmitFeedback(item.id, true, null)}
                                    >
                                        <Star className="w-4 h-4 mr-2" />
                                        Gold Standard
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleSubmitFeedback(item.id, false, null)} // Just mark reviewed
                                        className="border-surface-light text-text-secondary"
                                    >
                                        <Check className="w-4 h-4 mr-2" />
                                        Looks Good
                                    </Button>
                                </CardFooter>
                            )}
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
