/**
 * Seed: Regras de Classificação Automática
 * Pattern matching para classificar lançamentos automaticamente
 * 
 * Executar: npx tsx scripts/seed/seed-rules.ts
 */

import { sql as rawSql } from 'drizzle-orm';
import { db, DRY_RUN, log, SeedSummary } from './config';

const summary = new SeedSummary();

// ============================================================================
// REGRAS DE CLASSIFICAÇÃO
// ============================================================================

interface ClassificationRule {
  pattern: string;
  accountCode: string;
  priority: number;
}

const RULES: ClassificationRule[] = [
  // ━━━ RECEITAS ━━━ (prioridade alta: 100+)
  
  // Contribuições
  { pattern: 'contribuição associado', accountCode: '4.1.1', priority: 110 },
  { pattern: 'contribuicao associado', accountCode: '4.1.1', priority: 110 },
  { pattern: 'contribuição não associado', accountCode: '4.1.2', priority: 110 },
  { pattern: 'contribuicao nao associado', accountCode: '4.1.2', priority: 110 },
  { pattern: 'doação', accountCode: '4.2.1', priority: 100 },
  { pattern: 'doacao', accountCode: '4.2.1', priority: 100 },
  
  // Receitas Financeiras
  { pattern: 'rendimento', accountCode: '4.3.1', priority: 100 },
  { pattern: 'rend. aplic', accountCode: '4.3.1', priority: 100 },
  
  // Premiações
  { pattern: 'premiação', accountCode: '4.4.1', priority: 100 },
  { pattern: 'premiacao', accountCode: '4.4.1', priority: 100 },
  { pattern: 'nota fiscal cidadã', accountCode: '4.4.1', priority: 100 },
  
  // ━━━ DESPESAS ━━━ (prioridade média: 50-99)
  
  // Tarifas Bancárias
  { pattern: 'tarifa de pix', accountCode: '5.1.1', priority: 90 },
  { pattern: 'tarifa pix', accountCode: '5.1.1', priority: 90 },
  { pattern: 'tar pix', accountCode: '5.1.1', priority: 90 },
  { pattern: 'tarifa pacote', accountCode: '5.1.2', priority: 85 },
  { pattern: 'tarifa', accountCode: '5.1.3', priority: 50 },
  
  // Tributos
  { pattern: 'imposto de renda', accountCode: '5.2.1', priority: 90 },
  { pattern: 'ir sobre', accountCode: '5.2.1', priority: 90 },
  { pattern: 'iof', accountCode: '5.2.1', priority: 85 },
  
  // Utilidades
  { pattern: 'energia', accountCode: '5.3.1', priority: 90 },
  { pattern: 'equatorial', accountCode: '5.3.1', priority: 85 },
  { pattern: 'eletrobras', accountCode: '5.3.1', priority: 85 },
  { pattern: 'água', accountCode: '5.3.2', priority: 90 },
  { pattern: 'agua', accountCode: '5.3.2', priority: 90 },
  { pattern: 'casal', accountCode: '5.3.2', priority: 85 },
  { pattern: 'esgoto', accountCode: '5.3.2', priority: 85 },
  { pattern: 'telefone', accountCode: '5.3.3', priority: 90 },
  { pattern: 'internet', accountCode: '5.3.3', priority: 90 },
  { pattern: 'claro', accountCode: '5.3.3', priority: 85 },
  { pattern: 'vivo', accountCode: '5.3.3', priority: 85 },
  { pattern: 'tim', accountCode: '5.3.3', priority: 85 },
  { pattern: 'oi', accountCode: '5.3.3', priority: 80 },
  
  // Serviços
  { pattern: 'limpeza', accountCode: '5.4.1', priority: 90 },
  { pattern: 'serviço de limpeza', accountCode: '5.4.1', priority: 95 },
  { pattern: 'manutenção', accountCode: '5.4.2', priority: 90 },
  { pattern: 'manutencao', accountCode: '5.4.2', priority: 90 },
  { pattern: 'reparo', accountCode: '5.4.2', priority: 85 },
  { pattern: 'conserto', accountCode: '5.4.2', priority: 85 },
  { pattern: 'montagem', accountCode: '5.4.2', priority: 80 },
  { pattern: 'serviço', accountCode: '5.4.4', priority: 50 },
  { pattern: 'servico', accountCode: '5.4.4', priority: 50 },
  
  // Materiais
  { pattern: 'material de construção', accountCode: '5.5.1', priority: 95 },
  { pattern: 'material construção', accountCode: '5.5.1', priority: 95 },
  { pattern: 'material construcao', accountCode: '5.5.1', priority: 95 },
  { pattern: 'placa piso', accountCode: '5.5.1', priority: 90 },
  { pattern: 'borracha', accountCode: '5.5.1', priority: 80 },
  { pattern: 'cola', accountCode: '5.5.1', priority: 75 },
  { pattern: 'porta', accountCode: '5.5.1', priority: 75 },
  { pattern: 'aquisição', accountCode: '5.5.1', priority: 60 },
  { pattern: 'aquisicao', accountCode: '5.5.1', priority: 60 },
  { pattern: 'compra', accountCode: '5.5.1', priority: 55 },
  
  // Mensalidades
  { pattern: 'contribuição mensal', accountCode: '5.6.1', priority: 90 },
  { pattern: 'contribuicao mensal', accountCode: '5.6.1', priority: 90 },
  { pattern: 'federação', accountCode: '5.6.1', priority: 85 },
  { pattern: 'federacao', accountCode: '5.6.1', priority: 85 },
  { pattern: 'anuidade', accountCode: '5.6.1', priority: 85 },
];

// ============================================================================
// SEED FUNCTION
// ============================================================================

async function getAccountId(code: string): Promise<number | null> {
  const result = await db.execute(rawSql`
    SELECT id FROM accounts WHERE code = ${code} LIMIT 1
  `);
  return result.rows[0]?.id as number || null;
}

export async function seedRules() {
  log.header('SEED: REGRAS DE CLASSIFICAÇÃO');
  
  if (DRY_RUN) {
    log.warn('Modo DRY-RUN ativado - nenhuma alteração será feita');
  }
  
  // Get system user
  const userResult = await db.execute(rawSql`
    SELECT id FROM users WHERE open_id = 'system' LIMIT 1
  `);
  const userId = userResult.rows[0]?.id as number || 1;
  
  let created = 0;
  let skipped = 0;
  
  for (const rule of RULES) {
    // Check if rule already exists
    const existing = await db.execute(rawSql`
      SELECT id FROM classification_rules 
      WHERE LOWER(pattern) = LOWER(${rule.pattern})
      LIMIT 1
    `);
    
    if (existing.rows.length > 0) {
      skipped++;
      summary.track('classification_rules', 'skipped');
      continue;
    }
    
    // Get account ID
    const accountId = await getAccountId(rule.accountCode);
    if (!accountId) {
      log.warn(`Conta não encontrada: ${rule.accountCode} para pattern "${rule.pattern}"`);
      summary.track('classification_rules', 'error');
      continue;
    }
    
    if (DRY_RUN) {
      log.dryRun(`Criaria regra "${rule.pattern}" → ${rule.accountCode}`);
      continue;
    }
    
    await db.execute(rawSql`
      INSERT INTO classification_rules (pattern, account_id, priority, active, created_by)
      VALUES (${rule.pattern}, ${accountId}, ${rule.priority}, 1, ${userId})
      ON CONFLICT DO NOTHING
    `);
    
    created++;
    summary.track('classification_rules', 'created');
  }
  
  log.success(`Regras de classificação: ${created} criadas, ${skipped} já existentes`);
  summary.print();
  return true;
}

// Run if called directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  seedRules().catch(console.error);
}

