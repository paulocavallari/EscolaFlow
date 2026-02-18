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
import { useStudentsList, useTutorsList, useUpdateStudent } from '../../../src/hooks/useStudents';
import { useClassesList } from '../../../src/hooks/useStudents';
import { StudentWithRelations, Profile } from '../../../src/types/database';
import { COLORS } from '../../../src/lib/constants';

export default function TutorsScreen() {
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
            <View style={styles.studentCard}>
                <TouchableOpacity
                    style={styles.studentHeader}
                    onPress={() => setExpandedStudentId(isExpanded ? null : item.id)}
                >
                    <View style={styles.studentInfo}>
                        <Text style={styles.studentName}>{item.name}</Text>
                        <Text style={styles.studentClass}>{item.class?.name ?? ''}</Text>
                    </View>
                    <View style={styles.tutorStatus}>
                        {item.tutor ? (
                            <View style={styles.tutorBadge}>
                                <Text style={styles.tutorName}>{item.tutor.full_name}</Text>
                            </View>
                        ) : (
                            <View style={styles.noTutorBadge}>
                                <Text style={styles.noTutorText}>Sem tutor</Text>
                            </View>
                        )}
                        <Text style={styles.expandArrow}>{isExpanded ? '▲' : '▼'}</Text>
                    </View>
                </TouchableOpacity>

                {isExpanded && (
                    <View style={styles.tutorList}>
                        <Text style={styles.tutorListTitle}>Selecionar Tutor:</Text>
                        {item.tutor_id && (
                            <TouchableOpacity
                                style={styles.removeTutorBtn}
                                onPress={() => handleRemoveTutor(item.id)}
                            >
                                <Text style={styles.removeTutorText}>✕ Remover tutor atual</Text>
                            </TouchableOpacity>
                        )}
                        {tutors?.map((tutor) => (
                            <TouchableOpacity
                                key={tutor.id}
                                style={[
                                    styles.tutorOption,
                                    item.tutor_id === tutor.id && styles.tutorOptionActive,
                                ]}
                                onPress={() => handleAssignTutor(item.id, item.name, tutor)}
                            >
                                <Text
                                    style={[
                                        styles.tutorOptionText,
                                        item.tutor_id === tutor.id && styles.tutorOptionTextActive,
                                    ]}
                                >
                                    {tutor.full_name}
                                </Text>
                                {item.tutor_id === tutor.id && (
                                    <Text style={styles.checkMark}>✓</Text>
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* Class filter */}
            <View style={styles.filterRow}>
                <TouchableOpacity
                    style={[styles.filterChip, !selectedClassId && styles.filterChipActive]}
                    onPress={() => setSelectedClassId('')}
                >
                    <Text style={[styles.filterText, !selectedClassId && styles.filterTextActive]}>
                        Todas
                    </Text>
                </TouchableOpacity>
                {classes?.map((cls) => (
                    <TouchableOpacity
                        key={cls.id}
                        style={[styles.filterChip, selectedClassId === cls.id && styles.filterChipActive]}
                        onPress={() => setSelectedClassId(cls.id)}
                    >
                        <Text style={[styles.filterText, selectedClassId === cls.id && styles.filterTextActive]}>
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
                    <Text style={styles.emptyText}>Nenhum aluno nesta turma.</Text>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
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
        backgroundColor: COLORS.surface,
    },
    filterChipActive: { backgroundColor: COLORS.primary },
    filterText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
    filterTextActive: { color: COLORS.white },
    listContent: { padding: 16, paddingTop: 0, paddingBottom: 40 },
    studentCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 14,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: COLORS.border + '20',
        overflow: 'hidden',
    },
    studentHeader: {
        padding: 14,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    studentInfo: { flex: 1 },
    studentName: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
    studentClass: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
    tutorStatus: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    tutorBadge: {
        backgroundColor: COLORS.success + '20',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    tutorName: { fontSize: 12, fontWeight: '600', color: COLORS.success },
    noTutorBadge: {
        backgroundColor: COLORS.warning + '20',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    noTutorText: { fontSize: 12, fontWeight: '600', color: COLORS.warning },
    expandArrow: { fontSize: 10, color: COLORS.textMuted },
    tutorList: {
        padding: 14,
        paddingTop: 0,
        borderTopWidth: 1,
        borderTopColor: COLORS.border + '20',
    },
    tutorListTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.textSecondary,
        marginBottom: 8,
        marginTop: 10,
    },
    removeTutorBtn: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: COLORS.error + '10',
        marginBottom: 8,
        alignSelf: 'flex-start',
    },
    removeTutorText: { fontSize: 12, color: COLORS.error, fontWeight: '500' },
    tutorOption: {
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 10,
        backgroundColor: COLORS.surfaceLight + '50',
        marginBottom: 6,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    tutorOptionActive: {
        backgroundColor: COLORS.primary + '15',
        borderWidth: 1,
        borderColor: COLORS.primary + '40',
    },
    tutorOptionText: { fontSize: 14, color: COLORS.textPrimary },
    tutorOptionTextActive: { fontWeight: '600', color: COLORS.primary },
    checkMark: { fontSize: 16, color: COLORS.primary, fontWeight: '700' },
    emptyText: {
        textAlign: 'center',
        color: COLORS.textSecondary,
        marginTop: 40,
        fontSize: 15,
    },
});
