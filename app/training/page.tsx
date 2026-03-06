'use client';

import { useState } from 'react';
import AppShell from '../components/AppShell';
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
        { id: 'review' as TabType, label: 'Review Queue', icon: Target, color: 'text-brand-blue' },
        { id: 'assets' as TabType, label: 'Asset Lab', icon: FileText, color: 'text-emerald-500' },
        { id: 'rules' as TabType, label: 'System Rules', icon: Shield, color: 'text-rose-500' },
        { id: 'calibration' as TabType, label: 'Calibration', icon: Settings2, color: 'text-amber-500' },
        { id: 'simulator' as TabType, label: 'Flight Simulator', icon: Zap, color: 'text-yellow-500' },
        { id: 'analytics' as TabType, label: 'Analytics', icon: TrendingUp, color: 'text-purple-500' }
    ];

    return (
        <AppShell title="AI Command Center">
            {/* Header */}
            <div className="max-w-7xl mx-auto mb-6">
                <div className="flex items-center justify-between mb-2">
                    <h1 className="text-3xl font-bold text-text-dark flex items-center gap-3">
                        <span className="text-4xl">🎯</span>
                        AI Command Center
                    </h1>
                    <Badge variant="outline" className="border-brand-blue text-brand-blue bg-brand-blue/5">
                        Apex Mode
                    </Badge>
                </div>
                <p className="text-text-muted-dark">
                    Train your AI using real conversations, synthetic simulations, and uploaded knowledge
                </p>
            </div>

            {/* Tab Navigation */}
            <div className="max-w-5xl mx-auto mb-8">
                <div className="flex p-1.5 bg-white rounded-2xl border border-gray-100 shadow-sm">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${isActive
                                    ? 'bg-panel-bg shadow-sm ring-1 ring-gray-200 text-text-dark'
                                    : 'text-text-muted-dark hover:text-text-dark hover:bg-gray-50'
                                    }`}
                            >
                                <Icon className={`w-4 h-4 ${isActive ? tab.color : 'text-text-muted-dark/70'}`} />
                                <span className={isActive ? 'text-text-dark' : 'text-text-muted-dark'}>
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
        </AppShell>
    );
}
