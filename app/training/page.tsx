'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import RulesEngine from '@/app/components/training/RulesEngine';
import ReviewQueue from '@/app/components/training/ReviewQueue';
import FlightSimulator from '@/app/components/training/FlightSimulator';
import AssetLab from '@/app/components/training/AssetLab';
import AICalibrationPanel from '@/app/components/training/AICalibrationPanel';
import AnalyticsDashboard from '@/app/components/training/AnalyticsDashboard';
import { Target, Zap, FileText, TrendingUp, Shield, Settings2 } from 'lucide-react';

type TabType = 'review' | 'assets' | 'simulator' | 'analytics' | 'rules' | 'calibration';

export default function TrainingPage() {
    const [activeTab, setActiveTab] = useState<TabType>('review');

    const tabs = [
        { id: 'review' as TabType, label: 'Review Queue', icon: Target, color: 'text-electric-cyan' },
        { id: 'assets' as TabType, label: 'Asset Lab', icon: FileText, color: 'text-green-400' },
        { id: 'rules' as TabType, label: 'System Rules', icon: Shield, color: 'text-red-400' },
        { id: 'calibration' as TabType, label: 'Calibration', icon: Settings2, color: 'text-orange-400' },
        { id: 'simulator' as TabType, label: 'Flight Simulator', icon: Zap, color: 'text-yellow-400' },
        { id: 'analytics' as TabType, label: 'Analytics', icon: TrendingUp, color: 'text-purple-400' }
    ];

    return (
        <div className="min-h-screen bg-charcoal p-6">
            {/* Header */}
            <div className="max-w-7xl mx-auto mb-6">
                <div className="flex items-center justify-between mb-2">
                    <h1 className="text-3xl font-bold text-text-primary flex items-center gap-3">
                        <span className="text-4xl">🎯</span>
                        AI Command Center
                    </h1>
                    <Badge variant="outline" className="border-electric-cyan text-electric-cyan">
                        Apex Mode
                    </Badge>
                </div>
                <p className="text-text-secondary">
                    Train your AI using real conversations, synthetic simulations, and uploaded knowledge
                </p>
            </div>

            {/* Tab Navigation */}
            <div className="max-w-5xl mx-auto mb-8">
                <div className="flex p-1 bg-surface/30 backdrop-blur-lg rounded-2xl border border-surface-light/30 shadow-inner">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${isActive
                                    ? 'bg-charcoal shadow-sm ring-1 ring-surface-light/50 text-text-primary'
                                    : 'text-text-secondary hover:text-text-primary hover:bg-surface/40'
                                    }`}
                            >
                                <Icon className={`w-4 h-4 ${isActive ? tab.color : 'text-text-secondary/70'}`} />
                                <span className={isActive ? 'text-text-primary' : 'text-text-secondary'}>
                                    {tab.label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Tab Content */}
            <div className="max-w-7xl mx-auto">
                {activeTab === 'review' && <ReviewQueue />}
                {activeTab === 'assets' && <AssetLab />}
                {activeTab === 'rules' && <RulesEngine />}
                {activeTab === 'calibration' && <AICalibrationPanel />}
                {activeTab === 'simulator' && <FlightSimulator />}
                {activeTab === 'analytics' && <AnalyticsDashboard />}
            </div>
        </div>
    );
}
