'use client';

import { useEffect, useState } from 'react';
import { authFetch } from '@/lib/auth/auth-fetch';
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
            const res = await authFetch('/api/cron/concierge');
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
        <Card className="bg-white border border-gray-100 shadow-sm h-full">
            <CardHeader><CardTitle className="text-text-dark text-sm">Concierge Status</CardTitle></CardHeader>
            <CardContent className="text-text-muted-dark text-xs">Loading live feeds...</CardContent>
        </Card>
    );

    const northern = status.tfl.find(t => t.line === 'Northern Line');
    const isBadWeather = ['Rain', 'Heavy Rain', 'Storm'].includes(status.weather.condition);

    return (
        <Card className="bg-white border border-gray-100 shadow-sm h-full">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-text-dark text-sm flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        Concierge Live
                    </CardTitle>
                    <Button variant="ghost" size="icon" onClick={checkStatus} title="Refresh" className="text-text-muted-dark hover:bg-gray-100 h-8 w-8">
                        <span className="text-xs">↻</span>
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {/* TfL Status */}
                <div className="flex items-center justify-between p-3 bg-panel-bg rounded-xl border border-gray-100">
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                            <Train className="w-3.5 h-3.5 text-blue-500" />
                        </div>
                        <span className="text-sm text-text-dark font-medium">Northern Line</span>
                    </div>
                    <Badge variant={northern?.status === 'Good Service' ? 'outline' : 'destructive'}
                        className={northern?.status === 'Good Service' ? 'text-emerald-600 border-emerald-200 bg-emerald-50' : ''}>
                        {northern?.status || 'Unknown'}
                    </Badge>
                </div>

                {/* Thameslink Status */}
                <div className="flex items-center justify-between p-3 bg-panel-bg rounded-xl border border-gray-100">
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center">
                            <Train className="w-3.5 h-3.5 text-purple-500" />
                        </div>
                        <span className="text-sm text-text-dark font-medium">Thameslink</span>
                    </div>
                    <Badge variant={status.tfl.find(t => t.line === 'Thameslink')?.status === 'Good Service' ? 'outline' : 'destructive'}
                        className={status.tfl.find(t => t.line === 'Thameslink')?.status === 'Good Service' ? 'text-emerald-600 border-emerald-200 bg-emerald-50' : ''}>
                        {status.tfl.find(t => t.line === 'Thameslink')?.status || 'Unknown'}
                    </Badge>
                </div>

                {/* Weather Status */}
                <div className="flex items-center justify-between p-3 bg-panel-bg rounded-xl border border-gray-100">
                    <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isBadWeather ? 'bg-blue-50' : 'bg-amber-50'}`}>
                            {isBadWeather ? <CloudRain className="w-3.5 h-3.5 text-blue-500" /> : <Sun className="w-3.5 h-3.5 text-amber-500" />}
                        </div>
                        <span className="text-sm text-text-dark font-medium">NW5 Weather</span>
                    </div>
                    <div className="text-right">
                        <span className="block text-sm font-semibold text-text-dark">{status.weather.temp}°C</span>
                        <span className="text-[11px] text-text-muted-dark">{status.weather.condition}</span>
                    </div>
                </div>

                {/* Manual Trigger */}
                <Button className="w-full bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs h-9 shadow-sm font-medium">
                    <AlertTriangle className="w-3 h-3 mr-2" />
                    Emergency Broadcast
                </Button>
            </CardContent>
        </Card>
    );
}
