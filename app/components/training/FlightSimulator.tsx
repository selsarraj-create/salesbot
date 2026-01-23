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
            if (data) setScenarios(data);
        };
        fetchScenarios();
    }, []);

    // Create a temporary lead when starting simulation
    const startSimulation = async () => {
        if (!selectedScenarioId) {
            alert('Please select a scenario first');
            return;
        }

        try {
            console.log('[FlightSimulator] Starting simulation with scenario:', selectedScenarioId);

            // 1. Create realistic dummy lead
            const dummyCode = `#SIM${Math.floor(Math.random() * 10000)}`;
            console.log('[FlightSimulator] Creating dummy lead:', dummyCode);

            const { data: lead, error } = await supabase.from('leads').insert({
                lead_code: dummyCode,
                status: 'New',
                name: 'Simulated Lead',
                phone: 'SIM-000', // Dummy phone for simulation
                is_test: true,
                is_manual_mode: false
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

                // Kickoff: Attacker speaks first
                runTurn(lead.id, []);
            }
        } catch (err: any) {
            console.error('[FlightSimulator] Unexpected error:', err);
            alert('Unexpected error starting simulation: ' + err.message);
        }
    };

    const runTurn = async (currentLeadId: string, history: Message[]) => {
        if (!isRunning) return;

        const scenario = scenarios.find(s => s.id === selectedScenarioId);
        if (!scenario) return;

        // --- STEP 1: ATTACKER (Lead AI) ---
        // If history is empty, Attacker starts. 
        // If last msg was from 'bot', Attacker responds.
        const lastMsg = history[history.length - 1];

        if (!lastMsg || lastMsg.sender === 'bot') {
            try {
                const res = await fetch('/api/simulation/run', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        history: history,
                        persona: scenario.lead_persona,
                        scenario_name: scenario.scenario_name
                    })
                });

                const data = await res.json();
                const attackerMsg = data.attacker_message;

                // Add to UI state
                const newHistory = [...history, { id: 'lead-' + Date.now(), sender: 'lead', content: attackerMsg } as Message];
                setMessages(newHistory);

                // Small delay strictly for visual pacing
                await new Promise(r => setTimeout(r, 1500));

                // --- STEP 2: DEFENDER (Alex/Sandbox) ---
                // Now send this attacker msg to the REAL Sandbox API
                const sandboxRes = await fetch('/api/sandbox', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        lead_id: currentLeadId,
                        message: attackerMsg,
                        simulate_latency: true // Use natural latency
                    })
                });

                const sandboxData = await sandboxRes.json();
                const defenderMsg = sandboxData.response;

                // Add Defender response to state
                const finalHistory = [...newHistory, { id: 'bot-' + Date.now(), sender: 'bot', content: defenderMsg } as Message];
                setMessages(finalHistory);

                setTurnCount(TC => TC + 1);

            } catch (err) {
                console.error("Simulation broken:", err);
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
        </Card>
    );
}
