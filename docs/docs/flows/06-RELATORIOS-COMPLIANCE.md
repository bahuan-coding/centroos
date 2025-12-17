# Guia de Geração de Relatórios e Compliance Contábil

## 1. VISÃO GERAL

### 1.1 Objetivo

O módulo de relatórios automatiza a geração de demonstrações contábeis e relatórios de compliance em formato PDF, garantindo conformidade com as normas ITG 2002 (R1) e legislação específica para Centros Espíritas e entidades sem fins lucrativos.

**Benefícios:**
- **Automação completa**: Geração de relatórios em segundos
- **Conformidade garantida**: Estrutura baseada em normas contábeis
- **Rastreabilidade**: Todos os dados vinculados aos lançamentos
- **Transparência**: Relatórios prontos para prestação de contas
- **Profissionalismo**: Layout padronizado e apresentação clara

### 1.2 Tipos de Relatório

| Relatório | Periodicidade | Obrigatório | Finalidade |
|-----------|---------------|-------------|------------|
| **Relatório Financeiro Mensal** | Mensal | Recomendado | Gestão interna e transparência |
| **Balancete Mensal** | Mensal | Recomendado | Controle de saldos contábeis |
| **Demonstração do Resultado** | Anual | Obrigatório (ITG 2002) | Prestação de contas |
| **Balanço Patrimonial** | Anual | Obrigatório (ITG 2002) | Prestação de contas |
| **Demonstração de Fluxo de Caixa** | Anual | Obrigatório (ITG 2002) | Prestação de contas |
| **Relatório Nota Fiscal Cidadã** | Anual | Obrigatório (SEFAZ) | Prestação de contas NFC |
| **Demonstração de Mutações do Patrimônio** | Anual | Obrigatório (ITG 2002) | Prestação de contas |

---

## 2. RELATÓRIO FINANCEIRO MENSAL

### 2.1 Estrutura do Relatório

**Seções:**
1. Cabeçalho (Organização, Período, Data de Emissão)
2. Sumário Executivo
3. Demonstrativo de Receitas
4. Demonstrativo de Despesas
5. Balanço do Período
6. Saldos Bancários
7. Análise de Nota Fiscal Cidadã (se aplicável)
8. Notas Explicativas
9. Gráficos e Visualizações

### 2.2 Implementação

**Estrutura de Dados:**
```typescript
interface FinancialReportData {
  organization: OrganizationSettings;
  period: Period;
  revenues: {
    total: number;
    byAccount: Array<{
      account: Account;
      amount: number;
      percentage: number;
      entries: Entry[];
    }>;
  };
  expenses: {
    total: number;
    byAccount: Array<{
      account: Account;
      amount: number;
      percentage: number;
      entries: Entry[];
    }>;
  };
  balance: {
    revenues: number;
    expenses: number;
    result: number;
    type: "surplus" | "deficit";
  };
  bankBalances: Array<{
    account: Account;
    balance: number;
  }>;
  nfcAnalysis?: {
    totalRevenue: number;
    project70: number;
    operating30: number;
    project70Percent: number;
    operating30Percent: number;
    compliant: boolean;
  };
  notes?: string[];
}
```

**Coleta de Dados:**
```typescript
async function collectFinancialReportData(periodId: number): Promise<FinancialReportData> {
  const period = await getPeriodById(periodId);
  const organization = await getOrganizationSettings();
  
  // Buscar todas as receitas
  const revenueEntries = await getEntries({
    periodId,
    accountType: "revenue",
  });
  
  // Agrupar por conta
  const revenuesByAccount = groupByAccount(revenueEntries);
  const totalRevenues = sumEntries(revenueEntries);
  
  // Buscar todas as despesas
  const expenseEntries = await getEntries({
    periodId,
    accountType: "expense",
  });
  
  const expensesByAccount = groupByAccount(expenseEntries);
  const totalExpenses = sumEntries(expenseEntries);
  
  // Calcular saldo
  const balance = {
    revenues: totalRevenues,
    expenses: totalExpenses,
    result: totalRevenues - totalExpenses,
    type: totalRevenues >= totalExpenses ? "surplus" : "deficit" as const,
  };
  
  // Buscar saldos bancários
  const bankAccounts = await getAccounts({
    type: "asset",
    code: "1.1.1%", // Disponibilidades
  });
  
  const bankBalances = await Promise.all(
    bankAccounts.map(async (account) => ({
      account,
      balance: await calculateAccountBalance(account.id, period.year, period.month),
    }))
  );
  
  // Análise NFC (se houver lançamentos NFC)
  const nfcEntries = await getEntries({
    periodId,
    isNfc: true,
  });
  
  let nfcAnalysis: FinancialReportData["nfcAnalysis"];
  if (nfcEntries.length > 0) {
    nfcAnalysis = await analyzeNfcCompliance(periodId);
  }
  
  return {
    organization,
    period,
    revenues: {
      total: totalRevenues,
      byAccount: revenuesByAccount.map(group => ({
        account: group.account,
        amount: group.total,
        percentage: (group.total / totalRevenues) * 100,
        entries: group.entries,
      })),
    },
    expenses: {
      total: totalExpenses,
      byAccount: expensesByAccount.map(group => ({
        account: group.account,
        amount: group.total,
        percentage: (group.total / totalExpenses) * 100,
        entries: group.entries,
      })),
    },
    balance,
    bankBalances,
    nfcAnalysis,
  };
}

function groupByAccount(entries: Entry[]): Array<{ account: Account; total: number; entries: Entry[] }> {
  const groups = new Map<number, { account: Account; total: number; entries: Entry[] }>();
  
  for (const entry of entries) {
    const existing = groups.get(entry.accountId);
    
    if (existing) {
      existing.total += entry.amountCents;
      existing.entries.push(entry);
    } else {
      groups.set(entry.accountId, {
        account: entry.account,
        total: entry.amountCents,
        entries: [entry],
      });
    }
  }
  
  return Array.from(groups.values()).sort((a, b) => b.total - a.total);
}

function sumEntries(entries: Entry[]): number {
  return entries.reduce((sum, entry) => sum + entry.amountCents, 0);
}

async function calculateAccountBalance(
  accountId: number,
  year: number,
  month: number
): Promise<number> {
  const entries = await getEntries({
    accountId,
    year,
    month,
  });
  
  const account = await getAccountById(accountId);
  
  // Natureza da conta determina cálculo
  let balance = 0;
  for (const entry of entries) {
    if (account.type === "asset" || account.type === "expense") {
      // Natureza devedora: débito aumenta, crédito diminui
      balance += entry.type === "debit" ? entry.amountCents : -entry.amountCents;
    } else {
      // Natureza credora: crédito aumenta, débito diminui
      balance += entry.type === "credit" ? entry.amountCents : -entry.amountCents;
    }
  }
  
  return balance;
}
```

**Geração de PDF:**
```typescript
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { Chart } from "chart.js/auto";

async function generateFinancialReportPDF(data: FinancialReportData): Promise<Buffer> {
  const doc = new jsPDF();
  let yPosition = 20;
  
  // ===== CABEÇALHO =====
  doc.setFontSize(16);
  doc.setFont(undefined, "bold");
  doc.text(data.organization.name, 105, yPosition, { align: "center" });
  
  yPosition += 8;
  doc.setFontSize(12);
  doc.setFont(undefined, "normal");
  doc.text(
    `CNPJ: ${data.organization.cnpj || "Não informado"}`,
    105,
    yPosition,
    { align: "center" }
  );
  
  yPosition += 6;
  doc.text(
    data.organization.address || "",
    105,
    yPosition,
    { align: "center" }
  );
  
  yPosition += 10;
  doc.setFontSize(14);
  doc.setFont(undefined, "bold");
  doc.text(
    `Relatório Financeiro - ${formatPeriod(data.period.month, data.period.year)}`,
    105,
    yPosition,
    { align: "center" }
  );
  
  yPosition += 10;
  doc.setFontSize(10);
  doc.setFont(undefined, "normal");
  doc.text(
    `Emitido em: ${formatDate(new Date())}`,
    105,
    yPosition,
    { align: "center" }
  );
  
  yPosition += 15;
  
  // ===== SUMÁRIO EXECUTIVO =====
  doc.setFontSize(12);
  doc.setFont(undefined, "bold");
  doc.text("Sumário Executivo", 20, yPosition);
  
  yPosition += 8;
  doc.setFontSize(10);
  doc.setFont(undefined, "normal");
  
  const summaryData = [
    ["Receitas Totais", formatCurrency(data.balance.revenues)],
    ["Despesas Totais", formatCurrency(data.balance.expenses)],
    [
      data.balance.type === "surplus" ? "Superávit" : "Déficit",
      formatCurrency(Math.abs(data.balance.result)),
    ],
  ];
  
  doc.autoTable({
    startY: yPosition,
    head: [["Descrição", "Valor"]],
    body: summaryData,
    theme: "grid",
    headStyles: { fillColor: [59, 130, 246] },
    margin: { left: 20, right: 20 },
  });
  
  yPosition = (doc as any).lastAutoTable.finalY + 15;
  
  // ===== DEMONSTRATIVO DE RECEITAS =====
  doc.addPage();
  yPosition = 20;
  
  doc.setFontSize(12);
  doc.setFont(undefined, "bold");
  doc.text("Demonstrativo de Receitas", 20, yPosition);
  
  yPosition += 8;
  
  const revenueRows = data.revenues.byAccount.map(item => [
    item.account.code,
    item.account.name,
    formatCurrency(item.amount),
    `${item.percentage.toFixed(1)}%`,
  ]);
  
  revenueRows.push([
    "",
    "TOTAL",
    formatCurrency(data.revenues.total),
    "100%",
  ]);
  
  doc.autoTable({
    startY: yPosition,
    head: [["Código", "Conta", "Valor", "%"]],
    body: revenueRows,
    theme: "striped",
    headStyles: { fillColor: [34, 197, 94] },
    margin: { left: 20, right: 20 },
    foot: [["", "TOTAL", formatCurrency(data.revenues.total), "100%"]],
    footStyles: { fillColor: [34, 197, 94], fontStyle: "bold" },
  });
  
  // ===== DEMONSTRATIVO DE DESPESAS =====
  doc.addPage();
  yPosition = 20;
  
  doc.setFontSize(12);
  doc.setFont(undefined, "bold");
  doc.text("Demonstrativo de Despesas", 20, yPosition);
  
  yPosition += 8;
  
  const expenseRows = data.expenses.byAccount.map(item => [
    item.account.code,
    item.account.name,
    formatCurrency(item.amount),
    `${item.percentage.toFixed(1)}%`,
  ]);
  
  expenseRows.push([
    "",
    "TOTAL",
    formatCurrency(data.expenses.total),
    "100%",
  ]);
  
  doc.autoTable({
    startY: yPosition,
    head: [["Código", "Conta", "Valor", "%"]],
    body: expenseRows,
    theme: "striped",
    headStyles: { fillColor: [239, 68, 68] },
    margin: { left: 20, right: 20 },
    foot: [["", "TOTAL", formatCurrency(data.expenses.total), "100%"]],
    footStyles: { fillColor: [239, 68, 68], fontStyle: "bold" },
  });
  
  // ===== SALDOS BANCÁRIOS =====
  yPosition = (doc as any).lastAutoTable.finalY + 15;
  
  if (yPosition > 250) {
    doc.addPage();
    yPosition = 20;
  }
  
  doc.setFontSize(12);
  doc.setFont(undefined, "bold");
  doc.text("Saldos Bancários", 20, yPosition);
  
  yPosition += 8;
  
  const bankRows = data.bankBalances.map(item => [
    item.account.code,
    item.account.name,
    formatCurrency(item.balance),
  ]);
  
  const totalBankBalance = data.bankBalances.reduce((sum, item) => sum + item.balance, 0);
  
  doc.autoTable({
    startY: yPosition,
    head: [["Código", "Conta", "Saldo"]],
    body: bankRows,
    theme: "grid",
    headStyles: { fillColor: [59, 130, 246] },
    margin: { left: 20, right: 20 },
    foot: [["", "TOTAL", formatCurrency(totalBankBalance)]],
    footStyles: { fillColor: [59, 130, 246], fontStyle: "bold" },
  });
  
  // ===== ANÁLISE NFC (se aplicável) =====
  if (data.nfcAnalysis) {
    doc.addPage();
    yPosition = 20;
    
    doc.setFontSize(12);
    doc.setFont(undefined, "bold");
    doc.text("Análise Nota Fiscal Cidadã", 20, yPosition);
    
    yPosition += 8;
    
    const nfcRows = [
      ["Receitas NFC", formatCurrency(data.nfcAnalysis.totalRevenue)],
      ["Aplicação em Projeto (70%)", formatCurrency(data.nfcAnalysis.project70)],
      ["Percentual Projeto", `${data.nfcAnalysis.project70Percent.toFixed(1)}%`],
      ["Aplicação em Custeio (30%)", formatCurrency(data.nfcAnalysis.operating30)],
      ["Percentual Custeio", `${data.nfcAnalysis.operating30Percent.toFixed(1)}%`],
      [
        "Status",
        data.nfcAnalysis.compliant ? "✓ Conforme" : "⚠ Fora da proporção esperada",
      ],
    ];
    
    doc.autoTable({
      startY: yPosition,
      body: nfcRows,
      theme: "grid",
      margin: { left: 20, right: 20 },
      styles: {
        fillColor: data.nfcAnalysis.compliant ? [34, 197, 94, 0.1] : [251, 191, 36, 0.1],
      },
    });
  }
  
  // ===== GRÁFICOS =====
  doc.addPage();
  yPosition = 20;
  
  doc.setFontSize(12);
  doc.setFont(undefined, "bold");
  doc.text("Visualizações", 20, yPosition);
  
  // Gerar gráfico de pizza (Receitas vs Despesas)
  const chartCanvas = document.createElement("canvas");
  chartCanvas.width = 400;
  chartCanvas.height = 400;
  
  const chart = new Chart(chartCanvas, {
    type: "pie",
    data: {
      labels: ["Receitas", "Despesas"],
      datasets: [{
        data: [data.balance.revenues / 100, data.balance.expenses / 100],
        backgroundColor: ["#22C55E", "#EF4444"],
      }],
    },
    options: {
      responsive: false,
      plugins: {
        legend: {
          position: "bottom",
        },
        title: {
          display: true,
          text: "Receitas vs Despesas",
        },
      },
    },
  });
  
  // Converter canvas para imagem
  const chartImage = chartCanvas.toDataURL("image/png");
  doc.addImage(chartImage, "PNG", 55, yPosition + 10, 100, 100);
  
  // ===== RODAPÉ =====
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont(undefined, "normal");
    doc.text(
      `Página ${i} de ${pageCount}`,
      105,
      290,
      { align: "center" }
    );
    doc.text(
      `Gerado pelo Sistema de Gestão Financeira - ${data.organization.name}`,
      105,
      285,
      { align: "center" }
    );
  }
  
  // Converter para buffer
  const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
  
  return pdfBuffer;
}
```

---

## 3. RELATÓRIO NOTA FISCAL CIDADÃ

### 3.1 Estrutura Específica

**Seções Obrigatórias:**
1. Identificação da Entidade
2. Período de Referência
3. Total de Recursos Recebidos
4. Demonstrativo de Aplicação
   - 70% Projeto (detalhamento)
   - 30% Custeio (detalhamento)
5. Comprovação de Conformidade
6. Anexos (comprovantes)

### 3.2 Análise de Conformidade

```typescript
async function analyzeNfcCompliance(periodId: number): Promise<{
  totalRevenue: number;
  project70: number;
  operating30: number;
  project70Percent: number;
  operating30Percent: number;
  compliant: boolean;
  message: string;
  details: {
    projectEntries: Entry[];
    operatingEntries: Entry[];
  };
}> {
  // Buscar receitas NFC
  const nfcRevenues = await getEntries({
    periodId,
    isNfc: true,
    type: "credit",
  });
  
  const totalRevenue = sumEntries(nfcRevenues);
  
  // Buscar despesas NFC
  const nfcExpenses = await getEntries({
    periodId,
    isNfc: true,
    type: "debit",
  });
  
  const projectEntries = nfcExpenses.filter(e => e.nfcCategory === "project_70");
  const operatingEntries = nfcExpenses.filter(e => e.nfcCategory === "operating_30");
  
  const project70 = sumEntries(projectEntries);
  const operating30 = sumEntries(operatingEntries);
  
  const totalExpenses = project70 + operating30;
  
  if (totalExpenses === 0) {
    return {
      totalRevenue,
      project70: 0,
      operating30: 0,
      project70Percent: 0,
      operating30Percent: 0,
      compliant: true,
      message: "Nenhuma despesa NFC registrada neste período",
      details: {
        projectEntries: [],
        operatingEntries: [],
      },
    };
  }
  
  const project70Percent = (project70 / totalExpenses) * 100;
  const operating30Percent = (operating30 / totalExpenses) * 100;
  
  // Tolerância de 5% para variação
  const compliant = project70Percent >= 65 && project70Percent <= 75;
  
  const message = compliant
    ? "✓ Aplicação de recursos conforme legislação (70% projeto / 30% custeio)"
    : `⚠ ATENÇÃO: Proporção fora do esperado. Projeto: ${project70Percent.toFixed(1)}%, Custeio: ${operating30Percent.toFixed(1)}%`;
  
  return {
    totalRevenue,
    project70,
    operating30,
    project70Percent,
    operating30Percent,
    compliant,
    message,
    details: {
      projectEntries,
      operatingEntries,
    },
  };
}
```

### 3.3 Geração de Relatório NFC

```typescript
async function generateNfcComplianceReport(periodId: number): Promise<Buffer> {
  const period = await getPeriodById(periodId);
  const organization = await getOrganizationSettings();
  const analysis = await analyzeNfcCompliance(periodId);
  
  const doc = new jsPDF();
  let yPosition = 20;
  
  // ===== CABEÇALHO =====
  doc.setFontSize(16);
  doc.setFont(undefined, "bold");
  doc.text("RELATÓRIO DE PRESTAÇÃO DE CONTAS", 105, yPosition, { align: "center" });
  
  yPosition += 8;
  doc.setFontSize(14);
  doc.text("PROGRAMA NOTA FISCAL CIDADÃ", 105, yPosition, { align: "center" });
  
  yPosition += 15;
  doc.setFontSize(12);
  doc.setFont(undefined, "normal");
  doc.text(organization.name, 105, yPosition, { align: "center" });
  
  yPosition += 6;
  doc.setFontSize(10);
  doc.text(`CNPJ: ${organization.cnpj}`, 105, yPosition, { align: "center" });
  
  yPosition += 6;
  doc.text(organization.address || "", 105, yPosition, { align: "center" });
  
  yPosition += 10;
  doc.setFont(undefined, "bold");
  doc.text(
    `Período: ${formatPeriod(period.month, period.year)}`,
    105,
    yPosition,
    { align: "center" }
  );
  
  yPosition += 15;
  
  // ===== SUMÁRIO =====
  doc.setFontSize(12);
  doc.setFont(undefined, "bold");
  doc.text("1. SUMÁRIO EXECUTIVO", 20, yPosition);
  
  yPosition += 10;
  
  const summaryData = [
    ["Total de Recursos Recebidos (NFC)", formatCurrency(analysis.totalRevenue)],
    ["Total Aplicado em Projeto (70%)", formatCurrency(analysis.project70)],
    ["Total Aplicado em Custeio (30%)", formatCurrency(analysis.operating30)],
    ["Saldo Não Aplicado", formatCurrency(analysis.totalRevenue - analysis.project70 - analysis.operating30)],
  ];
  
  doc.autoTable({
    startY: yPosition,
    body: summaryData,
    theme: "grid",
    margin: { left: 20, right: 20 },
    styles: { fontSize: 10 },
  });
  
  yPosition = (doc as any).lastAutoTable.finalY + 15;
  
  // ===== DEMONSTRATIVO DE APLICAÇÃO =====
  doc.setFontSize(12);
  doc.setFont(undefined, "bold");
  doc.text("2. DEMONSTRATIVO DE APLICAÇÃO DE RECURSOS", 20, yPosition);
  
  yPosition += 10;
  
  // 70% Projeto
  doc.setFontSize(11);
  doc.text("2.1. Aplicação em Projeto (70%)", 20, yPosition);
  
  yPosition += 8;
  
  const projectRows = analysis.details.projectEntries.map(entry => [
    formatDate(entry.transactionDate),
    entry.description,
    entry.account.name,
    formatCurrency(entry.amountCents),
  ]);
  
  doc.autoTable({
    startY: yPosition,
    head: [["Data", "Descrição", "Conta", "Valor"]],
    body: projectRows,
    theme: "striped",
    headStyles: { fillColor: [147, 51, 234] },
    margin: { left: 20, right: 20 },
    foot: [["", "", "TOTAL", formatCurrency(analysis.project70)]],
    footStyles: { fillColor: [147, 51, 234], fontStyle: "bold" },
  });
  
  yPosition = (doc as any).lastAutoTable.finalY + 15;
  
  // 30% Custeio
  if (yPosition > 250) {
    doc.addPage();
    yPosition = 20;
  }
  
  doc.setFontSize(11);
  doc.setFont(undefined, "bold");
  doc.text("2.2. Aplicação em Custeio (30%)", 20, yPosition);
  
  yPosition += 8;
  
  const operatingRows = analysis.details.operatingEntries.map(entry => [
    formatDate(entry.transactionDate),
    entry.description,
    entry.account.name,
    formatCurrency(entry.amountCents),
  ]);
  
  doc.autoTable({
    startY: yPosition,
    head: [["Data", "Descrição", "Conta", "Valor"]],
    body: operatingRows,
    theme: "striped",
    headStyles: { fillColor: [251, 191, 36] },
    margin: { left: 20, right: 20 },
    foot: [["", "", "TOTAL", formatCurrency(analysis.operating30)]],
    footStyles: { fillColor: [251, 191, 36], fontStyle: "bold" },
  });
  
  // ===== COMPROVAÇÃO DE CONFORMIDADE =====
  doc.addPage();
  yPosition = 20;
  
  doc.setFontSize(12);
  doc.setFont(undefined, "bold");
  doc.text("3. COMPROVAÇÃO DE CONFORMIDADE", 20, yPosition);
  
  yPosition += 10;
  
  const complianceData = [
    ["Percentual Aplicado em Projeto", `${analysis.project70Percent.toFixed(2)}%`],
    ["Meta Mínima (Projeto)", "70%"],
    ["Percentual Aplicado em Custeio", `${analysis.operating30Percent.toFixed(2)}%`],
    ["Meta Máxima (Custeio)", "30%"],
    ["Status de Conformidade", analysis.compliant ? "✓ CONFORME" : "⚠ NÃO CONFORME"],
  ];
  
  doc.autoTable({
    startY: yPosition,
    body: complianceData,
    theme: "grid",
    margin: { left: 20, right: 20 },
    styles: {
      fillColor: analysis.compliant ? [34, 197, 94, 0.1] : [239, 68, 68, 0.1],
    },
  });
  
  yPosition = (doc as any).lastAutoTable.finalY + 15;
  
  // ===== DECLARAÇÃO =====
  doc.setFontSize(10);
  doc.setFont(undefined, "normal");
  
  const declaration = `Declaramos, para os devidos fins, que os recursos recebidos através do Programa Nota Fiscal Cidadã foram aplicados conforme o projeto cadastrado junto à Secretaria da Fazenda, respeitando a proporção mínima de 70% em investimentos/projeto e máxima de 30% em custeio operacional, conforme determina a legislação vigente.`;
  
  const splitDeclaration = doc.splitTextToSize(declaration, 170);
  doc.text(splitDeclaration, 20, yPosition);
  
  yPosition += splitDeclaration.length * 5 + 20;
  
  // ===== ASSINATURAS =====
  doc.text("_".repeat(50), 30, yPosition);
  doc.text("_".repeat(50), 110, yPosition);
  
  yPosition += 6;
  doc.text("Responsável Legal", 30, yPosition);
  doc.text("Contador Responsável", 110, yPosition);
  
  yPosition += 4;
  doc.setFontSize(8);
  doc.text(`${organization.name}`, 30, yPosition);
  doc.text(`CRC: _______________`, 110, yPosition);
  
  // ===== RODAPÉ =====
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(
      `Relatório Nota Fiscal Cidadã - ${formatPeriod(period.month, period.year)}`,
      105,
      285,
      { align: "center" }
    );
    doc.text(
      `Página ${i} de ${pageCount}`,
      105,
      290,
      { align: "center" }
    );
  }
  
  const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
  
  return pdfBuffer;
}
```

---

## 4. BALANCETE MENSAL

### 4.1 Estrutura

**Colunas:**
1. Código da Conta
2. Nome da Conta
3. Saldo Anterior
4. Débitos do Período
5. Créditos do Período
6. Saldo Atual

### 4.2 Implementação

```typescript
interface BalanceteRow {
  account: Account;
  previousBalance: number;
  debits: number;
  credits: number;
  currentBalance: number;
}

async function generateBalancete(periodId: number): Promise<Buffer> {
  const period = await getPeriodById(periodId);
  const organization = await getOrganizationSettings();
  
  // Buscar todas as contas analíticas
  const accounts = await getAccounts({ active: true });
  const analyticAccounts = accounts.filter(acc => !hasChildren(acc.id));
  
  // Calcular saldos para cada conta
  const rows: BalanceteRow[] = [];
  
  for (const account of analyticAccounts) {
    // Saldo anterior (até mês anterior)
    const previousBalance = await calculateAccountBalance(
      account.id,
      period.year,
      period.month - 1
    );
    
    // Movimentação do período
    const entries = await getEntries({
      periodId,
      accountId: account.id,
    });
    
    const debits = entries
      .filter(e => e.type === "debit")
      .reduce((sum, e) => sum + e.amountCents, 0);
    
    const credits = entries
      .filter(e => e.type === "credit")
      .reduce((sum, e) => sum + e.amountCents, 0);
    
    // Saldo atual
    const currentBalance = calculateBalance(account, previousBalance, debits, credits);
    
    // Incluir apenas contas com movimentação ou saldo
    if (previousBalance !== 0 || debits !== 0 || credits !== 0 || currentBalance !== 0) {
      rows.push({
        account,
        previousBalance,
        debits,
        credits,
        currentBalance,
      });
    }
  }
  
  // Ordenar por código
  rows.sort((a, b) => a.account.code.localeCompare(b.account.code));
  
  // Gerar PDF
  const doc = new jsPDF("landscape");
  let yPosition = 20;
  
  // Cabeçalho
  doc.setFontSize(16);
  doc.setFont(undefined, "bold");
  doc.text(organization.name, 148, yPosition, { align: "center" });
  
  yPosition += 8;
  doc.setFontSize(14);
  doc.text(
    `Balancete Mensal - ${formatPeriod(period.month, period.year)}`,
    148,
    yPosition,
    { align: "center" }
  );
  
  yPosition += 15;
  
  // Tabela
  const tableRows = rows.map(row => [
    row.account.code,
    row.account.name,
    formatCurrency(row.previousBalance),
    formatCurrency(row.debits),
    formatCurrency(row.credits),
    formatCurrency(row.currentBalance),
  ]);
  
  doc.autoTable({
    startY: yPosition,
    head: [["Código", "Conta", "Saldo Anterior", "Débitos", "Créditos", "Saldo Atual"]],
    body: tableRows,
    theme: "grid",
    headStyles: { fillColor: [59, 130, 246] },
    styles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 80 },
      2: { cellWidth: 30, halign: "right" },
      3: { cellWidth: 30, halign: "right" },
      4: { cellWidth: 30, halign: "right" },
      5: { cellWidth: 30, halign: "right" },
    },
  });
  
  // Totais
  const totalDebits = rows.reduce((sum, row) => sum + row.debits, 0);
  const totalCredits = rows.reduce((sum, row) => sum + row.credits, 0);
  
  yPosition = (doc as any).lastAutoTable.finalY + 10;
  
  doc.setFontSize(10);
  doc.setFont(undefined, "bold");
  doc.text(`Total de Débitos: ${formatCurrency(totalDebits)}`, 20, yPosition);
  doc.text(`Total de Créditos: ${formatCurrency(totalCredits)}`, 150, yPosition);
  
  const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
  
  return pdfBuffer;
}

function calculateBalance(
  account: Account,
  previousBalance: number,
  debits: number,
  credits: number
): number {
  if (account.type === "asset" || account.type === "expense" || account.type === "fixed_asset") {
    // Natureza devedora
    return previousBalance + debits - credits;
  } else {
    // Natureza credora
    return previousBalance + credits - debits;
  }
}
```

---

## 5. DEMONSTRAÇÕES CONTÁBEIS ANUAIS

### 5.1 Demonstração do Resultado do Período (DRP)

**Estrutura ITG 2002:**
```
DEMONSTRAÇÃO DO RESULTADO DO PERÍODO
Exercício findo em 31/12/XXXX

RECEITAS
  Doações e Contribuições                    R$ XXX.XXX,XX
  Subvenções Governamentais                  R$ XXX.XXX,XX
  Receitas Financeiras                       R$ XXX.XXX,XX
  Outras Receitas                            R$ XXX.XXX,XX
TOTAL DAS RECEITAS                           R$ XXX.XXX,XX

DESPESAS
  Despesas com Pessoal                       R$ XXX.XXX,XX
  Despesas Operacionais                      R$ XXX.XXX,XX
  Despesas Administrativas                   R$ XXX.XXX,XX
  Despesas Financeiras                       R$ XXX.XXX,XX
TOTAL DAS DESPESAS                           R$ XXX.XXX,XX

SUPERÁVIT/DÉFICIT DO PERÍODO                 R$ XXX.XXX,XX
```

### 5.2 Balanço Patrimonial

**Estrutura ITG 2002:**
```
BALANÇO PATRIMONIAL
Em 31/12/XXXX

ATIVO
  ATIVO CIRCULANTE
    Disponibilidades                         R$ XXX.XXX,XX
    Créditos a Receber                       R$ XXX.XXX,XX
  ATIVO NÃO CIRCULANTE
    Imobilizado                              R$ XXX.XXX,XX
    (-) Depreciação Acumulada                R$ (XXX.XXX,XX)
TOTAL DO ATIVO                               R$ XXX.XXX,XX

PASSIVO
  PASSIVO CIRCULANTE
    Obrigações Trabalhistas                  R$ XXX.XXX,XX
    Fornecedores                             R$ XXX.XXX,XX
  PASSIVO NÃO CIRCULANTE
    Obrigações de Longo Prazo                R$ XXX.XXX,XX
TOTAL DO PASSIVO                             R$ XXX.XXX,XX

PATRIMÔNIO SOCIAL
  Patrimônio Social Inicial                  R$ XXX.XXX,XX
  Superávit/Déficit Acumulado                R$ XXX.XXX,XX
  Superávit/Déficit do Exercício             R$ XXX.XXX,XX
TOTAL DO PATRIMÔNIO SOCIAL                   R$ XXX.XXX,XX

TOTAL DO PASSIVO + PATRIMÔNIO SOCIAL         R$ XXX.XXX,XX
```

### 5.3 Demonstração dos Fluxos de Caixa (DFC)

**Método Direto (Recomendado ITG 2002):**
```
DEMONSTRAÇÃO DOS FLUXOS DE CAIXA
Exercício findo em 31/12/XXXX

FLUXOS DE CAIXA DAS ATIVIDADES OPERACIONAIS
  Recebimentos de Doações                    R$ XXX.XXX,XX
  Recebimentos de Subvenções                 R$ XXX.XXX,XX
  Pagamentos a Fornecedores                  R$ (XXX.XXX,XX)
  Pagamentos de Salários                     R$ (XXX.XXX,XX)
CAIXA LÍQUIDO DAS ATIVIDADES OPERACIONAIS    R$ XXX.XXX,XX

FLUXOS DE CAIXA DAS ATIVIDADES DE INVESTIMENTO
  Aquisição de Imobilizado                   R$ (XXX.XXX,XX)
CAIXA LÍQUIDO DAS ATIVIDADES DE INVESTIMENTO R$ (XXX.XXX,XX)

AUMENTO/DIMINUIÇÃO DE CAIXA                  R$ XXX.XXX,XX
Caixa no Início do Período                   R$ XXX.XXX,XX
Caixa no Final do Período                    R$ XXX.XXX,XX
```

---

## 6. INTERFACE DE GERAÇÃO

### 6.1 Seleção de Relatório

```tsx
function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  
  const reports = [
    {
      id: "financial_monthly",
      title: "Relatório Financeiro Mensal",
      description: "Demonstrativo completo de receitas, despesas, balanço e saldos bancários",
      icon: FileBarChart,
      color: "blue",
    },
    {
      id: "nfc_compliance",
      title: "Relatório Nota Fiscal Cidadã",
      description: "Demonstrativo de aplicação de recursos (70% projeto / 30% custeio)",
      icon: FileCheck,
      color: "purple",
    },
    {
      id: "balancete",
      title: "Balancete Mensal",
      description: "Saldos de todas as contas no período",
      icon: FileSpreadsheet,
      color: "green",
    },
  ];
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Relatórios</h1>
          <p className="text-muted-foreground">
            Gere relatórios contábeis e de compliance
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reports.map((report) => (
            <Card
              key={report.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => {
                setSelectedReport(report.id);
                setIsConfigOpen(true);
              }}
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-lg bg-${report.color}-100`}>
                    <report.icon className={`h-6 w-6 text-${report.color}-600`} />
                  </div>
                  <CardTitle className="text-lg">{report.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {report.description}
                </p>
              </CardContent>
              <CardFooter>
                <Button className="w-full">
                  Gerar PDF
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
      
      {selectedReport && (
        <ReportConfigDialog
          reportId={selectedReport}
          open={isConfigOpen}
          onOpenChange={setIsConfigOpen}
        />
      )}
    </DashboardLayout>
  );
}
```

### 6.2 Dialog de Configuração

```tsx
function ReportConfigDialog({
  reportId,
  open,
  onOpenChange,
}: {
  reportId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [periodType, setPeriodType] = useState<"month" | "quarter" | "year">("month");
  const [selectedPeriod, setSelectedPeriod] = useState<number | null>(null);
  const [includeCharts, setIncludeCharts] = useState(true);
  
  const generateMutation = trpc.reports.generate.useMutation({
    onSuccess: (data) => {
      // Abrir PDF em nova aba
      window.open(data.url, "_blank");
      toast.success("Relatório gerado com sucesso!");
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error("Erro ao gerar relatório", {
        description: error.message,
      });
    },
  });
  
  const handleGenerate = () => {
    if (!selectedPeriod) {
      toast.error("Selecione um período");
      return;
    }
    
    generateMutation.mutate({
      reportId,
      periodId: selectedPeriod,
      options: {
        includeCharts,
      },
    });
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configurar Relatório</DialogTitle>
          <DialogDescription>
            Selecione o período e as opções desejadas
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label>Tipo de Período</Label>
            <RadioGroup value={periodType} onValueChange={(v) => setPeriodType(v as any)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="month" id="month" />
                <Label htmlFor="month">Mês específico</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="quarter" id="quarter" />
                <Label htmlFor="quarter">Trimestre</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="year" id="year" />
                <Label htmlFor="year">Ano completo</Label>
              </div>
            </RadioGroup>
          </div>
          
          <div>
            <Label>Período</Label>
            <PeriodSelect
              type={periodType}
              value={selectedPeriod}
              onChange={setSelectedPeriod}
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="include-charts"
              checked={includeCharts}
              onCheckedChange={(checked) => setIncludeCharts(checked as boolean)}
            />
            <Label htmlFor="include-charts">
              Incluir gráficos e visualizações
            </Label>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={generateMutation.isPending}
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                Gerar PDF
                <FileDown className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

## 7. OTIMIZAÇÕES E BOAS PRÁTICAS

### 7.1 Cache de Relatórios

```typescript
// Cache de relatórios gerados (evitar regeneração desnecessária)
const reportCache = new Map<string, { url: string; expiresAt: number }>();

async function generateOrGetCachedReport(
  reportId: string,
  periodId: number,
  options: any
): Promise<{ url: string }> {
  const cacheKey = `${reportId}-${periodId}-${JSON.stringify(options)}`;
  const cached = reportCache.get(cacheKey);
  
  // Cache válido por 1 hora
  if (cached && cached.expiresAt > Date.now()) {
    return { url: cached.url };
  }
  
  // Gerar novo relatório
  const pdfBuffer = await generateReport(reportId, periodId, options);
  
  // Upload para S3
  const fileKey = `reports/${reportId}-${periodId}-${Date.now()}.pdf`;
  const { url } = await storagePut(fileKey, pdfBuffer, "application/pdf");
  
  // Cachear
  reportCache.set(cacheKey, {
    url,
    expiresAt: Date.now() + 60 * 60 * 1000, // 1 hora
  });
  
  return { url };
}
```

### 7.2 Geração Assíncrona

```typescript
// Para relatórios grandes, gerar de forma assíncrona
async function generateReportAsync(
  reportId: string,
  periodId: number,
  userId: number
): Promise<{ jobId: string }> {
  const jobId = nanoid();
  
  // Criar job
  await createJob({
    id: jobId,
    type: "report_generation",
    status: "pending",
    data: { reportId, periodId, userId },
  });
  
  // Processar em background
  processReportJob(jobId).catch(error => {
    console.error("[Report Job] Failed:", error);
    updateJob(jobId, { status: "failed", error: error.message });
  });
  
  return { jobId };
}

async function processReportJob(jobId: string): Promise<void> {
  const job = await getJob(jobId);
  
  await updateJob(jobId, { status: "processing" });
  
  try {
    const { reportId, periodId, userId } = job.data;
    
    // Gerar relatório
    const pdfBuffer = await generateReport(reportId, periodId, {});
    
    // Upload para S3
    const fileKey = `reports/${reportId}-${periodId}-${Date.now()}.pdf`;
    const { url } = await storagePut(fileKey, pdfBuffer, "application/pdf");
    
    // Atualizar job
    await updateJob(jobId, {
      status: "completed",
      result: { url },
    });
    
    // Notificar usuário
    await notifyUser(userId, {
      title: "Relatório gerado",
      message: "Seu relatório está pronto para download",
      url,
    });
  } catch (error) {
    await updateJob(jobId, {
      status: "failed",
      error: error.message,
    });
    throw error;
  }
}
```

### 7.3 Validação de Dados

```typescript
// Validar dados antes de gerar relatório
async function validateReportData(periodId: number): Promise<{
  valid: boolean;
  warnings: string[];
  errors: string[];
}> {
  const warnings: string[] = [];
  const errors: string[] = [];
  
  const period = await getPeriodById(periodId);
  
  // Validar período fechado
  if (period.status !== "closed") {
    warnings.push("Período ainda não está fechado. Os dados podem estar incompletos.");
  }
  
  // Validar lançamentos classificados
  const unclassified = await getUnclassifiedEntries(periodId);
  if (unclassified.length > 0) {
    warnings.push(`Existem ${unclassified.length} lançamentos não classificados.`);
  }
  
  // Validar saldo bancário
  const bankBalance = await calculateTotalBankBalance(periodId);
  if (bankBalance < 0) {
    errors.push("Saldo bancário negativo detectado. Verifique os lançamentos.");
  }
  
  // Validar proporção NFC (se aplicável)
  const nfcValidation = await validateNfcProportion(periodId);
  if (!nfcValidation.valid && nfcValidation.totalNfcExpenses > 0) {
    warnings.push(nfcValidation.message);
  }
  
  return {
    valid: errors.length === 0,
    warnings,
    errors,
  };
}
```

---

**Documento elaborado em:** Dezembro 2024  
**Versão:** 1.0  
**Autor:** Manus AI  
**Base Normativa:** ITG 2002 (R1), NBC T 3, Legislação NFC
