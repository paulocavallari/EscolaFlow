// app/(app)/occurrences/[id].tsx
// Occurrence detail screen with treatment flow

import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    Platform,
    TextInput,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useOccurrenceDetail, useAddAction, useUpdateAction, useProcessText, useDeleteOccurrence } from '../../../src/hooks/useOccurrences';
import { generateOccurrencePDF } from '../../../src/utils/pdfGenerator';
import { useProfile } from '../../../src/hooks/useProfile';
import { StatusBadge } from '../../../src/components/StatusBadge';
import { AudioRecorder } from '../../../src/components/AudioRecorder';
import { AIReviewModal } from '../../../src/components/AIReviewModal';
import { supabase } from '../../../src/lib/supabase';
import {
    OccurrenceStatus,
    ActionType,
    UserRole,
} from '../../../src/types/database';
import { COLORS, ACTION_TYPE_LABELS } from '../../../src/lib/constants';
import { sendWhatsAppMessage } from '../../../src/services/whatsappService';

export default function OccurrenceDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { profileId, role } = useProfile();

    const { data: occurrence, isLoading } = useOccurrenceDetail(id ?? '');
    const addAction = useAddAction();
    const processText = useProcessText();

    // Treatment state
    const [showTreatment, setShowTreatment] = useState(false);
    const [treatmentOriginal, setTreatmentOriginal] = useState('');
    const [treatmentFormal, setTreatmentFormal] = useState('');
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [manualTreatmentText, setManualTreatmentText] = useState('');
    const updateAction = useUpdateAction();
    const [editingActionId, setEditingActionId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState('');
    const deleteOccurrence = useDeleteOccurrence();

    const canTreat = Boolean(
        occurrence &&
        profileId &&
        occurrence.status !== OccurrenceStatus.CONCLUDED &&
        (
            occurrence.tutor_id === profileId ||
            role === UserRole.VICE_DIRECTOR ||
            role === UserRole.ADMIN
        )
    );

    const isVP = role === UserRole.VICE_DIRECTOR;
    const isAdmin = role === UserRole.ADMIN;

    // Handle recorded audio for treatment
    const handleTranscriptionComplete = useCallback(async (text: string) => {
        if (!text.trim()) return;
        try {
            const result = await processText.mutateAsync(text);
            setTreatmentOriginal(result.original);
            setTreatmentFormal(result.formal);
            setShowReviewModal(true);
        } catch (err) {
            Alert.alert('Erro', 'Falha ao processar texto.');
        }
    }, [processText]);

    const handleDelete = useCallback(async () => {
        if (!occurrence) return;

        const performDelete = async () => {
            try {
                await deleteOccurrence.mutateAsync(occurrence.id);
                if (Platform.OS === 'web') {
                    window.alert('Ocorrência excluída com sucesso.');
                } else {
                    Alert.alert('Sucesso', 'Ocorrência excluída com sucesso.');
                }
                router.replace('/(app)/occurrences' as any);
            } catch (err: any) {
                const msg = err.message || 'Falha ao excluir ocorrência.';
                if (Platform.OS === 'web') {
                    window.alert(`Erro: ${msg}`);
                } else {
                    Alert.alert('Erro', msg);
                }
            }
        };

        if (Platform.OS === 'web') {
            // Double verification on web
            const first = window.confirm(
                '🗑️ Deseja realmente excluir esta ocorrência de forma permanente?\n\nEsta ação NÃO pode ser desfeita.'
            );
            if (!first) return;

            const second = window.confirm(
                '⚠️ CONFIRMAÇÃO FINAL\n\nTem CERTEZA ABSOLUTA? Todos os dados desta ocorrência serão perdidos permanentemente.'
            );
            if (!second) return;

            await performDelete();
        } else {
            Alert.alert(
                '🗑️ Confirmar Exclusão',
                'Deseja realmente excluir esta ocorrência de forma permanente? Esta ação não pode ser desfeita.',
                [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                        text: 'Excluir',
                        style: 'destructive',
                        onPress: () => {
                            Alert.alert(
                                '⚠️ Confirmação Final',
                                'Tem CERTEZA ABSOLUTA? Todos os dados serão perdidos permanentemente.',
                                [
                                    { text: 'Cancelar', style: 'cancel' },
                                    { text: 'Sim, Excluir', style: 'destructive', onPress: performDelete },
                                ]
                            );
                        }
                    }
                ]
            );
        }
    }, [occurrence, deleteOccurrence]);

    const handleExportPDF = async () => {
        if (!occurrence) return;
        try {
            await generateOccurrencePDF(occurrence);
        } catch (err) {
            Alert.alert('Erro', 'Falha ao exportar PDF.');
        }
    };

    const handleSendWhatsApp = useCallback(async () => {
        if (!occurrence) return;
        const guardianPhone = occurrence.student?.guardian_phone;
        if (!guardianPhone) {
            if (Platform.OS === 'web') {
                window.alert('Este aluno não possui telefone do responsável cadastrado. Adicione-o na tela de Alunos do painel administrativo.');
            } else {
                Alert.alert('Sem número cadastrado', 'Este aluno não possui telefone do responsável cadastrado. Adicione-o na tela de Alunos do painel administrativo.');
            }
            return;
        }
        // Build a complete message with occurrence description + final parecer
        const occurrenceDescription = occurrence.description_formal || occurrence.description_original || 'Descrição não disponível.';
        const lastAction = occurrence.actions && occurrence.actions.length > 0
            ? occurrence.actions[occurrence.actions.length - 1]
            : null;
        const parecerText = lastAction?.description
            ? lastAction.description
            : 'Parecer não registrado.';

        const message =
            `*Comunicado Escolar — Ocorrências VC*\n\n` +
            `Prezado(a) responsável pelo(a) aluno(a) *${occurrence.student?.name ?? 'N/A'}* da turma *${occurrence.student?.class?.name ?? 'N/A'}*,\n\n` +
            `Informamos que foi registrada uma ocorrência referente ao(à) aluno(a), conforme detalhado abaixo.\n\n` +
            `📝 *Ocorrência registrada por ${occurrence.author?.full_name ?? 'Professor(a)'}:*\n` +
            `${occurrenceDescription}\n\n` +
            `✅ *Parecer final:*\n` +
            `${parecerText}\n\n` +
            `Qualquer dúvida, entre em contato com a escola.`;

        const doSend = async () => {
            try {
                const result = await sendWhatsAppMessage(guardianPhone, message);
                if (result.success) {
                    if (Platform.OS === 'web') {
                        window.alert('✔ Mensagem enviada com sucesso ao responsável!');
                    } else {
                        Alert.alert('✔ Enviado', 'Mensagem enviada com sucesso ao responsável!');
                    }
                } else {
                    if (Platform.OS === 'web') {
                        window.alert('A mensagem pode não ter sido entregue. Verifique a conexão com o WhatsApp.');
                    } else {
                        Alert.alert('Atenção', 'A mensagem pode não ter sido entregue. Verifique a conexão com o WhatsApp.');
                    }
                }
            } catch (err) {
                if (Platform.OS === 'web') {
                    window.alert('Falha ao enviar mensagem WhatsApp.');
                } else {
                    Alert.alert('Erro', 'Falha ao enviar mensagem WhatsApp.');
                }
            }
        };

        if (Platform.OS === 'web') {
            const confirmed = window.confirm(
                `📱 Enviar notificação WhatsApp ao responsável do(a) ${occurrence.student?.name ?? 'aluno'}?\n\nNúmero: ${guardianPhone}`
            );
            if (confirmed) {
                await doSend();
            }
        } else {
            Alert.alert(
                '📱 Enviar notificação WhatsApp',
                `Enviar mensagem ao responsável do(a) ${occurrence.student?.name ?? 'aluno'}?\n\nNúmero: ${guardianPhone}`,
                [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Enviar', onPress: doSend },
                ]
            );
        }
    }, [occurrence]);

    // Handle text treatment: process with AI
    const handleTextSubmit = async () => {
        if (!manualTreatmentText.trim()) {
            Alert.alert('Aviso', 'Digite os detalhes da providência antes de continuar.');
            return;
        }
        try {
            const result = await processText.mutateAsync(manualTreatmentText);
            setTreatmentOriginal(result.original);
            setTreatmentFormal(result.formal);
            setShowReviewModal(true);
        } catch (err) {
            Alert.alert('Erro', 'Falha ao processar texto.');
        }
    };

    // After AI review, populate manual field with reviewed text
    const handleConfirmReview = useCallback((editedText: string) => {
        setShowReviewModal(false);
        setManualTreatmentText(editedText);
        setTreatmentFormal('');
    }, []);

    // Submit treatment action
    const handleSubmitAction = useCallback(async (actionTypeParam: 'resolve' | 'escalate' | 'vp_resolve') => {
        if (!occurrence || !profileId) return;

        if (!manualTreatmentText.trim()) {
            Alert.alert('Atenção', 'Digite ou grave a providência antes de confirmar.');
            return;
        }

        let actionType: ActionType;
        let newStatus: OccurrenceStatus;

        if (actionTypeParam === 'resolve') {
            actionType = ActionType.RESOLUTION;
            newStatus = OccurrenceStatus.CONCLUDED;
        } else if (actionTypeParam === 'escalate') {
            actionType = ActionType.ESCALATION;
            newStatus = OccurrenceStatus.ESCALATED_VP;
        } else {
            actionType = ActionType.VP_RESOLUTION;
            newStatus = OccurrenceStatus.CONCLUDED;
        }

        try {
            await addAction.mutateAsync({
                occurrence_id: occurrence.id,
                author_id: profileId,
                description: manualTreatmentText.trim(),
                action_type: actionType,
                newStatus,
            });

            // Auto-notify all VP users when occurrence is escalated
            if (actionTypeParam === 'escalate') {
                supabase
                    .from('profiles')
                    .select('whatsapp_number, full_name')
                    .eq('role', 'vice_director')
                    .not('whatsapp_number', 'is', null)
                    .then(({ data: vpProfiles }) => {
                        if (!vpProfiles || vpProfiles.length === 0) return;
                        const message =
                            `*Ocorrência Encaminhada à Vice-Direção*\n\n` +
                            `Aluno: ${occurrence.student?.name ?? 'N/A'}\n` +
                            `Turma: ${occurrence.student?.class?.name ?? 'N/A'}\n` +
                            `Registrada por: ${occurrence.author?.full_name ?? 'N/A'}\n\n` +
                            `Observação do tutor: ${manualTreatmentText.trim()}\n\n` +
                            `Acesse o app Ocorrências VC para analisar e registrar a devolutiva.`;
                        vpProfiles.forEach((vp: any) => {
                            if (vp.whatsapp_number) {
                                sendWhatsAppMessage(vp.whatsapp_number, message)
                                    .catch(() => { /* silent */ });
                            }
                        });
                    });
            }

            Alert.alert('✅ Sucesso', 'Tratativa registrada com sucesso!', [
                { text: 'OK', onPress: () => router.back() },
            ]);
        } catch (err) {
            Alert.alert('Erro', 'Falha ao registrar a tratativa.');
        }
    }, [occurrence, profileId, manualTreatmentText, addAction]);

    const handleSaveEdit = async () => {
        if (!editingActionId || !editContent.trim()) return;
        try {
            await updateAction.mutateAsync({ id: editingActionId, description: editContent.trim() });
            setEditingActionId(null);
            setEditContent('');
            Alert.alert('Sucesso', 'Tratativa atualizada com sucesso.');
        } catch (err) {
            Alert.alert('Erro', 'Falha ao atualizar tratativa.');
        }
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Carregando ocorrência...</Text>
            </View>
        );
    }

    if (!occurrence) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={styles.errorIcon}>😔</Text>
                <Text style={styles.errorText}>Ocorrência não encontrada.</Text>
                <TouchableOpacity style={styles.backLinkButton} onPress={() => router.back()}>
                    <Text style={styles.backLinkText}>← Voltar à lista</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const createdDate = new Date(occurrence.created_at).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

    // Determine treatment helper text based on role and status
    const getTreatmentHint = () => {
        if (isVP || isAdmin) {
            return 'Como Vice-Diretor(a), você pode registrar a devolutiva e concluir esta ocorrência.';
        }
        if (occurrence.status === OccurrenceStatus.PENDING_TUTOR) {
            return 'Como tutor(a), você pode resolver esta ocorrência ou encaminhar à Vice-Direção caso precise de suporte.';
        }
        return 'Registre a providência tomada e altere o status da ocorrência.';
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            {/* Header Info */}
            <View style={styles.headerCard}>
                <View style={styles.headerTop}>
                    <StatusBadge status={occurrence.status} />
                    <Text style={styles.date}>{createdDate}</Text>
                </View>

                <Text style={styles.studentName}>
                    {occurrence.student?.name ?? 'Aluno'}
                </Text>
                <Text style={styles.className}>
                    {occurrence.student?.class?.name ?? ''}
                </Text>

                <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                        <Text style={styles.metaLabel}>Registrado por</Text>
                        <Text style={styles.metaValue}>{occurrence.author?.full_name ?? '-'}</Text>
                    </View>
                    <View style={styles.metaItem}>
                        <Text style={styles.metaLabel}>Tutor(a)</Text>
                        <Text style={styles.metaValue}>{occurrence.tutor?.full_name ?? '-'}</Text>
                    </View>
                </View>
            </View>

            {/* Formal Description */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>📝 Descrição Formal</Text>
                <View style={styles.descriptionBox}>
                    <Text style={styles.descriptionText}>{occurrence.description_formal}</Text>
                </View>
            </View>

            {/* Original Transcription */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>🎙️ Relato Original</Text>
                <View style={[styles.descriptionBox, styles.originalBox]}>
                    <Text style={[styles.descriptionText, styles.originalText]}>
                        {occurrence.description_original}
                    </Text>
                </View>
            </View>

            {/* Action Timeline */}
            {occurrence.actions && occurrence.actions.length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>📓 Histórico de Tratativas</Text>
                    {occurrence.actions.map((action, idx) => {
                        const isEditing = editingActionId === action.id;
                        const canEditAction = Boolean(profileId && (action.author_id === profileId || isAdmin));

                        return (
                            <View key={action.id} style={styles.timelineItem}>
                                <View style={styles.timelineDot} />
                                {idx < occurrence.actions.length - 1 && (
                                    <View style={styles.timelineLine} />
                                )}
                                <View style={styles.timelineContent}>
                                    <View style={styles.timelineHeader}>
                                        <View>
                                            <Text style={styles.timelineType}>
                                                {ACTION_TYPE_LABELS[action.action_type]}
                                            </Text>
                                            <Text style={styles.timelineDate}>
                                                {new Date(action.created_at).toLocaleDateString('pt-BR', {
                                                    day: '2-digit',
                                                    month: '2-digit',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}
                                            </Text>
                                        </View>
                                        {canEditAction && !isEditing && (
                                            <TouchableOpacity
                                                onPress={() => {
                                                    setEditingActionId(action.id);
                                                    setEditContent(action.description);
                                                }}
                                                style={styles.editActionBtn}
                                            >
                                                <Text style={styles.editActionText}>✏️ Editar</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                    <Text style={styles.timelineAuthor}>
                                        Por: {action.author?.full_name ?? '-'}
                                    </Text>

                                    {isEditing ? (
                                        <View style={{ marginTop: 8 }}>
                                            <TextInput
                                                style={styles.editInput}
                                                multiline
                                                value={editContent}
                                                onChangeText={setEditContent}
                                                textAlignVertical="top"
                                            />
                                            <View style={styles.editActions}>
                                                <TouchableOpacity
                                                    onPress={() => setEditingActionId(null)}
                                                    style={styles.editCancelBtn}
                                                >
                                                    <Text style={styles.editCancelText}>Cancelar</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    onPress={handleSaveEdit}
                                                    disabled={updateAction.isPending}
                                                    style={styles.editSaveBtn}
                                                >
                                                    {updateAction.isPending ? (
                                                        <ActivityIndicator size="small" color="#fff" />
                                                    ) : (
                                                        <Text style={styles.editSaveText}>Salvar</Text>
                                                    )}
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    ) : (
                                        <Text style={styles.timelineDescription}>
                                            {action.description}
                                        </Text>
                                    )}
                                </View>
                            </View>
                        );
                    })}
                </View>
            )}

            {/* Treatment Section */}
            {canTreat && !showTreatment && (
                <View style={styles.treatmentPrompt}>
                    <Text style={styles.treatmentPromptTitle}>
                        {occurrence.status === OccurrenceStatus.ESCALATED_VP
                            ? '🏦 Devolutiva da Vice-Direção'
                            : '📚 Registrar Tratativa'}
                    </Text>
                    <Text style={styles.treatmentHint}>{getTreatmentHint()}</Text>
                    <TouchableOpacity
                        style={styles.treatButton}
                        onPress={() => setShowTreatment(true)}
                    >
                        <Text style={styles.treatButtonText}>📝 Registrar Providência</Text>
                    </TouchableOpacity>
                </View>
            )}

            {canTreat && showTreatment && (
                <View style={styles.treatmentSection}>
                    <Text style={styles.treatmentTitle}>
                        {isVP ? '🏦 Registrar Devolutiva' : '📚 Registrar Providência'}
                    </Text>
                    <Text style={styles.treatmentHint}>{getTreatmentHint()}</Text>

                    {/* Audio option */}
                    <Text style={styles.inputSectionLabel}>🎙️ Gravar o relato da providência (opcional)</Text>
                    <AudioRecorder
                        onTranscriptionComplete={handleTranscriptionComplete}
                        isProcessing={processText.isPending}
                    />

                    <Text style={styles.orDivider}>— OU DIGITAR ABAIXO —</Text>

                    <Text style={styles.inputSectionLabel}>✌️ Descreva a providência tomada</Text>
                    <TextInput
                        style={styles.textInput}
                        multiline
                        placeholder="Ex: Realizei conversa com o aluno e seus responsáveis..."
                        placeholderTextColor={COLORS.textMuted}
                        value={manualTreatmentText}
                        onChangeText={setManualTreatmentText}
                        textAlignVertical="top"
                    />

                    <TouchableOpacity
                        style={[styles.actionBtn, styles.aiBtn, processText.isPending && { opacity: 0.7 }]}
                        onPress={handleTextSubmit}
                        disabled={processText.isPending}
                    >
                        {processText.isPending ? (
                            <ActivityIndicator size="small" color={COLORS.white} />
                        ) : (
                            <Text style={styles.actionBtnText}>✨ Formatar com IA (opcional)</Text>
                        )}
                    </TouchableOpacity>

                    {/* Action buttons */}
                    <View style={styles.actionButtons}>
                        {occurrence.status !== OccurrenceStatus.CONCLUDED && (
                            <TouchableOpacity
                                style={[styles.actionBtn, styles.resolveBtn]}
                                onPress={() => {
                                    handleSubmitAction(isVP ? 'vp_resolve' : 'resolve');
                                }}
                            >
                                <Text style={styles.actionBtnText}>✔ Concluir Ocorrência</Text>
                            </TouchableOpacity>
                        )}
                        {occurrence.status === OccurrenceStatus.PENDING_TUTOR && !isVP && (
                            <TouchableOpacity
                                style={[styles.actionBtn, styles.escalateBtn]}
                                onPress={() => {
                                    handleSubmitAction('escalate');
                                }}
                            >
                                <Text style={styles.actionBtnText}>⬆️ Encaminhar à Vice-Direção</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    <TouchableOpacity style={styles.cancelTreatBtn} onPress={() => setShowTreatment(false)}>
                        <Text style={styles.cancelTreatText}>Cancelar</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Export PDF + WhatsApp notification (concluded only) */}
            {occurrence.status === OccurrenceStatus.CONCLUDED && (
                <View style={[styles.section, { borderTopWidth: 0, paddingBottom: 0, paddingTop: 10, gap: 10 }]}>
                    <TouchableOpacity
                        style={[styles.actionBtn, styles.pdfBtn]}
                        onPress={handleExportPDF}
                    >
                        <Text style={styles.actionBtnText}>📄 Exportar Relatório em PDF</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionBtn, styles.whatsappBtn]}
                        onPress={handleSendWhatsApp}
                    >
                        <Text style={styles.actionBtnText}>📱 Notificar Responsável via WhatsApp</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Admin & VP: Delete */}
            {(isAdmin || isVP) && (
                <View style={styles.adminSection}>
                    <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={handleDelete}
                    >
                        <Text style={styles.deleteBtnText}>🗑️ Excluir Ocorrência Permanentemente</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Loading overlay for action submission */}
            {addAction.isPending && (
                <View style={styles.savingOverlay}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={styles.savingText}>Salvando tratativa...</Text>
                </View>
            )}

            {/* AI Review Modal for treatment */}
            <AIReviewModal
                visible={showReviewModal}
                originalText={treatmentOriginal}
                formalText={treatmentFormal}
                onConfirm={handleConfirmReview}
                onReRecord={() => {
                    setShowReviewModal(false);
                    setTreatmentOriginal('');
                    setTreatmentFormal('');
                }}
                onClose={() => setShowReviewModal(false)}
            />
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
        paddingBottom: 60,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background,
        gap: 12,
    },
    loadingText: {
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    errorIcon: {
        fontSize: 48,
        marginBottom: 8,
    },
    errorText: {
        fontSize: 16,
        color: COLORS.textSecondary,
        marginBottom: 16,
    },
    backLinkButton: {
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    backLinkText: {
        color: COLORS.primary,
        fontWeight: '600',
        fontSize: 15,
    },
    headerCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: COLORS.border + '30',
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    date: {
        fontSize: 12,
        color: COLORS.textMuted,
    },
    studentName: {
        fontSize: 22,
        fontWeight: '800',
        color: COLORS.textPrimary,
    },
    className: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginTop: 2,
        marginBottom: 12,
    },
    metaRow: {
        flexDirection: 'row',
        gap: 20,
    },
    metaItem: {},
    metaLabel: {
        fontSize: 11,
        color: COLORS.textMuted,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    metaValue: {
        fontSize: 14,
        color: COLORS.textPrimary,
        fontWeight: '500',
        marginTop: 2,
    },
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: 10,
    },
    descriptionBox: {
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: COLORS.border + '30',
    },
    descriptionText: {
        fontSize: 15,
        color: COLORS.textPrimary,
        lineHeight: 24,
    },
    originalBox: {
        backgroundColor: COLORS.surfaceLight + '50',
        borderColor: COLORS.border + '20',
    },
    originalText: {
        fontStyle: 'italic',
        color: COLORS.textSecondary,
    },
    timelineItem: {
        flexDirection: 'row',
        marginBottom: 12,
        paddingLeft: 4,
    },
    timelineDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: COLORS.primary,
        marginTop: 6,
        marginRight: 12,
        zIndex: 1,
    },
    timelineLine: {
        position: 'absolute',
        left: 8,
        top: 16,
        bottom: -12,
        width: 2,
        backgroundColor: COLORS.border + '40',
    },
    timelineContent: {
        flex: 1,
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: COLORS.border + '20',
    },
    timelineHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 4,
    },
    timelineType: {
        fontSize: 13,
        fontWeight: '700',
        color: COLORS.primary,
    },
    timelineDate: {
        fontSize: 11,
        color: COLORS.textMuted,
        marginTop: 2,
    },
    timelineAuthor: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginBottom: 6,
    },
    timelineDescription: {
        fontSize: 14,
        color: COLORS.textPrimary,
        lineHeight: 22,
    },
    editActionBtn: {
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    editActionText: {
        color: COLORS.primary,
        fontSize: 13,
        fontWeight: '600',
    },
    editInput: {
        minHeight: 80,
        backgroundColor: COLORS.background,
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.border,
        color: COLORS.textPrimary,
        fontSize: 14,
    },
    editActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 8,
        gap: 8,
    },
    editCancelBtn: {
        paddingVertical: 8,
        paddingHorizontal: 14,
    },
    editCancelText: {
        color: COLORS.textMuted,
        fontWeight: '600',
    },
    editSaveBtn: {
        backgroundColor: COLORS.primary,
        paddingVertical: 8,
        paddingHorizontal: 18,
        borderRadius: 8,
        minWidth: 70,
        alignItems: 'center',
    },
    editSaveText: {
        color: '#fff',
        fontWeight: '700',
    },
    treatmentPrompt: {
        backgroundColor: COLORS.primary + '10',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: COLORS.primary + '30',
        marginTop: 8,
        marginBottom: 16,
    },
    treatmentPromptTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: 6,
    },
    treatmentHint: {
        fontSize: 14,
        color: COLORS.textSecondary,
        lineHeight: 22,
        marginBottom: 16,
    },
    treatButton: {
        backgroundColor: COLORS.primary,
        borderRadius: 12,
        paddingHorizontal: 24,
        paddingVertical: 14,
        alignItems: 'center',
    },
    treatButtonText: {
        fontSize: 15,
        fontWeight: '700',
        color: COLORS.white,
    },
    treatmentSection: {
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        padding: 20,
        marginTop: 8,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: COLORS.border + '30',
    },
    treatmentTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: 6,
    },
    inputSectionLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.textSecondary,
        marginBottom: 8,
        marginTop: 4,
    },
    orDivider: {
        textAlign: 'center',
        marginVertical: 16,
        color: COLORS.textMuted,
        fontWeight: '700',
        fontSize: 12,
        letterSpacing: 1,
    },
    textInput: {
        backgroundColor: COLORS.background,
        borderRadius: 12,
        padding: 16,
        color: COLORS.textPrimary,
        minHeight: 120,
        textAlignVertical: 'top',
        fontSize: 15,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: COLORS.border + '50',
        lineHeight: 22,
    },
    actionButtons: {
        gap: 10,
        marginTop: 16,
    },
    adminSection: {
        marginTop: 24,
        marginBottom: 8,
    },
    actionBtn: {
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    aiBtn: {
        backgroundColor: '#4E5BA6',
        marginBottom: 4,
    },
    pdfBtn: {
        backgroundColor: COLORS.primary,
    },
    whatsappBtn: {
        backgroundColor: '#25D366',
    },
    resolveBtn: {
        backgroundColor: COLORS.success,
    },
    escalateBtn: {
        backgroundColor: COLORS.warning,
    },
    deleteBtn: {
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        backgroundColor: '#FF444415',
        borderWidth: 1.5,
        borderColor: COLORS.error,
    },
    deleteBtnText: {
        fontSize: 15,
        fontWeight: '700',
        color: COLORS.error,
    },
    actionBtnText: {
        fontSize: 15,
        fontWeight: '700',
        color: COLORS.white,
    },
    cancelTreatBtn: {
        paddingVertical: 12,
        alignItems: 'center',
        marginTop: 8,
    },
    cancelTreatText: {
        fontSize: 14,
        color: COLORS.textMuted,
        fontWeight: '500',
    },
    savingOverlay: {
        alignItems: 'center',
        paddingVertical: 24,
    },
    savingText: {
        marginTop: 8,
        fontSize: 14,
        color: COLORS.textSecondary,
    },
});