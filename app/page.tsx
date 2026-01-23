import Link from 'next/link';
import Dashboard from './components/Dashboard';

export default function Home() {
    return (
        <div>
            {/* Navigation Bar */}
            <div className="bg-white border-b border-gray-200 px-6 py-3">
                <div className="flex items-center justify-between">
                    <h1 className="text-xl font-bold text-gray-800">Sales Bot Dashboard</h1>
                    <Link
                        href="/testing"
                        className="px-4 py-2 bg-yellow-500 text-white rounded-lg font-medium hover:bg-yellow-600 transition-colors"
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
