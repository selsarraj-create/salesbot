import Link from 'next/link';
import Dashboard from './components/Dashboard';

export default function Home() {
    return (
        <div className="min-h-screen bg-charcoal">
            {/* Navigation Bar */}
            <div className="bg-surface border-b border-surface-light px-6 py-3">
                <div className="flex items-center justify-between">
                    <h1 className="text-xl font-bold text-text-primary">Sales Bot Dashboard</h1>
                    <Link
                        href="/testing"
                        className="px-4 py-2 bg-electric-cyan text-charcoal rounded-lg font-medium hover:bg-electric-cyan/90 transition-colors"
                    >
                        🧪 Testing Sandbox
                    </Link>
                </div>
            </div>

            {/* Main Dashboard */}
            <Dashboard />
        </div>
    );
}
