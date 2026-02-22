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
import { useOccurrenceDetail, useAddAction, useUpdateAction, useProcessAudio, useProcessText, useDeleteOccurrence } from '../../../src/hooks/useOccurrences';
import { generateOccurrencePDF } from '../../../src/utils/pdfGenerator';
import { useProfile } from '../../../src/hooks/useProfile';
import { StatusBadge } from '../../../src/components/StatusBadge';
import { AudioRecorder } from '../../../src/components/AudioRecorder';
import { AIReviewModal } from '../../../src/components/AIReviewModal';
import {
    OccurrenceStatus,
    ActionType,
    UserRole,
} from '../../../src/types/database';
import { COLORS, ACTION_TYPE_LABELS } from '../../../src/lib/constants';

export default function OccurrenceDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { profileId, role } = useProfile();

    const { data: occurrence, isLoading } = useOccurrenceDetail(id ?? '');
    const addAction = useAddAction();
    const processAudio = useProcessAudio();

    // Treatment state
    const [showTreatment, setShowTreatment] = useState(false);
    const [treatmentOriginal, setTreatmentOriginal] = useState('');
    const [treatmentFormal, setTreatmentFormal] = useState('');
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [pendingActionType, setPendingActionType] = useState<'resolve' | 'escalate' | 'vp_resolve'>('resolve');
    const [manualTreatmentText, setManualTreatmentText] = useState('');
    const processText = useProcessText();
    const updateAction = useUpdateAction();
    const [editingActionId, setEditingActionId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState('');

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

    // Handle recorded audio for treatment
    const handleTreatmentAudio = useCallback(async (audioUri: string) => {
        try {
            const result = await processAudio.mutateAsync(audioUri);
            setTreatmentOriginal(result.original);
            setTreatmentFormal(result.formal);
            setShowReviewModal(true);
        } catch (err) {
            Alert.alert('Erro', 'Falha ao processar o áudio.');
        }
    }, [processAudio]);

    const deleteOccurrence = useDeleteOccurrence();

    const handleDelete = useCallback(() => {
        if (!occurrence) return;

        const performDelete = async () => {
            try {
                await deleteOccurrence.mutateAsync(occurrence.id);
                if (Platform.OS === 'web') window.alert('Ocorrência excluída com sucesso.');
                else Alert.alert('Sucesso', 'Ocorrência excluída com sucesso.');
                router.replace('/(app)/occurrences' as any);
            } catch (err: any) {
                const msg = err.message || 'Falha ao excluir ocorrência.';
                if (Platform.OS === 'web') window.alert('Erro: ' + msg);
                else Alert.alert('Erro', msg);
            }
        };

        if (Platform.OS === 'web') {
            if (window.confirm('Deseja realmente excluir esta ocorrência de forma permanente?')) performDelete();
        } else {
            Alert.alert(
                'Confirmar Exclusão',
                'Deseja realmente excluir esta ocorrência de forma permanente?',
                [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Excluir', style: 'destructive', onPress: performDelete }
                ]
            );
        }
    }, [occurrence, deleteOccurrence]);

    const handleExportPDF = async () => {
        if (!occurrence) return;
        try {
            await generateOccurrencePDF(occurrence);
        } catch (err) {
            if (Platform.OS === 'web') window.alert('Erro ao gerar PDF.');
            else Alert.alert('Erro', 'Falha ao exportar PDF.');
        }
    };

    // Handle text treatment
    const handleTextSubmit = async () => {
        if (!manualTreatmentText.trim()) {
            if (Platform.OS === 'web') window.alert('Digite a providência primeiro.');
            else Alert.alert('Aviso', 'Digite os detalhes da providência.');
            return;
        }
        try {
            const result = await processText.mutateAsync(manualTreatmentText);
            setTreatmentOriginal(result.original);
            setTreatmentFormal(result.formal);
            setShowReviewModal(true);
        } catch (err) {
            console.error('Text processing error:', err);
            Alert.alert('Erro', 'Falha ao processar texto.');
        }
    };

    // Submit treatment action
    const handleSubmitAction = useCallback(async (description: string) => {
        if (!occurrence || !profileId) return;

        setShowReviewModal(false);

        let actionType: ActionType;
        let newStatus: OccurrenceStatus;

        if (pendingActionType === 'resolve') {
            actionType = ActionType.RESOLUTION;
            newStatus = OccurrenceStatus.CONCLUDED;
        } else if (pendingActionType === 'escalate') {
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
                description,
                action_type: actionType,
                newStatus,
            });

            if (Platform.OS === 'web') {
                window.alert('Tratativa registrada com sucesso!');
                router.back();
            } else {
                Alert.alert('Sucesso', 'Tratativa registrada com sucesso!', [
                    { text: 'OK', onPress: () => router.back() },
                ]);
            }
        } catch (err) {
            Alert.alert('Erro', 'Falha ao registrar a tratativa.');
        }
    }, [occurrence, profileId, pendingActionType, addAction]);

    const handleSaveEdit = async () => {
        if (!editingActionId || !editContent.trim()) return;
        try {
            await updateAction.mutateAsync({ id: editingActionId, description: editContent.trim() });
            setEditingActionId(null);
            setEditContent('');
            if (Platform.OS === 'web') window.alert('Tratativa atualizada com sucesso.');
            else Alert.alert('Sucesso', 'Tratativa atualizada com sucesso.');
        } catch (err) {
            console.error(err);
            Alert.alert('Erro', 'Falha ao atualizar tratativa.');
        }
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    if (!occurrence) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={styles.errorText}>Ocorrência não encontrada.</Text>
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
                        <Text style={styles.metaLabel}>Autor</Text>
                        <Text style={styles.metaValue}>{occurrence.author?.full_name ?? '-'}</Text>
                    </View>
                    <View style={styles.metaItem}>
                        <Text style={styles.metaLabel}>Tutor</Text>
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
                <Text style={styles.sectionTitle}>🎙️ Transcrição Original</Text>
                <View style={[styles.descriptionBox, styles.originalBox]}>
                    <Text style={[styles.descriptionText, styles.originalText]}>
                        {occurrence.description_original}
                    </Text>
                </View>
            </View>

            {/* Action Timeline */}
            {occurrence.actions && occurrence.actions.length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>📋 Histórico de Tratativas</Text>
                    {occurrence.actions.map((action, idx) => {
                        const isEditing = editingActionId === action.id;
                        const canEditAction = Boolean(profileId && (action.author_id === profileId || role === UserRole.ADMIN));

                        return (
                            <View key={action.id} style={styles.timelineItem}>
                                <View style={styles.timelineDot} />
                                {idx < occurrence.actions.length - 1 && (
                                    <View style={styles.timelineLine} />
                                )}
                                <View style={styles.timelineContent}>
                                    <View style={[styles.timelineHeader, { justifyContent: 'space-between', alignItems: 'flex-start' }]}>
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
                                                style={{ padding: 4 }}
                                            >
                                                <Text style={{ color: COLORS.primary, fontSize: 16 }}>✏️ Editar</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                    <Text style={styles.timelineAuthor}>
                                        Por: {action.author?.full_name ?? '-'}
                                    </Text>

                                    {isEditing ? (
                                        <View style={{ marginTop: 8 }}>
                                            <TextInput
                                                style={{ minHeight: 80, backgroundColor: '#fff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border }}
                                                multiline
                                                value={editContent}
                                                onChangeText={setEditContent}
                                            />
                                            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8, gap: 8 }}>
                                                <TouchableOpacity
                                                    onPress={() => setEditingActionId(null)}
                                                    style={{ paddingVertical: 6, paddingHorizontal: 12 }}
                                                >
                                                    <Text style={{ color: COLORS.textMuted, fontWeight: '600' }}>Cancelar</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    onPress={handleSaveEdit}
                                                    disabled={updateAction.isPending}
                                                    style={{ backgroundColor: COLORS.primary, paddingVertical: 6, paddingHorizontal: 16, borderRadius: 6 }}
                                                >
                                                    {updateAction.isPending ? (
                                                        <ActivityIndicator size="small" color="#fff" />
                                                    ) : (
                                                        <Text style={{ color: '#fff', fontWeight: 'bold' }}>Salvar</Text>
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
                    <Text style={styles.treatmentTitle}>
                        {occurrence.status === OccurrenceStatus.ESCALATED_VP
                            ? '🏢 Devolutiva da Vice-Direção'
                            : '📣 Registrar Tratativa'}
                    </Text>
                    <TouchableOpacity
                        style={styles.treatButton}
                        onPress={() => setShowTreatment(true)}
                    >
                        <Text style={styles.treatButtonText}>📝 Inserir Parecer e Concluir / Encaminhar</Text>
                    </TouchableOpacity>
                </View>
            )}

            {canTreat && showTreatment && (
                <View style={styles.treatmentSection}>
                    <Text style={styles.treatmentTitle}>🎙️ Gravar Providência</Text>

                    <AudioRecorder
                        onRecordingComplete={handleTreatmentAudio}
                        isProcessing={processAudio.isPending}
                    />

                    <Text style={styles.orDivider}>- OU -</Text>

                    <TextInput
                        style={styles.textInput}
                        multiline
                        placeholder="Digite a providência tomada..."
                        placeholderTextColor={COLORS.textMuted}
                        value={manualTreatmentText}
                        onChangeText={setManualTreatmentText}
                    />

                    <TouchableOpacity
                        style={[styles.actionBtn, styles.textSubmitBtn, processText.isPending && { opacity: 0.7 }]}
                        onPress={handleTextSubmit}
                        disabled={processText.isPending}
                    >
                        {processText.isPending ? (
                            <ActivityIndicator size="small" color={COLORS.white} />
                        ) : (
                            <Text style={styles.actionBtnText}>✨ Processar Texto com IA</Text>
                        )}
                    </TouchableOpacity>

                    {/* Action buttons */}
                    <View style={styles.actionButtons}>
                        {occurrence.status !== OccurrenceStatus.CONCLUDED && (
                            <TouchableOpacity
                                style={[styles.actionBtn, styles.resolveBtn]}
                                onPress={async () => {
                                    setPendingActionType(
                                        role === UserRole.VICE_DIRECTOR ? 'vp_resolve' : 'resolve'
                                    );
                                    if (treatmentFormal) {
                                        setShowReviewModal(true);
                                    } else if (manualTreatmentText.trim()) {
                                        await handleTextSubmit();
                                    } else {
                                        if (Platform.OS === 'web') window.alert('Grave o áudio ou digite o texto primeiro e processe.');
                                        else Alert.alert('Atenção', 'Grave o áudio ou digite a providência primeiro.');
                                    }
                                }}
                            >
                                <Text style={styles.actionBtnText}>✅ Concluir</Text>
                            </TouchableOpacity>
                        )}
                        {occurrence.status === OccurrenceStatus.PENDING_TUTOR && role !== UserRole.VICE_DIRECTOR && (
                            <TouchableOpacity
                                style={[styles.actionBtn, styles.escalateBtn]}
                                onPress={async () => {
                                    setPendingActionType('escalate');
                                    if (treatmentFormal) {
                                        setShowReviewModal(true);
                                    } else if (manualTreatmentText.trim()) {
                                        await handleTextSubmit();
                                    } else {
                                        if (Platform.OS === 'web') window.alert('Grave o áudio ou digite o texto primeiro e processe.');
                                        else Alert.alert('Atenção', 'Grave o áudio ou digite o texto primeiro.');
                                    }
                                }}
                            >
                                <Text style={styles.actionBtnText}>⬆️ Escalar para Vice-Direção</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            )}

            {role === UserRole.ADMIN && (
                <View style={styles.adminSection}>
                    <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: '#FF4444' }]}
                        onPress={handleDelete}
                    >
                        <Text style={styles.actionBtnText}>Excluir Ocorrência</Text>
                    </TouchableOpacity>
                </View>
            )}

            {occurrence.status === OccurrenceStatus.CONCLUDED && (
                <View style={[styles.section, { borderTopWidth: 0, paddingBottom: 0, paddingTop: 10 }]}>
                    <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={handleExportPDF}
                    >
                        <Text style={styles.actionBtnText}>📄 Exportar Relatório em PDF</Text>
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
                onConfirm={handleSubmitAction}
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
        paddingBottom: 40,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background,
    },
    errorText: {
        fontSize: 16,
        color: COLORS.textSecondary,
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
    },
    timelineAuthor: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginBottom: 6,
    },
    timelineDescription: {
        fontSize: 14,
        color: COLORS.textPrimary,
        lineHeight: 24,
    },
    orDivider: {
        textAlign: 'center',
        marginVertical: 16,
        color: COLORS.textMuted,
        fontWeight: 'bold',
        fontSize: 14,
    },
    textInput: {
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        padding: 16,
        color: COLORS.textPrimary,
        minHeight: 120,
        textAlignVertical: 'top',
        fontSize: 15,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: COLORS.border + '30',
    },
    treatmentPrompt: {
        backgroundColor: COLORS.primary + '10',
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.primary + '30',
        marginTop: 8,
    },
    treatmentTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: 12,
    },
    treatButton: {
        backgroundColor: COLORS.primary,
        borderRadius: 12,
        paddingHorizontal: 24,
        paddingVertical: 12,
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
        borderWidth: 1,
        borderColor: COLORS.border + '30',
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 16,
    },
    adminSection: {
        marginTop: 24,
        paddingHorizontal: 16,
    },
    actionBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    textSubmitBtn: {
        backgroundColor: '#4E5BA6',
        marginBottom: 20,
    },
    resolveBtn: {
        backgroundColor: COLORS.success,
    },
    escalateBtn: {
        backgroundColor: COLORS.warning,
    },
    actionBtnText: {
        fontSize: 15,
        fontWeight: '700',
        color: COLORS.white,
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
