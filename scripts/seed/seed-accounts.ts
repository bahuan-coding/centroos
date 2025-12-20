/**
 * Seed: Plano de Contas Completo
 * Baseado no plano de contas do Centro Espírita
 * 
 * Executar: npx tsx scripts/seed/seed-accounts.ts
 */

import { sql as rawSql } from 'drizzle-orm';
import { db, DRY_RUN, log, SeedSummary } from './config';

const summary = new SeedSummary();

// ============================================================================
// PLANO DE CONTAS - ESTRUTURA COMPLETA
// ============================================================================

type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';

interface AccountDef {
  code: string;
  name: string;
  type: AccountType;
  description?: string;
}

const ACCOUNTS: AccountDef[] = [
  // ━━━ ATIVO ━━━
  { code: '1', name: 'ATIVO', type: 'asset', description: 'Bens e direitos' },
  { code: '1.1', name: 'Ativo Circulante', type: 'asset' },
  { code: '1.1.1', name: 'Disponibilidades', type: 'asset' },
  { code: '1.1.1.01', name: 'Caixa', type: 'asset', description: 'Dinheiro em espécie' },
  { code: '1.1.1.02', name: 'Banco do Brasil - C/C', type: 'asset' },
  { code: '1.1.1.03', name: 'BB Renda Fácil', type: 'asset', description: 'Aplicação automática' },
  { code: '1.1.1.04', name: 'Caixa Econômica Federal', type: 'asset' },
  
  // ━━━ PASSIVO ━━━
  { code: '2', name: 'PASSIVO', type: 'liability', description: 'Obrigações' },
  { code: '2.1', name: 'Passivo Circulante', type: 'liability' },
  { code: '2.1.1', name: 'Obrigações a Pagar', type: 'liability' },
  
  // ━━━ PATRIMÔNIO SOCIAL ━━━
  { code: '3', name: 'PATRIMÔNIO SOCIAL', type: 'equity' },
  { code: '3.1', name: 'Patrimônio Acumulado', type: 'equity' },
  { code: '3.2', name: 'Superávit/Déficit do Exercício', type: 'equity' },
  
  // ━━━ RECEITAS ━━━
  { code: '4', name: 'RECEITAS', type: 'revenue', description: 'Receitas operacionais' },
  { code: '4.1', name: 'Receitas de Contribuições', type: 'revenue' },
  { code: '4.1.1', name: 'Contribuição de Associados', type: 'revenue', description: 'Mensalidades de associados' },
  { code: '4.1.2', name: 'Contribuição de Não Associados', type: 'revenue', description: 'Doações espontâneas' },
  { code: '4.2', name: 'Receitas de Doações', type: 'revenue' },
  { code: '4.2.1', name: 'Doações de Pessoas Físicas', type: 'revenue' },
  { code: '4.2.2', name: 'Doações de Pessoas Jurídicas', type: 'revenue' },
  { code: '4.3', name: 'Receitas Financeiras', type: 'revenue' },
  { code: '4.3.1', name: 'Rendimento de Aplicações', type: 'revenue', description: 'BB Renda Fácil' },
  { code: '4.4', name: 'Outras Receitas', type: 'revenue' },
  { code: '4.4.1', name: 'Premiações', type: 'revenue', description: 'Nota Fiscal Cidadã' },
  
  // ━━━ DESPESAS ━━━
  { code: '5', name: 'DESPESAS', type: 'expense', description: 'Despesas operacionais' },
  
  // Tarifas Bancárias
  { code: '5.1', name: 'Despesas Bancárias', type: 'expense' },
  { code: '5.1.1', name: 'Tarifa de Pix', type: 'expense' },
  { code: '5.1.2', name: 'Tarifa de Pacote de Serviços', type: 'expense' },
  { code: '5.1.3', name: 'Outras Tarifas Bancárias', type: 'expense' },
  
  // Tributos
  { code: '5.2', name: 'Despesas Tributárias', type: 'expense' },
  { code: '5.2.1', name: 'Imposto de Renda sobre Aplicações', type: 'expense' },
  
  // Utilidades
  { code: '5.3', name: 'Despesas com Utilidades', type: 'expense' },
  { code: '5.3.1', name: 'Energia Elétrica', type: 'expense' },
  { code: '5.3.2', name: 'Água e Esgoto', type: 'expense' },
  { code: '5.3.3', name: 'Telefone e Internet', type: 'expense' },
  
  // Serviços de Terceiros
  { code: '5.4', name: 'Despesas com Serviços', type: 'expense' },
  { code: '5.4.1', name: 'Serviços de Limpeza', type: 'expense' },
  { code: '5.4.2', name: 'Serviços de Manutenção', type: 'expense' },
  { code: '5.4.3', name: 'Serviços Contábeis', type: 'expense' },
  { code: '5.4.4', name: 'Outros Serviços', type: 'expense' },
  
  // Materiais
  { code: '5.5', name: 'Despesas com Materiais', type: 'expense' },
  { code: '5.5.1', name: 'Material de Construção', type: 'expense' },
  { code: '5.5.2', name: 'Material de Escritório', type: 'expense' },
  { code: '5.5.3', name: 'Material de Limpeza', type: 'expense' },
  
  // Mensalidades
  { code: '5.6', name: 'Mensalidades e Anuidades', type: 'expense' },
  { code: '5.6.1', name: 'Contribuição Mensal Federação', type: 'expense' },
  
  // Outras
  { code: '5.9', name: 'Outras Despesas', type: 'expense' },
  { code: '5.9.1', name: 'Despesas Diversas', type: 'expense' },
];

// ============================================================================
// MAPEAMENTO NATUREZA → CÓDIGO DA CONTA
// ============================================================================

export const NATUREZA_TO_CODE: Record<string, string> = {
  // Receitas
  'contribuicao': '4.1.1',
  'contribuicao_associado': '4.1.1',
  'contribuicao_nao_associado': '4.1.2',
  'doacao': '4.1.2',
  'doacao_pf': '4.2.1',
  'doacao_pj': '4.2.2',
  'receita_financeira': '4.3.1',
  'rendimento': '4.3.1',
  'premiacao': '4.4.1',
  
  // Despesas
  'tarifa': '5.1.1',
  'tarifa_pix': '5.1.1',
  'tarifa_pacote': '5.1.2',
  'imposto': '5.2.1',
  'energia': '5.3.1',
  'agua': '5.3.2',
  'telefone': '5.3.3',
  'internet': '5.3.3',
  'utilidade': '5.3.1',
  'limpeza': '5.4.1',
  'manutencao': '5.4.2',
  'servico': '5.4.4',
  'material': '5.5.1',
  'material_construcao': '5.5.1',
  'material_escritorio': '5.5.2',
  'material_limpeza': '5.5.3',
  'mensalidade': '5.6.1',
  'taxa': '5.6.1',
  'outros': '5.9.1',
};

// ============================================================================
// SEED FUNCTION
// ============================================================================

function getParentCode(code: string): string | null {
  const parts = code.split('.');
  if (parts.length <= 1) return null;
  parts.pop();
  return parts.join('.');
}

function getLevel(code: string): number {
  return code.split('.').length - 1;
}

async function getParentId(parentCode: string | null): Promise<number | null> {
  if (!parentCode) return null;
  
  const result = await db.execute(rawSql`
    SELECT id FROM accounts WHERE code = ${parentCode} LIMIT 1
  `);
  
  return result.rows[0]?.id as number || null;
}

export async function seedAccounts() {
  log.header('SEED: PLANO DE CONTAS');
  
  if (DRY_RUN) {
    log.warn('Modo DRY-RUN ativado - nenhuma alteração será feita');
  }
  
  let created = 0;
  let updated = 0;
  let skipped = 0;
  
  for (const account of ACCOUNTS) {
    const existing = await db.execute(rawSql`
      SELECT id, name, type FROM accounts WHERE code = ${account.code} LIMIT 1
    `);
    
    const parentCode = getParentCode(account.code);
    const parentId = await getParentId(parentCode);
    const level = getLevel(account.code);
    
    if (existing.rows.length > 0) {
      const row = existing.rows[0] as { id: number; name: string; type: string };
      
      // Update if name or type changed
      if (row.name !== account.name || row.type !== account.type) {
        if (!DRY_RUN) {
          await db.execute(rawSql`
            UPDATE accounts 
            SET name = ${account.name}, 
                type = ${account.type}::account_type,
                description = ${account.description || null},
                parent_id = ${parentId},
                level = ${level}
            WHERE code = ${account.code}
          `);
        }
        updated++;
        summary.track('accounts', 'updated');
        log.dim(`↻ ${account.code} - ${account.name}`);
      } else {
        skipped++;
        summary.track('accounts', 'skipped');
      }
      continue;
    }
    
    if (DRY_RUN) {
      log.dryRun(`Criaria conta ${account.code} - ${account.name}`);
      continue;
    }
    
    await db.execute(rawSql`
      INSERT INTO accounts (code, name, type, parent_id, level, active, description)
      VALUES (
        ${account.code},
        ${account.name},
        ${account.type}::account_type,
        ${parentId},
        ${level},
        1,
        ${account.description || null}
      )
      ON CONFLICT (code) DO UPDATE SET
        name = EXCLUDED.name,
        type = EXCLUDED.type,
        description = EXCLUDED.description
    `);
    
    created++;
    summary.track('accounts', 'created');
    log.dim(`+ ${account.code} - ${account.name}`);
  }
  
  log.success(`Plano de contas: ${created} criadas, ${updated} atualizadas, ${skipped} inalteradas`);
  summary.print();
  return true;
}

// Run if called directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  seedAccounts().catch(console.error);
}

