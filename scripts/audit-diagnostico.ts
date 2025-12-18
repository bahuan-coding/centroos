/**
 * Script de Diagnóstico - Auditoria Dashboard vs Rawdata
 * Executar: npx tsx scripts/audit-diagnostico.ts
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

async function diagnostico() {
  console.log('\n========================================');
  console.log('🔍 DIAGNÓSTICO: Dashboard vs Rawdata');
  console.log('========================================\n');

  // 1. Totais gerais
  console.log('📊 1. TOTAIS GERAIS DA TABELA TITULO\n');
  const totaisGerais = await db.execute(sql`
    SELECT 
      tipo,
      COUNT(*) as quantidade,
      SUM(valor_liquido::numeric) as total,
      MIN(data_competencia) as primeira_data,
      MAX(data_competencia) as ultima_data
    FROM titulo 
    WHERE deleted_at IS NULL
    GROUP BY tipo
    ORDER BY tipo
  `);
  console.table(totaisGerais.rows);

  // 2. Totais por mês
  console.log('\n📅 2. TOTAIS POR MÊS (2025)\n');
  const totaisPorMes = await db.execute(sql`
    SELECT 
      TO_CHAR(data_competencia::date, 'YYYY-MM') as mes,
      tipo,
      COUNT(*) as qtd,
      SUM(valor_liquido::numeric) as total
    FROM titulo 
    WHERE deleted_at IS NULL
      AND EXTRACT(YEAR FROM data_competencia::date) = 2025
    GROUP BY TO_CHAR(data_competencia::date, 'YYYY-MM'), tipo
    ORDER BY mes, tipo
  `);
  console.table(totaisPorMes.rows);

  // 3. Novembro 2025 especificamente
  console.log('\n📆 3. NOVEMBRO 2025 - DETALHAMENTO\n');
  const novembro = await db.execute(sql`
    SELECT 
      tipo,
      natureza,
      COUNT(*) as qtd,
      SUM(valor_liquido::numeric) as total
    FROM titulo 
    WHERE deleted_at IS NULL
      AND data_competencia >= '2025-11-01'
      AND data_competencia <= '2025-11-30'
    GROUP BY tipo, natureza
    ORDER BY tipo, natureza
  `);
  console.table(novembro.rows);

  // 4. Verificar import_batch_id duplicados
  console.log('\n🔄 4. REGISTROS POR IMPORT_BATCH_ID\n');
  const porBatch = await db.execute(sql`
    SELECT 
      source_system,
      import_batch_id,
      COUNT(*) as quantidade,
      SUM(valor_liquido::numeric) as total
    FROM titulo 
    WHERE deleted_at IS NULL
    GROUP BY source_system, import_batch_id
    ORDER BY quantidade DESC
    LIMIT 20
  `);
  console.table(porBatch.rows);

  // 5. Verificar duplicações (mesmo pessoa, data, valor)
  console.log('\n⚠️  5. POSSÍVEIS DUPLICAÇÕES (pessoa + data + valor)\n');
  const duplicados = await db.execute(sql`
    SELECT 
      pessoa_id,
      data_competencia,
      valor_liquido,
      COUNT(*) as ocorrencias,
      array_agg(DISTINCT source_system) as sources
    FROM titulo 
    WHERE deleted_at IS NULL
      AND pessoa_id IS NOT NULL
    GROUP BY pessoa_id, data_competencia, valor_liquido
    HAVING COUNT(*) > 1
    ORDER BY COUNT(*) DESC
    LIMIT 20
  `);
  
  if (duplicados.rows.length === 0) {
    console.log('✅ Nenhuma duplicação encontrada');
  } else {
    console.log(`❌ ${duplicados.rows.length} combinações duplicadas encontradas:`);
    console.table(duplicados.rows);
  }

  // 6. Total de duplicações
  const totalDuplicados = await db.execute(sql`
    SELECT 
      SUM(excesso) as total_registros_duplicados,
      SUM(valor_excesso) as valor_duplicado
    FROM (
      SELECT 
        COUNT(*) - 1 as excesso,
        (COUNT(*) - 1) * valor_liquido::numeric as valor_excesso
      FROM titulo 
      WHERE deleted_at IS NULL
        AND pessoa_id IS NOT NULL
      GROUP BY pessoa_id, data_competencia, valor_liquido
      HAVING COUNT(*) > 1
    ) sub
  `);
  console.log('\n📈 RESUMO DE DUPLICAÇÕES:');
  console.table(totalDuplicados.rows);

  // 7. Comparar com rawdata esperado
  console.log('\n📋 6. COMPARAÇÃO COM RAWDATA ESPERADO (NOVEMBRO)\n');
  
  const receitasNov = await db.execute(sql`
    SELECT SUM(valor_liquido::numeric) as total
    FROM titulo 
    WHERE deleted_at IS NULL
      AND tipo = 'receber'
      AND data_competencia >= '2025-11-01'
      AND data_competencia <= '2025-11-30'
  `);
  
  const despesasNov = await db.execute(sql`
    SELECT SUM(valor_liquido::numeric) as total
    FROM titulo 
    WHERE deleted_at IS NULL
      AND tipo = 'pagar'
      AND data_competencia >= '2025-11-01'
      AND data_competencia <= '2025-11-30'
  `);
  
  const receitasBD = Number(receitasNov.rows[0]?.total) || 0;
  const despesasBD = Number(despesasNov.rows[0]?.total) || 0;
  
  console.log('┌─────────────────────────────────────────────────────────────┐');
  console.log('│              NOVEMBRO 2025 - COMPARAÇÃO                     │');
  console.log('├─────────────────┬─────────────────┬─────────────────────────┤');
  console.log('│ Métrica         │ Banco (atual)   │ Rawdata (esperado)      │');
  console.log('├─────────────────┼─────────────────┼─────────────────────────┤');
  console.log(`│ Receitas        │ R$ ${receitasBD.toLocaleString('pt-BR', {minimumFractionDigits: 2}).padStart(12)} │ ~R$ 9.494,04            │`);
  console.log(`│ Despesas        │ R$ ${despesasBD.toLocaleString('pt-BR', {minimumFractionDigits: 2}).padStart(12)} │ ~R$ 4.353,00            │`);
  console.log(`│ Resultado       │ R$ ${(receitasBD - despesasBD).toLocaleString('pt-BR', {minimumFractionDigits: 2}).padStart(12)} │ +R$ 5.141,00            │`);
  console.log('└─────────────────┴─────────────────┴─────────────────────────┘');
  
  const fatorReceitas = receitasBD / 9494.04;
  const fatorDespesas = despesasBD / 4353;
  
  console.log(`\n📊 Fator de discrepância Receitas: ${fatorReceitas.toFixed(2)}x`);
  console.log(`📊 Fator de discrepância Despesas: ${fatorDespesas.toFixed(2)}x`);

  // 8. Listar todos os source_systems únicos
  console.log('\n🏷️  7. SOURCE SYSTEMS ÚNICOS\n');
  const sources = await db.execute(sql`
    SELECT 
      source_system,
      COUNT(*) as quantidade,
      SUM(valor_liquido::numeric) as total
    FROM titulo 
    WHERE deleted_at IS NULL
    GROUP BY source_system
    ORDER BY quantidade DESC
  `);
  console.table(sources.rows);

  // 8. Investigar os dados de "migration" em novembro
  console.log('\n🔎 8. DADOS DE MIGRATION EM NOVEMBRO\n');
  const migrationNov = await db.execute(sql`
    SELECT 
      id,
      tipo,
      natureza,
      descricao,
      valor_liquido,
      data_competencia,
      source_system
    FROM titulo 
    WHERE deleted_at IS NULL
      AND data_competencia >= '2025-11-01'
      AND data_competencia <= '2025-11-30'
      AND source_system = 'migration'
    ORDER BY valor_liquido::numeric DESC
    LIMIT 20
  `);
  console.table(migrationNov.rows);

  // 9. Investigar receitas "outros" que inflam o valor
  console.log('\n💰 9. RECEITAS "OUTROS" EM NOVEMBRO (inflando valores)\n');
  const receitasOutros = await db.execute(sql`
    SELECT 
      id,
      descricao,
      valor_liquido,
      data_competencia,
      source_system
    FROM titulo 
    WHERE deleted_at IS NULL
      AND tipo = 'receber'
      AND natureza = 'outros'
      AND data_competencia >= '2025-11-01'
      AND data_competencia <= '2025-11-30'
    ORDER BY valor_liquido::numeric DESC
  `);
  console.table(receitasOutros.rows);

  // 10. Despesas grandes
  console.log('\n💸 10. DESPESAS GRANDES EM NOVEMBRO (> R$ 1000)\n');
  const despesasGrandes = await db.execute(sql`
    SELECT 
      id,
      descricao,
      valor_liquido,
      data_competencia,
      source_system,
      natureza
    FROM titulo 
    WHERE deleted_at IS NULL
      AND tipo = 'pagar'
      AND valor_liquido::numeric > 1000
      AND data_competencia >= '2025-11-01'
      AND data_competencia <= '2025-11-30'
    ORDER BY valor_liquido::numeric DESC
  `);
  console.table(despesasGrandes.rows);

  // 11. Comparar source_systems em novembro
  console.log('\n📊 11. DISTRIBUIÇÃO POR SOURCE_SYSTEM EM NOVEMBRO\n');
  const sourcesNov = await db.execute(sql`
    SELECT 
      source_system,
      tipo,
      COUNT(*) as qtd,
      SUM(valor_liquido::numeric) as total
    FROM titulo 
    WHERE deleted_at IS NULL
      AND data_competencia >= '2025-11-01'
      AND data_competencia <= '2025-11-30'
    GROUP BY source_system, tipo
    ORDER BY total DESC
  `);
  console.table(sourcesNov.rows);

  console.log('\n========================================');
  console.log('✅ Diagnóstico concluído');
  console.log('========================================\n');
}

diagnostico().catch(console.error);

