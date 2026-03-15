// app/(app)/admin/tutors.tsx
// Tutor assignment screen

import React, { useState } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    Alert,
} from 'react-native';
import { X, Check, CaretUp, CaretDown } from 'phosphor-react-native';
import { useStudentsList, useTutorsList, useUpdateStudent } from '../../../src/hooks/useStudents';
import { useClassesList } from '../../../src/hooks/useStudents';
import { StudentWithRelations, Profile } from '../../../src/types/database';
import { useTheme, typography } from '../../../src/lib/theme';

export default function TutorsScreen() {
    const { colors } = useTheme();
    const { data: classes } = useClassesList();
    const { data: tutors } = useTutorsList();

    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const { data: students } = useStudentsList(selectedClassId || undefined);
    const updateStudent = useUpdateStudent();

    const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);

    const handleAssignTutor = async (studentId: string, studentName: string, tutor: Profile) => {
        try {
            await updateStudent.mutateAsync({
                id: studentId,
                tutor_id: tutor.id,
            });
            Alert.alert('Sucesso', `Tutor "${tutor.full_name}" atribuído a "${studentName}".`);
            setExpandedStudentId(null);
        } catch (err) {
            Alert.alert('Erro', 'Falha ao atribuir tutor.');
        }
    };

    const handleRemoveTutor = async (studentId: string) => {
        try {
            await updateStudent.mutateAsync({
                id: studentId,
                tutor_id: null,
            });
            Alert.alert('Sucesso', 'Tutor removido.');
        } catch (err) {
            Alert.alert('Erro', 'Falha ao remover tutor.');
        }
    };

    const renderStudent = ({ item }: { item: StudentWithRelations }) => {
        const isExpanded = expandedStudentId === item.id;

        return (
            <View style={[styles.studentCard, { backgroundColor: colors.surface, borderColor: colors.outlineVariant }]}>
                <TouchableOpacity
                    style={styles.studentHeader}
                    onPress={() => setExpandedStudentId(isExpanded ? null : item.id)}
                >
                    <View style={styles.studentInfo}>
                        <Text style={[styles.studentName, { color: colors.onSurface }]}>{item.name}</Text>
                        <Text style={[styles.studentClass, { color: colors.onSurfaceVariant }]}>{item.class?.name ?? ''}</Text>
                    </View>
                    <View style={styles.tutorStatus}>
                        {item.tutor ? (
                            <View style={[styles.tutorBadge, { backgroundColor: colors.successContainer }]}>
                                <Text style={[styles.tutorName, { color: colors.onSuccessContainer }]}>{item.tutor.full_name}</Text>
                            </View>
                        ) : (
                            <View style={[styles.noTutorBadge, { backgroundColor: colors.warningContainer }]}>
                                <Text style={[styles.noTutorText, { color: colors.onWarningContainer }]}>Sem tutor</Text>
                            </View>
                        )}
                        {isExpanded
                            ? <CaretUp size={14} color={colors.onSurfaceVariant} />
                            : <CaretDown size={14} color={colors.onSurfaceVariant} />}
                    </View>
                </TouchableOpacity>

                {isExpanded && (
                    <View style={[styles.tutorList, { borderTopColor: colors.outlineVariant }]}>
                        <Text style={[styles.tutorListTitle, { color: colors.onSurfaceVariant }]}>Selecionar Tutor:</Text>
                        {item.tutor_id && (
                            <TouchableOpacity
                                style={[styles.removeTutorBtn, { backgroundColor: colors.errorContainer }]}
                                onPress={() => handleRemoveTutor(item.id)}
                            >
                                <X size={14} color={colors.onErrorContainer} weight="bold" />
                                <Text style={[styles.removeTutorText, { color: colors.onErrorContainer }]}>Remover tutor atual</Text>
                            </TouchableOpacity>
                        )}
                        {tutors?.map((tutor) => (
                            <TouchableOpacity
                                key={tutor.id}
                                style={[
                                    styles.tutorOption,
                                    { backgroundColor: colors.surfaceContainerLow },
                                    item.tutor_id === tutor.id && { backgroundColor: colors.primaryContainer, borderWidth: 1, borderColor: colors.primary + '40' },
                                ]}
                                onPress={() => handleAssignTutor(item.id, item.name, tutor)}
                            >
                                <Text
                                    style={[
                                        styles.tutorOptionText,
                                        { color: colors.onSurface },
                                        item.tutor_id === tutor.id && { fontWeight: '600', color: colors.onPrimaryContainer },
                                    ]}
                                >
                                    {tutor.full_name}
                                </Text>
                                {item.tutor_id === tutor.id && (
                                    <Check size={18} color={colors.primary} weight="bold" />
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Class filter */}
            <View style={styles.filterRow}>
                <TouchableOpacity
                    style={[styles.filterChip, { backgroundColor: colors.surface }, !selectedClassId && { backgroundColor: colors.primary }]}
                    onPress={() => setSelectedClassId('')}
                >
                    <Text style={[styles.filterText, { color: colors.onSurfaceVariant }, !selectedClassId && { color: colors.onPrimary }]}>
                        Todas
                    </Text>
                </TouchableOpacity>
                {classes?.map((cls) => (
                    <TouchableOpacity
                        key={cls.id}
                        style={[styles.filterChip, { backgroundColor: colors.surface }, selectedClassId === cls.id && { backgroundColor: colors.primary }]}
                        onPress={() => setSelectedClassId(cls.id)}
                    >
                        <Text style={[styles.filterText, { color: colors.onSurfaceVariant }, selectedClassId === cls.id && { color: colors.onPrimary }]}>
                            {cls.name}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <FlatList
                data={students}
                keyExtractor={(item) => item.id}
                renderItem={renderStudent}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <Text style={[styles.emptyText, { color: colors.onSurfaceVariant }]}>Nenhum aluno nesta turma.</Text>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    filterRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        padding: 16,
        gap: 8,
    },
    filterChip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
    },
    filterText: { ...typography.labelMedium, fontWeight: '600' },
    listContent: { padding: 16, paddingTop: 0, paddingBottom: 40 },
    studentCard: {
        borderRadius: 14,
        marginBottom: 8,
        borderWidth: 1,
        overflow: 'hidden',
    },
    studentHeader: {
        padding: 14,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    studentInfo: { flex: 1 },
    studentName: { ...typography.bodyLarge, fontWeight: '600' },
    studentClass: { ...typography.bodySmall, marginTop: 2 },
    tutorStatus: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    tutorBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    tutorName: { ...typography.labelSmall, fontWeight: '600' },
    noTutorBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    noTutorText: { ...typography.labelSmall, fontWeight: '600' },
    tutorList: {
        padding: 14,
        paddingTop: 0,
        borderTopWidth: 1,
    },
    tutorListTitle: {
        ...typography.labelMedium,
        fontWeight: '600',
        marginBottom: 8,
        marginTop: 10,
    },
    removeTutorBtn: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        marginBottom: 8,
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    removeTutorText: { ...typography.bodySmall, fontWeight: '500' },
    tutorOption: {
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 10,
        marginBottom: 6,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    tutorOptionText: { ...typography.bodyMedium },
    emptyText: {
        textAlign: 'center',
        marginTop: 40,
        ...typography.bodyMedium,
    },
});
