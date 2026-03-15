// app/(app)/_layout.tsx
// App tab navigation with role-based tab visibility

import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { House, ClipboardText, GearSix } from 'phosphor-react-native';
import { useAuth } from '../../src/hooks/useAuth';
import { UserRole } from '../../src/types/database';
import { useTheme } from '../../src/lib/theme';

export default function AppLayout() {
    const { session, profile, loading } = useAuth();
    const { colors } = useTheme();

    // Show loading spinner while checking auth
    if (loading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    // Redirect to login if not authenticated
    if (!session) {
        return <Redirect href="/(auth)/login" />;
    }

    // Redirect to change password if this is the first login after admin creation
    if (profile?.force_password_change) {
        return <Redirect href="/(auth)/change-password" />;
    }

    const isAdmin = profile?.role === UserRole.ADMIN;

    return (
        <Tabs
            screenOptions={{
                tabBarStyle: {
                    backgroundColor: colors.surface,
                    borderTopColor: colors.outlineVariant,
                    borderTopWidth: 1,
                    paddingBottom: 4,
                    height: 60,
                },
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.onSurfaceVariant,
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: '600',
                },
                headerStyle: {
                    backgroundColor: colors.background,
                },
                headerTintColor: colors.onSurface,
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
                    tabBarIcon: ({ color, focused }) => (
                        <House size={22} color={color} weight={focused ? 'fill' : 'regular'} />
                    ),
                    headerTitle: 'Ocorrências VC',
                }}
            />
            <Tabs.Screen
                name="occurrences"
                options={{
                    title: 'Ocorrências',
                    tabBarLabel: 'Ocorrências',
                    tabBarIcon: ({ color, focused }) => (
                        <ClipboardText size={22} color={color} weight={focused ? 'fill' : 'regular'} />
                    ),
                    headerShown: false,
                }}
            />
            <Tabs.Screen
                name="admin"
                options={{
                    title: 'Administração',
                    tabBarLabel: 'Admin',
                    tabBarIcon: ({ color, focused }) => (
                        <GearSix size={22} color={color} weight={focused ? 'fill' : 'regular'} />
                    ),
                    headerShown: false,
                    // Hide admin tab for non-admin users
                    href: isAdmin ? undefined : null,
                }}
            />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
