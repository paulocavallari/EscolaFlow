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
import { Audio } from 'expo-av';
import { COLORS } from '../lib/constants';

interface AudioRecorderProps {
    onRecordingComplete: (uri: string) => void;
    isProcessing?: boolean;
}

export function AudioRecorder({ onRecordingComplete, isProcessing = false }: AudioRecorderProps) {
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [permissionGranted, setPermissionGranted] = useState(false);
    const recordingRef = useRef<Audio.Recording | null>(null);
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Request permissions on mount
    useEffect(() => {
        (async () => {
            const { status } = await Audio.requestPermissionsAsync();
            setPermissionGranted(status === 'granted');
        })();

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

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
        try {
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            const { recording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
            );

            recordingRef.current = recording;
            setIsRecording(true);
            setRecordingDuration(0);

            // Start timer
            timerRef.current = setInterval(() => {
                setRecordingDuration((prev) => prev + 1);
            }, 1000);
        } catch (err) {
            console.error('Failed to start recording:', err);
        }
    }, []);

    const stopRecording = useCallback(async () => {
        try {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }

            if (recordingRef.current) {
                setIsRecording(false);
                await recordingRef.current.stopAndUnloadAsync();
                const uri = recordingRef.current.getURI();
                recordingRef.current = null;

                if (uri) {
                    onRecordingComplete(uri);
                }
            }
        } catch (err) {
            console.error('Failed to stop recording:', err);
        }
    }, [onRecordingComplete]);

    const formatDuration = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

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
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.processingText}>Processando áudio com IA...</Text>
                <Text style={styles.processingSubtext}>
                    Transcrevendo e reescrevendo formalmente
                </Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {isRecording && (
                <Text style={styles.duration}>{formatDuration(recordingDuration)}</Text>
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
});

export default AudioRecorder;
