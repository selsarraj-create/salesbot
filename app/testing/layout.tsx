import Link from 'next/link';

export default function TestingLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div>
            {/* Navigation Bar */}
            <div className="bg-white border-b border-gray-200 px-6 py-3">
                <div className="flex items-center justify-between">
                    <h1 className="text-xl font-bold text-gray-800">Testing Sandbox</h1>
                    <Link
                        href="/"
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
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
