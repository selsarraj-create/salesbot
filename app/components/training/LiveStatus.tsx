'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CloudRain, Sun, Train, AlertTriangle, Send } from 'lucide-react';

interface Status {
    tfl: Array<{ line: string, status: string }>;
    weather: { condition: string, temp: number };
}

export default function LiveStatus() {
    const [status, setStatus] = useState<Status | null>(null);
    const [loading, setLoading] = useState(true);

    const checkStatus = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/cron/concierge');
            const data = await res.json();
            if (data.conditions) {
                setStatus(data.conditions);
            } else if (data.tfl && data.weather) {
                setStatus({ tfl: data.tfl, weather: data.weather });
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkStatus();
    }, []);

    if (loading || !status) return (
        <Card className="bg-surface border-surface-light h-full">
            <CardHeader><CardTitle className="text-text-primary text-sm">Concierge Status</CardTitle></CardHeader>
            <CardContent className="text-text-secondary text-xs">Loading live feeds...</CardContent>
        </Card>
    );

    const northern = status.tfl.find(t => t.line === 'Northern Line');
    const isBadWeather = ['Rain', 'Heavy Rain', 'Storm'].includes(status.weather.condition);

    return (
        <Card className="bg-surface border-surface-light h-full">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-text-primary text-sm flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        Concierge Live
                    </CardTitle>
                    <Button variant="ghost" size="icon" onClick={checkStatus} title="Refresh">
                        <span className="text-xs">↻</span>
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* TfL Status */}
                <div className="flex items-center justify-between p-2 bg-charcoal rounded border border-surface-light">
                    <div className="flex items-center gap-2">
                        <Train className="w-4 h-4 text-text-secondary" />
                        <span className="text-sm text-text-primary">Northern Line</span>
                    </div>
                    <Badge variant={northern?.status === 'Good Service' ? 'outline' : 'destructive'}>
                        {northern?.status || 'Unknown'}
                    </Badge>
                </div>

                {/* Thameslink Status */}
                <div className="flex items-center justify-between p-2 bg-charcoal rounded border border-surface-light">
                    <div className="flex items-center gap-2">
                        <Train className="w-4 h-4 text-text-secondary" />
                        <span className="text-sm text-text-primary">Thameslink</span>
                    </div>
                    <Badge variant={status.tfl.find(t => t.line === 'Thameslink')?.status === 'Good Service' ? 'outline' : 'destructive'}>
                        {status.tfl.find(t => t.line === 'Thameslink')?.status || 'Unknown'}
                    </Badge>
                </div>

                {/* Weather Status */}
                <div className="flex items-center justify-between p-2 bg-charcoal rounded border border-surface-light">
                    <div className="flex items-center gap-2">
                        {isBadWeather ? <CloudRain className="w-4 h-4 text-blue-400" /> : <Sun className="w-4 h-4 text-yellow-400" />}
                        <span className="text-sm text-text-primary">NW5 Weather</span>
                    </div>
                    <div className="text-right">
                        <span className="block text-sm font-medium text-text-primary">{status.weather.temp}°C</span>
                        <span className="text-xs text-text-secondary">{status.weather.condition}</span>
                    </div>
                </div>

                {/* Manual Trigger */}
                <Button className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs h-8">
                    <AlertTriangle className="w-3 h-3 mr-2" />
                    Emergency Broadcast
                </Button>
            </CardContent>
        </Card>
    );
}
