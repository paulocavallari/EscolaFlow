// app/(app)/occurrences/index.tsx
// Occurrence list with status filter tabs and counts

import React, { useState, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    RefreshControl,
    ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { router } from 'expo-router';
import { NotePencil, Tray } from 'phosphor-react-native';
import { useOccurrencesList } from '../../../src/hooks/useOccurrences';
import { OccurrenceCard } from '../../../src/components/OccurrenceCard';
import { OccurrenceStatus, OccurrenceWithRelations } from '../../../src/types/database';
import { useTheme, typography } from '../../../src/lib/theme';

type FilterTab = 'all' | OccurrenceStatus;

const TAB_DEFS: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'Todas' },
    { key: OccurrenceStatus.PENDING_TUTOR, label: 'Pendentes' },
    { key: OccurrenceStatus.ESCALATED_VP, label: 'Escaladas' },
    { key: OccurrenceStatus.CONCLUDED, label: 'Concluídas' },
];

export default function OccurrenceListScreen() {
    const { colors } = useTheme();
    const { filter } = useLocalSearchParams<{ filter?: string }>();
    const [activeTab, setActiveTab] = useState<FilterTab>('all');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const statusFilter = activeTab === 'all' ? undefined : activeTab;

    // Apply filter from dashboard navigation (e.g. clicking stat cards)
    useEffect(() => {
        if (filter && TAB_DEFS.some((t) => t.key === filter)) {
            setActiveTab(filter as FilterTab);
        }
    }, [filter]);

    const { data: allOccurrences, isLoading, refetch } = useOccurrencesList();

    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        await refetch();
        setIsRefreshing(false);
    }, [refetch]);

    // Filter client-side for counts without extra queries
    const filteredOccurrences = (allOccurrences ?? []).filter(
        (o) => activeTab === 'all' || o.status === activeTab
    );

    const getCounts = (key: FilterTab) => {
        if (!allOccurrences) return 0;
        if (key === 'all') return allOccurrences.length;
        return allOccurrences.filter((o) => o.status === key).length;
    };

    const TABS = TAB_DEFS.map((t) => ({ ...t, count: getCounts(t.key) }));

    const renderOccurrence = ({ item }: { item: OccurrenceWithRelations }) => (
        <OccurrenceCard
            occurrence={item}
            onPress={() => router.push(`/(app)/occurrences/${item.id}`)}
        />
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Filter Tabs */}
            <View style={styles.tabBar}>
                {TABS.map((tab) => (
                    <TouchableOpacity
                        key={tab.key}
                        style={[
                            styles.tab,
                            { backgroundColor: colors.surfaceVariant },
                            activeTab === tab.key && { backgroundColor: colors.primary },
                        ]}
                        onPress={() => setActiveTab(tab.key)}
                    >
                        <Text
                            style={[
                                styles.tabText,
                                { color: colors.onSurfaceVariant },
                                activeTab === tab.key && { color: colors.onPrimary },
                            ]}
                        >
                            {tab.label}
                        </Text>
                        {tab.count > 0 && (
                            <View style={[
                                styles.tabBadge,
                                { backgroundColor: colors.surfaceVariant },
                                activeTab === tab.key && { backgroundColor: 'rgba(255,255,255,0.25)' },
                            ]}>
                                <Text style={[
                                    styles.tabBadgeText,
                                    { color: colors.onSurfaceVariant },
                                    activeTab === tab.key && { color: colors.onPrimary },
                                ]}>
                                    {tab.count}
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>
                ))}
            </View>

            {/* Occurrence List */}
            {isLoading && !allOccurrences ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={[styles.loadingText, { color: colors.onSurfaceVariant }]}>Carregando ocorrências...</Text>
                </View>
            ) : (
                <FlatList
                    data={filteredOccurrences}
                    keyExtractor={(item) => item.id}
                    renderItem={renderOccurrence}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefreshing}
                            onRefresh={handleRefresh}
                            tintColor={colors.primary}
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <View style={[styles.emptyIconCircle, { backgroundColor: colors.surfaceVariant }]}>
                                <Tray size={40} color={colors.onSurfaceVariant} weight="duotone" />
                            </View>
                            <Text style={[styles.emptyTitle, { color: colors.onSurface }]}>Nenhuma ocorrência</Text>
                            <Text style={[styles.emptySubtext, { color: colors.onSurfaceVariant }]}>
                                {activeTab === 'all'
                                    ? 'Nenhuma ocorrência registrada ainda.'
                                    : 'Nenhuma ocorrência com este status.'}
                            </Text>
                        </View>
                    }
                />
            )}

            {/* FAB: New Occurrence — expanded pill for clarity */}
            <TouchableOpacity
                style={[styles.fab, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
                onPress={() => router.push('/(app)/occurrences/create')}
                activeOpacity={0.8}
            >
                <NotePencil size={22} color={colors.onPrimary} weight="bold" />
                <Text style={[styles.fabText, { color: colors.onPrimary }]}>Nova Ocorrência</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    tabBar: {
        flexDirection: 'row',
        paddingHorizontal: 12,
        paddingVertical: 12,
        gap: 6,
    },
    tab: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 5,
    },
    tabText: {
        ...typography.labelMedium,
    },
    tabBadge: {
        borderRadius: 10,
        paddingHorizontal: 6,
        paddingVertical: 1,
        minWidth: 20,
        alignItems: 'center',
    },
    tabBadgeText: {
        ...typography.labelSmall,
        fontWeight: '700',
    },
    listContent: {
        padding: 16,
        paddingBottom: 120,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    loadingText: {
        ...typography.bodyMedium,
    },
    emptyContainer: {
        alignItems: 'center',
        paddingTop: 60,
    },
    emptyIconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        ...typography.titleMedium,
        marginBottom: 4,
    },
    emptySubtext: {
        ...typography.bodyMedium,
        textAlign: 'center',
        paddingHorizontal: 40,
    },
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 16,
        left: 16,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        gap: 10,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
    },
    fabText: {
        ...typography.labelLarge,
    },
});
