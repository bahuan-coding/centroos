/**
 * Script para remover importações CSV duplicadas
 * Os dados de csv_import e csv_import_nao_associado são duplicatas dos rawdata_*
 * 
 * Executar: npx tsx scripts/cleanup-csv-import-duplicados.ts
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
  console.log('🧹 LIMPEZA DE IMPORTAÇÕES CSV DUPLICADAS\n');
  console.log('='.repeat(70));

  // Antes
  const antes = await db.execute(sql`
    SELECT 
      COUNT(*) as total,
      SUM(CAST(valor_liquido AS NUMERIC)) as total_valor
    FROM titulo 
    WHERE deleted_at IS NULL AND tipo = 'receber'
  `);
  
  const antesTotal = parseInt((antes.rows[0] as any).total);
  const antesValor = parseFloat((antes.rows[0] as any).total_valor) || 0;
  
  console.log(`\n📊 ANTES:`);
  console.log(`   Títulos: ${antesTotal}`);
  console.log(`   Valor: R$ ${antesValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);

  // Identificar csv_import que têm correspondência nos rawdata_*
  console.log('\n\n🔍 Analisando duplicações entre csv_import e rawdata_*...');
  
  // Mostrar quantos csv_import existem
  const csvImports = await db.execute(sql`
    SELECT 
      source_system,
      COUNT(*) as qtd,
      SUM(CAST(valor_liquido AS NUMERIC)) as total
    FROM titulo 
    WHERE deleted_at IS NULL 
      AND tipo = 'receber' 
      AND source_system IN ('csv_import', 'csv_import_nao_associado')
    GROUP BY source_system
  `);
  
  console.log('\n   Importações CSV existentes:');
  for (const row of csvImports.rows as any[]) {
    const valor = parseFloat(row.total) || 0;
    console.log(`   - ${row.source_system}: ${row.qtd} títulos = R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  }

  // Verificar quantos têm match exato nos rawdata_*
  const matchExatos = await db.execute(sql`
    SELECT COUNT(*) as count
    FROM titulo csv
    INNER JOIN titulo raw ON 
      csv.pessoa_id = raw.pessoa_id AND
      csv.data_competencia = raw.data_competencia AND
      csv.valor_liquido = raw.valor_liquido AND
      raw.source_system LIKE 'rawdata_%' AND
      raw.deleted_at IS NULL
    WHERE csv.deleted_at IS NULL 
      AND csv.tipo = 'receber'
      AND csv.source_system IN ('csv_import', 'csv_import_nao_associado')
  `);
  
  console.log(`\n   CSV com match exato em rawdata_*: ${(matchExatos.rows[0] as any).count}`);

  // Soft-delete todos os csv_import e csv_import_nao_associado
  // Pois os dados dos rawdata_* são mais completos e confiáveis
  console.log('\n\n🗑️ Removendo títulos csv_import e csv_import_nao_associado...');
  
  const result = await db.execute(sql`
    UPDATE titulo 
    SET deleted_at = NOW(),
        observacoes = COALESCE(observacoes, '') || ' [CLEANUP: csv_import removido em favor de rawdata_* - ' || NOW()::text || ']'
    WHERE deleted_at IS NULL 
      AND tipo = 'receber' 
      AND source_system IN ('csv_import', 'csv_import_nao_associado')
  `);
  
  console.log(`   ✅ Títulos removidos`);

  // Resultado
  console.log('\n' + '='.repeat(70));
  console.log('📊 RESULTADO FINAL');
  console.log('='.repeat(70));

  const depois = await db.execute(sql`
    SELECT 
      COUNT(*) as total,
      COUNT(DISTINCT pessoa_id) as doadores,
      SUM(CAST(valor_liquido AS NUMERIC)) as total_valor
    FROM titulo 
    WHERE deleted_at IS NULL AND tipo = 'receber'
  `);
  
  const depoisTotal = parseInt((depois.rows[0] as any).total);
  const depoisDoadores = parseInt((depois.rows[0] as any).doadores);
  const depoisValor = parseFloat((depois.rows[0] as any).total_valor) || 0;
  
  console.log(`\n  ANTES:`);
  console.log(`     Títulos: ${antesTotal}`);
  console.log(`     Valor: R$ ${antesValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  
  console.log(`\n  DEPOIS:`);
  console.log(`     Títulos: ${depoisTotal}`);
  console.log(`     Doadores: ${depoisDoadores}`);
  console.log(`     Valor: R$ ${depoisValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  console.log(`     Média/doação: R$ ${(depoisValor / depoisTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  
  console.log(`\n  REMOVIDOS:`);
  console.log(`     Títulos: ${antesTotal - depoisTotal}`);
  console.log(`     Valor: R$ ${(antesValor - depoisValor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  
  console.log(`\n  ⚠️ VALOR ESPERADO (rawdata): ~R$ 22.090,50`);
  console.log(`  📊 DIFERENÇA: R$ ${(depoisValor - 22090.50).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);

  // Distribuição final
  console.log('\n\n📦 DISTRIBUIÇÃO POR SOURCE_SYSTEM (final):');
  
  const bySource = await db.execute(sql`
    SELECT 
      COALESCE(source_system, 'NULL') as source_system,
      COUNT(*) as quantidade,
      SUM(CAST(valor_liquido AS NUMERIC)) as total_valor
    FROM titulo 
    WHERE deleted_at IS NULL AND tipo = 'receber'
    GROUP BY source_system
    ORDER BY total_valor DESC
  `);
  
  let totalFinal = 0;
  for (const row of bySource.rows as any[]) {
    const valor = parseFloat(row.total_valor) || 0;
    totalFinal += valor;
    console.log(`   ${row.source_system.padEnd(30)} | ${String(row.quantidade).padStart(4)} títulos | R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  }
  
  console.log(`   ${'─'.repeat(55)}`);
  console.log(`   ${'TOTAL'.padEnd(30)} | ${String(depoisTotal).padStart(4)} títulos | R$ ${totalFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  
  console.log('\n' + '='.repeat(70) + '\n');
}

cleanup().catch(console.error);



















