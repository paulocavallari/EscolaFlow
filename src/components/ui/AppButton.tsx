// src/components/ui/AppButton.tsx
// MD3 Button with filled/outlined/text/tonal variants

import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, View } from 'react-native';
import { useTheme, typography } from '../../lib/theme';
import type { IconProps } from 'phosphor-react-native';

type ButtonVariant = 'filled' | 'outlined' | 'text' | 'tonal';
type ButtonSize = 'sm' | 'md' | 'lg';
type ButtonColor = 'primary' | 'error' | 'success' | 'warning';

interface AppButtonProps {
    title: string;
    onPress: () => void;
    variant?: ButtonVariant;
    icon?: React.ComponentType<IconProps>;
    loading?: boolean;
    disabled?: boolean;
    size?: ButtonSize;
    color?: ButtonColor;
    style?: any;
}

const sizeConfig = {
    sm: { paddingVertical: 8, paddingHorizontal: 16, fontSize: 13, iconSize: 16, height: 36 },
    md: { paddingVertical: 12, paddingHorizontal: 24, fontSize: 14, iconSize: 18, height: 44 },
    lg: { paddingVertical: 16, paddingHorizontal: 32, fontSize: 16, iconSize: 20, height: 52 },
};

export function AppButton({
    title,
    onPress,
    variant = 'filled',
    icon: Icon,
    loading = false,
    disabled = false,
    size = 'md',
    color = 'primary',
    style,
}: AppButtonProps) {
    const { colors } = useTheme();
    const cfg = sizeConfig[size];

    const colorMap = {
        primary: { main: colors.primary, onMain: colors.onPrimary, container: colors.primaryContainer, onContainer: colors.onPrimaryContainer },
        error: { main: colors.error, onMain: colors.onError, container: colors.errorContainer, onContainer: colors.onErrorContainer },
        success: { main: colors.success, onMain: colors.onSuccess, container: colors.successContainer, onContainer: colors.onSuccessContainer },
        warning: { main: colors.warning, onMain: colors.onWarning, container: colors.warningContainer, onContainer: colors.onWarningContainer },
    };
    const c = colorMap[color];

    const variantStyles = {
        filled: {
            bg: c.main,
            text: c.onMain,
            border: 'transparent',
        },
        outlined: {
            bg: 'transparent',
            text: c.main,
            border: colors.outline,
        },
        text: {
            bg: 'transparent',
            text: c.main,
            border: 'transparent',
        },
        tonal: {
            bg: c.container,
            text: c.onContainer,
            border: 'transparent',
        },
    };
    const v = variantStyles[variant];

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled || loading}
            activeOpacity={0.7}
            style={[
                styles.base,
                {
                    backgroundColor: v.bg,
                    borderColor: v.border,
                    borderWidth: variant === 'outlined' ? 1 : 0,
                    paddingVertical: cfg.paddingVertical,
                    paddingHorizontal: cfg.paddingHorizontal,
                    minHeight: cfg.height,
                    opacity: disabled ? 0.5 : 1,
                },
                style,
            ]}
        >
            {loading ? (
                <ActivityIndicator size="small" color={v.text} />
            ) : (
                <View style={styles.content}>
                    {Icon && <Icon size={cfg.iconSize} color={v.text} weight="bold" style={{ marginRight: 8 }} />}
                    <Text style={[{ color: v.text, fontSize: cfg.fontSize, fontWeight: typography.labelLarge.fontWeight }]}>
                        {title}
                    </Text>
                </View>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    base: {
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
});
