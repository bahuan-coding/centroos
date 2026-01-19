/**
 * Script de Limpeza de Dados Legados
 * Remove dados das tabelas legacy, mantendo apenas:
 * - pessoa, associado, pessoaDocumento, pessoaContato
 * - planoContas, centroCusto, configuracaoSistema
 * - titulo, tituloBaixa
 * - contaFinanceira
 * 
 * Executar: npx tsx scripts/cleanup-legacy.ts
 */

import { neon } from '@neondatabase/serverless';

const databaseUrl = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('❌ DATABASE_URL não configurada');
  process.exit(1);
}

const sql = neon(databaseUrl);

async function cleanup() {
  console.log('🧹 Iniciando limpeza de dados legados...\n');

  // Tabelas legacy a limpar (ordem importa por causa de foreign keys)
  const tablesToClean = [
    // Legacy tables
    'audit_log',
    'classification_rules', 
    'bank_imports',
    'entries',
    // Novas tabelas que podem ter dados órfãos
    'evento_auditoria',
    'aprovacao',
    'fundo_consumo',
    'fundo_alocacao',
    'fundo_regra',
    'bem_depreciacao',
    'bem_patrimonial',
    'lancamento_linha',
    'lancamento_contabil',
    'saldo_conta_periodo',
    'conciliacao',
    'extrato_linha',
    'extrato_bancario',
  ];

  for (const table of tablesToClean) {
    try {
      const result = await sql`
        DELETE FROM ${sql(table)} WHERE 1=1
      `;
      console.log(`  ✅ ${table} - limpa`);
    } catch (error: any) {
      if (error.message?.includes('does not exist')) {
        console.log(`  ⏭️  ${table} - não existe (ok)`);
      } else if (error.message?.includes('violates foreign key')) {
        console.log(`  ⚠️  ${table} - tem dependências, pulando`);
      } else {
        console.log(`  ❌ ${table}: ${error.message}`);
      }
    }
  }

  // Verificar contagens das tabelas que devem ter dados
  console.log('\n📊 Verificando dados mantidos:\n');
  
  const tablesWithData = [
    { name: 'pessoa', label: 'Pessoas' },
    { name: 'associado', label: 'Associados' },
    { name: 'plano_contas', label: 'Plano de Contas' },
    { name: 'titulo', label: 'Títulos' },
    { name: 'conta_financeira', label: 'Contas Financeiras' },
    { name: 'centro_custo', label: 'Centros de Custo' },
    { name: 'configuracao_sistema', label: 'Configurações' },
  ];

  for (const { name, label } of tablesWithData) {
    try {
      const [result] = await sql`SELECT COUNT(*) as count FROM ${sql(name)}`;
      console.log(`  📁 ${label}: ${result.count} registros`);
    } catch (error: any) {
      console.log(`  ❓ ${label}: não disponível`);
    }
  }

  console.log('\n✅ Limpeza concluída!');
}

cleanup().catch(console.error);

























