/**
 * Seed de Títulos para Fluxo de Caixa
 * Cria títulos pendentes com vencimentos futuros
 * Executar: npx tsx scripts/seed-titulos-fluxo.ts
 */

import { neon } from '@netlify/neon';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../drizzle/schema';

const databaseUrl = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('❌ NETLIFY_DATABASE_URL ou DATABASE_URL não configurada');
  process.exit(1);
}

const sql = neon(databaseUrl);
const db = drizzle(sql, { schema });

// Funções auxiliares de data
function addDays(date: Date, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

const hoje = new Date();
const hojeStr = hoje.toISOString().split('T')[0];

// Títulos a RECEBER (contribuições e doações esperadas)
const titulosReceber = [
  { descricao: 'Contribuição mensal - Maria Cristina', valor: 120, dias: 5 },
  { descricao: 'Contribuição mensal - Celia Costa', valor: 100, dias: 7 },
  { descricao: 'Contribuição mensal - Rosilene Marques', valor: 100, dias: 10 },
  { descricao: 'Contribuição mensal - Luciano Gomes', valor: 100, dias: 10 },
  { descricao: 'Contribuição mensal - Edleuza Melo', valor: 75, dias: 12 },
  { descricao: 'Contribuição mensal - Lídia Roberta', valor: 75, dias: 12 },
  { descricao: 'Contribuição mensal - Gustavo Reis', valor: 50, dias: 15 },
  { descricao: 'Contribuição mensal - Andreia Santos', valor: 50, dias: 15 },
  { descricao: 'Doação esperada - Empresa ABC', valor: 500, dias: 20 },
  { descricao: 'Contribuição mensal - Marcos Antônio', valor: 30, dias: 22 },
  { descricao: 'Contribuição mensal - Nazidir Maria', valor: 30, dias: 22 },
  { descricao: 'Contribuição mensal - Helena Fátima', valor: 25, dias: 25 },
  { descricao: 'Contribuição mensal - Patrícia Lopes', valor: 25, dias: 25 },
  { descricao: 'Contribuição mensal - Maurício Ferreira', valor: 25, dias: 25 },
  { descricao: 'Contribuição mensal - Maria Denise', valor: 25, dias: 28 },
  { descricao: 'Contribuição mensal - Eduardo Henrique', valor: 25, dias: 28 },
  { descricao: 'Doação esperada - Bazar beneficente', valor: 350, dias: 30 },
];

// Títulos a PAGAR (despesas fixas e variáveis)
// Naturezas válidas: utilidade, servico, material, taxa, imposto, outros
const titulosPagar = [
  { descricao: 'Aluguel sede', valor: 1200, dias: 5, natureza: 'servico' },
  { descricao: 'Energia elétrica', valor: 280, dias: 10, natureza: 'utilidade' },
  { descricao: 'Internet/Telefone', valor: 150, dias: 10, natureza: 'utilidade' },
  { descricao: 'Material de escritório', valor: 120, dias: 12, natureza: 'material' },
  { descricao: 'Água e esgoto', valor: 95, dias: 15, natureza: 'utilidade' },
  { descricao: 'Contador - honorários', valor: 450, dias: 20, natureza: 'servico' },
  { descricao: 'Manutenção equipamentos', valor: 200, dias: 22, natureza: 'servico' },
  { descricao: 'Material de limpeza', valor: 85, dias: 25, natureza: 'material' },
  { descricao: 'Seguro predial', valor: 180, dias: 28, natureza: 'servico' },
];

async function seed() {
  console.log('🌱 Criando títulos para fluxo de caixa...\n');
  
  let receberCriados = 0;
  let pagarCriados = 0;
  let valorReceber = 0;
  let valorPagar = 0;

  // Criar títulos a RECEBER
  console.log('📥 Títulos a Receber:');
  for (const t of titulosReceber) {
    const vencimento = addDays(hoje, t.dias);
    try {
      await db.insert(schema.titulo).values({
        tipo: 'receber',
        natureza: 'contribuicao',
        descricao: t.descricao,
        valorOriginal: String(t.valor),
        valorLiquido: String(t.valor),
        dataEmissao: hojeStr,
        dataCompetencia: hojeStr,
        dataVencimento: vencimento,
        status: 'aprovado',
      });
      receberCriados++;
      valorReceber += t.valor;
      console.log(`  ✅ ${t.descricao} - R$ ${t.valor} (venc: ${vencimento})`);
    } catch (error: any) {
      console.error(`  ❌ ${t.descricao}: ${error.message}`);
    }
  }

  // Criar títulos a PAGAR
  console.log('\n📤 Títulos a Pagar:');
  for (const t of titulosPagar) {
    const vencimento = addDays(hoje, t.dias);
    try {
      await db.insert(schema.titulo).values({
        tipo: 'pagar',
        natureza: t.natureza as any,
        descricao: t.descricao,
        valorOriginal: String(t.valor),
        valorLiquido: String(t.valor),
        dataEmissao: hojeStr,
        dataCompetencia: hojeStr,
        dataVencimento: vencimento,
        status: 'aprovado',
      });
      pagarCriados++;
      valorPagar += t.valor;
      console.log(`  ✅ ${t.descricao} - R$ ${t.valor} (venc: ${vencimento})`);
    } catch (error: any) {
      console.error(`  ❌ ${t.descricao}: ${error.message}`);
    }
  }

  console.log('\n✅ Seed finalizado!');
  console.log(`📊 Resumo:`);
  console.log(`   - Títulos a receber: ${receberCriados} (R$ ${valorReceber.toFixed(2)})`);
  console.log(`   - Títulos a pagar: ${pagarCriados} (R$ ${valorPagar.toFixed(2)})`);
  console.log(`   - Saldo projetado: R$ ${(valorReceber - valorPagar).toFixed(2)}`);
}

seed().catch(console.error);

