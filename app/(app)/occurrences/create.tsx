// app/(app)/occurrences/create.tsx
// New occurrence creation screen with audio recording flow

import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    TextInput,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { AudioRecorder } from '../../../src/components/AudioRecorder';
import { AIReviewModal } from '../../../src/components/AIReviewModal';
import { useStudentsList, useClassesList } from '../../../src/hooks/useStudents';
import { useCreateOccurrence, useProcessAudio } from '../../../src/hooks/useOccurrences';
import { useProfile } from '../../../src/hooks/useProfile';
import { COLORS } from '../../../src/lib/constants';
import { Student, StudentWithRelations } from '../../../src/types/database';
import { sendWhatsAppMessage } from '../../../src/services/whatsappService';

type Step = 'select_student' | 'record_audio' | 'review';

export default function CreateOccurrenceScreen() {
    const { profileId } = useProfile();

    // Step management
    const [step, setStep] = useState<Step>('select_student');

    // Student selection
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [selectedStudent, setSelectedStudent] = useState<StudentWithRelations | null>(null);
    const [studentSearch, setStudentSearch] = useState('');

    // Audio / AI
    const [originalText, setOriginalText] = useState('');
    const [formalText, setFormalText] = useState('');
    const [showReviewModal, setShowReviewModal] = useState(false);

    // Queries
    const { data: classes } = useClassesList();
    const { data: students } = useStudentsList(selectedClassId || undefined);
    const processAudio = useProcessAudio();
    const createOccurrence = useCreateOccurrence();

    // Filter students by search
    const filteredStudents = students?.filter((s) =>
        s.name.toLowerCase().includes(studentSearch.toLowerCase())
    ) ?? [];

    // Handle audio recording complete
    const handleRecordingComplete = useCallback(async (audioUri: string) => {
        try {
            const result = await processAudio.mutateAsync(audioUri);
            setOriginalText(result.original);
            setFormalText(result.formal);
            setShowReviewModal(true);
        } catch (err) {
            Alert.alert('Erro', 'Falha ao processar o áudio. Tente novamente.');
        }
    }, [processAudio]);

    // Handle AI review confirmation
    const handleConfirmText = useCallback(async (editedText: string) => {
        if (!selectedStudent || !profileId) return;

        setShowReviewModal(false);

        try {
            await createOccurrence.mutateAsync({
                student_id: selectedStudent.id,
                author_id: profileId,
                tutor_id: selectedStudent.tutor_id,
                description_original: originalText,
                description_formal: editedText,
            });

            // Send WhatsApp if Tutor has phone
            if (selectedStudent.tutor?.whatsapp_number) {
                const message = `*Nova Ocorrência Escolar*\n\nAluno: ${selectedStudent.name}\nTurma: ${selectedStudent.class?.name || 'N/A'}\n\nResumo: ${editedText}\n\nAcesse o app para mais detalhes.`;

                sendWhatsAppMessage(selectedStudent.tutor.whatsapp_number, message)
                    .then(success => {
                        if (success) console.log('WhatsApp notification sent');
                        else console.warn('Failed to send WhatsApp notification');
                    });
            } else {
                console.log('No tutor phone available for WhatsApp notification');
            }

            Alert.alert('Sucesso', 'Ocorrência registrada com sucesso!', [
                { text: 'OK', onPress: () => router.back() },
            ]);
        } catch (err) {
            Alert.alert('Erro', 'Falha ao salvar a ocorrência.');
        }
    }, [selectedStudent, profileId, originalText, createOccurrence]);

    // Handle re-record
    const handleReRecord = useCallback(() => {
        setShowReviewModal(false);
        setOriginalText('');
        setFormalText('');
    }, []);

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
        >
            {/* Progress Steps */}
            <View style={styles.progressBar}>
                {(['select_student', 'record_audio', 'review'] as Step[]).map((s, i) => (
                    <View key={s} style={styles.progressStep}>
                        <View
                            style={[
                                styles.progressDot,
                                step === s && styles.progressDotActive,
                                (['select_student', 'record_audio', 'review'].indexOf(step) > i) && styles.progressDotDone,
                            ]}
                        >
                            <Text style={styles.progressDotText}>{i + 1}</Text>
                        </View>
                        <Text style={[styles.progressLabel, step === s && styles.progressLabelActive]}>
                            {['Aluno', 'Gravar', 'Revisar'][i]}
                        </Text>
                    </View>
                ))}
            </View>

            {/* Step 1: Select Student */}
            {step === 'select_student' && (
                <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>Selecionar Aluno</Text>

                    {/* Class filter */}
                    <Text style={styles.fieldLabel}>Turma</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.classScroll}>
                        <TouchableOpacity
                            style={[styles.classChip, !selectedClassId && styles.classChipActive]}
                            onPress={() => setSelectedClassId('')}
                        >
                            <Text style={[styles.classChipText, !selectedClassId && styles.classChipTextActive]}>
                                Todas
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
                        placeholder="Buscar aluno por nome..."
                        placeholderTextColor={COLORS.textMuted}
                    />

                    {/* Student list */}
                    {filteredStudents.map((student) => (
                        <TouchableOpacity
                            key={student.id}
                            style={[
                                styles.studentItem,
                                selectedStudent?.id === student.id && styles.studentItemSelected,
                            ]}
                            onPress={() => setSelectedStudent(student)}
                        >
                            <View>
                                <Text style={styles.studentName}>{student.name}</Text>
                                <Text style={styles.studentClass}>{student.matricula ?? 'Sem matrícula'}</Text>
                            </View>
                            {selectedStudent?.id === student.id && (
                                <Text style={styles.checkMark}>✓</Text>
                            )}
                        </TouchableOpacity>
                    ))}

                    {selectedStudent && (
                        <TouchableOpacity
                            style={styles.nextButton}
                            onPress={() => setStep('record_audio')}
                        >
                            <Text style={styles.nextButtonText}>Próximo →</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {/* Step 2: Record Audio */}
            {step === 'record_audio' && (
                <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>Gravar Ocorrência</Text>
                    <Text style={styles.stepSubtitle}>
                        Aluno: {selectedStudent?.name}
                    </Text>

                    <AudioRecorder
                        onRecordingComplete={handleRecordingComplete}
                        isProcessing={processAudio.isPending}
                    />

                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => setStep('select_student')}
                    >
                        <Text style={styles.backButtonText}>← Voltar</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Saving indicator */}
            {createOccurrence.isPending && (
                <View style={styles.savingOverlay}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={styles.savingText}>Salvando ocorrência...</Text>
                </View>
            )}

            {/* AI Review Modal */}
            <AIReviewModal
                visible={showReviewModal}
                originalText={originalText}
                formalText={formalText}
                onConfirm={handleConfirmText}
                onReRecord={handleReRecord}
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
    progressBar: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 32,
        marginBottom: 32,
    },
    progressStep: {
        alignItems: 'center',
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
    },
    stepContent: {},
    stepTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: 4,
    },
    stepSubtitle: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginBottom: 20,
    },
    fieldLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.textSecondary,
        marginBottom: 8,
        marginTop: 16,
    },
    classScroll: {
        marginBottom: 16,
    },
    classChip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: COLORS.surface,
        marginRight: 8,
    },
    classChipActive: {
        backgroundColor: COLORS.primary,
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
        paddingVertical: 12,
        fontSize: 15,
        color: COLORS.textPrimary,
        marginBottom: 12,
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
    studentClass: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    checkMark: {
        fontSize: 18,
        color: COLORS.primary,
        fontWeight: '700',
    },
    nextButton: {
        backgroundColor: COLORS.primary,
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 16,
    },
    nextButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.white,
    },
    backButton: {
        paddingVertical: 12,
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
});
