/**
 * Script de Migração Completa - Todos os Dados do rawdata
 * Executar: npx tsx scripts/seed-migration-full.ts
 */

import { neon } from '@netlify/neon';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq, sql, count } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as schema from '../drizzle/schema';
import { parseCSVCaixa } from './parsers/csv-parser';
import { parseTSVContribuicoes, parseTSVMensal } from './parsers/tsv-parser';
import { parseBBSimple } from './parsers/bb-txt-parser';
import * as crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const databaseUrl = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('❌ DATABASE_URL não configurada');
  process.exit(1);
}

const sqlClient = neon(databaseUrl);
const db = drizzle(sqlClient, { schema });

const RAWDATA_PATH = path.join(__dirname, '..', 'rawdata');
const TSV_PATH = path.join(RAWDATA_PATH, 'relatorio_excel_sheets_tsv');

// ============================================================================
// DADOS BASE
// ============================================================================

const contasFinanceiras = [
  { tipo: 'caixa' as const, nome: 'Caixa Físico', saldoInicial: '2.87', dataSaldoInicial: '2024-12-31' },
  { tipo: 'conta_corrente' as const, nome: 'Banco do Brasil - Conta Corrente', bancoCodigo: '001', bancoNome: 'Banco do Brasil', agencia: '13-2', contaNumero: '8197-3', saldoInicial: '0', dataSaldoInicial: '2024-10-28' },
  { tipo: 'poupanca' as const, nome: 'BB Renda Fácil', bancoCodigo: '001', bancoNome: 'Banco do Brasil', saldoInicial: '4593.82', dataSaldoInicial: '2024-12-31' },
  { tipo: 'conta_corrente' as const, nome: 'Caixa Econômica Federal', bancoCodigo: '104', bancoNome: 'Caixa Econômica Federal', agencia: '0049', contaNumero: '00000156-6', saldoInicial: '20045.97', dataSaldoInicial: '2024-12-31' },
];

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

function generateHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function normalizeNome(nome: string): string {
  return nome.trim().toUpperCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

// ============================================================================
// MIGRAÇÃO: CONTAS FINANCEIRAS
// ============================================================================

async function migrateContasFinanceiras(): Promise<Record<string, string>> {
  console.log('\n🏦 Migrando contas financeiras...');
  const idMap: Record<string, string> = {};
  
  for (const conta of contasFinanceiras) {
    try {
      // Check if exists
      const existing = await db.select().from(schema.contaFinanceira)
        .where(eq(schema.contaFinanceira.nome, conta.nome)).limit(1);
      
      if (existing.length > 0) {
        idMap[conta.nome] = existing[0].id;
        console.log(`  ⏭️  ${conta.nome} (já existe)`);
      } else {
        const [result] = await db.insert(schema.contaFinanceira).values(conta).returning({ id: schema.contaFinanceira.id });
        idMap[conta.nome] = result.id;
        console.log(`  ✅ ${conta.nome}`);
      }
    } catch (error: any) {
      console.error(`  ❌ ${conta.nome}: ${error.message}`);
    }
  }
  
  return idMap;
}

// ============================================================================
// MIGRAÇÃO: PESSOAS E ASSOCIADOS
// ============================================================================

async function migratePessoas(): Promise<Record<string, string>> {
  console.log('\n👥 Migrando pessoas...');
  const idMap: Record<string, string> = {};
  
  // Read contribuições TSV
  const contribAssocPath = path.join(TSV_PATH, 'CONTRIBUIÇÃO_ASSOCIADOS.tsv');
  const contribNaoPath = path.join(TSV_PATH, 'CONTRIBUIÇÃO_NAO_ASSOCIADOS.tsv');
  
  const contribAssoc = fs.existsSync(contribAssocPath) 
    ? parseTSVContribuicoes(fs.readFileSync(contribAssocPath, 'utf-8'), 'associado')
    : [];
  const contribNao = fs.existsSync(contribNaoPath)
    ? parseTSVContribuicoes(fs.readFileSync(contribNaoPath, 'utf-8'), 'nao_associado')
    : [];
  
  // Extract unique names
  const nomesAssociados = new Set<string>();
  const nomesNaoAssociados = new Set<string>();
  const matriculaMap: Record<string, string> = {};
  
  for (const c of contribAssoc) {
    nomesAssociados.add(normalizeNome(c.nome));
    if (c.matricula) matriculaMap[normalizeNome(c.nome)] = c.matricula;
  }
  for (const c of contribNao) {
    if (!nomesAssociados.has(normalizeNome(c.nome))) {
      nomesNaoAssociados.add(normalizeNome(c.nome));
    }
  }
  
  console.log(`  📋 ${nomesAssociados.size} associados, ${nomesNaoAssociados.size} não-associados`);
  
  // Insert associados
  for (const nome of nomesAssociados) {
    try {
      const existing = await db.select().from(schema.pessoa)
        .where(sql`UPPER(${schema.pessoa.nome}) = ${nome}`).limit(1);
      
      if (existing.length > 0) {
        idMap[nome] = existing[0].id;
      } else {
        const [pessoa] = await db.insert(schema.pessoa).values({
          tipo: 'fisica',
          nome: nome.split(' ').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' '),
          ativo: true,
        }).returning({ id: schema.pessoa.id });
        
        idMap[nome] = pessoa.id;
        
        // Create associado record
        await db.insert(schema.associado).values({
          pessoaId: pessoa.id,
          numeroRegistro: matriculaMap[nome] || undefined,
          dataAdmissao: '2024-01-01',
          status: 'ativo',
          categoria: 'trabalhador',
          periodicidade: 'mensal',
          isento: false,
          diaVencimento: 10,
        });
      }
    } catch (error: any) {
      if (!error.message?.includes('duplicate')) {
        console.error(`  ❌ ${nome}: ${error.message}`);
      }
    }
  }
  
  // Insert não-associados
  for (const nome of nomesNaoAssociados) {
    try {
      const existing = await db.select().from(schema.pessoa)
        .where(sql`UPPER(${schema.pessoa.nome}) = ${nome}`).limit(1);
      
      if (existing.length > 0) {
        idMap[nome] = existing[0].id;
      } else {
        const [pessoa] = await db.insert(schema.pessoa).values({
          tipo: 'fisica',
          nome: nome.split(' ').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' '),
          ativo: true,
        }).returning({ id: schema.pessoa.id });
        
        idMap[nome] = pessoa.id;
      }
    } catch (error: any) {
      if (!error.message?.includes('duplicate')) {
        console.error(`  ❌ ${nome}: ${error.message}`);
      }
    }
  }
  
  console.log(`  ✅ ${Object.keys(idMap).length} pessoas processadas`);
  return idMap;
}

// ============================================================================
// MIGRAÇÃO: PERÍODOS CONTÁBEIS
// ============================================================================

async function migratePeriodos(): Promise<Record<string, string>> {
  console.log('\n📅 Migrando períodos contábeis...');
  const idMap: Record<string, string> = {};
  
  for (let mes = 1; mes <= 12; mes++) {
    const ultimoDia = new Date(2025, mes, 0).getDate();
    const key = `2025-${String(mes).padStart(2, '0')}`;
    
    try {
      const existing = await db.select().from(schema.periodoContabil)
        .where(sql`${schema.periodoContabil.ano} = 2025 AND ${schema.periodoContabil.mes} = ${mes}`).limit(1);
      
      if (existing.length > 0) {
        idMap[key] = existing[0].id;
      } else {
        const [periodo] = await db.insert(schema.periodoContabil).values({
          ano: 2025,
          mes,
          dataInicio: `2025-${String(mes).padStart(2, '0')}-01`,
          dataFim: `2025-${String(mes).padStart(2, '0')}-${ultimoDia}`,
          status: mes <= 11 ? 'fechado' : 'aberto',
        }).returning({ id: schema.periodoContabil.id });
        
        idMap[key] = periodo.id;
      }
    } catch (error: any) {
      if (!error.message?.includes('duplicate')) {
        console.error(`  ❌ ${key}: ${error.message}`);
      }
    }
  }
  
  console.log(`  ✅ ${Object.keys(idMap).length} períodos processados`);
  return idMap;
}

// ============================================================================
// MIGRAÇÃO: EXTRATOS BANCÁRIOS
// ============================================================================

async function migrateExtratos(contaIdMap: Record<string, string>): Promise<{ linhasInseridas: number }> {
  console.log('\n📄 Migrando extratos bancários...');
  let linhasInseridas = 0;
  
  // 1. Extrato Caixa Econômica
  const caixaPath = path.join(RAWDATA_PATH, 'caixa_extrato_novembro_2025_lancamentos.csv');
  if (fs.existsSync(caixaPath)) {
    const content = fs.readFileSync(caixaPath, 'utf-8');
    const hash = generateHash(content);
    const contaId = contaIdMap['Caixa Econômica Federal'];
    
    if (contaId) {
      try {
        // Check if extrato already exists
        const existingExtrato = await db.select().from(schema.extratoBancario)
          .where(sql`${schema.extratoBancario.contaFinanceiraId} = ${contaId} AND ${schema.extratoBancario.arquivoHash} = ${hash}`)
          .limit(1);
        
        let extratoId: string;
        
        if (existingExtrato.length > 0) {
          extratoId = existingExtrato[0].id;
          console.log(`  ⏭️  Extrato Caixa Nov/2025 (já existe)`);
        } else {
          const transactions = parseCSVCaixa(content);
          
          const [extrato] = await db.insert(schema.extratoBancario).values({
            contaFinanceiraId: contaId,
            arquivoNome: 'caixa_extrato_novembro_2025.csv',
            arquivoTipo: 'csv',
            arquivoHash: hash,
            dataInicio: '2025-11-01',
            dataFim: '2025-11-30',
            totalLinhas: transactions.length,
            status: 'processado',
            importadoPor: '00000000-0000-0000-0000-000000000000',
            importadoEm: new Date(),
          }).returning({ id: schema.extratoBancario.id });
          
          extratoId = extrato.id;
          
          // Insert lines
          for (const tx of transactions) {
            await db.insert(schema.extratoLinha).values({
              extratoId,
              dataMovimento: tx.dataHora.toISOString().split('T')[0],
              tipo: tx.tipo,
              valor: String(tx.valor),
              descricaoOriginal: `${tx.historico} ${tx.favorecido}`.trim(),
              descricaoNormalizada: tx.historico,
              codigoTransacao: tx.nrDoc,
              status: 'pendente',
            });
            linhasInseridas++;
          }
          
          console.log(`  ✅ Extrato Caixa Nov/2025: ${transactions.length} linhas`);
        }
      } catch (error: any) {
        console.error(`  ❌ Extrato Caixa: ${error.message}`);
      }
    }
  }
  
  // 2. Extrato Banco do Brasil
  const bbPath = path.join(RAWDATA_PATH, 'banco_do_brasil_extrato_novembro_2025_raw.txt');
  if (fs.existsSync(bbPath)) {
    const content = fs.readFileSync(bbPath, 'utf-8');
    const hash = generateHash(content);
    const contaId = contaIdMap['Banco do Brasil - Conta Corrente'];
    
    if (contaId) {
      try {
        const existingExtrato = await db.select().from(schema.extratoBancario)
          .where(sql`${schema.extratoBancario.contaFinanceiraId} = ${contaId} AND ${schema.extratoBancario.arquivoHash} = ${hash}`)
          .limit(1);
        
        if (existingExtrato.length > 0) {
          console.log(`  ⏭️  Extrato BB Nov/2025 (já existe)`);
        } else {
          const transactions = parseBBSimple(content);
          
          const [extrato] = await db.insert(schema.extratoBancario).values({
            contaFinanceiraId: contaId,
            arquivoNome: 'banco_do_brasil_extrato_novembro_2025.txt',
            arquivoTipo: 'txt',
            arquivoHash: hash,
            dataInicio: '2025-11-01',
            dataFim: '2025-11-30',
            saldoInicialExtrato: '0',
            saldoFinalExtrato: '0',
            totalLinhas: transactions.length,
            status: 'processado',
            importadoPor: '00000000-0000-0000-0000-000000000000',
            importadoEm: new Date(),
          }).returning({ id: schema.extratoBancario.id });
          
          for (const tx of transactions) {
            await db.insert(schema.extratoLinha).values({
              extratoId: extrato.id,
              dataMovimento: tx.dataMovimento.toISOString().split('T')[0],
              dataBalancete: tx.dataBalancete.toISOString().split('T')[0],
              tipo: tx.tipo,
              valor: String(tx.valor),
              descricaoOriginal: `${tx.historico} ${tx.descricaoExtra}`.trim(),
              descricaoNormalizada: tx.historico,
              codigoTransacao: tx.documento,
              status: 'pendente',
            });
            linhasInseridas++;
          }
          
          console.log(`  ✅ Extrato BB Nov/2025: ${transactions.length} linhas`);
        }
      } catch (error: any) {
        console.error(`  ❌ Extrato BB: ${error.message}`);
      }
    }
  }
  
  return { linhasInseridas };
}

// ============================================================================
// MIGRAÇÃO: TÍTULOS DE CONTRIBUIÇÃO
// ============================================================================

async function migrateTitulos(pessoaIdMap: Record<string, string>): Promise<{ titulosInseridos: number }> {
  console.log('\n💰 Migrando títulos de contribuição...');
  let titulosInseridos = 0;
  
  // Read all contribution TSVs
  const contribAssocPath = path.join(TSV_PATH, 'CONTRIBUIÇÃO_ASSOCIADOS.tsv');
  const contribNaoPath = path.join(TSV_PATH, 'CONTRIBUIÇÃO_NAO_ASSOCIADOS.tsv');
  
  const allContribs = [
    ...(fs.existsSync(contribAssocPath) 
      ? parseTSVContribuicoes(fs.readFileSync(contribAssocPath, 'utf-8'), 'associado') 
      : []),
    ...(fs.existsSync(contribNaoPath) 
      ? parseTSVContribuicoes(fs.readFileSync(contribNaoPath, 'utf-8'), 'nao_associado') 
      : []),
  ];
  
  console.log(`  📋 ${allContribs.length} contribuições encontradas`);
  
  for (const contrib of allContribs) {
    const nomeNorm = normalizeNome(contrib.nome);
    const pessoaId = pessoaIdMap[nomeNorm];
    
    if (!pessoaId) continue;
    
    const dataStr = contrib.data.toISOString().split('T')[0];
    const descricao = `Contribuição ${contrib.ano}-${String(contrib.mes).padStart(2, '0')}`;
    
    try {
      // Check if titulo already exists
      const existing = await db.select().from(schema.titulo)
        .where(sql`${schema.titulo.pessoaId} = ${pessoaId} 
          AND ${schema.titulo.dataCompetencia} = ${dataStr}
          AND ${schema.titulo.valorOriginal} = ${String(contrib.valor)}`)
        .limit(1);
      
      if (existing.length === 0) {
        await db.insert(schema.titulo).values({
          tipo: 'receber',
          natureza: 'contribuicao',
          pessoaId,
          descricao,
          valorOriginal: String(contrib.valor),
          valorLiquido: String(contrib.valor),
          dataEmissao: dataStr,
          dataCompetencia: dataStr,
          dataVencimento: dataStr,
          status: 'quitado',
          sourceSystem: 'migration-rawdata',
        });
        titulosInseridos++;
      }
    } catch (error: any) {
      if (!error.message?.includes('duplicate')) {
        console.error(`  ❌ Título ${contrib.nome}: ${error.message}`);
      }
    }
  }
  
  console.log(`  ✅ ${titulosInseridos} títulos inseridos`);
  return { titulosInseridos };
}

// ============================================================================
// MIGRAÇÃO: TRANSAÇÕES MENSAIS (TSVs jan-dez)
// ============================================================================

async function migrateTitulosMensais(contaIdMap: Record<string, string>): Promise<{ despesasInseridas: number }> {
  console.log('\n📊 Migrando transações mensais dos TSVs...');
  let despesasInseridas = 0;
  
  const meses = ['janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'Novembro', 'Dezembro'];
  
  for (const mes of meses) {
    const filePath = path.join(TSV_PATH, `${mes}.tsv`);
    if (!fs.existsSync(filePath)) continue;
    
    const content = fs.readFileSync(filePath, 'utf-8');
    const transacoes = parseTSVMensal(content, mes);
    
    for (const tx of transacoes) {
      // Skip transfers between own accounts (Renda Fácil, etc)
      if (tx.descricao.includes('Rende Fácil') || tx.descricao.includes('BB Rende')) continue;
      if (tx.descricao.includes('Tarifa')) continue; // Will be handled as extrato lines
      
      // Create titulo for expenses
      const totalDespesa = Math.abs(tx.valorCaixa) + Math.abs(tx.valorCEF);
      if (totalDespesa <= 0) continue;
      
      const dataStr = tx.data.toISOString().split('T')[0];
      
      try {
        // Check if exists
        const existing = await db.select().from(schema.titulo)
          .where(sql`${schema.titulo.dataCompetencia} = ${dataStr} 
            AND ${schema.titulo.descricao} = ${tx.descricao}
            AND ${schema.titulo.valorOriginal} = ${String(totalDespesa)}`)
          .limit(1);
        
        if (existing.length === 0 && tx.descricao) {
          // Determine natureza
          let natureza: typeof schema.tituloNaturezaEnum.enumValues[number] = 'outros';
          if (tx.descricao.includes('Energia') || tx.descricao.includes('Agua') || tx.descricao.includes('Internet')) {
            natureza = 'utilidade';
          } else if (tx.descricao.includes('Material') || tx.descricao.includes('Aquisição')) {
            natureza = 'material';
          } else if (tx.descricao.includes('Serviço') || tx.descricao.includes('Limpeza')) {
            natureza = 'servico';
          } else if (tx.descricao.includes('Contribuição Mensal')) {
            natureza = 'taxa';
          }
          
          await db.insert(schema.titulo).values({
            tipo: 'pagar',
            natureza,
            descricao: tx.descricao,
            valorOriginal: String(totalDespesa),
            valorLiquido: String(totalDespesa),
            dataEmissao: dataStr,
            dataCompetencia: dataStr,
            dataVencimento: dataStr,
            numeroDocumento: tx.documento || undefined,
            status: 'quitado',
            sourceSystem: 'migration-rawdata',
          });
          despesasInseridas++;
        }
      } catch (error: any) {
        if (!error.message?.includes('duplicate')) {
          console.error(`  ❌ Despesa ${tx.descricao}: ${error.message}`);
        }
      }
    }
  }
  
  console.log(`  ✅ ${despesasInseridas} despesas inseridas`);
  return { despesasInseridas };
}

// ============================================================================
// VERIFICAÇÃO DE INTEGRIDADE
// ============================================================================

async function verifyIntegrity() {
  console.log('\n🔍 Verificando integridade...');
  
  const [pessoas] = await db.select({ count: count() }).from(schema.pessoa);
  const [associados] = await db.select({ count: count() }).from(schema.associado);
  const [contas] = await db.select({ count: count() }).from(schema.contaFinanceira);
  const [extratos] = await db.select({ count: count() }).from(schema.extratoBancario);
  const [linhas] = await db.select({ count: count() }).from(schema.extratoLinha);
  const [titulos] = await db.select({ count: count() }).from(schema.titulo);
  const [periodos] = await db.select({ count: count() }).from(schema.periodoContabil);
  
  // Sum of titulos receber (contribuições)
  const [somaReceber] = await db.select({ 
    total: sql<string>`COALESCE(SUM(CAST(valor_liquido AS NUMERIC)), 0)` 
  }).from(schema.titulo).where(eq(schema.titulo.tipo, 'receber'));
  
  const [somaPagar] = await db.select({ 
    total: sql<string>`COALESCE(SUM(CAST(valor_liquido AS NUMERIC)), 0)` 
  }).from(schema.titulo).where(eq(schema.titulo.tipo, 'pagar'));
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 RELATÓRIO FINAL DE MIGRAÇÃO');
  console.log('='.repeat(50));
  console.log(`  Pessoas:           ${pessoas.count}`);
  console.log(`  Associados:        ${associados.count}`);
  console.log(`  Contas Financ.:    ${contas.count}`);
  console.log(`  Extratos Banc.:    ${extratos.count}`);
  console.log(`  Linhas Extrato:    ${linhas.count}`);
  console.log(`  Títulos:           ${titulos.count}`);
  console.log(`  Períodos Contáb.:  ${periodos.count}`);
  console.log('─'.repeat(50));
  console.log(`  Total a Receber:   R$ ${parseFloat(somaReceber.total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  console.log(`  Total a Pagar:     R$ ${parseFloat(somaPagar.total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  console.log('='.repeat(50));
  
  // Validation checks
  const issues: string[] = [];
  
  if (Number(pessoas.count) < 50) issues.push('⚠️  Menos de 50 pessoas migradas');
  if (Number(contas.count) < 4) issues.push('⚠️  Menos de 4 contas financeiras');
  if (Number(titulos.count) < 100) issues.push('⚠️  Menos de 100 títulos migrados');
  if (Number(periodos.count) < 12) issues.push('⚠️  Menos de 12 períodos contábeis');
  
  if (issues.length > 0) {
    console.log('\n⚠️  ALERTAS:');
    issues.forEach(i => console.log(`  ${i}`));
  } else {
    console.log('\n✅ Migração concluída sem alertas!');
  }
  
  return {
    pessoas: Number(pessoas.count),
    associados: Number(associados.count),
    contas: Number(contas.count),
    extratos: Number(extratos.count),
    linhas: Number(linhas.count),
    titulos: Number(titulos.count),
    periodos: Number(periodos.count),
    somaReceber: parseFloat(somaReceber.total),
    somaPagar: parseFloat(somaPagar.total),
  };
}

// ============================================================================
// FUNÇÃO PRINCIPAL
// ============================================================================

async function main() {
  console.log('🚀 MIGRAÇÃO COMPLETA DOS DADOS - INICIANDO...');
  console.log('='.repeat(50));
  
  const startTime = Date.now();
  
  // 1. Contas Financeiras
  const contaIdMap = await migrateContasFinanceiras();
  
  // 2. Pessoas e Associados
  const pessoaIdMap = await migratePessoas();
  
  // 3. Períodos Contábeis
  await migratePeriodos();
  
  // 4. Extratos Bancários
  const { linhasInseridas } = await migrateExtratos(contaIdMap);
  
  // 5. Títulos de Contribuição
  const { titulosInseridos } = await migrateTitulos(pessoaIdMap);
  
  // 6. Transações Mensais (despesas)
  const { despesasInseridas } = await migrateTitulosMensais(contaIdMap);
  
  // 7. Verificação Final
  const stats = await verifyIntegrity();
  
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n⏱️  Tempo total: ${elapsed}s`);
  
  return stats;
}

main().catch(console.error);

