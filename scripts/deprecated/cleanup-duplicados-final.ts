/**
 * Script de limpeza final - Remove csv_import duplicados onde rawdata_* existe
 * 
 * Estratégia:
 * - Para cada mês que tem AMBOS csv_import E rawdata_*, manter apenas rawdata_*
 * - Manter csv_import onde não há rawdata_* correspondente
 * 
 * Executar: npx tsx scripts/cleanup-duplicados-final.ts
 */

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { sql } from 'drizzle-orm';
import * as schema from '../drizzle/schema';

const databaseUrl = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('❌ DATABASE_URL não configurada');
  process.exit(1);
}

const sqlClient = neon(databaseUrl);
const db = drizzle(sqlClient, { schema });

async function cleanup() {
  console.log('🧹 LIMPEZA FINAL DE DUPLICADOS\n');
  console.log('='.repeat(70));
  console.log('Estratégia: Remover csv_import onde rawdata_* existe para o mesmo mês');
  console.log('='.repeat(70));

  // Antes
  const antes = await db.execute(sql`
    SELECT COUNT(*) as total, SUM(CAST(valor_liquido AS NUMERIC)) as valor
    FROM titulo WHERE deleted_at IS NULL AND tipo = 'receber'
  `);
  
  console.log(`\n📊 ANTES: ${(antes.rows[0] as any).total} títulos = R$ ${parseFloat((antes.rows[0] as any).valor).toLocaleString('pt-BR', {minimumFractionDigits: 2})}`);

  // Identificar meses que têm rawdata_*
  const mesesComRawdata = await db.execute(sql`
    SELECT DISTINCT TO_CHAR(data_competencia::date, 'YYYY-MM') as mes
    FROM titulo 
    WHERE deleted_at IS NULL 
      AND tipo = 'receber'
      AND source_system LIKE 'rawdata_%'
  `);
  
  const meses = (mesesComRawdata.rows as any[]).map(r => r.mes);
  console.log(`\n📅 Meses com dados rawdata_*: ${meses.join(', ')}`);

  // Para cada mês com rawdata_*, remover csv_import
  console.log('\n🗑️ Removendo csv_import duplicados...\n');
  
  let totalRemovidos = 0;
  let valorRemovido = 0;
  
  for (const mes of meses) {
    // Contar csv_import neste mês
    const csvCount = await db.execute(sql`
      SELECT COUNT(*) as qtd, COALESCE(SUM(CAST(valor_liquido AS NUMERIC)), 0) as valor
      FROM titulo 
      WHERE deleted_at IS NULL 
        AND tipo = 'receber'
        AND source_system IN ('csv_import', 'csv_import_nao_associado')
        AND TO_CHAR(data_competencia::date, 'YYYY-MM') = ${mes}
    `);
    
    const qtd = parseInt((csvCount.rows[0] as any).qtd);
    const valor = parseFloat((csvCount.rows[0] as any).valor) || 0;
    
    if (qtd > 0) {
      // Soft-delete os csv_import deste mês
      await db.execute(sql`
        UPDATE titulo 
        SET deleted_at = NOW(),
            observacoes = COALESCE(observacoes, '') || ' [CLEANUP-FINAL: csv_import removido - mês ' || ${mes} || ' coberto por rawdata_*]'
        WHERE deleted_at IS NULL 
          AND tipo = 'receber'
          AND source_system IN ('csv_import', 'csv_import_nao_associado')
          AND TO_CHAR(data_competencia::date, 'YYYY-MM') = ${mes}
      `);
      
      totalRemovidos += qtd;
      valorRemovido += valor;
      console.log(`   ${mes}: ${qtd} títulos removidos = R$ ${valor.toFixed(2)}`);
    }
  }
  
  console.log(`\n   ────────────────────────────────────────`);
  console.log(`   TOTAL: ${totalRemovidos} títulos removidos = R$ ${valorRemovido.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`);

  // Resultado
  console.log('\n' + '='.repeat(70));
  console.log('📊 RESULTADO FINAL');
  console.log('='.repeat(70));

  const depois = await db.execute(sql`
    SELECT 
      COUNT(*) as total,
      COUNT(DISTINCT pessoa_id) as doadores,
      SUM(CAST(valor_liquido AS NUMERIC)) as valor
    FROM titulo WHERE deleted_at IS NULL AND tipo = 'receber'
  `);
  
  const depoisTotal = parseInt((depois.rows[0] as any).total);
  const depoisDoadores = parseInt((depois.rows[0] as any).doadores);
  const depoisValor = parseFloat((depois.rows[0] as any).valor) || 0;
  
  console.log(`\n  Total títulos: ${depoisTotal}`);
  console.log(`  Total doadores: ${depoisDoadores}`);
  console.log(`  Valor total: R$ ${depoisValor.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`);
  console.log(`  Média/doação: R$ ${(depoisValor / depoisTotal).toLocaleString('pt-BR', {minimumFractionDigits: 2})}`);
  
  console.log(`\n  ⚠️ VALOR ESPERADO: ~R$ 22.090,50`);
  console.log(`  📊 DIFERENÇA: R$ ${(depoisValor - 22090.50).toLocaleString('pt-BR', {minimumFractionDigits: 2})}`);

  // Por mês
  console.log('\n\n📅 POR MÊS (após limpeza):');
  
  const byMonth = await db.execute(sql`
    SELECT 
      TO_CHAR(data_competencia::date, 'YYYY-MM') as mes,
      COUNT(*) as qtd,
      SUM(CAST(valor_liquido AS NUMERIC)) as total
    FROM titulo 
    WHERE deleted_at IS NULL AND tipo = 'receber'
    GROUP BY TO_CHAR(data_competencia::date, 'YYYY-MM')
    ORDER BY mes
  `);
  
  let totalFinal = 0;
  for (const row of byMonth.rows as any[]) {
    const valor = parseFloat(row.total) || 0;
    totalFinal += valor;
    console.log(`   ${row.mes} | ${String(row.qtd).padStart(3)} títulos | R$ ${valor.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`);
  }
  
  console.log(`   ────────────────────────────────────────`);
  console.log(`   TOTAL   | R$ ${totalFinal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`);
  
  console.log('\n' + '='.repeat(70) + '\n');
}

cleanup().catch(console.error);




















