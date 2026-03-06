'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { type ThemeProviderProps } from 'next-themes/dist/types';
import { AuthProvider } from '@/lib/auth/auth-context';

export function Providers({ children, ...props }: ThemeProviderProps) {
    return (
        <NextThemesProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem={false}
            disableTransitionOnChange
            {...props}
        >
            <AuthProvider>
                {children}
            </AuthProvider>
        </NextThemesProvider>
    );
}
