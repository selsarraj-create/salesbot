'use client';

import { useState } from 'react';
import ReviewQueue from '@/app/components/training/ReviewQueue';
import FlightSimulator from '@/app/components/training/FlightSimulator';
import AnalyticsDashboard from '@/app/components/training/AnalyticsDashboard';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, Zap, BarChart3, MessageSquare } from 'lucide-react';

export default function TrainingPage() {
    const [activeTab, setActiveTab] = useState<'review' | 'simulator' | 'analytics'>('review');

    return (
        <div className="container mx-auto p-6 max-w-7xl">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-text-primary mb-2">AI Training Center 🥋</h1>
                <p className="text-text-secondary">Coach your Sales Bot to perfection using RLHF and Stress Testing.</p>
            </header>

            <div className="flex gap-2 mb-6 border-b border-surface-light pb-4 overflow-x-auto">
                <Button
                    variant={activeTab === 'review' ? 'default' : 'ghost'}
                    onClick={() => setActiveTab('review')}
                    className={activeTab === 'review' ? 'bg-electric-cyan text-charcoal' : 'text-text-secondary'}
                >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Review Queue
                </Button>
                <Button
                    variant={activeTab === 'simulator' ? 'default' : 'ghost'}
                    onClick={() => setActiveTab('simulator')}
                    className={activeTab === 'simulator' ? 'bg-electric-cyan text-charcoal' : 'text-text-secondary'}
                >
                    <Zap className="w-4 h-4 mr-2" />
                    Flight Simulator
                </Button>
                <Button
                    variant={activeTab === 'analytics' ? 'default' : 'ghost'}
                    onClick={() => setActiveTab('analytics')}
                    className={activeTab === 'analytics' ? 'bg-electric-cyan text-charcoal' : 'text-text-secondary'}
                >
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Analytics
                </Button>
            </div>

            <main className="min-h-[600px]">
                {activeTab === 'review' && (
                    <div className="animate-in fade-in slide-in-from-left-4 duration-300">
                        <ReviewQueue />
                    </div>
                )}

                {activeTab === 'simulator' && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                        <FlightSimulator />
                    </div>
                )}

                import AnalyticsDashboard from '@/app/components/training/AnalyticsDashboard';

                // ... (inside component)

                {activeTab === 'analytics' && (
                    <div className="animate-in zoom-in-95 duration-300">
                        <AnalyticsDashboard />
                    </div>
                )}
            </main>
        </div>
    );
}
