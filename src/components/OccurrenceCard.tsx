// src/components/OccurrenceCard.tsx
// List item card for displaying occurrence summary

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ClipboardText } from 'phosphor-react-native';
import { OccurrenceWithRelations } from '../types/database';
import { StatusBadge } from './StatusBadge';
import { CATEGORY_LABELS } from '../lib/constants';
import { useTheme } from '../lib/theme';

interface OccurrenceCardProps {
    occurrence: OccurrenceWithRelations;
    onPress: () => void;
}

export function OccurrenceCard({ occurrence, onPress }: OccurrenceCardProps) {
    const { colors } = useTheme();
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
            style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.outline + '40' }]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            {/* Header Row */}
            <View style={styles.header}>
                <View style={styles.studentInfo}>
                    <Text style={[styles.studentName, { color: colors.onSurface }]}>{occurrence.student?.name ?? 'Aluno'}</Text>
                    <Text style={[styles.className, { color: colors.onSurfaceVariant }]}>
                        {occurrence.student?.class?.name ?? ''}
                        {occurrence.category ? ` · ${CATEGORY_LABELS[occurrence.category as keyof typeof CATEGORY_LABELS] ?? occurrence.category}` : ''}
                    </Text>
                </View>
                <StatusBadge status={occurrence.status} size="sm" />
            </View>

            {/* Description Excerpt */}
            <Text style={[styles.excerpt, { color: colors.onSurfaceVariant }]} numberOfLines={3}>
                {excerpt}
            </Text>

            {/* Footer */}
            <View style={styles.footer}>
                <View style={styles.footerLeft}>
                    <Text style={[styles.authorLabel, { color: colors.onSurfaceVariant }]}>Por: </Text>
                    <Text style={[styles.authorName, { color: colors.onSurfaceVariant }]}>
                        {occurrence.author?.full_name ?? 'Professor'}
                    </Text>
                </View>
                <Text style={[styles.date, { color: colors.onSurfaceVariant }]}>{formattedDate}</Text>
            </View>

            {/* Actions count indicator */}
            {occurrence.actions && occurrence.actions.length > 0 && (
                <View style={[styles.actionsIndicator, { borderTopColor: colors.outline + '30' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <ClipboardText size={14} color={colors.primary} />
                        <Text style={[styles.actionsText, { color: colors.primary }]}>
                            {occurrence.actions.length} tratativa(s)
                        </Text>
                    </View>
                </View>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
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
    },
    className: {
        fontSize: 13,
        marginTop: 2,
    },
    excerpt: {
        fontSize: 14,
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
    },
    authorName: {
        fontSize: 12,
        fontWeight: '500',
    },
    date: {
        fontSize: 12,
    },
    actionsIndicator: {
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
    },
    actionsText: {
        fontSize: 12,
        fontWeight: '500',
    },
});

export default OccurrenceCard;
