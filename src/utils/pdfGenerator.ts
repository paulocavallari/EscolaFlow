// src/utils/pdfGenerator.ts
// Generates a properly structured PDF occurrence report with embedded school logo

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { Asset } from 'expo-asset';
import { OccurrenceWithRelations, UserRole, ActionType } from '../types/database';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/** Reads an expo-asset and returns it as a base64 data URI */
async function assetToBase64DataUri(module: number, mimeType = 'image/jpeg'): Promise<string> {
  const asset = Asset.fromModule(module);
  await asset.downloadAsync();

  const uri = asset.localUri || asset.uri;

  // Fetch URI (works for both file:// on mobile and http:// on web)
  const response = await fetch(uri);
  const blob = await response.blob();

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result); // already a data:image/...;base64,... string
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

const ACTION_TYPE_LABEL: Record<string, string> = {
  [ActionType.RESOLUTION]: 'Resolução pelo Tutor',
  [ActionType.ESCALATION]: 'Encaminhamento à Vice-Direção',
  [ActionType.VP_RESOLUTION]: 'Resolução pela Vice-Direção',
};

function formatActionRows(actions: OccurrenceWithRelations['actions']): string {
  if (!actions || actions.length === 0) {
    return '<p style="color:#666">Nenhuma tratativa registrada.</p>';
  }
  return actions
    .map((a) => {
      const date = format(new Date(a.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
      const type = ACTION_TYPE_LABEL[a.action_type] ?? a.action_type;
      return `
                <div style="margin-bottom:12px; padding:10px; border-left:3px solid #820000; background:#fafafa;">
                    <strong>${type}</strong> — ${a.author?.full_name ?? '-'} &nbsp;<span style="color:#666;font-size:12px">(${date})</span><br/>
                    <span style="white-space:pre-wrap">${a.description}</span>
                </div>`;
    })
    .join('');
}

export async function generateOccurrencePDF(occurrence: OccurrenceWithRelations): Promise<void> {
  // Convert header image to base64 so it renders inside the PDF regardless of filesystem
  let headerImgSrc = '';
  try {
    headerImgSrc = await assetToBase64DataUri(
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('../../assets/images/cabecalho-vc.jpg')
    );
  } catch (err) {
    console.warn('[PDF] Could not load header image, proceeding without it:', err);
  }

  const dataFormatada = format(new Date(occurrence.created_at), "dd 'de' MMMM 'de' yyyy", {
    locale: ptBR,
  });
  const horaFormatada = format(new Date(occurrence.created_at), 'HH:mm', { locale: ptBR });

  // Split actions by author role
  const vpActions = (occurrence.actions ?? []).filter(
    (a) =>
      a.author?.role === UserRole.VICE_DIRECTOR ||
      a.author?.role === UserRole.ADMIN
  );
  // Professor/Tutor actions = all actions NOT from VP/Admin
  const profActions = (occurrence.actions ?? []).filter(
    (a) =>
      a.author?.role !== UserRole.VICE_DIRECTOR &&
      a.author?.role !== UserRole.ADMIN
  );

  const headerHtml = headerImgSrc
    ? `<img src="${headerImgSrc}" alt="Cabeçalho Escola" style="width:100%;max-height:130px;object-fit:contain;" />`
    : `<h2 style="color:#820000;margin:0">Centro Estadual de Educação Tecnológica Paula Souza</h2>
           <h3 style="margin:4px 0">E.E. Virgílio Capoani</h3>`;

  const htmlContent = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Arial, sans-serif;
      font-size: 13px;
      color: #111;
      padding: 28px 36px;
      line-height: 1.55;
    }
    .header {
      text-align: center;
      border-bottom: 2.5px solid #820000;
      padding-bottom: 12px;
      margin-bottom: 18px;
    }
    .doc-title {
      text-align: center;
      font-size: 16px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 20px;
      color: #820000;
    }
    table.info-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
    }
    table.info-table td {
      padding: 5px 8px;
      border: 1px solid #ccc;
      vertical-align: top;
    }
    table.info-table td.label {
      font-weight: bold;
      background: #f5f5f5;
      width: 32%;
      white-space: nowrap;
    }
    .section-title {
      font-weight: bold;
      font-size: 13px;
      background: #820000;
      color: #fff;
      padding: 5px 10px;
      margin-top: 18px;
      margin-bottom: 8px;
    }
    .text-block {
      border: 1px solid #ccc;
      padding: 10px 12px;
      min-height: 60px;
      white-space: pre-wrap;
      background: #fff;
      margin-bottom: 6px;
    }
    .signature-section {
      display: flex;
      justify-content: space-between;
      margin-top: 50px;
      gap: 20px;
    }
    .signature-box {
      flex: 1;
      text-align: center;
    }
    .signature-line {
      border-top: 1px solid #333;
      margin-top: 44px;
      padding-top: 6px;
      font-size: 12px;
    }
    .footer {
      margin-top: 28px;
      font-size: 11px;
      color: #666;
      text-align: center;
      border-top: 1px solid #ccc;
      padding-top: 8px;
    }
  </style>
</head>
<body>

  <div class="header">${headerHtml}</div>

  <div class="doc-title">Relatório de Ocorrência Escolar</div>

  <table class="info-table">
    <tr>
      <td class="label">Aluno(a):</td>
      <td colspan="3">${occurrence.student?.name ?? '—'}</td>
    </tr>
    <tr>
      <td class="label">Turma:</td>
      <td>${occurrence.student?.class?.name ?? '—'}</td>
      <td class="label">Data:</td>
      <td>${dataFormatada} às ${horaFormatada}</td>
    </tr>
    <tr>
      <td class="label">Registrado por:</td>
      <td>${occurrence.author?.full_name ?? '—'}</td>
      <td class="label">Tutor(a) responsável:</td>
      <td>${occurrence.tutor?.full_name ?? '—'}</td>
    </tr>
    <tr>
      <td class="label">Local:</td>
      <td colspan="3">Dependências da Escola</td>
    </tr>
  </table>

  <div class="section-title">📝 Descrição da Ocorrência</div>
  <div class="text-block">${occurrence.description_formal ?? '—'}</div>

  <div class="section-title">📋 Mediação e Encaminhamentos do Tutor / Professor</div>
  <div class="text-block">${formatActionRows(profActions)}</div>

  <div class="section-title">🏢 Mediação e Encaminhamentos da Equipe Gestora</div>
  <div class="text-block">${formatActionRows(vpActions)}</div>

  <div class="section-title">📌 Parecer Final</div>
  <div class="text-block">
    Ocorrência registrada e classificada como:
    <strong>${occurrence.status === 'CONCLUDED' ? 'CONCLUÍDA ✔️' : occurrence.status}</strong>.
  </div>

  <div class="signature-section">
    <div class="signature-box">
      <div class="signature-line">Ciência do(a) Aluno(a)</div>
    </div>
    <div class="signature-box">
      <div class="signature-line">Equipe Gestora</div>
    </div>
    <div class="signature-box">
      <div class="signature-line">Ciência do(a) Responsável</div>
    </div>
  </div>

  <div class="footer">
    Documento gerado automaticamente pelo sistema EscolaFlow em
    ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}.
    Telefone(s) para contato: ___________________________
  </div>

</body>
</html>`;

  if (Platform.OS === 'web') {
    // On web, expo-print's printToFileAsync is not supported.
    // Open HTML in a new window and trigger the browser's native print dialog
    // (user can Save as PDF from there).
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      // Wait for images to load before printing
      printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
      };
      // Fallback if onload doesn't fire
      setTimeout(() => {
        try { printWindow.print(); } catch { /* already printed */ }
      }, 1500);
    } else {
      // Popup blocked — create a blob URL and open it
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
    // Mobile: generate a real PDF file and share it
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
