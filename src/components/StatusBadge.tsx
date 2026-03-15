// src/components/StatusBadge.tsx
// Visual badge for occurrence status with Phosphor icons

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Clock, TrendUp, CheckCircle } from 'phosphor-react-native';
import { OccurrenceStatus } from '../types/database';
import { STATUS_LABELS, STATUS_COLORS } from '../lib/constants';

const STATUS_ICON_MAP: Record<OccurrenceStatus, React.ComponentType<any>> = {
    [OccurrenceStatus.PENDING_TUTOR]: Clock,
    [OccurrenceStatus.ESCALATED_VP]: TrendUp,
    [OccurrenceStatus.CONCLUDED]: CheckCircle,
};

interface StatusBadgeProps {
    status: OccurrenceStatus;
    size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
    const statusColors = STATUS_COLORS[status];
    const label = STATUS_LABELS[status];
    const IconComponent = STATUS_ICON_MAP[status];
    const iconSize = size === 'sm' ? 12 : 14;

    return (
        <View
            style={[
                styles.badge,
                {
                    backgroundColor: statusColors.bg,
                    borderColor: statusColors.border,
                },
                size === 'sm' && styles.badgeSm,
            ]}
        >
            <IconComponent size={iconSize} color={statusColors.text} weight="bold" />
            <Text
                style={[
                    styles.text,
                    { color: statusColors.text },
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
        gap: 6,
    },
    badgeSm: {
        paddingHorizontal: 8,
        paddingVertical: 4,
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
