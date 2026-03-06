import Link from 'next/link';

export default function TestingLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-main-bg">
            {/* Navigation Bar */}
            <div className="bg-white border-b border-gray-100 px-6 py-3 shadow-sm">
                <div className="flex items-center justify-between">
                    <h1 className="text-xl font-bold text-text-dark">Testing Sandbox</h1>
                    <Link
                        href="/"
                        className="px-4 py-2 bg-panel-bg text-text-dark rounded-lg font-medium hover:bg-gray-200 border border-gray-200 transition-colors"
                    >
                        ← Back to Dashboard
                    </Link>
                </div>
            </div>

            {/* Page Content */}
            {children}
        </div>
    );
}
