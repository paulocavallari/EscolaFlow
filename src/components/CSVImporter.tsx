// src/components/CSVImporter.tsx
// CSV file picker and upload component for Admin panel

import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    ScrollView,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { COLORS } from '../lib/constants';
import { CSVImportResult } from '../types/database';
import { useImportCSV } from '../hooks/useStudents';

export function CSVImporter() {
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string>('');
    const [result, setResult] = useState<CSVImportResult | null>(null);

    const importMutation = useImportCSV();

    const pickFile = async () => {
        try {
            const docResult = await DocumentPicker.getDocumentAsync({
                type: 'text/csv',
                copyToCacheDirectory: true,
            });

            if (!docResult.canceled && docResult.assets[0]) {
                const asset = docResult.assets[0];
                setSelectedFile(asset.uri);
                setFileName(asset.name);
                setResult(null);
            }
        } catch (err) {
            console.error('Error picking document:', err);
        }
    };

    const handleImport = async () => {
        if (!selectedFile) return;

        try {
            const importResult = await importMutation.mutateAsync(selectedFile);
            setResult(importResult);
        } catch (err) {
            console.error('Import failed:', err);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>📥 Importar Alunos via CSV</Text>
            <Text style={styles.subtitle}>
                Colunas aceitas: Nome, Matricula, TurmaID, TutorID
            </Text>

            {/* File Picker */}
            <TouchableOpacity
                style={styles.pickButton}
                onPress={pickFile}
                activeOpacity={0.7}
            >
                <Text style={styles.pickButtonText}>
                    {selectedFile ? '📄 ' + fileName : '📁 Selecionar arquivo CSV'}
                </Text>
            </TouchableOpacity>

            {/* Import Button */}
            {selectedFile && (
                <TouchableOpacity
                    style={[
                        styles.importButton,
                        importMutation.isPending && styles.importButtonDisabled,
                    ]}
                    onPress={handleImport}
                    disabled={importMutation.isPending}
                    activeOpacity={0.7}
                >
                    {importMutation.isPending ? (
                        <ActivityIndicator size="small" color={COLORS.white} />
                    ) : (
                        <Text style={styles.importButtonText}>⬆️ Importar</Text>
                    )}
                </TouchableOpacity>
            )}

            {/* Results */}
            {result && (
                <View style={styles.resultContainer}>
                    <Text style={styles.resultTitle}>Resultado da Importação</Text>

                    <View style={styles.statsRow}>
                        <View style={[styles.statBox, { backgroundColor: COLORS.info + '20' }]}>
                            <Text style={[styles.statNumber, { color: COLORS.info }]}>
                                {result.total}
                            </Text>
                            <Text style={styles.statLabel}>Total</Text>
                        </View>
                        <View style={[styles.statBox, { backgroundColor: COLORS.success + '20' }]}>
                            <Text style={[styles.statNumber, { color: COLORS.success }]}>
                                {result.inserted}
                            </Text>
                            <Text style={styles.statLabel}>Inseridos</Text>
                        </View>
                        <View style={[styles.statBox, { backgroundColor: COLORS.warning + '20' }]}>
                            <Text style={[styles.statNumber, { color: COLORS.warning }]}>
                                {result.skipped}
                            </Text>
                            <Text style={styles.statLabel}>Ignorados</Text>
                        </View>
                    </View>

                    {/* Errors */}
                    {result.errors.length > 0 && (
                        <ScrollView style={styles.errorList}>
                            <Text style={styles.errorTitle}>Erros:</Text>
                            {result.errors.map((err, idx) => (
                                <Text key={idx} style={styles.errorItem}>
                                    Linha {err.row}: {err.message}
                                </Text>
                            ))}
                        </ScrollView>
                    )}
                </View>
            )}

            {/* Error state */}
            {importMutation.isError && (
                <View style={styles.errorBox}>
                    <Text style={styles.errorText}>
                        ❌ Erro na importação: {importMutation.error?.message}
                    </Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 20,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 13,
        color: COLORS.textSecondary,
        marginBottom: 20,
    },
    pickButton: {
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: COLORS.border,
        borderStyle: 'dashed',
    },
    pickButtonText: {
        fontSize: 15,
        color: COLORS.textSecondary,
        fontWeight: '500',
    },
    importButton: {
        backgroundColor: COLORS.primary,
        borderRadius: 12,
        padding: 14,
        alignItems: 'center',
        marginTop: 12,
    },
    importButtonDisabled: {
        opacity: 0.6,
    },
    importButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.white,
    },
    resultContainer: {
        marginTop: 20,
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        padding: 16,
    },
    resultTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: 12,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 8,
    },
    statBox: {
        flex: 1,
        borderRadius: 10,
        padding: 12,
        alignItems: 'center',
    },
    statNumber: {
        fontSize: 24,
        fontWeight: '700',
    },
    statLabel: {
        fontSize: 11,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    errorList: {
        marginTop: 12,
        maxHeight: 200,
    },
    errorTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.error,
        marginBottom: 6,
    },
    errorItem: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginBottom: 4,
        paddingLeft: 8,
    },
    errorBox: {
        marginTop: 12,
        backgroundColor: COLORS.error + '15',
        borderRadius: 8,
        padding: 12,
    },
    errorText: {
        fontSize: 13,
        color: COLORS.error,
    },
});

export default CSVImporter;
