'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, Pause, RefreshCw, Zap } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { SimulatedScenario } from '@/lib/supabase/types';

interface Message {
    id: string;
    sender: 'bot' | 'lead';
    content: string;
}

export default function FlightSimulator() {
    const [scenarios, setScenarios] = useState<SimulatedScenario[]>([]);
    const [selectedScenarioId, setSelectedScenarioId] = useState<string>('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [isRunning, setIsRunning] = useState(false);
    const [turnCount, setTurnCount] = useState(0);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [leadId, setLeadId] = useState<string | null>(null);
    const [simLeadName, setSimLeadName] = useState("Sarah");
    const [simLeadAge, setSimLeadAge] = useState("7");

    // Fetch Scenarios on mount
    useEffect(() => {
        // ... (existing fetch logic)
    }, []);

    // Create a temporary lead when starting simulation
    const startSimulation = async () => {
        if (!selectedScenarioId) {
            alert('Please select a scenario first');
            return;
        }

        try {
            console.log('[FlightSimulator] Starting simulation with scenario:', selectedScenarioId);

            // 1. Create realistic dummy lead with unique phone and code
            const timestamp = Date.now();
            const dummyCode = `#SIM-${timestamp}-${Math.floor(Math.random() * 1000)}`;
            const dummyPhone = `SIM-${timestamp}`;
            console.log('[FlightSimulator] Creating dummy lead:', dummyCode, dummyPhone);

            const { data: lead, error } = await supabase.from('leads').insert({
                lead_code: dummyCode,
                status: 'New',
                name: simLeadName,
                phone: dummyPhone,
                is_test: true,
                is_manual_mode: false,
                lead_metadata: { age: simLeadAge } // Store age in metadata
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
                const initRes = await fetch('/api/sandbox', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        lead_id: lead.id,
                        action: 'initiate',
                        lead_context: {
                            name: simLeadName,
                            age: simLeadAge
                        }
                    })
                });
                // ... 
                return (
                    // ... inside UI header ...
                    <div className="flex gap-4 mb-6">
                        <Select onValueChange={setSelectedScenarioId}>
                            {/* ... existing select ... */}
                        </Select>

                        <div className="flex gap-2 items-center">
                            <input
                                className="bg-background border border-border rounded px-3 py-2 w-32"
                                placeholder="Lead Name"
                                value={simLeadName}
                                onChange={(e) => setSimLeadName(e.target.value)}
                            />
                            <input
                                className="bg-background border border-border rounded px-3 py-2 w-20"
                                placeholder="Age"
                                value={simLeadAge}
                                onChange={(e) => setSimLeadAge(e.target.value)}
                            />
                        </div>

                        <Button onClick={startSimulation} disabled={isRunning || !selectedScenarioId} className="gap-2">
                            {isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                            {isRunning ? 'Running...' : 'Start Simulation'}
                        </Button>
                    </div>
                );

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
                const res = await fetch('/api/simulation/run', {
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
                const sandboxRes = await fetch('/api/sandbox', {
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
        <Card className="h-[600px] flex flex-col bg-charcoal border-surface-light">
            <CardHeader className="border-b border-surface-light bg-surface/50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <CardTitle className="text-text-primary flex items-center gap-2">
                            <Zap className="text-yellow-400" />
                            Flight Simulator
                        </CardTitle>
                        <Select onValueChange={setSelectedScenarioId} disabled={isRunning}>
                            <SelectTrigger className="w-[250px] bg-background border-surface-light text-text-primary">
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
                            <Button onClick={startSimulation} disabled={!selectedScenarioId} className="bg-green-600 hover:bg-green-700 text-white">
                                <Play className="w-4 h-4 mr-2" /> Start Test
                            </Button>
                        ) : (
                            <Button onClick={() => setIsRunning(false)} variant="destructive">
                                <Pause className="w-4 h-4 mr-2" /> Pause
                            </Button>
                        )}
                        <Button variant="outline" onClick={() => { setIsRunning(false); setMessages([]); }} className="border-surface-light">
                            <RefreshCw className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                    <div className="text-center text-text-secondary mt-20">
                        <p>Select a scenario and press Start to launch the AI vs AI battle.</p>
                    </div>
                )}
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.sender === 'bot' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] px-4 py-3 rounded-lg ${msg.sender === 'bot'
                            ? 'bg-electric-cyan/10 border border-electric-cyan/30 text-electric-cyan'
                            : 'bg-red-500/10 border border-red-500/30 text-red-400'
                            }`}>
                            <div className="text-xs opacity-70 mb-1">{msg.sender === 'bot' ? 'Alex (Defender)' : 'Simulated Lead (Attacker)'}</div>
                            {msg.content}
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </CardContent>

            {/* Grade Controls */}
            {turnCount > 2 && !isRunning && (
                <div className="p-4 border-t border-surface-light bg-surface/50">
                    <Button onClick={() => gradeSimulation()} className="w-full bg-cyan-600 hover:bg-cyan-700">
                        👨‍⚖️ Grade Performance (The Judge)
                    </Button>
                </div>
            )}
        </Card>
    );

    async function gradeSimulation() {
        if (!leadId) return;
        const scenario = scenarios.find(s => s.id === selectedScenarioId);

        try {
            const res = await fetch('/api/simulation/grade', {
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
