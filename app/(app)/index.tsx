// app/(app)/index.tsx
// Dashboard - role-adaptive home screen

import React from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { useOccurrencesList, useOccurrenceStats } from '../../src/hooks/useOccurrences';
import { OccurrenceStatus, UserRole } from '../../src/types/database';
import { COLORS, ROLE_LABELS, STATUS_LABELS } from '../../src/lib/constants';

export default function DashboardScreen() {
    const { profile, signOut, isAdmin, isViceDirector, isProfessor } = useAuth();

    const { data: occurrences, isLoading, refetch } = useOccurrencesList();
    const { data: stats } = useOccurrenceStats();

    const pendingCount = occurrences?.filter(
        (o) => o.status === OccurrenceStatus.PENDING_TUTOR
    ).length ?? 0;

    const escalatedCount = occurrences?.filter(
        (o) => o.status === OccurrenceStatus.ESCALATED_VP
    ).length ?? 0;

    const concludedCount = occurrences?.filter(
        (o) => o.status === OccurrenceStatus.CONCLUDED
    ).length ?? 0;

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            refreshControl={
                <RefreshControl
                    refreshing={isLoading}
                    onRefresh={refetch}
                    tintColor={COLORS.primary}
                />
            }
        >
            {/* Welcome Card */}
            <View style={styles.welcomeCard}>
                <View style={styles.welcomeContent}>
                    <Text style={styles.welcomeGreeting}>Olá,</Text>
                    <Text style={styles.welcomeName}>{profile?.full_name ?? 'Usuário'}</Text>
                    <View style={styles.roleBadge}>
                        <Text style={styles.roleText}>
                            {profile?.role ? ROLE_LABELS[profile.role] : ''}
                        </Text>
                    </View>
                </View>
                <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
                    <Text style={styles.logoutText}>Sair</Text>
                </TouchableOpacity>
            </View>

            {/* Quick Stats */}
            <Text style={styles.sectionTitle}>Resumo</Text>
            <View style={styles.statsGrid}>
                <TouchableOpacity
                    style={[styles.statCard, { borderLeftColor: COLORS.warning }]}
                    onPress={() => router.push('/(app)/occurrences')}
                >
                    <Text style={styles.statNumber}>{pendingCount}</Text>
                    <Text style={styles.statLabel}>{STATUS_LABELS[OccurrenceStatus.PENDING_TUTOR]}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.statCard, { borderLeftColor: COLORS.error }]}
                    onPress={() => router.push('/(app)/occurrences')}
                >
                    <Text style={styles.statNumber}>{escalatedCount}</Text>
                    <Text style={styles.statLabel}>{STATUS_LABELS[OccurrenceStatus.ESCALATED_VP]}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.statCard, { borderLeftColor: COLORS.success }]}
                    onPress={() => router.push('/(app)/occurrences')}
                >
                    <Text style={styles.statNumber}>{concludedCount}</Text>
                    <Text style={styles.statLabel}>{STATUS_LABELS[OccurrenceStatus.CONCLUDED]}</Text>
                </TouchableOpacity>
            </View>

            {/* Quick Actions */}
            <Text style={styles.sectionTitle}>Ações Rápidas</Text>
            <View style={styles.actionsRow}>
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => router.push('/(app)/occurrences/create')}
                >
                    <Text style={styles.actionIcon}>🎙️</Text>
                    <Text style={styles.actionLabel}>Nova Ocorrência</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => router.push('/(app)/occurrences')}
                >
                    <Text style={styles.actionIcon}>📋</Text>
                    <Text style={styles.actionLabel}>Ver Todas</Text>
                </TouchableOpacity>

                {isAdmin && (
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => router.push('/(app)/admin')}
                    >
                        <Text style={styles.actionIcon}>⚙️</Text>
                        <Text style={styles.actionLabel}>Administrar</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* VP-specific: Stats by professor */}
            {(isViceDirector || isAdmin) && stats && stats.length > 0 && (
                <>
                    <Text style={styles.sectionTitle}>Por Professor</Text>
                    {stats.map((stat: any) => (
                        <View key={stat.author_id} style={styles.professorRow}>
                            <Text style={styles.professorName}>{stat.author_name}</Text>
                            <View style={styles.professorStats}>
                                <View style={[styles.miniStat, { backgroundColor: COLORS.warning + '20' }]}>
                                    <Text style={[styles.miniStatText, { color: COLORS.warning }]}>
                                        {stat.pending}
                                    </Text>
                                </View>
                                <View style={[styles.miniStat, { backgroundColor: COLORS.error + '20' }]}>
                                    <Text style={[styles.miniStatText, { color: COLORS.error }]}>
                                        {stat.escalated}
                                    </Text>
                                </View>
                                <View style={[styles.miniStat, { backgroundColor: COLORS.success + '20' }]}>
                                    <Text style={[styles.miniStatText, { color: COLORS.success }]}>
                                        {stat.concluded}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    ))}
                </>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    content: {
        padding: 20,
        paddingBottom: 40,
    },
    welcomeCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 20,
        padding: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 28,
        borderWidth: 1,
        borderColor: COLORS.primary + '30',
    },
    welcomeContent: {
        flex: 1,
    },
    welcomeGreeting: {
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    welcomeName: {
        fontSize: 22,
        fontWeight: '800',
        color: COLORS.textPrimary,
        marginTop: 2,
    },
    roleBadge: {
        marginTop: 8,
        backgroundColor: COLORS.primary + '20',
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    roleText: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.primary,
    },
    logoutButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: COLORS.surfaceLight,
    },
    logoutText: {
        fontSize: 13,
        color: COLORS.textSecondary,
        fontWeight: '500',
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: 12,
    },
    statsGrid: {
        gap: 10,
        marginBottom: 28,
    },
    statCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 14,
        padding: 16,
        borderLeftWidth: 4,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    statNumber: {
        fontSize: 28,
        fontWeight: '800',
        color: COLORS.textPrimary,
    },
    statLabel: {
        fontSize: 13,
        color: COLORS.textSecondary,
        flex: 1,
        textAlign: 'right',
        marginLeft: 12,
    },
    actionsRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 28,
    },
    actionButton: {
        flex: 1,
        backgroundColor: COLORS.surface,
        borderRadius: 14,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border + '30',
    },
    actionIcon: {
        fontSize: 28,
        marginBottom: 8,
    },
    actionLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.textSecondary,
        textAlign: 'center',
    },
    professorRow: {
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        padding: 14,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    professorName: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.textPrimary,
        flex: 1,
    },
    professorStats: {
        flexDirection: 'row',
        gap: 6,
    },
    miniStat: {
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 4,
        minWidth: 32,
        alignItems: 'center',
    },
    miniStatText: {
        fontSize: 13,
        fontWeight: '700',
    },
});
