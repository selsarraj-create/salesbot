'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/types';

export default function TestLeadForm({ onLeadCreated }: { onLeadCreated?: () => void }) {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [leadCode, setLeadCode] = useState('');
    const [loading, setLoading] = useState(false);

    // Auto-generate test lead code
    const generateTestCode = async () => {
        // Get count of existing test leads
        const { count } = await supabase
            .from('leads')
            .select('*', { count: 'exact', head: true })
            .eq('is_test', true);

        const nextNumber = (count || 0) + 1;
        return `#TEST-${String(nextNumber).padStart(2, '0')}`;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Generate test code if not provided
            const finalLeadCode = leadCode || await generateTestCode();

            // Generate test phone if not provided
            const finalPhone = phone || `+44TEST${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

            // Create test lead with explicit typing
            const newLead: Database['public']['Tables']['leads']['Insert'] = {
                name: name || 'Test Lead',
                phone: finalPhone,
                lead_code: finalLeadCode,
                status: 'New',
                is_manual_mode: false,
                is_test: true
            };

            const { data, error } = await supabase
                .from('leads')
                .insert(newLead)
                .select()
                .single();

            if (error) throw error;

            // Reset form
            setName('');
            setPhone('');
            setLeadCode('');

            // Notify parent
            if (onLeadCreated) onLeadCreated();

            alert(`Test lead created: ${finalLeadCode}`);
        } catch (error: any) {
            console.error('Error creating test lead:', error);
            alert(`Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Create Test Lead</CardTitle>
                <CardDescription>
                    Generate a dummy lead for testing. No SMS costs.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-sm font-medium">Name (optional)</label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="John Doe"
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium">Phone (optional)</label>
                        <Input
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="+44TEST0001"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Auto-generated if left empty
                        </p>
                    </div>

                    <div>
                        <label className="text-sm font-medium">Lead Code (optional)</label>
                        <Input
                            value={leadCode}
                            onChange={(e) => setLeadCode(e.target.value)}
                            placeholder="#TEST-01"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Auto-increments if left empty
                        </p>
                    </div>

                    <Button type="submit" disabled={loading} className="w-full">
                        {loading ? 'Creating...' : 'Generate Test Lead'}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
