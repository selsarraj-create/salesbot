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
    const [age, setAge] = useState(''); // New State
    const [leadCode, setLeadCode] = useState('');
    const [loading, setLoading] = useState(false);

    const generateTestCode = async () => {
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
            const finalLeadCode = leadCode || await generateTestCode();
            const finalPhone = phone || `+44TEST${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

            const newLead: Database['public']['Tables']['leads']['Insert'] = {
                name: name || 'Test Lead',
                phone: finalPhone,
                lead_code: finalLeadCode,
                status: 'New',
                is_manual_mode: false,
                is_test: true,
                lead_metadata: { age: age || '22' } // Store Age in metadata
            };

            const { data, error } = await supabase
                .from('leads')
                .insert(newLead as any)
                .select()
                .single();

            if (error) throw error;

            setName('');
            setPhone('');
            setLeadCode('');
            setAge('');

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
        <Card className="bg-surface border-surface-light">
            <CardHeader>
                <CardTitle className="text-text-primary">Create Test Lead</CardTitle>
                <CardDescription className="text-text-secondary">
                    Generate a dummy lead for testing. No SMS costs.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-sm font-medium text-text-primary">Name (optional)</label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="John Doe"
                            className="bg-charcoal border-surface-light text-text-primary"
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium text-text-primary">Phone (optional)</label>
                        <Input
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="+44TEST0001"
                            className="bg-charcoal border-surface-light text-text-primary"
                        />
                        <p className="text-xs text-text-secondary mt-1">
                            Auto-generated if left empty
                        </p>
                    </div>

                    <div>
                        <label className="text-sm font-medium text-text-primary">Lead Code (optional)</label>
                        <Input
                            value={leadCode}
                            onChange={(e) => setLeadCode(e.target.value)}
                            placeholder="#TEST-01"
                            className="bg-charcoal border-surface-light text-text-primary"
                        />
                        <p className="text-xs text-text-secondary mt-1">
                            Auto-increments if left empty
                        </p>
                        <p className="text-xs text-text-secondary mt-1">
                            Auto-increments if left empty
                        </p>
                    </div>

                    <div>
                        <label className="text-sm font-medium text-text-primary">Age (optional)</label>
                        <Input
                            value={age}
                            onChange={(e) => setAge(e.target.value)}
                            placeholder="21"
                            className="bg-charcoal border-surface-light text-text-primary"
                        />
                    </div>

                    <Button type="submit" disabled={loading} className="w-full bg-electric-cyan text-charcoal hover:bg-electric-cyan/90">
                        {loading ? 'Creating...' : 'Generate Test Lead'}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
