// src/components/ui/AppChip.tsx
// MD3 Filter/Selection chip with optional icon

import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { useTheme, typography } from '../../lib/theme';
import type { IconProps } from 'phosphor-react-native';

interface AppChipProps {
    label: string;
    selected?: boolean;
    onPress?: () => void;
    icon?: React.ComponentType<IconProps>;
    style?: any;
}

export function AppChip({ label, selected = false, onPress, icon: Icon, style }: AppChipProps) {
    const { colors } = useTheme();

    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.7}
            style={[
                styles.chip,
                {
                    backgroundColor: selected ? colors.primaryContainer : 'transparent',
                    borderColor: selected ? colors.primaryContainer : colors.outline,
                },
                style,
            ]}
        >
            <View style={styles.content}>
                {Icon && (
                    <Icon
                        size={16}
                        color={selected ? colors.onPrimaryContainer : colors.onSurfaceVariant}
                        weight={selected ? 'bold' : 'regular'}
                        style={{ marginRight: 6 }}
                    />
                )}
                <Text
                    style={[
                        styles.label,
                        { color: selected ? colors.onPrimaryContainer : colors.onSurfaceVariant },
                    ]}
                >
                    {label}
                </Text>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    chip: {
        borderRadius: 8,
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    label: {
        ...typography.labelMedium,
    },
});
