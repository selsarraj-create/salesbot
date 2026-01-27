'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Settings, Info, Zap, Thermometer, BrainCircuit, Activity, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface AIConfig {
    temperature: number;
    top_p: number;
    frequency_penalty: number;
    full_context_mode: boolean;
}

export default function AICalibrationPanel() {
    const [config, setConfig] = useState<AIConfig>({
        temperature: 0.3,
        top_p: 0.95,
        frequency_penalty: 0.5,
        full_context_mode: true
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
        // Optimistic update
        const newConfig = { ...config, [key]: value };
        setConfig(newConfig);

        // Immediate save for toggles, debounced or manual commit for sliders usually better, 
        // but for simplicity/responsiveness we'll save on change (user releases handle)
        // With native input type=range, onChange fires continuously, onMouseUp/onTouchEnd is better for commit.
        // We'll separate state update (onChange) from persist (onMouseUp).
    };

    const commitChange = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/config/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config) // Save current state
            });
            if (!res.ok) throw new Error('Save failed');
        } catch (error) {
            toast.error('Failed to update AI settings');
            fetchConfig(); // Revert
        } finally {
            setSaving(false);
        }
    };

    const handleToggle = (checked: boolean) => {
        const newConfig = { ...config, full_context_mode: checked };
        setConfig(newConfig);
        // Save immediately for toggle
        setSaving(true);
        fetch('/api/config/ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newConfig)
        }).then(res => {
            if (!res.ok) throw new Error();
        }).catch(() => {
            toast.error('Failed to toggle mode');
            setConfig(config); // revert
        }).finally(() => setSaving(false));
    };

    return (
        <Card className="bg-surface border-surface-light h-full">
            <CardHeader className="border-b border-surface-light bg-charcoal/50">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-text-primary">
                            <Settings className="w-5 h-5 text-electric-cyan" />
                            AI Calibration
                        </CardTitle>
                        <CardDescription className="text-text-tertiary">
                            Real-time parameters for gemini-2.0-flash
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

                    <div className="p-3 bg-charcoal rounded-md border border-surface-light text-xs text-text-secondary flex gap-2">
                        <Info className="w-4 h-4 text-text-tertiary shrink-0 mt-0.5" />
                        <div>
                            <p><span className="text-white">0.1 - 0.3:</span> Literalist (Strict script adherence)</p>
                            <p><span className="text-white">0.7 - 0.9:</span> Creative (Conversational, riskier)</p>
                        </div>
                    </div>
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

                    <div className="p-3 bg-charcoal rounded-md border border-surface-light text-xs text-text-secondary flex gap-2">
                        <Info className="w-4 h-4 text-text-tertiary shrink-0 mt-0.5" />
                        <div>
                            <p><span className="text-white">0.1 - 0.5:</span> Factual & Narrow</p>
                            <p><span className="text-white">0.8 - 1.0:</span> Diverse & Conversational (Default: 0.95)</p>
                        </div>
                    </div>
                </div>

                {/* Frequency Penalty */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Activity className="w-4 h-4 text-green-400" />
                            <label className="text-sm font-medium text-text-primary">Frequency Penalty</label>
                        </div>
                        <span className="text-sm font-mono text-electric-cyan bg-electric-cyan/10 px-2 py-0.5 rounded">
                            {config.frequency_penalty.toFixed(1)}
                        </span>
                    </div>

                    <input
                        type="range"
                        min="0" max="1" step="0.1"
                        value={config.frequency_penalty}
                        onChange={(e) => updateConfig('frequency_penalty', parseFloat(e.target.value))}
                        onMouseUp={commitChange}
                        onTouchEnd={commitChange}
                        className="w-full h-2 bg-surface-light rounded-lg appearance-none cursor-pointer accent-green-400"
                    />

                    <div className="p-3 bg-charcoal rounded-md border border-surface-light text-xs text-text-secondary flex gap-2">
                        <Info className="w-4 h-4 text-text-tertiary shrink-0 mt-0.5" />
                        <p>
                            Higher values (0.5+) punish the bot for reusing words. Increase to reduce repetitive loops.
                        </p>
                    </div>
                </div>

                <div className="h-px bg-surface-light my-2" />

                {/* Full Context Toggle */}
                <div className="flex items-center justify-between p-4 bg-charcoal rounded-lg border border-surface-light group hover:border-electric-cyan/30 transition-colors">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <Zap className={`w-4 h-4 ${config.full_context_mode ? 'text-yellow-400' : 'text-text-tertiary'}`} />
                            <label className="font-medium text-text-primary cursor-pointer" onClick={() => handleToggle(!config.full_context_mode)}>
                                Live Training (Full Context)
                            </label>
                        </div>
                        <p className="text-xs text-text-secondary max-w-[220px]">
                            {config.full_context_mode
                                ? "ON: Injecting ALL assets every message (Slower, Accurate)."
                                : "OFF: Using Keyword Optimization (Faster, Cached)."}
                        </p>
                    </div>
                    <Switch
                        checked={config.full_context_mode}
                        onCheckedChange={handleToggle}
                    />
                </div>

                <div className="text-xs text-center text-text-tertiary flex items-center justify-center gap-1 mt-4">
                    <CheckCircle2 className="w-3 h-3" />
                    Changes apply instantly to next generation
                </div>

            </CardContent>
        </Card>
    );
}
