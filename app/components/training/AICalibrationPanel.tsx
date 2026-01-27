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
        <Card className="bg-surface border-surface-light h-full overflow-y-auto">
            <CardHeader className="border-b border-surface-light bg-charcoal/50">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-text-primary">
                            <Settings className="w-5 h-5 text-electric-cyan" />
                            AI Calibration
                        </CardTitle>
                        <CardDescription className="text-text-tertiary">
                            Real-time parameters for gemini-2.5-flash
                        </CardDescription>
                    </div>
                    {saving ? (
                        <Badge variant="outline" className="border-electric-cyan/50 text-electric-cyan animate-pulse">Saving...</Badge>
                    ) : (
                        <div className="h-6"></div>
                    )}
                </div>
            </CardHeader>
            <CardContent className="p-6 space-y-8">

                {/* --- PRESET BUTTONS --- */}
                <div className="grid grid-cols-3 gap-3">
                    <button onClick={() => applyPreset('fast')} className="flex flex-col items-center justify-center p-3 rounded-lg border border-surface-light bg-charcoal hover:bg-surface-light/50 transition-colors group">
                        <Rocket className="w-5 h-5 text-green-400 mb-2 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-medium text-text-primary">Fast SMS</span>
                        <span className="text-[10px] text-text-tertiary mt-1">Budget: 0</span>
                    </button>
                    <button onClick={() => applyPreset('balanced')} className="flex flex-col items-center justify-center p-3 rounded-lg border border-surface-light bg-charcoal hover:bg-surface-light/50 transition-colors group">
                        <Scale className="w-5 h-5 text-blue-400 mb-2 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-medium text-text-primary">Balanced</span>
                        <span className="text-[10px] text-text-tertiary mt-1">Budget: 1k</span>
                    </button>
                    <button onClick={() => applyPreset('crusher')} className="flex flex-col items-center justify-center p-3 rounded-lg border border-surface-light bg-charcoal hover:bg-surface-light/50 transition-colors group">
                        <ShieldAlert className="w-5 h-5 text-orange-400 mb-2 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-medium text-text-primary">Obj. Crusher</span>
                        <span className="text-[10px] text-text-tertiary mt-1">Budget: 4k</span>
                    </button>
                </div>

                <div className="h-px bg-surface-light my-2" />

                {/* --- THINKING CONTROLS --- */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Lightbulb className="w-4 h-4 text-yellow-400" />
                            <label className="text-sm font-medium text-text-primary">Thinking Budget (Tokens)</label>
                        </div>
                        <span className="text-sm font-mono text-electric-cyan bg-electric-cyan/10 px-2 py-0.5 rounded">
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
                        className="w-full h-2 bg-surface-light rounded-lg appearance-none cursor-pointer accent-yellow-400"
                    />

                    <div className="flex items-center justify-between p-3 bg-charcoal rounded-lg border border-surface-light">
                        <div className="flex items-center gap-2">
                            <LabelWithTooltip label="Show Thought Summary" tooltip="If ON, the AI's internal reasoning will be visible in the Review Queue." />
                        </div>
                        <Switch
                            checked={!!config.show_thoughts}
                            onCheckedChange={(c) => handleToggle('show_thoughts', c)}
                        />
                    </div>
                </div>

                <div className="h-px bg-surface-light my-2" />

                {/* Temperature */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Thermometer className="w-4 h-4 text-orange-400" />
                            <label className="text-sm font-medium text-text-primary">Temperature (Creativity)</label>
                        </div>
                        <span className="text-sm font-mono text-electric-cyan bg-electric-cyan/10 px-2 py-0.5 rounded">
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
                        className="w-full h-2 bg-surface-light rounded-lg appearance-none cursor-pointer accent-electric-cyan"
                    />
                </div>

                {/* Top P */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <BrainCircuit className="w-4 h-4 text-purple-400" />
                            <label className="text-sm font-medium text-text-primary">Top P (Focus)</label>
                        </div>
                        <span className="text-sm font-mono text-electric-cyan bg-electric-cyan/10 px-2 py-0.5 rounded">
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
                        className="w-full h-2 bg-surface-light rounded-lg appearance-none cursor-pointer accent-purple-400"
                    />
                </div>

                {/* Full Context Toggle */}
                <div className="flex items-center justify-between p-4 bg-charcoal rounded-lg border border-surface-light group hover:border-electric-cyan/30 transition-colors">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <Zap className={`w-4 h-4 ${config.full_context_mode ? 'text-yellow-400' : 'text-text-tertiary'}`} />
                            <label className="font-medium text-text-primary cursor-pointer" onClick={() => handleToggle('full_context_mode', !config.full_context_mode)}>
                                Live Training (Full Context)
                            </label>
                        </div>
                        <p className="text-xs text-text-secondary max-w-[220px]">
                            {config.full_context_mode
                                ? "ON: Injecting ALL assets every message."
                                : "OFF: Optimized Keyword Caching."}
                        </p>
                    </div>
                    <Switch
                        checked={config.full_context_mode}
                        onCheckedChange={(c) => handleToggle('full_context_mode', c)}
                    />
                </div>

            </CardContent>
        </Card>
    );
}

function LabelWithTooltip({ label, tooltip }: { label: string, tooltip: string }) {
    return (
        <div className="flex items-center gap-2 group relative">
            <span className="text-sm font-medium text-text-primary">{label}</span>
            <Info className="w-3.5 h-3.5 text-text-tertiary cursor-help" />
            <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-48 p-2 bg-black/90 text-xs text-white rounded border border-surface-light z-50 pointer-events-none">
                {tooltip}
            </div>
        </div>
    );
}
