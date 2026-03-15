// app/(app)/admin/_layout.tsx
// Admin section stack navigation

import React from 'react';
import { Stack } from 'expo-router';
import { useTheme } from '../../../src/lib/theme';

export default function AdminLayout() {
    const { colors } = useTheme();

    return (
        <Stack
            screenOptions={{
                headerStyle: { backgroundColor: colors.background },
                headerTintColor: colors.onBackground,
                headerTitleStyle: { fontWeight: '700' },
                contentStyle: { backgroundColor: colors.background },
            }}
        >
            <Stack.Screen name="index" options={{ title: 'Administração' }} />
            <Stack.Screen name="users" options={{ title: 'Usuários' }} />
            <Stack.Screen name="classes" options={{ title: 'Turmas' }} />
            <Stack.Screen name="students" options={{ title: 'Alunos' }} />
            <Stack.Screen name="tutors" options={{ title: 'Tutores' }} />
        </Stack>
    );
}
