// src/utils/pdfGenerator.ts
// Generates a properly structured PDF occurrence report with embedded school logo

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { Asset } from 'expo-asset';
import { OccurrenceWithRelations, UserRole, ActionType } from '../types/database';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Reads an expo-asset and returns it as a base64 Data URI.
 * Uses fetch + ArrayBuffer (avoids FileReader callback issues on web).
 */
async function assetToBase64DataUri(module: number, mimeType = 'image/jpeg'): Promise<string> {
  const asset = Asset.fromModule(module);
  await asset.downloadAsync();
  const uri = asset.localUri || asset.uri;

  const response = await fetch(uri);
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // Convert in chunks to avoid call-stack overflow on large files
  const chunkSize = 8192;
  const parts: string[] = [];
  for (let i = 0; i < bytes.length; i += chunkSize) {
    parts.push(String.fromCharCode(...bytes.subarray(i, i + chunkSize)));
  }
  const base64 = btoa(parts.join(''));
  return `data:${mimeType};base64,${base64}`;
}

const ACTION_TYPE_LABEL: Record<string, string> = {
  [ActionType.RESOLUTION]: 'Resolução – Tutor',
  [ActionType.ESCALATION]: 'Encaminhamento à Vice-Direção',
  [ActionType.VP_RESOLUTION]: 'Resolução – Vice-Direção',
};

function formatActionRows(actions: OccurrenceWithRelations['actions']): string {
  if (!actions || actions.length === 0) {
    return '<span style="color:#666;font-style:italic">Nenhuma tratativa registrada.</span>';
  }
  return actions
    .map((a) => {
      const date = format(new Date(a.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
      const type = ACTION_TYPE_LABEL[a.action_type] ?? a.action_type;
      return `<div style="margin-bottom:4px"><strong>${type}</strong> <span style="color:#555;font-size:10px">(${date} — ${a.author?.full_name ?? '-'})</span><br/><span>${a.description}</span></div>`;
    })
    .join('');
}

export async function generateOccurrencePDF(occurrence: OccurrenceWithRelations): Promise<void> {
  // Load school header as base64 so it renders inside printed HTML without network dependency
  let headerImgSrc = '';
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    headerImgSrc = await assetToBase64DataUri(require('../../assets/images/cabecalho-vc.jpg'));
  } catch (err) {
    console.warn('[PDF] Could not load header image:', err);
  }

  const dataFormatada = format(new Date(occurrence.created_at), "dd/MM/yyyy", { locale: ptBR });
  const horaFormatada = format(new Date(occurrence.created_at), 'HH:mm', { locale: ptBR });

  const vpActions = (occurrence.actions ?? []).filter(
    (a) => a.author?.role === UserRole.VICE_DIRECTOR || a.author?.role === UserRole.ADMIN
  );
  const profActions = (occurrence.actions ?? []).filter(
    (a) => a.author?.role !== UserRole.VICE_DIRECTOR && a.author?.role !== UserRole.ADMIN
  );

  const headerHtml = headerImgSrc
    ? `<img src="${headerImgSrc}" style="width:100%;max-height:80px;object-fit:contain;display:block" />`
    : `<div style="text-align:center;font-weight:bold;font-size:13px">E.E. VIRGÍLIO CAPOANI</div>`;

  // Compact single-page layout
  const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<style>
  @page { size: A4 portrait; margin: 10mm 12mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #000; line-height: 1.4; }
  .header { border-bottom: 2px solid #820000; padding-bottom: 6px; margin-bottom: 8px; }
  .doc-title { text-align: center; font-size: 13px; font-weight: bold; text-transform: uppercase;
               letter-spacing: 1px; color: #820000; margin-bottom: 8px; }
  table.info { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
  table.info td { padding: 3px 6px; border: 1px solid #bbb; vertical-align: top; font-size: 10.5px; }
  table.info td.lbl { font-weight: bold; background: #f4f4f4; white-space: nowrap; width: 28%; }
  .sec-title { font-weight: bold; font-size: 10.5px; background: #820000; color: #fff;
               padding: 3px 8px; margin-top: 6px; margin-bottom: 3px; }
  .text-block { border: 1px solid #bbb; padding: 5px 8px; min-height: 36px;
                white-space: pre-wrap; background: #fff; font-size: 10.5px; }
  .sig-section { display: flex; justify-content: space-between; margin-top: 18px; gap: 12px; }
  .sig-box { flex: 1; text-align: center; }
  .sig-line { border-top: 1px solid #333; margin-top: 28px; padding-top: 4px;
              font-size: 9.5px; font-weight: bold; }
  .footer { margin-top: 8px; font-size: 9px; color: #666; text-align: center;
            border-top: 1px solid #ccc; padding-top: 4px; }
</style>
</head>
<body>

<div class="header">${headerHtml}</div>

<div class="doc-title">Relatório de Ocorrência Escolar</div>

<table class="info">
  <tr>
    <td class="lbl">Aluno(a):</td>
    <td colspan="3"><strong>${occurrence.student?.name ?? '—'}</strong></td>
  </tr>
  <tr>
    <td class="lbl">Turma:</td>
    <td>${occurrence.student?.class?.name ?? '—'}</td>
    <td class="lbl">Data / Hora:</td>
    <td>${dataFormatada} às ${horaFormatada}</td>
  </tr>
  <tr>
    <td class="lbl">Registrado por:</td>
    <td>${occurrence.author?.full_name ?? '—'}</td>
    <td class="lbl">Tutor(a):</td>
    <td>${occurrence.tutor?.full_name ?? '—'}</td>
  </tr>
  <tr>
    <td class="lbl">Local:</td>
    <td colspan="3">Dependências da Escola</td>
  </tr>
</table>

<div class="sec-title">Descrição da Ocorrência</div>
<div class="text-block">${occurrence.description_formal ?? '—'}</div>

<div class="sec-title">Mediação e Encaminhamentos do Tutor / Professor</div>
<div class="text-block">${formatActionRows(profActions)}</div>

<div class="sec-title">Mediação e Encaminhamentos da Equipe Gestora</div>
<div class="text-block">${formatActionRows(vpActions)}</div>

<div class="sec-title">Parecer Final</div>
<div class="text-block">Ocorrência <strong>${occurrence.status === 'CONCLUDED' ? 'CONCLUÍDA ✔' : occurrence.status}</strong>.</div>

<div class="sig-section">
  <div class="sig-box"><div class="sig-line">Ciência do(a) Aluno(a)</div></div>
  <div class="sig-box"><div class="sig-line">Equipe Gestora</div></div>
  <div class="sig-box"><div class="sig-line">Ciência do(a) Responsável</div></div>
</div>

<div class="footer">
  EscolaFlow — gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} &nbsp;|&nbsp; Tel para contato: ___________________________
</div>

</body>
</html>`;

  if (Platform.OS === 'web') {
    // expo-print's printToFileAsync is not available on web.
    // Open the HTML in a new window → browser handles "Save as PDF" via print dialog.
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
      };
      // Fallback if onload doesn't fire (content already cached)
      setTimeout(() => {
        try { printWindow.print(); } catch { /* already triggered */ }
      }, 1500);
    } else {
      // Popup blocked — open as HTML blob
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    }
  } else {
    // Mobile: generate PDF file and share via native sheet
    const { uri } = await Print.printToFileAsync({ html: htmlContent, base64: false });
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(uri, {
        UTI: '.pdf',
        mimeType: 'application/pdf',
        dialogTitle: 'Exportar Relatório de Ocorrência',
      });
    }
  }
}
