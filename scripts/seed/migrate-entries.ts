/**
 * Migração: titulo_baixa → entries
 * Migra lançamentos pagos para a tabela de entries usada nos relatórios
 * 
 * Executar: npx tsx scripts/seed/migrate-entries.ts
 */

import { sql as rawSql } from 'drizzle-orm';
import { db, DRY_RUN, FORCE, log, SeedSummary } from './config';
import { NATUREZA_TO_CODE } from './seed-accounts';

const summary = new SeedSummary();

// ============================================================================
// MAPEAMENTO DE NATUREZA → ACCOUNT CODE
// ============================================================================

const NATUREZA_MAP: Record<string, string> = {
  // Receitas
  'contribuicao': '4.1.1',
  'contribuicao_associado': '4.1.1',
  'contribuição associado': '4.1.1',
  'contribuicao_nao_associado': '4.1.2',
  'contribuição não associado': '4.1.2',
  'doacao': '4.2.1',
  'doação': '4.2.1',
  'receita_financeira': '4.3.1',
  'rendimento': '4.3.1',
  'premiacao': '4.4.1',
  'premiação': '4.4.1',
  
  // Despesas
  'taxa': '5.1.3',
  'tarifa': '5.1.1',
  'imposto': '5.2.1',
  'utilidade': '5.3.1',
  'energia': '5.3.1',
  'agua': '5.3.2',
  'telefone': '5.3.3',
  'internet': '5.3.3',
  'servico': '5.4.4',
  'serviço': '5.4.4',
  'limpeza': '5.4.1',
  'manutencao': '5.4.2',
  'manutenção': '5.4.2',
  'material': '5.5.1',
  'material_construcao': '5.5.1',
  'outros': '5.9.1',
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function getAccountIdByCode(code: string): Promise<number | null> {
  const result = await db.execute(rawSql`
    SELECT id FROM accounts WHERE code = ${code} LIMIT 1
  `);
  return result.rows[0]?.id as number || null;
}

async function getAccountIdByNatureza(natureza: string | null): Promise<number> {
  if (!natureza) {
    return await getAccountIdByCode('5.9.1') || 1; // Despesas Diversas
  }
  
  const code = NATUREZA_MAP[natureza.toLowerCase()] || NATUREZA_TO_CODE[natureza.toLowerCase()];
  if (code) {
    const id = await getAccountIdByCode(code);
    if (id) return id;
  }
  
  // Fallback
  return await getAccountIdByCode('5.9.1') || 1;
}

async function getPeriodId(paymentDate: Date): Promise<number | null> {
  const month = paymentDate.getMonth() + 1;
  const year = paymentDate.getFullYear();
  
  const result = await db.execute(rawSql`
    SELECT id FROM periods WHERE month = ${month} AND year = ${year} LIMIT 1
  `);
  
  return result.rows[0]?.id as number || null;
}

// ============================================================================
// MIGRATION FUNCTION
// ============================================================================

export async function migrateEntries() {
  log.header('MIGRAÇÃO: titulo_baixa → entries');
  
  if (DRY_RUN) {
    log.warn('Modo DRY-RUN ativado - nenhuma alteração será feita');
  }
  
  // Get system user
  const userResult = await db.execute(rawSql`
    SELECT id FROM users WHERE open_id = 'system' LIMIT 1
  `);
  const userId = userResult.rows[0]?.id as number || 1;
  
  // Check existing entries
  const existingCount = await db.execute(rawSql`
    SELECT COUNT(*) as cnt FROM entries WHERE origin = 'system'
  `);
  const existingEntries = parseInt(existingCount.rows[0]?.cnt as string || '0');
  
  if (existingEntries > 0 && !FORCE) {
    log.warn(`Já existem ${existingEntries} entries migrados anteriormente`);
    log.info('Use --force para recriar');
    
    // Show summary of existing entries
    const entriesSummary = await db.execute(rawSql`
      SELECT 
        p.month, p.year,
        a.type,
        COUNT(*) as cnt,
        SUM(e.amount_cents) as total
      FROM entries e
      JOIN periods p ON p.id = e.period_id
      JOIN accounts a ON a.id = e.account_id
      WHERE e.origin = 'system'
      GROUP BY p.month, p.year, a.type
      ORDER BY p.year, p.month, a.type
    `);
    
    if (entriesSummary.rows.length > 0) {
      console.log('\nEntries existentes:');
      console.table(entriesSummary.rows);
    }
    
    return true;
  }
  
  // Clear existing entries if --force
  if (FORCE && existingEntries > 0) {
    log.warn(`Removendo ${existingEntries} entries existentes...`);
    if (!DRY_RUN) {
      await db.execute(rawSql`DELETE FROM entries WHERE origin = 'system'`);
    }
  }
  
  // Get all titulo_baixa with their titulo info
  log.step('Buscando titulo_baixa para migrar...');
  
  const baixas = await db.execute(rawSql`
    SELECT 
      tb.id as baixa_id,
      tb.titulo_id,
      tb.data_pagamento,
      tb.valor_pago,
      t.descricao,
      t.natureza,
      t.tipo,
      t.observacoes
    FROM titulo_baixa tb
    JOIN titulo t ON t.id = tb.titulo_id
    WHERE t.deleted_at IS NULL
    ORDER BY tb.data_pagamento
  `);
  
  log.info(`Encontradas ${baixas.rows.length} baixas para migrar`);
  
  let created = 0;
  let skipped = 0;
  let errors = 0;
  
  // Cache for account IDs
  const accountCache: Record<string, number> = {};
  const periodCache: Record<string, number> = {};
  
  for (const row of baixas.rows as any[]) {
    try {
      const paymentDate = new Date(row.data_pagamento);
      const periodKey = `${paymentDate.getMonth() + 1}-${paymentDate.getFullYear()}`;
      
      // Get period ID (cached)
      if (!periodCache[periodKey]) {
        const periodId = await getPeriodId(paymentDate);
        if (!periodId) {
          log.warn(`Período não encontrado para ${paymentDate.toISOString().split('T')[0]}`);
          errors++;
          summary.track('entries', 'error');
          continue;
        }
        periodCache[periodKey] = periodId;
      }
      const periodId = periodCache[periodKey];
      
      // Get account ID (cached)
      const natureza = row.natureza || 'outros';
      if (!accountCache[natureza]) {
        accountCache[natureza] = await getAccountIdByNatureza(natureza);
      }
      const accountId = accountCache[natureza];
      
      // Determine entry type based on titulo.tipo
      // receber = credit (receita), pagar = debit (despesa)
      const entryType = row.tipo === 'receber' ? 'credit' : 'debit';
      
      // Convert valor_pago to cents (valor_pago is already in R$, multiply by 100)
      const amountCents = Math.round(parseFloat(row.valor_pago) * 100);
      
      // Format transaction date
      const transactionDate = paymentDate.toISOString().split('T')[0];
      
      if (DRY_RUN) {
        log.dryRun(`Criaria entry: ${row.descricao?.substring(0, 40)} = R$ ${(amountCents/100).toFixed(2)}`);
        created++;
        continue;
      }
      
      // Check if entry already exists (by titulo_id in notes)
      const existingEntry = await db.execute(rawSql`
        SELECT id FROM entries 
        WHERE notes LIKE ${'titulo_baixa:' + row.baixa_id + '%'}
        LIMIT 1
      `);
      
      if (existingEntry.rows.length > 0) {
        skipped++;
        summary.track('entries', 'skipped');
        continue;
      }
      
      // Insert entry
      await db.execute(rawSql`
        INSERT INTO entries (
          period_id, account_id, type, amount_cents, 
          transaction_date, description, origin, 
          created_by, notes
        ) VALUES (
          ${periodId},
          ${accountId},
          ${entryType}::entry_type,
          ${amountCents},
          ${transactionDate}::date,
          ${row.descricao || 'Sem descrição'},
          'system'::origin,
          ${userId},
          ${'titulo_baixa:' + row.baixa_id + ' natureza:' + natureza}
        )
      `);
      
      created++;
      summary.track('entries', 'created');
      
    } catch (error: any) {
      log.error(`Erro ao migrar baixa ${row.baixa_id}: ${error.message}`);
      errors++;
      summary.track('entries', 'error');
    }
  }
  
  log.success(`Migração concluída: ${created} entries criados, ${skipped} ignorados, ${errors} erros`);
  
  // Show final summary
  if (!DRY_RUN) {
    const finalSummary = await db.execute(rawSql`
      SELECT 
        a.type,
        COUNT(*) as qtd,
        SUM(e.amount_cents)/100.0 as total_reais
      FROM entries e
      JOIN accounts a ON a.id = e.account_id
      WHERE e.origin = 'system'
      GROUP BY a.type
      ORDER BY a.type
    `);
    
    console.log('\nResumo por tipo de conta:');
    console.table(finalSummary.rows);
  }
  
  summary.print();
  return true;
}

// Run if called directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  migrateEntries().catch(console.error);
}

