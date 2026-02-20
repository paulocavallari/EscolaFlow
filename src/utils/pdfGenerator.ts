import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { OccurrenceWithRelations, UserRole } from '../types/database';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Asset } from 'expo-asset';

export async function generateOccurrencePDF(occurrence: OccurrenceWithRelations) {
    try {
        // Load the header image asset
        // Ensure you have the file 'cabecalho-vc.jpg' in 'assets/images'
        const cabecalhoAsset = Asset.fromModule(require('../../assets/images/cabecalho-vc.jpg'));
        await cabecalhoAsset.downloadAsync();
        const headerImageUri = cabecalhoAsset.localUri || cabecalhoAsset.uri;

        const dataFormatada = format(new Date(occurrence.created_at), 'dd/MM/yyyy', { locale: ptBR });

        // Find specific actions for mediation
        const profActions = occurrence.actions?.filter(a => a.author.role === UserRole.PROFESSOR) || [];
        const vpActions = occurrence.actions?.filter(a => a.author.role === UserRole.VICE_DIRECTOR || a.author.role === UserRole.ADMIN) || [];

        const formatActions = (actions: typeof profActions) =>
            actions.map(a => `<p>- ${a.description}</p>`).join('') || '<p>___________________________________________________________________</p>';

        const htmlContent = `
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
                <meta charset="UTF-8">
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        padding: 20px;
                        color: #000;
                        line-height: 1.5;
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 20px;
                        border-bottom: 2px solid #820000;
                        padding-bottom: 10px;
                    }
                    .header img {
                        width: 100%;
                        max-height: 120px;
                        object-fit: contain;
                    }
                    .title {
                        text-align: center;
                        font-weight: bold;
                        font-size: 18px;
                        margin-bottom: 30px;
                    }
                    .row {
                        margin-bottom: 15px;
                    }
                    .label {
                        font-weight: bold;
                    }
                    .value {
                        border-bottom: 1px solid #000;
                        display: inline-block;
                        padding: 0 5px;
                        min-width: 200px;
                    }
                    .flex-row {
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 15px;
                    }
                    .flex-item {
                        flex: 1;
                    }
                    .section-title {
                        font-weight: bold;
                        margin-top: 25px;
                        margin-bottom: 10px;
                    }
                    .text-box {
                        border-bottom: 1px solid #000;
                        min-height: 60px;
                        width: 100%;
                        padding: 5px 0;
                        white-space: pre-wrap;
                    }
                    .signature-section {
                        margin-top: 60px;
                        display: flex;
                        justify-content: space-between;
                        text-align: center;
                    }
                    .signature-box {
                        flex: 1;
                        margin: 0 10px;
                    }
                    .signature-line {
                        border-top: 1px solid #000;
                        margin-top: 40px;
                        padding-top: 5px;
                        font-size: 14px;
                        font-weight: bold;
                    }
                    .footer {
                        margin-top: 30px;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <img src="${headerImageUri}" alt="Cabeçalho Virgilio Capoani" />
                </div>
                
                <div class="title">Relatório de Ocorrência</div>
                
                <div class="row">
                    <span class="label">Aluno:</span>
                    <span class="value" style="width: 80%;">${occurrence.student?.name || ''}</span>
                </div>
                
                <div class="flex-row">
                    <div class="flex-item">
                        <span class="label">Turma:</span>
                        <span class="value" style="min-width: 100px;">${occurrence.student?.class?.name || ''}</span>
                    </div>
                    <div class="flex-item">
                        <span class="label">Data:</span>
                        <span class="value" style="min-width: 100px;">${dataFormatada}</span>
                    </div>
                </div>
                
                <div class="row">
                    <span class="label">Responsável Pela Ocorrência:</span>
                    <span class="value" style="width: 70%;">${occurrence.author?.full_name || ''}</span>
                </div>
                
                <div class="row">
                    <span class="label">Local da Ocorrência:</span>
                    <span class="value" style="width: 75%;">Dependências da Escola</span>
                </div>
                
                <div class="section-title">Ocorrência:</div>
                <div class="text-box">${occurrence.description_formal}</div>
                
                <div class="section-title">Mediação e encaminhamentos do professor:</div>
                <div class="text-box">${formatActions(profActions)}</div>
                
                <div class="section-title">Mediação e encaminhamentos da equipe gestora:</div>
                <div class="text-box">${formatActions(vpActions)}</div>
                
                <div class="section-title">Parecer:</div>
                <div class="text-box">
                    Ocorrência classificada como ${occurrence.status === 'CONCLUDED' ? 'CONCLUÍDA' : occurrence.status}.
                </div>
                
                <div class="signature-section">
                    <div class="signature-box">
                        <div class="signature-line">Ciência do aluno</div>
                    </div>
                    <div class="signature-box">
                        <div class="signature-line">Equipe gestora</div>
                    </div>
                    <div class="signature-box">
                        <div class="signature-line">Ciência do Responsável</div>
                    </div>
                </div>
                
                <div class="footer row">
                    <span class="label">Telefone(s) para contato:</span>
                    <span class="value" style="width: 70%;">${occurrence.tutor?.whatsapp_number || '_________________________________________'}</span>
                </div>
            </body>
            </html>
        `;

        const { uri } = await Print.printToFileAsync({
            html: htmlContent,
            base64: false
        });

        if (Platform.OS === 'web') {
            // Web Download
            const link = document.createElement('a');
            link.href = uri;
            link.download = `Requerimento_${occurrence.student?.name?.replace(/\s+/g, '_')}.pdf`;
            link.click();
        } else {
            // Mobile share
            const canShare = await Sharing.isAvailableAsync();
            if (canShare) {
                await Sharing.shareAsync(uri, {
                    UTI: '.pdf',
                    mimeType: 'application/pdf',
                    dialogTitle: 'Exportar Relatório',
                });
            } else {
                console.warn('Sharing not available on this device');
            }
        }
    } catch (err) {
        console.error('Error generating PDF:', err);
        throw err;
    }
}
