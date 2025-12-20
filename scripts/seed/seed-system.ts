/**
 * Seed: Dados Base do Sistema
 * - Usuário sistema (id=1)
 * - Organization settings
 * - Períodos contábeis 2025
 * 
 * Executar: npx tsx scripts/seed/seed-system.ts
 */

import { sql as rawSql } from 'drizzle-orm';
import { db, sql, DRY_RUN, log, SeedSummary, ORG_DEFAULTS } from './config';

const summary = new SeedSummary();

// ============================================================================
// SEED: USUÁRIO SISTEMA
// ============================================================================

async function seedSystemUser() {
  log.step('Criando usuário sistema...');
  
  const existing = await db.execute(rawSql`
    SELECT id FROM users WHERE open_id = 'system' LIMIT 1
  `);
  
  if (existing.rows.length > 0) {
    log.dim(`Usuário sistema já existe (id=${existing.rows[0].id})`);
    summary.track('users', 'skipped');
    return existing.rows[0].id as number;
  }
  
  if (DRY_RUN) {
    log.dryRun('Criaria usuário sistema');
    return 1;
  }
  
  const result = await db.execute(rawSql`
    INSERT INTO users (open_id, name, email, login_method, role)
    VALUES ('system', 'Sistema', 'sistema@casadocaminho.org.br', 'system', 'admin')
    ON CONFLICT (open_id) DO NOTHING
    RETURNING id
  `);
  
  const userId = result.rows[0]?.id || 1;
  log.success(`Usuário sistema criado (id=${userId})`);
  summary.track('users', 'created');
  return userId as number;
}

// ============================================================================
// SEED: ORGANIZATION SETTINGS
// ============================================================================

async function seedOrganization() {
  log.step('Configurando organização...');
  
  const existing = await db.execute(rawSql`
    SELECT id FROM organization_settings LIMIT 1
  `);
  
  if (existing.rows.length > 0) {
    log.dim('Organization settings já existe');
    summary.track('organization_settings', 'skipped');
    return;
  }
  
  if (DRY_RUN) {
    log.dryRun('Criaria organization settings');
    return;
  }
  
  await db.execute(rawSql`
    INSERT INTO organization_settings (name, cnpj, address, city, state, zip_code, phone, email)
    VALUES (
      ${ORG_DEFAULTS.name},
      ${ORG_DEFAULTS.cnpj},
      ${ORG_DEFAULTS.address},
      ${ORG_DEFAULTS.city},
      ${ORG_DEFAULTS.state},
      ${ORG_DEFAULTS.zipCode},
      ${ORG_DEFAULTS.phone},
      ${ORG_DEFAULTS.email}
    )
  `);
  
  log.success('Organization settings criado');
  summary.track('organization_settings', 'created');
}

// ============================================================================
// SEED: PERÍODOS 2025
// ============================================================================

async function seedPeriods() {
  log.step('Criando períodos contábeis 2025...');
  
  const year = 2025;
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  
  for (let month = 1; month <= 12; month++) {
    const existing = await db.execute(rawSql`
      SELECT id FROM periods WHERE month = ${month} AND year = ${year} LIMIT 1
    `);
    
    if (existing.rows.length > 0) {
      summary.track('periods', 'skipped');
      continue;
    }
    
    if (DRY_RUN) {
      log.dryRun(`Criaria período ${months[month - 1]}/${year}`);
      continue;
    }
    
    await db.execute(rawSql`
      INSERT INTO periods (month, year, status, opening_balance, closing_balance)
      VALUES (${month}, ${year}, 'open', 0, 0)
      ON CONFLICT ON CONSTRAINT period_idx DO NOTHING
    `);
    
    summary.track('periods', 'created');
  }
  
  const count = await db.execute(rawSql`
    SELECT COUNT(*) as cnt FROM periods WHERE year = ${year}
  `);
  log.success(`${count.rows[0].cnt} períodos configurados para ${year}`);
}

// ============================================================================
// MAIN
// ============================================================================

export async function seedSystem() {
  log.header('SEED: DADOS BASE DO SISTEMA');
  
  if (DRY_RUN) {
    log.warn('Modo DRY-RUN ativado - nenhuma alteração será feita');
  }
  
  try {
    await seedSystemUser();
    await seedOrganization();
    await seedPeriods();
    summary.print();
    return true;
  } catch (error: any) {
    log.error(`Falha no seed: ${error.message}`);
    throw error;
  }
}

// Run if called directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  seedSystem().catch(console.error);
}

