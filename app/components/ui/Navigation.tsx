'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Zap, TestTube, LayoutDashboard } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Navigation() {
    const pathname = usePathname();

    const links = [
        { href: '/', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/training', label: 'Training', icon: Zap },
        { href: '/testing', label: 'Testing', icon: TestTube },
    ];

    return (
        <nav className="border-b border-surface-light bg-surface/80 backdrop-blur-md sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 items-center justify-between">
                    <div className="flex items-center">
                        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-electric-cyan">
                            <span className="bg-electric-cyan/10 p-2 rounded-lg">SB</span>
                            <span>SalesBot</span>
                        </Link>
                    </div>
                    <div className="flex items-center gap-1">
                        {links.map(({ href, label, icon: Icon }) => {
                            const isActive = pathname === href;
                            return (
                                <Link
                                    key={href}
                                    href={href}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-2 rounded-md transition-colors text-sm font-medium",
                                        isActive
                                            ? "bg-electric-cyan/10 text-electric-cyan"
                                            : "text-text-secondary hover:text-text-primary hover:bg-surface-light"
                                    )}
                                >
                                    <Icon className="w-4 h-4" />
                                    {label}
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </div>
        </nav>
    );
}
