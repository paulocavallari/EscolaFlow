// app/(app)/_layout.tsx
// App tab navigation with role-based tab visibility

import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import { ActivityIndicator, View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../../src/hooks/useAuth';
import { UserRole } from '../../src/types/database';
import { COLORS } from '../../src/lib/constants';

export default function AppLayout() {
    const { session, profile, loading } = useAuth();

    // Show loading spinner while checking auth
    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    // Redirect to login if not authenticated
    if (!session) {
        return <Redirect href="/(auth)/login" />;
    }

    const isAdmin = profile?.role === UserRole.ADMIN;
    const isVP = profile?.role === UserRole.VICE_DIRECTOR;

    return (
        <Tabs
            screenOptions={{
                tabBarStyle: {
                    backgroundColor: COLORS.surface,
                    borderTopColor: COLORS.border + '40',
                    borderTopWidth: 1,
                    paddingBottom: 4,
                    height: 60,
                },
                tabBarActiveTintColor: COLORS.primary,
                tabBarInactiveTintColor: COLORS.textMuted,
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: '600',
                },
                headerStyle: {
                    backgroundColor: COLORS.background,
                },
                headerTintColor: COLORS.textPrimary,
                headerTitleStyle: {
                    fontWeight: '700',
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Início',
                    tabBarLabel: 'Início',
                    tabBarIcon: ({ color }) => <TabIcon emoji="🏠" color={color} />,
                    headerTitle: 'EscolaFlow',
                }}
            />
            <Tabs.Screen
                name="occurrences"
                options={{
                    title: 'Ocorrências',
                    tabBarLabel: 'Ocorrências',
                    tabBarIcon: ({ color }) => <TabIcon emoji="📋" color={color} />,
                    headerShown: false,
                }}
            />
            <Tabs.Screen
                name="admin"
                options={{
                    title: 'Administração',
                    tabBarLabel: 'Admin',
                    tabBarIcon: ({ color }) => <TabIcon emoji="⚙️" color={color} />,
                    headerShown: false,
                    // Hide admin tab for non-admin users
                    href: isAdmin ? undefined : null,
                }}
            />
        </Tabs>
    );
}

function TabIcon({ emoji, color }: { emoji: string; color: string }) {
    return (
        <View style={[styles.tabIcon, { opacity: color === COLORS.primary ? 1 : 0.5 }]}>
            <Text style={{ fontSize: 20 }}>{emoji}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background,
    },
    tabIcon: {
        width: 24,
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
