import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: ["class"],
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                // Dark Mode Professional Palette (2026) - Neo-Minimalist
                'charcoal': '#0F172A',      // slate-900
                'surface': '#1E293B',       // slate-800
                'surface-light': '#334155', // slate-700
                'electric-cyan': '#38BDF8', // sky-400
                'text-primary': '#F8FAFC',  // slate-50
                'text-secondary': '#94A3B8',// slate-400

                // Status Colors (Soft Semantics)
                'status-booked': '#34D399',     // emerald-400
                'status-booking': '#818CF8',    // indigo-400
                'status-qualifying': '#FBBF24', // amber-400
                'status-distance': '#F87171',   // red-400
                'status-human': '#F43F5E',      // rose-400
                'status-new': '#94A3B8',        // slate-400

                // shadcn/ui compatibility
                border: "hsl(var(--border))",
                input: "hsl(var(--input))",
                ring: "hsl(var(--ring))",
                background: "hsl(var(--background))",
                foreground: "hsl(var(--foreground))",
                primary: {
                    DEFAULT: "hsl(var(--primary))",
                    foreground: "hsl(var(--primary-foreground))",
                },
                secondary: {
                    DEFAULT: "hsl(var(--secondary))",
                    foreground: "hsl(var(--secondary-foreground))",
                },
                destructive: {
                    DEFAULT: "hsl(var(--destructive))",
                    foreground: "hsl(var(--destructive-foreground))",
                },
                muted: {
                    DEFAULT: "hsl(var(--muted))",
                    foreground: "hsl(var(--muted-foreground))",
                },
                accent: {
                    DEFAULT: "hsl(var(--accent))",
                    foreground: "hsl(var(--accent-foreground))",
                },
                popover: {
                    DEFAULT: "hsl(var(--popover))",
                    foreground: "hsl(var(--popover-foreground))",
                },
                card: {
                    DEFAULT: "hsl(var(--card))",
                    foreground: "hsl(var(--card-foreground))",
                },
            },
            backgroundImage: {
                'glass': 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
            },
            backdropBlur: {
                'glass': '12px',
            },
            boxShadow: {
                'glow': '0 0 20px rgba(64, 224, 255, 0.3)',
                'glow-strong': '0 0 30px rgba(64, 224, 255, 0.5)',
            },
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
            },
        },
    },
    plugins: [],
};

export default config;
