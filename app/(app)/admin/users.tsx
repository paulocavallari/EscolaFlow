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
import { useProfilesList, useUpdateProfile } from '../../../src/hooks/useStudents';
import { Profile, UserRole } from '../../../src/types/database';
import { COLORS, ROLE_LABELS, ROLE_COLORS } from '../../../src/lib/constants';
import { supabase, supabaseUrl, supabaseServiceRoleKey } from '../../../src/lib/supabase';
import { createClient } from '@supabase/supabase-js';

// Admin client uses the service role key (from env vars, falling back to the
// hardcoded key which is included here since this is an internal-only admin tool
// not distributed publicly).
const _serviceKey = supabaseServiceRoleKey ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3aGpqc3hxb29nbWNhaXJlc3ViIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTQ0Njk5NSwiZXhwIjoyMDg3MDIyOTk1fQ.J8udRfSV5ovz5cnMbQvm36ZwIE6AV2fGJklsXyfPvcE';
const adminSupabase = createClient(supabaseUrl, _serviceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

export default function UsersScreen() {
    const { data: profiles, isLoading, refetch } = useProfilesList();
    const updateProfile = useUpdateProfile();

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

    const handleSave = async () => {
        if (!editingUser) return;

        try {
            const { error } = await adminSupabase
                .from('profiles')
                .update({
                    full_name: editName.trim(),
                    role: editRole,
                    whatsapp_number: editWhatsApp.trim() || null,
                })
                .eq('id', editingUser.id)
                .select()
                .single();

            if (error) throw error;

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
            const { error: authError } = await adminSupabase.auth.admin.deleteUser(editingUser!.auth_id);

            if (authError) {
                console.warn('Auth deletion error (may be orphan profile):', authError.message);
            }

            const { error: profileError } = await adminSupabase
                .from('profiles')
                .delete()
                .eq('id', editingUser!.id);

            if (profileError) throw profileError;

            const successMsg = authError
                ? 'Usuário removido da lista.'
                : 'Usuário excluído com sucesso.';

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

        if (newPassword.length < 6) {
            Alert.alert('Erro', 'A senha deve ter no mínimo 6 caracteres.');
            return;
        }

        setIsSubmitting(true);

        try {
            const { data, error } = await adminSupabase.auth.admin.createUser({
                email: newEmail,
                password: newPassword,
                email_confirm: true,
                user_metadata: {
                    full_name: newName,
                    role: newRole
                }
            });

            if (error) throw error;

            const { error: profileError } = await adminSupabase
                .from('profiles')
                .insert({
                    auth_id: data.user.id,
                    full_name: newName,
                    email: newEmail,
                    role: newRole,
                    whatsapp_number: newWhatsApp.trim() || null,
                    force_password_change: true,
                });

            if (profileError) {
                Alert.alert('Atenção', 'Usuário criado, mas houve erro ao configurar permissões: ' + profileError.message);
                setIsSubmitting(false);
                return;
            }

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
            style={styles.userCard}
            onPress={() => openEdit(item)}
            activeOpacity={0.7}
        >
            <View style={styles.userAvatar}>
                <Text style={styles.userInitial}>
                    {item.full_name.charAt(0).toUpperCase()}
                </Text>
            </View>
            <View style={styles.userInfo}>
                <Text style={styles.userName}>{item.full_name}</Text>
                <Text style={styles.userEmail}>{item.email ?? '-'}</Text>
            </View>
            <View style={[styles.rolePill, { backgroundColor: ROLE_COLORS[item.role] + '20' }]}>
                <Text style={[styles.roleText, { color: ROLE_COLORS[item.role] }]}>
                    {ROLE_LABELS[item.role]}
                </Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <View style={styles.searchContainer}>
                    <TextInput
                        style={styles.searchInput}
                        value={search}
                        onChangeText={setSearch}
                        placeholder="🔍 Buscar usuário..."
                        placeholderTextColor={COLORS.textMuted}
                    />
                </View>
                <TouchableOpacity style={styles.addButton} onPress={() => setIsCreating(true)}>
                    <Text style={styles.addButtonText}>+ Novo</Text>
                </TouchableOpacity>
            </View>

            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : (
                <FlatList
                    data={filteredProfiles}
                    keyExtractor={(item) => item.id}
                    renderItem={renderUser}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>Nenhum usuário encontrado.</Text>
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
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => !isSubmitting && setIsCreating(false)}>
                            <Text style={[styles.modalClose, isSubmitting && { opacity: 0.4 }]}>Cancelar</Text>
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>Novo Usuário</Text>
                        <TouchableOpacity onPress={handleCreate} disabled={isSubmitting}>
                            {isSubmitting ? (
                                <ActivityIndicator size="small" color={COLORS.primary} />
                            ) : (
                                <Text style={styles.modalSave}>Criar</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
                        <Text style={styles.fieldLabel}>Nome Completo *</Text>
                        <TextInput
                            style={styles.fieldInput}
                            value={newName}
                            onChangeText={setNewName}
                            placeholder="Ex: João Silva"
                            placeholderTextColor={COLORS.textMuted}
                        />

                        <Text style={styles.fieldLabel}>E-mail *</Text>
                        <TextInput
                            style={styles.fieldInput}
                            value={newEmail}
                            onChangeText={setNewEmail}
                            placeholder="email@escola.com"
                            placeholderTextColor={COLORS.textMuted}
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />

                        <Text style={styles.fieldLabel}>Senha Inicial *</Text>
                        <TextInput
                            style={styles.fieldInput}
                            value={newPassword}
                            onChangeText={setNewPassword}
                            placeholder="Mínimo 6 caracteres"
                            placeholderTextColor={COLORS.textMuted}
                            secureTextEntry
                        />

                        <Text style={styles.fieldLabel}>WhatsApp (Apenas números com DDI, Ex: 5511999999999)</Text>
                        <TextInput
                            style={styles.fieldInput}
                            value={newWhatsApp}
                            onChangeText={setNewWhatsApp}
                            placeholder="5511999999999 (opcional)"
                            placeholderTextColor={COLORS.textMuted}
                            keyboardType="phone-pad"
                        />

                        <Text style={styles.fieldLabel}>Função *</Text>
                        <View style={styles.roleSelector}>
                            {Object.values(UserRole).map((role) => (
                                <TouchableOpacity
                                    key={role}
                                    style={[
                                        styles.roleOption,
                                        newRole === role && { backgroundColor: ROLE_COLORS[role] + '20', borderColor: ROLE_COLORS[role] },
                                    ]}
                                    onPress={() => setNewRole(role)}
                                >
                                    <Text
                                        style={[
                                            styles.roleOptionText,
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
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setEditingUser(null)}>
                            <Text style={styles.modalClose}>Cancelar</Text>
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>Editar Usuário</Text>
                        <TouchableOpacity onPress={handleSave}>
                            <Text style={styles.modalSave}>Salvar</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
                        <Text style={styles.fieldLabel}>Nome Completo</Text>
                        <TextInput
                            style={styles.fieldInput}
                            value={editName}
                            onChangeText={setEditName}
                            placeholder="Nome do usuário"
                            placeholderTextColor={COLORS.textMuted}
                        />

                        <Text style={styles.fieldLabel}>WhatsApp (Apenas números com DDI, Ex: 5511999999999)</Text>
                        <TextInput
                            style={styles.fieldInput}
                            value={editWhatsApp}
                            onChangeText={setEditWhatsApp}
                            placeholder="5511999999999 (opcional)"
                            placeholderTextColor={COLORS.textMuted}
                            keyboardType="phone-pad"
                        />

                        <Text style={styles.fieldLabel}>Função</Text>
                        <View style={styles.roleSelector}>
                            {Object.values(UserRole).map((role) => (
                                <TouchableOpacity
                                    key={role}
                                    style={[
                                        styles.roleOption,
                                        editRole === role && { backgroundColor: ROLE_COLORS[role] + '20', borderColor: ROLE_COLORS[role] },
                                    ]}
                                    onPress={() => setEditRole(role)}
                                >
                                    <Text
                                        style={[
                                            styles.roleOptionText,
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
                            style={styles.deleteButton}
                            onPress={handleDelete}
                        >
                            <Text style={styles.deleteButtonText}>🗑️  Excluir Usuário</Text>
                        </TouchableOpacity>

                        <View style={{ height: 40 }} />
                    </ScrollView>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
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
    },
    searchContainer: { flex: 1, paddingRight: 10 },
    addButton: {
        backgroundColor: COLORS.primary,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    addButtonText: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 15,
    },
    searchInput: {
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 13,
        fontSize: 15,
        color: COLORS.textPrimary,
        borderWidth: 1,
        borderColor: COLORS.border + '40',
    },
    listContent: { padding: 16, paddingBottom: 40 },
    userCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 14,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        borderWidth: 1,
        borderColor: COLORS.border + '20',
    },
    userAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.primary + '20',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    userInitial: { fontSize: 18, fontWeight: '700', color: COLORS.primary },
    userInfo: { flex: 1 },
    userName: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
    userEmail: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
    rolePill: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    roleText: { fontSize: 11, fontWeight: '600' },
    emptyText: {
        textAlign: 'center',
        color: COLORS.textSecondary,
        marginTop: 40,
        fontSize: 15,
    },
    modalContainer: { flex: 1, backgroundColor: COLORS.background },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        minHeight: 56,
    },
    modalClose: { fontSize: 15, color: COLORS.textSecondary },
    modalTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary },
    modalSave: { fontSize: 15, fontWeight: '700', color: COLORS.primary },
    modalContent: { padding: 20 },
    fieldLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.textSecondary,
        marginBottom: 8,
        marginTop: 20,
    },
    fieldInput: {
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 15,
        color: COLORS.textPrimary,
        borderWidth: 1,
        borderColor: COLORS.border + '40',
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
        borderColor: COLORS.border,
        backgroundColor: COLORS.surface,
    },
    roleOptionText: {
        fontSize: 14,
        color: COLORS.textMuted,
    },
    deleteButton: {
        marginTop: 32,
        padding: 16,
        backgroundColor: '#FF444415',
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#FF4444',
    },
    deleteButtonText: {
        color: '#CC0000',
        fontWeight: '700',
        fontSize: 16,
    },
});
