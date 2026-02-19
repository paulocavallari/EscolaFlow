// app/(app)/admin/index.tsx
// Admin panel hub with navigation to sub-sections

import React from 'react';
// Force reload of Admin screen
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import { COLORS } from '../../../src/lib/constants';
import { useProfilesList } from '../../../src/hooks/useStudents';
import { useClassesList, useStudentsList } from '../../../src/hooks/useStudents';
import { sendWhatsAppMessage, checkConnectionState } from '../../../src/services/whatsappService';

interface AdminCardProps {
    icon: string;
    title: string;
    description: string;
    count?: number;
    onPress: () => void;
}

function AdminCard({ icon, title, description, count, onPress }: AdminCardProps) {
    return (
        <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
            <View style={styles.cardIconContainer}>
                <Text style={styles.cardIcon}>{icon}</Text>
            </View>
            <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{title}</Text>
                <Text style={styles.cardDescription}>{description}</Text>
            </View>
            {count !== undefined && (
                <View style={styles.countBadge}>
                    <Text style={styles.countText}>{count}</Text>
                </View>
            )}
            <Text style={styles.cardArrow}>›</Text>
        </TouchableOpacity>
    );
}

export default function AdminHubScreen() {
    const { data: profiles } = useProfilesList();
    const { data: classes } = useClassesList();
    const { data: students } = useStudentsList();

    const handleTestWhatsApp = async () => {
        const testNumber = '5514991441613';
        const message = '*Teste EscolaFlow*: Esta é uma mensagem de verificação do sistema.\n\nSe você recebeu isso, a integração está funcionando! 🚀';

        if (Platform.OS === 'web') {
            if (!window.confirm(`Enviar mensagem de teste para ${testNumber}?`)) return;
        } else {
            Alert.alert(
                "Confirmar Envio",
                `Deseja enviar uma mensagem de teste do WhatsApp para ${testNumber}?`,
                [
                    { text: "Cancelar", style: "cancel" },
                    {
                        text: "Enviar",
                        onPress: async () => {
                            try {
                                await sendWhatsAppMessage(testNumber, message);
                                Alert.alert("Sucesso", "Mensagem de teste enviada!");
                            } catch (error) {
                                console.error("Erro ao enviar mensagem de teste:", error);
                                Alert.alert("Erro", "Falha ao enviar mensagem de teste.");
                            }
                        }
                    }
                ]
            );
        }
    };

    const handleCheckStatus = async () => {
        console.log('Verificando status da API...');
        try {
            const result = await checkConnectionState();
            console.log('Status recebido:', result);

            if (result.success) {
                const state = result.data?.instance?.state || result.data?.state || JSON.stringify(result.data);
                const msg = `Conectado!\nInstância: ${process.env.EVOLUTION_INSTANCE_NAME || 'zap'}\nEstado: ${state}`;
                if (Platform.OS === 'web') window.alert(msg);
                else Alert.alert('Online', msg);
            } else {
                const msg = `Falha na conexão.\nStatus: ${result.status}\nResp: ${result.data || result.error}`;
                if (Platform.OS === 'web') window.alert(msg);
                else Alert.alert('Offline', msg);
            }

        } catch (err: any) {
            console.error('Erro no handler de status:', err);
            const errMsg = `Erro ao conectar: ${err.message}`;
            if (Platform.OS === 'web') window.alert(errMsg);
            else Alert.alert('Erro', errMsg);
        }
    };

    const sendTest = async (phone: string, msg: string) => {
        try {
            const result = await sendWhatsAppMessage(phone, msg);
            console.log('Send Result:', result);

            if (result.success) {
                const sMsg = `Enviado! Status: ${result.status}\nResp: ${JSON.stringify(result.data)}`;
                if (Platform.OS === 'web') window.alert(sMsg);
                else Alert.alert('Sucesso', sMsg);
            } else {
                const eMsg = `Falha! Status: ${result.status}\nErro: ${JSON.stringify(result.data || result.error)}`;
                if (Platform.OS === 'web') window.alert(eMsg);
                else Alert.alert('Erro', eMsg);
            }
        } catch (err: any) {
            const eMsg = `Exceção: ${err.message}`;
            if (Platform.OS === 'web') window.alert(eMsg);
            else Alert.alert('Erro', eMsg);
        }
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <Text style={styles.header}>Painel Administrativo</Text>
            <Text style={styles.subheader}>Gerencie usuários, turmas e alunos do sistema.</Text>

            <View style={styles.cardList}>
                <AdminCard
                    icon="👥"
                    title="Usuários"
                    description="Gerenciar professores e staff"
                    count={profiles?.length}
                    onPress={() => router.push('/(app)/admin/users')}
                />
                <AdminCard
                    icon="🏫"
                    title="Turmas"
                    description="CRUD de turmas e anos letivos"
                    count={classes?.length}
                    onPress={() => router.push('/(app)/admin/classes')}
                />
                <AdminCard
                    icon="🎓"
                    title="Alunos"
                    description="Gerenciar alunos e importar CSV"
                    count={students?.length}
                    onPress={() => router.push('/(app)/admin/students')}
                />
                <AdminCard
                    icon="📋"
                    title="Tutores"
                    description="Atribuir tutores aos alunos"
                    onPress={() => router.push('/(app)/admin/tutors')}
                />

                {/* System Tests Section */}
                <View style={styles.divider} />
                <Text style={styles.sectionTitle}>Testes do Sistema</Text>

                <TouchableOpacity style={styles.testButton} onPress={handleTestWhatsApp}>
                    <Text style={styles.testButtonIcon}>💬</Text>
                    <Text style={styles.testButtonText}>Testar WhatsApp (5514...)</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.testButton, { marginTop: 12, borderColor: '#007AFF', backgroundColor: '#007AFF20' }]} onPress={handleCheckStatus}>
                    <Text style={[styles.testButtonIcon, { color: '#007AFF' }]}>📡</Text>
                    <Text style={[styles.testButtonText, { color: '#007AFF' }]}>Verificar Status API</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}


const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    content: {
        padding: 20,
        paddingBottom: 40,
    },
    header: {
        fontSize: 24,
        fontWeight: '800',
        color: COLORS.textPrimary,
        marginBottom: 4,
    },
    subheader: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginBottom: 24,
    },
    cardList: {
        gap: 12,
    },
    card: {
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        padding: 18,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border + '30',
    },
    cardIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: COLORS.primary + '15',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    cardIcon: {
        fontSize: 24,
    },
    cardContent: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.textPrimary,
    },
    cardDescription: {
        fontSize: 13,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    countBadge: {
        backgroundColor: COLORS.primary + '20',
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 4,
        marginRight: 8,
    },
    countText: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.primary,
    },
    cardArrow: {
        fontSize: 22,
        color: COLORS.textMuted,
        fontWeight: '300',
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.border + '30',
        marginVertical: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.textSecondary,
        marginBottom: 12,
        marginTop: 8,
    },
    testButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#25D36620', // WhatsApp green tint
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#25D366',
    },
    testButtonIcon: {
        fontSize: 20,
        marginRight: 12,
    },
    testButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#075E54', // WhatsApp dark green
    },
});

