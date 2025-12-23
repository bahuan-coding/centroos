/**
 * Correção dos títulos baseado na auditoria rawdata
 * Executar: npx tsx scripts/fix-titulos-rawdata.ts
 */

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { sql, eq, isNull, and, or, ilike } from 'drizzle-orm';
import * as schema from '../drizzle/schema';

const databaseUrl = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('❌ DATABASE_URL não configurada');
  process.exit(1);
}

const sqlClient = neon(databaseUrl);
const db = drizzle(sqlClient, { schema });

async function fix() {
  console.log('\n' + '='.repeat(80));
  console.log('🔧 CORREÇÃO DE TÍTULOS - Baseado na Auditoria');
  console.log('='.repeat(80));

  // ============================================================================
  // 1. REMOVER TRANSFERÊNCIAS INTERNAS (BB RENDE FÁCIL) QUE FORAM REGISTRADAS COMO DESPESAS
  // ============================================================================
  console.log('\n📌 1. REMOVENDO TRANSFERÊNCIAS INTERNAS (BB Rende Fácil)...\n');
  
  // Primeiro, listar os títulos que serão afetados
  const transferencias = await db.execute(sql`
    SELECT id, descricao, valor_liquido, data_competencia, tipo
    FROM titulo
    WHERE deleted_at IS NULL
      AND (
        LOWER(descricao) LIKE '%rende fácil%' OR
        LOWER(descricao) LIKE '%renda fácil%' OR
        LOWER(descricao) LIKE '%bb rende%' OR
        LOWER(descricao) LIKE '%bb renda%' OR
        LOWER(descricao) LIKE '%transferência para bb%' OR
        LOWER(descricao) LIKE '%transferencia para bb%'
      )
    ORDER BY CAST(valor_liquido AS NUMERIC) DESC
  `);

  console.log(`  Encontradas ${(transferencias.rows as any[]).length} transferências internas:`);
  let totalTransf = 0;
  for (const row of (transferencias.rows as any[]).slice(0, 10)) {
    const valor = parseFloat(row.valor_liquido) || 0;
    totalTransf += valor;
    console.log(`    ${row.tipo.padEnd(8)} | R$ ${valor.toFixed(2).padStart(10)} | ${row.data_competencia} | ${(row.descricao || '').substring(0, 40)}`);
  }
  if ((transferencias.rows as any[]).length > 10) {
    for (const row of (transferencias.rows as any[]).slice(10)) {
      totalTransf += parseFloat(row.valor_liquido) || 0;
    }
    console.log(`    ... e mais ${(transferencias.rows as any[]).length - 10} transferências`);
  }
  console.log(`  Total: R$ ${totalTransf.toFixed(2)}`);

  // Soft delete das transferências
  const deletedTransf = await db.execute(sql`
    UPDATE titulo
    SET deleted_at = NOW()
    WHERE deleted_at IS NULL
      AND (
        LOWER(descricao) LIKE '%rende fácil%' OR
        LOWER(descricao) LIKE '%renda fácil%' OR
        LOWER(descricao) LIKE '%bb rende%' OR
        LOWER(descricao) LIKE '%bb renda%' OR
        LOWER(descricao) LIKE '%transferência para bb%' OR
        LOWER(descricao) LIKE '%transferencia para bb%'
      )
  `);
  console.log(`  ✅ ${(transferencias.rows as any[]).length} transferências removidas (soft delete)`);

  // ============================================================================
  // 2. REMOVER DUPLICATAS (mantendo apenas 1 de cada grupo)
  // ============================================================================
  console.log('\n📌 2. REMOVENDO TÍTULOS DUPLICADOS...\n');
  
  // Identificar duplicatas - manter o mais antigo (menor ID)
  const duplicatasQuery = await db.execute(sql`
    WITH ranked AS (
      SELECT 
        id,
        descricao,
        data_competencia,
        valor_liquido,
        ROW_NUMBER() OVER (
          PARTITION BY descricao, data_competencia, valor_liquido 
          ORDER BY created_at ASC, id ASC
        ) as rn
      FROM titulo
      WHERE deleted_at IS NULL
    )
    SELECT id, descricao, valor_liquido, data_competencia
    FROM ranked
    WHERE rn > 1
  `);

  console.log(`  Encontradas ${(duplicatasQuery.rows as any[]).length} duplicatas:`);
  let totalDup = 0;
  for (const row of (duplicatasQuery.rows as any[]).slice(0, 10)) {
    const valor = parseFloat(row.valor_liquido) || 0;
    totalDup += valor;
    console.log(`    R$ ${valor.toFixed(2).padStart(10)} | ${row.data_competencia} | ${(row.descricao || '').substring(0, 45)}`);
  }
  if ((duplicatasQuery.rows as any[]).length > 10) {
    for (const row of (duplicatasQuery.rows as any[]).slice(10)) {
      totalDup += parseFloat(row.valor_liquido) || 0;
    }
    console.log(`    ... e mais ${(duplicatasQuery.rows as any[]).length - 10} duplicatas`);
  }
  console.log(`  Total em duplicatas: R$ ${totalDup.toFixed(2)}`);

  // Soft delete das duplicatas
  const deletedDup = await db.execute(sql`
    WITH ranked AS (
      SELECT 
        id,
        ROW_NUMBER() OVER (
          PARTITION BY descricao, data_competencia, valor_liquido 
          ORDER BY created_at ASC, id ASC
        ) as rn
      FROM titulo
      WHERE deleted_at IS NULL
    )
    UPDATE titulo
    SET deleted_at = NOW()
    WHERE id IN (SELECT id FROM ranked WHERE rn > 1)
  `);
  console.log(`  ✅ ${(duplicatasQuery.rows as any[]).length} duplicatas removidas (soft delete)`);

  // ============================================================================
  // 3. CORRIGIR PREMIAÇÕES SEFAZ (devem ser receitas, não despesas)
  // ============================================================================
  console.log('\n📌 3. VERIFICANDO PREMIAÇÕES SEFAZ...\n');
  
  const premiacoes = await db.execute(sql`
    SELECT id, descricao, valor_liquido, data_competencia, tipo
    FROM titulo
    WHERE deleted_at IS NULL
      AND (
        LOWER(descricao) LIKE '%premiação%' OR
        LOWER(descricao) LIKE '%premiacao%' OR
        LOWER(descricao) LIKE '%sefaz%' OR
        LOWER(descricao) LIKE '%nota fiscal cidadã%'
      )
    ORDER BY data_competencia
  `);

  console.log(`  Encontradas ${(premiacoes.rows as any[]).length} premiações:`);
  let premiacoesErradas = 0;
  for (const row of premiacoes.rows as any[]) {
    const valor = parseFloat(row.valor_liquido) || 0;
    const status = row.tipo === 'receber' ? '✅' : '⚠️ CORRIGIR';
    console.log(`    ${status} | ${row.tipo.padEnd(8)} | R$ ${valor.toFixed(2).padStart(10)} | ${row.data_competencia} | ${(row.descricao || '').substring(0, 35)}`);
    if (row.tipo === 'pagar') premiacoesErradas++;
  }

  if (premiacoesErradas > 0) {
    // Corrigir tipo das premiações
    await db.execute(sql`
      UPDATE titulo
      SET tipo = 'receber', natureza = 'outros'
      WHERE deleted_at IS NULL
        AND tipo = 'pagar'
        AND (
          LOWER(descricao) LIKE '%premiação%' OR
          LOWER(descricao) LIKE '%premiacao%' OR
          LOWER(descricao) LIKE '%sefaz%' OR
          LOWER(descricao) LIKE '%nota fiscal cidadã%'
        )
    `);
    console.log(`  ✅ ${premiacoesErradas} premiações corrigidas para 'receber'`);
  } else {
    console.log(`  ✅ Todas as premiações já estão corretas`);
  }

  // ============================================================================
  // 4. VERIFICAR E CORRIGIR RENDIMENTOS (devem ser receitas)
  // ============================================================================
  console.log('\n📌 4. VERIFICANDO RENDIMENTOS...\n');
  
  const rendimentos = await db.execute(sql`
    SELECT id, descricao, valor_liquido, data_competencia, tipo
    FROM titulo
    WHERE deleted_at IS NULL
      AND LOWER(descricao) LIKE '%rendimento%'
    ORDER BY data_competencia
  `);

  let rendimentosErrados = 0;
  for (const row of rendimentos.rows as any[]) {
    if (row.tipo === 'pagar') rendimentosErrados++;
  }

  if (rendimentosErrados > 0) {
    await db.execute(sql`
      UPDATE titulo
      SET tipo = 'receber', natureza = 'outros'
      WHERE deleted_at IS NULL
        AND tipo = 'pagar'
        AND LOWER(descricao) LIKE '%rendimento%'
    `);
    console.log(`  ✅ ${rendimentosErrados} rendimentos corrigidos para 'receber'`);
  } else {
    console.log(`  ✅ Todos os ${(rendimentos.rows as any[]).length} rendimentos já estão corretos`);
  }

  // ============================================================================
  // 5. VERIFICAR E CORRIGIR CONTRIBUIÇÕES (devem ser receitas)
  // ============================================================================
  console.log('\n📌 5. VERIFICANDO CONTRIBUIÇÕES...\n');
  
  const contribuicoes = await db.execute(sql`
    SELECT id, descricao, valor_liquido, data_competencia, tipo
    FROM titulo
    WHERE deleted_at IS NULL
      AND (
        LOWER(descricao) LIKE '%contribuição%' OR
        LOWER(descricao) LIKE '%contribuicao%'
      )
      AND LOWER(descricao) NOT LIKE '%contribuição mensal%'
      AND LOWER(descricao) NOT LIKE '%contribuicao mensal%'
    ORDER BY data_competencia
  `);

  let contribuicoesErradas = 0;
  for (const row of contribuicoes.rows as any[]) {
    if (row.tipo === 'pagar') contribuicoesErradas++;
  }

  if (contribuicoesErradas > 0) {
    await db.execute(sql`
      UPDATE titulo
      SET tipo = 'receber', natureza = 'contribuicao'
      WHERE deleted_at IS NULL
        AND tipo = 'pagar'
        AND (
          LOWER(descricao) LIKE '%contribuição%' OR
          LOWER(descricao) LIKE '%contribuicao%'
        )
        AND LOWER(descricao) NOT LIKE '%contribuição mensal%'
        AND LOWER(descricao) NOT LIKE '%contribuicao mensal%'
    `);
    console.log(`  ✅ ${contribuicoesErradas} contribuições corrigidas para 'receber'`);
  } else {
    console.log(`  ✅ Todas as ${(contribuicoes.rows as any[]).length} contribuições já estão corretas`);
  }

  // ============================================================================
  // 6. REMOVER IMPOSTOS DE RENDA DUPLICADOS DO BBRF
  // ============================================================================
  console.log('\n📌 6. VERIFICANDO IMPOSTOS DE RENDA...\n');
  
  const ir = await db.execute(sql`
    SELECT id, descricao, valor_liquido, data_competencia, tipo
    FROM titulo
    WHERE deleted_at IS NULL
      AND LOWER(descricao) LIKE '%imposto de renda%'
    ORDER BY data_competencia
  `);

  console.log(`  ${(ir.rows as any[]).length} lançamentos de IR encontrados`);

  // ============================================================================
  // 7. RESUMO FINAL
  // ============================================================================
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 VERIFICAÇÃO PÓS-CORREÇÃO');
  console.log('='.repeat(80));

  const novosTotais = await db.execute(sql`
    SELECT 
      tipo,
      COUNT(*) as quantidade,
      COALESCE(SUM(CAST(valor_liquido AS NUMERIC)), 0) as total
    FROM titulo 
    WHERE deleted_at IS NULL
    GROUP BY tipo
  `);

  let novasReceitas = 0, novasDespesas = 0, novoCountRec = 0, novoCountDesp = 0;
  for (const row of novosTotais.rows as any[]) {
    if (row.tipo === 'receber') {
      novasReceitas = parseFloat(row.total) || 0;
      novoCountRec = parseInt(row.quantidade) || 0;
    } else if (row.tipo === 'pagar') {
      novasDespesas = parseFloat(row.total) || 0;
      novoCountDesp = parseInt(row.quantidade) || 0;
    }
  }

  const expectedReceitas = 67978.06;
  const expectedDespesas = 68228.07;
  const expectedSaldo = -250.01;
  const novoSaldo = novasReceitas - novasDespesas;

  console.log(`
  APÓS CORREÇÃO:
    Receitas: R$ ${novasReceitas.toFixed(2)} (${novoCountRec} títulos)
    Despesas: R$ ${novasDespesas.toFixed(2)} (${novoCountDesp} títulos)
    Saldo:    R$ ${novoSaldo.toFixed(2)}

  RAWDATA ESPERADO:
    Receitas: R$ ${expectedReceitas.toFixed(2)}
    Despesas: R$ ${expectedDespesas.toFixed(2)}
    Saldo:    R$ ${expectedSaldo.toFixed(2)}

  DIFERENÇA RESTANTE:
    Receitas: ${(novasReceitas - expectedReceitas) >= 0 ? '+' : ''}R$ ${(novasReceitas - expectedReceitas).toFixed(2)}
    Despesas: ${(novasDespesas - expectedDespesas) >= 0 ? '+' : ''}R$ ${(novasDespesas - expectedDespesas).toFixed(2)}
    Saldo:    ${(novoSaldo - expectedSaldo) >= 0 ? '+' : ''}R$ ${(novoSaldo - expectedSaldo).toFixed(2)}
  `);

  const diffSaldo = Math.abs(novoSaldo - expectedSaldo);
  if (diffSaldo < 1000) {
    console.log('  ✅ Saldo agora está próximo do esperado!');
  } else {
    console.log('  ⚠️  Ainda há diferença significativa. Pode ser necessária análise adicional.');
  }

  console.log('\n' + '='.repeat(80) + '\n');
}

fix().catch(console.error);









