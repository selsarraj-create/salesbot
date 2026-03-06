import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "SalesBot — Sign In",
};

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Auth pages get a clean layout — no navigation bar
    return <>{children}</>;
}
