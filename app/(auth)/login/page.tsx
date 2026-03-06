'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';
import '../auth.css';

function LoginForm() {
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

        window.location.href = redirect;
    };

    return (
        <form onSubmit={handleLogin} className="rd-auth-form">
            <div className="rd-auth-field">
                <label htmlFor="email" className="rd-auth-label">Email</label>
                <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="rd-auth-input"
                    placeholder="you@company.com"
                />
            </div>

            <div className="rd-auth-field">
                <label htmlFor="password" className="rd-auth-label">Password</label>
                <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="rd-auth-input"
                    placeholder="••••••••"
                />
            </div>

            {error && (
                <div className="rd-auth-error">{error}</div>
            )}

            <button type="submit" disabled={loading} className="rd-auth-submit">
                {loading ? 'Signing in…' : 'Sign In'}
            </button>
        </form>
    );
}

export default function LoginPage() {
    return (
        <div className="rd-auth-page">
            {/* Left panel — branding */}
            <div className="rd-auth-brand">
                <div className="rd-auth-brand-bg" />
                <div className="rd-auth-brand-grid" />
                <div className="rd-auth-brand-content">
                    <Link href="/homepage" className="rd-auth-logo">
                        <span className="rd-auth-logo-icon">💬</span>
                        <span className="rd-auth-logo-text">Reply Desk</span>
                    </Link>
                    <h2 className="rd-auth-brand-h2">
                        Turn every message<br />
                        into a <span className="rd-auth-gradient-text">closed deal</span>
                    </h2>
                    <p className="rd-auth-brand-sub">
                        AI-powered sales chatbot for WhatsApp, SMS &amp; web.
                        Qualify leads, handle objections, and book appointments — automatically.
                    </p>
                    <div className="rd-auth-brand-stats">
                        <div className="rd-auth-stat">
                            <span className="rd-auth-stat-num">78%</span>
                            <span className="rd-auth-stat-label">Conversion Rate</span>
                        </div>
                        <div className="rd-auth-stat">
                            <span className="rd-auth-stat-num">24/7</span>
                            <span className="rd-auth-stat-label">Always On</span>
                        </div>
                        <div className="rd-auth-stat">
                            <span className="rd-auth-stat-num">&lt;2s</span>
                            <span className="rd-auth-stat-label">Response</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right panel — form */}
            <div className="rd-auth-form-panel">
                <div className="rd-auth-form-wrap">
                    {/* Mobile-only logo */}
                    <div className="rd-auth-mobile-logo">
                        <Link href="/homepage" className="rd-auth-logo">
                            <span className="rd-auth-logo-icon">💬</span>
                            <span className="rd-auth-logo-text rd-auth-logo-dark">Reply Desk</span>
                        </Link>
                    </div>

                    <h1 className="rd-auth-heading">Welcome back</h1>
                    <p className="rd-auth-subheading">Sign in to your dashboard</p>

                    <Suspense fallback={
                        <div className="rd-auth-loading">Loading…</div>
                    }>
                        <LoginForm />
                    </Suspense>

                    <p className="rd-auth-footer-text">
                        Don&apos;t have an account?{' '}
                        <Link href="/signup" className="rd-auth-link">Create one</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
