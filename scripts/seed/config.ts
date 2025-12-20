/**
 * Configuração compartilhada para scripts de seed
 * Executar: npx tsx scripts/seed/index.ts
 */

import { neon } from '@netlify/neon';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../../drizzle/schema';

// ============================================================================
// DATABASE CONNECTION
// ============================================================================

const databaseUrl = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('❌ DATABASE_URL não configurada');
  process.exit(1);
}

const sql = neon(databaseUrl);
export const db = drizzle(sql, { schema });
export { sql };

// ============================================================================
// CLI FLAGS
// ============================================================================

export const DRY_RUN = process.argv.includes('--dry-run');
export const FORCE = process.argv.includes('--force');
export const VERBOSE = process.argv.includes('--verbose') || process.argv.includes('-v');

// ============================================================================
// LOGGING UTILITIES
// ============================================================================

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

export const log = {
  info: (msg: string) => console.log(`${COLORS.blue}ℹ${COLORS.reset}  ${msg}`),
  success: (msg: string) => console.log(`${COLORS.green}✓${COLORS.reset}  ${msg}`),
  warn: (msg: string) => console.log(`${COLORS.yellow}⚠${COLORS.reset}  ${msg}`),
  error: (msg: string) => console.log(`${COLORS.red}✗${COLORS.reset}  ${msg}`),
  step: (msg: string) => console.log(`${COLORS.cyan}→${COLORS.reset}  ${msg}`),
  dim: (msg: string) => console.log(`${COLORS.dim}   ${msg}${COLORS.reset}`),
  header: (msg: string) => {
    console.log('');
    console.log(`${COLORS.bright}${COLORS.magenta}━━━ ${msg} ━━━${COLORS.reset}`);
  },
  dryRun: (msg: string) => {
    if (DRY_RUN) console.log(`${COLORS.yellow}[DRY-RUN]${COLORS.reset} ${msg}`);
  },
};

// ============================================================================
// SUMMARY TRACKER
// ============================================================================

export class SeedSummary {
  private counters: Record<string, { created: number; updated: number; skipped: number; errors: number }> = {};
  
  track(entity: string, action: 'created' | 'updated' | 'skipped' | 'error') {
    if (!this.counters[entity]) {
      this.counters[entity] = { created: 0, updated: 0, skipped: 0, errors: 0 };
    }
    if (action === 'error') {
      this.counters[entity].errors++;
    } else {
      this.counters[entity][action]++;
    }
  }
  
  print() {
    console.log('');
    log.header('RESUMO');
    for (const [entity, counts] of Object.entries(this.counters)) {
      const parts = [];
      if (counts.created) parts.push(`${COLORS.green}${counts.created} criados${COLORS.reset}`);
      if (counts.updated) parts.push(`${COLORS.blue}${counts.updated} atualizados${COLORS.reset}`);
      if (counts.skipped) parts.push(`${COLORS.dim}${counts.skipped} ignorados${COLORS.reset}`);
      if (counts.errors) parts.push(`${COLORS.red}${counts.errors} erros${COLORS.reset}`);
      console.log(`   ${entity}: ${parts.join(', ')}`);
    }
    console.log('');
  }
}

// ============================================================================
// ORGANIZATION DEFAULTS
// ============================================================================

export const ORG_DEFAULTS = {
  name: 'Centro Espírita Casa do Caminho',
  cnpj: '12.345.678/0001-90',
  address: 'Rua da Paz, 100',
  city: 'Maceió',
  state: 'AL',
  zipCode: '57000-000',
  phone: '(82) 3333-4444',
  email: 'contato@casadocaminho.org.br',
};


