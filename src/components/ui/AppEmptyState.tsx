// src/components/ui/AppEmptyState.tsx
// Empty state placeholder with icon, title, description, and optional CTA

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme, typography } from '../../lib/theme';
import { AppButton } from './AppButton';
import type { IconProps } from 'phosphor-react-native';

interface AppEmptyStateProps {
    icon: React.ComponentType<IconProps>;
    title: string;
    description?: string;
    action?: {
        label: string;
        onPress: () => void;
    };
}

export function AppEmptyState({ icon: Icon, title, description, action }: AppEmptyStateProps) {
    const { colors } = useTheme();

    return (
        <View style={styles.container}>
            <View style={[styles.iconCircle, { backgroundColor: colors.surfaceContainerHigh }]}>
                <Icon size={48} color={colors.onSurfaceVariant} weight="duotone" />
            </View>
            <Text style={[styles.title, { color: colors.onSurface }]}>{title}</Text>
            {description && (
                <Text style={[styles.description, { color: colors.onSurfaceVariant }]}>
                    {description}
                </Text>
            )}
            {action && (
                <AppButton
                    title={action.label}
                    onPress={action.onPress}
                    variant="tonal"
                    size="sm"
                    style={{ marginTop: 16 }}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
        paddingVertical: 48,
    },
    iconCircle: {
        width: 96,
        height: 96,
        borderRadius: 48,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    title: {
        ...typography.titleMedium,
        textAlign: 'center',
        marginBottom: 8,
    },
    description: {
        ...typography.bodyMedium,
        textAlign: 'center',
    },
});
