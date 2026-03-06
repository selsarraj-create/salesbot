'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Zap, TestTube, LayoutDashboard, Settings, LogOut, LogIn, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth/auth-context';

export function Navigation() {
    const pathname = usePathname();
    const router = useRouter();
    const { user, profile, tenant, loading, signOut } = useAuth();

    // Don't render nav — sidebar handles navigation on all app routes
    if (pathname === '/' || pathname.startsWith('/login') || pathname.startsWith('/signup') || pathname.startsWith('/homepage') || pathname.startsWith('/testing') || pathname.startsWith('/training')) {
        return null;
    }

    const handleSignOut = async () => {
        await signOut();
        router.push('/login');
    };

    // Not logged in — show minimal nav with login button
    if (!user && !loading) {
        return (
            <nav className="border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-50 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex h-16 items-center justify-between">
                        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-brand-blue">
                            <span className="bg-brand-blue/10 p-2 rounded-lg">SB</span>
                            <span>SalesBot</span>
                        </Link>
                        <Link
                            href="/login"
                            className="flex items-center gap-2 px-4 py-2 bg-brand-blue text-white font-medium rounded-xl hover:bg-blue-600 transition-colors shadow-sm text-sm"
                        >
                            <LogIn className="w-4 h-4" />
                            Sign In
                        </Link>
                    </div>
                </div>
            </nav>
        );
    }

    // Loading state — show minimal nav
    if (loading) {
        return (
            <nav className="border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-50 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex h-16 items-center">
                        <span className="flex items-center gap-2 font-bold text-xl text-brand-blue">
                            <span className="bg-brand-blue/10 p-2 rounded-lg">SB</span>
                            <span>SalesBot</span>
                        </span>
                    </div>
                </div>
            </nav>
        );
    }

    const links = [
        { href: '/', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/training', label: 'Training', icon: Zap },
        { href: '/testing', label: 'Testing', icon: TestTube },
        { href: '/settings', label: 'Settings', icon: Settings },
    ];

    // Add admin link for super_admins
    if (profile?.role === 'super_admin') {
        links.push({ href: '/admin', label: 'Admin', icon: Shield });
    }

    return (
        <nav className="border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-50 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 items-center justify-between">
                    {/* Left: Logo + tenant name */}
                    <div className="flex items-center gap-4">
                        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-brand-blue">
                            <span className="bg-brand-blue/10 p-2 rounded-lg">SB</span>
                            <span>SalesBot</span>
                        </Link>
                        {tenant && (
                            <span className="text-sm text-text-muted-dark bg-panel-bg border border-gray-200 px-3 py-1 rounded-lg font-medium">
                                {tenant.name}
                            </span>
                        )}
                    </div>

                    {/* Center: Nav links */}
                    <div className="flex items-center gap-1">
                        {links.map(({ href, label, icon: Icon }) => {
                            const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
                            return (
                                <Link
                                    key={href}
                                    href={href}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium",
                                        isActive
                                            ? "bg-brand-blue/10 text-brand-blue"
                                            : "text-text-muted-dark hover:text-text-dark hover:bg-gray-100"
                                    )}
                                >
                                    <Icon className="w-4 h-4" />
                                    {label}
                                </Link>
                            );
                        })}
                    </div>

                    {/* Right: User info + Sign Out */}
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-text-muted-dark">
                            {profile?.display_name || user?.email}
                        </span>
                        <button
                            onClick={handleSignOut}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-rose-500 hover:bg-rose-50 border border-rose-200 transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                            Sign Out
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
}

