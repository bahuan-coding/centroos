/**
 * @deprecated Este script foi substituído pelo audit-runner.ts unificado.
 * Use: npx tsx scripts/audit-runner.ts --ano 2025 --todos --modulos doacoes
 * 
 * Auditoria: Compara títulos no banco com valores esperados do rawdata (LEGADO)
 * Executar: npx tsx scripts/audit-db-vs-rawdata.ts
 */

console.warn('⚠️  AVISO: Este script está DEPRECADO. Use: npx tsx scripts/audit-runner.ts --ano 2025 --todos');
console.warn('');

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { sql } from 'drizzle-orm';
import * as schema from '../drizzle/schema';
import * as fs from 'fs';
import * as path from 'path';

const databaseUrl = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('❌ DATABASE_URL não configurada');
  process.exit(1);
}

const sqlClient = neon(databaseUrl);
const db = drizzle(sqlClient, { schema });

// ============================================================================
// RAWDATA PARSER
// ============================================================================

function parseValor(v: string): number {
  if (!v || v.trim() === '') return 0;
  let clean = v.replace(/"/g, '').replace(/\s/g, '').replace(',', '.');
  if (clean.includes('.') && clean.split('.').length > 2) {
    const parts = clean.split('.');
    const decimal = parts.pop();
    clean = parts.join('') + '.' + decimal;
  }
  return parseFloat(clean) || 0;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') inQuotes = !inQuotes;
    else if (char === ',' && !inQuotes) { result.push(current); current = ''; }
    else current += char;
  }
  result.push(current);
  return result;
}

interface RawdataTotals {
  mes: string;
  receitas: number;
  despesas: number;
  countReceitas: number;
  countDespesas: number;
}

function parseRawdataFiles(): { totals: RawdataTotals[], summary: { receitas: number, despesas: number, countReceitas: number, countDespesas: number } } {
  const meses = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const totals: RawdataTotals[] = [];
  let totalReceitas = 0, totalDespesas = 0, countReceitas = 0, countDespesas = 0;

  for (const mes of meses) {
    const filePath = path.join(process.cwd(), 'rawdata', `rawdata_${mes}.csv`);
    if (!fs.existsSync(filePath)) continue;

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    let mesReceitas = 0, mesDespesas = 0, mesCountRec = 0, mesCountDesp = 0;

    for (let i = 5; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      const cols = parseCSVLine(line);
      const dataStr = cols[0]?.trim();
      if (!dataStr || dataStr.toLowerCase().includes('saldo')) continue;

      const descricao = (cols[4] || '').toLowerCase();
      const valorBB = parseValor(cols[6]);
      const valorBBRF = parseValor(cols[7]);
      const valorCEF = parseValor(cols[8]);
      const valorCaixa = parseValor(cols[5]);

      // Ignorar transferências internas
      if (descricao.includes('bb rende') || descricao.includes('rende fácil') || descricao.includes('renda fácil')) {
        continue;
      }

      // Determinar valor principal
      let valor = 0;
      if (valorBB !== 0) valor = valorBB;
      else if (valorCEF !== 0) valor = valorCEF;
      else if (valorBBRF !== 0) valor = valorBBRF;
      else if (valorCaixa !== 0) valor = valorCaixa;

      // Rendimentos
      if (descricao.includes('rendimento')) {
        if (valorBBRF > 0) { mesReceitas += valorBBRF; mesCountRec++; }
        continue;
      }

      // IR
      if (descricao.includes('imposto de renda')) {
        if (valorBBRF < 0) { mesDespesas += Math.abs(valorBBRF); mesCountDesp++; }
        continue;
      }

      // Classificar por sinal
      if (valor > 0) { mesReceitas += valor; mesCountRec++; }
      else if (valor < 0) { mesDespesas += Math.abs(valor); mesCountDesp++; }
    }

    totals.push({ mes, receitas: mesReceitas, despesas: mesDespesas, countReceitas: mesCountRec, countDespesas: mesCountDesp });
    totalReceitas += mesReceitas;
    totalDespesas += mesDespesas;
    countReceitas += mesCountRec;
    countDespesas += mesCountDesp;
  }

  return { totals, summary: { receitas: totalReceitas, despesas: totalDespesas, countReceitas, countDespesas } };
}

// ============================================================================
// AUDIT
// ============================================================================

async function audit() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 AUDITORIA: BANCO DE DADOS vs RAWDATA');
  console.log('='.repeat(80));

  // 1. Parse rawdata
  console.log('\n📊 1. TOTAIS ESPERADOS (RAWDATA):\n');
  const { totals: rawTotals, summary: rawSummary } = parseRawdataFiles();
  
  for (const t of rawTotals) {
    console.log(`  ${t.mes.padEnd(12)} | Rec: ${t.countReceitas.toString().padStart(3)} = R$ ${t.receitas.toFixed(2).padStart(10)} | Desp: ${t.countDespesas.toString().padStart(3)} = R$ ${t.despesas.toFixed(2).padStart(10)}`);
  }
  console.log('  ' + '-'.repeat(75));
  console.log(`  ${'TOTAL'.padEnd(12)} | Rec: ${rawSummary.countReceitas.toString().padStart(3)} = R$ ${rawSummary.receitas.toFixed(2).padStart(10)} | Desp: ${rawSummary.countDespesas.toString().padStart(3)} = R$ ${rawSummary.despesas.toFixed(2).padStart(10)}`);
  console.log(`\n  📈 Saldo esperado: R$ ${(rawSummary.receitas - rawSummary.despesas).toFixed(2)}`);

  // 2. Query DB
  console.log('\n\n📊 2. TOTAIS NO BANCO DE DADOS:\n');
  
  const dbTotals = await db.execute(sql`
    SELECT 
      tipo,
      COUNT(*) as quantidade,
      COALESCE(SUM(CAST(valor_liquido AS NUMERIC)), 0) as total
    FROM titulo 
    WHERE deleted_at IS NULL
    GROUP BY tipo
  `);

  let dbReceitas = 0, dbDespesas = 0, dbCountRec = 0, dbCountDesp = 0;
  for (const row of dbTotals.rows as any[]) {
    if (row.tipo === 'receber') {
      dbReceitas = parseFloat(row.total) || 0;
      dbCountRec = parseInt(row.quantidade) || 0;
      console.log(`  RECEITAS (receber): ${dbCountRec} títulos = R$ ${dbReceitas.toFixed(2)}`);
    } else if (row.tipo === 'pagar') {
      dbDespesas = parseFloat(row.total) || 0;
      dbCountDesp = parseInt(row.quantidade) || 0;
      console.log(`  DESPESAS (pagar):   ${dbCountDesp} títulos = R$ ${dbDespesas.toFixed(2)}`);
    }
  }
  console.log(`\n  📈 Saldo no banco: R$ ${(dbReceitas - dbDespesas).toFixed(2)}`);

  // 3. Comparação
  console.log('\n\n📊 3. COMPARAÇÃO (BANCO - RAWDATA):\n');
  
  const diffReceitas = dbReceitas - rawSummary.receitas;
  const diffDespesas = dbDespesas - rawSummary.despesas;
  const diffSaldo = (dbReceitas - dbDespesas) - (rawSummary.receitas - rawSummary.despesas);

  console.log(`  Receitas: ${diffReceitas >= 0 ? '+' : ''}R$ ${diffReceitas.toFixed(2)} (${diffReceitas > 0 ? '⚠️ EXCESSO' : diffReceitas < 0 ? '⚠️ FALTANDO' : '✅ OK'})`);
  console.log(`  Despesas: ${diffDespesas >= 0 ? '+' : ''}R$ ${diffDespesas.toFixed(2)} (${diffDespesas > 0 ? '⚠️ EXCESSO' : diffDespesas < 0 ? '⚠️ FALTANDO' : '✅ OK'})`);
  console.log(`  Saldo:    ${diffSaldo >= 0 ? '+' : ''}R$ ${diffSaldo.toFixed(2)}`);

  // 4. Top despesas suspeitas
  console.log('\n\n📊 4. TOP 15 MAIORES DESPESAS (possíveis problemas):\n');
  
  const topDespesas = await db.execute(sql`
    SELECT 
      t.descricao,
      t.valor_liquido,
      t.data_competencia,
      t.natureza,
      p.nome as pessoa
    FROM titulo t
    LEFT JOIN pessoa p ON p.id = t.pessoa_id
    WHERE t.deleted_at IS NULL AND t.tipo = 'pagar'
    ORDER BY CAST(t.valor_liquido AS NUMERIC) DESC
    LIMIT 15
  `);

  for (const row of topDespesas.rows as any[]) {
    const valor = parseFloat(row.valor_liquido) || 0;
    const desc = (row.descricao || '').substring(0, 40);
    console.log(`  R$ ${valor.toFixed(2).padStart(10)} | ${row.data_competencia} | ${desc}`);
  }

  // 5. Títulos por sourceSystem
  console.log('\n\n📊 5. TÍTULOS POR SOURCE_SYSTEM:\n');
  
  const bySource = await db.execute(sql`
    SELECT 
      COALESCE(source_system, 'NULL') as source,
      tipo,
      COUNT(*) as qtd,
      COALESCE(SUM(CAST(valor_liquido AS NUMERIC)), 0) as total
    FROM titulo 
    WHERE deleted_at IS NULL
    GROUP BY source_system, tipo
    ORDER BY source_system, tipo
  `);

  for (const row of bySource.rows as any[]) {
    const valor = parseFloat(row.total) || 0;
    console.log(`  ${row.source.padEnd(20)} | ${row.tipo.padEnd(8)} | ${row.qtd.toString().padStart(5)} títulos | R$ ${valor.toFixed(2)}`);
  }

  // 6. Duplicatas
  console.log('\n\n📊 6. VERIFICAÇÃO DE DUPLICATAS:\n');
  
  const duplicatas = await db.execute(sql`
    SELECT 
      COUNT(*) as grupos_duplicados,
      SUM(ocorrencias - 1) as titulos_duplicados,
      SUM(CAST(valor AS NUMERIC) * (ocorrencias - 1)) as valor_duplicado
    FROM (
      SELECT 
        descricao, data_competencia, valor_liquido as valor,
        COUNT(*) as ocorrencias
      FROM titulo
      WHERE deleted_at IS NULL
      GROUP BY descricao, data_competencia, valor_liquido
      HAVING COUNT(*) > 1
    ) sub
  `);

  const dup = duplicatas.rows[0] as any;
  console.log(`  Grupos com duplicatas: ${dup.grupos_duplicados || 0}`);
  console.log(`  Títulos duplicados: ${dup.titulos_duplicados || 0}`);
  console.log(`  Valor em duplicatas: R$ ${(parseFloat(dup.valor_duplicado) || 0).toFixed(2)}`);

  // 7. Análise por mês no banco
  console.log('\n\n📊 7. COMPARAÇÃO POR MÊS:\n');
  
  const dbByMonth = await db.execute(sql`
    SELECT 
      TO_CHAR(data_competencia::date, 'YYYY-MM') as mes,
      SUM(CASE WHEN tipo = 'receber' THEN CAST(valor_liquido AS NUMERIC) ELSE 0 END) as receitas,
      SUM(CASE WHEN tipo = 'pagar' THEN CAST(valor_liquido AS NUMERIC) ELSE 0 END) as despesas
    FROM titulo 
    WHERE deleted_at IS NULL
    GROUP BY TO_CHAR(data_competencia::date, 'YYYY-MM')
    ORDER BY mes
  `);

  const monthMap: Record<string, { db: { rec: number, desp: number }, raw: { rec: number, desp: number } }> = {};
  const mesIndex = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  
  for (const t of rawTotals) {
    const idx = mesIndex.indexOf(t.mes);
    const key = `2025-${(idx + 1).toString().padStart(2, '0')}`;
    monthMap[key] = { db: { rec: 0, desp: 0 }, raw: { rec: t.receitas, desp: t.despesas } };
  }
  
  for (const row of dbByMonth.rows as any[]) {
    if (!monthMap[row.mes]) monthMap[row.mes] = { db: { rec: 0, desp: 0 }, raw: { rec: 0, desp: 0 } };
    monthMap[row.mes].db = { rec: parseFloat(row.receitas) || 0, desp: parseFloat(row.despesas) || 0 };
  }

  console.log('  Mês       | DB Rec     | Raw Rec    | Diff Rec   | DB Desp    | Raw Desp   | Diff Desp');
  console.log('  ' + '-'.repeat(95));
  
  for (const [mes, data] of Object.entries(monthMap).sort()) {
    const diffRec = data.db.rec - data.raw.rec;
    const diffDesp = data.db.desp - data.raw.desp;
    console.log(`  ${mes}  | ${data.db.rec.toFixed(2).padStart(10)} | ${data.raw.rec.toFixed(2).padStart(10)} | ${(diffRec >= 0 ? '+' : '') + diffRec.toFixed(2).padStart(9)} | ${data.db.desp.toFixed(2).padStart(10)} | ${data.raw.desp.toFixed(2).padStart(10)} | ${(diffDesp >= 0 ? '+' : '') + diffDesp.toFixed(2).padStart(9)}`);
  }

  // 8. Resumo final
  console.log('\n\n' + '='.repeat(80));
  console.log('📋 RESUMO FINAL');
  console.log('='.repeat(80));
  
  console.log(`
  RAWDATA ESPERADO:
    Receitas: R$ ${rawSummary.receitas.toFixed(2)} (${rawSummary.countReceitas} lançamentos)
    Despesas: R$ ${rawSummary.despesas.toFixed(2)} (${rawSummary.countDespesas} lançamentos)
    Saldo:    R$ ${(rawSummary.receitas - rawSummary.despesas).toFixed(2)}

  BANCO DE DADOS:
    Receitas: R$ ${dbReceitas.toFixed(2)} (${dbCountRec} títulos)
    Despesas: R$ ${dbDespesas.toFixed(2)} (${dbCountDesp} títulos)
    Saldo:    R$ ${(dbReceitas - dbDespesas).toFixed(2)}

  DIFERENÇA:
    Receitas: ${diffReceitas >= 0 ? '+' : ''}R$ ${diffReceitas.toFixed(2)}
    Despesas: ${diffDespesas >= 0 ? '+' : ''}R$ ${diffDespesas.toFixed(2)}
    Saldo:    ${diffSaldo >= 0 ? '+' : ''}R$ ${diffSaldo.toFixed(2)}
  `);

  if (Math.abs(diffSaldo) > 1000) {
    console.log('  ⚠️  AÇÃO NECESSÁRIA: Diferença significativa detectada!');
    console.log('  Execute: npx tsx scripts/fix-titulos-rawdata.ts');
  } else {
    console.log('  ✅ Dados parecem consistentes.');
  }

  console.log('\n' + '='.repeat(80) + '\n');
}

audit().catch(console.error);

