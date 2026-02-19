// app/(app)/admin/students.tsx
// Student management screen with CSV import

import React, { useState } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    TextInput,
    StyleSheet,
    Alert,
    Modal,
    ScrollView,
} from 'react-native';
import { useStudentsList, useCreateStudent, useUpdateStudent, useDeleteStudent, useClassesList, useTutorsList } from '../../../src/hooks/useStudents';
import { CSVImporter } from '../../../src/components/CSVImporter';
import { Student, StudentWithRelations } from '../../../src/types/database';
import { COLORS } from '../../../src/lib/constants';

export default function StudentsScreen() {
    const { data: students, isLoading } = useStudentsList();
    const { data: classes } = useClassesList();
    const { data: tutors } = useTutorsList();
    const createStudent = useCreateStudent();
    const updateStudent = useUpdateStudent();
    const deleteStudent = useDeleteStudent();

    const [showModal, setShowModal] = useState(false);
    const [showCSV, setShowCSV] = useState(false);
    const [editingStudent, setEditingStudent] = useState<StudentWithRelations | null>(null);
    const [name, setName] = useState('');
    const [matricula, setMatricula] = useState('');
    const [selectedClassId, setSelectedClassId] = useState('');
    const [selectedTutorId, setSelectedTutorId] = useState('');
    const [search, setSearch] = useState('');

    const filteredStudents = students?.filter((s) =>
        s.name.toLowerCase().includes(search.toLowerCase())
    ) ?? [];

    const openCreate = () => {
        setEditingStudent(null);
        setName('');
        setMatricula('');
        setSelectedClassId(classes?.[0]?.id ?? '');
        setSelectedTutorId('');
        setShowModal(true);
    };

    const openEdit = (student: StudentWithRelations) => {
        setEditingStudent(student);
        setName(student.name);
        setMatricula(student.matricula ?? '');
        setSelectedClassId(student.class_id);
        setSelectedTutorId(student.tutor_id ?? '');
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!name.trim() || !selectedClassId) {
            Alert.alert('Atenção', 'Preencha nome e turma.');
            return;
        }

        try {
            if (editingStudent) {
                await updateStudent.mutateAsync({
                    id: editingStudent.id,
                    name: name.trim(),
                    matricula: matricula.trim() || null,
                    class_id: selectedClassId,
                    tutor_id: selectedTutorId || null,
                });
                Alert.alert('Sucesso', 'Aluno atualizado.');
            } else {
                await createStudent.mutateAsync({
                    name: name.trim(),
                    matricula: matricula.trim() || null,
                    class_id: selectedClassId,
                    tutor_id: selectedTutorId || null,
                });
                Alert.alert('Sucesso', 'Aluno criado.');
            }
            setShowModal(false);
        } catch (err) {
            Alert.alert('Erro', 'Falha ao salvar aluno.');
        }
    };

    const handleDelete = () => {
        if (!editingStudent) return;
        Alert.alert(
            'Confirmar exclusão',
            `Deseja desativar o aluno "${editingStudent.name}"?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Desativar',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteStudent.mutateAsync(editingStudent.id);
                            setShowModal(false);
                            Alert.alert('Sucesso', 'Aluno desativado.');
                        } catch (err) {
                            Alert.alert('Erro', 'Falha ao desativar aluno.');
                        }
                    },
                },
            ]
        );
    };

    const renderStudent = ({ item }: { item: StudentWithRelations }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => openEdit(item)}
            activeOpacity={0.7}
        >
            <View style={styles.cardAvatar}>
                <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
            </View>
            <View style={styles.cardContent}>
                <Text style={styles.cardName}>{item.name}</Text>
                <Text style={styles.cardSub}>
                    {item.class?.name ?? 'Sem turma'} • {item.matricula ?? 'Sem matrícula'}
                </Text>
                {item.tutor && (
                    <Text style={styles.cardTutor}>Tutor: {item.tutor.full_name}</Text>
                )}
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {/* Header Actions */}
            <View style={styles.headerActions}>
                <TextInput
                    style={styles.searchInput}
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Buscar aluno..."
                    placeholderTextColor={COLORS.textMuted}
                />
                <TouchableOpacity
                    style={styles.csvButton}
                    onPress={() => setShowCSV(!showCSV)}
                >
                    <Text style={styles.csvButtonText}>📥 CSV</Text>
                </TouchableOpacity>
            </View>

            {/* CSV Importer (toggleable) */}
            {showCSV && (
                <View style={styles.csvContainer}>
                    <CSVImporter />
                </View>
            )}

            <FlatList
                data={filteredStudents}
                keyExtractor={(item) => item.id}
                renderItem={renderStudent}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <Text style={styles.emptyText}>Nenhum aluno encontrado.</Text>
                }
            />

            {/* FAB */}
            <TouchableOpacity style={styles.fab} onPress={openCreate} activeOpacity={0.8}>
                <Text style={styles.fabText}>+</Text>
            </TouchableOpacity>

            {/* Create/Edit Modal */}
            <Modal
                visible={showModal}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowModal(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setShowModal(false)}>
                            <Text style={styles.modalClose}>Cancelar</Text>
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>
                            {editingStudent ? 'Editar Aluno' : 'Novo Aluno'}
                        </Text>
                        <TouchableOpacity onPress={handleSave}>
                            <Text style={styles.modalSave}>Salvar</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalContent}>
                        <Text style={styles.fieldLabel}>Nome</Text>
                        <TextInput
                            style={styles.fieldInput}
                            value={name}
                            onChangeText={setName}
                            placeholder="Nome completo"
                            placeholderTextColor={COLORS.textMuted}
                        />

                        <Text style={styles.fieldLabel}>Matrícula</Text>
                        <TextInput
                            style={styles.fieldInput}
                            value={matricula}
                            onChangeText={setMatricula}
                            placeholder="Código de matrícula"
                            placeholderTextColor={COLORS.textMuted}
                        />

                        <Text style={styles.fieldLabel}>Turma</Text>
                        <View style={styles.selector}>
                            {classes?.map((cls) => (
                                <TouchableOpacity
                                    key={cls.id}
                                    style={[
                                        styles.selectorOption,
                                        selectedClassId === cls.id && styles.selectorOptionActive,
                                    ]}
                                    onPress={() => setSelectedClassId(cls.id)}
                                >
                                    <Text
                                        style={[
                                            styles.selectorText,
                                            selectedClassId === cls.id && styles.selectorTextActive,
                                        ]}
                                    >
                                        {cls.name}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.fieldLabel}>Tutor</Text>
                        <View style={styles.selector}>
                            <TouchableOpacity
                                style={[
                                    styles.selectorOption,
                                    !selectedTutorId && styles.selectorOptionActive,
                                ]}
                                onPress={() => setSelectedTutorId('')}
                            >
                                <Text
                                    style={[
                                        styles.selectorText,
                                        !selectedTutorId && styles.selectorTextActive,
                                    ]}
                                >
                                    Sem tutor
                                </Text>
                            </TouchableOpacity>
                            {tutors?.map((tutor) => (
                                <TouchableOpacity
                                    key={tutor.id}
                                    style={[
                                        styles.selectorOption,
                                        selectedTutorId === tutor.id && styles.selectorOptionActive,
                                    ]}
                                    onPress={() => setSelectedTutorId(tutor.id)}
                                >
                                    <Text
                                        style={[
                                            styles.selectorText,
                                            selectedTutorId === tutor.id && styles.selectorTextActive,
                                        ]}
                                    >
                                        {tutor.full_name}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {editingStudent && (
                            <TouchableOpacity
                                style={styles.deleteButton}
                                onPress={handleDelete}
                            >
                                <Text style={styles.deleteButtonText}>🗑️ Desativar Aluno</Text>
                            </TouchableOpacity>
                        )}
                    </ScrollView>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    headerActions: {
        flexDirection: 'row',
        padding: 16,
        gap: 8,
    },
    searchInput: {
        flex: 1,
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 15,
        color: COLORS.textPrimary,
        borderWidth: 1,
        borderColor: COLORS.border + '40',
    },
    csvButton: {
        backgroundColor: COLORS.secondary,
        borderRadius: 12,
        paddingHorizontal: 16,
        justifyContent: 'center',
    },
    csvButtonText: { fontSize: 14, fontWeight: '600', color: COLORS.white },
    csvContainer: {
        marginHorizontal: 16,
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: COLORS.border + '30',
    },
    listContent: { padding: 16, paddingTop: 0, paddingBottom: 100 },
    card: {
        backgroundColor: COLORS.surface,
        borderRadius: 14,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        borderWidth: 1,
        borderColor: COLORS.border + '20',
    },
    cardAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.accent + '20',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    avatarText: { fontSize: 16, fontWeight: '700', color: COLORS.accent },
    cardContent: { flex: 1 },
    cardName: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
    cardSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
    cardTutor: { fontSize: 11, color: COLORS.primary, marginTop: 2, fontWeight: '500' },
    emptyText: {
        textAlign: 'center',
        color: COLORS.textSecondary,
        marginTop: 40,
        fontSize: 15,
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
        elevation: 8,
    },
    fabText: { fontSize: 28, color: COLORS.white, fontWeight: '300', marginTop: -2 },
    modalContainer: { flex: 1, backgroundColor: COLORS.background },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    modalClose: { fontSize: 15, color: COLORS.textSecondary },
    modalTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary },
    modalSave: { fontSize: 15, fontWeight: '600', color: COLORS.primary },
    modalContent: { padding: 20 },
    fieldLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.textSecondary,
        marginBottom: 6,
        marginTop: 16,
    },
    fieldInput: {
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 15,
        color: COLORS.textPrimary,
        borderWidth: 1,
        borderColor: COLORS.border + '40',
    },
    selector: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
    selectorOption: {
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 10,
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border + '40',
    },
    selectorOptionActive: {
        borderColor: COLORS.primary,
        backgroundColor: COLORS.primary + '10',
    },
    selectorText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
    selectorTextActive: { color: COLORS.primary },
    deleteButton: {
        marginTop: 32,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: COLORS.error + '15',
        alignItems: 'center',
    },
    deleteButtonText: { fontSize: 15, fontWeight: '600', color: COLORS.error },
});
