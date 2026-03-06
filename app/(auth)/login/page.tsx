'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirect = searchParams.get('redirect') || '/';

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const { error: authError } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (authError) {
            setError(authError.message);
            setLoading(false);
            return;
        }

        router.push(redirect);
        router.refresh();
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
            <form onSubmit={handleLogin} className="space-y-5">
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
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-panel-bg text-text-dark placeholder:text-text-muted-dark focus:outline-none focus:ring-2 focus:ring-brand-blue/50 focus:border-brand-blue transition-all"
                        placeholder="••••••••"
                    />
                </div>

                {error && (
                    <div className="bg-rose-50 border border-rose-200 text-rose-600 text-sm rounded-xl px-4 py-3">
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-brand-blue text-white font-semibold rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50 shadow-sm"
                >
                    {loading ? 'Signing in...' : 'Sign In'}
                </button>
            </form>

            <div className="mt-6 text-center">
                <p className="text-sm text-text-muted-dark">
                    Don&apos;t have an account?{' '}
                    <Link href="/signup" className="text-brand-blue font-medium hover:underline">
                        Create one
                    </Link>
                </p>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <div className="min-h-screen bg-main-bg flex items-center justify-center p-6">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-3 mb-2">
                        <span className="bg-brand-blue text-white text-xl font-bold px-3 py-2 rounded-xl shadow-md">SB</span>
                        <h1 className="text-3xl font-bold text-text-dark">SalesBot</h1>
                    </div>
                    <p className="text-text-muted-dark mt-2">Sign in to your dashboard</p>
                </div>

                <Suspense fallback={
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center text-text-muted-dark">
                        Loading...
                    </div>
                }>
                    <LoginForm />
                </Suspense>
            </div>
        </div>
    );
}

