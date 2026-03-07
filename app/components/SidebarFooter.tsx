'use client';

import Link from 'next/link';
import { Settings, BookOpen, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';

export default function SidebarFooter() {
    const { user, profile } = useAuth();

    const handleSignOut = () => {
        document.cookie.split(';').forEach((c) => {
            document.cookie = c.trim().split('=')[0] + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
        });
        try { localStorage.clear(); } catch { }
        try { sessionStorage.clear(); } catch { }
        window.location.href = '/login';
    };

    if (!user) return null;

    return (
        <div className="rd-sidebar-footer">
            <div className="rd-sidebar-user">
                <span className="rd-sidebar-user-email">
                    {profile?.display_name || user.email}
                </span>
            </div>
            <Link href="/settings" className="rd-sidebar-settings">
                <Settings size={15} /> Settings
            </Link>
            <Link href="/docs" className="rd-sidebar-settings">
                <BookOpen size={15} /> Docs
            </Link>
            <button onClick={handleSignOut} className="rd-sidebar-signout">
                <LogOut size={15} /> Sign Out
            </button>
        </div>
    );
}
