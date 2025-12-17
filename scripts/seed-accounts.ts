/**
 * Script de Seed - Plano de Contas
 * Popula o banco de dados com as contas baseadas no relatório do Centro Espírita Casa do Caminho
 * 
 * Executar: npx tsx scripts/seed-accounts.ts
 */

import { neon } from '@netlify/neon';
import { drizzle } from 'drizzle-orm/neon-http';
import { accounts } from '../drizzle/schema';

const databaseUrl = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('❌ NETLIFY_DATABASE_URL ou DATABASE_URL não configurada');
  process.exit(1);
}

const sql = neon(databaseUrl);
const db = drizzle(sql);

// Dados mockados extraídos do relatório "relatorio andre.xlsb (1).pdf"
// Centro Espírita Casa do Caminho - Período 01/11/2025 a 30/11/2025
const accountsData = [
  // ATIVO
  { code: '1', name: 'ATIVO', type: 'asset' as const, parentId: null, level: 0, description: 'Grupo de contas de Ativo' },
  { code: '1.1', name: 'Ativo Circulante', type: 'asset' as const, parentId: null, level: 1, description: null },
  { code: '1.1.1', name: 'Disponibilidades', type: 'asset' as const, parentId: null, level: 2, description: 'Termo base: DISPONIBILIDADE' },
  { code: '1.1.1.001', name: 'Caixa', type: 'asset' as const, parentId: null, level: 3, description: 'Termo base: CAIXA | Exemplo: Saldo R$ 2,31' },
  { code: '1.1.1.002', name: 'Banco do Brasil - Conta Corrente', type: 'asset' as const, parentId: null, level: 3, description: 'Termo base: B.BRASIL' },
  { code: '1.1.1.003', name: 'BB Renda Fácil', type: 'asset' as const, parentId: null, level: 3, description: 'Termo base: BB R.Fácil | Exemplo: Saldo R$ 5.278,15' },
  { code: '1.1.1.004', name: 'Caixa Econômica Federal', type: 'asset' as const, parentId: null, level: 3, description: 'Termo base: C.ECONÔMICA | Exemplo: Saldo R$ 9.422,25' },
  
  // PASSIVO
  { code: '2', name: 'PASSIVO', type: 'liability' as const, parentId: null, level: 0, description: 'Grupo de contas de Passivo' },
  { code: '2.1', name: 'Passivo Circulante', type: 'liability' as const, parentId: null, level: 1, description: null },
  { code: '2.1.1', name: 'Obrigações a Pagar', type: 'liability' as const, parentId: null, level: 2, description: null },
  
  // PATRIMÔNIO SOCIAL
  { code: '3', name: 'PATRIMÔNIO SOCIAL', type: 'equity' as const, parentId: null, level: 0, description: 'Grupo de Patrimônio Social' },
  { code: '3.1', name: 'Patrimônio Social Acumulado', type: 'equity' as const, parentId: null, level: 1, description: null },
  { code: '3.2', name: 'Superávit/Déficit do Exercício', type: 'equity' as const, parentId: null, level: 1, description: null },
  
  // RECEITAS
  { code: '6', name: 'RECEITAS', type: 'revenue' as const, parentId: null, level: 0, description: 'Grupo de contas de Receitas' },
  { code: '6.1', name: 'Receitas de Contribuições', type: 'revenue' as const, parentId: null, level: 1, description: null },
  { code: '6.1.1', name: 'Contribuição de Associado', type: 'revenue' as const, parentId: null, level: 2, description: 'Termo base: Contribuição Associado | Exemplo: R$ 100,00' },
  { code: '6.1.2', name: 'Contribuição de Não Associado', type: 'revenue' as const, parentId: null, level: 2, description: 'Termo base: Contribuição Não Associado | Exemplo: R$ 150,00' },
  { code: '6.2', name: 'Receitas Financeiras', type: 'revenue' as const, parentId: null, level: 1, description: null },
  { code: '6.2.1', name: 'Rendimento de Aplicações', type: 'revenue' as const, parentId: null, level: 2, description: 'Termo base: BB Renda rendimento Aplicações | Exemplo: R$ 8,74' },
  { code: '6.3', name: 'Outras Receitas', type: 'revenue' as const, parentId: null, level: 1, description: null },
  { code: '6.3.1', name: 'Premiação', type: 'revenue' as const, parentId: null, level: 2, description: 'Termo base: Premiação' },
  
  // DESPESAS
  { code: '7', name: 'DESPESAS', type: 'expense' as const, parentId: null, level: 0, description: 'Grupo de contas de Despesas' },
  { code: '7.1', name: 'Despesas Administrativas', type: 'expense' as const, parentId: null, level: 1, description: null },
  { code: '7.1.1', name: 'Tarifas Bancárias', type: 'expense' as const, parentId: null, level: 2, description: null },
  { code: '7.1.1.001', name: 'Tarifa de Pix', type: 'expense' as const, parentId: null, level: 3, description: 'Termo base: Tarifa de Pix | Exemplo: R$ -2,09' },
  { code: '7.1.1.002', name: 'Tarifa Pacote de Serviço', type: 'expense' as const, parentId: null, level: 3, description: 'Termo base: Tarifa Pacote de Serviço | Exemplo: R$ -139,20' },
  { code: '7.1.2', name: 'Mensalidades e Anuidades', type: 'expense' as const, parentId: null, level: 2, description: null },
  { code: '7.1.2.001', name: 'Mensalidade Federação/Conselho', type: 'expense' as const, parentId: null, level: 3, description: 'Termo base: Pagamento Mensalidade | Exemplo: R$ -30,00' },
  { code: '7.2', name: 'Despesas Tributárias', type: 'expense' as const, parentId: null, level: 1, description: null },
  { code: '7.2.1', name: 'ISS - Imposto sobre Serviços', type: 'expense' as const, parentId: null, level: 2, description: 'Termo base: Pagamento ISS | Exemplo: R$ -30,00' },
  { code: '7.2.2', name: 'Imposto de Renda sobre Aplicações', type: 'expense' as const, parentId: null, level: 2, description: 'Termo base: BB Renda Imposto de renda | Exemplo: R$ -0,41' },
  { code: '7.3', name: 'Despesas com Utilidades', type: 'expense' as const, parentId: null, level: 1, description: null },
  { code: '7.3.1', name: 'Energia Elétrica', type: 'expense' as const, parentId: null, level: 2, description: 'Termo base: Pagamento de Energia | Exemplo: Equatorial Alagoas R$ -171,14' },
  { code: '7.3.2', name: 'Água e Esgoto', type: 'expense' as const, parentId: null, level: 2, description: 'Termo base: Pagamento de Agua | Exemplo: BRK R$ -75,00' },
  { code: '7.3.3', name: 'Telefone e Internet', type: 'expense' as const, parentId: null, level: 2, description: 'Termo base: Pagamento Telefone | Exemplo: Claro S/A R$ -150,64' },
  { code: '7.4', name: 'Despesas com Serviços de Terceiros', type: 'expense' as const, parentId: null, level: 1, description: null },
  { code: '7.4.1', name: 'Serviços de Limpeza', type: 'expense' as const, parentId: null, level: 2, description: 'Termo base: Pagamento de Serviço de Limpeza | Exemplo: R$ -600,00' },
  { code: '7.4.2', name: 'Serviços de Manutenção e Reparos', type: 'expense' as const, parentId: null, level: 2, description: 'Termo base: Pag. de Serv.de montagem da porta | Exemplo: R$ -1.200,00' },
  { code: '7.5', name: 'Despesas com Materiais e Aquisições', type: 'expense' as const, parentId: null, level: 1, description: null },
  { code: '7.5.1', name: 'Material de Construção e Manutenção', type: 'expense' as const, parentId: null, level: 2, description: 'Termo base: Aquisição de Placa Piso Borracha e Cola | Exemplo: R$ -211,85' },
  { code: '7.5.2', name: 'Material de Embalagens', type: 'expense' as const, parentId: null, level: 2, description: 'Termo base: Aquisição de material de embalagens | Exemplo: Plastifestas Ltda' },
];

// Mapa de código para ID inserido
const codeToId: Record<string, number> = {};

// Função para obter o parentId baseado no código
function getParentCode(code: string): string | null {
  const parts = code.split('.');
  if (parts.length <= 1) return null;
  parts.pop();
  return parts.join('.');
}

async function seed() {
  console.log('🌱 Iniciando seed do Plano de Contas...\n');
  
  // Primeiro, inserir todas as contas sem parentId
  for (const account of accountsData) {
    const parentCode = getParentCode(account.code);
    const parentId = parentCode ? codeToId[parentCode] : null;
    
    try {
      const [result] = await db.insert(accounts).values({
        code: account.code,
        name: account.name,
        type: account.type,
        parentId: parentId,
        level: account.level,
        active: 1,
        description: account.description,
      }).returning({ id: accounts.id });
      
      codeToId[account.code] = result.id;
      console.log(`✅ ${account.code} - ${account.name}`);
    } catch (error: any) {
      if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
        console.log(`⏭️  ${account.code} - ${account.name} (já existe)`);
      } else {
        console.error(`❌ Erro ao inserir ${account.code}: ${error.message}`);
      }
    }
  }
  
  console.log('\n✅ Seed concluído!');
  console.log(`📊 Total de contas: ${accountsData.length}`);
}

seed().catch(console.error);

