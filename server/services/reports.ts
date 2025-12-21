import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { eq, and, desc } from 'drizzle-orm';
import { getDb, schema } from '../db';

// Import PDF theme and components
import {
  PDF_COLORS,
  PDF_LAYOUT,
  PDF_TABLE_STYLES,
  formatCurrency,
  formatPeriodLong,
  generateDocumentHash,
} from './pdf/theme';

import {
  ReportMetadata,
  TocEntry,
  KpiData,
  HighlightItem,
  drawCoverPage,
  drawTableOfContents,
  drawKpiCards,
  drawHighlights,
  drawSectionTitle,
  drawNotesBlock,
  drawProfessionalTable,
  drawResultBox,
  drawWatermark,
  drawPageHeader,
  drawPageFooter,
  checkPageBreak,
  drawMiniReconciliation,
} from './pdf/components';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable: { finalY: number };
  }
}

// ============================================================================
// INTERFACE DE OPÇÕES
// ============================================================================

export interface FinancialReportOptions {
  periodId: number;
  isDraft?: boolean;
  includeDetails?: boolean;
  includeInstitutionalFooter?: boolean;
}

// ============================================================================
// CONSTANTES LEGACY (para outros relatórios)
// ============================================================================

const COLORS = {
  textPrimary: [31, 41, 55] as [number, number, number],
  textSecondary: [107, 114, 128] as [number, number, number],
  headerBg: [243, 244, 246] as [number, number, number],
  border: [229, 231, 235] as [number, number, number],
  positive: [22, 101, 52] as [number, number, number],
  negative: [153, 27, 27] as [number, number, number],
  sectionTitle: [55, 65, 81] as [number, number, number],
  accent: [59, 130, 246] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

const MARGINS = { left: 15, right: 15, top: 15 };
const PAGE_WIDTH = 210;
const CONTENT_WIDTH = PAGE_WIDTH - MARGINS.left - MARGINS.right;

// ============================================================================
// FUNÇÕES AUXILIARES LEGACY
// ============================================================================

function formatCurrencyLegacy(cents: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('pt-BR');
}

function formatPeriod(month: number, year: number): string {
  const d = new Date(year, month - 1);
  return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase();
}

function formatPeriodTitle(month: number, year: number): string {
  const months = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 
                  'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
  return `${months[month - 1]} do Ano de ${year}`;
}

async function getOrganization() {
  const db = await getDb();
  const [org] = await db.select().from(schema.organizationSettings).limit(1);
  return org || { 
    name: 'Centro Espírita', 
    cnpj: '', 
    address: '',
    city: '',
    state: '',
    phone: '',
    email: '',
  };
}

// ============================================================================
// NORMALIZAÇÃO DE CATEGORIAS
// ============================================================================

/**
 * Normaliza nome de categoria para agrupamento correto:
 * - Remove espaços extras
 * - Remove plural simples (s final)
 * - Lowercase para comparação
 * - Capitaliza primeira letra para exibição
 */
function normalizeCategory(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, ' ')              // normalizar espaços múltiplos
    .replace(/s\s*$/i, '')              // remover plural simples (s final)
    .toLowerCase()
    .replace(/^(\w)/, c => c.toUpperCase()); // capitalize
}

/**
 * Cria chave de agrupamento para categoria
 */
function categoryKey(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/s\s*$/i, '')
    .toLowerCase();
}

// ============================================================================
// FUNÇÕES DE DESENHO LEGACY (para outros relatórios)
// ============================================================================

function drawHeader(doc: jsPDF, org: any): number {
  let y = MARGINS.top;
  
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.textPrimary);
  doc.text(org.name.toUpperCase(), PAGE_WIDTH / 2, y, { align: 'center' });
  y += 8;
  
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.5);
  doc.line(MARGINS.left, y, PAGE_WIDTH - MARGINS.right, y);
  y += 5;
  
  if (org.address || org.city) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.textSecondary);
    const address = [org.address, org.city, org.state].filter(Boolean).join(' – ');
    doc.text(address, PAGE_WIDTH / 2, y, { align: 'center' });
    y += 5;
  }
  
  const contacts: string[] = [];
  if (org.cnpj) contacts.push(`CNPJ: ${org.cnpj}`);
  if (org.phone) contacts.push(`Fone: ${org.phone}`);
  if (org.email) contacts.push(org.email);
  
  if (contacts.length > 0) {
    doc.setFontSize(8);
    doc.text(contacts.join(' | '), PAGE_WIDTH / 2, y, { align: 'center' });
    y += 8;
  }
  
  return y;
}

function drawReportTitle(doc: jsPDF, title: string, period: { month: number; year: number }, startY: number): number {
  let y = startY + 5;
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.textPrimary);
  doc.text(`Relatório ${title}`, PAGE_WIDTH / 2, y, { align: 'center' });
  y += 7;
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.textSecondary);
  doc.text(`Período: ${formatPeriodTitle(period.month, period.year)}`, PAGE_WIDTH / 2, y, { align: 'center' });
  y += 10;
  
  return y;
}

function drawSectionTitleLegacy(doc: jsPDF, number: number, title: string, startY: number): number {
  const y = startY + 3;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.sectionTitle);
  doc.text(`${number}. ${title}`, MARGINS.left, y);
  
  return y + 5;
}

function drawParagraph(doc: jsPDF, text: string, startY: number, maxWidth?: number): number {
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.textPrimary);
  
  const width = maxWidth || CONTENT_WIDTH;
  const lines = doc.splitTextToSize(text, width);
  doc.text(lines, MARGINS.left, startY);
  
  return startY + (lines.length * 5) + 3;
}

function drawFooter(doc: jsPDF): void {
  const pageCount = doc.getNumberOfPages();
  
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.3);
    doc.line(MARGINS.left, 280, PAGE_WIDTH - MARGINS.right, 280);
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.textSecondary);
    doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, MARGINS.left, 285);
    doc.text(`Página ${i} de ${pageCount}`, PAGE_WIDTH - MARGINS.right, 285, { align: 'right' });
  }
}

const baseTableStyles = {
  theme: 'grid' as const,
  styles: {
    fontSize: 9,
    cellPadding: 3,
    lineColor: COLORS.border,
    lineWidth: 0.3,
    textColor: COLORS.textPrimary,
  },
  headStyles: {
    fillColor: COLORS.headerBg,
    textColor: COLORS.textPrimary,
    fontStyle: 'bold' as const,
    halign: 'left' as const,
  },
  alternateRowStyles: {
    fillColor: [250, 250, 250] as [number, number, number],
  },
  margin: { left: MARGINS.left, right: MARGINS.right },
};

// ============================================================================
// RELATÓRIO FINANCEIRO MENSAL - VERSÃO PREMIUM
// ============================================================================

export async function generateFinancialReportPDF(
  periodIdOrOptions: number | FinancialReportOptions
): Promise<Buffer> {
  // Normalizar opções
  const options: FinancialReportOptions = typeof periodIdOrOptions === 'number'
    ? { periodId: periodIdOrOptions, isDraft: false, includeDetails: true, includeInstitutionalFooter: true }
    : { isDraft: false, includeDetails: true, includeInstitutionalFooter: true, ...periodIdOrOptions };

  const db = await getDb();

  const [period] = await db.select().from(schema.periods).where(eq(schema.periods.id, options.periodId));
  if (!period) throw new Error('Período não encontrado');

  const entries = await db.select({
    entry: schema.entries,
    account: schema.accounts,
  })
    .from(schema.entries)
    .leftJoin(schema.accounts, eq(schema.entries.accountId, schema.accounts.id))
    .where(eq(schema.entries.periodId, options.periodId))
    .orderBy(desc(schema.entries.transactionDate));

  const org = await getOrganization();
  const doc = new jsPDF();
  const generatedAt = new Date();
  const documentHash = generateDocumentHash(options.periodId, generatedAt);

  // Preparar metadata
  const meta: ReportMetadata = {
    title: 'Relatório Financeiro Mensal',
    periodMonth: period.month,
    periodYear: period.year,
    periodId: options.periodId,
    orgName: org.name,
    orgCnpj: org.cnpj || undefined,
    orgAddress: org.address || undefined,
    orgCity: org.city || undefined,
    orgState: org.state || undefined,
    orgPhone: org.phone || undefined,
    orgEmail: org.email || undefined,
    isDraft: options.isDraft || false,
    generatedAt,
    documentHash,
  };

  // Processar dados com normalização de categorias
  let totalReceitas = 0;
  let totalDespesas = 0;
  // Chave: categoria normalizada, Valor: { nome original para exibição, valor, count }
  const receitasByCategoria: Record<string, { displayName: string; valor: number; count: number }> = {};
  const despesasByCategoria: Record<string, { displayName: string; valor: number; items: { desc: string; valor: number }[] }> = {};
  let maiorReceita = { categoria: '', valor: 0 };
  let maiorDespesa = { categoria: '', valor: 0 };

  for (const { entry, account } of entries) {
    if (!account) continue;
    
    if (account.type === 'revenue') {
      totalReceitas += entry.amountCents;
      const key = categoryKey(account.name);
      const displayName = normalizeCategory(account.name);
      
      if (!receitasByCategoria[key]) {
        receitasByCategoria[key] = { displayName, valor: 0, count: 0 };
      }
      receitasByCategoria[key].valor += entry.amountCents;
      receitasByCategoria[key].count += 1;
      
      if (receitasByCategoria[key].valor > maiorReceita.valor) {
        maiorReceita = { categoria: displayName, valor: receitasByCategoria[key].valor };
      }
    }
    
    if (account.type === 'expense' || account.type === 'fixed_asset') {
      totalDespesas += entry.amountCents;
      const key = categoryKey(account.name);
      const displayName = normalizeCategory(account.name);
      
      if (!despesasByCategoria[key]) {
        despesasByCategoria[key] = { displayName, valor: 0, items: [] };
      }
      despesasByCategoria[key].valor += entry.amountCents;
      despesasByCategoria[key].items.push({
        desc: entry.description,
        valor: entry.amountCents,
      });
      
      if (despesasByCategoria[key].valor > maiorDespesa.valor) {
        maiorDespesa = { categoria: displayName, valor: despesasByCategoria[key].valor };
      }
    }
  }

  const resultado = totalReceitas - totalDespesas;

  // ========== PÁGINA 1: CAPA ==========
  drawCoverPage(doc, meta);

  // ========== PÁGINA 2: SUMÁRIO ==========
  doc.addPage();
  
  const tocEntries: TocEntry[] = [
    { title: 'Visão Geral', page: 3 },
    { title: 'Demonstrativo de Receitas', page: 4 },
    { title: 'Demonstrativo de Despesas', page: 5 },
    { title: 'Resultado e Observações', page: 6 },
  ];
  
  drawTableOfContents(doc, tocEntries, meta);

  // ========== PÁGINA 3: VISÃO GERAL ==========
  doc.addPage();
  let y = PDF_LAYOUT.margin.top + 20;

  // Título da seção
  y = drawSectionTitle(doc, 1, 'Visão Geral do Período', y);
  y += 5;

  // KPI Cards
  const kpis: KpiData[] = [
    { label: 'Total de Receitas', value: totalReceitas, type: 'revenue' },
    { label: 'Total de Despesas', value: totalDespesas, type: 'expense' },
    { label: 'Resultado do Período', value: resultado, type: 'result', subtitle: resultado >= 0 ? 'Superávit' : 'Déficit' },
    { label: 'Saldo Final', value: resultado, type: 'balance', subtitle: `${formatPeriodLong(period.month, period.year)}` },
  ];

  y = drawKpiCards(doc, kpis, y);
  y += 10;

  // Highlights
  const highlights: HighlightItem[] = [];
  
  if (maiorReceita.categoria) {
    highlights.push({
      label: 'Maior fonte de receita',
      value: `${maiorReceita.categoria} (${formatCurrency(maiorReceita.valor)})`,
    });
  }
  
  if (maiorDespesa.categoria) {
    highlights.push({
      label: 'Maior categoria de despesa',
      value: `${maiorDespesa.categoria} (${formatCurrency(maiorDespesa.valor)})`,
    });
  }
  
  highlights.push({
    label: 'Total de lançamentos',
    value: `${entries.length} lançamentos no período`,
  });

  if (highlights.length > 0) {
    y = drawHighlights(doc, highlights, y);
  }

  y += 10;

  // Mini conciliação do saldo
  y = drawMiniReconciliation(doc, {
    saldoInicial: 0, // TODO: buscar saldo inicial real se disponível
    receitas: totalReceitas,
    despesas: totalDespesas,
    saldoFinal: resultado,
  }, y);

  y += 5;

  // Texto explicativo
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...PDF_COLORS.textSecondary);
  const texto = `Este relatório apresenta a movimentação financeira de ${meta.orgName} referente ao período de ${formatPeriodLong(period.month, period.year)}. Os valores demonstrados refletem as receitas arrecadadas e despesas realizadas, conforme registros do sistema de gestão financeira.`;
  const lines = doc.splitTextToSize(texto, PDF_LAYOUT.contentWidth);
  doc.text(lines, PDF_LAYOUT.margin.left, y);

  // ========== PÁGINA 4: RECEITAS ==========
  doc.addPage();
  y = PDF_LAYOUT.margin.top + 20;

  y = drawSectionTitle(doc, 2, 'Demonstrativo de Receitas', y);
  y += 5;

  // Tabela de receitas por categoria (usar displayName normalizado)
  const receitasData = Object.entries(receitasByCategoria)
    .sort(([, a], [, b]) => b.valor - a.valor)
    .map(([, data]) => ({
      categoria: data.displayName,
      quantidade: data.count,
      valor: data.valor,
      percentual: totalReceitas > 0 ? ((data.valor / totalReceitas) * 100).toFixed(1) + '%' : '—',
    }));

  if (receitasData.length > 0) {
    y = drawProfessionalTable(
      doc,
      [
        { header: 'CATEGORIA', key: 'categoria', width: 80 },
        { header: 'QTD', key: 'quantidade', width: 20, align: 'center' },
        { header: '% TOTAL', key: 'percentual', width: 25, align: 'right' },
        { header: 'VALOR (R$)', key: 'valor', width: 45, align: 'right', isCurrency: true },
      ],
      receitasData,
      y,
      {
        type: 'revenue',
        showTotal: true,
        totalLabel: 'TOTAL DAS RECEITAS',
        totalValue: totalReceitas,
        totalColumn: 3,
      }
    );
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(...PDF_COLORS.textMuted);
    doc.text('Nenhuma receita registrada no período.', PDF_LAYOUT.margin.left, y);
    y += 10;
  }

  y += 15;

  // Nota explicativa de receitas
  y = drawNotesBlock(doc, 'Notas sobre Receitas', [
    'As receitas são registradas pelo regime de competência, no momento do reconhecimento do direito.',
    'Os valores apresentados representam a totalidade das entradas financeiras do período.',
  ], y);

  // ========== PÁGINA 5: DESPESAS ==========
  doc.addPage();
  y = PDF_LAYOUT.margin.top + 20;

  y = drawSectionTitle(doc, 3, 'Demonstrativo de Despesas', y);
  y += 5;

  // Tabela de despesas por categoria (resumo, usar displayName normalizado)
  const despesasData = Object.entries(despesasByCategoria)
    .sort(([, a], [, b]) => b.valor - a.valor)
    .map(([, data]) => ({
      categoria: data.displayName,
      quantidade: data.items.length,
      valor: data.valor,
      percentual: totalDespesas > 0 ? ((data.valor / totalDespesas) * 100).toFixed(1) + '%' : '—',
    }));

  if (despesasData.length > 0) {
    y = drawProfessionalTable(
      doc,
      [
        { header: 'CATEGORIA', key: 'categoria', width: 80 },
        { header: 'QTD', key: 'quantidade', width: 20, align: 'center' },
        { header: '% TOTAL', key: 'percentual', width: 25, align: 'right' },
        { header: 'VALOR (R$)', key: 'valor', width: 45, align: 'right', isCurrency: true },
      ],
      despesasData,
      y,
      {
        type: 'expense',
        showTotal: true,
        totalLabel: 'TOTAL DAS DESPESAS',
        totalValue: totalDespesas,
        totalColumn: 3,
        alertThreshold: 25, // Destacar categorias > 25% do total
      }
    );
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(...PDF_COLORS.textMuted);
    doc.text('Nenhuma despesa registrada no período.', PDF_LAYOUT.margin.left, y);
    y += 10;
  }

  y += 15;

  // Nota explicativa de despesas
  y = drawNotesBlock(doc, 'Notas sobre Despesas', [
    'As despesas são classificadas conforme o Plano de Contas da instituição.',
    'Itens com fundo destacado representam categorias com mais de 25% do total de despesas.',
  ], y);

  // ========== PÁGINA 6: RESULTADO E OBSERVAÇÕES ==========
  doc.addPage();
  y = PDF_LAYOUT.margin.top + 20;

  y = drawSectionTitle(doc, 4, 'Resultado do Período', y);
  y += 5;

  // Box de resultado
  y = drawResultBox(doc, resultado, y, {
    entradas: totalReceitas,
    saidas: totalDespesas,
  });

  y += 15;

  // Resumo da conciliação
  y = drawSectionTitle(doc, 5, 'Resumo da Movimentação', y);
  y += 5;

  const resumoData = [
    { descricao: 'Total de Receitas', valor: totalReceitas },
    { descricao: '(–) Total de Despesas', valor: totalDespesas },
    { descricao: resultado >= 0 ? '= Superávit do Período' : '= Déficit do Período', valor: Math.abs(resultado) },
  ];

  y = drawProfessionalTable(
    doc,
    [
      { header: 'DESCRIÇÃO', key: 'descricao', width: 120 },
      { header: 'VALOR (R$)', key: 'valor', width: 50, align: 'right', isCurrency: true },
    ],
    resumoData,
    y,
    { type: 'neutral' }
  );

  y += 20;

  // Notas de conformidade
  y = checkPageBreak(doc, y, 60);
  
  y = drawNotesBlock(doc, 'Notas de Conformidade', [
    `1. Este relatório foi gerado automaticamente pelo sistema CentroOS em ${generatedAt.toLocaleString('pt-BR')}.`,
    '2. Os valores apresentados estão sujeitos a ajustes conforme conciliação bancária.',
    '3. Para dúvidas ou esclarecimentos, contate a administração financeira da instituição.',
    resultado >= 0
      ? '4. O período apresentou resultado positivo (superávit), demonstrando equilíbrio financeiro.'
      : '4. O período apresentou resultado negativo (déficit), recomenda-se análise detalhada das despesas.',
  ], y);

  // Contatos se solicitado
  if (options.includeInstitutionalFooter && (org.email || org.phone)) {
    y += 15;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...PDF_COLORS.textSecondary);
    
    const contatos: string[] = [];
    if (org.email) contatos.push(`E-mail: ${org.email}`);
    if (org.phone) contatos.push(`Telefone: ${org.phone}`);
    
    doc.text(contatos.join('   •   '), PDF_LAYOUT.margin.left, y);
  }

  // ========== APLICAR HEADERS E FOOTERS ==========
  drawPageHeader(doc, meta, true); // Pula primeira página (capa)
  drawPageFooter(doc, meta, true); // Pula primeira página (capa)

  // Aplicar watermark se for rascunho
  if (options.isDraft) {
    drawWatermark(doc, 'RASCUNHO');
  }

  return Buffer.from(doc.output('arraybuffer'));
}

// ============================================================================
// RELATÓRIO NOTA FISCAL CIDADÃ (mantido legacy)
// ============================================================================

export async function generateNfcReportPDF(periodId: number): Promise<Buffer> {
  const db = await getDb();

  const [period] = await db.select().from(schema.periods).where(eq(schema.periods.id, periodId));
  if (!period) throw new Error('Período não encontrado');

  const entries = await db.select({
    entry: schema.entries,
    account: schema.accounts,
  })
    .from(schema.entries)
    .leftJoin(schema.accounts, eq(schema.entries.accountId, schema.accounts.id))
    .where(and(eq(schema.entries.periodId, periodId), eq(schema.entries.isNfc, 1)));

  const org = await getOrganization();
  const doc = new jsPDF();

  let y = drawHeader(doc, org);
  y = drawReportTitle(doc, 'Nota Fiscal Cidadã', period, y);

  let project70 = 0;
  let operating30 = 0;
  const projectEntries: any[] = [];
  const operatingEntries: any[] = [];

  for (const { entry, account } of entries) {
    if (entry.nfcCategory === 'project_70') {
      project70 += entry.amountCents;
      projectEntries.push({ date: entry.transactionDate, desc: entry.description, amount: entry.amountCents, account: account?.name });
    }
    if (entry.nfcCategory === 'operating_30') {
      operating30 += entry.amountCents;
      operatingEntries.push({ date: entry.transactionDate, desc: entry.description, amount: entry.amountCents, account: account?.name });
    }
  }

  const total = project70 + operating30;
  const p70Percent = total > 0 ? (project70 / total) * 100 : 0;
  const p30Percent = total > 0 ? (operating30 / total) * 100 : 0;
  const compliant = total === 0 || (p70Percent >= 65 && p70Percent <= 75);

  y = drawSectionTitleLegacy(doc, 1, 'Sumário', y);
  
  const sumario = `Este relatório apresenta a aplicação dos recursos provenientes do Programa Nota Fiscal Cidadã no período de ${formatPeriod(period.month, period.year).toLowerCase()}. Conforme legislação, os recursos devem ser aplicados: 70% em projetos e aquisição de bens, e 30% em custeio operacional.`;
  y = drawParagraph(doc, sumario, y);
  y += 5;

  y = drawSectionTitleLegacy(doc, 2, 'Investimento em Projetos (70%)', y);

  const projectRows = projectEntries.map((e) => [
    formatDate(new Date(e.date)),
    e.desc,
    e.account || '',
    formatCurrencyLegacy(e.amount),
  ]);
  projectRows.push(['', '', 'Total', formatCurrencyLegacy(project70)]);

  doc.autoTable({
    ...baseTableStyles,
    startY: y,
    head: [['DATA', 'DESCRIÇÃO', 'CONTA', 'VALOR']],
    body: projectRows.length > 1 ? projectRows : [['', 'Nenhum lançamento no período', '', '']],
    headStyles: { ...baseTableStyles.headStyles, fillColor: [237, 233, 254] },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 70 },
      2: { cellWidth: 45 },
      3: { cellWidth: 35, halign: 'right' },
    },
    didParseCell: (data: any) => {
      if (data.row.index === projectRows.length - 1 && projectRows.length > 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [237, 233, 254];
      }
    },
  });

  y = doc.lastAutoTable.finalY + 10;

  y = drawSectionTitleLegacy(doc, 3, 'Custeio Operacional (30%)', y);

  const operatingRows = operatingEntries.map((e) => [
    formatDate(new Date(e.date)),
    e.desc,
    e.account || '',
    formatCurrencyLegacy(e.amount),
  ]);
  operatingRows.push(['', '', 'Total', formatCurrencyLegacy(operating30)]);

  doc.autoTable({
    ...baseTableStyles,
    startY: y,
    head: [['DATA', 'DESCRIÇÃO', 'CONTA', 'VALOR']],
    body: operatingRows.length > 1 ? operatingRows : [['', 'Nenhum lançamento no período', '', '']],
    headStyles: { ...baseTableStyles.headStyles, fillColor: [254, 249, 195] },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 70 },
      2: { cellWidth: 45 },
      3: { cellWidth: 35, halign: 'right' },
    },
    didParseCell: (data: any) => {
      if (data.row.index === operatingRows.length - 1 && operatingRows.length > 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [254, 249, 195];
      }
    },
  });

  y = doc.lastAutoTable.finalY + 10;

  y = drawSectionTitleLegacy(doc, 4, 'Análise de Conformidade', y);

  doc.autoTable({
    ...baseTableStyles,
    startY: y,
    body: [
      ['Total Recursos NFC', formatCurrencyLegacy(total)],
      ['Investimento (Meta: 70%)', `${formatCurrencyLegacy(project70)} (${p70Percent.toFixed(1)}%)`],
      ['Custeio (Meta: 30%)', `${formatCurrencyLegacy(operating30)} (${p30Percent.toFixed(1)}%)`],
      ['Situação', compliant ? 'CONFORME' : 'ATENÇÃO - FORA DA PROPORÇÃO'],
    ],
    columnStyles: {
      0: { cellWidth: 80, fontStyle: 'bold' },
      1: { cellWidth: 80, halign: 'right' },
    },
    didParseCell: (data: any) => {
      if (data.row.index === 3) {
        data.cell.styles.fillColor = compliant ? COLORS.positive : COLORS.negative;
        data.cell.styles.textColor = COLORS.white;
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  y = doc.lastAutoTable.finalY + 10;

  y = drawSectionTitleLegacy(doc, 5, 'Notas Explicativas', y);
  
  const notasNfc = [
    '1. Conforme legislação do programa, a aplicação deve respeitar: 70% para projetos e 30% para custeio.',
    '2. Recursos recebidos de Janeiro a Junho devem ser executados até 31/08 do ano corrente.',
    '3. Recursos recebidos de Julho a Dezembro devem ser executados até 28/02 do ano seguinte.',
  ];
  
  for (const nota of notasNfc) {
    y = drawParagraph(doc, nota, y);
  }

  drawFooter(doc);
  return Buffer.from(doc.output('arraybuffer'));
}

// ============================================================================
// BALANCETE MENSAL (mantido legacy)
// ============================================================================

export async function generateBalancetePDF(periodId: number): Promise<Buffer> {
  const db = await getDb();

  const [period] = await db.select().from(schema.periods).where(eq(schema.periods.id, periodId));
  if (!period) throw new Error('Período não encontrado');

  const accounts = await db.select().from(schema.accounts).orderBy(schema.accounts.code);
  const entries = await db.select().from(schema.entries).where(eq(schema.entries.periodId, periodId));

  const balances: Record<number, { debit: number; credit: number }> = {};
  for (const entry of entries) {
    if (!balances[entry.accountId]) balances[entry.accountId] = { debit: 0, credit: 0 };
    if (entry.type === 'debit') balances[entry.accountId].debit += entry.amountCents;
    else balances[entry.accountId].credit += entry.amountCents;
  }

  const org = await getOrganization();
  const doc = new jsPDF();

  let y = drawHeader(doc, org);
  y = drawReportTitle(doc, 'Balancete Mensal', period, y);

  y = drawSectionTitleLegacy(doc, 1, 'Apresentação', y);
  y = drawParagraph(doc, `Balancete de verificação das contas contábeis com movimentação no período de ${formatPeriod(period.month, period.year).toLowerCase()}.`, y);
  y += 3;

  y = drawSectionTitleLegacy(doc, 2, 'Movimentação por Conta', y);

  let totalDebits = 0;
  let totalCredits = 0;

  const rows = accounts
    .filter((a) => balances[a.id])
    .map((a) => {
      const b = balances[a.id];
      const saldo = b.debit - b.credit;
      totalDebits += b.debit;
      totalCredits += b.credit;
      return [
        a.code,
        a.name,
        formatCurrencyLegacy(b.debit),
        formatCurrencyLegacy(b.credit),
        formatCurrencyLegacy(Math.abs(saldo)),
        saldo >= 0 ? 'D' : 'C',
      ];
    });

  rows.push(['', 'TOTAIS', formatCurrencyLegacy(totalDebits), formatCurrencyLegacy(totalCredits), '', '']);

  doc.autoTable({
    ...baseTableStyles,
    startY: y,
    head: [['CÓDIGO', 'CONTA', 'DÉBITOS', 'CRÉDITOS', 'SALDO', 'N']],
    body: rows,
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 65 },
      2: { cellWidth: 30, halign: 'right' },
      3: { cellWidth: 30, halign: 'right' },
      4: { cellWidth: 25, halign: 'right' },
      5: { cellWidth: 10, halign: 'center' },
    },
    didParseCell: (data: any) => {
      if (data.row.index === rows.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = COLORS.headerBg;
      }
    },
  });

  y = doc.lastAutoTable.finalY + 10;

  y = drawSectionTitleLegacy(doc, 3, 'Verificação', y);
  
  const balanced = totalDebits === totalCredits;
  const verifyText = balanced
    ? `Débitos (${formatCurrencyLegacy(totalDebits)}) = Créditos (${formatCurrencyLegacy(totalCredits)}). O balancete está equilibrado.`
    : `ATENÇÃO: Débitos (${formatCurrencyLegacy(totalDebits)}) ≠ Créditos (${formatCurrencyLegacy(totalCredits)}). Verificar lançamentos.`;
  
  y = drawParagraph(doc, verifyText, y);

  drawFooter(doc);
  return Buffer.from(doc.output('arraybuffer'));
}

// ============================================================================
// DRE - DEMONSTRAÇÃO DO RESULTADO (mantido legacy)
// ============================================================================

export async function generateDREPDF(periodId: number): Promise<Buffer> {
  const db = await getDb();

  const [period] = await db.select().from(schema.periods).where(eq(schema.periods.id, periodId));
  if (!period) throw new Error('Período não encontrado');

  const entries = await db.select({
    entry: schema.entries,
    account: schema.accounts,
  })
    .from(schema.entries)
    .leftJoin(schema.accounts, eq(schema.entries.accountId, schema.accounts.id))
    .where(eq(schema.entries.periodId, periodId));

  const org = await getOrganization();
  const doc = new jsPDF();

  let y = drawHeader(doc, org);
  y = drawReportTitle(doc, 'Demonstração do Resultado do Exercício', period, y);

  const revenueByAccount: Record<string, number> = {};
  const expenseByAccount: Record<string, number> = {};
  let totalRevenues = 0;
  let totalExpenses = 0;

  for (const { entry, account } of entries) {
    if (!account) continue;
    const key = `${account.code} - ${account.name}`;

    if (account.type === 'revenue') {
      revenueByAccount[key] = (revenueByAccount[key] || 0) + entry.amountCents;
      totalRevenues += entry.amountCents;
    }
    if (account.type === 'expense' || account.type === 'fixed_asset') {
      expenseByAccount[key] = (expenseByAccount[key] || 0) + entry.amountCents;
      totalExpenses += entry.amountCents;
    }
  }

  const result = totalRevenues - totalExpenses;

  y = drawSectionTitleLegacy(doc, 1, 'Receitas Operacionais', y);

  const revenueRows = Object.entries(revenueByAccount)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, value]) => [name, formatCurrencyLegacy(value)]);
  revenueRows.push(['TOTAL RECEITAS OPERACIONAIS', formatCurrencyLegacy(totalRevenues)]);

  doc.autoTable({
    ...baseTableStyles,
    startY: y,
    body: revenueRows,
    columnStyles: {
      0: { cellWidth: 130 },
      1: { cellWidth: 45, halign: 'right' },
    },
    didParseCell: (data: any) => {
      if (data.row.index === revenueRows.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [220, 252, 231];
      }
    },
  });

  y = doc.lastAutoTable.finalY + 10;

  y = drawSectionTitleLegacy(doc, 2, 'Despesas Operacionais', y);

  const expenseRows = Object.entries(expenseByAccount)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, value]) => [name, `(${formatCurrencyLegacy(value)})`]);
  expenseRows.push(['TOTAL DESPESAS OPERACIONAIS', `(${formatCurrencyLegacy(totalExpenses)})`]);

  doc.autoTable({
    ...baseTableStyles,
    startY: y,
    body: expenseRows,
    columnStyles: {
      0: { cellWidth: 130 },
      1: { cellWidth: 45, halign: 'right' },
    },
    didParseCell: (data: any) => {
      if (data.row.index === expenseRows.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [254, 226, 226];
      }
    },
  });

  y = doc.lastAutoTable.finalY + 15;

  y = drawSectionTitleLegacy(doc, 3, 'Resultado do Período', y);

  doc.autoTable({
    ...baseTableStyles,
    startY: y,
    body: [[result >= 0 ? 'SUPERÁVIT DO PERÍODO' : 'DÉFICIT DO PERÍODO', formatCurrencyLegacy(Math.abs(result))]],
    styles: { ...baseTableStyles.styles, fontSize: 12 },
    columnStyles: {
      0: { cellWidth: 130, fontStyle: 'bold' },
      1: { cellWidth: 45, halign: 'right', fontStyle: 'bold' },
    },
    didParseCell: (data: any) => {
      data.cell.styles.fillColor = result >= 0 ? COLORS.positive : COLORS.negative;
      data.cell.styles.textColor = COLORS.white;
    },
  });

  drawFooter(doc);
  return Buffer.from(doc.output('arraybuffer'));
}

// ============================================================================
// BALANÇO PATRIMONIAL (mantido legacy)
// ============================================================================

export async function generateBalancoPatrimonialPDF(periodId: number): Promise<Buffer> {
  const db = await getDb();

  const [period] = await db.select().from(schema.periods).where(eq(schema.periods.id, periodId));
  if (!period) throw new Error('Período não encontrado');

  const accounts = await db.select().from(schema.accounts).where(eq(schema.accounts.active, 1)).orderBy(schema.accounts.code);
  const entries = await db.select().from(schema.entries).where(eq(schema.entries.periodId, periodId));

  const balances: Record<number, number> = {};
  for (const entry of entries) {
    if (!balances[entry.accountId]) balances[entry.accountId] = 0;
    if (entry.type === 'debit') balances[entry.accountId] += entry.amountCents;
    else balances[entry.accountId] -= entry.amountCents;
  }

  const org = await getOrganization();
  const doc = new jsPDF();

  let y = drawHeader(doc, org);
  y = drawReportTitle(doc, 'Balanço Patrimonial', period, y);

  const assets = accounts.filter((a) => a.type === 'asset' || a.type === 'fixed_asset').filter((a) => balances[a.id]);
  const liabilities = accounts.filter((a) => a.type === 'liability').filter((a) => balances[a.id]);
  const equity = accounts.filter((a) => a.type === 'equity').filter((a) => balances[a.id]);

  let totalAssets = 0;
  let totalLiabilities = 0;
  let totalEquity = 0;

  for (const a of assets) totalAssets += Math.abs(balances[a.id] || 0);
  for (const a of liabilities) totalLiabilities += Math.abs(balances[a.id] || 0);
  for (const a of equity) totalEquity += Math.abs(balances[a.id] || 0);

  y = drawSectionTitleLegacy(doc, 1, 'Ativo', y);

  const assetRows = assets.map((a) => [a.code, a.name, formatCurrencyLegacy(Math.abs(balances[a.id] || 0))]);
  assetRows.push(['', 'TOTAL DO ATIVO', formatCurrencyLegacy(totalAssets)]);

  doc.autoTable({
    ...baseTableStyles,
    startY: y,
    head: [['CÓDIGO', 'CONTA', 'VALOR']],
    body: assetRows.length > 1 ? assetRows : [['', 'Nenhuma conta com saldo', '']],
    headStyles: { ...baseTableStyles.headStyles, fillColor: [219, 234, 254] },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 110 },
      2: { cellWidth: 40, halign: 'right' },
    },
    didParseCell: (data: any) => {
      if (data.row.index === assetRows.length - 1 && assetRows.length > 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [219, 234, 254];
      }
    },
  });

  y = doc.lastAutoTable.finalY + 10;

  y = drawSectionTitleLegacy(doc, 2, 'Passivo', y);

  const liabilityRows = liabilities.map((a) => [a.code, a.name, formatCurrencyLegacy(Math.abs(balances[a.id] || 0))]);
  liabilityRows.push(['', 'TOTAL DO PASSIVO', formatCurrencyLegacy(totalLiabilities)]);

  doc.autoTable({
    ...baseTableStyles,
    startY: y,
    head: [['CÓDIGO', 'CONTA', 'VALOR']],
    body: liabilityRows.length > 1 ? liabilityRows : [['', 'Nenhuma conta com saldo', '']],
    headStyles: { ...baseTableStyles.headStyles, fillColor: [254, 226, 226] },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 110 },
      2: { cellWidth: 40, halign: 'right' },
    },
    didParseCell: (data: any) => {
      if (data.row.index === liabilityRows.length - 1 && liabilityRows.length > 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [254, 226, 226];
      }
    },
  });

  y = doc.lastAutoTable.finalY + 10;

  y = drawSectionTitleLegacy(doc, 3, 'Patrimônio Social', y);

  const equityRows = equity.map((a) => [a.code, a.name, formatCurrencyLegacy(Math.abs(balances[a.id] || 0))]);
  equityRows.push(['', 'TOTAL PATRIMÔNIO SOCIAL', formatCurrencyLegacy(totalEquity)]);

  doc.autoTable({
    ...baseTableStyles,
    startY: y,
    head: [['CÓDIGO', 'CONTA', 'VALOR']],
    body: equityRows.length > 1 ? equityRows : [['', 'Nenhuma conta com saldo', '']],
    headStyles: { ...baseTableStyles.headStyles, fillColor: [220, 252, 231] },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 110 },
      2: { cellWidth: 40, halign: 'right' },
    },
    didParseCell: (data: any) => {
      if (data.row.index === equityRows.length - 1 && equityRows.length > 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [220, 252, 231];
      }
    },
  });

  y = doc.lastAutoTable.finalY + 15;

  y = drawSectionTitleLegacy(doc, 4, 'Resumo', y);

  const totalPassivoPatrimonio = totalLiabilities + totalEquity;
  const balanced = totalAssets === totalPassivoPatrimonio;

  doc.autoTable({
    ...baseTableStyles,
    startY: y,
    body: [
      ['Total do Ativo', formatCurrencyLegacy(totalAssets)],
      ['Total do Passivo + Patrimônio Social', formatCurrencyLegacy(totalPassivoPatrimonio)],
      ['Situação', balanced ? 'EQUILIBRADO' : 'VERIFICAR LANÇAMENTOS'],
    ],
    columnStyles: {
      0: { cellWidth: 120, fontStyle: 'bold' },
      1: { cellWidth: 55, halign: 'right' },
    },
    didParseCell: (data: any) => {
      if (data.row.index === 2) {
        data.cell.styles.fillColor = balanced ? COLORS.positive : COLORS.negative;
        data.cell.styles.textColor = COLORS.white;
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  drawFooter(doc);
  return Buffer.from(doc.output('arraybuffer'));
}
