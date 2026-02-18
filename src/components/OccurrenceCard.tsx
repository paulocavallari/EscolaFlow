// src/components/OccurrenceCard.tsx
// List item card for displaying occurrence summary

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { OccurrenceWithRelations } from '../types/database';
import { StatusBadge } from './StatusBadge';
import { COLORS } from '../lib/constants';

interface OccurrenceCardProps {
    occurrence: OccurrenceWithRelations;
    onPress: () => void;
}

export function OccurrenceCard({ occurrence, onPress }: OccurrenceCardProps) {
    const createdDate = new Date(occurrence.created_at);
    const formattedDate = createdDate.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

    const excerpt =
        occurrence.description_formal.length > 120
            ? occurrence.description_formal.substring(0, 120) + '...'
            : occurrence.description_formal;

    return (
        <TouchableOpacity
            style={styles.card}
            onPress={onPress}
            activeOpacity={0.7}
        >
            {/* Header Row */}
            <View style={styles.header}>
                <View style={styles.studentInfo}>
                    <Text style={styles.studentName}>{occurrence.student?.name ?? 'Aluno'}</Text>
                    <Text style={styles.className}>
                        {occurrence.student?.class?.name ?? ''}
                    </Text>
                </View>
                <StatusBadge status={occurrence.status} size="sm" />
            </View>

            {/* Description Excerpt */}
            <Text style={styles.excerpt} numberOfLines={3}>
                {excerpt}
            </Text>

            {/* Footer */}
            <View style={styles.footer}>
                <View style={styles.footerLeft}>
                    <Text style={styles.authorLabel}>Por: </Text>
                    <Text style={styles.authorName}>
                        {occurrence.author?.full_name ?? 'Professor'}
                    </Text>
                </View>
                <Text style={styles.date}>{formattedDate}</Text>
            </View>

            {/* Actions count indicator */}
            {occurrence.actions && occurrence.actions.length > 0 && (
                <View style={styles.actionsIndicator}>
                    <Text style={styles.actionsText}>
                        📋 {occurrence.actions.length} tratativa(s)
                    </Text>
                </View>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: COLORS.border + '40',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 10,
    },
    studentInfo: {
        flex: 1,
        marginRight: 12,
    },
    studentName: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.textPrimary,
    },
    className: {
        fontSize: 13,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    excerpt: {
        fontSize: 14,
        color: COLORS.textSecondary,
        lineHeight: 20,
        marginBottom: 12,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    footerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    authorLabel: {
        fontSize: 12,
        color: COLORS.textMuted,
    },
    authorName: {
        fontSize: 12,
        color: COLORS.textSecondary,
        fontWeight: '500',
    },
    date: {
        fontSize: 12,
        color: COLORS.textMuted,
    },
    actionsIndicator: {
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: COLORS.border + '30',
    },
    actionsText: {
        fontSize: 12,
        color: COLORS.primary,
        fontWeight: '500',
    },
});

export default OccurrenceCard;
