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
import { useOccurrencesList } from '../../../src/hooks/useOccurrences';
import { OccurrenceCard } from '../../../src/components/OccurrenceCard';
import { OccurrenceStatus, OccurrenceWithRelations } from '../../../src/types/database';
import { COLORS } from '../../../src/lib/constants';

type FilterTab = 'all' | OccurrenceStatus;

const TAB_DEFS: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'Todas' },
    { key: OccurrenceStatus.PENDING_TUTOR, label: 'Pendentes' },
    { key: OccurrenceStatus.ESCALATED_VP, label: 'Escaladas' },
    { key: OccurrenceStatus.CONCLUDED, label: 'Concluídas' },
];

export default function OccurrenceListScreen() {
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
        <View style={styles.container}>
            {/* Filter Tabs */}
            <View style={styles.tabBar}>
                {TABS.map((tab) => (
                    <TouchableOpacity
                        key={tab.key}
                        style={[
                            styles.tab,
                            activeTab === tab.key && styles.tabActive,
                        ]}
                        onPress={() => setActiveTab(tab.key)}
                    >
                        <Text
                            style={[
                                styles.tabText,
                                activeTab === tab.key && styles.tabTextActive,
                            ]}
                        >
                            {tab.label}
                        </Text>
                        {tab.count > 0 && (
                            <View style={[
                                styles.tabBadge,
                                activeTab === tab.key && styles.tabBadgeActive,
                            ]}>
                                <Text style={[
                                    styles.tabBadgeText,
                                    activeTab === tab.key && styles.tabBadgeTextActive,
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
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={styles.loadingText}>Carregando ocorrências...</Text>
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
                            tintColor={COLORS.primary}
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyIcon}>📭</Text>
                            <Text style={styles.emptyTitle}>Nenhuma ocorrência</Text>
                            <Text style={styles.emptySubtext}>
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
                style={styles.fab}
                onPress={() => router.push('/(app)/occurrences/create')}
                activeOpacity={0.8}
            >
                <Text style={styles.fabIcon}>📝</Text>
                <Text style={styles.fabText}>Nova Ocorrência</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
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
        backgroundColor: COLORS.surface,
        gap: 5,
    },
    tabActive: {
        backgroundColor: COLORS.primary,
    },
    tabText: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.textSecondary,
    },
    tabTextActive: {
        color: COLORS.white,
    },
    tabBadge: {
        backgroundColor: COLORS.surfaceLight,
        borderRadius: 10,
        paddingHorizontal: 6,
        paddingVertical: 1,
        minWidth: 20,
        alignItems: 'center',
    },
    tabBadgeActive: {
        backgroundColor: 'rgba(255,255,255,0.25)',
    },
    tabBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: COLORS.textMuted,
    },
    tabBadgeTextActive: {
        color: COLORS.white,
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
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    emptyContainer: {
        alignItems: 'center',
        paddingTop: 60,
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: 12,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: 4,
    },
    emptySubtext: {
        fontSize: 14,
        color: COLORS.textSecondary,
        textAlign: 'center',
        paddingHorizontal: 40,
    },
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 16,
        left: 16,
        borderRadius: 16,
        backgroundColor: COLORS.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        gap: 10,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
    },
    fabIcon: {
        fontSize: 20,
    },
    fabText: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.white,
    },
});
