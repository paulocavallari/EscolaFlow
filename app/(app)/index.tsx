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
    Alert,
    Platform,
} from 'react-native';
import { router } from 'expo-router';
import {
    SignOut,
    Clock,
    TrendUp,
    CheckCircle,
    Microphone,
    ClipboardText,
    GearSix,
    Sun,
    Moon,
} from 'phosphor-react-native';
import { useAuth } from '../../src/hooks/useAuth';
import { useOccurrencesList, useOccurrenceStats } from '../../src/hooks/useOccurrences';
import { OccurrenceStatus } from '../../src/types/database';
import { ROLE_LABELS } from '../../src/lib/constants';
import { useTheme, typography } from '../../src/lib/theme';

export default function DashboardScreen() {
    const { profile, signOut, isAdmin, isViceDirector } = useAuth();
    const { colors, isDark, toggleTheme } = useTheme();

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

    const handleSignOut = async () => {
        if (Platform.OS === 'web') {
            if (window.confirm('Deseja realmente sair do sistema?')) {
                await signOut();
                router.replace('/(auth)/login');
            }
        } else {
            Alert.alert(
                'Sair',
                'Deseja realmente sair do sistema?',
                [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                        text: 'Sair',
                        style: 'destructive',
                        onPress: async () => {
                            await signOut();
                            router.replace('/(auth)/login');
                        },
                    },
                ]
            );
        }
    };

    return (
        <ScrollView
            style={[styles.container, { backgroundColor: colors.background }]}
            contentContainerStyle={styles.content}
            refreshControl={
                <RefreshControl
                    refreshing={isLoading}
                    onRefresh={refetch}
                    tintColor={colors.primary}
                />
            }
        >
            {/* Welcome Card */}
            <View style={[styles.welcomeCard, { backgroundColor: colors.surface, borderColor: colors.primary + '30' }]}>
                <View style={styles.welcomeContent}>
                    <Text style={[styles.welcomeGreeting, { color: colors.onSurfaceVariant }]}>Olá,</Text>
                    <Text style={[styles.welcomeName, { color: colors.onSurface }]}>{profile?.full_name ?? 'Usuário'}</Text>
                    <View style={[styles.roleBadge, { backgroundColor: colors.primaryContainer }]}>
                        <Text style={[styles.roleText, { color: colors.onPrimaryContainer }]}>
                            {profile?.role ? ROLE_LABELS[profile.role] : ''}
                        </Text>
                    </View>
                </View>
                <View style={styles.headerActions}>
                    <TouchableOpacity
                        style={[styles.iconBtn, { backgroundColor: colors.surfaceContainerHigh }]}
                        onPress={toggleTheme}
                    >
                        {isDark
                            ? <Sun size={20} color={colors.warning} weight="bold" />
                            : <Moon size={20} color={colors.primary} weight="bold" />}
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.iconBtn, { backgroundColor: colors.errorContainer }]}
                        onPress={handleSignOut}
                    >
                        <SignOut size={20} color={colors.onErrorContainer} weight="bold" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Quick Stats */}
            <Text style={[styles.sectionTitle, { color: colors.onBackground }]}>Resumo</Text>
            <View style={styles.statsGrid}>
                <TouchableOpacity
                    style={[styles.statCard, { backgroundColor: colors.surface, borderLeftColor: colors.warning }]}
                    onPress={() => router.push({ pathname: '/(app)/occurrences', params: { filter: 'PENDING_TUTOR' } })}
                >
                    <View style={styles.statLeft}>
                        <View style={[styles.statIconCircle, { backgroundColor: colors.warningContainer }]}>
                            <Clock size={20} color={colors.onWarningContainer} weight="bold" />
                        </View>
                        <Text style={[styles.statNumber, { color: colors.onSurface }]}>{pendingCount}</Text>
                    </View>
                    <Text style={[styles.statLabel, { color: colors.onSurfaceVariant }]}>Aguardando Tratativa</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.statCard, { backgroundColor: colors.surface, borderLeftColor: colors.error }]}
                    onPress={() => router.push({ pathname: '/(app)/occurrences', params: { filter: 'ESCALATED_VP' } })}
                >
                    <View style={styles.statLeft}>
                        <View style={[styles.statIconCircle, { backgroundColor: colors.errorContainer }]}>
                            <TrendUp size={20} color={colors.onErrorContainer} weight="bold" />
                        </View>
                        <Text style={[styles.statNumber, { color: colors.onSurface }]}>{escalatedCount}</Text>
                    </View>
                    <Text style={[styles.statLabel, { color: colors.onSurfaceVariant }]}>Encaminhadas à Vice-Direção</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.statCard, { backgroundColor: colors.surface, borderLeftColor: colors.success }]}
                    onPress={() => router.push({ pathname: '/(app)/occurrences', params: { filter: 'CONCLUDED' } })}
                >
                    <View style={styles.statLeft}>
                        <View style={[styles.statIconCircle, { backgroundColor: colors.successContainer }]}>
                            <CheckCircle size={20} color={colors.onSuccessContainer} weight="bold" />
                        </View>
                        <Text style={[styles.statNumber, { color: colors.onSurface }]}>{concludedCount}</Text>
                    </View>
                    <Text style={[styles.statLabel, { color: colors.onSurfaceVariant }]}>Concluídas</Text>
                </TouchableOpacity>
            </View>

            {/* Quick Actions */}
            <Text style={[styles.sectionTitle, { color: colors.onBackground }]}>Ações Rápidas</Text>
            <View style={styles.actionsRow}>
                <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: colors.surface, borderColor: colors.primary + '50' }]}
                    onPress={() => router.push('/(app)/occurrences/create')}
                >
                    <View style={[styles.actionIconCircle, { backgroundColor: colors.primaryContainer }]}>
                        <Microphone size={24} color={colors.onPrimaryContainer} weight="duotone" />
                    </View>
                    <Text style={[styles.actionLabel, { color: colors.onSurfaceVariant }]}>Nova{'\n'}Ocorrência</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: colors.surface, borderColor: colors.outlineVariant }]}
                    onPress={() => router.push('/(app)/occurrences')}
                >
                    <View style={[styles.actionIconCircle, { backgroundColor: colors.secondaryContainer }]}>
                        <ClipboardText size={24} color={colors.onSecondaryContainer} weight="duotone" />
                    </View>
                    <Text style={[styles.actionLabel, { color: colors.onSurfaceVariant }]}>Ver{'\n'}Todas</Text>
                </TouchableOpacity>

                {isAdmin && (
                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: colors.surface, borderColor: colors.outlineVariant }]}
                        onPress={() => router.push('/(app)/admin')}
                    >
                        <View style={[styles.actionIconCircle, { backgroundColor: colors.surfaceContainerHigh }]}>
                            <GearSix size={24} color={colors.onSurfaceVariant} weight="duotone" />
                        </View>
                        <Text style={[styles.actionLabel, { color: colors.onSurfaceVariant }]}>Administrar</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* VP-specific: Stats by professor */}
            {(isViceDirector || isAdmin) && stats && stats.length > 0 && (
                <>
                    <Text style={[styles.sectionTitle, { color: colors.onBackground }]}>Por Professor</Text>
                    <View style={styles.legendRow}>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: colors.warning }]} />
                            <Text style={[styles.legendLabel, { color: colors.onSurfaceVariant }]}>Pendentes</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: colors.error }]} />
                            <Text style={[styles.legendLabel, { color: colors.onSurfaceVariant }]}>Escaladas</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
                            <Text style={[styles.legendLabel, { color: colors.onSurfaceVariant }]}>Concluídas</Text>
                        </View>
                    </View>
                    {stats.map((stat: any) => (
                        <View key={stat.author_id} style={[styles.professorRow, { backgroundColor: colors.surface }]}>
                            <Text style={[styles.professorName, { color: colors.onSurface }]}>{stat.author_name}</Text>
                            <View style={styles.professorStats}>
                                <View style={[styles.miniStat, { backgroundColor: colors.warningContainer }]}>
                                    <Text style={[styles.miniStatText, { color: colors.onWarningContainer }]}>
                                        {stat.pending}
                                    </Text>
                                </View>
                                <View style={[styles.miniStat, { backgroundColor: colors.errorContainer }]}>
                                    <Text style={[styles.miniStatText, { color: colors.onErrorContainer }]}>
                                        {stat.escalated}
                                    </Text>
                                </View>
                                <View style={[styles.miniStat, { backgroundColor: colors.successContainer }]}>
                                    <Text style={[styles.miniStatText, { color: colors.onSuccessContainer }]}>
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
    },
    content: {
        padding: 20,
        paddingBottom: 40,
    },
    welcomeCard: {
        borderRadius: 20,
        padding: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 28,
        borderWidth: 1,
    },
    welcomeContent: {
        flex: 1,
    },
    welcomeGreeting: {
        ...typography.bodyMedium,
    },
    welcomeName: {
        ...typography.headlineLarge,
        fontWeight: '800',
        marginTop: 2,
    },
    roleBadge: {
        marginTop: 8,
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    roleText: {
        ...typography.labelSmall,
        fontWeight: '600',
    },
    headerActions: {
        gap: 8,
        alignItems: 'center',
    },
    iconBtn: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sectionTitle: {
        ...typography.titleMedium,
        fontWeight: '700',
        marginBottom: 12,
    },
    statsGrid: {
        gap: 10,
        marginBottom: 28,
    },
    statCard: {
        borderRadius: 14,
        padding: 16,
        borderLeftWidth: 4,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    statLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    statIconCircle: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statNumber: {
        fontSize: 28,
        fontWeight: '800',
    },
    statLabel: {
        ...typography.bodySmall,
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
        borderRadius: 14,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
        minHeight: 90,
        justifyContent: 'center',
    },
    actionIconCircle: {
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    actionLabel: {
        ...typography.labelSmall,
        fontWeight: '600',
        textAlign: 'center',
    },
    legendRow: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 12,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    legendDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    legendLabel: {
        ...typography.bodySmall,
    },
    professorRow: {
        borderRadius: 12,
        padding: 14,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    professorName: {
        ...typography.bodyMedium,
        fontWeight: '600',
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
        ...typography.labelMedium,
        fontWeight: '700',
    },
});
