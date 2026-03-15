// src/components/ui/AppInput.tsx
// MD3 Text Input with label, error, and optional left icon

import React, { forwardRef } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import type { TextInputProps } from 'react-native';
import { useTheme, typography } from '../../lib/theme';
import type { IconProps } from 'phosphor-react-native';

interface AppInputProps extends TextInputProps {
    label?: string;
    error?: string;
    leftIcon?: React.ComponentType<IconProps>;
}

export const AppInput = forwardRef<TextInput, AppInputProps>(
    ({ label, error, leftIcon: Icon, style, ...rest }, ref) => {
        const { colors } = useTheme();

        return (
            <View style={styles.container}>
                {label && (
                    <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>
                        {label}
                    </Text>
                )}
                <View
                    style={[
                        styles.inputWrapper,
                        {
                            backgroundColor: colors.surfaceContainerHigh,
                            borderColor: error ? colors.error : colors.outline,
                        },
                    ]}
                >
                    {Icon && (
                        <Icon
                            size={20}
                            color={colors.onSurfaceVariant}
                            weight="regular"
                            style={styles.icon}
                        />
                    )}
                    <TextInput
                        ref={ref}
                        placeholderTextColor={colors.onSurfaceVariant + '80'}
                        style={[
                            styles.input,
                            { color: colors.onSurface },
                            Icon && { paddingLeft: 0 },
                            style,
                        ]}
                        {...rest}
                    />
                </View>
                {error && (
                    <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
                )}
            </View>
        );
    }
);

const styles = StyleSheet.create({
    container: {
        gap: 6,
    },
    label: {
        ...typography.labelLarge,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 16,
    },
    icon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        ...typography.bodyLarge,
        paddingVertical: 14,
    },
    error: {
        ...typography.bodySmall,
        marginTop: 2,
    },
});
