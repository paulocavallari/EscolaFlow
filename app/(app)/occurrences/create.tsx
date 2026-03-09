// app/(app)/occurrences/create.tsx
// New occurrence creation screen with audio recording flow

import React, { useState, useCallback, memo } from 'react';
import {
    View,
    Text,
    ScrollView,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    TextInput,
    Alert,
    ActivityIndicator,
    Platform,
    KeyboardAvoidingView,
} from 'react-native';
import { router } from 'expo-router';
import { AudioRecorder } from '../../../src/components/AudioRecorder';
// import { AIReviewModal } from '../../../src/components/AIReviewModal';
import { useStudentsList, useClassesList } from '../../../src/hooks/useStudents';
import { useCreateOccurrence, useProcessText } from '../../../src/hooks/useOccurrences';
import { useProfile } from '../../../src/hooks/useProfile';
import { COLORS } from '../../../src/lib/constants';
import { Student, StudentWithRelations } from '../../../src/types/database';
import { sendWhatsAppMessage } from '../../../src/services/whatsappService';

// Memoized student list item for better performance
const StudentItem = memo(function StudentItem({
    student,
    isSelected,
    onPress,
}: {
    student: StudentWithRelations;
    isSelected: boolean;
    onPress: (s: StudentWithRelations) => void;
}) {
    return (
        <TouchableOpacity
            style={[styles.studentItem, isSelected && styles.studentItemSelected]}
            onPress={() => onPress(student)}
        >
            <View style={{ flex: 1 }}>
                <Text style={styles.studentName}>{student.name}</Text>
                <Text style={styles.studentMeta}>
                    {student.class?.name ?? 'Turma não definida'}
                    {student.matricula ? ` · Mat: ${student.matricula}` : ''}
                </Text>
            </View>
            {isSelected && <Text style={styles.checkMark}>✓</Text>}
        </TouchableOpacity>
    );
});

type Step = 'select_student' | 'record_audio' | 'review_audio';

// Steps displayed in the progress bar
const STEP_LABELS = ['1. Aluno', '2. Relato', '3. Revisar'];
const STEP_KEYS: Step[] = ['select_student', 'record_audio'];

export default function CreateOccurrenceScreen() {
    const { profileId } = useProfile();

    const [step, setStep] = useState<Step>('select_student');

    // Student selection
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [selectedStudent, setSelectedStudent] = useState<StudentWithRelations | null>(null);
    const [studentSearch, setStudentSearch] = useState('');

    // Audio / AI
    const [originalText, setOriginalText] = useState('');
    const [formalText, setFormalText] = useState('');
    // Input mode

    // Input mode
    const [inputMode, setInputMode] = useState<'audio' | 'text'>('audio');
    const [manualText, setManualText] = useState('');

    // Queries
    const { data: classes } = useClassesList();
    const { data: students } = useStudentsList(selectedClassId || undefined);
    const processText = useProcessText();
    const createOccurrence = useCreateOccurrence();

    // Filter students by search
    const filteredStudents = students?.filter((s) =>
        s.name.toLowerCase().includes(studentSearch.toLowerCase())
    ) ?? [];

    // Handle live transcription complete
    const handleTranscriptionComplete = useCallback(async (text: string) => {
        if (!text.trim()) return;
        try {
            const result = await processText.mutateAsync(text);
            setOriginalText(result.original);
            setFormalText(result.formal);
            setStep('review_audio');
        } catch (err) {
            Alert.alert(
                'Erro no processamento',
                err instanceof Error
                    ? err.message
                    : 'Falha ao processar o texto transcrito. Tente novamente.',
                [{ text: 'OK' }]
            );
        }
    }, [processText]);

    const handleTextProcess = async () => {
        if (!manualText.trim()) {
            Alert.alert('Aviso', 'Por favor, descreva os detalhes da ocorrência antes de continuar.');
            return;
        }
        try {
            const result = await processText.mutateAsync(manualText);
            setOriginalText(result.original);
            setFormalText(result.formal);
            setStep('review_audio');
        } catch (err) {
            Alert.alert(
                'Erro no processamento',
                err instanceof Error ? err.message : 'Falha ao processar texto.',
                [{ text: 'OK' }]
            );
        }
    };

    const handleCancelProcessing = useCallback(() => {
        processText.reset();
    }, [processText]);

    // Handle going back to step 1 — reset audio state too
    const handleBackToStudent = useCallback(() => {
        setStep('select_student');
        setOriginalText('');
        setFormalText('');
        setManualText('');
        processText.reset();
    }, [processText]);

    // Handle AI review confirmation
    const handleConfirmText = useCallback(async (editedText: string) => {
        if (!selectedStudent || !profileId) return;

        if (!editedText.trim()) {
            Alert.alert('Aviso', 'O texto da ocorrência não pode ficar vazio.');
            return;
        }

        try {
            await createOccurrence.mutateAsync({
                student_id: selectedStudent.id,
                author_id: profileId,
                tutor_id: selectedStudent.tutor_id,
                description_original: originalText,
                description_formal: editedText,
            }, {
                onSuccess: (newOccurrence) => {
                    // Auto-notify tutor via WhatsApp (fire-and-forget)
                    if (selectedStudent.tutor?.whatsapp_number) {
                        const message =
                            `*Nova Ocorrência Escolar*\n\n` +
                            `Aluno: ${selectedStudent.name}\n` +
                            `Turma: ${selectedStudent.class?.name || 'N/A'}\n\n` +
                            `Resumo: ${editedText}\n\n` +
                            `Acesse o app EscolaFlow para mais detalhes e para registrar a tratativa.`;
                        sendWhatsAppMessage(selectedStudent.tutor.whatsapp_number, message)
                            .catch(() => { /* silent — notification failure doesn't block the flow */ });
                    }

                    // Reset state
                    setManualText('');
                    setOriginalText('');
                    setFormalText('');
                    setStep('select_student');
                    setSelectedStudent(null);

                    Alert.alert('✅ Sucesso', 'Ocorrência registrada com sucesso!', [
                        {
                            text: 'Ver Ocorrência',
                            onPress: () => router.replace(`/(app)/occurrences/${newOccurrence.id}`)
                        },
                    ]);
                },
                onError: () => {
                    Alert.alert('Erro', 'Falha ao salvar a ocorrência. Tente novamente.');
                }
            });
        } catch (err) {
            console.error('Error on create:', err);
        }
    }, [selectedStudent, profileId, originalText, createOccurrence]);

    const handleReRecord = useCallback(() => {
        setStep('record_audio');
        setOriginalText('');
        setFormalText('');
    }, []);

    // Progress bar step index
    const stepIndex = step === 'select_student' ? 0 : step === 'record_audio' ? 1 : 2;

    return (
        <View style={styles.container}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <View style={styles.content}>
                    {/* Progress Steps */}
                    <View style={styles.progressBar}>
                        {STEP_LABELS.map((label, i) => {
                            const isDone = i < stepIndex;
                            const isActive = i === stepIndex;
                            return (
                                <React.Fragment key={label}>
                                    <View style={styles.progressStep}>
                                        <View
                                            style={[
                                                styles.progressDot,
                                                isActive && styles.progressDotActive,
                                                isDone && styles.progressDotDone,
                                            ]}
                                        >
                                            <Text style={styles.progressDotText}>{i + 1}</Text>
                                        </View>
                                        <Text style={[styles.progressLabel, isActive && styles.progressLabelActive]}>
                                            {label.replace(/^\d+\. /, '')}
                                        </Text>
                                    </View>
                                    {i < STEP_LABELS.length - 1 && (
                                        <View style={[styles.progressConnector, i < stepIndex && styles.progressConnectorDone]} />
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </View>

                    {/* Step 1: Select Student */}
                    {step === 'select_student' && (
                        <View style={styles.stepContent}>
                            <Text style={styles.stepTitle}>Selecionar Aluno</Text>
                            <Text style={styles.stepHint}>Escolha a turma e depois toque no nome do aluno.</Text>

                            {/* Class filter */}
                            <Text style={styles.fieldLabel}>Filtrar por Turma</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.classScroll}>
                                <TouchableOpacity
                                    style={[styles.classChip, !selectedClassId && styles.classChipActive]}
                                    onPress={() => setSelectedClassId('')}
                                >
                                    <Text style={[styles.classChipText, !selectedClassId && styles.classChipTextActive]}>
                                        Todas as Turmas
                                    </Text>
                                </TouchableOpacity>
                                {classes?.map((cls) => (
                                    <TouchableOpacity
                                        key={cls.id}
                                        style={[styles.classChip, selectedClassId === cls.id && styles.classChipActive]}
                                        onPress={() => setSelectedClassId(cls.id)}
                                    >
                                        <Text style={[styles.classChipText, selectedClassId === cls.id && styles.classChipTextActive]}>
                                            {cls.name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            {/* Search */}
                            <TextInput
                                style={styles.searchInput}
                                value={studentSearch}
                                onChangeText={setStudentSearch}
                                placeholder="🔍 Buscar aluno por nome..."
                                placeholderTextColor={COLORS.textMuted}
                            />

                            {/* Student FlatList */}
                            <FlatList
                                data={filteredStudents}
                                keyExtractor={(item) => item.id}
                                renderItem={({ item: student }) => (
                                    <StudentItem
                                        student={student}
                                        isSelected={selectedStudent?.id === student.id}
                                        onPress={setSelectedStudent}
                                    />
                                )}
                                ListEmptyComponent={
                                    <Text style={styles.emptyListText}>
                                        {studentSearch ? 'Nenhum aluno encontrado com esse nome.' : 'Selecione uma turma acima para ver os alunos.'}
                                    </Text>
                                }
                                keyboardShouldPersistTaps="handled"
                                style={{ flex: 1, marginTop: 10 }}
                                contentContainerStyle={{ paddingBottom: 100 }}
                            />

                            {selectedStudent && (
                                <View style={styles.selectedBanner}>
                                    <Text style={styles.selectedBannerText}>
                                        ✓ Selecionado: <Text style={{ fontWeight: '700' }}>{selectedStudent.name}</Text>
                                        {selectedStudent.class?.name ? `  ·  ${selectedStudent.class.name}` : ''}
                                    </Text>
                                    <TouchableOpacity
                                        style={styles.nextButton}
                                        onPress={() => setStep('record_audio')}
                                    >
                                        <Text style={styles.nextButtonText}>Próximo →</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    )}

                    {/* Step 2: Record Audio or Type Text */}
                    {step === 'record_audio' && (
                        <ScrollView
                            style={styles.stepContent}
                            contentContainerStyle={{ paddingBottom: 40 }}
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={false}
                        >
                            <Text style={styles.stepTitle}>Detalhes da Ocorrência</Text>
                            <View style={styles.studentSelectedCard}>
                                <Text style={styles.studentSelectedLabel}>Aluno(a):</Text>
                                <Text style={styles.studentSelectedName}>{selectedStudent?.name}</Text>
                                {selectedStudent?.class?.name && (
                                    <Text style={styles.studentSelectedClass}>{selectedStudent.class.name}</Text>
                                )}
                            </View>

                            <View style={styles.tabsContainer}>
                                <TouchableOpacity
                                    style={[styles.tabButton, inputMode === 'audio' && styles.tabButtonActive]}
                                    onPress={() => setInputMode('audio')}
                                >
                                    <Text style={[styles.tabText, inputMode === 'audio' && styles.tabTextActive]}>🎙️ Gravação de Voz</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.tabButton, inputMode === 'text' && styles.tabButtonActive]}
                                    onPress={() => setInputMode('text')}
                                >
                                    <Text style={[styles.tabText, inputMode === 'text' && styles.tabTextActive]}>✍️ Digitar Texto</Text>
                                </TouchableOpacity>
                            </View>

                            {inputMode === 'audio' ? (
                                <AudioRecorder
                                    onTranscriptionComplete={handleTranscriptionComplete}
                                    isProcessing={processText.isPending}
                                    onCancelProcessing={handleCancelProcessing}
                                />
                            ) : (
                                <View style={styles.textInputContainer}>
                                    <Text style={styles.textInputHint}>
                                        Descreva a ocorrência com suas próprias palavras. A IA irá formatar o texto automaticamente.
                                    </Text>
                                    <TextInput
                                        style={styles.textInputArea}
                                        placeholder="Ex: O aluno João foi pego usando o celular durante a prova de matemática e recusou-se a guardar..."
                                        placeholderTextColor={COLORS.textMuted}
                                        value={manualText}
                                        onChangeText={setManualText}
                                        multiline
                                        textAlignVertical="top"
                                    />

                                    {processText.isPending ? (
                                        <View style={styles.processingTextContainer}>
                                            <ActivityIndicator size="small" color={COLORS.primary} />
                                            <Text style={styles.processingLabel}>I.A. Reescrevendo relato...</Text>
                                            <TouchableOpacity style={styles.cancelButton} onPress={handleCancelProcessing}>
                                                <Text style={styles.cancelText}>Cancelar</Text>
                                            </TouchableOpacity>
                                        </View>
                                    ) : (
                                        <TouchableOpacity
                                            style={styles.processTextButton}
                                            onPress={handleTextProcess}
                                        >
                                            <Text style={styles.processTextButtonLabel}>✨ Formatar Relato com I.A.</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            )}

                            <TouchableOpacity
                                style={styles.backButton}
                                onPress={handleBackToStudent}
                            >
                                <Text style={styles.backButtonText}>← Voltar e trocar aluno</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    )}

                    {/* Saving indicator */}
                    {createOccurrence.isPending && (
                        <View style={styles.savingOverlay}>
                            <ActivityIndicator size="large" color={COLORS.primary} />
                            <Text style={styles.savingText}>Salvando ocorrência...</Text>
                        </View>
                    )}

                    {/* Step 3: Review */}
                    {step === 'review_audio' && (
                        <ScrollView
                            style={styles.stepContent}
                            contentContainerStyle={{ paddingBottom: 40 }}
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={false}
                        >
                            <Text style={styles.stepTitle}>Revisão da Ocorrência</Text>
                            <Text style={styles.stepHint}>Edite o texto formal se necessário antes de salvar.</Text>

                            <View style={styles.studentSelectedCard}>
                                <Text style={styles.studentSelectedLabel}>Original Transcrito:</Text>
                                <Text style={[styles.studentSelectedName, { fontSize: 14, fontWeight: '400', fontStyle: 'italic', marginTop: 8, color: COLORS.textSecondary }]}>
                                    "{originalText}"
                                </Text>
                            </View>

                            <Text style={styles.fieldLabel}>Versão Formal (Editável)</Text>
                            <TextInput
                                style={styles.textInputArea}
                                value={formalText}
                                onChangeText={setFormalText}
                                multiline
                                textAlignVertical="top"
                            />

                            <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                                <TouchableOpacity
                                    style={[styles.backButton, { flex: 1, marginTop: 0, backgroundColor: COLORS.surfaceLight, borderRadius: 12, paddingVertical: 14 }]}
                                    onPress={handleReRecord}
                                >
                                    <Text style={[styles.backButtonText, { fontWeight: '600', color: COLORS.textPrimary }]}>🔄 Regravar</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.nextButton, { flex: 1, paddingVertical: 14, backgroundColor: formalText.trim() ? COLORS.primary : COLORS.border }]}
                                    onPress={() => handleConfirmText(formalText)}
                                    disabled={!formalText.trim()}
                                >
                                    <Text style={styles.nextButtonText}>✅ Confirmar e Salvar</Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    )}
                </View>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    content: {
        flex: 1,
        padding: 20,
    },
    progressBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 28,
    },
    progressStep: {
        alignItems: 'center',
    },
    progressConnector: {
        flex: 1,
        height: 2,
        backgroundColor: COLORS.surfaceLight,
        marginHorizontal: 6,
        marginBottom: 20,
    },
    progressConnectorDone: {
        backgroundColor: COLORS.success,
    },
    progressDot: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: COLORS.surfaceLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    progressDotActive: {
        backgroundColor: COLORS.primary,
    },
    progressDotDone: {
        backgroundColor: COLORS.success,
    },
    progressDotText: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.white,
    },
    progressLabel: {
        fontSize: 11,
        color: COLORS.textMuted,
        fontWeight: '500',
    },
    progressLabelActive: {
        color: COLORS.primary,
        fontWeight: '700',
    },
    stepContent: {
        flex: 1,
    },
    stepTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: 4,
    },
    stepHint: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginBottom: 20,
    },
    fieldLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.textSecondary,
        marginBottom: 8,
        marginTop: 8,
    },
    classScroll: {
        marginBottom: 16,
        maxHeight: 44,
    },
    classChip: {
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 20,
        backgroundColor: COLORS.surface,
        marginRight: 8,
        borderWidth: 1,
        borderColor: COLORS.border + '40',
    },
    classChipActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    classChipText: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.textSecondary,
    },
    classChipTextActive: {
        color: COLORS.white,
    },
    searchInput: {
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 13,
        fontSize: 15,
        color: COLORS.textPrimary,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: COLORS.border + '40',
    },
    studentItem: {
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        padding: 14,
        marginBottom: 8,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border + '30',
        minHeight: 60,
    },
    studentItemSelected: {
        borderColor: COLORS.primary,
        backgroundColor: COLORS.primary + '10',
    },
    studentName: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    studentMeta: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    checkMark: {
        fontSize: 20,
        color: COLORS.primary,
        fontWeight: '700',
    },
    selectedBanner: {
        backgroundColor: COLORS.primary + '10',
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: COLORS.primary + '40',
        marginTop: 8,
    },
    selectedBannerText: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginBottom: 10,
    },
    nextButton: {
        backgroundColor: COLORS.primary,
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
    },
    nextButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.white,
    },
    studentSelectedCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: COLORS.primary + '30',
        marginBottom: 20,
    },
    studentSelectedLabel: {
        fontSize: 12,
        color: COLORS.textMuted,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    studentSelectedName: {
        fontSize: 17,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginTop: 2,
    },
    studentSelectedClass: {
        fontSize: 13,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    backButton: {
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 16,
    },
    backButtonText: {
        fontSize: 15,
        color: COLORS.textSecondary,
        fontWeight: '500',
    },
    savingOverlay: {
        alignItems: 'center',
        paddingVertical: 32,
    },
    savingText: {
        marginTop: 12,
        fontSize: 15,
        color: COLORS.textSecondary,
    },
    tabsContainer: {
        flexDirection: 'row',
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        padding: 4,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: COLORS.border + '30',
    },
    tabButton: {
        flex: 1,
        paddingVertical: 11,
        alignItems: 'center',
        borderRadius: 8,
    },
    tabButtonActive: {
        backgroundColor: COLORS.primary + '20',
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.textMuted,
    },
    tabTextActive: {
        color: COLORS.primary,
    },
    textInputContainer: {
        marginBottom: 16,
    },
    textInputHint: {
        fontSize: 13,
        color: COLORS.textSecondary,
        marginBottom: 10,
        lineHeight: 20,
    },
    textInputArea: {
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.border + '50',
        minHeight: 160,
        padding: 16,
        fontSize: 15,
        color: COLORS.textPrimary,
        lineHeight: 22,
        marginBottom: 16,
        textAlignVertical: 'top',
    },
    processTextButton: {
        backgroundColor: COLORS.primary,
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
    },
    processTextButtonLabel: {
        fontSize: 15,
        fontWeight: '700',
        color: COLORS.white,
    },
    processingTextContainer: {
        alignItems: 'center',
        paddingVertical: 24,
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border + '30',
    },
    processingLabel: {
        marginTop: 12,
        fontSize: 14,
        color: COLORS.primary,
        fontWeight: '600',
    },
    cancelButton: {
        marginTop: 12,
        paddingVertical: 8,
        paddingHorizontal: 20,
        borderRadius: 20,
        backgroundColor: COLORS.surfaceLight,
    },
    cancelText: {
        color: COLORS.textSecondary,
        fontSize: 13,
        fontWeight: '600',
    },
    emptyListText: {
        textAlign: 'center',
        color: COLORS.textMuted,
        paddingVertical: 24,
        fontSize: 14,
        lineHeight: 22,
        paddingHorizontal: 16,
    },
});
