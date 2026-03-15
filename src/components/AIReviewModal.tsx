// src/components/AIReviewModal.tsx
// Modal for reviewing AI-transcribed and formally rewritten text

import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Modal,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { X, Microphone, Sparkle, ArrowCounterClockwise, CheckCircle } from 'phosphor-react-native';
import { useTheme } from '../lib/theme';

interface AIReviewModalProps {
    visible: boolean;
    originalText: string;
    formalText: string;
    onConfirm: (editedFormalText: string) => void;
    onReRecord: () => void;
    onClose: () => void;
}

export function AIReviewModal({
    visible,
    originalText,
    formalText,
    onConfirm,
    onReRecord,
    onClose,
}: AIReviewModalProps) {
    const { colors } = useTheme();
    const [editedText, setEditedText] = useState(formalText);

    // Reset edited text when formalText changes
    React.useEffect(() => {
        setEditedText(formalText);
    }, [formalText]);

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                style={[styles.container, { backgroundColor: colors.background }]}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                {/* Header */}
                <View style={[styles.header, { borderBottomColor: colors.outline }]}>
                    <TouchableOpacity onPress={onClose} style={[styles.closeButton, { backgroundColor: colors.surfaceVariant }]}>
                        <X size={16} color={colors.onSurfaceVariant} weight="bold" />
                    </TouchableOpacity>
                    <Text style={[styles.title, { color: colors.onSurface }]}>Revisão da Ocorrência</Text>
                    <View style={styles.headerSpacer} />
                </View>

                <ScrollView
                    style={styles.content}
                    contentContainerStyle={styles.contentContainer}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Original Transcription */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Microphone size={18} color={colors.onSurface} weight="bold" />
                            <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>Transcrição Original</Text>
                        </View>
                        <View style={[styles.originalBox, { backgroundColor: colors.surface, borderColor: colors.outline }]}>
                            <Text style={[styles.originalText, { color: colors.onSurfaceVariant }]}>{originalText}</Text>
                        </View>
                    </View>

                    {/* AI Formal Rewrite */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Sparkle size={18} color={colors.onSurface} weight="fill" />
                            <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>Versão Formal (editável)</Text>
                        </View>
                        <View style={[styles.aiLabel, { backgroundColor: colors.primary + '20' }]}>
                            <Text style={[styles.aiLabelText, { color: colors.primary }]}>Reescrito por IA</Text>
                        </View>
                        <TextInput
                            style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.primary + '60', color: colors.onSurface }]}
                            value={editedText}
                            onChangeText={setEditedText}
                            multiline
                            textAlignVertical="top"
                            placeholder="Texto formal da ocorrência..."
                            placeholderTextColor={colors.onSurfaceVariant}
                        />
                    </View>
                </ScrollView>

                {/* Action Buttons */}
                <View style={[styles.actions, { borderTopColor: colors.outline }]}>
                    <TouchableOpacity
                        style={[styles.reRecordButton, { backgroundColor: colors.surfaceVariant }]}
                        onPress={onReRecord}
                        activeOpacity={0.7}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <ArrowCounterClockwise size={16} color={colors.onSurface} />
                            <Text style={[styles.reRecordText, { color: colors.onSurface }]}>Regravar</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.confirmButton,
                            { backgroundColor: colors.primary },
                            !editedText.trim() && styles.confirmButtonDisabled,
                        ]}
                        onPress={() => onConfirm(editedText)}
                        disabled={!editedText.trim()}
                        activeOpacity={0.7}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <CheckCircle size={16} color={colors.onPrimary} weight="bold" />
                            <Text style={[styles.confirmText, { color: colors.onPrimary }]}>Confirmar</Text>
                        </View>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
    },
    closeButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
    },
    headerSpacer: {
        width: 36,
    },
    content: {
        flex: 1,
    },
    contentContainer: {
        padding: 20,
    },
    section: {
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 8,
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '600',
    },
    originalBox: {
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
    },
    originalText: {
        fontSize: 14,
        lineHeight: 22,
        fontStyle: 'italic',
    },
    aiLabel: {
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        marginBottom: 8,
    },
    aiLabelText: {
        fontSize: 11,
        fontWeight: '600',
    },
    textInput: {
        borderRadius: 12,
        padding: 16,
        fontSize: 15,
        lineHeight: 24,
        minHeight: 160,
        borderWidth: 1,
    },
    actions: {
        flexDirection: 'row',
        padding: 16,
        gap: 12,
        borderTopWidth: 1,
    },
    reRecordButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    reRecordText: {
        fontSize: 15,
        fontWeight: '600',
    },
    confirmButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    confirmButtonDisabled: {
        opacity: 0.5,
    },
    confirmText: {
        fontSize: 15,
        fontWeight: '600',
    },
});

export default AIReviewModal;
