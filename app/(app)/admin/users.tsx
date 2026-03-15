// app/(app)/admin/users.tsx
// User management screen (CRUD)

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
    ActivityIndicator,
} from 'react-native';
import { MagnifyingGlass, Plus, Trash, UserCircle } from 'phosphor-react-native';
import { useProfilesList } from '../../../src/hooks/useStudents';
import { Profile, UserRole } from '../../../src/types/database';
import { ROLE_LABELS, ROLE_COLORS } from '../../../src/lib/constants';
import { useTheme, typography } from '../../../src/lib/theme';
import { supabase } from '../../../src/lib/supabase';

export default function UsersScreen() {
    const { colors } = useTheme();
    const { data: profiles, isLoading, refetch } = useProfilesList();

    // create user state
    const [isCreating, setIsCreating] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newEmail, setNewEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newName, setNewName] = useState('');
    const [newRole, setNewRole] = useState<UserRole>(UserRole.PROFESSOR);
    const [newWhatsApp, setNewWhatsApp] = useState('');

    // edit user state
    const [editingUser, setEditingUser] = useState<Profile | null>(null);
    const [editName, setEditName] = useState('');
    const [editRole, setEditRole] = useState<UserRole>(UserRole.PROFESSOR);
    const [editWhatsApp, setEditWhatsApp] = useState('');
    const [search, setSearch] = useState('');

    const filteredProfiles = profiles?.filter((p) =>
        p.full_name.toLowerCase().includes(search.toLowerCase())
    ) ?? [];

    const openEdit = (profile: Profile) => {
        setEditingUser(profile);
        setEditName(profile.full_name);
        setEditRole(profile.role);
        setEditWhatsApp(profile.whatsapp_number ?? '');
    };

    const invokeAdminFunction = async (name: string, body: Record<string, unknown>) => {
        const { data, error } = await supabase.functions.invoke(name, { body });
        if (error) {
            throw new Error(error.message || 'Falha na operação administrativa.');
        }
        return data;
    };

    const handleSave = async () => {
        if (!editingUser) return;

        try {
            await invokeAdminFunction('admin-update-user', {
                profile_id: editingUser.id,
                updates: {
                    full_name: editName.trim(),
                    role: editRole,
                    whatsapp_number: editWhatsApp.trim() || null,
                },
            });

            setEditingUser(null);
            refetch();

            if (Platform.OS === 'web') {
                window.alert('Usuário atualizado com sucesso.');
            } else {
                Alert.alert('Sucesso', 'Usuário atualizado.');
            }
        } catch (err: any) {
            const msg = `Falha ao atualizar usuário: ${err.message || String(err)}`;
            if (Platform.OS === 'web') window.alert(msg);
            else Alert.alert('Erro', msg);
        }
    };

    const handleDelete = async () => {
        if (!editingUser) return;

        const confirmMessage = `Tem certeza que deseja excluir o usuário ${editingUser.full_name}? Essa ação não pode ser desfeita.`;

        if (Platform.OS === 'web') {
            if (window.confirm(confirmMessage)) {
                await performDelete();
            }
        } else {
            Alert.alert(
                'Confirmar Exclusão',
                confirmMessage,
                [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                        text: 'Excluir',
                        style: 'destructive',
                        onPress: performDelete
                    }
                ]
            );
        }
    };

    const performDelete = async () => {
        try {
            await invokeAdminFunction('admin-delete-user', {
                profile_id: editingUser!.id,
                auth_id: editingUser!.auth_id,
            });

            const successMsg = 'Usuário excluído com sucesso.';

            if (Platform.OS === 'web') {
                window.alert(successMsg);
            } else {
                Alert.alert('Sucesso', successMsg);
            }
            setEditingUser(null);
            refetch();
        } catch (err: any) {
            const errorMsg = 'Falha ao excluir usuário: ' + err.message;
            if (Platform.OS === 'web') {
                window.alert('Erro: ' + errorMsg);
            } else {
                Alert.alert('Erro', errorMsg);
            }
        }
    };

    const handleCreate = async () => {
        if (!newEmail || !newPassword || !newName) {
            Alert.alert('Erro', 'Preencha todos os campos obrigatórios.');
            return;
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(newEmail)) {
            Alert.alert('Erro', 'Digite um endereço de e-mail válido.');
            return;
        }

        if (newPassword.length < 8) {
            Alert.alert('Erro', 'A senha deve ter no mínimo 8 caracteres.');
            return;
        }

        setIsSubmitting(true);

        try {
            await invokeAdminFunction('admin-create-user', {
                email: newEmail,
                password: newPassword,
                full_name: newName,
                role: newRole,
                whatsapp_number: newWhatsApp.trim() || null,
            });

            Alert.alert('Sucesso', 'Usuário criado com sucesso!');

            setTimeout(() => {
                setIsCreating(false);
                setNewEmail('');
                setNewPassword('');
                setNewName('');
                setNewWhatsApp('');
                setNewRole(UserRole.PROFESSOR);
                setIsSubmitting(false);
                refetch();
            }, 800);

        } catch (err: any) {
            let errorMsg = err.message || 'Falha desconhecida';
            if (err.status === 422 || errorMsg.includes('registered')) {
                errorMsg = 'Este email já está cadastrado.';
            }
            setIsSubmitting(false);
            Alert.alert('Erro', errorMsg);
        }
    };

    const renderUser = ({ item }: { item: Profile }) => (
        <TouchableOpacity
            style={[styles.userCard, { backgroundColor: colors.surface, borderColor: colors.outlineVariant }]}
            onPress={() => openEdit(item)}
            activeOpacity={0.7}
        >
            <View style={[styles.userAvatar, { backgroundColor: colors.primaryContainer }]}>
                <Text style={[styles.userInitial, { color: colors.onPrimaryContainer }]}>
                    {item.full_name.charAt(0).toUpperCase()}
                </Text>
            </View>
            <View style={styles.userInfo}>
                <Text style={[styles.userName, { color: colors.onSurface }]}>{item.full_name}</Text>
                <Text style={[styles.userEmail, { color: colors.onSurfaceVariant }]}>{item.email ?? '-'}</Text>
            </View>
            <View style={[styles.rolePill, { backgroundColor: ROLE_COLORS[item.role] + '20' }]}>
                <Text style={[styles.roleText, { color: ROLE_COLORS[item.role] }]}>
                    {ROLE_LABELS[item.role]}
                </Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.headerRow}>
                <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.outline }]}>
                    <MagnifyingGlass size={18} color={colors.onSurfaceVariant} />
                    <TextInput
                        style={[styles.searchInput, { color: colors.onSurface }]}
                        value={search}
                        onChangeText={setSearch}
                        placeholder="Buscar usuário..."
                        placeholderTextColor={colors.onSurfaceVariant}
                    />
                </View>
                <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.primary }]} onPress={() => setIsCreating(true)}>
                    <Plus size={18} color={colors.onPrimary} weight="bold" />
                    <Text style={[styles.addButtonText, { color: colors.onPrimary }]}>Novo</Text>
                </TouchableOpacity>
            </View>

            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={filteredProfiles}
                    keyExtractor={(item) => item.id}
                    renderItem={renderUser}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <Text style={[styles.emptyText, { color: colors.onSurfaceVariant }]}>Nenhum usuário encontrado.</Text>
                    }
                />
            )}

            {/* Create User Modal */}
            <Modal
                visible={isCreating}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => !isSubmitting && setIsCreating(false)}
            >
                <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
                    <View style={[styles.modalHeader, { borderBottomColor: colors.outlineVariant }]}>
                        <TouchableOpacity onPress={() => !isSubmitting && setIsCreating(false)}>
                            <Text style={[styles.modalClose, { color: colors.onSurfaceVariant }, isSubmitting && { opacity: 0.4 }]}>Cancelar</Text>
                        </TouchableOpacity>
                        <Text style={[styles.modalTitle, { color: colors.onSurface }]}>Novo Usuário</Text>
                        <TouchableOpacity onPress={handleCreate} disabled={isSubmitting}>
                            {isSubmitting ? (
                                <ActivityIndicator size="small" color={colors.primary} />
                            ) : (
                                <Text style={[styles.modalSave, { color: colors.primary }]}>Criar</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
                        <Text style={[styles.fieldLabel, { color: colors.onSurfaceVariant }]}>Nome Completo *</Text>
                        <TextInput
                            style={[styles.fieldInput, { backgroundColor: colors.surface, color: colors.onSurface, borderColor: colors.outline }]}
                            value={newName}
                            onChangeText={setNewName}
                            placeholder="Ex: João Silva"
                            placeholderTextColor={colors.onSurfaceVariant}
                        />

                        <Text style={[styles.fieldLabel, { color: colors.onSurfaceVariant }]}>E-mail *</Text>
                        <TextInput
                            style={[styles.fieldInput, { backgroundColor: colors.surface, color: colors.onSurface, borderColor: colors.outline }]}
                            value={newEmail}
                            onChangeText={setNewEmail}
                            placeholder="email@escola.com"
                            placeholderTextColor={colors.onSurfaceVariant}
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />

                        <Text style={[styles.fieldLabel, { color: colors.onSurfaceVariant }]}>Senha Inicial *</Text>
                        <TextInput
                            style={[styles.fieldInput, { backgroundColor: colors.surface, color: colors.onSurface, borderColor: colors.outline }]}
                            value={newPassword}
                            onChangeText={setNewPassword}
                                    placeholder="Mínimo 8 caracteres"
                            placeholderTextColor={colors.onSurfaceVariant}
                            secureTextEntry
                        />

                        <Text style={[styles.fieldLabel, { color: colors.onSurfaceVariant }]}>WhatsApp (Apenas números com DDI, Ex: 5511999999999)</Text>
                        <TextInput
                            style={[styles.fieldInput, { backgroundColor: colors.surface, color: colors.onSurface, borderColor: colors.outline }]}
                            value={newWhatsApp}
                            onChangeText={setNewWhatsApp}
                            placeholder="5511999999999 (opcional)"
                            placeholderTextColor={colors.onSurfaceVariant}
                            keyboardType="phone-pad"
                        />

                        <Text style={[styles.fieldLabel, { color: colors.onSurfaceVariant }]}>Função *</Text>
                        <View style={styles.roleSelector}>
                            {Object.values(UserRole).map((role) => (
                                <TouchableOpacity
                                    key={role}
                                    style={[
                                        styles.roleOption,
                                        { borderColor: colors.outline, backgroundColor: colors.surface },
                                        newRole === role && { backgroundColor: ROLE_COLORS[role] + '20', borderColor: ROLE_COLORS[role] },
                                    ]}
                                    onPress={() => setNewRole(role)}
                                >
                                    <Text
                                        style={[
                                            styles.roleOptionText,
                                            { color: colors.onSurfaceVariant },
                                            newRole === role && { color: ROLE_COLORS[role], fontWeight: '700' },
                                        ]}
                                    >
                                        {ROLE_LABELS[role]}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <View style={{ height: 40 }} />
                    </ScrollView>
                </View>
            </Modal>

            {/* Edit User Modal */}
            <Modal
                visible={!!editingUser}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setEditingUser(null)}
            >
                <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
                    <View style={[styles.modalHeader, { borderBottomColor: colors.outlineVariant }]}>
                        <TouchableOpacity onPress={() => setEditingUser(null)}>
                            <Text style={[styles.modalClose, { color: colors.onSurfaceVariant }]}>Cancelar</Text>
                        </TouchableOpacity>
                        <Text style={[styles.modalTitle, { color: colors.onSurface }]}>Editar Usuário</Text>
                        <TouchableOpacity onPress={handleSave}>
                            <Text style={[styles.modalSave, { color: colors.primary }]}>Salvar</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
                        <Text style={[styles.fieldLabel, { color: colors.onSurfaceVariant }]}>Nome Completo</Text>
                        <TextInput
                            style={[styles.fieldInput, { backgroundColor: colors.surface, color: colors.onSurface, borderColor: colors.outline }]}
                            value={editName}
                            onChangeText={setEditName}
                            placeholder="Nome do usuário"
                            placeholderTextColor={colors.onSurfaceVariant}
                        />

                        <Text style={[styles.fieldLabel, { color: colors.onSurfaceVariant }]}>WhatsApp (Apenas números com DDI, Ex: 5511999999999)</Text>
                        <TextInput
                            style={[styles.fieldInput, { backgroundColor: colors.surface, color: colors.onSurface, borderColor: colors.outline }]}
                            value={editWhatsApp}
                            onChangeText={setEditWhatsApp}
                            placeholder="5511999999999 (opcional)"
                            placeholderTextColor={colors.onSurfaceVariant}
                            keyboardType="phone-pad"
                        />

                        <Text style={[styles.fieldLabel, { color: colors.onSurfaceVariant }]}>Função</Text>
                        <View style={styles.roleSelector}>
                            {Object.values(UserRole).map((role) => (
                                <TouchableOpacity
                                    key={role}
                                    style={[
                                        styles.roleOption,
                                        { borderColor: colors.outline, backgroundColor: colors.surface },
                                        editRole === role && { backgroundColor: ROLE_COLORS[role] + '20', borderColor: ROLE_COLORS[role] },
                                    ]}
                                    onPress={() => setEditRole(role)}
                                >
                                    <Text
                                        style={[
                                            styles.roleOptionText,
                                            { color: colors.onSurfaceVariant },
                                            editRole === role && { color: ROLE_COLORS[role], fontWeight: '700' },
                                        ]}
                                    >
                                        {ROLE_LABELS[role]}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* DELETE BUTTON */}
                        <TouchableOpacity
                            style={[styles.deleteButton, { backgroundColor: colors.errorContainer, borderColor: colors.error }]}
                            onPress={handleDelete}
                        >
                            <Trash size={18} color={colors.onErrorContainer} weight="bold" />
                            <Text style={[styles.deleteButtonText, { color: colors.onErrorContainer }]}>Excluir Usuário</Text>
                        </TouchableOpacity>

                        <View style={{ height: 40 }} />
                    </ScrollView>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 8,
        gap: 10,
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
    addButton: {
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    addButtonText: {
        ...typography.labelLarge,
        fontWeight: '700',
    },
    searchInput: {
        flex: 1,
        paddingVertical: 13,
        ...typography.bodyMedium,
    },
    listContent: { padding: 16, paddingBottom: 40 },
    userCard: {
        borderRadius: 14,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        borderWidth: 1,
    },
    userAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    userInitial: { ...typography.titleMedium, fontWeight: '700' },
    userInfo: { flex: 1 },
    userName: { ...typography.bodyLarge, fontWeight: '600' },
    userEmail: { ...typography.bodySmall, marginTop: 2 },
    rolePill: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    roleText: { ...typography.labelSmall, fontWeight: '600' },
    emptyText: {
        textAlign: 'center',
        marginTop: 40,
        ...typography.bodyMedium,
    },
    modalContainer: { flex: 1 },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        minHeight: 56,
    },
    modalClose: { ...typography.bodyMedium },
    modalTitle: { ...typography.titleMedium, fontWeight: '700' },
    modalSave: { ...typography.bodyMedium, fontWeight: '700' },
    modalContent: { padding: 20 },
    fieldLabel: {
        ...typography.labelLarge,
        fontWeight: '600',
        marginBottom: 8,
        marginTop: 20,
    },
    fieldInput: {
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        ...typography.bodyMedium,
        borderWidth: 1,
    },
    roleSelector: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    roleOption: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1.5,
    },
    roleOptionText: {
        ...typography.bodyMedium,
    },
    deleteButton: {
        marginTop: 32,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1.5,
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
    },
    deleteButtonText: {
        ...typography.bodyLarge,
        fontWeight: '700',
    },
});
