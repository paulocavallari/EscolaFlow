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
import { COLORS } from '../lib/constants';

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
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <Text style={styles.closeText}>✕</Text>
                    </TouchableOpacity>
                    <Text style={styles.title}>Revisão da Ocorrência</Text>
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
                            <Text style={styles.sectionIcon}>🎙️</Text>
                            <Text style={styles.sectionTitle}>Transcrição Original</Text>
                        </View>
                        <View style={styles.originalBox}>
                            <Text style={styles.originalText}>{originalText}</Text>
                        </View>
                    </View>

                    {/* AI Formal Rewrite */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionIcon}>✨</Text>
                            <Text style={styles.sectionTitle}>Versão Formal (editável)</Text>
                        </View>
                        <View style={styles.aiLabel}>
                            <Text style={styles.aiLabelText}>Reescrito por IA</Text>
                        </View>
                        <TextInput
                            style={styles.textInput}
                            value={editedText}
                            onChangeText={setEditedText}
                            multiline
                            textAlignVertical="top"
                            placeholder="Texto formal da ocorrência..."
                            placeholderTextColor={COLORS.textMuted}
                        />
                    </View>
                </ScrollView>

                {/* Action Buttons */}
                <View style={styles.actions}>
                    <TouchableOpacity
                        style={styles.reRecordButton}
                        onPress={onReRecord}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.reRecordText}>🔄 Regravar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.confirmButton,
                            !editedText.trim() && styles.confirmButtonDisabled,
                        ]}
                        onPress={() => onConfirm(editedText)}
                        disabled={!editedText.trim()}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.confirmText}>✅ Confirmar</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    closeButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: COLORS.surfaceLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeText: {
        fontSize: 16,
        color: COLORS.textSecondary,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.textPrimary,
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
    },
    sectionIcon: {
        fontSize: 18,
        marginRight: 8,
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    originalBox: {
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    originalText: {
        fontSize: 14,
        color: COLORS.textSecondary,
        lineHeight: 22,
        fontStyle: 'italic',
    },
    aiLabel: {
        backgroundColor: COLORS.primaryLight + '30',
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        marginBottom: 8,
    },
    aiLabelText: {
        fontSize: 11,
        fontWeight: '600',
        color: COLORS.primary,
    },
    textInput: {
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        padding: 16,
        fontSize: 15,
        color: COLORS.textPrimary,
        lineHeight: 24,
        minHeight: 160,
        borderWidth: 1,
        borderColor: COLORS.primary + '60',
    },
    actions: {
        flexDirection: 'row',
        padding: 16,
        gap: 12,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    reRecordButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: COLORS.surfaceLight,
        alignItems: 'center',
    },
    reRecordText: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    confirmButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
    },
    confirmButtonDisabled: {
        opacity: 0.5,
    },
    confirmText: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.white,
    },
});

export default AIReviewModal;
