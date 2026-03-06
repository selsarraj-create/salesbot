"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import "./homepage.css";

/* ─────────────────────────── data ─────────────────────────── */

const FEATURES = [
    {
        icon: "💬",
        title: "Multi-Channel Messaging",
        desc: "Engage leads on WhatsApp, SMS, and web chat from a single unified inbox. No switching between apps.",
        gradient: "from-emerald-500 to-teal-600",
    },
    {
        icon: "🤖",
        title: "AI-Powered Conversations",
        desc: "Gemini Pro handles objections, qualifies leads, and books appointments — 24/7 with human-like tone.",
        gradient: "from-violet-500 to-purple-600",
    },
    {
        icon: "📊",
        title: "Real-Time Dashboard",
        desc: "Live lead monitoring with color-coded statuses. See every conversation as it happens, sub-second updates.",
        gradient: "from-blue-500 to-cyan-600",
    },
    {
        icon: "🙋",
        title: "Seamless Human Takeover",
        desc: "One click to pause AI and jump in as a human agent. Release when done — the bot picks right back up.",
        gradient: "from-amber-500 to-orange-600",
    },
    {
        icon: "🎯",
        title: "Lead Pipeline",
        desc: "Visual workflow from New → Qualifying → Booking → Booked. Track every lead's journey to conversion.",
        gradient: "from-rose-500 to-pink-600",
    },
    {
        icon: "📈",
        title: "Campaign Analytics",
        desc: "Track conversion rates, cost per lead, and campaign performance. Filter by source code, city, or status.",
        gradient: "from-indigo-500 to-blue-600",
    },
];

const STEPS = [
    {
        num: "01",
        title: "Connect Your Channels",
        desc: "Link your WhatsApp Business, SMS number, or web widget in minutes. No coding required.",
        icon: "🔗",
    },
    {
        num: "02",
        title: "AI Handles Conversations",
        desc: "Our AI qualifies leads, handles objections, and books appointments automatically around the clock.",
        icon: "⚡",
    },
    {
        num: "03",
        title: "Close More Deals",
        desc: "Monitor everything in real-time, step in when needed, and watch your conversion rates soar.",
        icon: "🚀",
    },
];

const PRICING = [
    {
        name: "Starter",
        price: "$49",
        period: "/mo",
        desc: "Perfect for solo operators and small teams getting started with AI sales.",
        features: [
            "1 channel (WhatsApp or SMS)",
            "500 AI conversations/mo",
            "Basic analytics dashboard",
            "Email support",
            "1 team member",
        ],
        cta: "Start Free Trial",
        highlighted: false,
    },
    {
        name: "Pro",
        price: "$149",
        period: "/mo",
        desc: "For growing businesses that need multi-channel reach and advanced features.",
        features: [
            "All channels (WhatsApp + SMS + Web)",
            "5,000 AI conversations/mo",
            "Advanced analytics & reports",
            "Human takeover mode",
            "Campaign tracking",
            "Priority support",
            "5 team members",
        ],
        cta: "Start Free Trial",
        highlighted: true,
    },
    {
        name: "Enterprise",
        price: "Custom",
        period: "",
        desc: "Unlimited scale with dedicated support and custom AI training.",
        features: [
            "Unlimited channels & conversations",
            "Custom AI persona training",
            "CRM & webhook integrations",
            "Dedicated account manager",
            "SSO & advanced security",
            "SLA guarantees",
            "Unlimited team members",
        ],
        cta: "Talk to Sales",
        highlighted: false,
    },
];

const TESTIMONIALS = [
    {
        quote: "Reply Desk doubled our booking rate in the first month. The AI handles objections better than most of our junior staff.",
        name: "Sarah Mitchell",
        role: "Studio Director, London Creatives",
        avatar: "SM",
    },
    {
        quote: "We went from missing 60% of after-hours leads to converting them automatically. Game changer for our business.",
        name: "James Okonkwo",
        role: "Founder, PrimeShot Studios",
        avatar: "JO",
    },
    {
        quote: "The human takeover feature is brilliant. AI does the heavy lifting and I step in only for the complex ones.",
        name: "Nina Patel",
        role: "Operations Lead, ModelHQ",
        avatar: "NP",
    },
];

const FOOTER_LINKS = {
    Product: ["Features", "Pricing", "Integrations", "Changelog"],
    Company: ["About", "Blog", "Careers", "Press"],
    Resources: ["Documentation", "API Reference", "Community", "Status"],
    Legal: ["Privacy", "Terms", "Security", "GDPR"],
};

/* ─────────────── scroll-reveal hook ─────────────── */

function useReveal() {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const obs = new IntersectionObserver(
            ([e]) => {
                if (e.isIntersecting) {
                    el.classList.add("revealed");
                    obs.unobserve(el);
                }
            },
            { threshold: 0.15 }
        );
        obs.observe(el);
        return () => obs.disconnect();
    }, []);
    return ref;
}

function RevealSection({
    children,
    className = "",
    delay = 0,
}: {
    children: React.ReactNode;
    className?: string;
    delay?: number;
}) {
    const ref = useReveal();
    return (
        <div
            ref={ref}
            className={`reveal-section ${className}`}
            style={{ transitionDelay: `${delay}ms` }}
        >
            {children}
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════
   PAGE
   ══════════════════════════════════════════════════════════════ */

export default function Homepage() {
    return (
        <div className="homepage-root">
            {/* ─── NAVBAR ─── */}
            <nav className="hp-nav" id="hp-nav">
                <div className="hp-nav-inner">
                    <Link href="/homepage" className="hp-logo">
                        <span className="hp-logo-icon">💬</span>
                        <span className="hp-logo-text">Reply Desk</span>
                    </Link>

                    <div className="hp-nav-links">
                        <a href="#features">Features</a>
                        <a href="#how-it-works">How It Works</a>
                        <a href="#pricing">Pricing</a>
                    </div>

                    <div className="hp-nav-actions">
                        <Link href="/login" className="hp-btn-ghost">
                            Sign In
                        </Link>
                        <Link href="/signup" className="hp-btn-primary">
                            Start Free Trial
                        </Link>
                    </div>
                </div>
            </nav>

            {/* ─── HERO ─── */}
            <section className="hp-hero">
                <div className="hp-hero-bg" />
                <div className="hp-hero-grid" />

                <div className="hp-hero-content">
                    <RevealSection>
                        <div className="hp-hero-badge">
                            🚀 Now with WhatsApp Business API
                        </div>
                    </RevealSection>

                    <RevealSection delay={100}>
                        <h1 className="hp-hero-h1">
                            Turn Every Message
                            <br />
                            Into a <span className="hp-gradient-text">Closed Deal</span>
                        </h1>
                    </RevealSection>

                    <RevealSection delay={200}>
                        <p className="hp-hero-sub">
                            Reply Desk is the AI-powered sales chatbot that handles WhatsApp,
                            SMS &amp; web conversations — qualifying leads, overcoming
                            objections, and booking appointments while you sleep.
                        </p>
                    </RevealSection>

                    <RevealSection delay={300}>
                        <div className="hp-hero-ctas">
                            <Link href="/signup" className="hp-btn-primary hp-btn-lg">
                                Start Free Trial
                                <span className="hp-btn-arrow">→</span>
                            </Link>
                            <a href="#how-it-works" className="hp-btn-outline hp-btn-lg">
                                See How It Works
                            </a>
                        </div>
                        <p className="hp-hero-note">
                            No credit card required · 14-day free trial · Setup in 5 minutes
                        </p>
                    </RevealSection>

                    {/* channel pills */}
                    <RevealSection delay={400}>
                        <div className="hp-channels">
                            <span className="hp-channel-pill">
                                <span className="hp-channel-dot bg-green-400" />
                                WhatsApp
                            </span>
                            <span className="hp-channel-pill">
                                <span className="hp-channel-dot bg-blue-400" />
                                SMS
                            </span>
                            <span className="hp-channel-pill">
                                <span className="hp-channel-dot bg-purple-400" />
                                Web Chat
                            </span>
                        </div>
                    </RevealSection>
                </div>

                {/* floating stats */}
                <div className="hp-hero-stats">
                    <RevealSection delay={500} className="hp-stat-card">
                        <span className="hp-stat-num">78%</span>
                        <span className="hp-stat-label">Avg Conversion Rate</span>
                    </RevealSection>
                    <RevealSection delay={600} className="hp-stat-card">
                        <span className="hp-stat-num">24/7</span>
                        <span className="hp-stat-label">Always-On Sales</span>
                    </RevealSection>
                    <RevealSection delay={700} className="hp-stat-card">
                        <span className="hp-stat-num">&lt;2s</span>
                        <span className="hp-stat-label">Response Time</span>
                    </RevealSection>
                </div>
            </section>

            {/* ─── SOCIAL PROOF BAR ─── */}
            <section className="hp-social-bar">
                <RevealSection>
                    <p className="hp-social-text">
                        Trusted by <strong>500+</strong> businesses to automate their sales
                        conversations
                    </p>
                </RevealSection>
            </section>

            {/* ─── FEATURES ─── */}
            <section className="hp-features" id="features">
                <div className="hp-section-container">
                    <RevealSection>
                        <div className="hp-section-header">
                            <span className="hp-section-tag">Features</span>
                            <h2 className="hp-section-h2">
                                Everything you need to
                                <br />
                                <span className="hp-gradient-text">
                                    automate your sales
                                </span>
                            </h2>
                            <p className="hp-section-sub">
                                From first contact to confirmed booking — Reply Desk handles
                                the entire sales conversation across every channel.
                            </p>
                        </div>
                    </RevealSection>

                    <div className="hp-features-grid">
                        {FEATURES.map((f, i) => (
                            <RevealSection key={f.title} delay={i * 80}>
                                <div className="hp-feature-card">
                                    <div
                                        className={`hp-feature-icon bg-gradient-to-br ${f.gradient}`}
                                    >
                                        {f.icon}
                                    </div>
                                    <h3 className="hp-feature-title">{f.title}</h3>
                                    <p className="hp-feature-desc">{f.desc}</p>
                                </div>
                            </RevealSection>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── HOW IT WORKS ─── */}
            <section className="hp-how" id="how-it-works">
                <div className="hp-section-container">
                    <RevealSection>
                        <div className="hp-section-header">
                            <span className="hp-section-tag">How It Works</span>
                            <h2 className="hp-section-h2">
                                Three steps to
                                <br />
                                <span className="hp-gradient-text">sales on autopilot</span>
                            </h2>
                        </div>
                    </RevealSection>

                    <div className="hp-steps">
                        {STEPS.map((s, i) => (
                            <RevealSection key={s.num} delay={i * 120}>
                                <div className="hp-step-card">
                                    <div className="hp-step-num">{s.num}</div>
                                    <div className="hp-step-icon">{s.icon}</div>
                                    <h3 className="hp-step-title">{s.title}</h3>
                                    <p className="hp-step-desc">{s.desc}</p>
                                </div>
                            </RevealSection>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── DASHBOARD PREVIEW ─── */}
            <section className="hp-preview">
                <div className="hp-section-container">
                    <RevealSection>
                        <div className="hp-section-header">
                            <span className="hp-section-tag">Product</span>
                            <h2 className="hp-section-h2">
                                Your command center for
                                <br />
                                <span className="hp-gradient-text">
                                    every conversation
                                </span>
                            </h2>
                            <p className="hp-section-sub">
                                Monitor leads in real-time, jump into conversations, and
                                track performance — all from one beautiful dashboard.
                            </p>
                        </div>
                    </RevealSection>

                    <RevealSection delay={200}>
                        <div className="hp-preview-frame">
                            <div className="hp-preview-dots">
                                <span className="dot red" />
                                <span className="dot yellow" />
                                <span className="dot green" />
                            </div>
                            <Image
                                src="/dashboard-preview.png"
                                alt="Reply Desk Dashboard — real-time lead monitoring, AI chat, and analytics"
                                width={1200}
                                height={750}
                                className="hp-preview-img"
                                priority={false}
                            />
                        </div>
                    </RevealSection>
                </div>
            </section>

            {/* ─── PRICING ─── */}
            <section className="hp-pricing" id="pricing">
                <div className="hp-section-container">
                    <RevealSection>
                        <div className="hp-section-header">
                            <span className="hp-section-tag">Pricing</span>
                            <h2 className="hp-section-h2">
                                Simple, transparent
                                <br />
                                <span className="hp-gradient-text">pricing</span>
                            </h2>
                            <p className="hp-section-sub">
                                Start free. Upgrade as you grow. No hidden fees.
                            </p>
                        </div>
                    </RevealSection>

                    <div className="hp-pricing-grid">
                        {PRICING.map((p, i) => (
                            <RevealSection key={p.name} delay={i * 100}>
                                <div
                                    className={`hp-pricing-card ${p.highlighted ? "hp-pricing-highlight" : ""
                                        }`}
                                >
                                    {p.highlighted && (
                                        <div className="hp-pricing-badge">Most Popular</div>
                                    )}
                                    <h3 className="hp-pricing-name">{p.name}</h3>
                                    <div className="hp-pricing-price">
                                        <span className="hp-pricing-amount">{p.price}</span>
                                        <span className="hp-pricing-period">
                                            {p.period}
                                        </span>
                                    </div>
                                    <p className="hp-pricing-desc">{p.desc}</p>
                                    <ul className="hp-pricing-features">
                                        {p.features.map((f) => (
                                            <li key={f}>
                                                <span className="hp-check">✓</span> {f}
                                            </li>
                                        ))}
                                    </ul>
                                    <Link
                                        href="/signup"
                                        className={
                                            p.highlighted
                                                ? "hp-btn-primary hp-btn-full"
                                                : "hp-btn-outline hp-btn-full"
                                        }
                                    >
                                        {p.cta}
                                    </Link>
                                </div>
                            </RevealSection>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── TESTIMONIALS ─── */}
            <section className="hp-testimonials">
                <div className="hp-section-container">
                    <RevealSection>
                        <div className="hp-section-header">
                            <span className="hp-section-tag">Testimonials</span>
                            <h2 className="hp-section-h2">
                                Loved by teams
                                <br />
                                <span className="hp-gradient-text">everywhere</span>
                            </h2>
                        </div>
                    </RevealSection>

                    <div className="hp-testimonials-grid">
                        {TESTIMONIALS.map((t, i) => (
                            <RevealSection key={t.name} delay={i * 100}>
                                <div className="hp-testimonial-card">
                                    <p className="hp-testimonial-quote">
                                        &ldquo;{t.quote}&rdquo;
                                    </p>
                                    <div className="hp-testimonial-author">
                                        <div className="hp-avatar">{t.avatar}</div>
                                        <div>
                                            <div className="hp-author-name">{t.name}</div>
                                            <div className="hp-author-role">{t.role}</div>
                                        </div>
                                    </div>
                                </div>
                            </RevealSection>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── FINAL CTA ─── */}
            <section className="hp-cta">
                <div className="hp-cta-bg" />
                <div className="hp-section-container hp-cta-content">
                    <RevealSection>
                        <h2 className="hp-cta-h2">
                            Ready to automate your sales?
                        </h2>
                        <p className="hp-cta-sub">
                            Join 500+ businesses closing more deals with Reply Desk.
                            <br />
                            Start your 14-day free trial today.
                        </p>
                        <div className="hp-cta-actions">
                            <Link href="/signup" className="hp-btn-white hp-btn-lg">
                                Start Free Trial
                                <span className="hp-btn-arrow">→</span>
                            </Link>
                        </div>
                    </RevealSection>
                </div>
            </section>

            {/* ─── FOOTER ─── */}
            <footer className="hp-footer">
                <div className="hp-section-container">
                    <div className="hp-footer-top">
                        <div className="hp-footer-brand">
                            <Link href="/homepage" className="hp-logo">
                                <span className="hp-logo-icon">💬</span>
                                <span className="hp-logo-text">Reply Desk</span>
                            </Link>
                            <p className="hp-footer-tagline">
                                AI-powered multi-channel sales chatbot.
                                <br />
                                Turn every message into a closed deal.
                            </p>
                        </div>

                        {Object.entries(FOOTER_LINKS).map(([group, links]) => (
                            <div key={group} className="hp-footer-col">
                                <h4 className="hp-footer-heading">{group}</h4>
                                <ul>
                                    {links.map((l) => (
                                        <li key={l}>
                                            <a href="#">{l}</a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>

                    <div className="hp-footer-bottom">
                        <p>© 2026 Reply Desk. All rights reserved.</p>
                        <div className="hp-footer-socials">
                            <a href="#" aria-label="Twitter">𝕏</a>
                            <a href="#" aria-label="LinkedIn">in</a>
                            <a href="#" aria-label="GitHub">GH</a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
