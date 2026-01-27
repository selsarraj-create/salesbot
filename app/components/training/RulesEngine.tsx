'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ShieldAlert, Plus, Trash2, Lock, Save, RefreshCw } from 'lucide-react';
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

    useEffect(() => {
        fetchRules();
    }, []);

    const fetchRules = async () => {
        try {
            const res = await fetch('/api/training/rules');
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
            const res = await fetch('/api/training/rules', {
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

            await fetch('/api/training/rules', {
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
            const res = await fetch(`/api/training/rules?id=${id}`, { method: 'DELETE' });
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

    const activeRulesText = rules
        .filter(r => r.is_active)
        .map(r => `[${r.category.toUpperCase()}] ${r.rule_text}`)
        .join('\n');

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-200px)]">
            {/* Left Column: Live Logic Viewer */}
            <Card className="bg-surface border-surface-light flex flex-col">
                <CardHeader className="border-b border-surface-light bg-charcoal">
                    <CardTitle className="flex items-center gap-2 text-text-primary">
                        <ShieldAlert className="w-5 h-5 text-electric-cyan" />
                        Current System Instructions
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-auto p-4 bg-black/30 font-mono text-sm">
                    <div className="space-y-4 text-text-secondary">
                        <div className="opacity-70 whitespace-pre-wrap">
                            {`// Core Persona Logic (Immutable)
YOU ARE SALESBOT, THE SENIOR BOOKING ASSISTANT FOR A PROFESSIONAL PHOTOGRAPHY STUDIO IN KENTISH TOWN.

STRICT BOUNDARY: YOU ARE NOT A MODELING AGENCY. YOU DO NOT FIND WORK OR SIGN MODELS. YOUR ONLY GOAL IS TO BOOK PORTFOLIO ASSESSMENTS.

STRICT COMPLIANCE: NEVER PROMISE JOBS, INCOME, OR GUARANTEE SUCCESS. ALWAYS REQUIRE A PARENT/GUARDIAN TO BE PRESENT FOR MINORS.

YOUR GOAL:
Act as a 'Trusted Studio Advisor'. Build rapport, validate the lead's potential, and guide them to a booking with empathy and professionalism.

CORE PRINCIPLES:

1. **TARGET AUDIENCE LOGIC (CRITICAL)**:
   - **IF CHILD/PARENT** (Protective Mode):
     * Focus on SAFETY, FUN, and CONFIDENCE.
     * Rule: "Safety is our top priority. A parent/guardian must be present at all times."
     * School: "We always work around school hours; education comes first."
     * Discovery: "What made you think [Name] would be good for modeling?"
   - **IF MATURE (40+)** (Validation Mode):
     * Focus on AUTHENTICITY and COMMERCIAL DEMAND.
     * Rule: "Brands are looking for real character right now, not just a certain age."
     * Affirmation: "It's never too late. Many successful models start in their 40s or 50s."
     * Discovery: "Are you looking for a creative outlet or a new career path?"

2. **TONE GUARDRAILS**:
   - **Proper British English**: Use 'Centre', 'Colour', 'Grey'.
   - **Professional**: Use titles like 'The Production Team', 'The Head Stylist'.
   - **No Slang**: Never use 'slay', 'bestie', 'bet', etc.
   - **Empathy First**: Always acknowledge a concern before answering.

3. **RULE OF THREE**:
   - Max 2 booking asks in a row. Then PIVOT to discovery (outfit ideas, experience).

4. **SECURITY & LEGITIMACY FAQ (KNOWLEDGE BASE)**:
   - **"Is this a scam?"**: "I completely understand your caution—there are many bad actors in this industry. A real scam will ask for 'registration fees'. We are a professional studio; you are paying for high-end service (hair, makeup, portfolio) that you own and can take to any agency."
   - **"Guarantee work?"**: "No professional studio or agency can ever guarantee work. What we do is ensure you have the absolute best chance by providing agency-standard 'digitals' and a portfolio that meets UK casting requirements."

6. **ETHICS & TRANSPARENCY PROTOCOLS (STRICT)**:
   - **THE 'AGENCY' FILTER**: NEVER describe us as an agency.
     * IF asked "Are you an agency?": "Great question—we are a professional photography studio that specializes in creating agency-standard portfolios. We aren't an agency ourselves, but we give you the tools and the roadmap to apply to the top London agencies."
     * IF user says "join your agency": IMMEDIATELY CORRECT THEM. "Just to be clear, we are a studio, not an agency. We create the portfolio you need to apply to agencies."
   - **NO GUARANTEE RULE**:
     * IF asked "Will I get work?" or "Is money guaranteed?": "I have to be honest with you—no one in this industry can guarantee work. What we guarantee is that you’ll leave us with a professional portfolio that meets exactly what London bookers are looking for right now."

CONVERSATION FLOW:
1. Contact → Acknowledge & Validate
2. Discovery → Ask Goal/Experience (Required)
3. Transparency Check → Correct 'Agency' misconceptions if present
4. Value → Explain Assessment (Fun/Safe/Professional)
5. Soft Ask → "Would you like to schedule something?"

Remember: You are helpful, professional, and British. You are NOT a pushy salesperson.`}
                        </div>

                        {activeRulesText ? (
                            <div className="text-green-400 p-2 border-l-2 border-green-400 bg-green-400/5 animate-pulse-slow">
                                {`// DYNAMIC RULES INJECTED:\n${activeRulesText}`}
                            </div>
                        ) : (
                            <div className="text-text-tertiary italic p-2">
                                // No active dynamic rules. Using core logic only.
                            </div>
                        )}

                        <div className="opacity-50">
                            {`...
ALWAYS MAINTAIN PROFESSIONAL TONE.`}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Right Column: Rule Editor */}
            <Card className="bg-surface border-surface-light flex flex-col">
                <CardHeader className="border-b border-surface-light">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-text-primary">Active Rules</CardTitle>
                        <Button
                            size="sm"
                            variant="outline"
                            className="text-electric-cyan border-electric-cyan hover:bg-electric-cyan/10 gap-2"
                            onClick={() => window.location.reload()}
                        >
                            <RefreshCw className="w-4 h-4" />
                            Update AI Brain
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="flex-1 overflow-auto p-4 space-y-4">
                    {/* Add Rule Input */}
                    <div className="flex gap-2">
                        <select
                            className="bg-charcoal text-text-secondary border border-surface-light rounded-md px-2 text-sm focus:outline-none focus:border-electric-cyan"
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
                            className="bg-charcoal border-surface-light text-text-primary"
                            onKeyDown={(e) => e.key === 'Enter' && addRule()}
                        />
                        <Button onClick={addRule} size="icon" className="bg-electric-cyan text-charcoal hover:bg-cyan-400">
                            <Plus className="w-5 h-5" />
                        </Button>
                    </div>

                    {/* Rules List */}
                    <div className="space-y-2 mt-4">
                        {loading ? (
                            <div className="text-center text-text-tertiary py-4">Loading rules...</div>
                        ) : rules.length === 0 ? (
                            <div className="text-center text-text-secondary py-8 border-2 border-dashed border-surface-light rounded-lg">
                                No rules defined. Add one above.
                            </div>
                        ) : (
                            rules.map((rule) => (
                                <div
                                    key={rule.id}
                                    className={`flex items-center justify-between p-3 rounded-md border transition-all ${rule.is_active
                                        ? 'bg-charcoal border-surface-light'
                                        : 'bg-charcoal/50 border-transparent opacity-60'
                                        }`}
                                >
                                    <div className="flex items-center gap-3 flex-1">
                                        <Badge
                                            variant="outline"
                                            className={`${rule.category === 'constraint'
                                                ? 'text-red-400 border-red-400/30'
                                                : 'text-blue-400 border-blue-400/30'
                                                } capitalize w-20 justify-center`}
                                        >
                                            {rule.category}
                                        </Badge>
                                        <p className="text-text-primary text-sm font-medium line-clamp-2 leading-snug">
                                            {rule.rule_text}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-2 pl-2">
                                        {rule.is_locked ? (
                                            <div className="flex items-center gap-2 px-2 py-1 bg-red-500/10 rounded border border-red-500/20 text-red-500 text-xs font-bold" title="Locked: Contains safety keywords">
                                                <Lock className="w-3 h-3" />
                                                LOCKED
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <Switch
                                                    checked={rule.is_active}
                                                    onCheckedChange={() => toggleRule(rule.id, rule.is_active)}
                                                />
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="text-text-tertiary hover:text-red-400 p-2 h-auto"
                                                    onClick={() => deleteRule(rule.id)}
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
