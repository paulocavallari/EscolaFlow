// src/lib/theme.tsx
// Material Design 3 Theme system with dark/light mode support

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_STORAGE_KEY = '@escolaflow/theme-mode';

// ============================================================
// MD3 Color Tokens
// ============================================================

export interface MD3Colors {
    primary: string;
    onPrimary: string;
    primaryContainer: string;
    onPrimaryContainer: string;
    secondary: string;
    onSecondary: string;
    secondaryContainer: string;
    onSecondaryContainer: string;
    surface: string;
    surfaceContainer: string;
    surfaceContainerHigh: string;
    surfaceContainerLow: string;
    onSurface: string;
    surfaceVariant: string;
    onSurfaceVariant: string;
    outline: string;
    outlineVariant: string;
    background: string;
    onBackground: string;
    error: string;
    onError: string;
    errorContainer: string;
    onErrorContainer: string;
    success: string;
    onSuccess: string;
    successContainer: string;
    onSuccessContainer: string;
    warning: string;
    onWarning: string;
    warningContainer: string;
    onWarningContainer: string;
    info: string;
    onInfo: string;
    infoContainer: string;
    onInfoContainer: string;
    elevation: {
        level0: string;
        level1: string;
        level2: string;
        level3: string;
    };
}

export const darkColors: MD3Colors = {
    primary: '#818CF8',
    onPrimary: '#1E1B4B',
    primaryContainer: '#3730A3',
    onPrimaryContainer: '#C7D2FE',
    secondary: '#38BDF8',
    onSecondary: '#0C4A6E',
    secondaryContainer: '#075985',
    onSecondaryContainer: '#BAE6FD',
    surface: '#1E293B',
    surfaceContainer: '#0F172A',
    surfaceContainerHigh: '#334155',
    surfaceContainerLow: '#1E293B',
    onSurface: '#F8FAFC',
    surfaceVariant: '#334155',
    onSurfaceVariant: '#94A3B8',
    outline: '#475569',
    outlineVariant: '#334155',
    background: '#0F172A',
    onBackground: '#F8FAFC',
    error: '#EF4444',
    onError: '#450A0A',
    errorContainer: '#7F1D1D',
    onErrorContainer: '#FECACA',
    success: '#10B981',
    onSuccess: '#022C22',
    successContainer: '#064E3B',
    onSuccessContainer: '#A7F3D0',
    warning: '#F59E0B',
    onWarning: '#451A03',
    warningContainer: '#78350F',
    onWarningContainer: '#FDE68A',
    info: '#38BDF8',
    onInfo: '#0C4A6E',
    infoContainer: '#075985',
    onInfoContainer: '#BAE6FD',
    elevation: {
        level0: '#0F172A',
        level1: '#1E293B',
        level2: '#283548',
        level3: '#334155',
    },
};

export const lightColors: MD3Colors = {
    primary: '#4F46E5',
    onPrimary: '#FFFFFF',
    primaryContainer: '#E0E7FF',
    onPrimaryContainer: '#312E81',
    secondary: '#0EA5E9',
    onSecondary: '#FFFFFF',
    secondaryContainer: '#E0F2FE',
    onSecondaryContainer: '#0C4A6E',
    surface: '#FFFFFF',
    surfaceContainer: '#F1F5F9',
    surfaceContainerHigh: '#E2E8F0',
    surfaceContainerLow: '#F8FAFC',
    onSurface: '#0F172A',
    surfaceVariant: '#E2E8F0',
    onSurfaceVariant: '#64748B',
    outline: '#CBD5E1',
    outlineVariant: '#E2E8F0',
    background: '#F8FAFC',
    onBackground: '#0F172A',
    error: '#DC2626',
    onError: '#FFFFFF',
    errorContainer: '#FEE2E2',
    onErrorContainer: '#7F1D1D',
    success: '#059669',
    onSuccess: '#FFFFFF',
    successContainer: '#D1FAE5',
    onSuccessContainer: '#064E3B',
    warning: '#D97706',
    onWarning: '#FFFFFF',
    warningContainer: '#FEF3C7',
    onWarningContainer: '#78350F',
    info: '#0EA5E9',
    onInfo: '#FFFFFF',
    infoContainer: '#E0F2FE',
    onInfoContainer: '#0C4A6E',
    elevation: {
        level0: '#F8FAFC',
        level1: '#FFFFFF',
        level2: '#F1F5F9',
        level3: '#E2E8F0',
    },
};

// ============================================================
// Typography Scale (MD3)
// ============================================================

export const typography = {
    displayLarge: { fontSize: 32, fontWeight: '700' as const, lineHeight: 40 },
    displayMedium: { fontSize: 28, fontWeight: '700' as const, lineHeight: 36 },
    headlineLarge: { fontSize: 24, fontWeight: '600' as const, lineHeight: 32 },
    headlineMedium: { fontSize: 20, fontWeight: '600' as const, lineHeight: 28 },
    titleLarge: { fontSize: 18, fontWeight: '600' as const, lineHeight: 26 },
    titleMedium: { fontSize: 16, fontWeight: '600' as const, lineHeight: 24 },
    titleSmall: { fontSize: 14, fontWeight: '600' as const, lineHeight: 20 },
    bodyLarge: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
    bodyMedium: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
    bodySmall: { fontSize: 12, fontWeight: '400' as const, lineHeight: 16 },
    labelLarge: { fontSize: 14, fontWeight: '500' as const, lineHeight: 20 },
    labelMedium: { fontSize: 12, fontWeight: '500' as const, lineHeight: 16 },
    labelSmall: { fontSize: 11, fontWeight: '500' as const, lineHeight: 16 },
};

// ============================================================
// Theme Context
// ============================================================

interface ThemeContextValue {
    colors: MD3Colors;
    isDark: boolean;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
    colors: darkColors,
    isDark: true,
    toggleTheme: () => {},
});

export function useTheme(): ThemeContextValue {
    return useContext(ThemeContext);
}

// ============================================================
// Theme Provider
// ============================================================

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [isDark, setIsDark] = useState(true);

    useEffect(() => {
        AsyncStorage.getItem(THEME_STORAGE_KEY).then((stored) => {
            if (stored === 'light') setIsDark(false);
        });
    }, []);

    const toggleTheme = useCallback(() => {
        setIsDark((prev) => {
            const next = !prev;
            AsyncStorage.setItem(THEME_STORAGE_KEY, next ? 'dark' : 'light');
            return next;
        });
    }, []);

    const colors = isDark ? darkColors : lightColors;

    return (
        <ThemeContext.Provider value={{ colors, isDark, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}
