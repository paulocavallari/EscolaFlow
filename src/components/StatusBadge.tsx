// src/components/StatusBadge.tsx
// Visual badge for occurrence status

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { OccurrenceStatus } from '../types/database';
import { STATUS_LABELS, STATUS_COLORS } from '../lib/constants';

interface StatusBadgeProps {
    status: OccurrenceStatus;
    size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
    const colors = STATUS_COLORS[status];
    const label = STATUS_LABELS[status];

    return (
        <View
            style={[
                styles.badge,
                {
                    backgroundColor: colors.bg,
                    borderColor: colors.border,
                },
                size === 'sm' && styles.badgeSm,
            ]}
        >
            <View style={[styles.dot, { backgroundColor: colors.text }]} />
            <Text
                style={[
                    styles.text,
                    { color: colors.text },
                    size === 'sm' && styles.textSm,
                ]}
            >
                {label}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        alignSelf: 'flex-start',
    },
    badgeSm: {
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 6,
    },
    text: {
        fontSize: 13,
        fontWeight: '600',
    },
    textSm: {
        fontSize: 11,
    },
});

export default StatusBadge;
