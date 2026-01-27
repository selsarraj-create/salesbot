'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import RulesEngine from '@/app/components/training/RulesEngine';
import ReviewQueue from '@/app/components/training/ReviewQueue';
import FlightSimulator from '@/app/components/training/FlightSimulator';
import AssetLab from '@/app/components/training/AssetLab';
import AnalyticsDashboard from '@/app/components/training/AnalyticsDashboard';
import { Target, Zap, FileText, TrendingUp, Shield } from 'lucide-react';

type TabType = 'review' | 'assets' | 'simulator' | 'analytics' | 'rules';

export default function TrainingPage() {
    const [activeTab, setActiveTab] = useState<TabType>('review');

    const tabs = [
        { id: 'review' as TabType, label: 'Review Queue', icon: Target, color: 'text-electric-cyan' },
        { id: 'assets' as TabType, label: 'Asset Lab', icon: FileText, color: 'text-green-400' },
        { id: 'rules' as TabType, label: 'System Rules', icon: Shield, color: 'text-red-400' },
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
            <div className="max-w-7xl mx-auto mb-6">
                <div className="flex gap-2 p-1 bg-surface rounded-lg border border-surface-light">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-md transition-all ${activeTab === tab.id
                                    ? 'bg-electric-cyan/10 border border-electric-cyan/30'
                                    : 'hover:bg-charcoal'
                                    }`}
                            >
                                <Icon className={`w-4 h-4 ${activeTab === tab.id ? tab.color : 'text-text-secondary'}`} />
                                <span className={`font-medium ${activeTab === tab.id ? 'text-text-primary' : 'text-text-secondary'}`}>
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
                {activeTab === 'simulator' && <FlightSimulator />}
                {activeTab === 'analytics' && <AnalyticsDashboard />}
            </div>
        </div>
    );
}
