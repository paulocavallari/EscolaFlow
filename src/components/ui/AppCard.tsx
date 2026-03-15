// src/components/ui/AppCard.tsx
// MD3 Card with elevation levels

import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../lib/theme';

interface AppCardProps {
    children: React.ReactNode;
    elevation?: 0 | 1 | 2 | 3;
    onPress?: () => void;
    style?: any;
}

export function AppCard({ children, elevation = 1, onPress, style }: AppCardProps) {
    const { colors } = useTheme();

    const elevationMap = {
        0: colors.elevation.level0,
        1: colors.elevation.level1,
        2: colors.elevation.level2,
        3: colors.elevation.level3,
    };

    const shadowMap = {
        0: {},
        1: { shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 1 },
        2: { shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 3 },
        3: { shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.16, shadowRadius: 8, elevation: 6 },
    };

    const cardStyle = [
        styles.card,
        {
            backgroundColor: elevationMap[elevation],
            borderColor: colors.outlineVariant,
            shadowColor: '#000',
            ...shadowMap[elevation],
        },
        style,
    ];

    if (onPress) {
        return (
            <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={cardStyle}>
                {children}
            </TouchableOpacity>
        );
    }

    return <View style={cardStyle}>{children}</View>;
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
    },
});
