#!/usr/bin/env npx tsx
/**
 * Orquestrador de Seed/Migração
 * Executa todos os scripts de seed em sequência
 * 
 * Uso:
 *   npx tsx scripts/seed/index.ts              # Executa tudo
 *   npx tsx scripts/seed/index.ts --dry-run    # Preview sem alterações
 *   npx tsx scripts/seed/index.ts --force      # Recriar dados existentes
 *   npx tsx scripts/seed/index.ts --validate   # Apenas validação
 *   npx tsx scripts/seed/index.ts --help       # Ajuda
 */

import { DRY_RUN, FORCE, log } from './config';
import { seedSystem } from './seed-system';
import { seedAccounts } from './seed-accounts';
import { seedRules } from './seed-rules';
import { migrateEntries } from './migrate-entries';
import { validateData } from './validate-data';

// ============================================================================
// CLI INTERFACE
// ============================================================================

const HELP = `
┌──────────────────────────────────────────────────────────────────────────┐
│                    SEED/MIGRAÇÃO - CENTRO ESPÍRITA                       │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Uso: npx tsx scripts/seed/index.ts [opções]                            │
│                                                                          │
│  Opções:                                                                 │
│    --dry-run     Preview sem fazer alterações no banco                   │
│    --force       Forçar recriação de dados existentes                    │
│    --validate    Executar apenas validação vs rawdata                    │
│    --skip-seed   Pular seed e executar apenas migração                   │
│    --skip-migrate Pular migração e executar apenas seed                  │
│    -v, --verbose Saída detalhada                                         │
│    --help        Mostrar esta ajuda                                      │
│                                                                          │
│  Scripts individuais:                                                    │
│    npx tsx scripts/seed/seed-system.ts     Dados base do sistema         │
│    npx tsx scripts/seed/seed-accounts.ts   Plano de contas               │
│    npx tsx scripts/seed/seed-rules.ts      Regras de classificação       │
│    npx tsx scripts/seed/migrate-entries.ts Migrar titulo_baixa→entries   │
│    npx tsx scripts/seed/validate-data.ts   Validar vs rawdata            │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
`;

const SKIP_SEED = process.argv.includes('--skip-seed');
const SKIP_MIGRATE = process.argv.includes('--skip-migrate');
const VALIDATE_ONLY = process.argv.includes('--validate');
const SHOW_HELP = process.argv.includes('--help') || process.argv.includes('-h');

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  const startTime = Date.now();
  
  console.log(`
╔══════════════════════════════════════════════════════════════════════════╗
║           🌱 SEED/MIGRAÇÃO - CENTRO ESPÍRITA CASA DO CAMINHO             ║
╠══════════════════════════════════════════════════════════════════════════╣
║  Sistema de população e migração de dados para relatórios financeiros    ║
╚══════════════════════════════════════════════════════════════════════════╝
`);

  if (SHOW_HELP) {
    console.log(HELP);
    return;
  }
  
  // Show mode
  if (DRY_RUN) {
    console.log('  ⚠️  MODO DRY-RUN: Nenhuma alteração será feita no banco\n');
  }
  if (FORCE) {
    console.log('  ⚠️  MODO FORCE: Dados existentes serão recriados\n');
  }
  
  try {
    // Validate only mode
    if (VALIDATE_ONLY) {
      await validateData();
      return;
    }
    
    // Step 1: Seed base system data
    if (!SKIP_SEED) {
      await seedSystem();
      await seedAccounts();
      await seedRules();
    } else {
      log.info('Seed pulado (--skip-seed)');
    }
    
    // Step 2: Migrate entries
    if (!SKIP_MIGRATE) {
      await migrateEntries();
    } else {
      log.info('Migração pulada (--skip-migrate)');
    }
    
    // Step 3: Validate
    await validateData();
    
    // Final summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log(`
╔══════════════════════════════════════════════════════════════════════════╗
║                         ✅ EXECUÇÃO CONCLUÍDA                            ║
╠══════════════════════════════════════════════════════════════════════════╣
║  Tempo total: ${duration.padStart(5)}s                                                     ║
║  Modo: ${DRY_RUN ? 'DRY-RUN (preview)' : 'PRODUÇÃO        '}                                              ║
╚══════════════════════════════════════════════════════════════════════════╝
`);

  } catch (error: any) {
    console.error(`
╔══════════════════════════════════════════════════════════════════════════╗
║                         ❌ ERRO NA EXECUÇÃO                              ║
╠══════════════════════════════════════════════════════════════════════════╣
║  ${error.message.substring(0, 68).padEnd(68)} ║
╚══════════════════════════════════════════════════════════════════════════╝
`);
    process.exit(1);
  }
}

main().catch(console.error);

















