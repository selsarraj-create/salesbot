'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import SidebarFooter from './SidebarFooter';
import '../dashboard.css';

const NAV_ITEMS = [
    { href: '/', label: 'Dashboard', icon: '📊' },
    { href: '/testing', label: 'Sandbox', icon: '📥' },
    { href: '/training', label: 'Command Center', icon: '⚡' },
];

interface AppShellProps {
    children: React.ReactNode;
    title: string;
    hideTopbar?: boolean;
}

export default function AppShell({ children, title, hideTopbar }: AppShellProps) {
    const pathname = usePathname();

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
                                <span className="rd-sidebar-nav-icon">{item.icon}</span>
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
                        <div className="rd-topbar-right">
                            <button className="rd-topbar-icon" aria-label="Notifications">
                                🔔
                            </button>
                            <div className="rd-topbar-avatar">
                                <span>RD</span>
                            </div>
                        </div>
                    </header>
                )}

                <div className="rd-page-content">
                    {children}
                </div>
            </div>
        </div>
    );
}
