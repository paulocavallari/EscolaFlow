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
import {
    NotePencil,
    Microphone,
    Notebook,
    Trash,
    MapPin,
    Tag,
    FilePdf,
    WhatsappLogo,
    CheckCircle,
    ArrowUp,
    PencilSimple,
    Sparkle,
    Buildings,
    BookOpen,
    WarningCircle,
    ArrowLeft,
} from 'phosphor-react-native';
import { useOccurrenceDetail, useAddAction, useUpdateAction, useDeleteOccurrence } from '../../../src/hooks/useOccurrences';
import { AIProcessingIndicator } from '../../../src/components/AIProcessingIndicator';
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
    OccurrenceCategory,
    OccurrenceFinalCategory,
} from '../../../src/types/database';
import { ACTION_TYPE_LABELS, LOCATION_LABELS, CATEGORY_LABELS, FINAL_CATEGORIES, FINAL_CATEGORY_LABELS } from '../../../src/lib/constants';
import { sendWhatsAppMessage } from '../../../src/services/whatsappService';
import { showAlert, showConfirmDialog, showDoubleConfirmDialog } from '../../../src/utils/confirmDialogs';
import {
    buildGuardianNotificationMessage,
    buildVPEscalationNotificationMessage,
} from '../../../src/services/messageBuilders';
import { useAITextProcessing } from '../../../src/hooks/useAITextProcessing';
import { useTheme, typography } from '../../../src/lib/theme';

export default function OccurrenceDetailScreen() {
    const { colors } = useTheme();
    const { id } = useLocalSearchParams<{ id: string }>();
    const { profileId, role } = useProfile();

    const { data: occurrence, isLoading } = useOccurrenceDetail(id ?? '');
    const addAction = useAddAction();
    const aiText = useAITextProcessing();

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
    const [selectedCategory, setSelectedCategory] = useState<OccurrenceCategory | null>(null);
    const [showCategoryPicker, setShowCategoryPicker] = useState(false);
    const [selectedFinalCategory, setSelectedFinalCategory] = useState<OccurrenceFinalCategory | null>(null);
    const [showFinalCategoryPicker, setShowFinalCategoryPicker] = useState(false);

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

    // Shared handler when AI is unavailable — lets user pick between saving as-is or retrying later
    const handleAIUnavailable = useCallback(
        (original: string, onProceed: () => void) => {
            if (Platform.OS === 'web') {
                const proceed = window.confirm(
                    'Não foi possível reescrever o texto com IA no momento.\n\nClique OK para salvar usando o texto original, ou Cancelar para tentar novamente mais tarde.'
                );
                if (proceed) onProceed();
            } else {
                Alert.alert(
                    'IA indisponível',
                    'Não foi possível reescrever o texto com IA no momento. O que deseja fazer?',
                    [
                        { text: 'Salvar com texto original', onPress: onProceed },
                        { text: 'Tentar mais tarde', style: 'cancel' },
                    ]
                );
            }
        },
        []
    );

    // Handle recorded audio for treatment
    const handleTranscriptionComplete = useCallback(async (text: string) => {
        if (!text.trim()) return;
        await aiText.processTextWithAI(
            text,
            (result) => {
                if (result.aiUnavailable) {
                    handleAIUnavailable(result.original, () => {
                        setTreatmentOriginal(result.original);
                        setTreatmentFormal(result.original);
                        setShowReviewModal(true);
                    });
                    return;
                }
                setTreatmentOriginal(result.original);
                setTreatmentFormal(result.formal);
                setShowReviewModal(true);
            },
            (err) => {
                Alert.alert('Erro no processamento', err.message);
            }
        );
    }, [aiText, handleAIUnavailable]);

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

        showDoubleConfirmDialog(
            '🗑️ Confirmar Exclusão',
            'Deseja realmente excluir esta ocorrência de forma permanente? Esta ação não pode ser desfeita.',
            '⚠️ CONFIRMAÇÃO FINAL\n\nTem CERTEZA ABSOLUTA? Todos os dados desta ocorrência serão perdidos permanentemente.',
            performDelete
        );
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
            showAlert('Sem número cadastrado', 'Este aluno não possui telefone do responsável cadastrado. Adicione-o na tela de Alunos do painel administrativo.');
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

        const message = buildGuardianNotificationMessage(
            occurrence.student?.name ?? 'N/A',
            occurrence.student?.class?.name ?? 'N/A',
            occurrence.author?.full_name ?? 'Professor(a)',
            occurrenceDescription,
            parecerText,
        );

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

        showConfirmDialog(
            '📱 Enviar notificação WhatsApp',
            `Enviar mensagem ao responsável do(a) ${occurrence.student?.name ?? 'aluno'}?\n\nNúmero: ${guardianPhone}`,
            'Enviar',
            doSend
        );
    }, [occurrence]);

    // Handle text treatment: process with AI
    const handleTextSubmit = async () => {
        if (!manualTreatmentText.trim()) {
            Alert.alert('Aviso', 'Digite os detalhes da providência antes de continuar.');
            return;
        }
        await aiText.processTextWithAI(
            manualTreatmentText,
            (result) => {
                if (result.aiUnavailable) {
                    handleAIUnavailable(result.original, () => {
                        setTreatmentOriginal(result.original);
                        setTreatmentFormal(result.original);
                        setShowReviewModal(true);
                    });
                    return;
                }
                setTreatmentOriginal(result.original);
                setTreatmentFormal(result.formal);
                setShowReviewModal(true);
            },
            (err) => {
                Alert.alert('Erro no processamento', err.message);
            }
        );
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
            const effectiveCategory = selectedCategory ?? occurrence.category;

            // Block conclude if category is still OUTRO.
            if (
                newStatus === OccurrenceStatus.CONCLUDED &&
                effectiveCategory === OccurrenceCategory.OUTRO
            ) {
                if (isVP || isAdmin) {
                    if (!selectedFinalCategory) {
                        Alert.alert(
                            'Categoria Final Obrigatória',
                            'Como a ocorrência está em "Outro Tipo de Ocorrência", selecione uma Categoria Final antes de concluir.'
                        );
                        setShowFinalCategoryPicker(true);
                        return;
                    }
                } else {
                    Alert.alert(
                        'Categoria Obrigatória',
                        'Como a ocorrência está em "Outro Tipo de Ocorrência", selecione a categoria correta antes de concluir.'
                    );
                    setShowCategoryPicker(true);
                    return;
                }
            }

            await addAction.mutateAsync({
                occurrence_id: occurrence.id,
                author_id: profileId,
                description: manualTreatmentText.trim(),
                action_type: actionType,
                newStatus,
                ...(effectiveCategory !== occurrence.category ? { category: effectiveCategory } : {}),
                ...(selectedFinalCategory ? { final_category: selectedFinalCategory } : {}),
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
                            buildVPEscalationNotificationMessage(
                                occurrence.student?.name ?? 'N/A',
                                occurrence.student?.class?.name ?? 'N/A',
                                occurrence.author?.full_name ?? 'N/A',
                                manualTreatmentText.trim()
                            );
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
    }, [occurrence, profileId, manualTreatmentText, addAction, selectedCategory, selectedFinalCategory, isVP, isAdmin]);

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
            <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.onSurfaceVariant }]}>Carregando ocorrência...</Text>
            </View>
        );
    }

    if (!occurrence) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
                <View style={[styles.errorIconCircle, { backgroundColor: colors.surfaceVariant }]}>
                    <WarningCircle size={40} color={colors.onSurfaceVariant} weight="duotone" />
                </View>
                <Text style={[styles.errorText, { color: colors.onSurfaceVariant }]}>Ocorrência não encontrada.</Text>
                <TouchableOpacity style={styles.backLinkButton} onPress={() => router.back()}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <ArrowLeft size={16} color={colors.primary} />
                        <Text style={[styles.backLinkText, { color: colors.primary }]}>Voltar à lista</Text>
                    </View>
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
        <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
            {/* Header Info */}
            <View style={[styles.headerCard, { backgroundColor: colors.surface, borderColor: colors.outline + '30' }]}>
                <View style={styles.headerTop}>
                    <StatusBadge status={occurrence.status} />
                    <Text style={[styles.date, { color: colors.onSurfaceVariant }]}>{createdDate}</Text>
                </View>

                <Text style={[styles.studentName, { color: colors.onSurface }]}>
                    {occurrence.student?.name ?? 'Aluno'}
                </Text>
                <Text style={[styles.className, { color: colors.onSurfaceVariant }]}>
                    {occurrence.student?.class?.name ?? ''}
                </Text>

                <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                        <Text style={[styles.metaLabel, { color: colors.onSurfaceVariant }]}>Registrado por</Text>
                        <Text style={[styles.metaValue, { color: colors.onSurface }]}>{occurrence.author?.full_name ?? '-'}</Text>
                    </View>
                    <View style={styles.metaItem}>
                        <Text style={[styles.metaLabel, { color: colors.onSurfaceVariant }]}>Tutor(a)</Text>
                        <Text style={[styles.metaValue, { color: colors.onSurface }]}>{occurrence.tutor?.full_name ?? '-'}</Text>
                    </View>
                </View>

                {/* Location & Category */}
                <View style={[styles.metaRow, { marginTop: 12 }]}>
                    {occurrence.location && (
                        <View style={styles.metaItem}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <MapPin size={12} color={colors.onSurfaceVariant} />
                                <Text style={[styles.metaLabel, { color: colors.onSurfaceVariant }]}>Local</Text>
                            </View>
                            <Text style={[styles.metaValue, { color: colors.onSurface }]}>{LOCATION_LABELS[occurrence.location as keyof typeof LOCATION_LABELS] ?? occurrence.location}</Text>
                        </View>
                    )}
                    {occurrence.category && (
                        <View style={styles.metaItem}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <Tag size={12} color={colors.onSurfaceVariant} />
                                <Text style={[styles.metaLabel, { color: colors.onSurfaceVariant }]}>Categoria</Text>
                            </View>
                            <Text style={[styles.metaValue, { color: colors.onSurface }]}>{CATEGORY_LABELS[occurrence.category as keyof typeof CATEGORY_LABELS] ?? occurrence.category}</Text>
                        </View>
                    )}
                </View>
            </View>

            {/* Formal Description */}
            <View style={styles.section}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <NotePencil size={18} color={colors.onSurface} weight="bold" />
                    <Text style={[styles.sectionTitle, { color: colors.onSurface, marginBottom: 0 }]}>Descrição Formal</Text>
                </View>
                <View style={[styles.descriptionBox, { backgroundColor: colors.surface, borderColor: colors.outline + '30' }]}>
                    <Text style={[styles.descriptionText, { color: colors.onSurface }]}>{occurrence.description_formal}</Text>
                </View>
            </View>

            {/* Original Transcription */}
            <View style={styles.section}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <Microphone size={18} color={colors.onSurface} weight="bold" />
                    <Text style={[styles.sectionTitle, { color: colors.onSurface, marginBottom: 0 }]}>Relato Original</Text>
                </View>
                <View style={[styles.descriptionBox, styles.originalBox, { backgroundColor: colors.surfaceVariant + '50', borderColor: colors.outline + '20' }]}>
                    <Text style={[styles.descriptionText, styles.originalText, { color: colors.onSurfaceVariant }]}>
                        {occurrence.description_original}
                    </Text>
                </View>
            </View>

            {/* Action Timeline */}
            {occurrence.actions && occurrence.actions.length > 0 && (
                <View style={styles.section}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        <Notebook size={18} color={colors.onSurface} weight="bold" />
                        <Text style={[styles.sectionTitle, { color: colors.onSurface, marginBottom: 0 }]}>Histórico de Tratativas</Text>
                    </View>
                    {occurrence.actions.map((action, idx) => {
                        const isEditing = editingActionId === action.id;
                        const canEditAction = Boolean(profileId && (action.author_id === profileId || isAdmin));

                        return (
                            <View key={action.id} style={styles.timelineItem}>
                                <View style={[styles.timelineDot, { backgroundColor: colors.primary }]} />
                                {idx < occurrence.actions.length - 1 && (
                                    <View style={[styles.timelineLine, { backgroundColor: colors.outline + '40' }]} />
                                )}
                                <View style={[styles.timelineContent, { backgroundColor: colors.surface, borderColor: colors.outline + '20' }]}>
                                    <View style={styles.timelineHeader}>
                                        <View>
                                            <Text style={[styles.timelineType, { color: colors.primary }]}>
                                                {ACTION_TYPE_LABELS[action.action_type]}
                                            </Text>
                                            <Text style={[styles.timelineDate, { color: colors.onSurfaceVariant }]}>
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
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                                    <PencilSimple size={14} color={colors.primary} />
                                                    <Text style={[styles.editActionText, { color: colors.primary }]}>Editar</Text>
                                                </View>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                    <Text style={[styles.timelineAuthor, { color: colors.onSurfaceVariant }]}>
                                        Por: {action.author?.full_name ?? '-'}
                                    </Text>

                                    {isEditing ? (
                                        <View style={{ marginTop: 8 }}>
                                            <TextInput
                                                style={[styles.editInput, { backgroundColor: colors.background, borderColor: colors.outline, color: colors.onSurface }]}
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
                                                    <Text style={[styles.editCancelText, { color: colors.onSurfaceVariant }]}>Cancelar</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    onPress={handleSaveEdit}
                                                    disabled={updateAction.isPending}
                                                    style={[styles.editSaveBtn, { backgroundColor: colors.primary }]}
                                                >
                                                    {updateAction.isPending ? (
                                                        <ActivityIndicator size="small" color={colors.onPrimary} />
                                                    ) : (
                                                        <Text style={[styles.editSaveText, { color: colors.onPrimary }]}>Salvar</Text>
                                                    )}
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    ) : (
                                        <Text style={[styles.timelineDescription, { color: colors.onSurface }]}>
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
                <View style={[styles.treatmentPrompt, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        {occurrence.status === OccurrenceStatus.ESCALATED_VP
                            ? <Buildings size={20} color={colors.onSurface} weight="bold" />
                            : <BookOpen size={20} color={colors.onSurface} weight="bold" />}
                        <Text style={[styles.treatmentPromptTitle, { color: colors.onSurface }]}>
                            {occurrence.status === OccurrenceStatus.ESCALATED_VP
                                ? 'Devolutiva da Vice-Direção'
                                : 'Registrar Tratativa'}
                        </Text>
                    </View>
                    <Text style={[styles.treatmentHint, { color: colors.onSurfaceVariant }]}>{getTreatmentHint()}</Text>
                    <TouchableOpacity
                        style={[styles.treatButton, { backgroundColor: colors.primary }]}
                        onPress={() => setShowTreatment(true)}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <NotePencil size={18} color={colors.onPrimary} weight="bold" />
                            <Text style={[styles.treatButtonText, { color: colors.onPrimary }]}>Registrar Providência</Text>
                        </View>
                    </TouchableOpacity>
                </View>
            )}

            {canTreat && showTreatment && (
                <View style={[styles.treatmentSection, { backgroundColor: colors.surface, borderColor: colors.outline + '30' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        {isVP
                            ? <Buildings size={20} color={colors.onSurface} weight="bold" />
                            : <BookOpen size={20} color={colors.onSurface} weight="bold" />}
                        <Text style={[styles.treatmentTitle, { color: colors.onSurface }]}>
                            {isVP ? 'Registrar Devolutiva' : 'Registrar Providência'}
                        </Text>
                    </View>
                    <Text style={[styles.treatmentHint, { color: colors.onSurfaceVariant }]}>{getTreatmentHint()}</Text>

                    {/* Audio option */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, marginTop: 4 }}>
                        <Microphone size={16} color={colors.onSurfaceVariant} />
                        <Text style={[styles.inputSectionLabel, { color: colors.onSurfaceVariant, marginBottom: 0, marginTop: 0 }]}>Gravar o relato da providência (opcional)</Text>
                    </View>
                    <AudioRecorder
                        onTranscriptionComplete={handleTranscriptionComplete}
                        isProcessing={aiText.isPending}
                    />

                    <Text style={[styles.orDivider, { color: colors.onSurfaceVariant }]}>— OU DIGITAR ABAIXO —</Text>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        <PencilSimple size={16} color={colors.onSurfaceVariant} />
                        <Text style={[styles.inputSectionLabel, { color: colors.onSurfaceVariant, marginBottom: 0, marginTop: 0 }]}>Descreva a providência tomada</Text>
                    </View>
                    <TextInput
                        style={[styles.textInput, { backgroundColor: colors.background, borderColor: colors.outline + '50', color: colors.onSurface }]}
                        multiline
                        placeholder="Ex: Realizei conversa com o aluno e seus responsáveis..."
                        placeholderTextColor={colors.onSurfaceVariant}
                        value={manualTreatmentText}
                        onChangeText={setManualTreatmentText}
                        textAlignVertical="top"
                    />

                    {aiText.isPending ? (
                        <AIProcessingIndicator
                            label="Formatando providência com I.A."
                            onCancel={() => aiText.reset()}
                        />
                    ) : (
                        <TouchableOpacity
                            style={[styles.actionBtn, styles.aiBtn]}
                            onPress={handleTextSubmit}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Sparkle size={18} color={colors.onPrimary} weight="fill" />
                                <Text style={[styles.actionBtnText, { color: colors.onPrimary }]}>Formatar com IA (opcional)</Text>
                            </View>
                        </TouchableOpacity>
                    )}

                    {/* Unified category block: only one section */}
                    <View style={[styles.finalCategorySection, { backgroundColor: colors.warning + '15', borderColor: colors.warning + '40' }]}> 
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <Tag size={16} color={colors.onSurface} weight="bold" />
                            <Text style={[styles.finalCategoryTitle, { color: colors.onSurface }]}> 
                                {(isVP || isAdmin) && (selectedCategory ?? occurrence.category) === OccurrenceCategory.OUTRO
                                    ? 'Categoria Final (obrigatória para concluir)'
                                    : ((selectedCategory ?? occurrence.category) === OccurrenceCategory.OUTRO
                                        ? 'Categoria Final (obrigatória para concluir)'
                                        : 'Categoria da Ocorrência')}
                            </Text>
                        </View>

                        <Text style={[styles.finalCategoryHint, { color: colors.onSurfaceVariant }]}> 
                            {(isVP || isAdmin) && (selectedCategory ?? occurrence.category) === OccurrenceCategory.OUTRO
                                ? 'Esta ocorrência foi registrada como "Outro Tipo de Ocorrência". Selecione a Categoria Final usando FINAL_CATEGORIES.'
                                : ((selectedCategory ?? occurrence.category) === OccurrenceCategory.OUTRO
                                    ? 'Esta ocorrência foi registrada como "Outro Tipo de Ocorrência". Selecione a categoria correta para substituir "Outro".'
                                    : 'Tutor(a) e Vice-Diretor(a) podem ajustar a categoria escolhida no registro inicial, quando necessário.')}
                        </Text>

                        {(isVP || isAdmin) && (selectedCategory ?? occurrence.category) === OccurrenceCategory.OUTRO ? (
                            <>
                                {!showFinalCategoryPicker && !selectedFinalCategory && (
                                    <TouchableOpacity
                                        style={[styles.actionBtn, { backgroundColor: colors.warning }]}
                                        onPress={() => setShowFinalCategoryPicker(true)}
                                    >
                                        <Text style={[styles.actionBtnText, { color: colors.onPrimary }]}>Selecionar Categoria Final</Text>
                                    </TouchableOpacity>
                                )}

                                {selectedFinalCategory && !showFinalCategoryPicker && (
                                    <TouchableOpacity
                                        style={[styles.selectedCategoryChip, { backgroundColor: colors.success + '20', borderColor: colors.success + '40' }]}
                                        onPress={() => setShowFinalCategoryPicker(true)}
                                    >
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                                            <CheckCircle size={16} color={colors.success} weight="fill" />
                                            <Text style={[styles.selectedCategoryText, { color: colors.success }]}> 
                                                {FINAL_CATEGORY_LABELS[selectedFinalCategory] ?? selectedFinalCategory}
                                            </Text>
                                        </View>
                                        <Text style={[styles.changeCategoryText, { color: colors.primary }]}>Alterar</Text>
                                    </TouchableOpacity>
                                )}

                                {showFinalCategoryPicker && (
                                    <ScrollView style={[styles.finalCategoryList, { backgroundColor: colors.surface, borderColor: colors.outline + '30' }]} nestedScrollEnabled>
                                        {FINAL_CATEGORIES.map((cat) => (
                                            <TouchableOpacity
                                                key={cat}
                                                style={[
                                                    styles.finalCategoryItem,
                                                    { borderBottomColor: colors.outline + '20' },
                                                    selectedFinalCategory === cat && { backgroundColor: colors.primary + '15' },
                                                ]}
                                                onPress={() => {
                                                    setSelectedFinalCategory(cat);
                                                    setShowFinalCategoryPicker(false);
                                                }}
                                            >
                                                <Text
                                                    style={[
                                                        styles.finalCategoryItemText,
                                                        { color: colors.onSurface },
                                                        selectedFinalCategory === cat && { color: colors.primary, fontWeight: '700' },
                                                    ]}
                                                >
                                                    {FINAL_CATEGORY_LABELS[cat] ?? cat}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                )}
                            </>
                        ) : (
                            <>
                                {!showCategoryPicker && (selectedCategory ?? occurrence.category) === OccurrenceCategory.OUTRO && (
                                    <TouchableOpacity
                                        style={[styles.actionBtn, { backgroundColor: colors.warning }]}
                                        onPress={() => setShowCategoryPicker(true)}
                                    >
                                        <Text style={[styles.actionBtnText, { color: colors.onPrimary }]}>Selecionar Categoria Final</Text>
                                    </TouchableOpacity>
                                )}

                                {!showCategoryPicker && (selectedCategory ?? occurrence.category) !== OccurrenceCategory.OUTRO && (
                                    <TouchableOpacity
                                        style={[styles.selectedCategoryChip, { backgroundColor: colors.success + '20', borderColor: colors.success + '40' }]}
                                        onPress={() => setShowCategoryPicker(true)}
                                    >
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                                            <CheckCircle size={16} color={colors.success} weight="fill" />
                                            <Text style={[styles.selectedCategoryText, { color: colors.success }]}> 
                                                {CATEGORY_LABELS[(selectedCategory ?? occurrence.category) as keyof typeof CATEGORY_LABELS] ?? (selectedCategory ?? occurrence.category)}
                                            </Text>
                                        </View>
                                        <Text style={[styles.changeCategoryText, { color: colors.primary }]}>Alterar</Text>
                                    </TouchableOpacity>
                                )}

                                {showCategoryPicker && (
                                    <ScrollView style={[styles.finalCategoryList, { backgroundColor: colors.surface, borderColor: colors.outline + '30' }]} nestedScrollEnabled>
                                        {Object.values(OccurrenceCategory).map((cat) => (
                                            <TouchableOpacity
                                                key={cat}
                                                style={[
                                                    styles.finalCategoryItem,
                                                    { borderBottomColor: colors.outline + '20' },
                                                    (selectedCategory ?? occurrence.category) === cat && { backgroundColor: colors.primary + '15' },
                                                ]}
                                                onPress={() => {
                                                    setSelectedCategory(cat);
                                                    setShowCategoryPicker(false);
                                                }}
                                            >
                                                <Text
                                                    style={[
                                                        styles.finalCategoryItemText,
                                                        { color: colors.onSurface },
                                                        (selectedCategory ?? occurrence.category) === cat && { color: colors.primary, fontWeight: '700' },
                                                    ]}
                                                >
                                                    {CATEGORY_LABELS[cat] ?? cat}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                )}
                            </>
                        )}
                    </View>

                    {/* Action buttons */}
                    <View style={styles.actionButtons}>
                        {occurrence.status !== OccurrenceStatus.CONCLUDED && (
                            <TouchableOpacity
                                style={[styles.actionBtn, { backgroundColor: colors.success }]}
                                onPress={() => {
                                    handleSubmitAction(isVP ? 'vp_resolve' : 'resolve');
                                }}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <CheckCircle size={18} color={colors.onPrimary} weight="bold" />
                                    <Text style={[styles.actionBtnText, { color: colors.onPrimary }]}>Concluir Ocorrência</Text>
                                </View>
                            </TouchableOpacity>
                        )}
                        {occurrence.status === OccurrenceStatus.PENDING_TUTOR && !isVP && (
                            <TouchableOpacity
                                style={[styles.actionBtn, { backgroundColor: colors.warning }]}
                                onPress={() => {
                                    handleSubmitAction('escalate');
                                }}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <ArrowUp size={18} color={colors.onPrimary} weight="bold" />
                                    <Text style={[styles.actionBtnText, { color: colors.onPrimary }]}>Encaminhar à Vice-Direção</Text>
                                </View>
                            </TouchableOpacity>
                        )}
                    </View>

                    <TouchableOpacity style={styles.cancelTreatBtn} onPress={() => setShowTreatment(false)}>
                        <Text style={[styles.cancelTreatText, { color: colors.onSurfaceVariant }]}>Cancelar</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Export PDF + WhatsApp notification (concluded only) */}
            {occurrence.status === OccurrenceStatus.CONCLUDED && (
                <View style={[styles.section, { borderTopWidth: 0, paddingBottom: 0, paddingTop: 10, gap: 10 }]}>
                    <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                        onPress={handleExportPDF}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <FilePdf size={18} color={colors.onPrimary} weight="bold" />
                            <Text style={[styles.actionBtnText, { color: colors.onPrimary }]}>Exportar Relatório em PDF</Text>
                        </View>
                    </TouchableOpacity>
                    {isVP && (
                        <TouchableOpacity
                            style={[styles.actionBtn, styles.whatsappBtn]}
                            onPress={handleSendWhatsApp}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <WhatsappLogo size={18} color="#fff" weight="bold" />
                                <Text style={[styles.actionBtnText, { color: '#fff' }]}>Notificar Responsável via WhatsApp</Text>
                            </View>
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {/* Admin & VP: Delete */}
            {(isAdmin || isVP) && (
                <View style={styles.adminSection}>
                    <TouchableOpacity
                        style={[styles.deleteBtn, { backgroundColor: colors.error + '15', borderColor: colors.error }]}
                        onPress={handleDelete}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Trash size={18} color={colors.error} weight="bold" />
                            <Text style={[styles.deleteBtnText, { color: colors.error }]}>Excluir Ocorrência Permanentemente</Text>
                        </View>
                    </TouchableOpacity>
                </View>
            )}

            {/* Loading overlay for action submission */}
            {addAction.isPending && (
                <View style={styles.savingOverlay}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={[styles.savingText, { color: colors.onSurfaceVariant }]}>Salvando tratativa...</Text>
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
    },
    content: {
        padding: 20,
        paddingBottom: 60,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    loadingText: {
        fontSize: 14,
    },
    errorIconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    errorText: {
        fontSize: 16,
        marginBottom: 16,
    },
    backLinkButton: {
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    backLinkText: {
        fontWeight: '600',
        fontSize: 15,
    },
    headerCard: {
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    date: {
        fontSize: 12,
    },
    studentName: {
        fontSize: 22,
        fontWeight: '800',
    },
    className: {
        fontSize: 14,
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
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    metaValue: {
        fontSize: 14,
        fontWeight: '500',
        marginTop: 2,
    },
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 10,
    },
    descriptionBox: {
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
    },
    descriptionText: {
        fontSize: 15,
        lineHeight: 24,
    },
    originalBox: {},
    originalText: {
        fontStyle: 'italic',
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
    },
    timelineContent: {
        flex: 1,
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
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
    },
    timelineDate: {
        fontSize: 11,
        marginTop: 2,
    },
    timelineAuthor: {
        fontSize: 12,
        marginBottom: 6,
    },
    timelineDescription: {
        fontSize: 14,
        lineHeight: 22,
    },
    editActionBtn: {
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    editActionText: {
        fontSize: 13,
        fontWeight: '600',
    },
    editInput: {
        minHeight: 80,
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
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
        fontWeight: '600',
    },
    editSaveBtn: {
        paddingVertical: 8,
        paddingHorizontal: 18,
        borderRadius: 8,
        minWidth: 70,
        alignItems: 'center',
    },
    editSaveText: {
        fontWeight: '700',
    },
    treatmentPrompt: {
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        marginTop: 8,
        marginBottom: 16,
    },
    treatmentPromptTitle: {
        fontSize: 17,
        fontWeight: '700',
    },
    treatmentHint: {
        fontSize: 14,
        lineHeight: 22,
        marginBottom: 16,
    },
    treatButton: {
        borderRadius: 12,
        paddingHorizontal: 24,
        paddingVertical: 14,
        alignItems: 'center',
    },
    treatButtonText: {
        fontSize: 15,
        fontWeight: '700',
    },
    treatmentSection: {
        borderRadius: 16,
        padding: 20,
        marginTop: 8,
        marginBottom: 16,
        borderWidth: 1,
    },
    treatmentTitle: {
        fontSize: 17,
        fontWeight: '700',
    },
    inputSectionLabel: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        marginTop: 4,
    },
    orDivider: {
        textAlign: 'center',
        marginVertical: 16,
        fontWeight: '700',
        fontSize: 12,
        letterSpacing: 1,
    },
    textInput: {
        borderRadius: 12,
        padding: 16,
        minHeight: 120,
        textAlignVertical: 'top',
        fontSize: 15,
        marginBottom: 12,
        borderWidth: 1,
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
    whatsappBtn: {
        backgroundColor: '#25D366',
    },
    deleteBtn: {
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1.5,
    },
    deleteBtnText: {
        fontSize: 15,
        fontWeight: '700',
    },
    actionBtnText: {
        fontSize: 15,
        fontWeight: '700',
    },
    cancelTreatBtn: {
        paddingVertical: 12,
        alignItems: 'center',
        marginTop: 8,
    },
    cancelTreatText: {
        fontSize: 14,
        fontWeight: '500',
    },
    savingOverlay: {
        alignItems: 'center',
        paddingVertical: 24,
    },
    savingText: {
        marginTop: 8,
        fontSize: 14,
    },
    finalCategorySection: {
        marginTop: 16,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
    },
    finalCategoryTitle: {
        fontSize: 15,
        fontWeight: '700',
    },
    finalCategoryHint: {
        fontSize: 13,
        lineHeight: 20,
        marginBottom: 12,
    },
    selectedCategoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: 10,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderWidth: 1,
    },
    selectedCategoryText: {
        fontSize: 14,
        fontWeight: '600',
        flex: 1,
    },
    changeCategoryText: {
        fontSize: 13,
        fontWeight: '600',
        marginLeft: 8,
    },
    finalCategoryList: {
        maxHeight: 300,
        borderRadius: 10,
        borderWidth: 1,
        overflow: 'hidden',
    },
    finalCategoryItem: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
    },
    finalCategoryItemText: {
        fontSize: 14,
    },
});