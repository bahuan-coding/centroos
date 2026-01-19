/**
 * Script para corrigir valores de migration que estão em centavos
 * E remover duplicatas entre migration e rawdata
 * Executar: npx tsx scripts/fix-migration-values.ts
 */

import { neon } from '@netlify/neon';
import { drizzle } from 'drizzle-orm/neon-http';
import { sql } from 'drizzle-orm';

const databaseUrl = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('❌ DATABASE_URL não configurada');
  process.exit(1);
}

const sqlClient = neon(databaseUrl);
const db = drizzle(sqlClient);

const DRY_RUN = process.argv.includes('--dry-run');

async function fix() {
  console.log('\n========================================');
  console.log('🔧 CORREÇÃO: Valores Migration x100');
  console.log(DRY_RUN ? '⚠️  MODO DRY-RUN (sem alterações)' : '🚨 MODO EXECUÇÃO REAL');
  console.log('========================================\n');

  // 1. Identificar registros de migration que tem equivalente em rawdata
  // Estes são duplicados e devem ser removidos
  console.log('📋 1. IDENTIFICANDO DUPLICATAS (migration vs rawdata)\n');
  
  const duplicatasMigration = await db.execute(sql`
    SELECT 
      m.id as migration_id,
      m.descricao,
      m.valor_liquido as valor_migration,
      r.valor_liquido as valor_rawdata,
      m.data_competencia,
      CASE 
        WHEN m.valor_liquido::numeric = r.valor_liquido::numeric * 100 THEN 'x100'
        WHEN m.valor_liquido::numeric = r.valor_liquido::numeric * 10 THEN 'x10'
        WHEN m.valor_liquido::numeric = r.valor_liquido::numeric THEN 'igual'
        ELSE 'outro'
      END as fator
    FROM titulo m
    INNER JOIN titulo r ON 
      DATE(m.data_competencia) = DATE(r.data_competencia)
      AND LOWER(TRIM(m.descricao)) = LOWER(TRIM(r.descricao))
      AND m.tipo = r.tipo
    WHERE m.source_system = 'migration'
      AND r.source_system LIKE 'rawdata_%'
      AND m.deleted_at IS NULL
      AND r.deleted_at IS NULL
    ORDER BY m.data_competencia, m.descricao
  `);

  console.log(`Encontradas ${duplicatasMigration.rows.length} duplicatas migration/rawdata:`);
  console.table(duplicatasMigration.rows.slice(0, 20));

  // 2. Soft-delete das duplicatas de migration (manter rawdata)
  const idsParaDeletar = duplicatasMigration.rows.map((r: any) => r.migration_id);
  
  if (idsParaDeletar.length > 0) {
    console.log(`\n🗑️  2. REMOVENDO ${idsParaDeletar.length} DUPLICATAS DE MIGRATION\n`);
    
    if (!DRY_RUN) {
      for (const id of idsParaDeletar) {
        await db.execute(sql`
          UPDATE titulo 
          SET deleted_at = NOW(), 
              observacoes = COALESCE(observacoes, '') || ' [REMOVIDO: duplicata de rawdata]'
          WHERE id = ${id}
        `);
      }
      console.log(`✅ ${idsParaDeletar.length} registros marcados como deletados`);
    } else {
      console.log(`[DRY-RUN] Seriam deletados: ${idsParaDeletar.length} registros`);
    }
  }

  // 3. Para migration sem correspondência em rawdata, dividir valores por 100
  console.log('\n📉 3. CORRIGINDO VALORES DE MIGRATION REMANESCENTES (÷100)\n');
  
  const migrationRestantes = await db.execute(sql`
    SELECT 
      id,
      descricao,
      valor_liquido,
      valor_original,
      data_competencia,
      tipo
    FROM titulo 
    WHERE source_system = 'migration'
      AND deleted_at IS NULL
      AND valor_liquido::numeric > 100
    ORDER BY valor_liquido::numeric DESC
    LIMIT 50
  `);

  console.log(`${migrationRestantes.rows.length} registros de migration com valor > R$ 100:`);
  console.table(migrationRestantes.rows.slice(0, 20));

  if (!DRY_RUN) {
    // Corrigir valores dividindo por 100
    const result = await db.execute(sql`
      UPDATE titulo 
      SET 
        valor_liquido = CAST(valor_liquido::numeric / 100 AS numeric(14,2)),
        valor_original = CAST(valor_original::numeric / 100 AS numeric(14,2)),
        observacoes = COALESCE(observacoes, '') || ' [CORRIGIDO: valor dividido por 100]'
      WHERE source_system = 'migration'
        AND deleted_at IS NULL
        AND valor_liquido::numeric > 100
    `);
    console.log(`✅ Valores corrigidos (÷100)`);
  } else {
    console.log(`[DRY-RUN] Seriam corrigidos dividindo por 100`);
  }

  // 4. Corrigir migration-rawdata com tipos errados e duplicatas
  console.log('\n📋 4. CORRIGINDO MIGRATION-RAWDATA\n');
  
  // 4a. Remover duplicatas de migration-rawdata que já existem em rawdata
  const duplicatasMigrationRawdata = await db.execute(sql`
    SELECT 
      m.id as migration_rawdata_id,
      m.descricao,
      m.valor_liquido,
      m.data_competencia
    FROM titulo m
    INNER JOIN titulo r ON 
      DATE(m.data_competencia) = DATE(r.data_competencia)
      AND ABS(m.valor_liquido::numeric - r.valor_liquido::numeric) < 0.01
      AND m.tipo = r.tipo
    WHERE m.source_system = 'migration-rawdata'
      AND r.source_system LIKE 'rawdata_%'
      AND m.deleted_at IS NULL
      AND r.deleted_at IS NULL
  `);
  
  console.log(`Duplicatas migration-rawdata: ${duplicatasMigrationRawdata.rows.length}`);
  
  if (duplicatasMigrationRawdata.rows.length > 0 && !DRY_RUN) {
    const ids = duplicatasMigrationRawdata.rows.map((r: any) => r.migration_rawdata_id);
    for (const id of ids) {
      await db.execute(sql`
        UPDATE titulo 
        SET deleted_at = NOW()
        WHERE id = ${id}
      `);
    }
    console.log(`✅ ${ids.length} duplicatas migration-rawdata removidas`);
  }
  
  // 4b. Corrigir tipo errado (Premiação como 'pagar' deveria ser 'receber')
  console.log('\nCorrigindo tipos errados em migration-rawdata...');
  if (!DRY_RUN) {
    await db.execute(sql`
      UPDATE titulo 
      SET tipo = 'receber',
          observacoes = COALESCE(observacoes, '') || ' [CORRIGIDO: tipo alterado de pagar para receber]'
      WHERE source_system = 'migration-rawdata'
        AND deleted_at IS NULL
        AND tipo = 'pagar'
        AND (LOWER(descricao) LIKE '%premiação%' OR LOWER(descricao) LIKE '%premiacao%')
    `);
    console.log('✅ Tipos corrigidos');
  }
  
  const migrationRawdata = await db.execute(sql`
    SELECT 
      id,
      descricao,
      valor_liquido,
      data_competencia,
      tipo
    FROM titulo 
    WHERE source_system = 'migration-rawdata'
      AND deleted_at IS NULL
    ORDER BY valor_liquido::numeric DESC
    LIMIT 20
  `);
  console.table(migrationRawdata.rows);

  // 5. Relatório final
  console.log('\n📊 5. TOTAIS APÓS CORREÇÃO\n');
  
  const totaisNovembro = await db.execute(sql`
    SELECT 
      tipo,
      source_system,
      COUNT(*) as qtd,
      SUM(valor_liquido::numeric) as total
    FROM titulo 
    WHERE deleted_at IS NULL
      AND data_competencia >= '2025-11-01'
      AND data_competencia <= '2025-11-30'
    GROUP BY tipo, source_system
    ORDER BY tipo, total DESC
  `);
  console.table(totaisNovembro.rows);

  console.log('\n========================================');
  console.log(DRY_RUN ? '⚠️  CONCLUÍDO (DRY-RUN - nenhuma alteração feita)' : '✅ CORREÇÃO CONCLUÍDA');
  console.log('========================================\n');
  
  if (DRY_RUN) {
    console.log('Para aplicar as correções, execute sem --dry-run:');
    console.log('  npx tsx scripts/fix-migration-values.ts\n');
  }
}

fix().catch(console.error);

