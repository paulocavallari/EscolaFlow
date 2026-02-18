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
} from 'react-native';
import { useProfilesList, useUpdateProfile } from '../../../src/hooks/useStudents';
import { Profile, UserRole } from '../../../src/types/database';
import { COLORS, ROLE_LABELS, ROLE_COLORS } from '../../../src/lib/constants';

export default function UsersScreen() {
    const { data: profiles, isLoading, refetch } = useProfilesList();
    const updateProfile = useUpdateProfile();

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
            {/* Search */}
            <View style={styles.searchContainer}>
                <TextInput
                    style={styles.searchInput}
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Buscar usuário..."
                    placeholderTextColor={COLORS.textMuted}
                />
            </View>

            <FlatList
                data={filteredProfiles}
                keyExtractor={(item) => item.id}
                renderItem={renderUser}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <Text style={styles.emptyText}>Nenhum usuário encontrado.</Text>
                }
            />

            {/* Edit Modal */}
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
                    </ScrollView>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    searchContainer: { padding: 16, paddingBottom: 0 },
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
    roleSelector: { gap: 8, marginTop: 4 },
    roleOption: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border + '40',
    },
    roleOptionText: { fontSize: 15, fontWeight: '500', color: COLORS.textSecondary },
});
