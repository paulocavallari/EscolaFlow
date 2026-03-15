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
    Platform,
} from 'react-native';
import { MagnifyingGlass, DownloadSimple, Plus, Trash, CaretRight } from 'phosphor-react-native';
import { useStudentsList, useCreateStudent, useUpdateStudent, useDeleteStudent, useClassesList, useTutorsList } from '../../../src/hooks/useStudents';
import { CSVImporter } from '../../../src/components/CSVImporter';
import { Student, StudentWithRelations } from '../../../src/types/database';
import { useTheme, typography } from '../../../src/lib/theme';

export default function StudentsScreen() {
    const { colors } = useTheme();
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
    const [guardianPhone, setGuardianPhone] = useState('');
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
        setGuardianPhone(student.guardian_phone ?? '');
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
                    guardian_phone: guardianPhone.trim() || null,
                });
                Alert.alert('Sucesso', 'Aluno atualizado.');
            } else {
                await createStudent.mutateAsync({
                    name: name.trim(),
                    matricula: matricula.trim() || null,
                    class_id: selectedClassId,
                    tutor_id: selectedTutorId || null,
                    guardian_phone: guardianPhone.trim() || null,
                });
                Alert.alert('Sucesso', 'Aluno criado.');
            }
            setShowModal(false);
        } catch (err) {
            Alert.alert('Erro', 'Falha ao salvar aluno.');
        }
    };

    const handleDelete = async () => {
        if (!editingStudent) return;

        const confirmMessage = `Deseja desativar o aluno "${editingStudent.name}"?`;

        if (Platform.OS === 'web') {
            if (window.confirm(confirmMessage)) {
                try {
                    await deleteStudent.mutateAsync(editingStudent.id);
                    setShowModal(false);
                    window.alert('Aluno desativado.');
                } catch (err) {
                    console.error('Delete Student Error:', err);
                    window.alert('Falha ao desativar aluno.');
                }
            }
        } else {
            Alert.alert(
                'Confirmar exclusão',
                confirmMessage,
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
                                console.error('Delete Student Error:', err);
                                Alert.alert('Erro', 'Falha ao desativar aluno.');
                            }
                        },
                    },
                ]
            );
        }
    };

    const renderStudent = ({ item }: { item: StudentWithRelations }) => (
        <TouchableOpacity
            style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.outlineVariant }]}
            onPress={() => openEdit(item)}
            activeOpacity={0.7}
        >
            <View style={[styles.cardAvatar, { backgroundColor: colors.secondaryContainer }]}>
                <Text style={[styles.avatarText, { color: colors.onSecondaryContainer }]}>{item.name.charAt(0)}</Text>
            </View>
            <View style={styles.cardContent}>
                <Text style={[styles.cardName, { color: colors.onSurface }]}>{item.name}</Text>
                <Text style={[styles.cardSub, { color: colors.onSurfaceVariant }]}>
                    {item.class?.name ?? 'Sem turma'} • {item.matricula ?? 'Sem RA'}
                    {item.guardian_phone ? ` • WhatsApp Pai: ${item.guardian_phone}` : ''}
                </Text>
                {item.tutor && (
                    <Text style={[styles.cardTutor, { color: colors.primary }]}>Tutor: {item.tutor.full_name}</Text>
                )}
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header Actions */}
            <View style={styles.headerActions}>
                <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.outline }]}>
                    <MagnifyingGlass size={18} color={colors.onSurfaceVariant} />
                    <TextInput
                        style={[styles.searchInput, { color: colors.onSurface }]}
                        value={search}
                        onChangeText={setSearch}
                        placeholder="Buscar aluno..."
                        placeholderTextColor={colors.onSurfaceVariant}
                    />
                </View>
                <TouchableOpacity
                    style={[styles.csvButton, { backgroundColor: colors.secondary }]}
                    onPress={() => setShowCSV(!showCSV)}
                >
                    <DownloadSimple size={18} color={colors.onSecondary} weight="bold" />
                    <Text style={[styles.csvButtonText, { color: colors.onSecondary }]}>CSV</Text>
                </TouchableOpacity>
            </View>

            {/* CSV Importer (toggleable) */}
            {showCSV && (
                <View style={[styles.csvContainer, { backgroundColor: colors.surface, borderColor: colors.outlineVariant }]}>
                    <CSVImporter />
                </View>
            )}

            <FlatList
                data={filteredStudents}
                keyExtractor={(item) => item.id}
                renderItem={renderStudent}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <Text style={[styles.emptyText, { color: colors.onSurfaceVariant }]}>Nenhum aluno encontrado.</Text>
                }
            />

            {/* FAB */}
            <TouchableOpacity style={[styles.fab, { backgroundColor: colors.primary }]} onPress={openCreate} activeOpacity={0.8}>
                <Plus size={24} color={colors.onPrimary} weight="bold" />
            </TouchableOpacity>

            {/* Create/Edit Modal */}
            <Modal
                visible={showModal}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowModal(false)}
            >
                <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
                    <View style={[styles.modalHeader, { borderBottomColor: colors.outlineVariant }]}>
                        <TouchableOpacity onPress={() => setShowModal(false)}>
                            <Text style={[styles.modalClose, { color: colors.onSurfaceVariant }]}>Cancelar</Text>
                        </TouchableOpacity>
                        <Text style={[styles.modalTitle, { color: colors.onSurface }]}>
                            {editingStudent ? 'Editar Aluno' : 'Novo Aluno'}
                        </Text>
                        <TouchableOpacity onPress={handleSave}>
                            <Text style={[styles.modalSave, { color: colors.primary }]}>Salvar</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalContent}>
                        <Text style={[styles.fieldLabel, { color: colors.onSurfaceVariant }]}>Nome</Text>
                        <TextInput
                            style={[styles.fieldInput, { backgroundColor: colors.surface, color: colors.onSurface, borderColor: colors.outline }]}
                            value={name}
                            onChangeText={setName}
                            placeholder="Nome completo"
                            placeholderTextColor={colors.onSurfaceVariant}
                        />

                        <Text style={[styles.fieldLabel, { color: colors.onSurfaceVariant }]}>Matrícula</Text>
                        <TextInput
                            style={[styles.fieldInput, { backgroundColor: colors.surface, color: colors.onSurface, borderColor: colors.outline }]}
                            value={matricula}
                            onChangeText={setMatricula}
                            placeholder="Código de matrícula"
                            placeholderTextColor={colors.onSurfaceVariant}
                        />

                        <Text style={[styles.fieldLabel, { color: colors.onSurfaceVariant }]}>WhatsApp Responsável (Notificação)</Text>
                        <TextInput
                            style={[styles.fieldInput, { backgroundColor: colors.surface, color: colors.onSurface, borderColor: colors.outline }]}
                            value={guardianPhone}
                            onChangeText={setGuardianPhone}
                            placeholder="5511999999999 (Código DDD)"
                            placeholderTextColor={colors.onSurfaceVariant}
                            keyboardType="phone-pad"
                        />

                        <Text style={[styles.fieldLabel, { color: colors.onSurfaceVariant }]}>Turma</Text>
                        <View style={styles.selector}>
                            {classes?.map((cls) => (
                                <TouchableOpacity
                                    key={cls.id}
                                    style={[
                                        styles.selectorOption,
                                        { backgroundColor: colors.surface, borderColor: colors.outline },
                                        selectedClassId === cls.id && { borderColor: colors.primary, backgroundColor: colors.primary + '10' },
                                    ]}
                                    onPress={() => setSelectedClassId(cls.id)}
                                >
                                    <Text
                                        style={[
                                            styles.selectorText,
                                            { color: colors.onSurfaceVariant },
                                            selectedClassId === cls.id && { color: colors.primary },
                                        ]}
                                    >
                                        {cls.name}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={[styles.fieldLabel, { color: colors.onSurfaceVariant }]}>Tutor</Text>
                        <View style={styles.selector}>
                            <TouchableOpacity
                                style={[
                                    styles.selectorOption,
                                    { backgroundColor: colors.surface, borderColor: colors.outline },
                                    !selectedTutorId && { borderColor: colors.primary, backgroundColor: colors.primary + '10' },
                                ]}
                                onPress={() => setSelectedTutorId('')}
                            >
                                <Text
                                    style={[
                                        styles.selectorText,
                                        { color: colors.onSurfaceVariant },
                                        !selectedTutorId && { color: colors.primary },
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
                                        { backgroundColor: colors.surface, borderColor: colors.outline },
                                        selectedTutorId === tutor.id && { borderColor: colors.primary, backgroundColor: colors.primary + '10' },
                                    ]}
                                    onPress={() => setSelectedTutorId(tutor.id)}
                                >
                                    <Text
                                        style={[
                                            styles.selectorText,
                                            { color: colors.onSurfaceVariant },
                                            selectedTutorId === tutor.id && { color: colors.primary },
                                        ]}
                                    >
                                        {tutor.full_name}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {editingStudent && (
                            <TouchableOpacity
                                style={[styles.deleteButton, { backgroundColor: colors.errorContainer }]}
                                onPress={handleDelete}
                            >
                                <Trash size={18} color={colors.onErrorContainer} weight="bold" />
                                <Text style={[styles.deleteButtonText, { color: colors.onErrorContainer }]}>Desativar Aluno</Text>
                            </TouchableOpacity>
                        )}
                    </ScrollView>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    headerActions: {
        flexDirection: 'row',
        padding: 16,
        gap: 8,
    },
    searchContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        paddingHorizontal: 14,
        borderWidth: 1,
        gap: 8,
    },
    searchInput: {
        flex: 1,
        paddingVertical: 12,
        ...typography.bodyMedium,
    },
    csvButton: {
        borderRadius: 12,
        paddingHorizontal: 16,
        justifyContent: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    csvButtonText: { ...typography.labelLarge, fontWeight: '600' },
    csvContainer: {
        marginHorizontal: 16,
        borderRadius: 16,
        marginBottom: 16,
        borderWidth: 1,
    },
    listContent: { padding: 16, paddingTop: 0, paddingBottom: 100 },
    card: {
        borderRadius: 14,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        borderWidth: 1,
    },
    cardAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    avatarText: { ...typography.titleMedium, fontWeight: '700' },
    cardContent: { flex: 1 },
    cardName: { ...typography.bodyLarge, fontWeight: '600' },
    cardSub: { ...typography.bodySmall, marginTop: 2 },
    cardTutor: { ...typography.labelSmall, marginTop: 2, fontWeight: '500' },
    emptyText: {
        textAlign: 'center',
        marginTop: 40,
        ...typography.bodyMedium,
    },
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
    },
    modalContainer: { flex: 1 },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
    },
    modalClose: { ...typography.bodyMedium },
    modalTitle: { ...typography.titleMedium, fontWeight: '700' },
    modalSave: { ...typography.bodyMedium, fontWeight: '600' },
    modalContent: { padding: 20 },
    fieldLabel: {
        ...typography.labelLarge,
        fontWeight: '600',
        marginBottom: 6,
        marginTop: 16,
    },
    fieldInput: {
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        ...typography.bodyMedium,
        borderWidth: 1,
    },
    selector: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
    selectorOption: {
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 10,
        borderWidth: 1,
    },
    selectorText: { ...typography.bodySmall, fontWeight: '500' },
    deleteButton: {
        marginTop: 32,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
    },
    deleteButtonText: { ...typography.bodyMedium, fontWeight: '600' },
});
