// app/(app)/admin/index.tsx
// Admin panel hub with navigation to sub-sections

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { COLORS } from '../../../src/lib/constants';
import { useProfilesList } from '../../../src/hooks/useStudents';
import { useClassesList, useStudentsList } from '../../../src/hooks/useStudents';

interface AdminCardProps {
    icon: string;
    title: string;
    description: string;
    count?: number;
    onPress: () => void;
}

function AdminCard({ icon, title, description, count, onPress }: AdminCardProps) {
    return (
        <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
            <View style={styles.cardIconContainer}>
                <Text style={styles.cardIcon}>{icon}</Text>
            </View>
            <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{title}</Text>
                <Text style={styles.cardDescription}>{description}</Text>
            </View>
            {count !== undefined && (
                <View style={styles.countBadge}>
                    <Text style={styles.countText}>{count}</Text>
                </View>
            )}
            <Text style={styles.cardArrow}>›</Text>
        </TouchableOpacity>
    );
}

export default function AdminHubScreen() {
    const { data: profiles } = useProfilesList();
    const { data: classes } = useClassesList();
    const { data: students } = useStudentsList();

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <Text style={styles.header}>Painel Administrativo</Text>
            <Text style={styles.subheader}>
                Gerencie usuários, turmas e alunos do sistema.
            </Text>

            <View style={styles.cardList}>
                <AdminCard
                    icon="👥"
                    title="Usuários"
                    description="Gerenciar professores e staff"
                    count={profiles?.length}
                    onPress={() => router.push('/(app)/admin/users')}
                />
                <AdminCard
                    icon="🏫"
                    title="Turmas"
                    description="CRUD de turmas e anos letivos"
                    count={classes?.length}
                    onPress={() => router.push('/(app)/admin/classes')}
                />
                <AdminCard
                    icon="🎓"
                    title="Alunos"
                    description="Gerenciar alunos e importar CSV"
                    count={students?.length}
                    onPress={() => router.push('/(app)/admin/students')}
                />
                <AdminCard
                    icon="📋"
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
        backgroundColor: COLORS.background,
    },
    content: {
        padding: 20,
        paddingBottom: 40,
    },
    header: {
        fontSize: 24,
        fontWeight: '800',
        color: COLORS.textPrimary,
        marginBottom: 4,
    },
    subheader: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginBottom: 24,
    },
    cardList: {
        gap: 12,
    },
    card: {
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        padding: 18,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border + '30',
    },
    cardIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: COLORS.primary + '15',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    cardIcon: {
        fontSize: 24,
    },
    cardContent: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.textPrimary,
    },
    cardDescription: {
        fontSize: 13,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    countBadge: {
        backgroundColor: COLORS.primary + '20',
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 4,
        marginRight: 8,
    },
    countText: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.primary,
    },
    cardArrow: {
        fontSize: 22,
        color: COLORS.textMuted,
        fontWeight: '300',
    },
});
