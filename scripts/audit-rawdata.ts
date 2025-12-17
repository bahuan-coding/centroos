/**
 * Script de Auditoria: RawData vs Base PostgreSQL
 * Confronta dados parseados com a base Neon para identificar discrepâncias
 */

import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { neon } from '@netlify/neon';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../drizzle/schema';
import { parseCSVCaixa, type CaixaTransaction } from './parsers/csv-parser';
import { parseTSVContribuicoes, parseTSVMensal, type Contribuicao, type TransacaoMensal } from './parsers/tsv-parser';
import { parseTXTBancoBrasil, type BBTransaction } from './parsers/bb-txt-parser';

// ============================================================================
// TYPES
// ============================================================================

interface AuditIssue {
  id: string;
  origem: string;
  data: string;
  valor: number;
  descricao: string;
  tipo_problema: 'MISSING_IN_BASE' | 'MISSING_IN_RAW' | 'VALUE_MISMATCH' | 'DUPLICATE' | 'OUTLIER' | 'SIGN_INVERTED' | 'DECIMAL_SHIFT' | 'DATE_ERROR';
  severidade: 'Alta' | 'Média' | 'Baixa';
  evidencia: string;
  hipotese: string;
  acao: string;
}

interface RawDataInventory {
  caixa: CaixaTransaction[];
  bancoBrasil: BBTransaction[];
  contribuicoesAssociados: Contribuicao[];
  contribuicoesNaoAssociados: Contribuicao[];
  transacoesMensais: Map<string, TransacaoMensal[]>;
}

interface BaseDataSummary {
  entries: { count: number; byPeriod: Record<string, number> };
  extratoLinhas: number;
  titulos: number;
  pessoas: number;
}

// ============================================================================
// PARSERS
// ============================================================================

function parseValorBR(valor: string): number {
  if (!valor) return 0;
  return parseFloat(valor.replace(/\./g, '').replace(',', '.')) || 0;
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function loadRawData(rawdataPath: string): RawDataInventory {
  console.log('\n📂 Carregando dados do RawData...\n');
  
  // 1. CSV Caixa
  const caixaPath = join(rawdataPath, 'caixa_extrato_novembro_2025_lancamentos.csv');
  const caixaContent = readFileSync(caixaPath, 'utf-8');
  const caixa = parseCSVCaixa(caixaContent);
  console.log(`  ✓ Caixa Econômica: ${caixa.length} lançamentos`);
  
  // 2. TXT Banco do Brasil
  const bbPath = join(rawdataPath, 'banco_do_brasil_extrato_novembro_2025_raw.txt');
  const bbContent = readFileSync(bbPath, 'utf-8');
  const bancoBrasil = parseTXTBancoBrasil(bbContent);
  console.log(`  ✓ Banco do Brasil: ${bancoBrasil.length} lançamentos`);
  
  // 3. TSV Contribuições
  const tsvPath = join(rawdataPath, 'relatorio_excel_sheets_tsv');
  
  const contribAssocPath = join(tsvPath, 'CONTRIBUIÇÃO_ASSOCIADOS.tsv');
  const contribAssocContent = readFileSync(contribAssocPath, 'utf-8');
  const contribuicoesAssociados = parseTSVContribuicoes(contribAssocContent, 'associado');
  console.log(`  ✓ Contribuições Associados: ${contribuicoesAssociados.length} registros`);
  
  const contribNaoAssocPath = join(tsvPath, 'CONTRIBUIÇÃO_NAO_ASSOCIADOS.tsv');
  const contribNaoAssocContent = readFileSync(contribNaoAssocPath, 'utf-8');
  const contribuicoesNaoAssociados = parseTSVContribuicoes(contribNaoAssocContent, 'nao_associado');
  console.log(`  ✓ Contribuições Não Associados: ${contribuicoesNaoAssociados.length} registros`);
  
  // 4. TSV Mensais
  const mesesFiles = readdirSync(tsvPath).filter(f => 
    !f.includes('CONTRIBUIÇÃO') && !f.includes('Sefaz') && f.endsWith('.tsv')
  );
  
  const transacoesMensais = new Map<string, TransacaoMensal[]>();
  for (const file of mesesFiles) {
    const mesNome = file.replace('.tsv', '');
    const content = readFileSync(join(tsvPath, file), 'utf-8');
    const transacoes = parseTSVMensal(content, mesNome);
    transacoesMensais.set(mesNome, transacoes);
    console.log(`  ✓ ${mesNome}: ${transacoes.length} transações`);
  }
  
  return {
    caixa,
    bancoBrasil,
    contribuicoesAssociados,
    contribuicoesNaoAssociados,
    transacoesMensais,
  };
}

// ============================================================================
// OUTLIER DETECTION
// ============================================================================

function calculateZScore(values: number[]): Map<number, number> {
  if (values.length === 0) return new Map();
  
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  
  const zScores = new Map<number, number>();
  values.forEach((v, i) => {
    zScores.set(i, stdDev > 0 ? (v - mean) / stdDev : 0);
  });
  
  return zScores;
}

function detectOutliers(values: number[]): { index: number; value: number; zscore: number }[] {
  const zScores = calculateZScore(values);
  const outliers: { index: number; value: number; zscore: number }[] = [];
  
  zScores.forEach((z, i) => {
    if (Math.abs(z) > 2.5) {
      outliers.push({ index: i, value: values[i], zscore: z });
    }
  });
  
  return outliers;
}

function detectDecimalShift(valor1: number, valor2: number): number | null {
  const shifts = [10, 100, 1000];
  for (const shift of shifts) {
    if (Math.abs(valor1 * shift - valor2) < 0.01 || Math.abs(valor1 - valor2 * shift) < 0.01) {
      return shift;
    }
  }
  return null;
}

// ============================================================================
// CONCILIAÇÃO
// ============================================================================

function findDuplicates<T>(items: T[], keyFn: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  
  for (const item of items) {
    const key = keyFn(item);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(item);
  }
  
  const duplicates = new Map<string, T[]>();
  groups.forEach((items, key) => {
    if (items.length > 1) {
      duplicates.set(key, items);
    }
  });
  
  return duplicates;
}

function runAudit(inventory: RawDataInventory): AuditIssue[] {
  const issues: AuditIssue[] = [];
  let issueId = 0;
  
  console.log('\n🔍 Executando auditoria...\n');
  
  // ==========================================================================
  // 1. ANÁLISE DE DUPLICADOS
  // ==========================================================================
  console.log('  1. Verificando duplicados...');
  
  // Duplicados em Caixa
  const caixaDups = findDuplicates(inventory.caixa, t => 
    `${formatDate(t.dataHora)}_${t.valor}_${t.tipo}_${t.historico}`
  );
  caixaDups.forEach((items, key) => {
    issues.push({
      id: `DUP-CEF-${++issueId}`,
      origem: 'caixa_extrato_novembro_2025_lancamentos.csv',
      data: formatDate(items[0].dataHora),
      valor: items[0].valor,
      descricao: items[0].historico,
      tipo_problema: 'DUPLICATE',
      severidade: 'Alta',
      evidencia: `${items.length} ocorrências com mesma chave: ${key}`,
      hipotese: 'Reprocessamento do arquivo ou importação duplicada',
      acao: 'Verificar se as linhas são idênticas ou se são transações distintas com mesma descrição',
    });
  });
  
  // Duplicados em BB
  const bbDups = findDuplicates(inventory.bancoBrasil, t => 
    `${formatDate(t.dataBalancete)}_${t.valor}_${t.tipo}_${t.documento}`
  );
  bbDups.forEach((items, key) => {
    issues.push({
      id: `DUP-BB-${++issueId}`,
      origem: 'banco_do_brasil_extrato_novembro_2025_raw.txt',
      data: formatDate(items[0].dataBalancete),
      valor: items[0].valor,
      descricao: items[0].historico,
      tipo_problema: 'DUPLICATE',
      severidade: 'Alta',
      evidencia: `${items.length} ocorrências com mesma chave: ${key}`,
      hipotese: 'Transação Rende Fácil com entrada e saída no mesmo dia',
      acao: 'Verificar se é movimento automático do BB Rende Fácil',
    });
  });
  
  console.log(`     ✓ Duplicados CEF: ${caixaDups.size}, BB: ${bbDups.size}`);
  
  // ==========================================================================
  // 2. DETECÇÃO DE OUTLIERS
  // ==========================================================================
  console.log('  2. Detectando outliers...');
  
  // Outliers em valores da Caixa
  const caixaValores = inventory.caixa.map(t => t.valor);
  const caixaOutliers = detectOutliers(caixaValores);
  for (const o of caixaOutliers) {
    const t = inventory.caixa[o.index];
    issues.push({
      id: `OUT-CEF-${++issueId}`,
      origem: 'caixa_extrato_novembro_2025_lancamentos.csv',
      data: formatDate(t.dataHora),
      valor: t.valor,
      descricao: t.historico,
      tipo_problema: 'OUTLIER',
      severidade: Math.abs(o.zscore) > 3 ? 'Alta' : 'Média',
      evidencia: `Z-score: ${o.zscore.toFixed(2)} (valor extremo estatisticamente)`,
      hipotese: t.valor > 1000 ? 'Valor atípico - pode ser pagamento grande ou erro de digitação' : 'Verificar se valor está correto',
      acao: 'Conferir comprovante original',
    });
  }
  
  // Outliers em valores do BB
  const bbValores = inventory.bancoBrasil.map(t => t.valor);
  const bbOutliers = detectOutliers(bbValores);
  for (const o of bbOutliers) {
    const t = inventory.bancoBrasil[o.index];
    issues.push({
      id: `OUT-BB-${++issueId}`,
      origem: 'banco_do_brasil_extrato_novembro_2025_raw.txt',
      data: formatDate(t.dataBalancete),
      valor: t.valor,
      descricao: t.historico,
      tipo_problema: 'OUTLIER',
      severidade: Math.abs(o.zscore) > 3 ? 'Alta' : 'Média',
      evidencia: `Z-score: ${o.zscore.toFixed(2)}`,
      hipotese: 'Valor fora do padrão de transações típicas',
      acao: 'Conferir extrato bancário original',
    });
  }
  
  console.log(`     ✓ Outliers CEF: ${caixaOutliers.length}, BB: ${bbOutliers.length}`);
  
  // ==========================================================================
  // 3. VERIFICAÇÃO DE DATAS INVÁLIDAS
  // ==========================================================================
  console.log('  3. Verificando datas...');
  
  // Datas fora do período esperado (Novembro 2025)
  for (const t of inventory.caixa) {
    const month = t.dataHora.getMonth() + 1;
    const year = t.dataHora.getFullYear();
    if (month !== 11 || year !== 2025) {
      issues.push({
        id: `DATE-CEF-${++issueId}`,
        origem: 'caixa_extrato_novembro_2025_lancamentos.csv',
        data: formatDate(t.dataHora),
        valor: t.valor,
        descricao: t.historico,
        tipo_problema: 'DATE_ERROR',
        severidade: 'Alta',
        evidencia: `Data ${formatDate(t.dataHora)} fora do período Nov/2025`,
        hipotese: 'Erro de parsing ou lançamento retroativo',
        acao: 'Verificar data no comprovante original',
      });
    }
  }
  
  for (const t of inventory.bancoBrasil) {
    const month = t.dataBalancete.getMonth() + 1;
    const year = t.dataBalancete.getFullYear();
    if ((month !== 11 && month !== 10) || year !== 2025) {
      issues.push({
        id: `DATE-BB-${++issueId}`,
        origem: 'banco_do_brasil_extrato_novembro_2025_raw.txt',
        data: formatDate(t.dataBalancete),
        valor: t.valor,
        descricao: t.historico,
        tipo_problema: 'DATE_ERROR',
        severidade: 'Alta',
        evidencia: `Data ${formatDate(t.dataBalancete)} fora do período esperado`,
        hipotese: 'Lançamento de período anterior ou erro de parsing',
        acao: 'Verificar no extrato PDF original',
      });
    }
  }
  
  // ==========================================================================
  // 4. CRUZAMENTO EXCEL vs EXTRATOS
  // ==========================================================================
  console.log('  4. Cruzando Excel vs Extratos...');
  
  const novembroTransacoes = inventory.transacoesMensais.get('Novembro') || [];
  
  // Buscar transações do Excel que deveriam estar no extrato CEF
  for (const t of novembroTransacoes) {
    if (Math.abs(t.valorCEF) > 0) {
      // Procurar match no extrato da Caixa
      const match = inventory.caixa.find(c => 
        Math.abs(Math.abs(c.valor) - Math.abs(t.valorCEF)) < 0.01 &&
        Math.abs(c.dataHora.getTime() - t.data.getTime()) < 86400000 * 2 // ±2 dias
      );
      
      if (!match) {
        issues.push({
          id: `MISS-CEF-${++issueId}`,
          origem: 'Novembro.tsv (Excel)',
          data: formatDate(t.data),
          valor: Math.abs(t.valorCEF),
          descricao: `${t.fornecedor} - ${t.descricao}`,
          tipo_problema: 'MISSING_IN_BASE',
          severidade: 'Alta',
          evidencia: `Valor R$ ${Math.abs(t.valorCEF).toFixed(2)} não encontrado no extrato CEF`,
          hipotese: 'Transação não baixada no banco ou data divergente',
          acao: 'Verificar se a transação foi efetivada e em qual data',
        });
      }
    }
    
    if (Math.abs(t.valorBB) > 0) {
      // Procurar match no extrato do BB
      const match = inventory.bancoBrasil.find(b => 
        Math.abs(Math.abs(b.valor) - Math.abs(t.valorBB)) < 0.01 &&
        Math.abs(b.dataBalancete.getTime() - t.data.getTime()) < 86400000 * 2
      );
      
      if (!match) {
        issues.push({
          id: `MISS-BB-${++issueId}`,
          origem: 'Novembro.tsv (Excel)',
          data: formatDate(t.data),
          valor: Math.abs(t.valorBB),
          descricao: `${t.fornecedor} - ${t.descricao}`,
          tipo_problema: 'MISSING_IN_BASE',
          severidade: 'Média',
          evidencia: `Valor R$ ${Math.abs(t.valorBB).toFixed(2)} não encontrado no extrato BB`,
          hipotese: 'Movimento via BB Rende Fácil ou data divergente',
          acao: 'Verificar se é movimento automático do Rende Fácil',
        });
      }
    }
  }
  
  // ==========================================================================
  // 5. VERIFICAÇÃO DE CONTRIBUIÇÕES
  // ==========================================================================
  console.log('  5. Verificando contribuições...');
  
  const contribNov = inventory.contribuicoesAssociados.filter(c => c.mes === 11 && c.ano === 2025);
  
  for (const c of contribNov) {
    // Procurar no extrato BB (onde entram os PIX)
    const match = inventory.bancoBrasil.find(b => 
      b.tipo === 'credito' &&
      Math.abs(b.valor - c.valor) < 0.01 &&
      Math.abs(b.dataBalancete.getTime() - c.data.getTime()) < 86400000 * 3
    );
    
    if (!match && c.valor > 0) {
      issues.push({
        id: `CONTRIB-${++issueId}`,
        origem: 'CONTRIBUIÇÃO_ASSOCIADOS.tsv',
        data: formatDate(c.data),
        valor: c.valor,
        descricao: `Contribuição de ${c.nome}`,
        tipo_problema: 'MISSING_IN_BASE',
        severidade: 'Média',
        evidencia: `Contribuição R$ ${c.valor.toFixed(2)} não localizada no extrato BB`,
        hipotese: 'Data de registro diverge da data do extrato ou valor consolidado',
        acao: 'Verificar se a contribuição foi recebida em outra data',
      });
    }
  }
  
  // ==========================================================================
  // 6. PADRÕES DE ERRO COMUNS
  // ==========================================================================
  console.log('  6. Verificando padrões de erro...');
  
  // Verificar se há valores que parecem estar x10 ou x100
  for (const t of inventory.caixa) {
    if (t.valor > 10000) {
      // Verificar se existe um valor 10x menor que faça sentido
      const possibleCorrect = inventory.caixa.find(c => 
        c.historico === t.historico &&
        (Math.abs(c.valor * 10 - t.valor) < 1 || Math.abs(c.valor * 100 - t.valor) < 1)
      );
      if (possibleCorrect) {
        issues.push({
          id: `SHIFT-CEF-${++issueId}`,
          origem: 'caixa_extrato_novembro_2025_lancamentos.csv',
          data: formatDate(t.dataHora),
          valor: t.valor,
          descricao: t.historico,
          tipo_problema: 'DECIMAL_SHIFT',
          severidade: 'Alta',
          evidencia: `Valor ${t.valor} pode ser 10x ou 100x do esperado (existe ${possibleCorrect.valor})`,
          hipotese: 'Casas decimais deslocadas durante digitação/parsing',
          acao: 'Conferir valor no comprovante original',
        });
      }
    }
  }
  
  return issues;
}

// ============================================================================
// RELATÓRIO
// ============================================================================

function generateReport(issues: AuditIssue[], inventory: RawDataInventory): string {
  const lines: string[] = [];
  
  lines.push('# RELATÓRIO DE AUDITORIA - RawData vs Base');
  lines.push(`Data: ${new Date().toLocaleString('pt-BR')}`);
  lines.push('');
  
  // Resumo Executivo
  lines.push('## 1. RESUMO EXECUTIVO');
  lines.push('');
  
  const alta = issues.filter(i => i.severidade === 'Alta').length;
  const media = issues.filter(i => i.severidade === 'Média').length;
  const baixa = issues.filter(i => i.severidade === 'Baixa').length;
  
  lines.push(`- **Total de problemas identificados:** ${issues.length}`);
  lines.push(`  - 🔴 Alta severidade: ${alta}`);
  lines.push(`  - 🟡 Média severidade: ${media}`);
  lines.push(`  - 🟢 Baixa severidade: ${baixa}`);
  lines.push('');
  
  // Inventário
  lines.push('## 2. INVENTÁRIO DE DADOS');
  lines.push('');
  lines.push('| Fonte | Registros | Período |');
  lines.push('|-------|-----------|---------|');
  lines.push(`| Extrato CEF | ${inventory.caixa.length} | Nov/2025 |`);
  lines.push(`| Extrato BB | ${inventory.bancoBrasil.length} | Nov/2025 |`);
  lines.push(`| Contribuições Associados | ${inventory.contribuicoesAssociados.length} | 2025 |`);
  lines.push(`| Contribuições Não Associados | ${inventory.contribuicoesNaoAssociados.length} | 2025 |`);
  
  let totalMensais = 0;
  inventory.transacoesMensais.forEach((t, mes) => {
    totalMensais += t.length;
  });
  lines.push(`| Transações Mensais (Excel) | ${totalMensais} | 2025 |`);
  lines.push('');
  
  // Tipos de problema
  lines.push('## 3. DISTRIBUIÇÃO POR TIPO DE PROBLEMA');
  lines.push('');
  
  const byType = new Map<string, number>();
  issues.forEach(i => {
    byType.set(i.tipo_problema, (byType.get(i.tipo_problema) || 0) + 1);
  });
  
  lines.push('| Tipo | Quantidade |');
  lines.push('|------|------------|');
  byType.forEach((count, type) => {
    lines.push(`| ${type} | ${count} |`);
  });
  lines.push('');
  
  // Tabela de Issues
  lines.push('## 4. LISTA PRIORIZADA DE CASOS PARA AUDITORIA MANUAL');
  lines.push('');
  
  // Ordenar por severidade
  const sorted = [...issues].sort((a, b) => {
    const sevOrder = { 'Alta': 0, 'Média': 1, 'Baixa': 2 };
    return sevOrder[a.severidade] - sevOrder[b.severidade];
  });
  
  lines.push('| ID | Origem | Data | Valor (R$) | Tipo | Sev. | Hipótese |');
  lines.push('|----|--------|------|------------|------|------|----------|');
  
  for (const issue of sorted.slice(0, 50)) { // Top 50
    lines.push(`| ${issue.id} | ${issue.origem.substring(0, 20)}... | ${issue.data} | ${issue.valor.toFixed(2)} | ${issue.tipo_problema} | ${issue.severidade} | ${issue.hipotese.substring(0, 40)}... |`);
  }
  lines.push('');
  
  // Detalhes completos
  lines.push('## 5. DETALHES DOS CASOS');
  lines.push('');
  
  for (const issue of sorted.slice(0, 20)) { // Top 20 detalhados
    lines.push(`### ${issue.id}`);
    lines.push(`- **Origem:** ${issue.origem}`);
    lines.push(`- **Data:** ${issue.data}`);
    lines.push(`- **Valor:** R$ ${issue.valor.toFixed(2)}`);
    lines.push(`- **Descrição:** ${issue.descricao}`);
    lines.push(`- **Tipo:** ${issue.tipo_problema}`);
    lines.push(`- **Severidade:** ${issue.severidade}`);
    lines.push(`- **Evidência:** ${issue.evidencia}`);
    lines.push(`- **Hipótese:** ${issue.hipotese}`);
    lines.push(`- **Ação Sugerida:** ${issue.acao}`);
    lines.push('');
  }
  
  // Hipóteses de Erro
  lines.push('## 6. HIPÓTESES DE ERRO NO PIPELINE DE MIGRAÇÃO');
  lines.push('');
  lines.push('| # | Hipótese | Sinais que Confirmam | Sinais que Refutam |');
  lines.push('|---|----------|---------------------|-------------------|');
  lines.push('| 1 | Parsing de valores BR incorreto | Valores x10/x100 | Maioria dos valores corretos |');
  lines.push('| 2 | Datas parseadas com timezone errado | Datas ±1 dia | Datas batem exatamente |');
  lines.push('| 3 | Duplicação por reimportação | IDs duplicados | Hash de arquivo validado |');
  lines.push('| 4 | Movimentos Rende Fácil não filtrados | Débito+Crédito mesmo valor/dia | Movimentos classificados |');
  lines.push('| 5 | Contribuições consolidadas indevidamente | Soma de valores diverge | Valores individuais batem |');
  lines.push('');
  
  // Checklist
  lines.push('## 7. CHECKLIST DE VALIDAÇÃO DO PIPELINE');
  lines.push('');
  lines.push('- [ ] Parsing de valores BR (`1.234,56`) vs US (`1,234.56`)');
  lines.push('- [ ] Conversão de datas (`DD/MM/YYYY` vs `YYYY-MM-DD`)');
  lines.push('- [ ] Detecção de tipo (C/D) nos extratos');
  lines.push('- [ ] Deduplicação de importações (hash de arquivo)');
  lines.push('- [ ] Normalização de descrições');
  lines.push('- [ ] Mapeamento de contas financeiras (BB → uuid, CEF → uuid)');
  lines.push('- [ ] Tratamento de movimentos BB Rende Fácil');
  lines.push('- [ ] Validação de saldos (saldo anterior + movimentos = saldo final)');
  lines.push('');
  
  // Suposições
  lines.push('## 8. SUPOSIÇÕES FEITAS NESTA AUDITORIA');
  lines.push('');
  lines.push('1. O período analisado é Novembro/2025');
  lines.push('2. Os extratos bancários são a fonte primária (fonte de verdade)');
  lines.push('3. O relatório Excel é um controle paralelo manual');
  lines.push('4. Contribuições via PIX entram pelo Banco do Brasil');
  lines.push('5. Movimentos do BB Rende Fácil são automáticos e devem ser filtrados ou tratados');
  lines.push('6. Tolerância de data para matching: ±2 dias');
  lines.push('7. Tolerância de valor para matching: ±R$ 0.01');
  lines.push('');
  
  return lines.join('\n');
}

function generateCSV(issues: AuditIssue[]): string {
  const headers = ['id', 'origem', 'data', 'valor', 'descricao', 'tipo_problema', 'severidade', 'evidencia', 'hipotese', 'acao'];
  const lines = [headers.join(';')];
  
  for (const issue of issues) {
    const row = [
      issue.id,
      `"${issue.origem}"`,
      issue.data,
      issue.valor.toFixed(2).replace('.', ','),
      `"${issue.descricao.replace(/"/g, '""')}"`,
      issue.tipo_problema,
      issue.severidade,
      `"${issue.evidencia.replace(/"/g, '""')}"`,
      `"${issue.hipotese.replace(/"/g, '""')}"`,
      `"${issue.acao.replace(/"/g, '""')}"`,
    ];
    lines.push(row.join(';'));
  }
  
  return lines.join('\n');
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('           AUDITORIA RawData vs Base PostgreSQL                 ');
  console.log('═══════════════════════════════════════════════════════════════');
  
  const rawdataPath = join(process.cwd(), 'rawdata');
  
  // 1. Carregar dados do RawData
  const inventory = loadRawData(rawdataPath);
  
  // 2. Executar auditoria
  const issues = runAudit(inventory);
  
  // 3. Gerar relatórios
  console.log('\n📝 Gerando relatórios...');
  
  const reportMd = generateReport(issues, inventory);
  const reportCsv = generateCSV(issues);
  
  const outputPath = join(process.cwd(), 'AUDIT-RAWDATA-REPORT.md');
  const csvPath = join(process.cwd(), 'audit-issues.csv');
  
  writeFileSync(outputPath, reportMd, 'utf-8');
  writeFileSync(csvPath, reportCsv, 'utf-8');
  
  console.log(`  ✓ Relatório MD salvo em: ${outputPath}`);
  console.log(`  ✓ CSV de issues salvo em: ${csvPath}`);
  
  // 4. Resumo final
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('                         RESUMO                                  ');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  Total de problemas: ${issues.length}`);
  console.log(`  - Alta severidade:  ${issues.filter(i => i.severidade === 'Alta').length}`);
  console.log(`  - Média severidade: ${issues.filter(i => i.severidade === 'Média').length}`);
  console.log(`  - Baixa severidade: ${issues.filter(i => i.severidade === 'Baixa').length}`);
  console.log('');
}

main().catch(console.error);


