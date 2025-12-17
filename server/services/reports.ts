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

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('pt-BR');
}

function formatPeriod(month: number, year: number): string {
  const d = new Date(year, month - 1);
  return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

async function getOrganization() {
  const db = await getDb();
  const [org] = await db.select().from(schema.organizationSettings).limit(1);
  return org || { name: 'Centro Espírita', cnpj: '' };
}

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

  doc.setFontSize(18);
  doc.text(org.name, 105, 20, { align: 'center' });
  doc.setFontSize(12);
  doc.text('Relatório Financeiro Mensal', 105, 28, { align: 'center' });
  doc.text(formatPeriod(period.month, period.year), 105, 35, { align: 'center' });

  let revenues = 0;
  let expenses = 0;
  const revenueEntries: any[] = [];
  const expenseEntries: any[] = [];

  for (const { entry, account } of entries) {
    if (account?.type === 'revenue') {
      revenues += entry.amountCents;
      revenueEntries.push({ date: entry.transactionDate, desc: entry.description, amount: entry.amountCents });
    }
    if (account?.type === 'expense' || account?.type === 'fixed_asset') {
      expenses += entry.amountCents;
      expenseEntries.push({ date: entry.transactionDate, desc: entry.description, amount: entry.amountCents });
    }
  }

  let y = 50;

  doc.setFontSize(14);
  doc.setTextColor(22, 163, 74);
  doc.text('RECEITAS', 14, y);
  doc.setTextColor(0, 0, 0);

  doc.autoTable({
    startY: y + 5,
    head: [['Data', 'Descrição', 'Valor']],
    body: revenueEntries.map((e) => [formatDate(new Date(e.date)), e.desc, formatCurrency(e.amount)]),
    foot: [['', 'Total Receitas', formatCurrency(revenues)]],
    theme: 'striped',
    headStyles: { fillColor: [22, 163, 74] },
    footStyles: { fillColor: [22, 163, 74], textColor: 255 },
    margin: { left: 14, right: 14 },
  });

  y = doc.lastAutoTable.finalY + 15;

  doc.setFontSize(14);
  doc.setTextColor(220, 38, 38);
  doc.text('DESPESAS', 14, y);
  doc.setTextColor(0, 0, 0);

  doc.autoTable({
    startY: y + 5,
    head: [['Data', 'Descrição', 'Valor']],
    body: expenseEntries.map((e) => [formatDate(new Date(e.date)), e.desc, formatCurrency(e.amount)]),
    foot: [['', 'Total Despesas', formatCurrency(expenses)]],
    theme: 'striped',
    headStyles: { fillColor: [220, 38, 38] },
    footStyles: { fillColor: [220, 38, 38], textColor: 255 },
    margin: { left: 14, right: 14 },
  });

  y = doc.lastAutoTable.finalY + 15;

  const balance = revenues - expenses;
  doc.setFontSize(14);
  doc.text('RESUMO', 14, y);

  doc.autoTable({
    startY: y + 5,
    body: [
      ['Total Receitas', formatCurrency(revenues)],
      ['Total Despesas', formatCurrency(expenses)],
      [balance >= 0 ? 'SUPERÁVIT' : 'DÉFICIT', formatCurrency(Math.abs(balance))],
    ],
    theme: 'grid',
    styles: { fontSize: 12, fontStyle: 'bold' },
    columnStyles: { 0: { cellWidth: 80 }, 1: { halign: 'right' } },
    margin: { left: 14, right: 14 },
  });

  doc.setFontSize(8);
  doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, 14, 285);

  return Buffer.from(doc.output('arraybuffer'));
}

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

  doc.setFontSize(18);
  doc.text(org.name, 105, 20, { align: 'center' });
  doc.setFontSize(12);
  doc.text('Relatório Nota Fiscal Cidadã', 105, 28, { align: 'center' });
  doc.text(formatPeriod(period.month, period.year), 105, 35, { align: 'center' });

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

  let y = 50;

  doc.setFontSize(14);
  doc.setTextColor(124, 58, 237);
  doc.text('70% - INVESTIMENTO EM PROJETOS', 14, y);
  doc.setTextColor(0, 0, 0);

  doc.autoTable({
    startY: y + 5,
    head: [['Data', 'Descrição', 'Conta', 'Valor']],
    body: projectEntries.map((e) => [formatDate(new Date(e.date)), e.desc, e.account, formatCurrency(e.amount)]),
    foot: [['', '', 'Total', formatCurrency(project70)]],
    theme: 'striped',
    headStyles: { fillColor: [124, 58, 237] },
    footStyles: { fillColor: [124, 58, 237], textColor: 255 },
    margin: { left: 14, right: 14 },
  });

  y = doc.lastAutoTable.finalY + 15;

  doc.setFontSize(14);
  doc.setTextColor(234, 179, 8);
  doc.text('30% - CUSTEIO OPERACIONAL', 14, y);
  doc.setTextColor(0, 0, 0);

  doc.autoTable({
    startY: y + 5,
    head: [['Data', 'Descrição', 'Conta', 'Valor']],
    body: operatingEntries.map((e) => [formatDate(new Date(e.date)), e.desc, e.account, formatCurrency(e.amount)]),
    foot: [['', '', 'Total', formatCurrency(operating30)]],
    theme: 'striped',
    headStyles: { fillColor: [234, 179, 8] },
    footStyles: { fillColor: [234, 179, 8], textColor: 255 },
    margin: { left: 14, right: 14 },
  });

  y = doc.lastAutoTable.finalY + 15;

  doc.setFontSize(14);
  doc.text('ANÁLISE DE CONFORMIDADE', 14, y);

  doc.autoTable({
    startY: y + 5,
    body: [
      ['Total Recursos NFC', formatCurrency(total)],
      ['Investimento (70%)', `${formatCurrency(project70)} (${p70Percent.toFixed(1)}%)`],
      ['Custeio (30%)', `${formatCurrency(operating30)} (${p30Percent.toFixed(1)}%)`],
      ['Situação', compliant ? 'CONFORME' : 'ATENÇÃO - FORA DA PROPORÇÃO'],
    ],
    theme: 'grid',
    styles: { fontSize: 12 },
    didParseCell: (data: any) => {
      if (data.row.index === 3) {
        data.cell.styles.fillColor = compliant ? [22, 163, 74] : [220, 38, 38];
        data.cell.styles.textColor = 255;
        data.cell.styles.fontStyle = 'bold';
      }
    },
    margin: { left: 14, right: 14 },
  });

  doc.setFontSize(8);
  doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, 14, 285);

  return Buffer.from(doc.output('arraybuffer'));
}

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

  doc.setFontSize(18);
  doc.text(org.name, 105, 20, { align: 'center' });
  doc.setFontSize(12);
  doc.text('Balancete Mensal', 105, 28, { align: 'center' });
  doc.text(formatPeriod(period.month, period.year), 105, 35, { align: 'center' });

  const rows = accounts
    .filter((a) => balances[a.id])
    .map((a) => {
      const b = balances[a.id];
      const saldo = b.debit - b.credit;
      return [a.code, a.name, formatCurrency(b.debit), formatCurrency(b.credit), formatCurrency(Math.abs(saldo)), saldo >= 0 ? 'D' : 'C'];
    });

  doc.autoTable({
    startY: 45,
    head: [['Código', 'Conta', 'Débitos', 'Créditos', 'Saldo', 'N']],
    body: rows,
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246] },
    styles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 60 },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'center', cellWidth: 10 },
    },
    margin: { left: 14, right: 14 },
  });

  doc.setFontSize(8);
  doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, 14, 285);

  return Buffer.from(doc.output('arraybuffer'));
}

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

  doc.setFontSize(18);
  doc.text(org.name, 105, 20, { align: 'center' });
  doc.setFontSize(12);
  doc.text('Demonstração do Resultado do Exercício', 105, 28, { align: 'center' });
  doc.text(formatPeriod(period.month, period.year), 105, 35, { align: 'center' });

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

  let y = 50;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('RECEITAS OPERACIONAIS', 14, y);
  doc.setFont('helvetica', 'normal');

  const revenueRows = Object.entries(revenueByAccount).map(([name, value]) => [name, formatCurrency(value)]);
  
  doc.autoTable({
    startY: y + 5,
    body: [...revenueRows, ['TOTAL RECEITAS', formatCurrency(totalRevenues)]],
    theme: 'plain',
    styles: { fontSize: 10 },
    columnStyles: { 0: { cellWidth: 120 }, 1: { halign: 'right' } },
    didParseCell: (data: any) => {
      if (data.row.index === revenueRows.length) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [240, 253, 244];
      }
    },
    margin: { left: 14, right: 14 },
  });

  y = doc.lastAutoTable.finalY + 10;

  doc.setFont('helvetica', 'bold');
  doc.text('DESPESAS OPERACIONAIS', 14, y);
  doc.setFont('helvetica', 'normal');

  const expenseRows = Object.entries(expenseByAccount).map(([name, value]) => [name, `(${formatCurrency(value)})`]);

  doc.autoTable({
    startY: y + 5,
    body: [...expenseRows, ['TOTAL DESPESAS', `(${formatCurrency(totalExpenses)})`]],
    theme: 'plain',
    styles: { fontSize: 10 },
    columnStyles: { 0: { cellWidth: 120 }, 1: { halign: 'right' } },
    didParseCell: (data: any) => {
      if (data.row.index === expenseRows.length) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [254, 242, 242];
      }
    },
    margin: { left: 14, right: 14 },
  });

  y = doc.lastAutoTable.finalY + 15;

  const result = totalRevenues - totalExpenses;
  const isPositive = result >= 0;

  doc.autoTable({
    startY: y,
    body: [[isPositive ? 'SUPERÁVIT DO PERÍODO' : 'DÉFICIT DO PERÍODO', formatCurrency(Math.abs(result))]],
    theme: 'grid',
    styles: { fontSize: 14, fontStyle: 'bold' },
    columnStyles: { 0: { cellWidth: 120 }, 1: { halign: 'right' } },
    didParseCell: (data: any) => {
      data.cell.styles.fillColor = isPositive ? [22, 163, 74] : [220, 38, 38];
      data.cell.styles.textColor = 255;
    },
    margin: { left: 14, right: 14 },
  });

  doc.setFontSize(8);
  doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, 14, 285);

  return Buffer.from(doc.output('arraybuffer'));
}

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

  doc.setFontSize(18);
  doc.text(org.name, 105, 20, { align: 'center' });
  doc.setFontSize(12);
  doc.text('Balanço Patrimonial', 105, 28, { align: 'center' });
  doc.text(formatPeriod(period.month, period.year), 105, 35, { align: 'center' });

  const assets = accounts.filter(a => a.type === 'asset' || a.type === 'fixed_asset').filter(a => balances[a.id]);
  const liabilities = accounts.filter(a => a.type === 'liability').filter(a => balances[a.id]);
  const equity = accounts.filter(a => a.type === 'equity').filter(a => balances[a.id]);

  let totalAssets = 0;
  let totalLiabilities = 0;
  let totalEquity = 0;

  for (const a of assets) totalAssets += Math.abs(balances[a.id] || 0);
  for (const a of liabilities) totalLiabilities += Math.abs(balances[a.id] || 0);
  for (const a of equity) totalEquity += Math.abs(balances[a.id] || 0);

  let y = 50;

  doc.setFontSize(14);
  doc.setTextColor(59, 130, 246);
  doc.text('ATIVO', 14, y);
  doc.setTextColor(0, 0, 0);

  const assetRows = assets.map(a => [a.code, a.name, formatCurrency(Math.abs(balances[a.id] || 0))]);

  doc.autoTable({
    startY: y + 5,
    body: [...assetRows, ['', 'TOTAL ATIVO', formatCurrency(totalAssets)]],
    theme: 'striped',
    styles: { fontSize: 9 },
    columnStyles: { 0: { cellWidth: 25 }, 1: { cellWidth: 80 }, 2: { halign: 'right' } },
    didParseCell: (data: any) => {
      if (data.row.index === assetRows.length) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [219, 234, 254];
      }
    },
    margin: { left: 14, right: 100 },
  });

  doc.setFontSize(14);
  doc.setTextColor(220, 38, 38);
  doc.text('PASSIVO E PATRIMÔNIO', 110, 50);
  doc.setTextColor(0, 0, 0);

  const liabilityRows = liabilities.map(a => [a.code, a.name, formatCurrency(Math.abs(balances[a.id] || 0))]);
  const equityRows = equity.map(a => [a.code, a.name, formatCurrency(Math.abs(balances[a.id] || 0))]);

  doc.autoTable({
    startY: 55,
    body: [
      ...liabilityRows,
      ['', 'Total Passivo', formatCurrency(totalLiabilities)],
      ['', 'PATRIMÔNIO SOCIAL', ''],
      ...equityRows,
      ['', 'Total Patrimônio', formatCurrency(totalEquity)],
      ['', 'TOTAL P + PL', formatCurrency(totalLiabilities + totalEquity)],
    ],
    theme: 'striped',
    styles: { fontSize: 9 },
    columnStyles: { 0: { cellWidth: 20 }, 1: { cellWidth: 45 }, 2: { halign: 'right' } },
    margin: { left: 110, right: 14 },
  });

  doc.setFontSize(8);
  doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, 14, 285);

  return Buffer.from(doc.output('arraybuffer'));
}

