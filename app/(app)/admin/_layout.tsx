// app/(app)/admin/_layout.tsx
// Admin section stack navigation

import React from 'react';
import { Stack } from 'expo-router';
import { COLORS } from '../../../src/lib/constants';

export default function AdminLayout() {
    return (
        <Stack
            screenOptions={{
                headerStyle: { backgroundColor: COLORS.background },
                headerTintColor: COLORS.textPrimary,
                headerTitleStyle: { fontWeight: '700' },
                contentStyle: { backgroundColor: COLORS.background },
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
