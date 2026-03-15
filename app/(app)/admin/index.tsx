// app/(app)/admin/index.tsx
// Admin panel hub with navigation to sub-sections

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Users, Buildings, Student, ClipboardText, CaretRight } from 'phosphor-react-native';
import { useProfilesList, useClassesList, useStudentsList } from '../../../src/hooks/useStudents';
import { useTheme, typography } from '../../../src/lib/theme';
import type { Icon } from 'phosphor-react-native';

interface AdminCardProps {
    IconComponent: Icon;
    title: string;
    description: string;
    count?: number;
    onPress: () => void;
}

function AdminCard({ IconComponent, title, description, count, onPress }: AdminCardProps) {
    const { colors } = useTheme();

    return (
        <TouchableOpacity
            style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.outlineVariant }]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={[styles.cardIconContainer, { backgroundColor: colors.primaryContainer }]}>
                <IconComponent size={24} color={colors.onPrimaryContainer} weight="duotone" />
            </View>
            <View style={styles.cardContent}>
                <Text style={[styles.cardTitle, { color: colors.onSurface }]}>{title}</Text>
                <Text style={[styles.cardDescription, { color: colors.onSurfaceVariant }]}>{description}</Text>
            </View>
            {count !== undefined && (
                <View style={[styles.countBadge, { backgroundColor: colors.primaryContainer }]}>
                    <Text style={[styles.countText, { color: colors.onPrimaryContainer }]}>{count}</Text>
                </View>
            )}
            <CaretRight size={20} color={colors.onSurfaceVariant} />
        </TouchableOpacity>
    );
}

export default function AdminHubScreen() {
    const { colors } = useTheme();
    const { data: profiles } = useProfilesList();
    const { data: classes } = useClassesList();
    const { data: students } = useStudentsList();

    return (
        <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
            <Text style={[styles.header, { color: colors.onBackground }]}>Painel Administrativo</Text>
            <Text style={[styles.subheader, { color: colors.onSurfaceVariant }]}>Gerencie usuários, turmas e alunos do sistema.</Text>

            <View style={styles.cardList}>
                <AdminCard
                    IconComponent={Users}
                    title="Usuários"
                    description="Gerenciar professores e staff"
                    count={profiles?.length}
                    onPress={() => router.push('/(app)/admin/users')}
                />
                <AdminCard
                    IconComponent={Buildings}
                    title="Turmas"
                    description="Criar e editar turmas"
                    count={classes?.length}
                    onPress={() => router.push('/(app)/admin/classes')}
                />
                <AdminCard
                    IconComponent={Student}
                    title="Alunos"
                    description="Gerenciar alunos e importar lista CSV"
                    count={students?.length}
                    onPress={() => router.push('/(app)/admin/students')}
                />
                <AdminCard
                    IconComponent={ClipboardText}
                    title="Tutores"
                    description="Atribuir tutores aos alunos"
                    onPress={() => router.push('/(app)/admin/tutors')}
                />
            </View>
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
    header: {
        ...typography.headlineLarge,
        fontWeight: '800',
        marginBottom: 4,
    },
    subheader: {
        ...typography.bodyMedium,
        marginBottom: 24,
    },
    cardList: {
        gap: 12,
    },
    card: {
        borderRadius: 16,
        padding: 18,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        minHeight: 72,
    },
    cardIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    cardContent: {
        flex: 1,
    },
    cardTitle: {
        ...typography.titleMedium,
        fontWeight: '700',
    },
    cardDescription: {
        ...typography.bodySmall,
        marginTop: 2,
    },
    countBadge: {
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 4,
        marginRight: 8,
    },
    countText: {
        ...typography.labelMedium,
        fontWeight: '700',
    },
});
