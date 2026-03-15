// src/components/AIProcessingIndicator.tsx
// Reusable loading indicator for OpenRouter AI requests.
// Shows elapsed time and phase-based messages to inform the user of progress,
// including a warning if the request is taking unusually long.

import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    StyleSheet,
} from 'react-native';
import { Sparkle, WarningCircle } from 'phosphor-react-native';
import { useTheme } from '../lib/theme';

interface AIProcessingIndicatorProps {
    /** Optional label for the operation name, e.g. "Formatando relato" */
    label?: string;
    /** Called when the user presses Cancel (only shown after 4s) */
    onCancel?: () => void;
    /** Compact mode for inline use (e.g. inside a card) */
    compact?: boolean;
}

const PHASES: { minSeconds: number; message: string }[] = [
    { minSeconds: 0,  message: 'Conectando à I.A...' },
    { minSeconds: 4,  message: 'Processando e reescrevendo...' },
    { minSeconds: 9,  message: 'Aguardando resposta da I.A...' },
    { minSeconds: 15, message: 'Tentando modelo alternativo...' },
    { minSeconds: 22, message: 'Demorando mais que o normal, ainda tentando...' },
    { minSeconds: 32, message: 'Se demorar demais, cancele e tente novamente.' },
];

export function AIProcessingIndicator({ label, onCancel, compact = false }: AIProcessingIndicatorProps) {
    const { colors } = useTheme();
    const [seconds, setSeconds] = useState(0);

    useEffect(() => {
        setSeconds(0);
        const interval = setInterval(() => setSeconds((s) => s + 1), 1000);
        return () => clearInterval(interval);
    }, []);

    // Pick the highest phase whose minSeconds has been passed
    const currentPhase = PHASES.reduce<typeof PHASES[0]>(
        (acc, p) => (seconds >= p.minSeconds ? p : acc),
        PHASES[0]
    );

    const isWarning = seconds >= 22;
    const isCritical = seconds >= 32;
    const spinnerColor = isCritical ? colors.error : isWarning ? colors.warning : colors.primary;

    if (compact) {
        return (
            <View style={[styles.compactContainer, { backgroundColor: colors.surface, borderColor: colors.primary + '30' }]}>
                <ActivityIndicator size="small" color={spinnerColor} />
                <Text style={[styles.compactMessage, { color: colors.onSurfaceVariant }, isWarning && { color: colors.warning }]}>
                    {currentPhase.message}
                </Text>
                <Text style={[styles.timer, { color: colors.onSurfaceVariant }, isWarning && { color: colors.warning }]}>
                    {seconds}s
                </Text>
                {onCancel && seconds >= 4 && (
                    <TouchableOpacity onPress={onCancel} style={styles.compactCancel}>
                        <Text style={[styles.cancelText, { color: colors.onSurfaceVariant }]}>Cancelar</Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    }

    return (
        <View style={[
            styles.container,
            { backgroundColor: colors.surface, borderColor: colors.primary + '40' },
            isWarning && !isCritical && { borderColor: colors.warning + '60', backgroundColor: colors.warning + '08' },
            isCritical && { borderColor: colors.error + '60', backgroundColor: colors.error + '08' },
        ]}>
            {/* Top row: spinner + label + timer */}
            <View style={styles.topRow}>
                <ActivityIndicator size="small" color={spinnerColor} />
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                    <Sparkle size={14} color={isWarning ? colors.warning : colors.primary} weight="fill" />
                    <Text style={[styles.label, { color: colors.primary }, isWarning && { color: colors.warning }]}>
                        {label ?? 'I.A. processando...'}
                    </Text>
                </View>
                <Text style={[styles.timer, { color: colors.onSurfaceVariant }, isWarning && { color: colors.warning }]}>
                    {seconds}s
                </Text>
            </View>

            {/* Phase message */}
            <Text style={[styles.phaseMessage, { color: colors.onSurfaceVariant }, isWarning && { color: colors.warning }]}>
                {currentPhase.message}
            </Text>

            {/* Progress bar (fills over ~30s) */}
            <View style={[styles.progressTrack, { backgroundColor: colors.surfaceVariant }]}>
                <View
                    style={[
                        styles.progressFill,
                        {
                            width: `${Math.min(100, (seconds / 30) * 100)}%` as any,
                            backgroundColor: spinnerColor,
                        },
                    ]}
                />
            </View>

            {/* Critical: reload hint */}
            {isCritical && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <WarningCircle size={14} color={colors.error} weight="bold" />
                    <Text style={[styles.reloadHint, { color: colors.error }]}>
                        Recarregue a página se o problema persistir. Verifique sua conexão com a internet.
                    </Text>
                </View>
            )}

            {/* Cancel button (appears after 4s) */}
            {onCancel && seconds >= 4 && (
                <TouchableOpacity onPress={onCancel} style={[styles.cancelButton, { backgroundColor: colors.surfaceVariant }]}>
                    <Text style={[styles.cancelText, { color: colors.onSurfaceVariant }]}>Cancelar</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: 14,
        padding: 16,
        borderWidth: 1,
        gap: 10,
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    label: {
        flex: 1,
        fontSize: 14,
        fontWeight: '700',
    },
    timer: {
        fontSize: 13,
        fontWeight: '700',
        minWidth: 28,
        textAlign: 'right',
    },
    phaseMessage: {
        fontSize: 13,
        paddingLeft: 30,
    },
    progressTrack: {
        height: 3,
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressFill: {
        height: 3,
        borderRadius: 2,
    },
    reloadHint: {
        fontSize: 12,
        lineHeight: 18,
        fontWeight: '500',
        flex: 1,
    },
    cancelButton: {
        alignSelf: 'center',
        paddingVertical: 8,
        paddingHorizontal: 24,
        borderRadius: 20,
        marginTop: 2,
    },
    cancelText: {
        fontSize: 13,
        fontWeight: '600',
    },
    // Compact variant
    compactContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 10,
        borderWidth: 1,
    },
    compactMessage: {
        flex: 1,
        fontSize: 13,
    },
    compactCancel: {
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
});

export default AIProcessingIndicator;
