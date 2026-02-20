// app/(app)/admin/classes.tsx
// Class management screen (CRUD)

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
    Platform,
} from 'react-native';
import { useClassesList, useCreateClass, useUpdateClass, useDeleteClass } from '../../../src/hooks/useStudents';
import { Class } from '../../../src/types/database';
import { COLORS } from '../../../src/lib/constants';

export default function ClassesScreen() {
    const { data: classes, isLoading } = useClassesList();
    const createClass = useCreateClass();
    const updateClass = useUpdateClass();
    const deleteClass = useDeleteClass();

    const [showModal, setShowModal] = useState(false);
    const [editingClass, setEditingClass] = useState<Class | null>(null);
    const [className, setClassName] = useState('');
    const [classYear, setClassYear] = useState(new Date().getFullYear().toString());

    const openCreate = () => {
        setEditingClass(null);
        setClassName('');
        setClassYear(new Date().getFullYear().toString());
        setShowModal(true);
    };

    const openEdit = (cls: Class) => {
        setEditingClass(cls);
        setClassName(cls.name);
        setClassYear(cls.year.toString());
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!className.trim()) {
            Alert.alert('Atenção', 'Informe o nome da turma.');
            return;
        }

        try {
            if (editingClass) {
                await updateClass.mutateAsync({
                    id: editingClass.id,
                    name: className.trim(),
                    year: parseInt(classYear, 10) || new Date().getFullYear(),
                });
                Alert.alert('Sucesso', 'Turma atualizada.');
            } else {
                await createClass.mutateAsync({
                    name: className.trim(),
                    year: parseInt(classYear, 10) || undefined,
                });
                Alert.alert('Sucesso', 'Turma criada.');
            }
            setShowModal(false);
        } catch (err) {
            Alert.alert('Erro', 'Falha ao salvar turma.');
        }
    };

    const handleDelete = async () => {
        if (!editingClass) return;

        const confirmMessage = `Deseja desativar a turma "${editingClass.name}"?`;

        if (Platform.OS === 'web') {
            if (window.confirm(confirmMessage)) {
                try {
                    await deleteClass.mutateAsync(editingClass.id);
                    setShowModal(false);
                    window.alert('Turma desativada.');
                } catch (err) {
                    console.error('Delete Class Error:', err);
                    window.alert('Falha ao desativar turma.');
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
                                await deleteClass.mutateAsync(editingClass.id);
                                setShowModal(false);
                                Alert.alert('Sucesso', 'Turma desativada.');
                            } catch (err) {
                                console.error('Delete Class Error:', err);
                                Alert.alert('Erro', 'Falha ao desativar turma.');
                            }
                        },
                    },
                ]
            );
        }
    };

    const renderClass = ({ item }: { item: Class }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => openEdit(item)}
            activeOpacity={0.7}
        >
            <View style={styles.cardIcon}>
                <Text style={styles.iconText}>🏫</Text>
            </View>
            <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardSubtitle}>Ano: {item.year}</Text>
            </View>
            <Text style={styles.editArrow}>›</Text>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <FlatList
                data={classes}
                keyExtractor={(item) => item.id}
                renderItem={renderClass}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <Text style={styles.emptyText}>Nenhuma turma cadastrada.</Text>
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
                            {editingClass ? 'Editar Turma' : 'Nova Turma'}
                        </Text>
                        <TouchableOpacity onPress={handleSave}>
                            <Text style={styles.modalSave}>Salvar</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.modalContent}>
                        <Text style={styles.fieldLabel}>Nome da Turma</Text>
                        <TextInput
                            style={styles.fieldInput}
                            value={className}
                            onChangeText={setClassName}
                            placeholder="Ex: 3º Ano A"
                            placeholderTextColor={COLORS.textMuted}
                        />

                        <Text style={styles.fieldLabel}>Ano Letivo</Text>
                        <TextInput
                            style={styles.fieldInput}
                            value={classYear}
                            onChangeText={setClassYear}
                            placeholder="2026"
                            placeholderTextColor={COLORS.textMuted}
                            keyboardType="numeric"
                        />

                        {editingClass && (
                            <TouchableOpacity
                                style={styles.deleteButton}
                                onPress={handleDelete}
                            >
                                <Text style={styles.deleteButtonText}>🗑️ Desativar Turma</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    listContent: { padding: 16, paddingBottom: 100 },
    card: {
        backgroundColor: COLORS.surface,
        borderRadius: 14,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        borderWidth: 1,
        borderColor: COLORS.border + '20',
    },
    cardIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: COLORS.secondary + '15',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    iconText: { fontSize: 22 },
    cardContent: { flex: 1 },
    cardTitle: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary },
    cardSubtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
    editArrow: { fontSize: 22, color: COLORS.textMuted, fontWeight: '300' },
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
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
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
    deleteButton: {
        marginTop: 32,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: COLORS.error + '15',
        alignItems: 'center',
    },
    deleteButtonText: { fontSize: 15, fontWeight: '600', color: COLORS.error },
});
