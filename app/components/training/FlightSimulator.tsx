'use client';

import { useState, useEffect, useRef } from 'react';
import { authFetch } from '@/lib/auth/auth-fetch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, Pause, RefreshCw, Zap } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/auth-context';
import { SimulatedScenario } from '@/lib/supabase/types';

interface Message {
    id: string;
    sender: 'bot' | 'lead';
    content: string;
}

export default function FlightSimulator() {
    const { tenant } = useAuth();
    const [scenarios, setScenarios] = useState<SimulatedScenario[]>([]);
    const [selectedScenarioId, setSelectedScenarioId] = useState<string>('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [isRunning, setIsRunning] = useState(false);
    const [turnCount, setTurnCount] = useState(0);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [leadId, setLeadId] = useState<string | null>(null);

    // Fetch Scenarios on mount
    // Fetch Scenarios on mount
    useEffect(() => {
        const fetchScenarios = async () => {
            console.log('[FlightSimulator] Fetching scenarios...');
            const { data, error } = await supabase.from('simulated_scenarios').select('*');
            if (error) {
                console.error('[FlightSimulator] Error fetching scenarios:', error);
                alert('Error loading scenarios. Make sure the database migration has been run.');
                return;
            }
            console.log(`[FlightSimulator] Loaded ${data?.length || 0} scenarios`);
            if (data) {
                // Deduplicate scenarios by name (prevent duplicates in dropdown)
                const uniqueData = (data as SimulatedScenario[]).filter((scenario, index, self) =>
                    index === self.findIndex((t) => (
                        t.scenario_name === scenario.scenario_name
                    ))
                );
                setScenarios(uniqueData);

                if (uniqueData.length === 0) {
                    alert('No scenarios found. Please run the migration (017_seed_scenarios.sql).');
                }
            }
        };
        fetchScenarios();
    }, []);

    // Create a temporary lead when starting simulation
    const startSimulation = async () => {
        const scenario = scenarios.find(s => s.id === selectedScenarioId);
        if (!selectedScenarioId || !scenario) {
            alert('Please select a scenario first');
            return;
        }

        const targetName = scenario.lead_name || 'Sim User';
        const targetAge = String(scenario.lead_age || '25');

        try {
            console.log('[FlightSimulator] Starting simulation with scenario:', selectedScenarioId);

            // 1. Create realistic dummy lead with unique phone and code
            const timestamp = Date.now();
            const dummyCode = `#SIM-${timestamp}-${Math.floor(Math.random() * 1000)}`;
            const dummyPhone = `SIM-${timestamp}`;
            console.log('[FlightSimulator] Creating dummy lead:', dummyCode, dummyPhone);

            const { data: lead, error } = await supabase.from('leads').insert({
                tenant_id: tenant?.id,
                lead_code: dummyCode,
                status: 'New',
                name: targetName,
                phone: dummyPhone,
                is_test: true,
                is_manual_mode: false,
                lead_metadata: { age: targetAge }
            } as any).select().single() as any;

            if (error) {
                console.error('[FlightSimulator] Error creating lead:', error);
                alert('Failed to create simulation lead: ' + error.message);
                return;
            }

            if (lead) {
                console.log('[FlightSimulator] Lead created:', lead.id);
                setLeadId(lead.id);
                setMessages([]); // Clear chat
                setTurnCount(0);
                setIsRunning(true);

                // Kickoff: Bot Initiates Conversation (Outbound)
                console.log('[FlightSimulator] Triggering Bot Initiation...');
                const initRes = await authFetch('/api/sandbox', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        lead_id: lead.id,
                        action: 'initiate',
                        lead_context: {
                            name: targetName,
                            age: targetAge
                        }
                    })
                });

                if (initRes.ok) {
                    const initData = await initRes.json();
                    const botMsg = initData.response;
                    console.log('[FlightSimulator] Bot Initiated:', botMsg);

                    const initialHistory = [{ id: 'bot-' + Date.now(), sender: 'bot', content: botMsg } as Message];
                    setMessages(initialHistory);

                    // Now Lead Responds
                    setTimeout(() => runTurn(lead.id, initialHistory), 1500);
                } else {
                    console.error('Failed to initiate');
                    // Fallback to old way if fails
                    runTurn(lead.id, []);
                }
            }
        } catch (err: any) {
            console.error('[FlightSimulator] Unexpected error:', err);
            alert('Unexpected error starting simulation: ' + err.message);
        }
    };

    const runTurn = async (currentLeadId: string, history: Message[]) => {
        console.log('[FlightSimulator] runTurn called, history length:', history.length);

        const scenario = scenarios.find(s => s.id === selectedScenarioId);
        if (!scenario) {
            console.error('[FlightSimulator] Scenario not found:', selectedScenarioId);
            return;
        }

        console.log('[FlightSimulator] Running scenario:', scenario.scenario_name);

        // --- STEP 1: ATTACKER (Lead AI) ---
        const lastMsg = history[history.length - 1];

        if (!lastMsg || lastMsg.sender === 'bot') {
            try {
                console.log('[FlightSimulator] Calling Attacker API...');
                const res = await authFetch('/api/simulation/run', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        history: history,
                        persona: scenario.lead_persona,
                        scenario_name: scenario.scenario_name
                    })
                });

                if (!res.ok) {
                    console.error('[FlightSimulator] Attacker API error:', res.status);
                    throw new Error('Attacker API failed');
                }

                const data = await res.json();
                const attackerMsg = data.attacker_message;
                console.log('[FlightSimulator] Attacker response:', attackerMsg);

                // Add to UI state
                const newHistory = [...history, { id: 'lead-' + Date.now(), sender: 'lead', content: attackerMsg } as Message];
                console.log('[FlightSimulator] Setting messages, new length:', newHistory.length);
                setMessages(newHistory);

                // Small delay strictly for visual pacing
                await new Promise(r => setTimeout(r, 1500));

                // --- STEP 2: DEFENDER (Alex/Sandbox) ---
                console.log('[FlightSimulator] Calling Defender API...');
                const sandboxRes = await authFetch('/api/sandbox', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        lead_id: currentLeadId,
                        message: attackerMsg,
                        simulate_latency: true // Use natural latency
                    })
                });

                if (!sandboxRes.ok) {
                    console.error('[FlightSimulator] Defender API error:', sandboxRes.status);
                    throw new Error('Defender API failed');
                }

                const sandboxData = await sandboxRes.json();
                const defenderMsg = sandboxData.response;
                console.log('[FlightSimulator] Defender response:', defenderMsg);

                // Add Defender response to state
                const finalHistory = [...newHistory, { id: 'bot-' + Date.now(), sender: 'bot', content: defenderMsg } as Message];
                console.log('[FlightSimulator] Final history length:', finalHistory.length);
                setMessages(finalHistory);

                setTurnCount(TC => TC + 1);

            } catch (err: any) {
                console.error("[FlightSimulator] Simulation error:", err);
                alert('Simulation error: ' + err.message);
                setIsRunning(false);
            }
        }
    };

    // Effect to trigger next turn automatically if Running
    useEffect(() => {
        if (isRunning && leadId && messages.length > 0) {
            // Check who spoke last
            const lastMsg = messages[messages.length - 1];
            // If Bot just spoke, it's Lead's turn again
            if (lastMsg.sender === 'bot') {
                if (turnCount >= 10) {
                    console.log('[FlightSimulator] Turn limit reached (10). Stopping.');
                    setIsRunning(false);
                    return;
                }
                const timer = setTimeout(() => {
                    runTurn(leadId, messages);
                }, 2000); // 2s pause before Attacker replies
                return () => clearTimeout(timer);
            }
        }
    }, [messages, isRunning, leadId]);

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    return (
        <Card className="h-[600px] flex flex-col bg-white border border-gray-100 shadow-sm overflow-hidden">
            <CardHeader className="border-b border-gray-100 bg-panel-bg py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <CardTitle className="text-text-dark flex items-center gap-2 text-lg">
                            <Zap className="text-amber-500" />
                            Flight Simulator
                        </CardTitle>
                        <Select onValueChange={setSelectedScenarioId} disabled={isRunning}>
                            <SelectTrigger className="w-[300px] bg-white border-gray-200 text-text-dark">
                                <SelectValue placeholder="Select Scenario" />
                            </SelectTrigger>
                            <SelectContent>
                                {scenarios.map(s => (
                                    <SelectItem key={s.id} value={s.id}>
                                        {s.scenario_name} ({s.difficulty_level})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex gap-2">
                        {!isRunning ? (
                            <Button onClick={startSimulation} disabled={!selectedScenarioId} className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm">
                                <Play className="w-4 h-4 mr-2" /> Start Test
                            </Button>
                        ) : (
                            <Button onClick={() => setIsRunning(false)} variant="destructive" className="bg-rose-500 hover:bg-rose-600 text-white shadow-sm">
                                <Pause className="w-4 h-4 mr-2" /> Pause
                            </Button>
                        )}
                        <Button variant="outline" onClick={() => { setIsRunning(false); setMessages([]); }} className="border-gray-200 text-text-muted-dark hover:bg-gray-50">
                            <RefreshCw className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {/* Scenario Info Card */}
                {selectedScenarioId && (
                    <div className="mt-4 p-4 rounded-xl bg-white border border-gray-200 shadow-sm text-sm">
                        {(() => {
                            const s = scenarios.find(sc => sc.id === selectedScenarioId);
                            if (!s) return null;
                            return (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="md:col-span-2">
                                        <h4 className="text-brand-blue font-semibold mb-1">🎯 Persona Objective</h4>
                                        <p className="text-text-muted-dark leading-relaxed">{s.lead_persona}</p>
                                    </div>
                                    <div className="space-y-2">
                                        <div>
                                            <span className="text-text-muted-dark font-medium text-xs uppercase tracking-wider">Identity: </span>
                                            <span className="text-text-dark font-medium">{s.lead_name || 'Unknown'} ({s.lead_age || '?'})</span>
                                        </div>
                                        <div>
                                            <span className="text-text-muted-dark font-medium text-xs uppercase tracking-wider">Difficulty: </span>
                                            <Badge variant="outline" className={
                                                s.difficulty_level === 'Hard' ? 'text-rose-600 border-rose-200 bg-rose-50' :
                                                    s.difficulty_level === 'Medium' ? 'text-amber-600 border-amber-200 bg-amber-50' :
                                                        'text-emerald-600 border-emerald-200 bg-emerald-50'
                                            }>{s.difficulty_level}</Badge>
                                        </div>
                                        <div>
                                            <span className="text-text-muted-dark font-medium text-xs uppercase tracking-wider">Goal: </span>
                                            <span className="text-text-dark text-xs">{s.target_outcome}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                )}
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar bg-main-bg">
                {messages.length === 0 && (
                    <div className="text-center text-text-muted-dark mt-20">
                        <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
                            <Zap className="w-7 h-7 text-amber-500" />
                        </div>
                        <p className="font-medium text-text-dark">Ready for Battle</p>
                        <p className="text-sm mt-1">Select a scenario and press Start to launch the AI vs AI simulation.</p>
                    </div>
                )}
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.sender === 'bot' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] px-5 py-3.5 rounded-2xl ${msg.sender === 'bot'
                            ? 'bg-brand-blue/5 border border-brand-blue/15 text-text-dark rounded-tr-sm'
                            : 'bg-rose-50 border border-rose-100 text-text-dark rounded-tl-sm'
                            }`}>
                            <div className={`text-[11px] font-semibold uppercase tracking-wider mb-1.5 ${msg.sender === 'bot' ? 'text-brand-blue' : 'text-rose-500'}`}>{msg.sender === 'bot' ? 'Alex (Defender)' : 'Simulated Lead (Attacker)'}</div>
                            <p className="text-[14px] leading-relaxed">{msg.content}</p>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </CardContent>

            {/* Grade Controls */}
            {
                turnCount > 2 && !isRunning && (
                    <div className="p-4 border-t border-gray-100 bg-white">
                        <Button onClick={() => gradeSimulation()} className="w-full bg-brand-blue hover:bg-blue-600 text-white shadow-sm">
                            👨‍⚖️ Grade Performance (The Judge)
                        </Button>
                    </div>
                )
            }
        </Card >
    );

    async function gradeSimulation() {
        if (!leadId) return;
        const scenario = scenarios.find(s => s.id === selectedScenarioId);

        try {
            const res = await authFetch('/api/simulation/grade', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_log: messages,
                    scenario_name: scenario?.scenario_name,
                    scenario_id: scenario?.id,
                    lead_persona_name: scenario?.lead_persona
                })
            });

            const data = await res.json();
            if (data.scores) {
                alert(`Judge's Score: ${data.scores.overall_score}/10\n\nNote: ${data.scores.coach_note}`);
            }
        } catch (e) {
            console.error(e);
            alert('Grading failed');
        }
    }
}
