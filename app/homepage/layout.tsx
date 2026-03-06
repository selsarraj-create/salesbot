import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Reply Desk — AI-Powered Multi-Channel Sales Chatbot",
    description:
        "Automate WhatsApp, SMS & web conversations with AI. Close more deals with real-time lead management, intelligent objection handling, and seamless human takeover.",
};

export default function HomepageLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
