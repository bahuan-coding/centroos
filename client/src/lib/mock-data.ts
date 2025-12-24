/**
 * Mock data fixtures for multi-tenant testing
 * Contains realistic data for both Paycubed and Demo organizations
 */

// Organization IDs
export const ORG_IDS = {
  PAYCUBED: '4408ed21-65d4-44b9-95fa-b537851e9b99',
  DEMO: 'demo-org-00000000-0000-0000-0000-000000000002',
} as const;

// Dashboard KPIs by organization
export const DASHBOARD_DATA = {
  [ORG_IDS.PAYCUBED]: {
    totalReceitas: 284500.0,
    totalDespesas: 156200.0,
    saldoContas: 428300.0,
    titulosVencer: 12,
    titulosVencidos: 3,
    receitasMes: [42000, 38500, 45200, 51000, 48300, 59500],
    despesasMes: [28000, 25500, 32100, 29800, 26400, 34400],
    meses: ['Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
  },
  [ORG_IDS.DEMO]: {
    totalReceitas: 45800.0,
    totalDespesas: 32100.0,
    saldoContas: 18700.0,
    titulosVencer: 8,
    titulosVencidos: 1,
    receitasMes: [7200, 6800, 8100, 7500, 8200, 8000],
    despesasMes: [5100, 4800, 5600, 5200, 5900, 5500],
    meses: ['Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
  },
};

// Financial Accounts by organization
export const FINANCIAL_ACCOUNTS_DATA = {
  [ORG_IDS.PAYCUBED]: [
    { id: 'fa-1', nome: 'Conta Corrente Itaú', tipo: 'conta_corrente', banco: 'Itaú', saldo: 185420.50, ativo: true },
    { id: 'fa-2', nome: 'Conta Corrente Bradesco', tipo: 'conta_corrente', banco: 'Bradesco', saldo: 92340.00, ativo: true },
    { id: 'fa-3', nome: 'Caixa Pequeno', tipo: 'caixa', banco: null, saldo: 3500.00, ativo: true },
    { id: 'fa-4', nome: 'Aplicação CDB', tipo: 'aplicacao', banco: 'Itaú', saldo: 147039.50, ativo: true },
  ],
  [ORG_IDS.DEMO]: [
    { id: 'fa-d1', nome: 'Conta Corrente BB', tipo: 'conta_corrente', banco: 'Banco do Brasil', saldo: 12450.00, ativo: true },
    { id: 'fa-d2', nome: 'Caixa da Tesouraria', tipo: 'caixa', banco: null, saldo: 1850.00, ativo: true },
    { id: 'fa-d3', nome: 'Poupança', tipo: 'poupanca', banco: 'Caixa', saldo: 4400.00, ativo: true },
  ],
};

// Chart of Accounts by organization
export const CHART_OF_ACCOUNTS_DATA = {
  [ORG_IDS.PAYCUBED]: [
    { id: 'coa-1', codigo: '1', nome: 'ATIVO', tipo: 'ativo', nivel: 1, classificacao: 'sintetica' },
    { id: 'coa-2', codigo: '1.1', nome: 'ATIVO CIRCULANTE', tipo: 'ativo', nivel: 2, classificacao: 'sintetica' },
    { id: 'coa-3', codigo: '1.1.1', nome: 'Caixa e Equivalentes', tipo: 'ativo', nivel: 3, classificacao: 'sintetica' },
    { id: 'coa-4', codigo: '1.1.1.01', nome: 'Caixa Geral', tipo: 'ativo', nivel: 4, classificacao: 'analitica' },
    { id: 'coa-5', codigo: '1.1.1.02', nome: 'Bancos c/ Movimento', tipo: 'ativo', nivel: 4, classificacao: 'analitica' },
    { id: 'coa-6', codigo: '3', nome: 'RECEITAS', tipo: 'receita', nivel: 1, classificacao: 'sintetica' },
    { id: 'coa-7', codigo: '3.1', nome: 'RECEITAS OPERACIONAIS', tipo: 'receita', nivel: 2, classificacao: 'sintetica' },
    { id: 'coa-8', codigo: '3.1.1', nome: 'Receitas de Serviços', tipo: 'receita', nivel: 3, classificacao: 'analitica' },
    { id: 'coa-9', codigo: '4', nome: 'DESPESAS', tipo: 'despesa', nivel: 1, classificacao: 'sintetica' },
    { id: 'coa-10', codigo: '4.1', nome: 'DESPESAS OPERACIONAIS', tipo: 'despesa', nivel: 2, classificacao: 'sintetica' },
  ],
  [ORG_IDS.DEMO]: [
    { id: 'coa-d1', codigo: '1', nome: 'ATIVO', tipo: 'ativo', nivel: 1, classificacao: 'sintetica' },
    { id: 'coa-d2', codigo: '1.1', nome: 'ATIVO CIRCULANTE', tipo: 'ativo', nivel: 2, classificacao: 'sintetica' },
    { id: 'coa-d3', codigo: '1.1.1', nome: 'Disponível', tipo: 'ativo', nivel: 3, classificacao: 'sintetica' },
    { id: 'coa-d4', codigo: '1.1.1.01', nome: 'Caixa', tipo: 'ativo', nivel: 4, classificacao: 'analitica' },
    { id: 'coa-d5', codigo: '3', nome: 'RECEITAS', tipo: 'receita', nivel: 1, classificacao: 'sintetica' },
    { id: 'coa-d6', codigo: '3.1', nome: 'CONTRIBUIÇÕES', tipo: 'receita', nivel: 2, classificacao: 'sintetica' },
    { id: 'coa-d7', codigo: '3.1.1', nome: 'Contribuições de Associados', tipo: 'receita', nivel: 3, classificacao: 'analitica' },
    { id: 'coa-d8', codigo: '3.2', nome: 'DOAÇÕES', tipo: 'receita', nivel: 2, classificacao: 'sintetica' },
    { id: 'coa-d9', codigo: '3.2.1', nome: 'Doações Espontâneas', tipo: 'receita', nivel: 3, classificacao: 'analitica' },
  ],
};

// Receivables/Payables by organization
export const RECEIVABLES_PAYABLES_DATA = {
  [ORG_IDS.PAYCUBED]: [
    { id: 'rp-1', descricao: 'NF 12345 - Consultoria TI', tipo: 'receber', valor: 15000.00, vencimento: '2025-01-15', status: 'pendente', pessoa: 'TechCorp LTDA' },
    { id: 'rp-2', descricao: 'NF 12346 - Desenvolvimento', tipo: 'receber', valor: 28500.00, vencimento: '2025-01-20', status: 'pendente', pessoa: 'Innovate S.A.' },
    { id: 'rp-3', descricao: 'Aluguel Janeiro', tipo: 'pagar', valor: 8500.00, vencimento: '2025-01-05', status: 'pago', pessoa: 'Imobiliária Central' },
    { id: 'rp-4', descricao: 'Energia Elétrica', tipo: 'pagar', valor: 1250.00, vencimento: '2025-01-10', status: 'pendente', pessoa: 'Eletropaulo' },
    { id: 'rp-5', descricao: 'Internet/Telefonia', tipo: 'pagar', valor: 890.00, vencimento: '2025-01-12', status: 'pendente', pessoa: 'Vivo' },
  ],
  [ORG_IDS.DEMO]: [
    { id: 'rp-d1', descricao: 'Contribuição Janeiro - João Silva', tipo: 'receber', valor: 100.00, vencimento: '2025-01-10', status: 'pendente', pessoa: 'João Silva' },
    { id: 'rp-d2', descricao: 'Contribuição Janeiro - Maria Santos', tipo: 'receber', valor: 150.00, vencimento: '2025-01-10', status: 'pago', pessoa: 'Maria Santos' },
    { id: 'rp-d3', descricao: 'Doação Evento Natal', tipo: 'receber', valor: 2500.00, vencimento: '2024-12-25', status: 'pago', pessoa: 'Anônimo' },
    { id: 'rp-d4', descricao: 'Conta de Luz', tipo: 'pagar', valor: 450.00, vencimento: '2025-01-08', status: 'pendente', pessoa: 'CPFL' },
    { id: 'rp-d5', descricao: 'Água e Esgoto', tipo: 'pagar', valor: 180.00, vencimento: '2025-01-15', status: 'pendente', pessoa: 'SABESP' },
  ],
};

// Journal Entries by organization
export const JOURNAL_ENTRIES_DATA = {
  [ORG_IDS.PAYCUBED]: [
    { id: 'je-1', numero: 1001, data: '2024-12-01', descricao: 'Recebimento NF 12340', debito: 'Bancos c/ Movimento', credito: 'Receitas de Serviços', valor: 12500.00, status: 'lancado' },
    { id: 'je-2', numero: 1002, data: '2024-12-05', descricao: 'Pagamento Aluguel Dezembro', debito: 'Despesas com Ocupação', credito: 'Bancos c/ Movimento', valor: 8500.00, status: 'lancado' },
    { id: 'je-3', numero: 1003, data: '2024-12-10', descricao: 'Recebimento NF 12341', debito: 'Bancos c/ Movimento', credito: 'Receitas de Serviços', valor: 18000.00, status: 'lancado' },
  ],
  [ORG_IDS.DEMO]: [
    { id: 'je-d1', numero: 1, data: '2024-12-01', descricao: 'Contribuições Dezembro', debito: 'Caixa', credito: 'Contribuições de Associados', valor: 3200.00, status: 'lancado' },
    { id: 'je-d2', numero: 2, data: '2024-12-05', descricao: 'Pagamento Energia', debito: 'Despesas com Utilidades', credito: 'Caixa', valor: 420.00, status: 'lancado' },
    { id: 'je-d3', numero: 3, data: '2024-12-20', descricao: 'Doações Evento Natal', debito: 'Caixa', credito: 'Doações Espontâneas', valor: 2500.00, status: 'lancado' },
  ],
};

// Persons/Contacts by organization
export const PERSONS_DATA = {
  [ORG_IDS.PAYCUBED]: [
    { id: 'p-1', nome: 'TechCorp LTDA', tipo: 'juridica', documento: '12.345.678/0001-90', email: 'contato@techcorp.com', ativo: true },
    { id: 'p-2', nome: 'Innovate S.A.', tipo: 'juridica', documento: '98.765.432/0001-10', email: 'financeiro@innovate.com', ativo: true },
    { id: 'p-3', nome: 'Imobiliária Central', tipo: 'juridica', documento: '11.222.333/0001-44', email: 'cobranca@imobcentral.com', ativo: true },
    { id: 'p-4', nome: 'Carlos Mendes', tipo: 'fisica', documento: '123.456.789-00', email: 'carlos@email.com', ativo: true },
  ],
  [ORG_IDS.DEMO]: [
    { id: 'p-d1', nome: 'João Silva', tipo: 'fisica', documento: '111.222.333-44', email: 'joao@email.com', ativo: true },
    { id: 'p-d2', nome: 'Maria Santos', tipo: 'fisica', documento: '222.333.444-55', email: 'maria@email.com', ativo: true },
    { id: 'p-d3', nome: 'Pedro Oliveira', tipo: 'fisica', documento: '333.444.555-66', email: 'pedro@email.com', ativo: true },
    { id: 'p-d4', nome: 'Ana Costa', tipo: 'fisica', documento: '444.555.666-77', email: 'ana@email.com', ativo: false },
  ],
};

/**
 * Get mock data for a specific organization
 */
export function getMockData(orgId: string) {
  return {
    dashboard: DASHBOARD_DATA[orgId as keyof typeof DASHBOARD_DATA] || DASHBOARD_DATA[ORG_IDS.DEMO],
    financialAccounts: FINANCIAL_ACCOUNTS_DATA[orgId as keyof typeof FINANCIAL_ACCOUNTS_DATA] || [],
    chartOfAccounts: CHART_OF_ACCOUNTS_DATA[orgId as keyof typeof CHART_OF_ACCOUNTS_DATA] || [],
    receivablesPayables: RECEIVABLES_PAYABLES_DATA[orgId as keyof typeof RECEIVABLES_PAYABLES_DATA] || [],
    journalEntries: JOURNAL_ENTRIES_DATA[orgId as keyof typeof JOURNAL_ENTRIES_DATA] || [],
    persons: PERSONS_DATA[orgId as keyof typeof PERSONS_DATA] || [],
  };
}

/**
 * Simulate network latency (200-600ms)
 */
export function simulateLatency(): Promise<void> {
  const delay = 200 + Math.random() * 400;
  return new Promise((resolve) => setTimeout(resolve, delay));
}

/**
 * Simulate occasional errors (for testing error states)
 * Returns true if should error (5% chance by default)
 */
export function shouldSimulateError(errorRate = 0.05): boolean {
  return Math.random() < errorRate;
}





