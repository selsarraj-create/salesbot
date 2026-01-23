import Link from 'next/link';

export default function TestingLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-charcoal">
            {/* Navigation Bar */}
            <div className="bg-surface border-b border-surface-light px-6 py-3">
                <div className="flex items-center justify-between">
                    <h1 className="text-xl font-bold text-text-primary">Testing Sandbox</h1>
                    <Link
                        href="/"
                        className="px-4 py-2 bg-surface-light text-text-primary rounded-lg font-medium hover:bg-surface border border-surface-light transition-colors"
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
