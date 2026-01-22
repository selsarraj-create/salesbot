import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                status: {
                    new: '#9CA3AF',        // Gray
                    qualifying: '#FCD34D', // Yellow
                    booking: '#60A5FA',    // Blue
                    booked: '#34D399',     // Green
                    distance: '#FB923C',   // Orange
                    human: '#EF4444',      // Red
                },
            },
        },
    },
    plugins: [],
};
export default config;
