'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';

export default function SignupPage() {
    const router = useRouter();

    const [step, setStep] = useState(1); // 1 = account, 2 = studio
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [studioName, setStudioName] = useState('');
    const [studioSlug, setStudioSlug] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Auto-generate slug from studio name
    const handleStudioNameChange = (name: string) => {
        setStudioName(name);
        setStudioSlug(name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // 1. Create auth user
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
            });

            if (authError) throw authError;
            if (!authData.user) throw new Error('Signup failed — no user returned');

            const userId = authData.user.id;

            // 2. Create tenant (using service role via API)
            const res = await fetch('/api/onboarding', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    email,
                    displayName,
                    studioName,
                    studioSlug,
                }),
            });

            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Failed to create studio');

            router.push('/');
            router.refresh();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-main-bg flex items-center justify-center p-6">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-3 mb-2">
                        <span className="bg-brand-blue text-white text-xl font-bold px-3 py-2 rounded-xl shadow-md">SB</span>
                        <h1 className="text-3xl font-bold text-text-dark">SalesBot</h1>
                    </div>
                    <p className="text-text-muted-dark mt-2">Set up your studio in 30 seconds</p>
                </div>

                {/* Step indicator */}
                <div className="flex items-center gap-3 mb-6">
                    <div className={`flex-1 h-1.5 rounded-full transition-colors ${step >= 1 ? 'bg-brand-blue' : 'bg-gray-200'}`} />
                    <div className={`flex-1 h-1.5 rounded-full transition-colors ${step >= 2 ? 'bg-brand-blue' : 'bg-gray-200'}`} />
                </div>

                {/* Signup Card */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
                    <form onSubmit={step === 1 ? (e) => { e.preventDefault(); setStep(2); } : handleSignup} className="space-y-5">

                        {step === 1 && (
                            <>
                                <h2 className="text-xl font-semibold text-text-dark">Create your account</h2>

                                <div>
                                    <label htmlFor="displayName" className="block text-sm font-medium text-text-dark mb-1.5">
                                        Your Name
                                    </label>
                                    <input
                                        id="displayName"
                                        type="text"
                                        value={displayName}
                                        onChange={(e) => setDisplayName(e.target.value)}
                                        required
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-panel-bg text-text-dark placeholder:text-text-muted-dark focus:outline-none focus:ring-2 focus:ring-brand-blue/50 focus:border-brand-blue transition-all"
                                        placeholder="John Smith"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-text-dark mb-1.5">
                                        Email
                                    </label>
                                    <input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-panel-bg text-text-dark placeholder:text-text-muted-dark focus:outline-none focus:ring-2 focus:ring-brand-blue/50 focus:border-brand-blue transition-all"
                                        placeholder="you@studio.com"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="password" className="block text-sm font-medium text-text-dark mb-1.5">
                                        Password
                                    </label>
                                    <input
                                        id="password"
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        minLength={6}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-panel-bg text-text-dark placeholder:text-text-muted-dark focus:outline-none focus:ring-2 focus:ring-brand-blue/50 focus:border-brand-blue transition-all"
                                        placeholder="••••••••"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="w-full py-3 bg-brand-blue text-white font-semibold rounded-xl hover:bg-blue-600 transition-colors shadow-sm"
                                >
                                    Continue →
                                </button>
                            </>
                        )}

                        {step === 2 && (
                            <>
                                <h2 className="text-xl font-semibold text-text-dark">Set up your studio</h2>

                                <div>
                                    <label htmlFor="studioName" className="block text-sm font-medium text-text-dark mb-1.5">
                                        Studio Name
                                    </label>
                                    <input
                                        id="studioName"
                                        type="text"
                                        value={studioName}
                                        onChange={(e) => handleStudioNameChange(e.target.value)}
                                        required
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-panel-bg text-text-dark placeholder:text-text-muted-dark focus:outline-none focus:ring-2 focus:ring-brand-blue/50 focus:border-brand-blue transition-all"
                                        placeholder="Edge Talent"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="studioSlug" className="block text-sm font-medium text-text-dark mb-1.5">
                                        Studio ID
                                    </label>
                                    <input
                                        id="studioSlug"
                                        type="text"
                                        value={studioSlug}
                                        onChange={(e) => setStudioSlug(e.target.value)}
                                        required
                                        pattern="[a-z0-9-]+"
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-panel-bg text-text-dark placeholder:text-text-muted-dark focus:outline-none focus:ring-2 focus:ring-brand-blue/50 focus:border-brand-blue transition-all font-mono text-sm"
                                        placeholder="edge-talent"
                                    />
                                    <p className="text-xs text-text-muted-dark mt-1">Lowercase letters, numbers, and hyphens only</p>
                                </div>

                                {error && (
                                    <div className="bg-rose-50 border border-rose-200 text-rose-600 text-sm rounded-xl px-4 py-3">
                                        {error}
                                    </div>
                                )}

                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setStep(1)}
                                        className="flex-1 py-3 bg-panel-bg text-text-dark font-medium rounded-xl hover:bg-gray-200 border border-gray-200 transition-colors"
                                    >
                                        ← Back
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex-1 py-3 bg-brand-blue text-white font-semibold rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50 shadow-sm"
                                    >
                                        {loading ? 'Creating...' : 'Create Studio'}
                                    </button>
                                </div>
                            </>
                        )}
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-text-muted-dark">
                            Already have an account?{' '}
                            <Link href="/login" className="text-brand-blue font-medium hover:underline">
                                Sign in
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
