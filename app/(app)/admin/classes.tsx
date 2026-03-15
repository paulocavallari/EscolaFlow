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
import { Buildings, Plus, Trash, CaretRight } from 'phosphor-react-native';
import { useClassesList, useCreateClass, useUpdateClass, useDeleteClass } from '../../../src/hooks/useStudents';
import { Class } from '../../../src/types/database';
import { useTheme, typography } from '../../../src/lib/theme';

export default function ClassesScreen() {
    const { colors } = useTheme();
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
            style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.outlineVariant }]}
            onPress={() => openEdit(item)}
            activeOpacity={0.7}
        >
            <View style={[styles.cardIcon, { backgroundColor: colors.secondaryContainer }]}>
                <Buildings size={22} color={colors.onSecondaryContainer} weight="duotone" />
            </View>
            <View style={styles.cardContent}>
                <Text style={[styles.cardTitle, { color: colors.onSurface }]}>{item.name}</Text>
                <Text style={[styles.cardSubtitle, { color: colors.onSurfaceVariant }]}>Ano: {item.year}</Text>
            </View>
            <CaretRight size={20} color={colors.onSurfaceVariant} />
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <FlatList
                data={classes}
                keyExtractor={(item) => item.id}
                renderItem={renderClass}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <Text style={[styles.emptyText, { color: colors.onSurfaceVariant }]}>Nenhuma turma cadastrada.</Text>
                }
            />

            {/* FAB */}
            <TouchableOpacity
                style={[styles.fab, { backgroundColor: colors.primary }]}
                onPress={openCreate}
                activeOpacity={0.8}
            >
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
                            {editingClass ? 'Editar Turma' : 'Nova Turma'}
                        </Text>
                        <TouchableOpacity onPress={handleSave}>
                            <Text style={[styles.modalSave, { color: colors.primary }]}>Salvar</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.modalContent}>
                        <Text style={[styles.fieldLabel, { color: colors.onSurfaceVariant }]}>Nome da Turma</Text>
                        <TextInput
                            style={[styles.fieldInput, { backgroundColor: colors.surface, color: colors.onSurface, borderColor: colors.outline }]}
                            value={className}
                            onChangeText={setClassName}
                            placeholder="Ex: 3º Ano A"
                            placeholderTextColor={colors.onSurfaceVariant}
                        />

                        <Text style={[styles.fieldLabel, { color: colors.onSurfaceVariant }]}>Ano Letivo</Text>
                        <TextInput
                            style={[styles.fieldInput, { backgroundColor: colors.surface, color: colors.onSurface, borderColor: colors.outline }]}
                            value={classYear}
                            onChangeText={setClassYear}
                            placeholder="2026"
                            placeholderTextColor={colors.onSurfaceVariant}
                            keyboardType="numeric"
                        />

                        {editingClass && (
                            <TouchableOpacity
                                style={[styles.deleteButton, { backgroundColor: colors.errorContainer }]}
                                onPress={handleDelete}
                            >
                                <Trash size={18} color={colors.onErrorContainer} weight="bold" />
                                <Text style={[styles.deleteButtonText, { color: colors.onErrorContainer }]}>Desativar Turma</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    listContent: { padding: 16, paddingBottom: 100 },
    card: {
        borderRadius: 14,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        borderWidth: 1,
    },
    cardIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    cardContent: { flex: 1 },
    cardTitle: { ...typography.titleMedium, fontWeight: '600' },
    cardSubtitle: { ...typography.bodySmall, marginTop: 2 },
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
