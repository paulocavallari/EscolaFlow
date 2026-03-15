// src/components/AudioRecorder.tsx
// Audio recording component using expo-speech-recognition with visual feedback

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Animated,
    ActivityIndicator,
    Platform,
    Linking,
} from 'react-native';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { Microphone, Trash, Sparkle, StopCircle } from 'phosphor-react-native';
import { useTheme } from '../lib/theme';

const PROCESSING_MESSAGES = [
    'Analisando áudio...',
    'Transcrevendo relato...',
    'Formalizando texto...',
    'Quase pronto...',
];

function ProcessingView({ onCancel }: { onCancel?: () => void }) {
    const { colors } = useTheme();
    const [msgIndex, setMsgIndex] = useState(0);
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        const msgTimer = setInterval(() => {
            setMsgIndex((i) => (i + 1) % PROCESSING_MESSAGES.length);
        }, 2200);
        const elapsedTimer = setInterval(() => {
            setElapsed((s) => s + 1);
        }, 1000);
        return () => {
            clearInterval(msgTimer);
            clearInterval(elapsedTimer);
        };
    }, []);

    return (
        <View style={styles.container}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.processingText, { color: colors.onSurface }]}>{PROCESSING_MESSAGES[msgIndex]}</Text>
            <Text style={[styles.processingSubtext, { color: colors.onSurfaceVariant }]}>{elapsed}s — aguarde</Text>
            {onCancel && (
                <TouchableOpacity style={[styles.cancelButton, { borderColor: colors.onSurfaceVariant }]} onPress={onCancel}>
                    <Text style={[styles.cancelButtonText, { color: colors.onSurfaceVariant }]}>Cancelar</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

interface AudioRecorderProps {
    onTranscriptionComplete: (text: string) => void;
    isProcessing?: boolean;
    onCancelProcessing?: () => void;
}

export function AudioRecorder({ onTranscriptionComplete, isProcessing = false, onCancelProcessing }: AudioRecorderProps) {
    const { colors } = useTheme();
    const [isRecording, setIsRecording] = useState(false);
    const [isReviewing, setIsReviewing] = useState(false);
    const [finalTranscript, setFinalTranscript] = useState('');
    const [interimTranscript, setInterimTranscript] = useState('');
    const [permissionGranted, setPermissionGranted] = useState(false);
    const [permissionDenied, setPermissionDenied] = useState(false);

    const pulseAnim = useRef(new Animated.Value(1)).current;

    // Request permissions on mount
    useEffect(() => {
        (async () => {
            const { status } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
            if (status === 'granted') {
                setPermissionGranted(true);
            } else {
                setPermissionDenied(true);
            }
        })();
    }, []);

    const handleRequestPermission = useCallback(async () => {
        const { status } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        if (status === 'granted') {
            setPermissionGranted(true);
            setPermissionDenied(false);
        } else {
            // On iOS/Android, open system settings if already denied
            if (Platform.OS !== 'web') {
                Linking.openSettings();
            }
        }
    }, []);

    useSpeechRecognitionEvent('start', () => setIsRecording(true));
    useSpeechRecognitionEvent('end', () => setIsRecording(false));
    useSpeechRecognitionEvent('error', (event) => {
        console.warn('Speech recognition error:', event.error);
    });

    useSpeechRecognitionEvent('result', (event) => {
        const currentInterim = event.results.map(r => r.transcript).join('');

        if (event.isFinal) {
            setFinalTranscript((prev) => {
                const separator = prev ? ' ' : '';
                return prev + separator + currentInterim;
            });
            setInterimTranscript('');
        } else {
            setInterimTranscript(currentInterim);
        }
    });

    // Combined transcript for display
    const transcript = [finalTranscript, interimTranscript].filter(Boolean).join(' ');

    // Pulse animation while recording
    useEffect(() => {
        if (isRecording) {
            const animation = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.3,
                        duration: 600,
                        useNativeDriver: Platform.OS !== 'web',
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 600,
                        useNativeDriver: Platform.OS !== 'web',
                    }),
                ])
            );
            animation.start();
            return () => animation.stop();
        } else {
            pulseAnim.setValue(1);
        }
    }, [isRecording, pulseAnim]);

    const startRecording = useCallback(async () => {
        setIsReviewing(false);
        try {
            await ExpoSpeechRecognitionModule.start({
                lang: 'pt-BR',
                interimResults: true,
                maxAlternatives: 1,
                continuous: true,
                requiresOnDeviceRecognition: false,
            });
        } catch (err) {
            console.error('Failed to start speech recognition:', err);
            setIsRecording(false);
        }
    }, []);

    const stopRecording = useCallback(() => {
        ExpoSpeechRecognitionModule.stop();
        if (transcript.trim()) {
            setIsReviewing(true);
        }
    }, [transcript]);

    const handleConfirm = useCallback(() => {
        if (transcript.trim()) {
            onTranscriptionComplete(transcript.trim());
        }
    }, [onTranscriptionComplete, transcript]);

    const handleDiscard = useCallback(() => {
        setFinalTranscript('');
        setInterimTranscript('');
        setIsReviewing(false);
    }, []);

    // Permission denied state
    if (permissionDenied && !permissionGranted) {
        return (
            <View style={styles.container}>
                <View style={[styles.permissionIconCircle, { backgroundColor: colors.surfaceVariant }]}>
                    <Microphone size={36} color={colors.onSurfaceVariant} weight="duotone" />
                </View>
                <Text style={[styles.permissionTitle, { color: colors.onSurface }]}>Microfone necessário</Text>
                <Text style={[styles.permissionText, { color: colors.onSurfaceVariant }]}>
                    Para gravar o relato, o aplicativo precisa de acesso ao microfone.
                </Text>
                <TouchableOpacity style={[styles.permissionButton, { backgroundColor: colors.primary }]} onPress={handleRequestPermission}>
                    <Text style={[styles.permissionButtonText, { color: colors.onPrimary }]}>Permitir Acesso ao Microfone</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (isProcessing) {
        return <ProcessingView onCancel={onCancelProcessing} />;
    }

    return (
        <View style={styles.container}>
            {/* Instruction banner */}
            {!isRecording && !isReviewing && !transcript && (
                <View style={[styles.instructionBanner, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
                    <Text style={[styles.instructionText, { color: colors.onSurfaceVariant }]}>
                        Toque no botão vermelho abaixo para iniciar a gravação.{'\n'}
                        Fale o relato da ocorrência com seus próprios termos.
                    </Text>
                </View>
            )}

            {!!transcript && (
                <View style={[styles.transcriptBox, { backgroundColor: colors.outline + '40' }]}>
                    <Text style={[styles.transcriptLabel, { color: colors.onSurfaceVariant }]}>Transcrição:</Text>
                    <Text style={[styles.transcriptText, !isRecording ? { color: colors.onSurface } : { color: colors.onSurfaceVariant }]}>
                        {transcript}
                    </Text>
                </View>
            )}

            {isReviewing ? (
                <View style={styles.reviewActions}>
                    <TouchableOpacity
                        style={[styles.reviewBtn, styles.discardBtn, { backgroundColor: colors.outline + '40', borderColor: colors.outline }]}
                        onPress={handleDiscard}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Trash size={16} color={colors.error} />
                            <Text style={[styles.discardBtnText, { color: colors.error }]}>Descartar</Text>
                        </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.reviewBtn, styles.confirmBtn, { backgroundColor: colors.primary }]}
                        onPress={handleConfirm}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Sparkle size={16} color={colors.onPrimary} weight="fill" />
                            <Text style={[styles.confirmBtnText, { color: colors.onPrimary }]}>Processar com IA</Text>
                        </View>
                    </TouchableOpacity>
                </View>
            ) : (
                <>
                    <TouchableOpacity
                        onPress={isRecording ? stopRecording : startRecording}
                        activeOpacity={0.7}
                    >
                        <Animated.View
                            style={[
                                styles.recordButton,
                                { backgroundColor: colors.error, shadowColor: colors.error },
                                isRecording && [styles.recordButtonActive, { borderColor: '#fff' }],
                                { transform: [{ scale: pulseAnim }] },
                            ]}
                        >
                            {isRecording ? (
                                <View style={styles.stopIcon} />
                            ) : (
                                <Microphone size={36} color="#fff" weight="bold" />
                            )}
                        </Animated.View>
                    </TouchableOpacity>

                    <Text style={[styles.hint, { color: colors.onSurfaceVariant }]}>
                        {isRecording
                            ? 'Toque para parar a gravação'
                            : transcript
                                ? 'Toque para continuar gravando'
                                : 'Toque para iniciar a gravação'}
                    </Text>
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 24,
    },
    instructionBanner: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
        width: '100%',
        borderWidth: 1,
    },
    instructionText: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 22,
    },
    recordButton: {
        width: 88,
        height: 88,
        borderRadius: 44,
        alignItems: 'center',
        justifyContent: 'center',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
    },
    recordButtonActive: {
        borderWidth: 3,
    },
    stopIcon: {
        width: 26,
        height: 26,
        borderRadius: 4,
        backgroundColor: '#fff',
    },
    hint: {
        marginTop: 16,
        fontSize: 14,
        textAlign: 'center',
    },
    permissionIconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    permissionTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 8,
    },
    permissionText: {
        fontSize: 14,
        textAlign: 'center',
        paddingHorizontal: 24,
        marginBottom: 20,
        lineHeight: 22,
    },
    permissionButton: {
        borderRadius: 12,
        paddingHorizontal: 24,
        paddingVertical: 14,
    },
    permissionButtonText: {
        fontWeight: '700',
        fontSize: 15,
    },
    processingText: {
        marginTop: 16,
        fontSize: 16,
        fontWeight: '600',
    },
    processingSubtext: {
        marginTop: 4,
        fontSize: 13,
    },
    cancelButton: {
        marginTop: 24,
        paddingHorizontal: 24,
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 1,
    },
    cancelButtonText: {
        fontSize: 14,
        fontWeight: '500',
    },
    transcriptBox: {
        padding: 16,
        borderRadius: 12,
        marginBottom: 24,
        width: '100%',
        minHeight: 80,
    },
    transcriptLabel: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 6,
    },
    transcriptText: {
        fontSize: 16,
        lineHeight: 24,
        fontStyle: 'italic',
    },
    reviewActions: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        marginTop: 16,
        width: '100%',
    },
    reviewBtn: {
        flex: 1,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    confirmBtn: {},
    confirmBtnText: {
        fontSize: 15,
        fontWeight: 'bold',
    },
    discardBtn: {
        borderWidth: 1,
    },
    discardBtnText: {
        fontSize: 15,
        fontWeight: '600',
    },
});

export default AudioRecorder;
