// app/_layout.tsx
// Root layout: Theme, Auth, TanStack Query providers and navigation

import React from 'react';
import { Stack } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { queryClient } from '../src/lib/queryClient';
import { AuthContext, useAuthProvider } from '../src/hooks/useAuth';
import { ThemeProvider, useTheme } from '../src/lib/theme';

export default function RootLayout() {
    return (
        <ThemeProvider>
            <RootLayoutInner />
        </ThemeProvider>
    );
}

function RootLayoutInner() {
    const authState = useAuthProvider();
    const { colors, isDark } = useTheme();

    return (
        <QueryClientProvider client={queryClient}>
            <AuthContext.Provider value={authState}>
                <StatusBar style={isDark ? 'light' : 'dark'} />
                <Stack
                    screenOptions={{
                        headerStyle: { backgroundColor: colors.background },
                        headerTintColor: colors.onBackground,
                        headerTitleStyle: { fontWeight: '700' },
                        contentStyle: { backgroundColor: colors.background },
                        animation: 'slide_from_right',
                    }}
                >
                    <Stack.Screen
                        name="(auth)/login"
                        options={{ headerShown: false }}
                    />
                    <Stack.Screen
                        name="(app)"
                        options={{ headerShown: false }}
                    />
                </Stack>
            </AuthContext.Provider>
        </QueryClientProvider>
    );
}
