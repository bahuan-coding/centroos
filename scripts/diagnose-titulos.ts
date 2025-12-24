/**
 * Script de diagnóstico para identificar duplicações nos títulos
 * Executar: npx tsx scripts/diagnose-titulos.ts
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

async function diagnose() {
  console.log('🔍 DIAGNÓSTICO DE TÍTULOS - Auditoria de Duplicações\n');
  console.log('='.repeat(70));

  // 1. Contagem por sourceSystem
  console.log('\n📊 1. TÍTULOS POR SOURCE_SYSTEM (tipo = receber):\n');
  
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
  
  let totalGeral = 0;
  let qtdGeral = 0;
  
  for (const row of bySource.rows as any[]) {
    const valor = parseFloat(row.total_valor) || 0;
    totalGeral += valor;
    qtdGeral += parseInt(row.quantidade);
    console.log(`  ${row.source_system.padEnd(30)} | ${String(row.quantidade).padStart(5)} títulos | R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  }
  
  console.log(`  ${'─'.repeat(60)}`);
  console.log(`  ${'TOTAL'.padEnd(30)} | ${String(qtdGeral).padStart(5)} títulos | R$ ${totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);

  // 2. Identificar duplicados exatos (mesma pessoa, data, valor)
  console.log('\n\n📋 2. POTENCIAIS DUPLICAÇÕES (mesma pessoa + data + valor):\n');
  
  const duplicados = await db.execute(sql`
    SELECT 
      p.nome,
      t.data_competencia,
      t.valor_liquido,
      COUNT(*) as ocorrencias,
      STRING_AGG(DISTINCT t.source_system, ', ') as sources,
      STRING_AGG(t.id::text, ', ') as ids
    FROM titulo t
    LEFT JOIN pessoa p ON p.id = t.pessoa_id
    WHERE t.deleted_at IS NULL AND t.tipo = 'receber'
    GROUP BY p.nome, t.data_competencia, t.valor_liquido
    HAVING COUNT(*) > 1
    ORDER BY COUNT(*) DESC, p.nome
    LIMIT 50
  `);
  
  if ((duplicados.rows as any[]).length === 0) {
    console.log('  ✅ Nenhuma duplicação exata encontrada.');
  } else {
    console.log(`  ⚠️ Encontradas ${(duplicados.rows as any[]).length} combinações com duplicações:\n`);
    
    let totalDuplicadoValor = 0;
    let totalDuplicadoQtd = 0;
    
    for (const row of (duplicados.rows as any[]).slice(0, 20)) {
      const valor = parseFloat(row.valor_liquido) || 0;
      const qtdExtra = parseInt(row.ocorrencias) - 1; // Apenas as cópias extras
      totalDuplicadoValor += valor * qtdExtra;
      totalDuplicadoQtd += qtdExtra;
      
      console.log(`  ${(row.nome || 'Sem nome').substring(0, 30).padEnd(30)} | ${row.data_competencia} | R$ ${valor.toFixed(2).padStart(10)} | ${row.ocorrencias}x | Sources: ${row.sources}`);
    }
    
    if ((duplicados.rows as any[]).length > 20) {
      console.log(`  ... e mais ${(duplicados.rows as any[]).length - 20} duplicações`);
    }
    
    // Calcular total de valor duplicado
    const totalDupQuery = await db.execute(sql`
      WITH duplicados AS (
        SELECT 
          pessoa_id, data_competencia, valor_liquido,
          COUNT(*) as ocorrencias
        FROM titulo
        WHERE deleted_at IS NULL AND tipo = 'receber'
        GROUP BY pessoa_id, data_competencia, valor_liquido
        HAVING COUNT(*) > 1
      )
      SELECT 
        SUM(CAST(valor_liquido AS NUMERIC) * (ocorrencias - 1)) as valor_duplicado,
        SUM(ocorrencias - 1) as qtd_duplicados
      FROM duplicados
    `);
    
    const valorDup = parseFloat((totalDupQuery.rows[0] as any)?.valor_duplicado) || 0;
    const qtdDup = parseInt((totalDupQuery.rows[0] as any)?.qtd_duplicados) || 0;
    
    console.log(`\n  📈 RESUMO DUPLICAÇÕES:`);
    console.log(`     Quantidade de títulos duplicados: ${qtdDup}`);
    console.log(`     Valor total em duplicações: R$ ${valorDup.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  }

  // 3. Verificar por import_batch_id
  console.log('\n\n📦 3. TÍTULOS POR IMPORT_BATCH_ID (tipo = receber):\n');
  
  const byBatch = await db.execute(sql`
    SELECT 
      COALESCE(import_batch_id::text, 'NULL') as batch_id,
      COALESCE(source_system, 'NULL') as source_system,
      COUNT(*) as quantidade,
      SUM(CAST(valor_liquido AS NUMERIC)) as total_valor
    FROM titulo 
    WHERE deleted_at IS NULL AND tipo = 'receber'
    GROUP BY import_batch_id, source_system
    ORDER BY total_valor DESC
  `);
  
  for (const row of (byBatch.rows as any[]).slice(0, 15)) {
    const valor = parseFloat(row.total_valor) || 0;
    const batchShort = row.batch_id === 'NULL' ? 'NULL' : row.batch_id.substring(0, 8) + '...';
    console.log(`  ${batchShort.padEnd(15)} | ${row.source_system.padEnd(25)} | ${String(row.quantidade).padStart(5)} títulos | R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  }

  // 4. Análise por mês
  console.log('\n\n📅 4. RECEITAS POR MÊS (tipo = receber):\n');
  
  const byMonth = await db.execute(sql`
    SELECT 
      TO_CHAR(data_competencia::date, 'YYYY-MM') as mes,
      COUNT(*) as quantidade,
      SUM(CAST(valor_liquido AS NUMERIC)) as total_valor
    FROM titulo 
    WHERE deleted_at IS NULL AND tipo = 'receber'
    GROUP BY TO_CHAR(data_competencia::date, 'YYYY-MM')
    ORDER BY mes
  `);
  
  for (const row of byMonth.rows as any[]) {
    const valor = parseFloat(row.total_valor) || 0;
    console.log(`  ${row.mes} | ${String(row.quantidade).padStart(4)} títulos | R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  }

  // 5. Top 10 pessoas por arrecadação
  console.log('\n\n👥 5. TOP 10 PESSOAS POR ARRECADAÇÃO:\n');
  
  const topPessoas = await db.execute(sql`
    SELECT 
      p.nome,
      COUNT(t.id) as qtd_doacoes,
      SUM(CAST(t.valor_liquido AS NUMERIC)) as total_valor
    FROM titulo t
    LEFT JOIN pessoa p ON p.id = t.pessoa_id
    WHERE t.deleted_at IS NULL AND t.tipo = 'receber'
    GROUP BY p.id, p.nome
    ORDER BY total_valor DESC
    LIMIT 10
  `);
  
  for (const row of topPessoas.rows as any[]) {
    const valor = parseFloat(row.total_valor) || 0;
    console.log(`  ${(row.nome || 'Sem nome').substring(0, 35).padEnd(35)} | ${String(row.qtd_doacoes).padStart(3)} doações | R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  }

  // 6. Resumo final
  console.log('\n\n' + '='.repeat(70));
  console.log('📊 RESUMO FINAL');
  console.log('='.repeat(70));
  
  const resumo = await db.execute(sql`
    SELECT 
      COUNT(*) as total_titulos,
      COUNT(DISTINCT pessoa_id) as total_doadores,
      SUM(CAST(valor_liquido AS NUMERIC)) as total_arrecadado
    FROM titulo 
    WHERE deleted_at IS NULL AND tipo = 'receber'
  `);
  
  const r = resumo.rows[0] as any;
  const totalArrecadado = parseFloat(r.total_arrecadado) || 0;
  const mediaPorDoacao = totalArrecadado / parseInt(r.total_titulos);
  
  console.log(`\n  Total de títulos (receber): ${r.total_titulos}`);
  console.log(`  Total de doadores únicos: ${r.total_doadores}`);
  console.log(`  Total arrecadado: R$ ${totalArrecadado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  console.log(`  Média por doação: R$ ${mediaPorDoacao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  
  console.log('\n  ⚠️ VALOR ESPERADO (rawdata): ~R$ 22.090,50');
  console.log(`  📊 DIFERENÇA: R$ ${(totalArrecadado - 22090.50).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  
  console.log('\n' + '='.repeat(70) + '\n');
}

diagnose().catch(console.error);

















