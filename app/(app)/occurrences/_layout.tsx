// app/(app)/occurrences/_layout.tsx
// Occurrences section stack navigation

import React from 'react';
import { Stack } from 'expo-router';
import { COLORS } from '../../../src/lib/constants';

export default function OccurrencesLayout() {
    return (
        <Stack
            screenOptions={{
                headerStyle: { backgroundColor: COLORS.background },
                headerTintColor: COLORS.textPrimary,
                headerTitleStyle: { fontWeight: '700' },
                contentStyle: { backgroundColor: COLORS.background },
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
