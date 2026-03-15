// app/(app)/occurrences/_layout.tsx
// Occurrences section stack navigation

import React from 'react';
import { Stack } from 'expo-router';
import { useTheme } from '../../../src/lib/theme';

export default function OccurrencesLayout() {
    const { colors } = useTheme();

    return (
        <Stack
            screenOptions={{
                headerStyle: { backgroundColor: colors.surface },
                headerTintColor: colors.onSurface,
                headerTitleStyle: { fontWeight: '700' },
                contentStyle: { backgroundColor: colors.background },
            }}
        >
            <Stack.Screen
                name="index"
                options={{ title: 'Ocorrências' }}
            />
            <Stack.Screen
                name="create"
                options={{ title: 'Nova Ocorrência', presentation: 'modal' }}
            />
            <Stack.Screen
                name="[id]"
                options={{ title: 'Detalhes' }}
            />
        </Stack>
    );
}
