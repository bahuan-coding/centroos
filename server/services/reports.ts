import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { eq, and, desc } from 'drizzle-orm';
import { getDb, schema } from '../db';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable: { finalY: number };
  }
}

// ============================================================================
// CONSTANTES E CORES
// ============================================================================

const COLORS = {
  textPrimary: [31, 41, 55] as [number, number, number],      // #1f2937
  textSecondary: [107, 114, 128] as [number, number, number], // #6b7280
  headerBg: [243, 244, 246] as [number, number, number],      // #f3f4f6
  border: [229, 231, 235] as [number, number, number],        // #e5e7eb
  positive: [22, 101, 52] as [number, number, number],        // #166534
  negative: [153, 27, 27] as [number, number, number],        // #991b1b
  sectionTitle: [55, 65, 81] as [number, number, number],     // #374151
  accent: [59, 130, 246] as [number, number, number],         // #3b82f6
  white: [255, 255, 255] as [number, number, number],
};

const MARGINS = { left: 15, right: 15, top: 15 };
const PAGE_WIDTH = 210;
const CONTENT_WIDTH = PAGE_WIDTH - MARGINS.left - MARGINS.right;

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

function formatCurrency(cents: number): string {
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
// FUNÇÕES DE DESENHO COMPARTILHADAS
// ============================================================================

function drawHeader(doc: jsPDF, org: any): number {
  let y = MARGINS.top;
  
  // Nome da organização (grande)
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.textPrimary);
  doc.text(org.name.toUpperCase(), PAGE_WIDTH / 2, y, { align: 'center' });
  y += 8;
  
  // Linha separadora
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.5);
  doc.line(MARGINS.left, y, PAGE_WIDTH - MARGINS.right, y);
  y += 5;
  
  // Endereço
  if (org.address || org.city) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.textSecondary);
    const address = [org.address, org.city, org.state].filter(Boolean).join(' – ');
    doc.text(address, PAGE_WIDTH / 2, y, { align: 'center' });
    y += 5;
  }
  
  // CNPJ e contatos
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
  
  // Título do relatório
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.textPrimary);
  doc.text(`Relatório ${title}`, PAGE_WIDTH / 2, y, { align: 'center' });
  y += 7;
  
  // Período
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.textSecondary);
  doc.text(`Período: ${formatPeriodTitle(period.month, period.year)}`, PAGE_WIDTH / 2, y, { align: 'center' });
  y += 10;
  
  return y;
}

function drawSectionTitle(doc: jsPDF, number: number, title: string, startY: number): number {
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
    
    // Linha separadora
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.3);
    doc.line(MARGINS.left, 280, PAGE_WIDTH - MARGINS.right, 280);
    
    // Data de geração
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.textSecondary);
    doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, MARGINS.left, 285);
    
    // Número da página
    doc.text(`Página ${i} de ${pageCount}`, PAGE_WIDTH - MARGINS.right, 285, { align: 'right' });
  }
}

// Estilo base para tabelas profissionais
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
// RELATÓRIO FINANCEIRO MENSAL
// ============================================================================

export async function generateFinancialReportPDF(periodId: number): Promise<Buffer> {
  const db = await getDb();

  const [period] = await db.select().from(schema.periods).where(eq(schema.periods.id, periodId));
  if (!period) throw new Error('Período não encontrado');

  const entries = await db.select({
    entry: schema.entries,
    account: schema.accounts,
  })
    .from(schema.entries)
    .leftJoin(schema.accounts, eq(schema.entries.accountId, schema.accounts.id))
    .where(eq(schema.entries.periodId, periodId))
    .orderBy(desc(schema.entries.transactionDate));

  const org = await getOrganization();
  const doc = new jsPDF();

  // Cabeçalho
  let y = drawHeader(doc, org);
  y = drawReportTitle(doc, 'Financeiro', period, y);

  // Processar dados
  let totalReceitas = 0;
  let totalDespesas = 0;
  const receitasByCategoria: Record<string, { valor: number; obs: string }> = {};
  const despesasByCategoria: Record<string, { items: { desc: string; valor: number }[] }> = {};

  for (const { entry, account } of entries) {
    if (!account) continue;
    
    if (account.type === 'revenue') {
      totalReceitas += entry.amountCents;
      const categoria = account.name;
      if (!receitasByCategoria[categoria]) {
        receitasByCategoria[categoria] = { valor: 0, obs: '' };
      }
      receitasByCategoria[categoria].valor += entry.amountCents;
    }
    
    if (account.type === 'expense' || account.type === 'fixed_asset') {
      totalDespesas += entry.amountCents;
      const categoria = account.name;
      if (!despesasByCategoria[categoria]) {
        despesasByCategoria[categoria] = { items: [] };
      }
      despesasByCategoria[categoria].items.push({
        desc: entry.description,
        valor: entry.amountCents,
      });
    }
  }

  const saldo = totalReceitas - totalDespesas;

  // SEÇÃO 1: Sumário Executivo
  y = drawSectionTitle(doc, 1, 'Sumário Executivo', y);
  
  const sumarioText = `Este relatório financeiro abrange o período de ${formatPeriod(period.month, period.year).toLowerCase()}, apresentando as Receitas, Despesas e o Saldo geral.\n\nDurante o mês, a ${org.name} arrecadou ${formatCurrency(totalReceitas)} em receitas e incorreu ${formatCurrency(totalDespesas)} em despesas, resultando em ${saldo >= 0 ? 'superávit' : 'déficit'} de ${formatCurrency(Math.abs(saldo))}.`;
  
  y = drawParagraph(doc, sumarioText, y);
  y += 5;

  // SEÇÃO 2: Receitas
  y = drawSectionTitle(doc, 2, 'Receitas', y);
  
  const receitasRows = Object.entries(receitasByCategoria).map(([categoria, data]) => [
    categoria,
    formatCurrency(data.valor),
    data.obs || '',
  ]);
  receitasRows.push(['Total das Receitas', formatCurrency(totalReceitas), '']);

  doc.autoTable({
    ...baseTableStyles,
    startY: y,
    head: [['ORIGEM DA RECEITA', 'VALOR ARRECADADO', 'OBSERVAÇÕES']],
    body: receitasRows,
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 45, halign: 'right' },
      2: { cellWidth: 'auto' },
    },
    didParseCell: (data: any) => {
      if (data.row.index === receitasRows.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [220, 252, 231]; // green-100
      }
    },
  });

  y = doc.lastAutoTable.finalY + 10;

  // SEÇÃO 3: Despesas
  y = drawSectionTitle(doc, 3, 'Despesas', y);
  
  const despesasRows: string[][] = [];
  for (const [categoria, data] of Object.entries(despesasByCategoria)) {
    for (const item of data.items) {
      despesasRows.push([categoria, item.desc, formatCurrency(item.valor)]);
    }
  }
  despesasRows.push(['Total das Despesas', '', formatCurrency(totalDespesas)]);

  doc.autoTable({
    ...baseTableStyles,
    startY: y,
    head: [['CATEGORIA', 'ITEM/DESCRIÇÃO', 'VALOR (R$)']],
    body: despesasRows,
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 90 },
      2: { cellWidth: 40, halign: 'right' },
    },
    didParseCell: (data: any) => {
      if (data.row.index === despesasRows.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [254, 226, 226]; // red-100
      }
    },
  });

  y = doc.lastAutoTable.finalY + 10;

  // Verificar se precisa nova página
  if (y > 220) {
    doc.addPage();
    y = MARGINS.top;
  }

  // SEÇÃO 4: Balanço Financeiro
  y = drawSectionTitle(doc, 4, 'Balanço Financeiro', y);
  
  doc.autoTable({
    ...baseTableStyles,
    startY: y,
    head: [['DESCRIÇÃO', 'VALOR (R$)']],
    body: [
      ['Total de Receitas', formatCurrency(totalReceitas)],
      ['Total de Despesas', `(${formatCurrency(totalDespesas)})`],
      [saldo >= 0 ? 'Superávit do Mês' : 'Déficit do Mês', formatCurrency(Math.abs(saldo))],
    ],
    columnStyles: {
      0: { cellWidth: 100 },
      1: { cellWidth: 60, halign: 'right' },
    },
    didParseCell: (data: any) => {
      if (data.row.index === 2) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = saldo >= 0 ? COLORS.positive : COLORS.negative;
        data.cell.styles.textColor = COLORS.white;
      }
    },
  });

  y = doc.lastAutoTable.finalY + 10;

  // SEÇÃO 5: Notas Explicativas
  y = drawSectionTitle(doc, 5, 'Notas Explicativas', y);
  
  const notas = [
    `1. Receitas totalizaram ${formatCurrency(totalReceitas)} no período.`,
    `2. Despesas totalizaram ${formatCurrency(totalDespesas)} no período.`,
    saldo >= 0 
      ? `3. O resultado do período foi positivo (superávit), indicando boa gestão financeira.`
      : `3. O resultado do período foi negativo (déficit), exigindo atenção para os próximos meses.`,
  ];
  
  for (const nota of notas) {
    y = drawParagraph(doc, nota, y);
  }

  y += 5;

  // SEÇÃO 6: Contatos
  y = drawSectionTitle(doc, 6, 'Contatos', y);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.textSecondary);
  doc.text('Para quaisquer dúvidas ou esclarecimentos, favor contatar a administração.', MARGINS.left, y);
  
  if (org.email) {
    y += 5;
    doc.text(`E-mail: ${org.email}`, MARGINS.left, y);
  }
  if (org.phone) {
    y += 5;
    doc.text(`Telefone: ${org.phone}`, MARGINS.left, y);
  }

  // Rodapé
  drawFooter(doc);

  return Buffer.from(doc.output('arraybuffer'));
}

// ============================================================================
// RELATÓRIO NOTA FISCAL CIDADÃ
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

  // Processar dados
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

  // SEÇÃO 1: Sumário
  y = drawSectionTitle(doc, 1, 'Sumário', y);
  
  const sumario = `Este relatório apresenta a aplicação dos recursos provenientes do Programa Nota Fiscal Cidadã no período de ${formatPeriod(period.month, period.year).toLowerCase()}. Conforme legislação, os recursos devem ser aplicados: 70% em projetos e aquisição de bens, e 30% em custeio operacional.`;
  y = drawParagraph(doc, sumario, y);
  y += 5;

  // SEÇÃO 2: Investimento em Projetos (70%)
  y = drawSectionTitle(doc, 2, 'Investimento em Projetos (70%)', y);

  const projectRows = projectEntries.map((e) => [
    formatDate(new Date(e.date)),
    e.desc,
    e.account || '',
    formatCurrency(e.amount),
  ]);
  projectRows.push(['', '', 'Total', formatCurrency(project70)]);

  doc.autoTable({
    ...baseTableStyles,
    startY: y,
    head: [['DATA', 'DESCRIÇÃO', 'CONTA', 'VALOR']],
    body: projectRows.length > 1 ? projectRows : [['', 'Nenhum lançamento no período', '', '']],
    headStyles: { ...baseTableStyles.headStyles, fillColor: [237, 233, 254] }, // purple-100
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

  // SEÇÃO 3: Custeio Operacional (30%)
  y = drawSectionTitle(doc, 3, 'Custeio Operacional (30%)', y);

  const operatingRows = operatingEntries.map((e) => [
    formatDate(new Date(e.date)),
    e.desc,
    e.account || '',
    formatCurrency(e.amount),
  ]);
  operatingRows.push(['', '', 'Total', formatCurrency(operating30)]);

  doc.autoTable({
    ...baseTableStyles,
    startY: y,
    head: [['DATA', 'DESCRIÇÃO', 'CONTA', 'VALOR']],
    body: operatingRows.length > 1 ? operatingRows : [['', 'Nenhum lançamento no período', '', '']],
    headStyles: { ...baseTableStyles.headStyles, fillColor: [254, 249, 195] }, // yellow-100
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

  // SEÇÃO 4: Análise de Conformidade
  y = drawSectionTitle(doc, 4, 'Análise de Conformidade', y);

  doc.autoTable({
    ...baseTableStyles,
    startY: y,
    body: [
      ['Total Recursos NFC', formatCurrency(total)],
      ['Investimento (Meta: 70%)', `${formatCurrency(project70)} (${p70Percent.toFixed(1)}%)`],
      ['Custeio (Meta: 30%)', `${formatCurrency(operating30)} (${p30Percent.toFixed(1)}%)`],
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

  // SEÇÃO 5: Notas
  y = drawSectionTitle(doc, 5, 'Notas Explicativas', y);
  
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
// BALANCETE MENSAL
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

  // SEÇÃO 1: Sumário
  y = drawSectionTitle(doc, 1, 'Apresentação', y);
  y = drawParagraph(doc, `Balancete de verificação das contas contábeis com movimentação no período de ${formatPeriod(period.month, period.year).toLowerCase()}.`, y);
  y += 3;

  // SEÇÃO 2: Movimentação
  y = drawSectionTitle(doc, 2, 'Movimentação por Conta', y);

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
        formatCurrency(b.debit),
        formatCurrency(b.credit),
        formatCurrency(Math.abs(saldo)),
        saldo >= 0 ? 'D' : 'C',
      ];
    });

  rows.push(['', 'TOTAIS', formatCurrency(totalDebits), formatCurrency(totalCredits), '', '']);

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

  // SEÇÃO 3: Verificação
  y = drawSectionTitle(doc, 3, 'Verificação', y);
  
  const balanced = totalDebits === totalCredits;
  const verifyText = balanced
    ? `Débitos (${formatCurrency(totalDebits)}) = Créditos (${formatCurrency(totalCredits)}). O balancete está equilibrado.`
    : `ATENÇÃO: Débitos (${formatCurrency(totalDebits)}) ≠ Créditos (${formatCurrency(totalCredits)}). Verificar lançamentos.`;
  
  y = drawParagraph(doc, verifyText, y);

  drawFooter(doc);
  return Buffer.from(doc.output('arraybuffer'));
}

// ============================================================================
// DRE - DEMONSTRAÇÃO DO RESULTADO
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

  // SEÇÃO 1: Receitas Operacionais
  y = drawSectionTitle(doc, 1, 'Receitas Operacionais', y);

  const revenueRows = Object.entries(revenueByAccount)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, value]) => [name, formatCurrency(value)]);
  revenueRows.push(['TOTAL RECEITAS OPERACIONAIS', formatCurrency(totalRevenues)]);

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

  // SEÇÃO 2: Despesas Operacionais
  y = drawSectionTitle(doc, 2, 'Despesas Operacionais', y);

  const expenseRows = Object.entries(expenseByAccount)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, value]) => [name, `(${formatCurrency(value)})`]);
  expenseRows.push(['TOTAL DESPESAS OPERACIONAIS', `(${formatCurrency(totalExpenses)})`]);

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

  // SEÇÃO 3: Resultado
  y = drawSectionTitle(doc, 3, 'Resultado do Período', y);

  doc.autoTable({
    ...baseTableStyles,
    startY: y,
    body: [[result >= 0 ? 'SUPERÁVIT DO PERÍODO' : 'DÉFICIT DO PERÍODO', formatCurrency(Math.abs(result))]],
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
// BALANÇO PATRIMONIAL
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

  // SEÇÃO 1: Ativo
  y = drawSectionTitle(doc, 1, 'Ativo', y);

  const assetRows = assets.map((a) => [a.code, a.name, formatCurrency(Math.abs(balances[a.id] || 0))]);
  assetRows.push(['', 'TOTAL DO ATIVO', formatCurrency(totalAssets)]);

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

  // SEÇÃO 2: Passivo
  y = drawSectionTitle(doc, 2, 'Passivo', y);

  const liabilityRows = liabilities.map((a) => [a.code, a.name, formatCurrency(Math.abs(balances[a.id] || 0))]);
  liabilityRows.push(['', 'TOTAL DO PASSIVO', formatCurrency(totalLiabilities)]);

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

  // SEÇÃO 3: Patrimônio Social
  y = drawSectionTitle(doc, 3, 'Patrimônio Social', y);

  const equityRows = equity.map((a) => [a.code, a.name, formatCurrency(Math.abs(balances[a.id] || 0))]);
  equityRows.push(['', 'TOTAL PATRIMÔNIO SOCIAL', formatCurrency(totalEquity)]);

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

  // SEÇÃO 4: Resumo
  y = drawSectionTitle(doc, 4, 'Resumo', y);

  const totalPassivoPatrimonio = totalLiabilities + totalEquity;
  const balanced = totalAssets === totalPassivoPatrimonio;

  doc.autoTable({
    ...baseTableStyles,
    startY: y,
    body: [
      ['Total do Ativo', formatCurrency(totalAssets)],
      ['Total do Passivo + Patrimônio Social', formatCurrency(totalPassivoPatrimonio)],
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
