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
import { DownloadSimple, FileText, FolderOpen, UploadSimple, WarningCircle } from 'phosphor-react-native';
import { CSVImportResult } from '../types/database';
import { useImportCSV } from '../hooks/useStudents';
import { useTheme } from '../lib/theme';

export function CSVImporter() {
    const { colors } = useTheme();
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <DownloadSimple size={20} color={colors.onSurface} weight="bold" />
                <Text style={[styles.title, { color: colors.onSurface }]}>Importar Alunos via CSV</Text>
            </View>
            <Text style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
                Colunas aceitas: Nome, RA, TurmaID
            </Text>

            {/* File Picker */}
            <TouchableOpacity
                style={[styles.pickButton, { backgroundColor: colors.surface, borderColor: colors.outline }]}
                onPress={pickFile}
                activeOpacity={0.7}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {selectedFile
                        ? <FileText size={18} color={colors.onSurfaceVariant} />
                        : <FolderOpen size={18} color={colors.onSurfaceVariant} />}
                    <Text style={[styles.pickButtonText, { color: colors.onSurfaceVariant }]}>
                        {selectedFile ? fileName : 'Selecionar arquivo CSV'}
                    </Text>
                </View>
            </TouchableOpacity>

            {/* Import Button */}
            {selectedFile && (
                <TouchableOpacity
                    style={[
                        styles.importButton,
                        { backgroundColor: colors.primary },
                        importMutation.isPending && styles.importButtonDisabled,
                    ]}
                    onPress={handleImport}
                    disabled={importMutation.isPending}
                    activeOpacity={0.7}
                >
                    {importMutation.isPending ? (
                        <ActivityIndicator size="small" color={colors.onPrimary} />
                    ) : (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <UploadSimple size={16} color={colors.onPrimary} weight="bold" />
                            <Text style={[styles.importButtonText, { color: colors.onPrimary }]}>Importar</Text>
                        </View>
                    )}
                </TouchableOpacity>
            )}

            {/* Results */}
            {result && (
                <View style={[styles.resultContainer, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.resultTitle, { color: colors.onSurface }]}>Resultado da Importação</Text>

                    <View style={styles.statsRow}>
                        <View style={[styles.statBox, { backgroundColor: colors.info + '20' }]}>
                            <Text style={[styles.statNumber, { color: colors.info }]}>
                                {result.total}
                            </Text>
                            <Text style={[styles.statLabel, { color: colors.onSurfaceVariant }]}>Total</Text>
                        </View>
                        <View style={[styles.statBox, { backgroundColor: colors.success + '20' }]}>
                            <Text style={[styles.statNumber, { color: colors.success }]}>
                                {result.inserted}
                            </Text>
                            <Text style={[styles.statLabel, { color: colors.onSurfaceVariant }]}>Inseridos</Text>
                        </View>
                        <View style={[styles.statBox, { backgroundColor: colors.warning + '20' }]}>
                            <Text style={[styles.statNumber, { color: colors.warning }]}>
                                {result.skipped}
                            </Text>
                            <Text style={[styles.statLabel, { color: colors.onSurfaceVariant }]}>Ignorados</Text>
                        </View>
                    </View>

                    {/* Errors */}
                    {result.errors.length > 0 && (
                        <ScrollView style={styles.errorList}>
                            <Text style={[styles.errorTitle, { color: colors.error }]}>Erros:</Text>
                            {result.errors.map((err, idx) => (
                                <Text key={idx} style={[styles.errorItem, { color: colors.onSurfaceVariant }]}>
                                    Linha {err.row}: {err.message}
                                </Text>
                            ))}
                        </ScrollView>
                    )}
                </View>
            )}

            {/* Error state */}
            {importMutation.isError && (
                <View style={[styles.errorBox, { backgroundColor: colors.error + '15' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <WarningCircle size={16} color={colors.error} />
                        <Text style={[styles.errorText, { color: colors.error }]}>
                            Erro na importação: {importMutation.error?.message}
                        </Text>
                    </View>
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
    },
    subtitle: {
        fontSize: 13,
        marginBottom: 20,
    },
    pickButton: {
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        borderWidth: 2,
        borderStyle: 'dashed',
    },
    pickButtonText: {
        fontSize: 15,
        fontWeight: '500',
    },
    importButton: {
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
    },
    resultContainer: {
        marginTop: 20,
        borderRadius: 12,
        padding: 16,
    },
    resultTitle: {
        fontSize: 16,
        fontWeight: '600',
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
        marginTop: 2,
    },
    errorList: {
        marginTop: 12,
        maxHeight: 200,
    },
    errorTitle: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 6,
    },
    errorItem: {
        fontSize: 12,
        marginBottom: 4,
        paddingLeft: 8,
    },
    errorBox: {
        marginTop: 12,
        borderRadius: 8,
        padding: 12,
    },
    errorText: {
        fontSize: 13,
        flex: 1,
    },
});

export default CSVImporter;
