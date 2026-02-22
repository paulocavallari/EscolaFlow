// src/components/AudioRecorder.tsx
// Audio recording component using expo-av with visual feedback

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Animated,
    ActivityIndicator,
    Platform,
} from 'react-native';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { COLORS } from '../lib/constants';

const PROCESSING_MESSAGES = [
    'Analisando áudio...',
    'Transcrevendo relato...',
    'Formalizando texto...',
    'Quase pronto...',
];

function ProcessingView({ onCancel }: { onCancel?: () => void }) {
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
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.processingText}>{PROCESSING_MESSAGES[msgIndex]}</Text>
            <Text style={styles.processingSubtext}>{elapsed}s — aguarde</Text>
            {onCancel && (
                <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
                    <Text style={styles.cancelButtonText}>Cancelar</Text>
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
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [permissionGranted, setPermissionGranted] = useState(false);

    const pulseAnim = useRef(new Animated.Value(1)).current;

    // Request permissions on mount
    useEffect(() => {
        (async () => {
            const { status } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
            setPermissionGranted(status === 'granted');
        })();
    }, []);

    useSpeechRecognitionEvent('start', () => setIsRecording(true));
    useSpeechRecognitionEvent('end', () => setIsRecording(false));
    useSpeechRecognitionEvent('error', (event) => {
        console.error('Speech recognition error:', event.error, event.message);
        setIsRecording(false);
    });

    useSpeechRecognitionEvent('result', (event) => {
        const newTranscript = event.results.map(r => r.transcript).join('');
        setTranscript(newTranscript);
    });

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
        setTranscript('');
        try {
            await ExpoSpeechRecognitionModule.start({
                lang: 'pt-BR',
                interimResults: true,
                maxAlternatives: 1,
                continuous: true,
                requiresOnDeviceRecognition: false, // Fallback to cloud if local model not downloaded
            });
        } catch (err) {
            console.error('Failed to start speech recognition:', err);
            setIsRecording(false);
        }
    }, []);

    const stopRecording = useCallback(() => {
        ExpoSpeechRecognitionModule.stop();
        // Give it a tiny delay to flush final results before passing it up
        setTimeout(() => {
            if (transcript.trim()) {
                onTranscriptionComplete(transcript.trim());
            }
        }, 300);
    }, [onTranscriptionComplete, transcript]);

    if (!permissionGranted) {
        return (
            <View style={styles.container}>
                <Text style={styles.permissionText}>
                    Permissão de microfone necessária para gravar áudio.
                </Text>
            </View>
        );
    }

    if (isProcessing) {
        return <ProcessingView onCancel={onCancelProcessing} />;
    }

    return (
        <View style={styles.container}>
            {!!transcript && (
                <View style={styles.transcriptBox}>
                    <Text style={[styles.transcriptText, !isRecording && { color: COLORS.textPrimary }]}>
                        {transcript}
                    </Text>
                </View>
            )}

            <TouchableOpacity
                onPress={isRecording ? stopRecording : startRecording}
                activeOpacity={0.7}
            >
                <Animated.View
                    style={[
                        styles.recordButton,
                        isRecording && styles.recordButtonActive,
                        { transform: [{ scale: pulseAnim }] },
                    ]}
                >
                    {isRecording ? (
                        <View style={styles.stopIcon} />
                    ) : (
                        <View style={styles.micIcon}>
                            <Text style={styles.micText}>🎙️</Text>
                        </View>
                    )}
                </Animated.View>
            </TouchableOpacity>

            <Text style={styles.hint}>
                {isRecording
                    ? 'Toque para parar a gravação'
                    : 'Toque para gravar a ocorrência'}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 32,
    },
    duration: {
        fontSize: 32,
        fontWeight: '300',
        color: COLORS.textPrimary,
        marginBottom: 24,
        fontVariant: ['tabular-nums'],
    },
    recordButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: COLORS.error,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: COLORS.error,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
    },
    recordButtonActive: {
        backgroundColor: COLORS.error,
        borderWidth: 3,
        borderColor: COLORS.white,
    },
    stopIcon: {
        width: 24,
        height: 24,
        borderRadius: 4,
        backgroundColor: COLORS.white,
    },
    micIcon: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    micText: {
        fontSize: 32,
    },
    hint: {
        marginTop: 16,
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    permissionText: {
        fontSize: 14,
        color: COLORS.warning,
        textAlign: 'center',
        paddingHorizontal: 20,
    },
    processingText: {
        marginTop: 16,
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    processingSubtext: {
        marginTop: 4,
        fontSize: 13,
        color: COLORS.textSecondary,
    },
    cancelButton: {
        marginTop: 24,
        paddingHorizontal: 24,
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.textMuted,
    },
    cancelButtonText: {
        fontSize: 14,
        color: COLORS.textSecondary,
        fontWeight: '500',
    },
    transcriptBox: {
        backgroundColor: COLORS.border + '40',
        padding: 16,
        borderRadius: 12,
        marginBottom: 24,
        width: '100%',
        minHeight: 80,
    },
    transcriptText: {
        fontSize: 16,
        color: COLORS.textSecondary,
        lineHeight: 24,
        fontStyle: 'italic',
    },
});

export default AudioRecorder;
