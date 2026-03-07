'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, MessageSquare, Sliders } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import SidebarFooter from './SidebarFooter';
import '../dashboard.css';

const NAV_ITEMS = [
    { href: '/', label: 'Dashboard', icon: <LayoutDashboard size={16} /> },
    { href: '/testing', label: 'Sandbox', icon: <MessageSquare size={16} /> },
    { href: '/training', label: 'Command Center', icon: <Sliders size={16} /> },
];

interface AppShellProps {
    children: React.ReactNode;
    title: string;
    hideTopbar?: boolean;
}

export default function AppShell({ children, title, hideTopbar }: AppShellProps) {
    const pathname = usePathname();
    const { tenant } = useAuth();
    const businessName = tenant?.name || '';

    return (
        <div className="rd-app">
            {/* ── Sidebar ── */}
            <aside className="rd-sidebar">
                <div className="rd-sidebar-logo">
                    <span className="rd-sidebar-logo-icon">💬</span>
                    <span className="rd-sidebar-logo-text">Reply Desk</span>
                </div>

                <nav className="rd-sidebar-nav">
                    {NAV_ITEMS.map((item) => {
                        const isActive =
                            item.href === '/'
                                ? pathname === '/'
                                : pathname.startsWith(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`rd-sidebar-nav-item ${isActive ? 'rd-active' : ''}`}
                            >
                                <div className="rd-sidebar-nav-icon-wrap">
                                    <span className="rd-sidebar-nav-icon">{item.icon}</span>
                                </div>
                                <span>{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                <SidebarFooter />
            </aside>

            {/* ── Main area ── */}
            <div className="rd-main">
                {!hideTopbar && (
                    <header className="rd-topbar">
                        <h1 className="rd-topbar-title">{title}</h1>
                        {businessName && (
                            <div className="rd-topbar-right">
                                <span style={{ fontSize: '14px', fontWeight: 600, color: '#64748b' }}>
                                    {businessName}
                                </span>
                            </div>
                        )}
                    </header>
                )}

                <div className="rd-page-content">
                    {children}
                </div>
            </div>
        </div>
    );
}
