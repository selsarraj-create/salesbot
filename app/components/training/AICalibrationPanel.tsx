'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Settings, Info, Zap, Thermometer, BrainCircuit, Activity, CheckCircle2, Lightbulb, Rocket, Scale, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

interface AIConfig {
    temperature: number;
    top_p: number;
    frequency_penalty: number;
    full_context_mode: boolean;
    thinking_budget?: number;
    show_thoughts?: boolean;
}

export default function AICalibrationPanel() {
    const [config, setConfig] = useState<AIConfig>({
        temperature: 0.3,
        top_p: 0.95,
        frequency_penalty: 0.5,
        full_context_mode: true,
        thinking_budget: 0,
        show_thoughts: false
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const res = await fetch('/api/config/ai');
            const data = await res.json();
            if (data.config) {
                setConfig(data.config);
            }
        } catch (error) {
            console.error('Failed to fetch AI config:', error);
            toast.error('Failed to load AI settings');
        } finally {
            setLoading(false);
        }
    };

    const updateConfig = async (key: keyof AIConfig, value: number | boolean) => {
        const newConfig = { ...config, [key]: value };
        setConfig(newConfig);
    };

    const commitChange = async () => {
        saveConfig(config);
    };

    const saveConfig = async (newConfig: AIConfig) => {
        setSaving(true);
        try {
            const res = await fetch('/api/config/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newConfig)
            });
            if (!res.ok) throw new Error('Save failed');
        } catch (error) {
            toast.error('Failed to update AI settings');
            fetchConfig(); // Revert
        } finally {
            setSaving(false);
        }
    };

    const handleToggle = (key: keyof AIConfig, checked: boolean) => {
        const newConfig = { ...config, [key]: checked };
        setConfig(newConfig);
        saveConfig(newConfig);
    };

    const applyPreset = (preset: 'fast' | 'balanced' | 'crusher') => {
        let newConfig = { ...config };
        if (preset === 'fast') {
            newConfig.thinking_budget = 0;
            newConfig.temperature = 0.4;
            newConfig.show_thoughts = false;
            toast.success('Applied: Fast SMS Mode');
        } else if (preset === 'balanced') {
            newConfig.thinking_budget = 1024;
            newConfig.temperature = 0.7;
            newConfig.show_thoughts = true;
            toast.success('Applied: Balanced Sales Mode');
        } else if (preset === 'crusher') {
            newConfig.thinking_budget = 4000;
            newConfig.temperature = 0.8;
            newConfig.show_thoughts = true;
            toast.success('Applied: Objection Crusher Mode');
        }
        setConfig(newConfig);
        saveConfig(newConfig);
    };

    return (
        <Card className="bg-white border border-gray-100 shadow-sm h-full overflow-y-auto custom-scrollbar">
            <CardHeader className="border-b border-gray-100 bg-panel-bg">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-text-dark text-lg">
                            <Settings className="w-5 h-5 text-brand-blue" />
                            AI Calibration
                        </CardTitle>
                        <CardDescription className="text-text-muted-dark mt-1">
                            Real-time parameters for gemini-2.5-flash
                        </CardDescription>
                    </div>
                    {saving ? (
                        <Badge variant="outline" className="border-brand-blue/30 text-brand-blue animate-pulse bg-brand-blue/5">Saving...</Badge>
                    ) : (
                        <div className="h-6"></div>
                    )}
                </div>
            </CardHeader>
            <CardContent className="p-6 space-y-8">

                {/* --- PRESET BUTTONS --- */}
                <div className="grid grid-cols-3 gap-3">
                    <button onClick={() => applyPreset('fast')} className="flex flex-col items-center justify-center p-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 hover:border-emerald-200 transition-all group shadow-sm">
                        <Rocket className="w-5 h-5 text-emerald-500 mb-2 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-semibold text-text-dark">Fast SMS</span>
                        <span className="text-[10px] text-text-muted-dark mt-1 font-mono">Budget: 0</span>
                    </button>
                    <button onClick={() => applyPreset('balanced')} className="flex flex-col items-center justify-center p-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 hover:border-brand-blue/30 transition-all group shadow-sm">
                        <Scale className="w-5 h-5 text-brand-blue mb-2 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-semibold text-text-dark">Balanced</span>
                        <span className="text-[10px] text-text-muted-dark mt-1 font-mono">Budget: 1k</span>
                    </button>
                    <button onClick={() => applyPreset('crusher')} className="flex flex-col items-center justify-center p-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 hover:border-amber-200 transition-all group shadow-sm">
                        <ShieldAlert className="w-5 h-5 text-amber-500 mb-2 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-semibold text-text-dark">Obj. Crusher</span>
                        <span className="text-[10px] text-text-muted-dark mt-1 font-mono">Budget: 4k</span>
                    </button>
                </div>

                <div className="h-px bg-gray-100 my-2" />

                {/* --- THINKING CONTROLS --- */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Lightbulb className="w-4 h-4 text-amber-500" />
                            <label className="text-sm font-medium text-text-dark">Thinking Budget (Tokens)</label>
                        </div>
                        <span className="text-sm font-mono text-brand-blue bg-brand-blue/5 px-2.5 py-0.5 rounded-lg">
                            {config.thinking_budget || 0}
                        </span>
                    </div>

                    <input
                        type="range"
                        min="0" max="24576" step="128"
                        value={config.thinking_budget || 0}
                        onChange={(e) => updateConfig('thinking_budget', parseInt(e.target.value))}
                        onMouseUp={commitChange}
                        onTouchEnd={commitChange}
                        className="w-full"
                    />

                    <div className="flex items-center justify-between p-3.5 bg-panel-bg rounded-xl border border-gray-200">
                        <div className="flex items-center gap-2">
                            <LabelWithTooltip label="Show Thought Summary" tooltip="If ON, the AI's internal reasoning will be visible in the Review Queue." />
                        </div>
                        <Switch
                            checked={!!config.show_thoughts}
                            onCheckedChange={(c) => handleToggle('show_thoughts', c)}
                            className="data-[state=checked]:bg-brand-blue"
                        />
                    </div>
                </div>

                <div className="h-px bg-gray-100 my-2" />

                {/* Temperature */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Thermometer className="w-4 h-4 text-orange-500" />
                            <label className="text-sm font-medium text-text-dark">Temperature (Creativity)</label>
                        </div>
                        <span className="text-sm font-mono text-brand-blue bg-brand-blue/5 px-2.5 py-0.5 rounded-lg">
                            {config.temperature.toFixed(1)}
                        </span>
                    </div>

                    <input
                        type="range"
                        min="0" max="1" step="0.1"
                        value={config.temperature}
                        onChange={(e) => updateConfig('temperature', parseFloat(e.target.value))}
                        onMouseUp={commitChange}
                        onTouchEnd={commitChange}
                        className="w-full"
                    />
                </div>

                {/* Top P */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <BrainCircuit className="w-4 h-4 text-purple-500" />
                            <label className="text-sm font-medium text-text-dark">Top P (Focus)</label>
                        </div>
                        <span className="text-sm font-mono text-brand-blue bg-brand-blue/5 px-2.5 py-0.5 rounded-lg">
                            {config.top_p.toFixed(2)}
                        </span>
                    </div>

                    <input
                        type="range"
                        min="0" max="1" step="0.05"
                        value={config.top_p}
                        onChange={(e) => updateConfig('top_p', parseFloat(e.target.value))}
                        onMouseUp={commitChange}
                        onTouchEnd={commitChange}
                        className="w-full"
                    />
                </div>

                {/* Full Context Toggle */}
                <div className="flex items-center justify-between p-4 bg-panel-bg rounded-xl border border-gray-200 group hover:border-brand-blue/20 transition-colors">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <Zap className={`w-4 h-4 ${config.full_context_mode ? 'text-amber-500' : 'text-text-muted-dark'}`} />
                            <label className="font-medium text-text-dark cursor-pointer" onClick={() => handleToggle('full_context_mode', !config.full_context_mode)}>
                                Live Training (Full Context)
                            </label>
                        </div>
                        <p className="text-xs text-text-muted-dark max-w-[220px]">
                            {config.full_context_mode
                                ? "ON: Injecting ALL assets every message."
                                : "OFF: Optimized Keyword Caching."}
                        </p>
                    </div>
                    <Switch
                        checked={config.full_context_mode}
                        onCheckedChange={(c) => handleToggle('full_context_mode', c)}
                        className="data-[state=checked]:bg-brand-blue"
                    />
                </div>

            </CardContent>
        </Card>
    );
}

function LabelWithTooltip({ label, tooltip }: { label: string, tooltip: string }) {
    return (
        <div className="flex items-center gap-2 group relative">
            <span className="text-sm font-medium text-text-dark">{label}</span>
            <Info className="w-3.5 h-3.5 text-text-muted-dark cursor-help" />
            <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-48 p-2.5 bg-sidebar-bg text-xs text-text-light rounded-lg border border-sidebar-surface z-50 pointer-events-none shadow-lg">
                {tooltip}
            </div>
        </div>
    );
}
