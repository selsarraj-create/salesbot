import Link from 'next/link';
import Dashboard from './components/Dashboard';

export default function Home() {
    return (
        <div className="min-h-screen bg-main-bg">
            {/* Navigation Bar */}
            <div className="bg-white border-b border-gray-100 px-6 py-3 shadow-sm">
                <div className="flex items-center justify-between">
                    <h1 className="text-xl font-bold text-text-dark">Sales Bot Dashboard</h1>
                    <Link
                        href="/testing"
                        className="px-4 py-2 bg-brand-blue text-white rounded-lg font-medium hover:bg-blue-600 transition-colors shadow-sm"
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
