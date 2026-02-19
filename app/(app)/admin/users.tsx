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
} from 'react-native';
import { useProfilesList, useUpdateProfile } from '../../../src/hooks/useStudents';
import { Profile, UserRole } from '../../../src/types/database';
import { COLORS, ROLE_LABELS, ROLE_COLORS } from '../../../src/lib/constants';
import { supabase } from '../../../src/lib/supabase';
import { createClient } from '@supabase/supabase-js';

// WARNING: EXPOSING SERVICE ROLE KEY ON CLIENT IS DANGEROUS.
// This is done here ONLY because network/Edge Functions are blocked and we need an internal admin tool.
// Ensure this app is NOT distributed to public stores with this key.
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3aGpqc3hxb29nbWNhaXJlc3ViIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTQ0Njk5NSwiZXhwIjoyMDg3MDIyOTk1fQ.J8udRfSV5ovz5cnMbQvm36ZwIE6AV2fGJklsXyfPvcE';
const adminSupabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL!, SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

export default function UsersScreen() {
    const { data: profiles, isLoading, refetch } = useProfilesList();
    const updateProfile = useUpdateProfile();



    // ... create user state
    const [isCreating, setIsCreating] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [statusMsg, setStatusMsg] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newName, setNewName] = useState('');
    const [newRole, setNewRole] = useState<UserRole>(UserRole.PROFESSOR);

    // ... edit user state
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
            await updateProfile.mutateAsync({
                id: editingUser.id,
                full_name: editName,
                role: editRole,
                whatsapp_number: editWhatsApp || null,
            });
            setEditingUser(null);
            Alert.alert('Sucesso', 'Usuário atualizado.');
        } catch (err) {
            Alert.alert('Erro', 'Falha ao atualizar usuário.');
        }
    };


    // ... inside component

    const handleDelete = async () => {
        if (!editingUser) return;
        console.log('handleDelete called for user:', editingUser.full_name);

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
            console.log('Deleting user:', editingUser?.auth_id);

            // Try deleting from Auth
            const { error: authError } = await adminSupabase.auth.admin.deleteUser(editingUser!.auth_id);

            if (authError) {
                console.warn('Auth deletion error:', authError);
                // If user is not found or error loading, it might be an orphan profile.
                // proceed to delete profile manually.
            }

            // Manually delete profile to ensure cleanup (even if cascade failed or auth user was missing)
            const { error: profileError } = await adminSupabase
                .from('profiles')
                .delete()
                .eq('id', editingUser!.id);

            if (profileError) {
                console.error('Profile deletion error:', profileError);
                throw profileError;
            }

            console.log('User deleted successfully (Auth + Profile cleaned)');

            const successMsg = authError
                ? 'Usuário removido da lista (Erro no Auth ignorado).'
                : 'Usuário excluído com sucesso.';

            if (Platform.OS === 'web') {
                window.alert(successMsg);
            } else {
                Alert.alert('Sucesso', successMsg);
            }
            setEditingUser(null);
            refetch();
        } catch (err: any) {
            console.error('Delete user error:', err);
            const errorMsg = 'Falha ao excluir usuário: ' + err.message;
            if (Platform.OS === 'web') {
                window.alert('Erro: ' + errorMsg);
            } else {
                Alert.alert('Erro', errorMsg);
            }
        }
    };





    const handleCreate = async () => {
        setStatusMsg('Iniciando criação...');
        if (!newEmail || !newPassword || !newName) {
            setStatusMsg('Erro: Preencha todos os campos.');
            Alert.alert('Erro', 'Preencha todos os campos obrigatórios.');
            return;
        }

        setIsSubmitting(true);
        setStatusMsg('Enviando para o banco de dados...');

        try {
            console.log('Creating user via Admin Client (Service Role)...');

            const { data, error } = await adminSupabase.auth.admin.createUser({
                email: newEmail,
                password: newPassword,
                email_confirm: true,
                user_metadata: {
                    full_name: newName,
                    role: newRole
                }
            });

            console.log('Admin create result:', { data, error });

            if (error) {
                console.error('Admin API error:', error);
                throw error;
            }


            console.log('User created successfully:', data.user);
            setStatusMsg('Criando perfil do usuário...');

            // Manually create profile since trigger is often unreliable or blocked
            const { error: profileError } = await adminSupabase
                .from('profiles')
                .insert({
                    auth_id: data.user.id,
                    full_name: newName,
                    email: newEmail,
                    role: newRole
                });

            if (profileError) {
                console.error('Profile creation error:', profileError);
                // User is created but profile failed. 
                // We should probably delete the user or warn.
                // For now, warn.
                setStatusMsg('Erro ao criar perfil. Usuário criado sem permissões.');
                Alert.alert('Atenção', 'Usuário criado, mas houve erro ao configurar permissões: ' + profileError.message);
                setIsSubmitting(false);
                return;
            }

            setStatusMsg('Usuário criado! Atualizando lista...');
            Alert.alert('Sucesso', 'Usuário e perfil criados com sucesso!');

            // Short delay to let user see success message
            setTimeout(() => {
                setIsCreating(false);
                setNewEmail('');
                setNewPassword('');
                setNewName('');
                setNewRole(UserRole.PROFESSOR);
                setStatusMsg('');
                setIsSubmitting(false);
                refetch();
            }, 1000);


        } catch (err: any) {
            console.error('Create user catch block:', err);

            // Handle "User already registered" specifically if possible
            let errorMsg = err.message || 'Falha desconhecida';
            if (err.status === 422 || errorMsg.includes('registered')) {
                errorMsg = 'Este email já está cadastrado.';
            }

            setStatusMsg('Erro: ' + errorMsg);
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


    // ... existing renderUser

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <View style={styles.searchContainer}>
                    <TextInput
                        style={styles.searchInput}
                        value={search}
                        onChangeText={setSearch}
                        placeholder="Buscar usuário..."
                        placeholderTextColor={COLORS.textMuted}
                    />
                </View>
                <TouchableOpacity style={styles.addButton} onPress={() => setIsCreating(true)}>
                    <Text style={styles.addButtonText}>+ Novo</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                // ... existing props
                data={filteredProfiles}
                keyExtractor={(item) => item.id}
                renderItem={renderUser}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <Text style={styles.emptyText}>Nenhum usuário encontrado.</Text>
                }
            />

            {/* Create User Modal */}
            <Modal
                visible={isCreating}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setIsCreating(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setIsCreating(false)}>
                            <Text style={styles.modalClose}>Cancelar</Text>
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>Novo Usuário</Text>
                        <TouchableOpacity onPress={handleCreate} disabled={isSubmitting}>
                            <Text style={[styles.modalSave, isSubmitting && { opacity: 0.5 }]}>
                                {isSubmitting ? 'Salvando...' : 'Criar'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalContent}>
                        {/* DEBUG STATUS */}
                        {statusMsg ? (
                            <View style={{ padding: 10, backgroundColor: '#f0f0f0', marginBottom: 10, borderRadius: 8 }}>
                                <Text style={{ color: '#333', fontWeight: 'bold' }}>Status: {statusMsg}</Text>
                            </View>
                        ) : null}

                        <Text style={styles.fieldLabel}>Nome Completo</Text>
                        <TextInput
                            style={styles.fieldInput}
                            value={newName}
                            onChangeText={setNewName}
                            placeholder="Ex: João Silva"
                            placeholderTextColor={COLORS.textMuted}
                        />

                        <Text style={styles.fieldLabel}>Email</Text>
                        <TextInput
                            style={styles.fieldInput}
                            value={newEmail}
                            onChangeText={setNewEmail}
                            placeholder="email@escola.com"
                            placeholderTextColor={COLORS.textMuted}
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />

                        <Text style={styles.fieldLabel}>Senha Inicial</Text>
                        <TextInput
                            style={styles.fieldInput}
                            value={newPassword}
                            onChangeText={setNewPassword}
                            placeholder="Mínimo 6 caracteres"
                            placeholderTextColor={COLORS.textMuted}
                            secureTextEntry
                        />

                        <Text style={styles.fieldLabel}>Função</Text>
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
                                            newRole === role && { color: ROLE_COLORS[role] },
                                        ]}
                                    >
                                        {ROLE_LABELS[role]}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </ScrollView>
                </View>
            </Modal>

            {/* Edit Modal (Existing) */}
            <Modal
                visible={!!editingUser}
                // ...

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

                    <ScrollView style={styles.modalContent}>
                        <Text style={styles.fieldLabel}>Nome Completo</Text>
                        <TextInput
                            style={styles.fieldInput}
                            value={editName}
                            onChangeText={setEditName}
                            placeholder="Nome do usuário"
                            placeholderTextColor={COLORS.textMuted}
                        />

                        <Text style={styles.fieldLabel}>WhatsApp</Text>
                        <TextInput
                            style={styles.fieldInput}
                            value={editWhatsApp}
                            onChangeText={setEditWhatsApp}
                            placeholder="+55 11 99999-9999"
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
                                            editRole === role && { color: ROLE_COLORS[role] },
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
                            <Text style={styles.deleteButtonText}>Excluir Usuário</Text>
                        </TouchableOpacity>

                    </ScrollView>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 16,
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
        fontWeight: '600',
        fontSize: 14,
    },
    searchInput: {
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
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
        width: 42,
        height: 42,
        borderRadius: 21,
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
    roleSelector: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    roleOption: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: COLORS.background,
    },
    roleOptionText: {
        fontSize: 14,
        color: COLORS.textMuted,
    },
    deleteButton: {
        marginTop: 24,
        padding: 16,
        backgroundColor: '#FFE5E5',
        borderRadius: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#FF4444',
    },
    deleteButtonText: {
        color: '#CC0000',
        fontWeight: 'bold',
        fontSize: 16,
    },
});
