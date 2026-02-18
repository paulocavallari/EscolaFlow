// app/(app)/occurrences/index.tsx
// Occurrence list with status filter tabs

import React, { useState } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    RefreshControl,
    ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useOccurrencesList } from '../../../src/hooks/useOccurrences';
import { OccurrenceCard } from '../../../src/components/OccurrenceCard';
import { OccurrenceStatus, OccurrenceWithRelations } from '../../../src/types/database';
import { COLORS, STATUS_LABELS } from '../../../src/lib/constants';

type FilterTab = 'all' | OccurrenceStatus;

const TABS: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'Todas' },
    { key: OccurrenceStatus.PENDING_TUTOR, label: 'Pendentes' },
    { key: OccurrenceStatus.ESCALATED_VP, label: 'Escaladas' },
    { key: OccurrenceStatus.CONCLUDED, label: 'Concluídas' },
];

export default function OccurrenceListScreen() {
    const [activeTab, setActiveTab] = useState<FilterTab>('all');
    const statusFilter = activeTab === 'all' ? undefined : activeTab;

    const { data: occurrences, isLoading, refetch } = useOccurrencesList(
        statusFilter ? { status: statusFilter } : undefined
    );

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
                    </TouchableOpacity>
                ))}
            </View>

            {/* Occurrence List */}
            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : (
                <FlatList
                    data={occurrences}
                    keyExtractor={(item) => item.id}
                    renderItem={renderOccurrence}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={isLoading}
                            onRefresh={refetch}
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
                                    : `Nenhuma ocorrência com status "${STATUS_LABELS[activeTab as OccurrenceStatus]}".`}
                            </Text>
                        </View>
                    }
                />
            )}

            {/* FAB: New Occurrence */}
            <TouchableOpacity
                style={styles.fab}
                onPress={() => router.push('/(app)/occurrences/create')}
                activeOpacity={0.8}
            >
                <Text style={styles.fabText}>+</Text>
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
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 8,
    },
    tab: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: COLORS.surface,
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
    listContent: {
        padding: 16,
        paddingBottom: 100,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
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
        right: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
    },
    fabText: {
        fontSize: 28,
        color: COLORS.white,
        fontWeight: '300',
        marginTop: -2,
    },
});
