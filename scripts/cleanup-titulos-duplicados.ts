/**
 * Script de limpeza para remover títulos duplicados e órfãos
 * Executar: npx tsx scripts/cleanup-titulos-duplicados.ts
 * 
 * AÇÕES:
 * 1. Remove títulos onde pessoa_id é NULL (órfãos)
 * 2. Remove títulos duplicados (mesma pessoa + data + valor), mantendo apenas 1
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
  console.log('🧹 LIMPEZA DE TÍTULOS DUPLICADOS E ÓRFÃOS\n');
  console.log('='.repeat(70));

  // Antes - contagem
  const antes = await db.execute(sql`
    SELECT 
      COUNT(*) as total,
      SUM(CAST(valor_liquido AS NUMERIC)) as total_valor
    FROM titulo 
    WHERE deleted_at IS NULL AND tipo = 'receber'
  `);
  
  const antesTotal = parseInt((antes.rows[0] as any).total);
  const antesValor = parseFloat((antes.rows[0] as any).total_valor) || 0;
  
  console.log(`\n📊 ANTES DA LIMPEZA:`);
  console.log(`   Títulos: ${antesTotal}`);
  console.log(`   Valor: R$ ${antesValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);

  // ============================================================================
  // PASSO 1: Soft-delete de títulos onde pessoa_id é NULL
  // ============================================================================
  console.log('\n\n🔹 PASSO 1: Removendo títulos sem pessoa associada (pessoa_id = NULL)...');
  
  const orphansCount = await db.execute(sql`
    SELECT COUNT(*) as count, SUM(CAST(valor_liquido AS NUMERIC)) as total
    FROM titulo 
    WHERE deleted_at IS NULL AND tipo = 'receber' AND pessoa_id IS NULL
  `);
  
  const orphanQtd = parseInt((orphansCount.rows[0] as any).count) || 0;
  const orphanValor = parseFloat((orphansCount.rows[0] as any).total) || 0;
  
  console.log(`   Encontrados: ${orphanQtd} títulos órfãos = R$ ${orphanValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  
  if (orphanQtd > 0) {
    await db.execute(sql`
      UPDATE titulo 
      SET deleted_at = NOW(), 
          observacoes = COALESCE(observacoes, '') || ' [CLEANUP: Removido por pessoa_id NULL em ' || NOW()::text || ']'
      WHERE deleted_at IS NULL AND tipo = 'receber' AND pessoa_id IS NULL
    `);
    console.log(`   ✅ ${orphanQtd} títulos marcados como deletados.`);
  }

  // ============================================================================
  // PASSO 2: Identificar e remover duplicados (manter apenas 1 por grupo)
  // ============================================================================
  console.log('\n🔹 PASSO 2: Removendo títulos duplicados (mesma pessoa + data + valor)...');
  
  // Identificar grupos de duplicados e os IDs a manter (o mais recente com source_system mais específico)
  const duplicadosParaRemover = await db.execute(sql`
    WITH ranked AS (
      SELECT 
        id,
        pessoa_id,
        data_competencia,
        valor_liquido,
        source_system,
        ROW_NUMBER() OVER (
          PARTITION BY pessoa_id, data_competencia, valor_liquido 
          ORDER BY 
            -- Prioridade: rawdata_*_2025 > outros source_systems
            CASE 
              WHEN source_system LIKE 'rawdata_%' THEN 1
              WHEN source_system = 'migration' THEN 2
              WHEN source_system = 'migration-rawdata' THEN 3
              WHEN source_system = 'csv_import' THEN 4
              WHEN source_system = 'csv_import_nao_associado' THEN 5
              ELSE 6
            END,
            created_at DESC
        ) as rn
      FROM titulo
      WHERE deleted_at IS NULL AND tipo = 'receber' AND pessoa_id IS NOT NULL
    )
    SELECT id FROM ranked WHERE rn > 1
  `);
  
  const idsParaRemover = (duplicadosParaRemover.rows as any[]).map(r => r.id);
  console.log(`   Encontrados: ${idsParaRemover.length} títulos duplicados para remover`);
  
  if (idsParaRemover.length > 0) {
    // Fazer soft-delete em batches de 100
    const batchSize = 100;
    let removidos = 0;
    
    for (let i = 0; i < idsParaRemover.length; i += batchSize) {
      const batch = idsParaRemover.slice(i, i + batchSize);
      
      await db.execute(sql`
        UPDATE titulo 
        SET deleted_at = NOW(),
            observacoes = COALESCE(observacoes, '') || ' [CLEANUP: Removido como duplicado em ' || NOW()::text || ']'
        WHERE id = ANY(${batch}::uuid[])
      `);
      
      removidos += batch.length;
      process.stdout.write(`\r   Removidos: ${removidos}/${idsParaRemover.length}...`);
    }
    
    console.log(`\n   ✅ ${idsParaRemover.length} títulos duplicados marcados como deletados.`);
  }

  // ============================================================================
  // PASSO 3: Limpar título_baixa órfãos
  // ============================================================================
  console.log('\n🔹 PASSO 3: Limpando baixas órfãs...');
  
  const baixasOrfas = await db.execute(sql`
    SELECT COUNT(*) as count 
    FROM titulo_baixa tb
    LEFT JOIN titulo t ON t.id = tb.titulo_id
    WHERE t.deleted_at IS NOT NULL OR t.id IS NULL
  `);
  
  const baixasOrfasCount = parseInt((baixasOrfas.rows[0] as any).count) || 0;
  console.log(`   Encontradas: ${baixasOrfasCount} baixas órfãs`);
  
  if (baixasOrfasCount > 0) {
    await db.execute(sql`
      DELETE FROM titulo_baixa 
      WHERE titulo_id IN (
        SELECT t.id FROM titulo t WHERE t.deleted_at IS NOT NULL
      )
    `);
    console.log(`   ✅ ${baixasOrfasCount} baixas órfãs removidas.`);
  }

  // ============================================================================
  // RESULTADO FINAL
  // ============================================================================
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
  console.log(`  📊 DIFERENÇA ATUAL: R$ ${(depoisValor - 22090.50).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  
  // Mostrar distribuição por source_system
  console.log('\n\n📦 DISTRIBUIÇÃO POR SOURCE_SYSTEM (após limpeza):');
  
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
  
  for (const row of bySource.rows as any[]) {
    const valor = parseFloat(row.total_valor) || 0;
    console.log(`   ${row.source_system.padEnd(30)} | ${String(row.quantidade).padStart(4)} títulos | R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  }
  
  console.log('\n' + '='.repeat(70) + '\n');
}

cleanup().catch(console.error);







