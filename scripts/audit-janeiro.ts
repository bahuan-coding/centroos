/**
 * Auditoria e Importação de Lançamentos Janeiro 2025
 * Executar: npx tsx scripts/audit-janeiro.ts
 * 
 * Este script:
 * 1. Processa rawdata_janeiro.csv
 * 2. Cruza doações com títulos existentes
 * 3. Cria relacionamentos rastreáveis via importBatchId
 * 4. Registra transferências internas com dados raw preservados
 */

import { neon } from '@netlify/neon';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq, sql, and, isNull } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as crypto from 'crypto';
import * as schema from '../drizzle/schema';
import { parseAndClassify, LancamentoClassificado } from './parsers/rawdata-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const databaseUrl = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('❌ DATABASE_URL não configurada');
  process.exit(1);
}

const sqlClient = neon(databaseUrl);
const db = drizzle(sqlClient, { schema });

const RAWDATA_PATH = path.join(__dirname, '..', 'rawdata', 'rawdata_janeiro.csv');
const IMPORT_BATCH_ID = crypto.randomUUID();
const SOURCE_SYSTEM = 'rawdata_janeiro_2025';

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

interface AuditResult {
  total: number;
  doacoesMatched: number;
  doacoesCriadas: number;
  despesasCriadas: number;
  transferenciasCriadas: number;
  tarifasCriadas: number;
  rendimentosCriados: number;
  erros: string[];
}

interface ContaFinanceiraMap {
  caixa: string | null;
  bb: string | null;
  bbrf: string | null;
  cef: string | null;
}

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

function normalizeNome(nome: string): string {
  return nome.trim().toUpperCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function buildObservacoes(lanc: LancamentoClassificado): string {
  return JSON.stringify({
    rawLine: {
      data: formatDate(lanc.data),
      documento: lanc.documento,
      cnpj: lanc.cnpj,
      fornecedor: lanc.fornecedor,
      descricao: lanc.descricao,
      valorCaixa: lanc.valorCaixa,
      valorBB: lanc.valorBB,
      valorBBRF: lanc.valorBBRF,
      valorCEF: lanc.valorCEF,
    },
    importedAt: new Date().toISOString(),
    lineNumber: lanc.lineNumber,
    classificacao: lanc.tipo,
  });
}

// ============================================================================
// BUSCAR CONTAS FINANCEIRAS
// ============================================================================

async function getContasFinanceiras(): Promise<ContaFinanceiraMap> {
  const contas = await db.select().from(schema.contaFinanceira);
  
  const map: ContaFinanceiraMap = { caixa: null, bb: null, bbrf: null, cef: null };
  
  for (const c of contas) {
    const nome = c.nome.toLowerCase();
    if (nome.includes('caixa físico') || (nome === 'caixa' && c.tipo === 'caixa')) {
      map.caixa = c.id;
    } else if (nome.includes('banco do brasil') && nome.includes('corrente')) {
      map.bb = c.id;
    } else if (nome.includes('renda fácil') || nome.includes('rende fácil')) {
      map.bbrf = c.id;
    } else if (nome.includes('caixa econômica') || nome.includes('caixa economica')) {
      map.cef = c.id;
    }
  }
  
  return map;
}

// ============================================================================
// BUSCAR PESSOA POR NOME
// ============================================================================

async function findPessoaByNome(nome: string): Promise<string | null> {
  // Limpar nome: remover parênteses e conteúdo entre eles
  const nomeClean = nome.replace(/\s*\([^)]*\)\s*/g, ' ').trim();
  const nomeNorm = normalizeNome(nomeClean);
  
  // 1. Busca exata normalizada (sem acentos)
  const result = await db.execute(sql`
    SELECT id FROM pessoa 
    WHERE UPPER(UNACCENT(TRIM(nome))) = ${nomeNorm}
      AND deleted_at IS NULL
    LIMIT 1
  `);
  
  if (result.rows.length > 0) {
    return (result.rows[0] as any).id;
  }
  
  // 2. Busca por primeiro e último nome
  const partes = nomeNorm.split(' ').filter(p => p.length > 2);
  if (partes.length >= 2) {
    const primeiro = partes[0];
    const ultimo = partes[partes.length - 1];
    
    const resultNomes = await db.execute(sql`
      SELECT id FROM pessoa 
      WHERE UPPER(UNACCENT(nome)) LIKE ${primeiro + '%'} 
        AND UPPER(UNACCENT(nome)) LIKE ${'%' + ultimo}
        AND deleted_at IS NULL
      LIMIT 1
    `);
    
    if (resultNomes.rows.length > 0) {
      return (resultNomes.rows[0] as any).id;
    }
  }
  
  // 3. Busca fuzzy pelo primeiro nome (corrigindo typos comuns)
  const primeiroNome = partes[0];
  if (primeiroNome && primeiroNome.length >= 4) {
    // Usar similarity para encontrar nomes parecidos
    const resultSimilar = await db.execute(sql`
      SELECT id, nome FROM pessoa 
      WHERE UPPER(UNACCENT(nome)) LIKE ${primeiroNome.substring(0, 4) + '%'} 
        AND deleted_at IS NULL
      ORDER BY nome
      LIMIT 1
    `);
    
    if (resultSimilar.rows.length > 0) {
      return (resultSimilar.rows[0] as any).id;
    }
  }
  
  return null;
}

// ============================================================================
// VERIFICAR SE TÍTULO JÁ EXISTE (MATCHING)
// ============================================================================

async function findTituloExistente(
  pessoaId: string,
  dataCompetencia: string,
  valor: number
): Promise<string | null> {
  const result = await db.execute(sql`
    SELECT id FROM titulo 
    WHERE pessoa_id = ${pessoaId}
      AND data_competencia = ${dataCompetencia}
      AND ABS(valor_liquido::numeric - ${valor}) < 0.01
      AND deleted_at IS NULL
    LIMIT 1
  `);
  
  return result.rows.length > 0 ? (result.rows[0] as any).id : null;
}

// ============================================================================
// PROCESSAR DOAÇÃO (CONTRIBUIÇÃO)
// ============================================================================

async function processarDoacao(
  lanc: LancamentoClassificado,
  contaMap: ContaFinanceiraMap,
  result: AuditResult
): Promise<void> {
  const pessoaId = await findPessoaByNome(lanc.fornecedor);
  
  if (!pessoaId) {
    result.erros.push(`Pessoa não encontrada: ${lanc.fornecedor} (linha ${lanc.lineNumber})`);
    return;
  }
  
  const dataComp = formatDate(lanc.data);
  const valor = Math.abs(lanc.valorTotal);
  
  // Verificar se já existe
  const tituloExistente = await findTituloExistente(pessoaId, dataComp, valor);
  
  if (tituloExistente) {
    // Atualizar importBatchId para vincular
    await db.update(schema.titulo)
      .set({ 
        importBatchId: IMPORT_BATCH_ID,
        observacoes: buildObservacoes(lanc),
      })
      .where(eq(schema.titulo.id, tituloExistente));
    
    result.doacoesMatched++;
    console.log(`  ✓ Match: ${lanc.fornecedor} R$${valor.toFixed(2)} (${dataComp})`);
  } else {
    // Criar novo título
    const natureza = lanc.tipo === 'contribuicao_associado' ? 'contribuicao' : 'doacao';
    
    const [novoTitulo] = await db.insert(schema.titulo).values({
      tipo: 'receber',
      natureza: natureza as any,
      pessoaId,
      descricao: lanc.descricao,
      valorOriginal: valor.toFixed(2),
      valorLiquido: valor.toFixed(2),
      dataEmissao: dataComp,
      dataCompetencia: dataComp,
      dataVencimento: dataComp,
      numeroDocumento: lanc.documento || null,
      status: 'quitado',
      sourceSystem: SOURCE_SYSTEM,
      importBatchId: IMPORT_BATCH_ID,
      observacoes: buildObservacoes(lanc),
    }).returning({ id: schema.titulo.id });
    
    // Criar baixa se houver conta
    const contaId = lanc.contaOrigem ? contaMap[lanc.contaOrigem] : null;
    if (contaId) {
      await db.insert(schema.tituloBaixa).values({
        tituloId: novoTitulo.id,
        contaFinanceiraId: contaId,
        dataPagamento: dataComp,
        valorPago: valor.toFixed(2),
        formaPagamento: lanc.documento?.toLowerCase().includes('pix') ? 'pix' : 'ted',
        documentoReferencia: lanc.documento || null,
      });
    }
    
    result.doacoesCriadas++;
    console.log(`  + Criado: ${lanc.fornecedor} R$${valor.toFixed(2)} (${dataComp})`);
  }
}

// ============================================================================
// PROCESSAR DESPESA
// ============================================================================

async function processarDespesa(
  lanc: LancamentoClassificado,
  contaMap: ContaFinanceiraMap,
  result: AuditResult
): Promise<void> {
  const dataComp = formatDate(lanc.data);
  const valor = Math.abs(lanc.valorTotal);
  
  // Mapear natureza
  let natureza: typeof schema.tituloNaturezaEnum.enumValues[number] = 'outros';
  if (lanc.natureza === 'utilidade') natureza = 'utilidade';
  else if (lanc.natureza === 'material') natureza = 'material';
  else if (lanc.natureza === 'servico') natureza = 'servico';
  else if (lanc.natureza === 'taxa') natureza = 'taxa';
  
  // Buscar fornecedor se tiver CNPJ
  let pessoaId: string | null = null;
  if (lanc.cnpj) {
    const cnpjNorm = lanc.cnpj.replace(/\D/g, '');
    const pessoaResult = await db.execute(sql`
      SELECT p.id FROM pessoa p
      INNER JOIN pessoa_documento pd ON pd.pessoa_id = p.id
      WHERE pd.tipo = 'cnpj' AND pd.numero = ${cnpjNorm}
      LIMIT 1
    `);
    if (pessoaResult.rows.length > 0) {
      pessoaId = (pessoaResult.rows[0] as any).id;
    }
  }
  
  const [novoTitulo] = await db.insert(schema.titulo).values({
    tipo: 'pagar',
    natureza,
    pessoaId,
    descricao: lanc.descricao || lanc.fornecedor,
    valorOriginal: valor.toFixed(2),
    valorLiquido: valor.toFixed(2),
    dataEmissao: dataComp,
    dataCompetencia: dataComp,
    dataVencimento: dataComp,
    numeroDocumento: lanc.documento || null,
    status: 'quitado',
    sourceSystem: SOURCE_SYSTEM,
    importBatchId: IMPORT_BATCH_ID,
    observacoes: buildObservacoes(lanc),
  }).returning({ id: schema.titulo.id });
  
  // Criar baixa
  const contaId = lanc.contaOrigem ? contaMap[lanc.contaOrigem] : null;
  if (contaId) {
    await db.insert(schema.tituloBaixa).values({
      tituloId: novoTitulo.id,
      contaFinanceiraId: contaId,
      dataPagamento: dataComp,
      valorPago: valor.toFixed(2),
      formaPagamento: 'debito',
      documentoReferencia: lanc.documento || null,
    });
  }
  
  result.despesasCriadas++;
}

// ============================================================================
// PROCESSAR TRANSFERÊNCIA INTERNA
// ============================================================================

async function processarTransferencia(
  lanc: LancamentoClassificado,
  contaMap: ContaFinanceiraMap,
  result: AuditResult
): Promise<void> {
  const dataComp = formatDate(lanc.data);
  const valor = Math.abs(lanc.valorTotal);
  
  // Determinar direção: BB -> BBRF (débito BB) ou BBRF -> BB (crédito BB)
  const isDebito = lanc.valorBB < 0;
  const tipo = isDebito ? 'pagar' : 'receber';
  const descricao = isDebito 
    ? 'Transferência para BB Rende Fácil' 
    : 'Resgate de BB Rende Fácil';
  
  const [novoTitulo] = await db.insert(schema.titulo).values({
    tipo: tipo as any,
    natureza: 'outros',
    descricao,
    valorOriginal: valor.toFixed(2),
    valorLiquido: valor.toFixed(2),
    dataEmissao: dataComp,
    dataCompetencia: dataComp,
    dataVencimento: dataComp,
    numeroDocumento: lanc.documento || null,
    status: 'quitado',
    sourceSystem: SOURCE_SYSTEM,
    importBatchId: IMPORT_BATCH_ID,
    observacoes: buildObservacoes(lanc),
  }).returning({ id: schema.titulo.id });
  
  // Criar baixa na conta BB (principal)
  if (contaMap.bb) {
    await db.insert(schema.tituloBaixa).values({
      tituloId: novoTitulo.id,
      contaFinanceiraId: contaMap.bb,
      dataPagamento: dataComp,
      valorPago: valor.toFixed(2),
      formaPagamento: 'ted',
      documentoReferencia: 'Transferência Interna',
    });
  }
  
  result.transferenciasCriadas++;
}

// ============================================================================
// PROCESSAR TARIFA
// ============================================================================

async function processarTarifa(
  lanc: LancamentoClassificado,
  contaMap: ContaFinanceiraMap,
  result: AuditResult
): Promise<void> {
  const dataComp = formatDate(lanc.data);
  const valor = Math.abs(lanc.valorTotal);
  
  const natureza = lanc.natureza === 'imposto' ? 'imposto' : 'taxa';
  
  const [novoTitulo] = await db.insert(schema.titulo).values({
    tipo: 'pagar',
    natureza: natureza as any,
    descricao: lanc.descricao,
    valorOriginal: valor.toFixed(2),
    valorLiquido: valor.toFixed(2),
    dataEmissao: dataComp,
    dataCompetencia: dataComp,
    dataVencimento: dataComp,
    status: 'quitado',
    sourceSystem: SOURCE_SYSTEM,
    importBatchId: IMPORT_BATCH_ID,
    observacoes: buildObservacoes(lanc),
  }).returning({ id: schema.titulo.id });
  
  const contaId = lanc.contaOrigem ? contaMap[lanc.contaOrigem] : null;
  if (contaId) {
    await db.insert(schema.tituloBaixa).values({
      tituloId: novoTitulo.id,
      contaFinanceiraId: contaId,
      dataPagamento: dataComp,
      valorPago: valor.toFixed(2),
      formaPagamento: 'debito',
    });
  }
  
  result.tarifasCriadas++;
}

// ============================================================================
// PROCESSAR RENDIMENTO
// ============================================================================

async function processarRendimento(
  lanc: LancamentoClassificado,
  contaMap: ContaFinanceiraMap,
  result: AuditResult
): Promise<void> {
  const dataComp = formatDate(lanc.data);
  const valor = Math.abs(lanc.valorTotal);
  
  const [novoTitulo] = await db.insert(schema.titulo).values({
    tipo: 'receber',
    natureza: 'outros',
    descricao: lanc.descricao,
    valorOriginal: valor.toFixed(2),
    valorLiquido: valor.toFixed(2),
    dataEmissao: dataComp,
    dataCompetencia: dataComp,
    dataVencimento: dataComp,
    status: 'quitado',
    sourceSystem: SOURCE_SYSTEM,
    importBatchId: IMPORT_BATCH_ID,
    observacoes: buildObservacoes(lanc),
  }).returning({ id: schema.titulo.id });
  
  if (contaMap.bbrf) {
    await db.insert(schema.tituloBaixa).values({
      tituloId: novoTitulo.id,
      contaFinanceiraId: contaMap.bbrf,
      dataPagamento: dataComp,
      valorPago: valor.toFixed(2),
      formaPagamento: 'ted',
    });
  }
  
  result.rendimentosCriados++;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  AUDITORIA JANEIRO 2025');
  console.log(`  Import Batch ID: ${IMPORT_BATCH_ID}`);
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  // Ler arquivo
  if (!fs.existsSync(RAWDATA_PATH)) {
    console.error(`❌ Arquivo não encontrado: ${RAWDATA_PATH}`);
    process.exit(1);
  }
  
  const content = fs.readFileSync(RAWDATA_PATH, 'utf-8');
  const lancamentos = parseAndClassify(content);
  
  console.log(`📄 ${lancamentos.length} lançamentos encontrados\n`);
  
  // Resumo por tipo
  const porTipo: Record<string, number> = {};
  for (const l of lancamentos) {
    porTipo[l.tipo] = (porTipo[l.tipo] || 0) + 1;
  }
  console.log('Resumo por tipo:');
  for (const [tipo, qtd] of Object.entries(porTipo)) {
    console.log(`  - ${tipo}: ${qtd}`);
  }
  console.log('');
  
  // Buscar contas financeiras
  const contaMap = await getContasFinanceiras();
  console.log('Contas financeiras:');
  console.log(`  - Caixa: ${contaMap.caixa ? '✓' : '✗'}`);
  console.log(`  - BB: ${contaMap.bb ? '✓' : '✗'}`);
  console.log(`  - BB RF: ${contaMap.bbrf ? '✓' : '✗'}`);
  console.log(`  - CEF: ${contaMap.cef ? '✓' : '✗'}`);
  console.log('');
  
  const result: AuditResult = {
    total: lancamentos.length,
    doacoesMatched: 0,
    doacoesCriadas: 0,
    despesasCriadas: 0,
    transferenciasCriadas: 0,
    tarifasCriadas: 0,
    rendimentosCriados: 0,
    erros: [],
  };
  
  // Processar cada lançamento
  console.log('Processando lançamentos...\n');
  
  for (const lanc of lancamentos) {
    try {
      switch (lanc.tipo) {
        case 'contribuicao_associado':
        case 'contribuicao_nao_associado':
          await processarDoacao(lanc, contaMap, result);
          break;
        case 'despesa':
          await processarDespesa(lanc, contaMap, result);
          break;
        case 'transferencia_interna':
          await processarTransferencia(lanc, contaMap, result);
          break;
        case 'tarifa':
          await processarTarifa(lanc, contaMap, result);
          break;
        case 'rendimento':
          await processarRendimento(lanc, contaMap, result);
          break;
      }
    } catch (error: any) {
      result.erros.push(`Linha ${lanc.lineNumber}: ${error.message}`);
    }
  }
  
  // Relatório final
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  RELATÓRIO DE AUDITORIA');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  Total processados: ${result.total}`);
  console.log(`  Doações matched:   ${result.doacoesMatched}`);
  console.log(`  Doações criadas:   ${result.doacoesCriadas}`);
  console.log(`  Despesas criadas:  ${result.despesasCriadas}`);
  console.log(`  Transferências:    ${result.transferenciasCriadas}`);
  console.log(`  Tarifas:           ${result.tarifasCriadas}`);
  console.log(`  Rendimentos:       ${result.rendimentosCriados}`);
  console.log(`  Erros:             ${result.erros.length}`);
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  if (result.erros.length > 0) {
    console.log('Erros encontrados:');
    for (const erro of result.erros) {
      console.log(`  ⚠️  ${erro}`);
    }
  }
  
  // Verificação final
  console.log('\n🔍 Verificação no banco...');
  const verificacao = await db.execute(sql`
    SELECT 
      tipo,
      natureza,
      COUNT(*) as qtd,
      SUM(valor_liquido::numeric) as total
    FROM titulo 
    WHERE import_batch_id = ${IMPORT_BATCH_ID}
    GROUP BY tipo, natureza
    ORDER BY tipo, natureza
  `);
  
  console.log('\nTítulos inseridos nesta importação:');
  for (const row of verificacao.rows as any[]) {
    console.log(`  ${row.tipo}/${row.natureza}: ${row.qtd} títulos, R$ ${parseFloat(row.total).toFixed(2)}`);
  }
  
  console.log(`\n✅ Auditoria concluída! Batch ID: ${IMPORT_BATCH_ID}`);
}

main().catch((error) => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});

