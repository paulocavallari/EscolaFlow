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
import {
    Check,
    MagnifyingGlass,
    MapPin,
    Tag,
    Microphone,
    PencilSimple,
    ClipboardText,
    ArrowRight,
    ArrowLeft,
    ArrowCounterClockwise,
    CheckCircle,
    Sparkle,
} from 'phosphor-react-native';
import { AudioRecorder } from '../../../src/components/AudioRecorder';
import { useStudentsList, useClassesList } from '../../../src/hooks/useStudents';
import { useCreateOccurrence } from '../../../src/hooks/useOccurrences';
import { AIProcessingIndicator } from '../../../src/components/AIProcessingIndicator';
import { useProfile } from '../../../src/hooks/useProfile';
import { COLORS, LOCATION_LABELS, CATEGORY_LABELS, CATEGORY_DEFAULT_DESCRIPTIONS } from '../../../src/lib/constants';
import { Student, StudentWithRelations, OccurrenceLocation, OccurrenceCategory } from '../../../src/types/database';
import { sendWhatsAppMessage } from '../../../src/services/whatsappService';
import { useAITextProcessing } from '../../../src/hooks/useAITextProcessing';
import { buildTutorCreationNotificationMessage } from '../../../src/services/messageBuilders';
import { useTheme, typography } from '../../../src/lib/theme';

// Memoized student list item for better performance
const StudentItem = memo(function StudentItem({
    student,
    isSelected,
    onPress,
    colors,
}: {
    student: StudentWithRelations;
    isSelected: boolean;
    onPress: (s: StudentWithRelations) => void;
    colors: any;
}) {
    return (
        <TouchableOpacity
            style={[
                styles.studentItem,
                { backgroundColor: colors.surface, borderColor: colors.outline + '30' },
                isSelected && { borderColor: colors.primary, backgroundColor: colors.primary + '10' },
            ]}
            onPress={() => onPress(student)}
        >
            <View style={{ flex: 1 }}>
                <Text style={[styles.studentName, { color: colors.onSurface }]}>{student.name}</Text>
                <Text style={[styles.studentMeta, { color: colors.onSurfaceVariant }]}>
                    {student.class?.name ?? 'Turma não definida'}
                    {student.matricula ? ` · RA: ${student.matricula}` : ''}
                </Text>
            </View>
            {isSelected && <Check size={22} color={colors.primary} weight="bold" />}
        </TouchableOpacity>
    );
});

type Step = 'select_student' | 'select_location' | 'select_category' | 'record_audio' | 'review_audio';

// Steps displayed in the progress bar
const STEP_LABELS = ['1. Aluno', '2. Local', '3. Categoria', '4. Relato', '5. Revisar'];
const STEP_KEYS: Step[] = ['select_student', 'select_location', 'select_category', 'record_audio', 'review_audio'];

export default function CreateOccurrenceScreen() {
    const { colors } = useTheme();
    const { profileId } = useProfile();

    const [step, setStep] = useState<Step>('select_student');

    // Student selection
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [selectedStudent, setSelectedStudent] = useState<StudentWithRelations | null>(null);
    const [studentSearch, setStudentSearch] = useState('');

    // Location & Category
    const [selectedLocation, setSelectedLocation] = useState<OccurrenceLocation | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<OccurrenceCategory | null>(null);
    const [categorySearch, setCategorySearch] = useState('');
    const [usePreGenerated, setUsePreGenerated] = useState(false);

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
    const aiText = useAITextProcessing();
    const createOccurrence = useCreateOccurrence();

    // Filter students by search
    const filteredStudents = students?.filter((s) =>
        s.name.toLowerCase().includes(studentSearch.toLowerCase())
    ) ?? [];

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

    // Handle live transcription complete
    const handleTranscriptionComplete = useCallback(async (text: string) => {
        if (!text.trim()) return;
        await aiText.processTextWithAI(
            text,
            (result) => {
                if (result.aiUnavailable) {
                    handleAIUnavailable(result.original, () => {
                        setOriginalText(result.original);
                        setFormalText(result.original);
                        setStep('review_audio');
                    });
                    return;
                }
                setOriginalText(result.original);
                setFormalText(result.formal);
                setStep('review_audio');
            },
            (err) => {
                Alert.alert('Erro no processamento', err.message, [{ text: 'OK' }]);
            }
        );
    }, [aiText, handleAIUnavailable]);

    const handleTextProcess = async () => {
        if (!manualText.trim()) {
            Alert.alert('Aviso', 'Por favor, descreva os detalhes da ocorrência antes de continuar.');
            return;
        }
        await aiText.processTextWithAI(
            manualText,
            (result) => {
                if (result.aiUnavailable) {
                    handleAIUnavailable(result.original, () => {
                        setOriginalText(result.original);
                        setFormalText(result.original);
                        setStep('review_audio');
                    });
                    return;
                }
                setOriginalText(result.original);
                setFormalText(result.formal);
                setStep('review_audio');
            },
            (err) => {
                Alert.alert('Erro no processamento', err.message, [{ text: 'OK' }]);
            }
        );
    };

    const handleCancelProcessing = useCallback(() => {
        aiText.reset();
    }, [aiText]);

    // Handle going back to step 1 — reset audio state too
    const handleBackToStudent = useCallback(() => {
        setStep('select_student');
        setOriginalText('');
        setFormalText('');
        setManualText('');
        setSelectedLocation(null);
        setSelectedCategory(null);
        setCategorySearch('');
        setUsePreGenerated(false);
        aiText.reset();
    }, [aiText]);

    // Handle AI review confirmation
    const handleConfirmText = useCallback(async (editedText: string) => {
        if (!selectedStudent || !profileId) return;

        if (!editedText.trim()) {
            if (Platform.OS === 'web') {
                window.alert('O texto da ocorrência não pode ficar vazio.');
            } else {
                Alert.alert('Aviso', 'O texto da ocorrência não pode ficar vazio.');
            }
            return;
        }

        try {
            const newOccurrence = await createOccurrence.mutateAsync({
                student_id: selectedStudent.id,
                author_id: profileId,
                tutor_id: selectedStudent.tutor_id,
                description_original: originalText,
                description_formal: editedText,
                location: selectedLocation!,
                category: selectedCategory!,
            });

            // Auto-notify tutor via WhatsApp (fire-and-forget)
            if (selectedStudent.tutor?.whatsapp_number) {
                const message = buildTutorCreationNotificationMessage(
                    selectedStudent.name,
                    selectedStudent.class?.name || 'N/A',
                    editedText,
                );
                sendWhatsAppMessage(selectedStudent.tutor.whatsapp_number, message)
                    .catch(() => { /* silent — notification failure doesn't block the flow */ });
            }

            // Show success confirmation BEFORE resetting state
            if (Platform.OS === 'web') {
                const viewOccurrence = window.confirm(
                    '✅ Ocorrência registrada com sucesso!\n\nDeseja ver a ocorrência?'
                );
                // Reset state
                setManualText('');
                setOriginalText('');
                setFormalText('');
                setStep('select_student');
                setSelectedStudent(null);
                setSelectedLocation(null);
                setSelectedCategory(null);
                setCategorySearch('');
                setUsePreGenerated(false);

                if (viewOccurrence) {
                    router.replace(`/(app)/occurrences/${newOccurrence.id}`);
                }
            } else {
                Alert.alert('✅ Sucesso', 'Ocorrência registrada com sucesso!', [
                    {
                        text: 'Ver Ocorrência',
                        onPress: () => {
                            setManualText('');
                            setOriginalText('');
                            setFormalText('');
                            setStep('select_student');
                            setSelectedStudent(null);
                            setSelectedLocation(null);
                            setSelectedCategory(null);
                            setCategorySearch('');
                            setUsePreGenerated(false);
                            router.replace(`/(app)/occurrences/${newOccurrence.id}`);
                        }
                    },
                ]);
            }
        } catch (err) {
            console.error('Error on create:', err);
            const errorMsg = err instanceof Error ? err.message : 'Falha ao salvar a ocorrência. Tente novamente.';
            if (Platform.OS === 'web') {
                window.alert(`Erro: ${errorMsg}`);
            } else {
                Alert.alert('Erro', errorMsg);
            }
        }
    }, [selectedStudent, profileId, originalText, createOccurrence]);

    const handleReRecord = useCallback(() => {
        setStep('record_audio');
        setOriginalText('');
        setFormalText('');
    }, []);

    // Progress bar step index
    const stepIndex = step === 'select_student' ? 0 : step === 'select_location' ? 1 : step === 'select_category' ? 2 : step === 'record_audio' ? 3 : 4;

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
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
                                                { backgroundColor: colors.surfaceVariant },
                                                isActive && { backgroundColor: colors.primary },
                                                isDone && { backgroundColor: colors.success },
                                            ]}
                                        >
                                            <Text style={[styles.progressDotText, { color: colors.onPrimary }]}>{i + 1}</Text>
                                        </View>
                                        <Text style={[styles.progressLabel, { color: colors.onSurfaceVariant }, isActive && { color: colors.primary, fontWeight: '700' }]}>
                                            {label.replace(/^\d+\. /, '')}
                                        </Text>
                                    </View>
                                    {i < STEP_LABELS.length - 1 && (
                                        <View style={[styles.progressConnector, { backgroundColor: colors.surfaceVariant }, i < stepIndex && { backgroundColor: colors.success }]} />
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </View>

                    {/* Step 1: Select Student */}
                    {step === 'select_student' && (
                        <View style={styles.stepContent}>
                            <Text style={[styles.stepTitle, { color: colors.onSurface }]}>Selecionar Aluno</Text>
                            <Text style={[styles.stepHint, { color: colors.onSurfaceVariant }]}>Escolha a turma e depois toque no nome do aluno.</Text>

                            {/* Class filter */}
                            <Text style={[styles.fieldLabel, { color: colors.onSurfaceVariant }]}>Filtrar por Turma</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.classScroll}>
                                <TouchableOpacity
                                    style={[styles.classChip, { backgroundColor: colors.surfaceVariant, borderColor: colors.outline + '40' }, !selectedClassId && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                                    onPress={() => setSelectedClassId('')}
                                >
                                    <Text style={[styles.classChipText, { color: colors.onSurfaceVariant }, !selectedClassId && { color: colors.onPrimary }]}>
                                        Todas as Turmas
                                    </Text>
                                </TouchableOpacity>
                                {classes?.map((cls) => (
                                    <TouchableOpacity
                                        key={cls.id}
                                        style={[styles.classChip, { backgroundColor: colors.surfaceVariant, borderColor: colors.outline + '40' }, selectedClassId === cls.id && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                                        onPress={() => setSelectedClassId(cls.id)}
                                    >
                                        <Text style={[styles.classChipText, { color: colors.onSurfaceVariant }, selectedClassId === cls.id && { color: colors.onPrimary }]}>
                                            {cls.name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            {/* Search */}
                            <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.outline + '40' }]}>
                                <MagnifyingGlass size={18} color={colors.onSurfaceVariant} />
                                <TextInput
                                    style={[styles.searchInput, { color: colors.onSurface }]}
                                    value={studentSearch}
                                    onChangeText={setStudentSearch}
                                    placeholder="Buscar aluno por nome..."
                                    placeholderTextColor={colors.onSurfaceVariant}
                                />
                            </View>

                            {/* Student FlatList */}
                            <FlatList
                                data={filteredStudents}
                                keyExtractor={(item) => item.id}
                                renderItem={({ item: student }) => (
                                    <StudentItem
                                        student={student}
                                        isSelected={selectedStudent?.id === student.id}
                                        onPress={setSelectedStudent}
                                        colors={colors}
                                    />
                                )}
                                ListEmptyComponent={
                                    <Text style={[styles.emptyListText, { color: colors.onSurfaceVariant }]}>
                                        {studentSearch ? 'Nenhum aluno encontrado com esse nome.' : 'Selecione uma turma acima para ver os alunos.'}
                                    </Text>
                                }
                                keyboardShouldPersistTaps="handled"
                                style={{ flex: 1, marginTop: 10 }}
                                contentContainerStyle={{ paddingBottom: 100 }}
                            />

                            {selectedStudent && (
                                <View style={[styles.selectedBanner, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '40' }]}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                                        <Check size={16} color={colors.primary} weight="bold" />
                                        <Text style={[styles.selectedBannerText, { color: colors.onSurfaceVariant, marginBottom: 0 }]}>
                                            Selecionado: <Text style={{ fontWeight: '700' }}>{selectedStudent.name}</Text>
                                            {selectedStudent.class?.name ? `  ·  ${selectedStudent.class.name}` : ''}
                                        </Text>
                                    </View>
                                    <TouchableOpacity
                                        style={[styles.nextButton, { backgroundColor: colors.primary }]}
                                        onPress={() => setStep('select_location')}
                                    >
                                        <Text style={[styles.nextButtonText, { color: colors.onPrimary }]}>Próximo</Text>
                                        <ArrowRight size={18} color={colors.onPrimary} weight="bold" />
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    )}

                    {/* Step 2: Select Location */}
                    {step === 'select_location' && (
                        <View style={styles.stepContent}>
                            <Text style={[styles.stepTitle, { color: colors.onSurface }]}>Local da Ocorrência</Text>
                            <Text style={[styles.stepHint, { color: colors.onSurfaceVariant }]}>Selecione o local onde a ocorrência aconteceu.</Text>

                            <View style={styles.locationGrid}>
                                {(Object.keys(LOCATION_LABELS) as OccurrenceLocation[]).map((loc) => (
                                    <TouchableOpacity
                                        key={loc}
                                        style={[styles.locationItem, { backgroundColor: colors.surface, borderColor: colors.outline + '40' }, selectedLocation === loc && { borderColor: colors.primary, backgroundColor: colors.primary + '15' }]}
                                        onPress={() => setSelectedLocation(loc)}
                                    >
                                        <Text style={[styles.locationItemText, { color: colors.onSurfaceVariant }, selectedLocation === loc && { color: colors.primary }]}>
                                            {LOCATION_LABELS[loc]}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                                <TouchableOpacity
                                    style={[styles.backButton, { flex: 1, marginTop: 0, backgroundColor: colors.surfaceVariant, borderRadius: 12, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }]}
                                    onPress={() => { setStep('select_student'); setSelectedLocation(null); }}
                                >
                                    <ArrowLeft size={16} color={colors.onSurface} />
                                    <Text style={[styles.backButtonText, { fontWeight: '600', color: colors.onSurface }]}>Voltar</Text>
                                </TouchableOpacity>

                                {selectedLocation && (
                                    <TouchableOpacity
                                        style={[styles.nextButton, { flex: 1, paddingVertical: 14, backgroundColor: colors.primary }]}
                                        onPress={() => setStep('select_category')}
                                    >
                                        <Text style={[styles.nextButtonText, { color: colors.onPrimary }]}>Próximo</Text>
                                        <ArrowRight size={16} color={colors.onPrimary} weight="bold" />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    )}

                    {/* Step 3: Select Category */}
                    {step === 'select_category' && (
                        <View style={styles.stepContent}>
                            <Text style={[styles.stepTitle, { color: colors.onSurface }]}>Categoria da Ocorrência</Text>
                            <Text style={[styles.stepHint, { color: colors.onSurfaceVariant }]}>Selecione o tipo de ocorrência registrada.</Text>

                            <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.outline + '40' }]}>
                                <MagnifyingGlass size={18} color={colors.onSurfaceVariant} />
                                <TextInput
                                    style={[styles.searchInput, { color: colors.onSurface }]}
                                    value={categorySearch}
                                    onChangeText={setCategorySearch}
                                    placeholder="Buscar categoria..."
                                    placeholderTextColor={colors.onSurfaceVariant}
                                />
                            </View>

                            <FlatList
                                data={(Object.keys(CATEGORY_LABELS) as OccurrenceCategory[]).filter((cat) =>
                                    CATEGORY_LABELS[cat].toLowerCase().includes(categorySearch.toLowerCase())
                                )}
                                keyExtractor={(item) => item}
                                renderItem={({ item: cat, index }) => (
                                    <TouchableOpacity
                                        style={[styles.categoryItem, { backgroundColor: colors.surface, borderColor: colors.outline + '30' }, selectedCategory === cat && { borderColor: colors.primary, backgroundColor: colors.primary + '12' }]}
                                        onPress={() => setSelectedCategory(cat)}
                                    >
                                        <Text style={[styles.categoryNumber, { backgroundColor: colors.surfaceVariant, color: colors.onSurfaceVariant }]}>{index + 1}</Text>
                                        <Text style={[styles.categoryItemText, { color: colors.onSurface }, selectedCategory === cat && { color: colors.primary, fontWeight: '700' }]}>
                                            {CATEGORY_LABELS[cat]}
                                        </Text>
                                        {selectedCategory === cat && <Check size={22} color={colors.primary} weight="bold" />}
                                    </TouchableOpacity>
                                )}
                                keyboardShouldPersistTaps="handled"
                                style={{ flex: 1, marginTop: 10 }}
                                contentContainerStyle={{ paddingBottom: 100 }}
                            />

                            {selectedCategory && (
                                <View style={[styles.selectedBanner, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '40' }]}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                                        <Check size={16} color={colors.primary} weight="bold" />
                                        <Text style={[styles.selectedBannerText, { color: colors.onSurfaceVariant, marginBottom: 0 }]}>
                                            Categoria: <Text style={{ fontWeight: '700' }}>{CATEGORY_LABELS[selectedCategory]}</Text>
                                        </Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', gap: 12 }}>
                                        <TouchableOpacity
                                            style={[styles.backButton, { flex: 1, marginTop: 0, backgroundColor: colors.surfaceVariant, borderRadius: 12, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }]}
                                            onPress={() => { setStep('select_location'); setSelectedCategory(null); setCategorySearch(''); }}
                                        >
                                            <ArrowLeft size={16} color={colors.onSurface} />
                                            <Text style={[styles.backButtonText, { fontWeight: '600', color: colors.onSurface }]}>Voltar</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.nextButton, { flex: 1, paddingVertical: 14, backgroundColor: colors.primary }]}
                                            onPress={() => {
                                                if (selectedCategory !== OccurrenceCategory.OUTRO && CATEGORY_DEFAULT_DESCRIPTIONS[selectedCategory]) {
                                                    setUsePreGenerated(true);
                                                    setOriginalText(CATEGORY_DEFAULT_DESCRIPTIONS[selectedCategory]!);
                                                    setFormalText(CATEGORY_DEFAULT_DESCRIPTIONS[selectedCategory]!);
                                                } else {
                                                    setUsePreGenerated(false);
                                                }
                                                setStep('record_audio');
                                            }}
                                        >
                                            <Text style={[styles.nextButtonText, { color: colors.onPrimary }]}>Próximo</Text>
                                            <ArrowRight size={16} color={colors.onPrimary} weight="bold" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}
                        </View>
                    )}

                    {/* Step 4: Record Audio or Type Text */}
                    {step === 'record_audio' && (
                        <ScrollView
                            style={styles.stepContent}
                            contentContainerStyle={{ paddingBottom: 40 }}
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={false}
                        >
                            <Text style={[styles.stepTitle, { color: colors.onSurface }]}>Detalhes da Ocorrência</Text>
                            <View style={[styles.studentSelectedCard, { backgroundColor: colors.surface, borderColor: colors.primary + '30' }]}>
                                <Text style={[styles.studentSelectedLabel, { color: colors.onSurfaceVariant }]}>Aluno(a):</Text>
                                <Text style={[styles.studentSelectedName, { color: colors.onSurface }]}>{selectedStudent?.name}</Text>
                                {selectedStudent?.class?.name && (
                                    <Text style={[styles.studentSelectedClass, { color: colors.onSurfaceVariant }]}>{selectedStudent.class.name}</Text>
                                )}
                                {selectedLocation && (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                        <MapPin size={14} color={colors.onSurfaceVariant} />
                                        <Text style={[styles.studentSelectedClass, { color: colors.onSurfaceVariant, marginTop: 0 }]}>{LOCATION_LABELS[selectedLocation]}</Text>
                                    </View>
                                )}
                                {selectedCategory && (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                        <Tag size={14} color={colors.onSurfaceVariant} />
                                        <Text style={[styles.studentSelectedClass, { color: colors.onSurfaceVariant, marginTop: 0 }]}>{CATEGORY_LABELS[selectedCategory]}</Text>
                                    </View>
                                )}
                            </View>

                            {/* Pre-generated description for categories 1-27 */}
                            {usePreGenerated && selectedCategory && selectedCategory !== OccurrenceCategory.OUTRO && (
                                <View style={[styles.preGeneratedCard, { backgroundColor: colors.surface, borderColor: colors.primary + '30' }]}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                        <ClipboardText size={20} color={colors.primary} weight="bold" />
                                        <Text style={[styles.preGeneratedTitle, { color: colors.primary }]}>Descrição Pré-gerada</Text>
                                    </View>
                                    <Text style={[styles.preGeneratedHint, { color: colors.onSurfaceVariant }]}>
                                        Uma descrição padrão foi gerada para a categoria selecionada. Você pode usá-la diretamente, editá-la, ou gravar/digitar um novo relato.
                                    </Text>
                                    <TextInput
                                        style={[styles.textInputArea, { backgroundColor: colors.surface, borderColor: colors.outline + '50', color: colors.onSurface }]}
                                        value={formalText}
                                        onChangeText={setFormalText}
                                        multiline
                                        textAlignVertical="top"
                                    />
                                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                                        <TouchableOpacity
                                            style={[styles.processTextButton, { flex: 1, backgroundColor: colors.success }]}
                                            onPress={() => setStep('review_audio')}
                                        >
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                <CheckCircle size={18} color={colors.onPrimary} weight="bold" />
                                                <Text style={[styles.processTextButtonLabel, { color: colors.onPrimary }]}>Usar este texto</Text>
                                            </View>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.processTextButton, { flex: 1, backgroundColor: colors.surfaceVariant }]}
                                            onPress={() => {
                                                setUsePreGenerated(false);
                                                setOriginalText('');
                                                setFormalText('');
                                            }}
                                        >
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                <Microphone size={18} color={colors.onSurface} />
                                                <Text style={[styles.processTextButtonLabel, { color: colors.onSurface }]}>Gravar / Digitar novo</Text>
                                            </View>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}

                            {/* Normal audio/text input (shown when no pre-generated or user chose to write new) */}
                            {!usePreGenerated && (
                                <>
                            <View style={[styles.tabsContainer, { backgroundColor: colors.surface, borderColor: colors.outline + '30' }]}>
                                <TouchableOpacity
                                    style={[styles.tabButton, inputMode === 'audio' && { backgroundColor: colors.primary + '20' }]}
                                    onPress={() => setInputMode('audio')}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <Microphone size={16} color={inputMode === 'audio' ? colors.primary : colors.onSurfaceVariant} weight={inputMode === 'audio' ? 'bold' : 'regular'} />
                                        <Text style={[styles.tabText, { color: colors.onSurfaceVariant }, inputMode === 'audio' && { color: colors.primary }]}>Gravação de Voz</Text>
                                    </View>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.tabButton, inputMode === 'text' && { backgroundColor: colors.primary + '20' }]}
                                    onPress={() => setInputMode('text')}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <PencilSimple size={16} color={inputMode === 'text' ? colors.primary : colors.onSurfaceVariant} weight={inputMode === 'text' ? 'bold' : 'regular'} />
                                        <Text style={[styles.tabText, { color: colors.onSurfaceVariant }, inputMode === 'text' && { color: colors.primary }]}>Digitar Texto</Text>
                                    </View>
                                </TouchableOpacity>
                            </View>

                            {inputMode === 'audio' ? (
                                <AudioRecorder
                                    onTranscriptionComplete={handleTranscriptionComplete}
                                    isProcessing={aiText.isPending}
                                    onCancelProcessing={handleCancelProcessing}
                                />
                            ) : (
                                <View style={styles.textInputContainer}>
                                    <Text style={[styles.textInputHint, { color: colors.onSurfaceVariant }]}>
                                        Descreva a ocorrência com suas próprias palavras. A IA irá formatar o texto automaticamente.
                                    </Text>
                                    <TextInput
                                        style={[styles.textInputArea, { backgroundColor: colors.surface, borderColor: colors.outline + '50', color: colors.onSurface }]}
                                        placeholder="Ex: O aluno João foi pego usando o celular durante a prova de matemática e recusou-se a guardar..."
                                        placeholderTextColor={colors.onSurfaceVariant}
                                        value={manualText}
                                        onChangeText={setManualText}
                                        multiline
                                        textAlignVertical="top"
                                    />

                                    {aiText.isPending ? (
                                        <AIProcessingIndicator
                                            label="Formatando relato com I.A."
                                            onCancel={handleCancelProcessing}
                                        />
                                    ) : (
                                        <TouchableOpacity
                                            style={[styles.processTextButton, { backgroundColor: colors.primary }]}
                                            onPress={handleTextProcess}
                                        >
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                                <Sparkle size={18} color={colors.onPrimary} weight="fill" />
                                                <Text style={[styles.processTextButtonLabel, { color: colors.onPrimary }]}>Formatar Relato com I.A.</Text>
                                            </View>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            )}
                                </>
                            )}

                            <TouchableOpacity
                                style={[styles.backButton, { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }]}
                                onPress={() => { setStep('select_category'); setUsePreGenerated(false); setOriginalText(''); setFormalText(''); setManualText(''); }}
                            >
                                <ArrowLeft size={16} color={colors.onSurfaceVariant} />
                                <Text style={[styles.backButtonText, { color: colors.onSurfaceVariant }]}>Voltar e trocar categoria</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    )}

                    {/* Saving indicator */}
                    {createOccurrence.isPending && (
                        <View style={styles.savingOverlay}>
                            <ActivityIndicator size="large" color={colors.primary} />
                            <Text style={[styles.savingText, { color: colors.onSurfaceVariant }]}>Salvando ocorrência...</Text>
                        </View>
                    )}

                    {/* Step 5: Review */}
                    {step === 'review_audio' && (
                        <ScrollView
                            style={styles.stepContent}
                            contentContainerStyle={{ paddingBottom: 40 }}
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={false}
                        >
                            <Text style={[styles.stepTitle, { color: colors.onSurface }]}>Revisão da Ocorrência</Text>
                            <Text style={[styles.stepHint, { color: colors.onSurfaceVariant }]}>Edite o texto formal se necessário antes de salvar.</Text>

                            <View style={[styles.studentSelectedCard, { backgroundColor: colors.surface, borderColor: colors.primary + '30' }]}>
                                <Text style={[styles.studentSelectedLabel, { color: colors.onSurfaceVariant }]}>Original Transcrito:</Text>
                                <Text style={[styles.studentSelectedName, { fontSize: 14, fontWeight: '400', fontStyle: 'italic', marginTop: 8, color: colors.onSurfaceVariant }]}>
                                    "{originalText}"
                                </Text>
                            </View>

                            <Text style={[styles.fieldLabel, { color: colors.onSurfaceVariant }]}>Versão Formal (Editável)</Text>
                            <TextInput
                                style={[styles.textInputArea, { backgroundColor: colors.surface, borderColor: colors.outline + '50', color: colors.onSurface }]}
                                value={formalText}
                                onChangeText={setFormalText}
                                multiline
                                textAlignVertical="top"
                            />

                            <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                                <TouchableOpacity
                                    style={[styles.backButton, { flex: 1, marginTop: 0, backgroundColor: colors.surfaceVariant, borderRadius: 12, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }]}
                                    onPress={handleReRecord}
                                >
                                    <ArrowCounterClockwise size={16} color={colors.onSurface} />
                                    <Text style={[styles.backButtonText, { fontWeight: '600', color: colors.onSurface }]}>Regravar</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.nextButton, { flex: 1, paddingVertical: 14, backgroundColor: formalText.trim() ? colors.primary : colors.outline }]}
                                    onPress={() => handleConfirmText(formalText)}
                                    disabled={!formalText.trim()}
                                >
                                    <CheckCircle size={18} color={colors.onPrimary} weight="bold" />
                                    <Text style={[styles.nextButtonText, { color: colors.onPrimary }]}>Confirmar e Salvar</Text>
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
        marginHorizontal: 6,
        marginBottom: 20,
    },
    progressDot: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    progressDotText: {
        ...typography.labelMedium,
        fontWeight: '700',
    },
    progressLabel: {
        ...typography.labelSmall,
        fontWeight: '500',
    },
    stepContent: {
        flex: 1,
    },
    stepTitle: {
        ...typography.titleLarge,
        marginBottom: 4,
    },
    stepHint: {
        ...typography.bodyMedium,
        marginBottom: 20,
    },
    fieldLabel: {
        ...typography.labelLarge,
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
        marginRight: 8,
        borderWidth: 1,
    },
    classChipText: {
        ...typography.labelMedium,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        paddingHorizontal: 14,
        gap: 8,
        borderWidth: 1,
        marginBottom: 8,
    },
    searchInput: {
        flex: 1,
        paddingVertical: 13,
        ...typography.bodyLarge,
    },
    studentItem: {
        borderRadius: 12,
        padding: 14,
        marginBottom: 8,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        minHeight: 60,
    },
    studentName: {
        ...typography.bodyLarge,
        fontWeight: '600',
    },
    studentMeta: {
        ...typography.bodySmall,
        marginTop: 2,
    },
    selectedBanner: {
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        marginTop: 8,
    },
    selectedBannerText: {
        ...typography.bodyMedium,
        marginBottom: 10,
    },
    nextButton: {
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 6,
    },
    nextButtonText: {
        ...typography.labelLarge,
    },
    studentSelectedCard: {
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        marginBottom: 20,
    },
    studentSelectedLabel: {
        ...typography.labelSmall,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    studentSelectedName: {
        ...typography.titleMedium,
        marginTop: 2,
    },
    studentSelectedClass: {
        ...typography.bodySmall,
        marginTop: 2,
    },
    backButton: {
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 16,
    },
    backButtonText: {
        ...typography.labelLarge,
    },
    savingOverlay: {
        alignItems: 'center',
        paddingVertical: 32,
    },
    savingText: {
        ...typography.bodyLarge,
        marginTop: 12,
    },
    tabsContainer: {
        flexDirection: 'row',
        borderRadius: 12,
        padding: 4,
        marginBottom: 24,
        borderWidth: 1,
    },
    tabButton: {
        flex: 1,
        paddingVertical: 11,
        alignItems: 'center',
        borderRadius: 8,
    },
    tabText: {
        ...typography.labelMedium,
    },
    textInputContainer: {
        marginBottom: 16,
    },
    textInputHint: {
        ...typography.bodySmall,
        marginBottom: 10,
        lineHeight: 20,
    },
    textInputArea: {
        borderRadius: 16,
        borderWidth: 1,
        minHeight: 160,
        padding: 16,
        ...typography.bodyLarge,
        lineHeight: 22,
        marginBottom: 16,
        textAlignVertical: 'top',
    },
    processTextButton: {
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
    },
    processTextButtonLabel: {
        ...typography.labelLarge,
    },
    emptyListText: {
        textAlign: 'center',
        paddingVertical: 24,
        ...typography.bodyMedium,
        lineHeight: 22,
        paddingHorizontal: 16,
    },
    locationGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 12,
        marginTop: 8,
    },
    locationItem: {
        width: '47%' as any,
        borderRadius: 12,
        paddingVertical: 18,
        paddingHorizontal: 12,
        alignItems: 'center',
        borderWidth: 2,
    },
    locationItemText: {
        ...typography.labelLarge,
        textAlign: 'center',
    },
    categoryItem: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 14,
        marginBottom: 8,
        borderWidth: 2,
        gap: 12,
    },
    categoryItemText: {
        flex: 1,
        ...typography.bodyMedium,
    },
    categoryNumber: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        ...typography.labelSmall,
        fontWeight: '700',
        textAlign: 'center',
        lineHeight: 28,
        overflow: 'hidden',
    },
    preGeneratedCard: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
    },
    preGeneratedTitle: {
        ...typography.titleMedium,
        marginBottom: 8,
    },
    preGeneratedHint: {
        ...typography.bodySmall,
        marginBottom: 12,
        lineHeight: 20,
    },
});
