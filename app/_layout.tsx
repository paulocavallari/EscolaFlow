// app/_layout.tsx
// Root layout: Auth provider, TanStack Query provider, and navigation

import React from 'react';
import { Stack } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { queryClient } from '../src/lib/queryClient';
import { AuthContext, useAuthProvider } from '../src/hooks/useAuth';
import { COLORS } from '../src/lib/constants';

export default function RootLayout() {
    const authState = useAuthProvider();

    return (
        <QueryClientProvider client={queryClient}>
            <AuthContext.Provider value={authState}>
                <StatusBar style="light" />
                <Stack
                    screenOptions={{
                        headerStyle: { backgroundColor: COLORS.background },
                        headerTintColor: COLORS.textPrimary,
                        headerTitleStyle: { fontWeight: '700' },
                        contentStyle: { backgroundColor: COLORS.background },
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
