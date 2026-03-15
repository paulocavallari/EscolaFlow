// src/components/ui/AppIconButton.tsx
// MD3 Icon Button with filled/outlined/tonal/standard variants

import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../lib/theme';
import type { IconProps } from 'phosphor-react-native';

type IconButtonVariant = 'filled' | 'outlined' | 'tonal' | 'standard';
type IconButtonColor = 'primary' | 'error' | 'success' | 'warning';

interface AppIconButtonProps {
    icon: React.ComponentType<IconProps>;
    onPress: () => void;
    variant?: IconButtonVariant;
    size?: number;
    color?: IconButtonColor;
    disabled?: boolean;
    style?: any;
}

export function AppIconButton({
    icon: Icon,
    onPress,
    variant = 'standard',
    size = 40,
    color = 'primary',
    disabled = false,
    style,
}: AppIconButtonProps) {
    const { colors } = useTheme();

    const colorMap = {
        primary: { main: colors.primary, onMain: colors.onPrimary, container: colors.primaryContainer, onContainer: colors.onPrimaryContainer },
        error: { main: colors.error, onMain: colors.onError, container: colors.errorContainer, onContainer: colors.onErrorContainer },
        success: { main: colors.success, onMain: colors.onSuccess, container: colors.successContainer, onContainer: colors.onSuccessContainer },
        warning: { main: colors.warning, onMain: colors.onWarning, container: colors.warningContainer, onContainer: colors.onWarningContainer },
    };
    const c = colorMap[color];

    const iconSize = size * 0.5;

    const variantStyles = {
        filled: { bg: c.main, iconColor: c.onMain, borderColor: 'transparent', borderWidth: 0 },
        outlined: { bg: 'transparent', iconColor: c.main, borderColor: colors.outline, borderWidth: 1 },
        tonal: { bg: c.container, iconColor: c.onContainer, borderColor: 'transparent', borderWidth: 0 },
        standard: { bg: 'transparent', iconColor: c.main, borderColor: 'transparent', borderWidth: 0 },
    };
    const v = variantStyles[variant];

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled}
            activeOpacity={0.7}
            style={[
                styles.base,
                {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    backgroundColor: v.bg,
                    borderColor: v.borderColor,
                    borderWidth: v.borderWidth,
                    opacity: disabled ? 0.5 : 1,
                },
                style,
            ]}
        >
            <Icon size={iconSize} color={v.iconColor} weight="bold" />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    base: {
        alignItems: 'center',
        justifyContent: 'center',
    },
});
