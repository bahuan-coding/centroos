/**
 * Script de Seed - Contas Financeiras
 * Executar: npx tsx scripts/seed-contas-financeiras.ts
 */

import { neon } from '@netlify/neon';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../drizzle/schema';

const databaseUrl = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('❌ DATABASE_URL não configurada');
  process.exit(1);
}

const sql = neon(databaseUrl);
const db = drizzle(sql, { schema });

const contasFinanceiras = [
  {
    tipo: 'caixa' as const,
    nome: 'Caixa Físico',
    ativo: true,
    saldoInicial: '1500.00',
    dataSaldoInicial: '2025-01-01',
  },
  {
    tipo: 'conta_corrente' as const,
    nome: 'Banco do Brasil - Conta Corrente',
    bancoCodigo: '001',
    bancoNome: 'Banco do Brasil',
    agencia: '3407-X',
    contaNumero: '15782-3',
    ativo: true,
    saldoInicial: '25340.50',
    dataSaldoInicial: '2025-01-01',
  },
  {
    tipo: 'poupanca' as const,
    nome: 'BB Renda Fácil',
    bancoCodigo: '001',
    bancoNome: 'Banco do Brasil',
    agencia: '3407-X',
    contaNumero: '51.657.320-4',
    ativo: true,
    saldoInicial: '45000.00',
    dataSaldoInicial: '2025-01-01',
  },
  {
    tipo: 'conta_corrente' as const,
    nome: 'Caixa Econômica Federal',
    bancoCodigo: '104',
    bancoNome: 'Caixa Econômica Federal',
    agencia: '0512',
    contaNumero: '00123456-7',
    ativo: true,
    saldoInicial: '8750.25',
    dataSaldoInicial: '2025-01-01',
  },
];

async function seed() {
  console.log('🏦 Inserindo contas financeiras...\n');
  
  for (const conta of contasFinanceiras) {
    try {
      await db.insert(schema.contaFinanceira).values(conta);
      console.log(`  ✅ ${conta.nome}`);
    } catch (error: any) {
      if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
        console.log(`  ⏭️  ${conta.nome} (já existe)`);
      } else {
        console.error(`  ❌ ${conta.nome}: ${error.message}`);
      }
    }
  }
  
  console.log('\n✅ Seed de contas financeiras finalizado!');
}

seed().catch(console.error);




























