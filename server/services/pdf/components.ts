import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import {
  PDF_COLORS,
  PDF_TYPOGRAPHY,
  PDF_LAYOUT,
  PDF_TABLE_STYLES,
  formatCurrency,
  formatDateTime,
  formatPeriodLong,
  generateDocumentHash,
} from './theme';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable: { finalY: number };
  }
}

export interface ReportMetadata {
  title: string;
  periodMonth: number;
  periodYear: number;
  periodId: number;
  orgName: string;
  orgCnpj?: string;
  orgAddress?: string;
  orgCity?: string;
  orgState?: string;
  orgPhone?: string;
  orgEmail?: string;
  isDraft: boolean;
  generatedAt: Date;
  documentHash: string;
  responsavel?: string;
}

export interface KpiData {
  label: string;
  value: number;
  type: 'revenue' | 'expense' | 'result' | 'balance';
  subtitle?: string;
}

export interface HighlightItem {
  label: string;
  value: string;
  icon?: string;
}

// ============================================================================
// CAPA
// ============================================================================

export function drawCoverPage(doc: jsPDF, meta: ReportMetadata): void {
  const { pageWidth, pageHeight, margin } = PDF_LAYOUT;
  const centerX = pageWidth / 2;

  // Fundo com gradiente simulado (retângulos sobrepostos)
  doc.setFillColor(...PDF_COLORS.primary);
  doc.rect(0, 0, pageWidth, 80, 'F');
  
  doc.setFillColor(...PDF_COLORS.accent);
  doc.rect(0, 70, pageWidth, 25, 'F');

  // Linha dourada decorativa
  doc.setDrawColor(...PDF_COLORS.gold);
  doc.setLineWidth(2);
  doc.line(margin.left + 30, 100, pageWidth - margin.left - 30, 100);

  // Nome da instituição (branco sobre azul)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...PDF_COLORS.white);
  doc.text(meta.orgName.toUpperCase(), centerX, 45, { align: 'center' });

  // CNPJ se existir
  if (meta.orgCnpj) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`CNPJ: ${meta.orgCnpj}`, centerX, 55, { align: 'center' });
  }

  // Título do relatório
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(PDF_TYPOGRAPHY.title);
  doc.setTextColor(...PDF_COLORS.textPrimary);
  doc.text('RELATÓRIO FINANCEIRO', centerX, 130, { align: 'center' });

  doc.setFontSize(PDF_TYPOGRAPHY.subtitle);
  doc.text('MENSAL', centerX, 142, { align: 'center' });

  // Período em destaque
  doc.setFillColor(...PDF_COLORS.primaryLight);
  doc.roundedRect(centerX - 50, 155, 100, 25, 3, 3, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...PDF_COLORS.primary);
  doc.text(formatPeriodLong(meta.periodMonth, meta.periodYear).toUpperCase(), centerX, 170, { align: 'center' });

  // Badge de status (apenas rascunho)
  if (meta.isDraft) {
    const badgeY = 200;
    const badgeWidth = 80;
    const badgeHeight = 20;
    doc.setFillColor(...PDF_COLORS.warningLight);
    doc.roundedRect(centerX - badgeWidth/2, badgeY, badgeWidth, badgeHeight, 3, 3, 'F');
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...PDF_COLORS.warning);
    doc.text('RASCUNHO', centerX, badgeY + 13, { align: 'center' });
  }

  // Informações de geração (rodapé da capa)
  const footerY = pageHeight - 40;

  doc.setDrawColor(...PDF_COLORS.border);
  doc.setLineWidth(0.5);
  doc.line(margin.left + 20, footerY - 10, pageWidth - margin.left - 20, footerY - 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...PDF_COLORS.textSecondary);
  
  doc.text(`Gerado em: ${formatDateTime(meta.generatedAt)}`, centerX, footerY, { align: 'center' });
  
  // Hash do documento
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...PDF_COLORS.gold);
  doc.text(`#${meta.documentHash}`, centerX, footerY + 10, { align: 'center' });

  // Endereço da instituição
  if (meta.orgAddress || meta.orgCity) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...PDF_COLORS.textMuted);
    const address = [meta.orgAddress, meta.orgCity, meta.orgState].filter(Boolean).join(' • ');
    doc.text(address, centerX, footerY + 20, { align: 'center' });
  }
}

// ============================================================================
// SUMÁRIO
// ============================================================================

export interface TocEntry {
  title: string;
  page: number;
  level?: number;
}

export function drawTableOfContents(doc: jsPDF, entries: TocEntry[], meta: ReportMetadata): void {
  const { margin, contentWidth } = PDF_LAYOUT;
  let y = margin.top + 20;

  // Título da página
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...PDF_COLORS.textPrimary);
  doc.text('Sumário', margin.left, y);
  y += 8;

  // Subtítulo
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...PDF_COLORS.textSecondary);
  doc.text('Índice de Seções', margin.left, y);
  y += 10;

  // Linha decorativa
  doc.setDrawColor(...PDF_COLORS.primary);
  doc.setLineWidth(1.5);
  doc.line(margin.left, y, margin.left + 50, y);
  y += 18;

  // Entradas do sumário com melhor espaçamento
  doc.setFontSize(11);
  
  for (const entry of entries) {
    const indent = (entry.level || 0) * 12;
    const isSubitem = (entry.level || 0) > 0;
    
    doc.setFont('helvetica', isSubitem ? 'normal' : 'bold');
    doc.setTextColor(...(isSubitem ? PDF_COLORS.textSecondary : PDF_COLORS.textPrimary));
    
    // Título
    doc.text(entry.title, margin.left + indent, y);
    
    // Leader dots (pontos pequenos e espaçados)
    const titleWidth = doc.getTextWidth(entry.title);
    const pageNumWidth = doc.getTextWidth(String(entry.page));
    const dotStart = margin.left + indent + titleWidth + 4;
    const dotEnd = margin.left + contentWidth - pageNumWidth - 4;
    
    // Desenhar pontos individuais ao invés de linha tracejada
    doc.setFillColor(...PDF_COLORS.textMuted);
    const dotSpacing = 3;
    for (let x = dotStart; x < dotEnd; x += dotSpacing) {
      doc.circle(x, y - 1, 0.3, 'F');
    }
    
    // Número da página com destaque
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...PDF_COLORS.primary);
    doc.text(String(entry.page), margin.left + contentWidth, y, { align: 'right' });
    
    y += isSubitem ? 10 : 12; // Mais espaço para itens principais
  }
}

// ============================================================================
// KPI CARDS
// ============================================================================

export function drawKpiCards(doc: jsPDF, kpis: KpiData[], startY: number): number {
  const { margin, kpiCard } = PDF_LAYOUT;
  const cols = 2;
  const rows = Math.ceil(kpis.length / cols);
  
  let y = startY;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const idx = row * cols + col;
      if (idx >= kpis.length) break;

      const kpi = kpis[idx];
      const x = margin.left + col * (kpiCard.width + kpiCard.gap);
      const cardY = y;

      // Background do card baseado no tipo
      let bgColor: [number, number, number];
      let accentColor: [number, number, number];
      
      switch (kpi.type) {
        case 'revenue':
          bgColor = PDF_COLORS.successLight;
          accentColor = PDF_COLORS.success;
          break;
        case 'expense':
          bgColor = PDF_COLORS.dangerLight;
          accentColor = PDF_COLORS.danger;
          break;
        case 'result':
          bgColor = kpi.value >= 0 ? PDF_COLORS.successLight : PDF_COLORS.dangerLight;
          accentColor = kpi.value >= 0 ? PDF_COLORS.success : PDF_COLORS.danger;
          break;
        case 'balance':
        default:
          bgColor = PDF_COLORS.primaryLight;
          accentColor = PDF_COLORS.primary;
          break;
      }

      // Desenhar card
      doc.setFillColor(...bgColor);
      doc.roundedRect(x, cardY, kpiCard.width, kpiCard.height, 3, 3, 'F');

      // Borda esquerda colorida
      doc.setFillColor(...accentColor);
      doc.rect(x, cardY, 3, kpiCard.height, 'F');

      // Label
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...PDF_COLORS.textSecondary);
      doc.text(kpi.label, x + 8, cardY + 12);

      // Valor
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(...accentColor);
      doc.text(formatCurrency(kpi.value), x + 8, cardY + 28);

      // Subtitle se existir
      if (kpi.subtitle) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(...PDF_COLORS.textMuted);
        doc.text(kpi.subtitle, x + 8, cardY + 38);
      }
    }
    y += kpiCard.height + kpiCard.gap;
  }

  return y;
}

// ============================================================================
// HIGHLIGHTS BOX
// ============================================================================

export function drawHighlights(doc: jsPDF, items: HighlightItem[], startY: number): number {
  const { margin, contentWidth } = PDF_LAYOUT;
  let y = startY;

  // Título da seção
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...PDF_COLORS.textPrimary);
  doc.text('Destaques do Período', margin.left, y);
  y += 8;

  // Box container
  const boxHeight = items.length * 14 + 10;
  doc.setFillColor(...PDF_COLORS.backgroundAlt);
  doc.roundedRect(margin.left, y, contentWidth, boxHeight, 2, 2, 'F');

  y += 8;

  for (const item of items) {
    // Bullet
    doc.setFillColor(...PDF_COLORS.gold);
    doc.circle(margin.left + 6, y - 1.5, 1.5, 'F');

    // Label
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...PDF_COLORS.textSecondary);
    doc.text(`${item.label}:`, margin.left + 12, y);

    // Value
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...PDF_COLORS.textPrimary);
    const labelWidth = doc.getTextWidth(`${item.label}: `);
    doc.text(item.value, margin.left + 12 + labelWidth, y);

    y += 12;
  }

  return y + 5;
}

// ============================================================================
// SEÇÃO COM TÍTULO
// ============================================================================

export function drawSectionTitle(doc: jsPDF, number: number, title: string, startY: number): number {
  const { margin } = PDF_LAYOUT;
  let y = startY + 5;

  // Número em círculo
  doc.setFillColor(...PDF_COLORS.primary);
  doc.circle(margin.left + 5, y - 2, 5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...PDF_COLORS.white);
  doc.text(String(number), margin.left + 5, y, { align: 'center' });

  // Título
  doc.setFontSize(PDF_TYPOGRAPHY.sectionTitle);
  doc.setTextColor(...PDF_COLORS.textPrimary);
  doc.text(title, margin.left + 14, y);

  // Linha sublinhando
  const titleWidth = doc.getTextWidth(title);
  doc.setDrawColor(...PDF_COLORS.primary);
  doc.setLineWidth(0.5);
  doc.line(margin.left + 14, y + 2, margin.left + 14 + titleWidth, y + 2);

  return y + 10;
}

// ============================================================================
// NOTAS EXPLICATIVAS
// ============================================================================

export function drawNotesBlock(doc: jsPDF, title: string, notes: string[], startY: number): number {
  const { margin, contentWidth, spacing } = PDF_LAYOUT;
  let y = startY;

  // Calcular altura do bloco
  let notesHeight = 0;
  for (const note of notes) {
    const lines = doc.splitTextToSize(note, contentWidth - 18);
    notesHeight += lines.length * 4.5 + 4;
  }
  const blockHeight = notesHeight + 20;

  // Background do bloco com borda
  doc.setFillColor(...PDF_COLORS.backgroundAlt);
  doc.setDrawColor(...PDF_COLORS.border);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin.left, y, contentWidth, blockHeight, 2, 2, 'FD');

  y += spacing.sm + 2;

  // Ícone circular com "i"
  doc.setFillColor(...PDF_COLORS.accent);
  doc.circle(margin.left + 8, y + 2, 4, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...PDF_COLORS.white);
  doc.text('i', margin.left + 8, y + 4, { align: 'center' });
  
  // Título
  doc.setTextColor(...PDF_COLORS.textPrimary);
  doc.setFontSize(11);
  doc.text(title, margin.left + 15, y + 4);
  y += spacing.md + 4;

  // Notas com bullets elegantes
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...PDF_COLORS.textSecondary);

  for (const note of notes) {
    // Bullet elegante (•)
    doc.setTextColor(...PDF_COLORS.accent);
    doc.text('•', margin.left + 8, y);
    
    doc.setTextColor(...PDF_COLORS.textSecondary);
    const lines = doc.splitTextToSize(note, contentWidth - 18);
    doc.text(lines, margin.left + 14, y);
    y += lines.length * 4.5 + 4;
  }

  return y + spacing.sm;
}

// ============================================================================
// TABELA PROFISSIONAL
// ============================================================================

export interface TableColumn {
  header: string;
  key: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
  isCurrency?: boolean;
}

export function drawProfessionalTable(
  doc: jsPDF,
  columns: TableColumn[],
  data: Record<string, any>[],
  startY: number,
  options: {
    type?: 'revenue' | 'expense' | 'neutral';
    showTotal?: boolean;
    totalLabel?: string;
    totalValue?: number;
    alertThreshold?: number; // % do total para destacar
    totalColumn?: number;
  } = {}
): number {
  const { margin } = PDF_LAYOUT;
  const type = options.type || 'neutral';

  const head = [columns.map(c => c.header)];
  const body = data.map(row => 
    columns.map(c => c.isCurrency ? formatCurrency(row[c.key] || 0) : (row[c.key] ?? '—'))
  );

  // Adicionar linha de total se solicitado
  if (options.showTotal && options.totalValue !== undefined) {
    const totalRow = columns.map((c, idx) => {
      if (idx === 0) return options.totalLabel || 'TOTAL';
      if (idx === (options.totalColumn ?? columns.length - 1)) {
        return formatCurrency(options.totalValue!);
      }
      return '';
    });
    body.push(totalRow);
  }

  const columnStyles: Record<number, any> = {};
  columns.forEach((col, idx) => {
    columnStyles[idx] = {
      cellWidth: col.width || 'auto',
      halign: col.align || (col.isCurrency ? 'right' : 'left'),
    };
  });

  const typeStyles = PDF_TABLE_STYLES[type] || PDF_TABLE_STYLES.neutral;

  doc.autoTable({
    ...PDF_TABLE_STYLES.base,
    startY,
    head,
    body,
    columnStyles,
    headStyles: {
      ...PDF_TABLE_STYLES.base.headStyles,
      ...typeStyles.headStyles,
    },
    didParseCell: (hookData: any) => {
      // Destacar linha de total
      if (options.showTotal && hookData.row.index === body.length - 1) {
        hookData.cell.styles.fontStyle = 'bold';
        hookData.cell.styles.fillColor = typeStyles.footStyles?.fillColor || PDF_COLORS.backgroundAlt;
        hookData.cell.styles.textColor = typeStyles.footStyles?.textColor || PDF_COLORS.textPrimary;
      }

      // Alertas visuais para itens acima do threshold
      if (options.alertThreshold && options.totalValue && hookData.section === 'body') {
        const rowData = data[hookData.row.index];
        if (rowData) {
          const valueKey = columns.find(c => c.isCurrency)?.key;
          if (valueKey && rowData[valueKey]) {
            const percent = (rowData[valueKey] / options.totalValue) * 100;
            if (percent >= options.alertThreshold) {
              hookData.cell.styles.fillColor = PDF_COLORS.warningLight;
            }
          }
        }
      }
    },
  });

  return doc.lastAutoTable.finalY;
}

// ============================================================================
// BADGE
// ============================================================================

export function drawBadge(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  type: 'success' | 'danger' | 'warning' | 'info' | 'draft'
): void {
  const colors: Record<string, { bg: [number, number, number]; text: [number, number, number] }> = {
    success: { bg: PDF_COLORS.successLight, text: PDF_COLORS.successDark },
    danger: { bg: PDF_COLORS.dangerLight, text: PDF_COLORS.dangerDark },
    warning: { bg: PDF_COLORS.warningLight, text: PDF_COLORS.warning },
    info: { bg: PDF_COLORS.primaryLight, text: PDF_COLORS.primaryDark },
    draft: { bg: PDF_COLORS.warningLight, text: PDF_COLORS.warning },
  };

  const color = colors[type] || colors.info;
  const textWidth = doc.getTextWidth(text);
  const padding = 4;
  const width = textWidth + padding * 2;
  const height = 10;

  doc.setFillColor(...color.bg);
  doc.roundedRect(x, y, width, height, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...color.text);
  doc.text(text, x + padding, y + 7);
}

// ============================================================================
// WATERMARK (RASCUNHO)
// ============================================================================

export function drawWatermark(doc: jsPDF, text: string = 'RASCUNHO'): void {
  const pageCount = doc.getNumberOfPages();
  const { pageWidth, pageHeight } = PDF_LAYOUT;

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    
    // Salvar estado gráfico
    doc.saveGraphicsState();
    
    // Configurar texto
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(60);
    doc.setTextColor(200, 200, 200);
    
    // Rotacionar e desenhar
    const centerX = pageWidth / 2;
    const centerY = pageHeight / 2;
    
    // Usar transformação para rotação
    doc.text(text, centerX, centerY, {
      align: 'center',
      angle: 45,
    });
    
    doc.restoreGraphicsState();
  }
}

// ============================================================================
// CABEÇALHO DE PÁGINA
// ============================================================================

export function drawPageHeader(doc: jsPDF, meta: ReportMetadata, skipFirstPage: boolean = true): void {
  const pageCount = doc.getNumberOfPages();
  const { margin, pageWidth } = PDF_LAYOUT;

  for (let i = skipFirstPage ? 2 : 1; i <= pageCount; i++) {
    doc.setPage(i);

    // Nome da instituição
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...PDF_COLORS.textSecondary);
    doc.text(meta.orgName, margin.left, 12);

    // Período
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Relatório Financeiro • ${formatPeriodLong(meta.periodMonth, meta.periodYear)}`,
      pageWidth - margin.right,
      12,
      { align: 'right' }
    );

    // Linha separadora
    doc.setDrawColor(...PDF_COLORS.border);
    doc.setLineWidth(0.3);
    doc.line(margin.left, 15, pageWidth - margin.right, 15);
  }
}

// ============================================================================
// RODAPÉ DE PÁGINA - 3 colunas em uma linha
// ============================================================================

export function drawPageFooter(doc: jsPDF, meta: ReportMetadata, skipFirstPage: boolean = true): void {
  const pageCount = doc.getNumberOfPages();
  const { margin, pageWidth, footer } = PDF_LAYOUT;

  for (let i = skipFirstPage ? 2 : 1; i <= pageCount; i++) {
    doc.setPage(i);

    // Linha separadora fina
    doc.setDrawColor(...PDF_COLORS.border);
    doc.setLineWidth(0.3);
    doc.line(margin.left, footer.y - 4, pageWidth - margin.right, footer.y - 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...PDF_COLORS.textMuted);

    // ESQUERDA: Nome da instituição + Relatório
    const leftText = `${meta.orgName} • Relatório Financeiro`;
    doc.text(leftText, margin.left, footer.y);

    // CENTRO: Data de geração + Hash
    const centerText = meta.isDraft 
      ? `Gerado em ${formatDateTime(meta.generatedAt)} • #${meta.documentHash} • RASCUNHO`
      : `Gerado em ${formatDateTime(meta.generatedAt)} • #${meta.documentHash}`;
    
    if (meta.isDraft) {
      // Desenhar texto com cor diferente para "RASCUNHO"
      const baseText = `Gerado em ${formatDateTime(meta.generatedAt)} • #${meta.documentHash} • `;
      const baseWidth = doc.getTextWidth(baseText);
      const totalWidth = doc.getTextWidth(centerText);
      const startX = (pageWidth / 2) - (totalWidth / 2);
      
      doc.text(baseText, startX, footer.y);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...PDF_COLORS.warning);
      doc.text('RASCUNHO', startX + baseWidth, footer.y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...PDF_COLORS.textMuted);
    } else {
      doc.text(centerText, pageWidth / 2, footer.y, { align: 'center' });
    }

    // DIREITA: Paginação
    doc.text(`Página ${i} de ${pageCount}`, pageWidth - margin.right, footer.y, { align: 'right' });
  }
}

// ============================================================================
// RESULTADO FINAL
// ============================================================================

export function drawResultBox(
  doc: jsPDF,
  result: number,
  startY: number,
  details?: { saldoInicial?: number; entradas?: number; saidas?: number; saldoFinal?: number }
): number {
  const { margin, contentWidth } = PDF_LAYOUT;
  const isPositive = result >= 0;
  let y = startY;

  // Box principal
  const boxColor = isPositive ? PDF_COLORS.successLight : PDF_COLORS.dangerLight;
  const textColor = isPositive ? PDF_COLORS.successDark : PDF_COLORS.dangerDark;

  doc.setFillColor(...boxColor);
  doc.roundedRect(margin.left, y, contentWidth, 35, 3, 3, 'F');

  // Borda colorida
  doc.setFillColor(...(isPositive ? PDF_COLORS.success : PDF_COLORS.danger));
  doc.rect(margin.left, y, 4, 35, 'F');

  // Label
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...PDF_COLORS.textSecondary);
  doc.text(isPositive ? 'Superávit do Período' : 'Déficit do Período', margin.left + 12, y + 12);

  // Valor
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...textColor);
  doc.text(formatCurrency(Math.abs(result)), margin.left + 12, y + 28);

  y += 45;

  // Detalhes da conciliação se fornecidos
  if (details && (details.saldoInicial !== undefined || details.entradas !== undefined)) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...PDF_COLORS.textSecondary);

    const items = [];
    if (details.saldoInicial !== undefined) items.push(`Saldo Inicial: ${formatCurrency(details.saldoInicial)}`);
    if (details.entradas !== undefined) items.push(`(+) Entradas: ${formatCurrency(details.entradas)}`);
    if (details.saidas !== undefined) items.push(`(-) Saídas: ${formatCurrency(details.saidas)}`);
    if (details.saldoFinal !== undefined) items.push(`(=) Saldo Final: ${formatCurrency(details.saldoFinal)}`);

    doc.text(items.join('   •   '), margin.left, y);
    y += 10;
  }

  return y;
}

// ============================================================================
// HELPER: Verificar quebra de página
// ============================================================================

export function checkPageBreak(doc: jsPDF, currentY: number, requiredSpace: number = 50): number {
  const { margin, pageHeight } = PDF_LAYOUT;
  const maxY = pageHeight - margin.bottom - 20;

  if (currentY + requiredSpace > maxY) {
    doc.addPage();
    return margin.top + 20; // Espaço para header
  }
  return currentY;
}

// ============================================================================
// MINI CONCILIAÇÃO DO SALDO
// ============================================================================

export interface ReconciliationData {
  saldoInicial: number;
  receitas: number;
  despesas: number;
  saldoFinal: number;
}

export function drawMiniReconciliation(doc: jsPDF, data: ReconciliationData, startY: number): number {
  const { margin, contentWidth, spacing } = PDF_LAYOUT;
  let y = startY;

  // Título
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...PDF_COLORS.textPrimary);
  doc.text('Conciliação do Saldo', margin.left, y);
  y += 6;

  // Linha decorativa
  doc.setDrawColor(...PDF_COLORS.primary);
  doc.setLineWidth(0.5);
  doc.line(margin.left, y, margin.left + 35, y);
  y += 8;

  // Box container
  const boxWidth = 120;
  const boxHeight = 50;
  
  doc.setFillColor(...PDF_COLORS.backgroundAlt);
  doc.setDrawColor(...PDF_COLORS.border);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin.left, y, boxWidth, boxHeight, 2, 2, 'FD');

  // Itens da conciliação
  doc.setFontSize(9);
  let itemY = y + 10;
  const valueX = margin.left + boxWidth - 10;

  // Saldo Inicial
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...PDF_COLORS.textSecondary);
  doc.text('Saldo Inicial', margin.left + 8, itemY);
  doc.setTextColor(...PDF_COLORS.textPrimary);
  doc.text(formatCurrency(data.saldoInicial), valueX, itemY, { align: 'right' });
  itemY += 8;

  // + Receitas
  doc.setTextColor(...PDF_COLORS.success);
  doc.text('+ Receitas', margin.left + 8, itemY);
  doc.text(formatCurrency(data.receitas), valueX, itemY, { align: 'right' });
  itemY += 8;

  // - Despesas
  doc.setTextColor(...PDF_COLORS.danger);
  doc.text('– Despesas', margin.left + 8, itemY);
  doc.text(formatCurrency(data.despesas), valueX, itemY, { align: 'right' });
  itemY += 10;

  // Linha separadora
  doc.setDrawColor(...PDF_COLORS.border);
  doc.setLineWidth(0.3);
  doc.line(margin.left + 5, itemY - 4, margin.left + boxWidth - 5, itemY - 4);

  // = Saldo Final
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...(data.saldoFinal >= 0 ? PDF_COLORS.success : PDF_COLORS.danger));
  doc.text('= Saldo Final', margin.left + 8, itemY);
  doc.text(formatCurrency(data.saldoFinal), valueX, itemY, { align: 'right' });

  return y + boxHeight + spacing.md;
}

