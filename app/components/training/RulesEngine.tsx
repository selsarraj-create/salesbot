'use client';

import { useState, useEffect } from 'react';
import { authFetch } from '@/lib/auth/auth-fetch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ShieldAlert, Plus, Trash2, Lock, Save, RefreshCw, Edit, X, Check } from 'lucide-react';
import { toast } from 'sonner';

interface SystemRule {
    id: string;
    rule_text: string;
    category: 'behavior' | 'constraint';
    is_active: boolean;
    is_locked: boolean;
}

export default function RulesEngine() {
    const [rules, setRules] = useState<SystemRule[]>([]);
    const [loading, setLoading] = useState(true);
    const [newRule, setNewRule] = useState('');
    const [newCategory, setNewCategory] = useState<'behavior' | 'constraint'>('behavior');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editText, setEditText] = useState('');

    useEffect(() => {
        fetchRules();
    }, []);

    const fetchRules = async () => {
        try {
            const res = await authFetch('/api/training/rules');
            const data = await res.json();
            if (data.rules) setRules(data.rules);
        } catch (error) {
            console.error('Failed to fetch rules:', error);
        } finally {
            setLoading(false);
        }
    };

    const addRule = async () => {
        if (!newRule.trim()) return;

        try {
            const res = await authFetch('/api/training/rules', {
                method: 'POST',
                body: JSON.stringify({
                    rule_text: newRule,
                    category: newCategory
                })
            });

            if (!res.ok) throw new Error('Failed to add rule');

            const data = await res.json();
            setRules(prev => [data.rule, ...prev]);
            setNewRule('');
            toast.success('Rule added successfully');

            if (data.rule.is_locked) {
                toast.warning('Note: This rule contains safety keywords and has been LOCKED.');
            }

        } catch (error) {
            toast.error('Failed to add rule');
        }
    };

    const toggleRule = async (id: string, currentStatus: boolean) => {
        try {
            // Optimistic update
            setRules(prev => prev.map(r => r.id === id ? { ...r, is_active: !currentStatus } : r));

            await authFetch('/api/training/rules', {
                method: 'PATCH',
                body: JSON.stringify({ id, is_active: !currentStatus })
            });
        } catch (error) {
            fetchRules(); // Revert on error
            toast.error('Failed to update rule');
        }
    };

    const deleteRule = async (id: string) => {
        if (!confirm('Delete this rule?')) return;

        try {
            const res = await authFetch(`/api/training/rules?id=${id}`, { method: 'DELETE' });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Delete failed');
            }

            setRules(prev => prev.filter(r => r.id !== id));
            toast.success('Rule deleted');
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const startEditing = (rule: SystemRule) => {
        if (rule.is_locked) {
            toast.error("Cannot edit locked rules.");
            return;
        }
        setEditingId(rule.id);
        setEditText(rule.rule_text);
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditText('');
    };

    const saveRule = async (id: string) => {
        try {
            const res = await authFetch('/api/training/rules', {
                method: 'PATCH',
                body: JSON.stringify({ id, rule_text: editText })
            });
            const data = await res.json();
            if (data.rule) {
                setRules(prev => prev.map(r => r.id === id ? data.rule : r));
                toast.success('Rule updated');
                cancelEditing();
            }
        } catch (error) {
            toast.error('Failed to update rule');
        }
    };

    const activeRulesText = rules
        .filter(r => r.is_active)
        .map(r => `[${r.category.toUpperCase()}] ${r.rule_text}`)
        .join('\n');

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-200px)]">
            {/* Left Column: Live Logic Viewer — intentionally dark for terminal feel */}
            <Card className="bg-sidebar-bg border-sidebar-surface flex flex-col overflow-hidden shadow-sm">
                <CardHeader className="border-b border-sidebar-surface">
                    <CardTitle className="flex items-center gap-2 text-text-light">
                        <ShieldAlert className="w-5 h-5 text-brand-blue" />
                        Current System Instructions
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-auto p-5 font-mono text-sm">
                    <div className="space-y-4 text-text-muted-light">
                        <div className="opacity-80 whitespace-pre-wrap leading-relaxed">
                            {`// Core Persona Logic (Immutable)
SYSTEM INSTRUCTIONS: ALEX (BOOKER AI) — EDGE TALENT

Apply Rigid Sequential Execution for ALEXSCRIPT.pdf.

1. Forced Opener (Stage 1):
- Forbidden from custom greetings.
- Must use exact PDF text: "Hi [Name], I'm Alex... good news!"

2. The Sequential Gate System (Strict Order):
- Stage 1: The Hook (Model pitch)
- Stage 2: Connection (Experience/Work)
- Stage 3: 4-Point Qualification (MANDATORY)
  - "Professional test shoot before?"
  - "Age correct?"
  - "Employment/Student?"
  - "UK Resident?"
- Stage 4: Education (Outfits/Studio)
- Stage 5: Headless Close (Date/Time)

3. STRICT BOUNDARIES:
- State Machine: Forbidden from proceeding until user responds to current stage.
- [WAIT] Command: Terminate turn after each stage. ONE stage per message.
- NO LINKS: Headless booking only.
- Memory: Check off stages (1-5) using Thinking Budget.

INTERRUPTION & PIVOT PROTOCOL:
- Listen First: Check for questions.
- Answer First: Suspend script to answer.
- Pivot Second: Return to last uncompleted Stage.`}
                        </div>

                        {rules.filter(r => r.is_active).length > 0 ? (
                            <div className="space-y-2">
                                <div className="text-text-muted-light/60 text-xs">{'// DYNAMIC RULES INJECTED:'}</div>
                                {rules.filter(r => r.is_active).map(r => (
                                    <div key={r.id} className={`p-3 border-l-2 rounded-r-lg ${r.category === 'constraint'
                                            ? 'text-rose-400 border-rose-400 bg-rose-400/10'
                                            : 'text-emerald-400 border-emerald-400 bg-emerald-400/10'
                                        }`}>
                                        {`[${r.category.toUpperCase()}] ${r.rule_text}`}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-text-muted-light/50 italic p-2">
                                // No active dynamic rules. Using core logic only.
                            </div>
                        )}

                        <div className="opacity-40">
                            {`...
ALWAYS MAINTAIN PROFESSIONAL TONE.`}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Right Column: Rule Editor — light theme */}
            <Card className="bg-white border border-gray-100 shadow-sm flex flex-col overflow-hidden">
                <CardHeader className="border-b border-gray-100 bg-panel-bg">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-text-dark text-lg">Active Rules</CardTitle>
                        <Button
                            size="sm"
                            variant="outline"
                            className="text-brand-blue border-brand-blue/30 hover:bg-brand-blue/5 gap-2"
                            onClick={() => window.location.reload()}
                        >
                            <RefreshCw className="w-4 h-4" />
                            Update AI Brain
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="flex-1 overflow-auto p-4 space-y-4 custom-scrollbar">
                    {/* Add Rule Input */}
                    <div className="flex gap-2">
                        <select
                            className="bg-panel-bg text-text-dark border border-gray-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue/30"
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value as any)}
                        >
                            <option value="behavior">Behavior</option>
                            <option value="constraint">Constraint</option>
                        </select>
                        <Input
                            placeholder="Enter new rule (e.g. 'Always ask for phone number')"
                            value={newRule}
                            onChange={(e) => setNewRule(e.target.value)}
                            className="bg-panel-bg border-gray-200 text-text-dark focus:ring-brand-blue/30 focus:border-brand-blue/30"
                            onKeyDown={(e) => e.key === 'Enter' && addRule()}
                        />
                        <Button onClick={addRule} size="icon" className="bg-brand-blue text-white hover:bg-blue-600 shrink-0">
                            <Plus className="w-5 h-5" />
                        </Button>
                    </div>

                    {/* Rules List */}
                    <div className="space-y-2 mt-4">
                        {loading ? (
                            <div className="text-center text-text-muted-dark py-4">Loading rules...</div>
                        ) : rules.length === 0 ? (
                            <div className="text-center text-text-muted-dark py-8 border-2 border-dashed border-gray-200 rounded-xl">
                                No rules defined. Add one above.
                            </div>
                        ) : (
                            rules.map((rule) => (
                                <div
                                    key={rule.id}
                                    className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${rule.is_active
                                        ? 'bg-white border-gray-100 shadow-sm'
                                        : 'bg-gray-50 border-transparent opacity-60'
                                        }`}
                                >
                                    <div className="flex items-center gap-3 flex-1">
                                        <Badge
                                            variant="outline"
                                            className={`${rule.category === 'constraint'
                                                ? 'text-rose-600 border-rose-200 bg-rose-50'
                                                : 'text-brand-blue border-brand-blue/20 bg-brand-blue/5'
                                                } capitalize w-20 justify-center text-[11px]`}
                                        >
                                            {rule.category}
                                        </Badge>

                                        {editingId === rule.id ? (
                                            <div className="flex items-center gap-2 flex-1">
                                                <Input
                                                    value={editText}
                                                    onChange={(e) => setEditText(e.target.value)}
                                                    className="bg-panel-bg border-gray-200 h-8 text-text-dark focus:ring-brand-blue/30"
                                                    autoFocus
                                                />
                                                <Button size="sm" variant="ghost" onClick={() => saveRule(rule.id)} className="h-8 w-8 p-0 text-emerald-500 hover:bg-emerald-50">
                                                    <Check className="w-4 h-4" />
                                                </Button>
                                                <Button size="sm" variant="ghost" onClick={cancelEditing} className="h-8 w-8 p-0 text-gray-400 hover:bg-gray-100">
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <p className="text-text-dark text-sm font-medium line-clamp-2 leading-snug">
                                                {rule.rule_text}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2 pl-2">
                                        {rule.is_locked ? (
                                            <div className="flex items-center gap-2 px-2.5 py-1 bg-rose-50 rounded-lg border border-rose-200 text-rose-600 text-xs font-bold" title="Locked: Contains safety keywords">
                                                <Lock className="w-3 h-3" />
                                                LOCKED
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <Switch
                                                    checked={rule.is_active}
                                                    onCheckedChange={() => toggleRule(rule.id, rule.is_active)}
                                                    className="data-[state=checked]:bg-brand-blue"
                                                />
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="text-text-muted-dark hover:text-brand-blue hover:bg-brand-blue/5 p-2 h-auto"
                                                    onClick={() => startEditing(rule)}
                                                    disabled={!!editingId} // Disable other edits while one is active
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="text-text-muted-dark hover:text-rose-500 hover:bg-rose-50 p-2 h-auto"
                                                    onClick={() => deleteRule(rule.id)}
                                                    disabled={!!editingId}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
