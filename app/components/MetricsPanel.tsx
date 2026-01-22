'use client';

import { useEffect, useState } from 'react';
import { supabase, subscribeToLeads } from '@/lib/supabase/client';
import type { Lead } from '@/lib/supabase/types';

export default function MetricsPanel() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [filterCode, setFilterCode] = useState('');

    useEffect(() => {
        // Fetch all leads
        async function fetchLeads() {
            const { data, error } = await supabase.from('leads').select('*');

            if (error) {
                console.error('Error fetching leads:', error);
            } else {
                setLeads(data || []);
            }
        }

        fetchLeads();

        // Subscribe to real-time updates
        const channel = subscribeToLeads((payload) => {
            if (payload.eventType === 'INSERT') {
                setLeads((prev) => [...prev, payload.new as Lead]);
            } else if (payload.eventType === 'UPDATE') {
                setLeads((prev) =>
                    prev.map((lead) =>
                        lead.id === payload.new.id ? (payload.new as Lead) : lead
                    )
                );
            } else if (payload.eventType === 'DELETE') {
                setLeads((prev) => prev.filter((lead) => lead.id !== payload.old.id));
            }
        });

        return () => {
            channel.unsubscribe();
        };
    }, []);

    // Filter leads by lead code
    const filteredLeads = filterCode
        ? leads.filter((lead) =>
            lead.lead_code.toLowerCase().includes(filterCode.toLowerCase())
        )
        : leads;

    // Calculate metrics
    const totalLeads = filteredLeads.length;
    const totalBookings = filteredLeads.filter(
        (lead) => lead.status === 'Booked'
    ).length;
    const conversionRate =
        totalLeads > 0 ? ((totalBookings / totalLeads) * 100).toFixed(1) : '0.0';

    // Status breakdown
    const statusCounts = filteredLeads.reduce((acc, lead) => {
        acc[lead.status] = (acc[lead.status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    // Get unique lead codes
    const uniqueCodes = Array.from(new Set(leads.map((lead) => lead.lead_code)));

    return (
        <div className="w-96 bg-gray-50 border-l border-gray-200 flex flex-col h-screen">
            <div className="p-4 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Metrics</h2>

                {/* Lead code filter */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Filter by Lead Code
                    </label>
                    <select
                        value={filterCode}
                        onChange={(e) => setFilterCode(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">All Codes</option>
                        {uniqueCodes.map((code) => (
                            <option key={code} value={code}>
                                {code}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
                {/* Key metrics */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <p className="text-sm text-gray-500">Total Leads</p>
                        <p className="text-3xl font-bold text-gray-800">{totalLeads}</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <p className="text-sm text-gray-500">Bookings</p>
                        <p className="text-3xl font-bold text-green-600">{totalBookings}</p>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <p className="text-sm text-gray-500">Conversion Rate</p>
                    <p className="text-3xl font-bold text-blue-600">{conversionRate}%</p>
                </div>

                {/* Status breakdown */}
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">
                        Status Breakdown
                    </h3>
                    <div className="space-y-2">
                        {Object.entries(statusCounts).map(([status, count]) => {
                            const percentage =
                                totalLeads > 0 ? ((count / totalLeads) * 100).toFixed(0) : '0';

                            return (
                                <div key={status}>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-gray-600">{status}</span>
                                        <span className="font-medium text-gray-800">
                                            {count} ({percentage}%)
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-blue-600 h-2 rounded-full transition-all"
                                            style={{ width: `${percentage}%` }}
                                        ></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Lead codes summary */}
                {uniqueCodes.length > 0 && (
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">
                            Lead Codes ({uniqueCodes.length})
                        </h3>
                        <div className="space-y-1">
                            {uniqueCodes.map((code) => {
                                const codeLeads = leads.filter((lead) => lead.lead_code === code);
                                const codeBookings = codeLeads.filter(
                                    (lead) => lead.status === 'Booked'
                                ).length;

                                return (
                                    <div
                                        key={code}
                                        className="flex justify-between text-sm py-1 border-b border-gray-100 last:border-0"
                                    >
                                        <span className="font-mono text-gray-600">{code}</span>
                                        <span className="text-gray-800">
                                            {codeLeads.length} leads • {codeBookings} booked
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
