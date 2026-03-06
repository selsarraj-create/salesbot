'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Check, X, Star, ThumbsDown, Filter, Trash2, Archive } from 'lucide-react';
import { toast } from 'sonner';

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
        priority_score?: number;
    };
    previous_message?: string;
    thought_content?: string;
    quality_score?: number;
    manual_score?: number;
    judge_rationale?: string;
}

export default function ReviewQueue() {
    const [queue, setQueue] = useState<ReviewItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [correction, setCorrection] = useState('');
    const [selectedId, setSelectedId] = useState<string | null>(null);

    // Filters
    const [highValueOnly, setHighValueOnly] = useState(false);
    const [ignoreShort, setIgnoreShort] = useState(true);
    const [failuresOnly, setFailuresOnly] = useState(false);

    // Bulk Actions
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

    useEffect(() => {
        fetchQueue();
    }, [highValueOnly, ignoreShort]);

    const fetchQueue = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                high_value: highValueOnly.toString(),
                ignore_short: ignoreShort.toString(),
                failures_only: failuresOnly.toString()
            });

            const res = await fetch(`/api/training/queue?${params}`);
            if (!res.ok) throw new Error('Failed to fetch queue');

            const data = await res.json();
            setQueue(data.queue || []);
            setSelectedItems(new Set()); // Reset selection
        } catch (error) {
            console.error('[ReviewQueue] Error:', error);
            toast.error('Failed to load queue');
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (action: 'approve' | 'intervene' | 'gold' | 'skip', item: ReviewItem, correctionText?: string) => {
        try {
            const res = await fetch('/api/training/queue', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action,
                    message_id: item.id,
                    ai_response: item.content,
                    manager_correction: correctionText,
                    is_gold_standard: action === 'gold',
                    lead_id: item.lead_context?.lead_code
                })
            });

            if (!res.ok) throw new Error('Action failed');

            // Optimistic remove
            setQueue(prev => prev.filter(q => q.id !== item.id));
            setSelectedId(null);
            setCorrection('');

            if (action === 'skip') toast.info('Conversation skipped (archived)');
            else toast.success('Feedback saved');

        } catch (error) {
            console.error(error);
            toast.error('Failed to save action');
        }
    };

    const handleBulkArchive = async () => {
        if (selectedItems.size === 0) return;
        if (!confirm(`Archive ${selectedItems.size} items?`)) return;

        try {
            const res = await fetch('/api/training/queue', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'bulk_archive',
                    message_ids: Array.from(selectedItems)
                })
            });

            if (!res.ok) throw new Error('Bulk action failed');

            setQueue(prev => prev.filter(q => !selectedItems.has(q.id)));
            setSelectedItems(new Set());
            toast.success('Bulk archived successfully');

        } catch (error) {
            toast.error('Bulk archive failed');
        }
    };

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedItems);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedItems(newSet);
    };

    const toggleSelectAll = () => {
        if (selectedItems.size === queue.length) {
            setSelectedItems(new Set());
        } else {
            setSelectedItems(new Set(queue.map(q => q.id)));
        }
    };

    return (
        <div className="space-y-6">
            {/* Header & Filters */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-text-primary">RLHF Review Queue</h2>
                    <p className="text-text-secondary">Review pending AI responses.</p>
                </div>

                <div className="flex items-center gap-4 bg-surface p-2 rounded-lg border border-surface-light">
                    <div className="flex items-center gap-2">
                        <Switch checked={highValueOnly} onCheckedChange={setHighValueOnly} id="high-val" />
                        <label htmlFor="high-val" className="text-sm text-text-secondary cursor-pointer">High Value</label>
                    </div>
                    <div className="w-px h-4 bg-surface-light"></div>
                    <div className="flex items-center gap-2">
                        <Switch checked={ignoreShort} onCheckedChange={setIgnoreShort} id="short-msg" />
                        <label htmlFor="short-msg" className="text-sm text-text-secondary cursor-pointer">Hide Short</label>
                    </div>
                </div>
            </div>

            {/* Bulk Actions Bar */}
            {queue.length > 0 && (
                <div className="flex items-center justify-between bg-charcoal p-3 rounded-md border border-surface-light">
                    <div className="flex items-center gap-3">
                        <Checkbox
                            checked={queue.length > 0 && selectedItems.size === queue.length}
                            onCheckedChange={toggleSelectAll}
                        />
                        <span className="text-sm text-text-secondary">
                            {selectedItems.size} selected
                        </span>
                    </div>
                    {selectedItems.size > 0 && (
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleBulkArchive}
                            className="bg-red-500/10 text-red-400 hover:bg-red-500/20 border-red-500/30"
                        >
                            <Archive className="w-4 h-4 mr-2" />
                            Bulk Archive
                        </Button>
                    )}
                </div>
            )}

            {/* Queue List */}
            <div className="grid gap-4">
                {loading ? (
                    <div className="p-8 text-center text-text-secondary">Loading queue...</div>
                ) : queue.length === 0 ? (
                    <Card className="bg-surface border-surface-light">
                        <CardContent className="p-8 text-center text-text-secondary">
                            <div className="flex justify-center mb-4">
                                <Check className="w-12 h-12 text-electric-cyan opacity-20" />
                            </div>
                            <p>All caught up! No messages match your filters.</p>
                        </CardContent>
                    </Card>
                ) : (
                    queue.map((item) => (
                        <Card key={item.id} className="bg-surface border-surface-light group transition-all hover:border-electric-cyan/30">
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <Checkbox
                                            checked={selectedItems.has(item.id)}
                                            onCheckedChange={() => toggleSelection(item.id)}
                                            className="border-surface-light"
                                        />
                                        <Badge variant="outline" className="border-electric-cyan border-opacity-30 text-electric-cyan bg-electric-cyan/5">
                                            {item.lead_context?.lead_code || 'Lead'}
                                        </Badge>
                                        <span className="text-xs text-text-tertiary">
                                            {new Date(item.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-text-tertiary hover:text-text-primary"
                                            onClick={() => handleAction('skip', item)}
                                        >
                                            <Archive className="w-4 h-4 mr-1" />
                                            Skip
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {/* Conversational UI Thread */}
                                <div className="space-y-4 pl-8 border-l border-surface-light/30 relative mt-2">
                                    {/* Lead Message Bubble */}
                                    {item.previous_message && item.previous_message !== '(No context found)' && (
                                        <div className="relative">
                                            <div className="absolute -left-[33px] top-4 w-4 h-px bg-surface-light/50"></div>
                                            <div className="inline-block max-w-[85%] bg-surface-light/20 border border-surface-light/30 rounded-2xl rounded-tl-sm px-4 py-3">
                                                <p className="text-[11px] text-text-tertiary font-medium uppercase tracking-wider mb-1">Lead Input</p>
                                                <p className="text-text-primary text-sm leading-relaxed">{item.previous_message}</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* AI Response Bubble */}
                                    <div className="relative">
                                        <div className="absolute -left-[33px] top-4 w-4 h-px bg-surface-light/50"></div>
                                        <div className="inline-block max-w-[95%] bg-charcoal border border-surface-light/50 rounded-2xl rounded-tl-sm px-5 py-4 shadow-sm">

                                            {/* AI Header with Integrated Score */}
                                            <div className="flex items-center gap-3 mb-3 pb-2 border-b border-surface-light/30">
                                                <div className="flex items-center gap-2">
                                                    <span className="relative flex h-2 w-2">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-electric-cyan opacity-40"></span>
                                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-electric-cyan"></span>
                                                    </span>
                                                    <p className="text-xs font-medium text-electric-cyan tracking-wide">Alex (AI)</p>
                                                </div>

                                                {(item.quality_score !== undefined || item.manual_score !== undefined) && (
                                                    <div className="flex items-center gap-1.5 ml-auto">
                                                        <div className={`h-1.5 w-1.5 rounded-full ${(item.manual_score ?? item.quality_score ?? 0) < 6 ? 'bg-rose-500' : (item.manual_score ?? item.quality_score ?? 0) < 8 ? 'bg-amber-400' : 'bg-emerald-400'}`}></div>
                                                        <span className="text-[11px] font-mono text-text-secondary">
                                                            Score: {item.manual_score ?? item.quality_score}/10 {item.manual_score && '👑'}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* AI Internal Reasoning */}
                                            {item.thought_content && (
                                                <div className="mb-4">
                                                    <details className="group">
                                                        <summary className="text-[11px] font-mono text-text-secondary/70 hover:text-text-secondary cursor-pointer flex items-center gap-1.5 select-none transition-colors">
                                                            <span className="group-open:rotate-90 transition-transform opacity-50">▶</span>
                                                            <span className="opacity-80">Reasoning Chain</span>
                                                        </summary>
                                                        <div className="mt-2 text-[11px] text-text-secondary/80 font-mono italic bg-surface-light/10 border-l border-surface-light/50 p-3 rounded-r-md overflow-x-auto whitespace-pre-wrap leading-relaxed">
                                                            {item.thought_content}
                                                        </div>
                                                    </details>
                                                </div>
                                            )}

                                            {/* Final Output Text */}
                                            <p className="text-text-primary text-sm leading-relaxed whitespace-pre-wrap">{item.content}</p>
                                        </div>
                                    </div>
                                </div>

                                {selectedId === item.id && (
                                    <div className="mt-4 ml-6 animate-in fade-in slide-in-from-top-2 bg-surface-light/30 p-4 rounded-md">
                                        <label className="text-sm text-text-secondary mb-1 block">Manager Correction:</label>
                                        <Textarea
                                            value={correction}
                                            onChange={(e) => setCorrection(e.target.value)}
                                            placeholder="Type how Alex SHOULD have responded..."
                                            className="bg-background border-surface-light text-text-primary min-h-[100px]"
                                        />
                                        <div className="flex justify-end gap-2 mt-2">
                                            <Button variant="ghost" onClick={() => setSelectedId(null)}>Cancel</Button>
                                            <Button
                                                variant="default"
                                                className="bg-electric-cyan text-charcoal hover:bg-cyan-400"
                                                onClick={() => handleAction('intervene', item, correction)}
                                            >
                                                Save Correction
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </CardContent>

                            {selectedId !== item.id && (
                                <CardFooter className="flex justify-end gap-2 pt-0 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                        onClick={() => setSelectedId(item.id)}
                                    >
                                        <ThumbsDown className="w-4 h-4 mr-2" />
                                        Intervene
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10"
                                        onClick={() => handleAction('gold', item)}
                                    >
                                        <Star className="w-4 h-4 mr-2" />
                                        Gold Star
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleAction('approve', item)}
                                        className="border-green-500/30 text-green-400 hover:bg-green-500/10 hover:text-green-300"
                                    >
                                        <Check className="w-4 h-4 mr-2" />
                                        Approve
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
