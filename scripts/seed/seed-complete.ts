/**
 * Script de Seed Completo - Modelo de Dados v2
 * Popula o banco com dados iniciais para o Sistema Financeiro e Contábil
 * 
 * Executar: npx tsx scripts/seed-complete.ts
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

// ============================================================================
// DADOS DE SEED - PAPÉIS
// ============================================================================
const papeis = [
  { codigo: 'admin', nome: 'Administrador', descricao: 'Acesso total ao sistema', nivel: 1 },
  { codigo: 'tesoureiro', nome: 'Tesoureiro', descricao: 'Gestão financeira e bancária', nivel: 2 },
  { codigo: 'contador', nome: 'Contador', descricao: 'Lançamentos contábeis e relatórios', nivel: 2 },
  { codigo: 'coordenador', nome: 'Coordenador', descricao: 'Gestão de projetos e centros de custo', nivel: 3 },
  { codigo: 'aprovador', nome: 'Aprovador', descricao: 'Aprovação de pagamentos e despesas', nivel: 3 },
  { codigo: 'auditor', nome: 'Auditor', descricao: 'Visualização completa, apenas leitura', nivel: 4 },
  { codigo: 'operador', nome: 'Operador', descricao: 'Operações básicas do dia-a-dia', nivel: 5 },
  { codigo: 'visualizador', nome: 'Visualizador', descricao: 'Apenas consulta de relatórios', nivel: 6 },
];

// ============================================================================
// DADOS DE SEED - PERMISSÕES
// ============================================================================
const permissoes = [
  // Módulo Pessoa
  { codigo: 'pessoa.criar', nome: 'Criar pessoa', modulo: 'pessoa' },
  { codigo: 'pessoa.editar', nome: 'Editar pessoa', modulo: 'pessoa' },
  { codigo: 'pessoa.excluir', nome: 'Excluir pessoa', modulo: 'pessoa' },
  { codigo: 'pessoa.visualizar', nome: 'Visualizar pessoa', modulo: 'pessoa' },
  
  // Módulo Associado
  { codigo: 'associado.criar', nome: 'Criar associado', modulo: 'associado' },
  { codigo: 'associado.editar', nome: 'Editar associado', modulo: 'associado' },
  { codigo: 'associado.excluir', nome: 'Excluir associado', modulo: 'associado' },
  { codigo: 'associado.visualizar', nome: 'Visualizar associado', modulo: 'associado' },
  
  // Módulo Conta Financeira
  { codigo: 'conta_financeira.criar', nome: 'Criar conta financeira', modulo: 'conta_financeira' },
  { codigo: 'conta_financeira.editar', nome: 'Editar conta financeira', modulo: 'conta_financeira' },
  { codigo: 'conta_financeira.excluir', nome: 'Excluir conta financeira', modulo: 'conta_financeira' },
  { codigo: 'conta_financeira.visualizar', nome: 'Visualizar conta financeira', modulo: 'conta_financeira' },
  
  // Módulo Extrato
  { codigo: 'extrato.importar', nome: 'Importar extrato', modulo: 'extrato' },
  { codigo: 'extrato.conciliar', nome: 'Conciliar extrato', modulo: 'extrato' },
  { codigo: 'extrato.visualizar', nome: 'Visualizar extrato', modulo: 'extrato' },
  
  // Módulo Título
  { codigo: 'titulo.criar', nome: 'Criar título', modulo: 'titulo' },
  { codigo: 'titulo.editar', nome: 'Editar título', modulo: 'titulo' },
  { codigo: 'titulo.excluir', nome: 'Excluir título', modulo: 'titulo' },
  { codigo: 'titulo.visualizar', nome: 'Visualizar título', modulo: 'titulo' },
  { codigo: 'titulo.aprovar', nome: 'Aprovar título', modulo: 'titulo' },
  { codigo: 'titulo.baixar', nome: 'Baixar título', modulo: 'titulo' },
  { codigo: 'titulo.estornar', nome: 'Estornar baixa de título', modulo: 'titulo' },
  
  // Módulo Contabilidade
  { codigo: 'lancamento.criar', nome: 'Criar lançamento contábil', modulo: 'contabilidade' },
  { codigo: 'lancamento.editar', nome: 'Editar lançamento contábil', modulo: 'contabilidade' },
  { codigo: 'lancamento.excluir', nome: 'Excluir lançamento contábil', modulo: 'contabilidade' },
  { codigo: 'lancamento.visualizar', nome: 'Visualizar lançamento contábil', modulo: 'contabilidade' },
  { codigo: 'lancamento.estornar', nome: 'Estornar lançamento contábil', modulo: 'contabilidade' },
  
  // Módulo Período
  { codigo: 'periodo.criar', nome: 'Criar período contábil', modulo: 'periodo' },
  { codigo: 'periodo.fechar', nome: 'Fechar período contábil', modulo: 'periodo' },
  { codigo: 'periodo.reabrir', nome: 'Reabrir período contábil', modulo: 'periodo' },
  { codigo: 'periodo.visualizar', nome: 'Visualizar período contábil', modulo: 'periodo' },
  
  // Módulo Plano de Contas
  { codigo: 'plano_contas.criar', nome: 'Criar conta contábil', modulo: 'plano_contas' },
  { codigo: 'plano_contas.editar', nome: 'Editar conta contábil', modulo: 'plano_contas' },
  { codigo: 'plano_contas.excluir', nome: 'Excluir conta contábil', modulo: 'plano_contas' },
  { codigo: 'plano_contas.visualizar', nome: 'Visualizar plano de contas', modulo: 'plano_contas' },
  
  // Módulo Centro de Custo
  { codigo: 'centro_custo.criar', nome: 'Criar centro de custo', modulo: 'centro_custo' },
  { codigo: 'centro_custo.editar', nome: 'Editar centro de custo', modulo: 'centro_custo' },
  { codigo: 'centro_custo.excluir', nome: 'Excluir centro de custo', modulo: 'centro_custo' },
  { codigo: 'centro_custo.visualizar', nome: 'Visualizar centro de custo', modulo: 'centro_custo' },
  
  // Módulo Projeto
  { codigo: 'projeto.criar', nome: 'Criar projeto', modulo: 'projeto' },
  { codigo: 'projeto.editar', nome: 'Editar projeto', modulo: 'projeto' },
  { codigo: 'projeto.excluir', nome: 'Excluir projeto', modulo: 'projeto' },
  { codigo: 'projeto.visualizar', nome: 'Visualizar projeto', modulo: 'projeto' },
  
  // Módulo Fundo
  { codigo: 'fundo.criar', nome: 'Criar fundo', modulo: 'fundo' },
  { codigo: 'fundo.editar', nome: 'Editar fundo', modulo: 'fundo' },
  { codigo: 'fundo.excluir', nome: 'Excluir fundo', modulo: 'fundo' },
  { codigo: 'fundo.visualizar', nome: 'Visualizar fundo', modulo: 'fundo' },
  { codigo: 'fundo.alocar', nome: 'Alocar recursos em fundo', modulo: 'fundo' },
  { codigo: 'fundo.consumir', nome: 'Consumir recursos de fundo', modulo: 'fundo' },
  
  // Módulo Patrimônio
  { codigo: 'bem.criar', nome: 'Criar bem patrimonial', modulo: 'patrimonio' },
  { codigo: 'bem.editar', nome: 'Editar bem patrimonial', modulo: 'patrimonio' },
  { codigo: 'bem.baixar', nome: 'Baixar bem patrimonial', modulo: 'patrimonio' },
  { codigo: 'bem.visualizar', nome: 'Visualizar bens', modulo: 'patrimonio' },
  { codigo: 'depreciacao.calcular', nome: 'Calcular depreciação', modulo: 'patrimonio' },
  
  // Módulo Relatórios
  { codigo: 'relatorio.balancete', nome: 'Gerar balancete', modulo: 'relatorio' },
  { codigo: 'relatorio.dre', nome: 'Gerar DRE', modulo: 'relatorio' },
  { codigo: 'relatorio.balanco', nome: 'Gerar balanço patrimonial', modulo: 'relatorio' },
  { codigo: 'relatorio.razao', nome: 'Gerar razão analítico', modulo: 'relatorio' },
  { codigo: 'relatorio.fluxo_caixa', nome: 'Gerar fluxo de caixa', modulo: 'relatorio' },
  { codigo: 'relatorio.fundos', nome: 'Gerar relatório de fundos', modulo: 'relatorio' },
  { codigo: 'relatorio.exportar', nome: 'Exportar relatórios', modulo: 'relatorio' },
  
  // Módulo Governança
  { codigo: 'usuario.criar', nome: 'Criar usuário', modulo: 'governanca' },
  { codigo: 'usuario.editar', nome: 'Editar usuário', modulo: 'governanca' },
  { codigo: 'usuario.excluir', nome: 'Desativar usuário', modulo: 'governanca' },
  { codigo: 'usuario.visualizar', nome: 'Visualizar usuários', modulo: 'governanca' },
  { codigo: 'papel.atribuir', nome: 'Atribuir papéis', modulo: 'governanca' },
  { codigo: 'auditoria.visualizar', nome: 'Visualizar auditoria', modulo: 'governanca' },
  { codigo: 'configuracao.editar', nome: 'Editar configurações', modulo: 'governanca' },
];

// ============================================================================
// DADOS DE SEED - PLANO DE CONTAS
// ============================================================================
const planoContasData = [
  // ATIVO
  { codigo: '1', nome: 'ATIVO', tipo: 'ativo' as const, naturezaSaldo: 'devedora' as const, classificacao: 'sintetica' as const },
  { codigo: '1.1', nome: 'Ativo Circulante', tipo: 'ativo' as const, naturezaSaldo: 'devedora' as const, classificacao: 'sintetica' as const },
  { codigo: '1.1.1', nome: 'Disponibilidades', tipo: 'ativo' as const, naturezaSaldo: 'devedora' as const, classificacao: 'sintetica' as const },
  { codigo: '1.1.1.001', nome: 'Caixa', tipo: 'ativo' as const, naturezaSaldo: 'devedora' as const, classificacao: 'analitica' as const },
  { codigo: '1.1.1.002', nome: 'Banco do Brasil - Conta Corrente', tipo: 'ativo' as const, naturezaSaldo: 'devedora' as const, classificacao: 'analitica' as const },
  { codigo: '1.1.1.003', nome: 'BB Renda Fácil', tipo: 'ativo' as const, naturezaSaldo: 'devedora' as const, classificacao: 'analitica' as const },
  { codigo: '1.1.1.004', nome: 'Caixa Econômica Federal', tipo: 'ativo' as const, naturezaSaldo: 'devedora' as const, classificacao: 'analitica' as const },
  { codigo: '1.1.2', nome: 'Créditos a Receber', tipo: 'ativo' as const, naturezaSaldo: 'devedora' as const, classificacao: 'sintetica' as const },
  { codigo: '1.1.2.001', nome: 'Contribuições a Receber', tipo: 'ativo' as const, naturezaSaldo: 'devedora' as const, classificacao: 'analitica' as const },
  { codigo: '1.1.2.002', nome: 'Outros Créditos', tipo: 'ativo' as const, naturezaSaldo: 'devedora' as const, classificacao: 'analitica' as const },
  { codigo: '1.2', nome: 'Ativo Não Circulante', tipo: 'ativo' as const, naturezaSaldo: 'devedora' as const, classificacao: 'sintetica' as const },
  { codigo: '1.2.1', nome: 'Imobilizado', tipo: 'ativo' as const, naturezaSaldo: 'devedora' as const, classificacao: 'sintetica' as const },
  { codigo: '1.2.1.001', nome: 'Imóveis', tipo: 'ativo' as const, naturezaSaldo: 'devedora' as const, classificacao: 'analitica' as const },
  { codigo: '1.2.1.002', nome: 'Veículos', tipo: 'ativo' as const, naturezaSaldo: 'devedora' as const, classificacao: 'analitica' as const },
  { codigo: '1.2.1.003', nome: 'Móveis e Utensílios', tipo: 'ativo' as const, naturezaSaldo: 'devedora' as const, classificacao: 'analitica' as const },
  { codigo: '1.2.1.004', nome: 'Equipamentos de Informática', tipo: 'ativo' as const, naturezaSaldo: 'devedora' as const, classificacao: 'analitica' as const },
  { codigo: '1.2.1.005', nome: 'Outros Equipamentos', tipo: 'ativo' as const, naturezaSaldo: 'devedora' as const, classificacao: 'analitica' as const },
  { codigo: '1.2.2', nome: '(-) Depreciação Acumulada', tipo: 'ativo' as const, naturezaSaldo: 'credora' as const, classificacao: 'sintetica' as const },
  { codigo: '1.2.2.001', nome: '(-) Depreciação de Imóveis', tipo: 'ativo' as const, naturezaSaldo: 'credora' as const, classificacao: 'analitica' as const },
  { codigo: '1.2.2.002', nome: '(-) Depreciação de Veículos', tipo: 'ativo' as const, naturezaSaldo: 'credora' as const, classificacao: 'analitica' as const },
  { codigo: '1.2.2.003', nome: '(-) Depreciação de Móveis', tipo: 'ativo' as const, naturezaSaldo: 'credora' as const, classificacao: 'analitica' as const },
  { codigo: '1.2.2.004', nome: '(-) Depreciação de Equip. Informática', tipo: 'ativo' as const, naturezaSaldo: 'credora' as const, classificacao: 'analitica' as const },
  
  // PASSIVO
  { codigo: '2', nome: 'PASSIVO', tipo: 'passivo' as const, naturezaSaldo: 'credora' as const, classificacao: 'sintetica' as const },
  { codigo: '2.1', nome: 'Passivo Circulante', tipo: 'passivo' as const, naturezaSaldo: 'credora' as const, classificacao: 'sintetica' as const },
  { codigo: '2.1.1', nome: 'Obrigações a Pagar', tipo: 'passivo' as const, naturezaSaldo: 'credora' as const, classificacao: 'sintetica' as const },
  { codigo: '2.1.1.001', nome: 'Fornecedores', tipo: 'passivo' as const, naturezaSaldo: 'credora' as const, classificacao: 'analitica' as const },
  { codigo: '2.1.1.002', nome: 'Contas a Pagar', tipo: 'passivo' as const, naturezaSaldo: 'credora' as const, classificacao: 'analitica' as const },
  { codigo: '2.1.2', nome: 'Obrigações Tributárias', tipo: 'passivo' as const, naturezaSaldo: 'credora' as const, classificacao: 'sintetica' as const },
  { codigo: '2.1.2.001', nome: 'ISS a Recolher', tipo: 'passivo' as const, naturezaSaldo: 'credora' as const, classificacao: 'analitica' as const },
  { codigo: '2.1.2.002', nome: 'IRRF a Recolher', tipo: 'passivo' as const, naturezaSaldo: 'credora' as const, classificacao: 'analitica' as const },
  
  // PATRIMÔNIO SOCIAL
  { codigo: '3', nome: 'PATRIMÔNIO SOCIAL', tipo: 'patrimonio_social' as const, naturezaSaldo: 'credora' as const, classificacao: 'sintetica' as const },
  { codigo: '3.1', nome: 'Patrimônio Social', tipo: 'patrimonio_social' as const, naturezaSaldo: 'credora' as const, classificacao: 'sintetica' as const },
  { codigo: '3.1.1', nome: 'Patrimônio Social Acumulado', tipo: 'patrimonio_social' as const, naturezaSaldo: 'credora' as const, classificacao: 'analitica' as const },
  { codigo: '3.2', nome: 'Resultado do Exercício', tipo: 'patrimonio_social' as const, naturezaSaldo: 'credora' as const, classificacao: 'sintetica' as const },
  { codigo: '3.2.1', nome: 'Superávit/Déficit do Exercício', tipo: 'patrimonio_social' as const, naturezaSaldo: 'credora' as const, classificacao: 'analitica' as const },
  { codigo: '3.3', nome: 'Fundos', tipo: 'patrimonio_social' as const, naturezaSaldo: 'credora' as const, classificacao: 'sintetica' as const },
  { codigo: '3.3.1', nome: 'Fundos Restritos', tipo: 'patrimonio_social' as const, naturezaSaldo: 'credora' as const, classificacao: 'analitica' as const },
  { codigo: '3.3.2', nome: 'Fundos Designados', tipo: 'patrimonio_social' as const, naturezaSaldo: 'credora' as const, classificacao: 'analitica' as const },
  
  // RECEITAS
  { codigo: '4', nome: 'RECEITAS', tipo: 'receita' as const, naturezaSaldo: 'credora' as const, classificacao: 'sintetica' as const },
  { codigo: '4.1', nome: 'Receitas de Contribuições', tipo: 'receita' as const, naturezaSaldo: 'credora' as const, classificacao: 'sintetica' as const },
  { codigo: '4.1.1', nome: 'Contribuição de Associados', tipo: 'receita' as const, naturezaSaldo: 'credora' as const, classificacao: 'analitica' as const },
  { codigo: '4.1.2', nome: 'Contribuição de Não Associados', tipo: 'receita' as const, naturezaSaldo: 'credora' as const, classificacao: 'analitica' as const },
  { codigo: '4.2', nome: 'Receitas de Doações', tipo: 'receita' as const, naturezaSaldo: 'credora' as const, classificacao: 'sintetica' as const },
  { codigo: '4.2.1', nome: 'Doações de Pessoas Físicas', tipo: 'receita' as const, naturezaSaldo: 'credora' as const, classificacao: 'analitica' as const },
  { codigo: '4.2.2', nome: 'Doações de Pessoas Jurídicas', tipo: 'receita' as const, naturezaSaldo: 'credora' as const, classificacao: 'analitica' as const },
  { codigo: '4.2.3', nome: 'Doações Restritas (Carimbadas)', tipo: 'receita' as const, naturezaSaldo: 'credora' as const, classificacao: 'analitica' as const },
  { codigo: '4.3', nome: 'Receitas de Eventos', tipo: 'receita' as const, naturezaSaldo: 'credora' as const, classificacao: 'sintetica' as const },
  { codigo: '4.3.1', nome: 'Campanhas e Eventos', tipo: 'receita' as const, naturezaSaldo: 'credora' as const, classificacao: 'analitica' as const },
  { codigo: '4.3.2', nome: 'Bazares e Vendas', tipo: 'receita' as const, naturezaSaldo: 'credora' as const, classificacao: 'analitica' as const },
  { codigo: '4.4', nome: 'Receitas Financeiras', tipo: 'receita' as const, naturezaSaldo: 'credora' as const, classificacao: 'sintetica' as const },
  { codigo: '4.4.1', nome: 'Rendimento de Aplicações', tipo: 'receita' as const, naturezaSaldo: 'credora' as const, classificacao: 'analitica' as const },
  { codigo: '4.4.2', nome: 'Juros Recebidos', tipo: 'receita' as const, naturezaSaldo: 'credora' as const, classificacao: 'analitica' as const },
  { codigo: '4.5', nome: 'Outras Receitas', tipo: 'receita' as const, naturezaSaldo: 'credora' as const, classificacao: 'sintetica' as const },
  { codigo: '4.5.1', nome: 'Premiações', tipo: 'receita' as const, naturezaSaldo: 'credora' as const, classificacao: 'analitica' as const },
  { codigo: '4.5.2', nome: 'Outras Receitas Diversas', tipo: 'receita' as const, naturezaSaldo: 'credora' as const, classificacao: 'analitica' as const },
  
  // DESPESAS
  { codigo: '5', nome: 'DESPESAS', tipo: 'despesa' as const, naturezaSaldo: 'devedora' as const, classificacao: 'sintetica' as const },
  { codigo: '5.1', nome: 'Despesas Administrativas', tipo: 'despesa' as const, naturezaSaldo: 'devedora' as const, classificacao: 'sintetica' as const },
  { codigo: '5.1.1', nome: 'Tarifas Bancárias', tipo: 'despesa' as const, naturezaSaldo: 'devedora' as const, classificacao: 'sintetica' as const },
  { codigo: '5.1.1.001', nome: 'Tarifa de Pix', tipo: 'despesa' as const, naturezaSaldo: 'devedora' as const, classificacao: 'analitica' as const },
  { codigo: '5.1.1.002', nome: 'Tarifa de Pacote de Serviços', tipo: 'despesa' as const, naturezaSaldo: 'devedora' as const, classificacao: 'analitica' as const },
  { codigo: '5.1.1.003', nome: 'Outras Tarifas Bancárias', tipo: 'despesa' as const, naturezaSaldo: 'devedora' as const, classificacao: 'analitica' as const },
  { codigo: '5.1.2', nome: 'Mensalidades e Anuidades', tipo: 'despesa' as const, naturezaSaldo: 'devedora' as const, classificacao: 'sintetica' as const },
  { codigo: '5.1.2.001', nome: 'Mensalidade Federação/Conselho', tipo: 'despesa' as const, naturezaSaldo: 'devedora' as const, classificacao: 'analitica' as const },
  { codigo: '5.2', nome: 'Despesas Tributárias', tipo: 'despesa' as const, naturezaSaldo: 'devedora' as const, classificacao: 'sintetica' as const },
  { codigo: '5.2.1', nome: 'ISS - Imposto sobre Serviços', tipo: 'despesa' as const, naturezaSaldo: 'devedora' as const, classificacao: 'analitica' as const },
  { codigo: '5.2.2', nome: 'IR sobre Aplicações Financeiras', tipo: 'despesa' as const, naturezaSaldo: 'devedora' as const, classificacao: 'analitica' as const },
  { codigo: '5.3', nome: 'Despesas com Utilidades', tipo: 'despesa' as const, naturezaSaldo: 'devedora' as const, classificacao: 'sintetica' as const },
  { codigo: '5.3.1', nome: 'Energia Elétrica', tipo: 'despesa' as const, naturezaSaldo: 'devedora' as const, classificacao: 'analitica' as const },
  { codigo: '5.3.2', nome: 'Água e Esgoto', tipo: 'despesa' as const, naturezaSaldo: 'devedora' as const, classificacao: 'analitica' as const },
  { codigo: '5.3.3', nome: 'Telefone e Internet', tipo: 'despesa' as const, naturezaSaldo: 'devedora' as const, classificacao: 'analitica' as const },
  { codigo: '5.4', nome: 'Despesas com Serviços de Terceiros', tipo: 'despesa' as const, naturezaSaldo: 'devedora' as const, classificacao: 'sintetica' as const },
  { codigo: '5.4.1', nome: 'Serviços de Limpeza', tipo: 'despesa' as const, naturezaSaldo: 'devedora' as const, classificacao: 'analitica' as const },
  { codigo: '5.4.2', nome: 'Serviços de Manutenção', tipo: 'despesa' as const, naturezaSaldo: 'devedora' as const, classificacao: 'analitica' as const },
  { codigo: '5.4.3', nome: 'Serviços Contábeis', tipo: 'despesa' as const, naturezaSaldo: 'devedora' as const, classificacao: 'analitica' as const },
  { codigo: '5.4.4', nome: 'Outros Serviços', tipo: 'despesa' as const, naturezaSaldo: 'devedora' as const, classificacao: 'analitica' as const },
  { codigo: '5.5', nome: 'Despesas com Materiais', tipo: 'despesa' as const, naturezaSaldo: 'devedora' as const, classificacao: 'sintetica' as const },
  { codigo: '5.5.1', nome: 'Material de Construção', tipo: 'despesa' as const, naturezaSaldo: 'devedora' as const, classificacao: 'analitica' as const },
  { codigo: '5.5.2', nome: 'Material de Escritório', tipo: 'despesa' as const, naturezaSaldo: 'devedora' as const, classificacao: 'analitica' as const },
  { codigo: '5.5.3', nome: 'Material de Limpeza', tipo: 'despesa' as const, naturezaSaldo: 'devedora' as const, classificacao: 'analitica' as const },
  { codigo: '5.5.4', nome: 'Outros Materiais', tipo: 'despesa' as const, naturezaSaldo: 'devedora' as const, classificacao: 'analitica' as const },
  { codigo: '5.6', nome: 'Despesas com Depreciação', tipo: 'despesa' as const, naturezaSaldo: 'devedora' as const, classificacao: 'sintetica' as const },
  { codigo: '5.6.1', nome: 'Depreciação de Imóveis', tipo: 'despesa' as const, naturezaSaldo: 'devedora' as const, classificacao: 'analitica' as const },
  { codigo: '5.6.2', nome: 'Depreciação de Veículos', tipo: 'despesa' as const, naturezaSaldo: 'devedora' as const, classificacao: 'analitica' as const },
  { codigo: '5.6.3', nome: 'Depreciação de Móveis e Utensílios', tipo: 'despesa' as const, naturezaSaldo: 'devedora' as const, classificacao: 'analitica' as const },
  { codigo: '5.6.4', nome: 'Depreciação de Equipamentos', tipo: 'despesa' as const, naturezaSaldo: 'devedora' as const, classificacao: 'analitica' as const },
  { codigo: '5.7', nome: 'Despesas Financeiras', tipo: 'despesa' as const, naturezaSaldo: 'devedora' as const, classificacao: 'sintetica' as const },
  { codigo: '5.7.1', nome: 'Juros Pagos', tipo: 'despesa' as const, naturezaSaldo: 'devedora' as const, classificacao: 'analitica' as const },
  { codigo: '5.7.2', nome: 'Multas e Encargos', tipo: 'despesa' as const, naturezaSaldo: 'devedora' as const, classificacao: 'analitica' as const },
  { codigo: '5.8', nome: 'Outras Despesas', tipo: 'despesa' as const, naturezaSaldo: 'devedora' as const, classificacao: 'sintetica' as const },
  { codigo: '5.8.1', nome: 'Outras Despesas Diversas', tipo: 'despesa' as const, naturezaSaldo: 'devedora' as const, classificacao: 'analitica' as const },
];

// ============================================================================
// DADOS DE SEED - CONFIGURAÇÕES INICIAIS
// ============================================================================
const configuracoes = [
  { chave: 'organizacao.nome', valor: { value: 'Centro Espírita Casa do Caminho' }, descricao: 'Nome da organização' },
  { chave: 'organizacao.cnpj', valor: { value: '' }, descricao: 'CNPJ da organização' },
  { chave: 'contabilidade.exercicio_atual', valor: { ano: new Date().getFullYear() }, descricao: 'Exercício contábil atual' },
  { chave: 'contabilidade.regime', valor: { value: 'competencia' }, descricao: 'Regime contábil (competencia ou caixa)' },
  { chave: 'lgpd.prazo_retencao_anos', valor: { value: 10 }, descricao: 'Prazo de retenção de dados pessoais em anos' },
  { chave: 'lgpd.anonimizar_apos_anos', valor: { value: 15 }, descricao: 'Anos após os quais anonimizar dados' },
  { chave: 'workflow.aprovacao_valor_minimo', valor: { value: 500 }, descricao: 'Valor mínimo para exigir aprovação (R$)' },
  { chave: 'workflow.aprovacao_niveis', valor: { value: 1 }, descricao: 'Número de níveis de aprovação' },
];

// ============================================================================
// DADOS DE SEED - CENTROS DE CUSTO
// ============================================================================
const centrosCusto = [
  { codigo: 'ADM', nome: 'Administração', descricao: 'Despesas administrativas gerais' },
  { codigo: 'OS', nome: 'Obras Sociais', descricao: 'Atividades de assistência social' },
  { codigo: 'ED', nome: 'Educação', descricao: 'Atividades educativas e cursos' },
  { codigo: 'MAN', nome: 'Manutenção', descricao: 'Manutenção predial e patrimonial' },
  { codigo: 'EVT', nome: 'Eventos', descricao: 'Eventos e campanhas' },
];

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

function getParentCode(code: string): string | null {
  const parts = code.split('.');
  if (parts.length <= 1) return null;
  parts.pop();
  return parts.join('.');
}

function calcularNivel(codigo: string): number {
  return codigo.split('.').length - 1;
}

// ============================================================================
// FUNÇÃO DE SEED
// ============================================================================

async function seed() {
  console.log('🌱 Iniciando seed completo do sistema...\n');
  
  // 1. Papéis
  console.log('📋 Inserindo papéis...');
  const papelIdMap: Record<string, string> = {};
  for (const p of papeis) {
    try {
      const [result] = await db.insert(schema.papel).values(p).returning({ id: schema.papel.id });
      papelIdMap[p.codigo] = result.id;
      console.log(`  ✅ ${p.codigo} - ${p.nome}`);
    } catch (error: any) {
      if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
        console.log(`  ⏭️  ${p.codigo} (já existe)`);
      } else {
        console.error(`  ❌ ${p.codigo}: ${error.message}`);
      }
    }
  }
  
  // 2. Permissões
  console.log('\n🔐 Inserindo permissões...');
  const permissaoIdMap: Record<string, string> = {};
  for (const perm of permissoes) {
    try {
      const [result] = await db.insert(schema.permissao).values(perm).returning({ id: schema.permissao.id });
      permissaoIdMap[perm.codigo] = result.id;
      console.log(`  ✅ ${perm.codigo}`);
    } catch (error: any) {
      if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
        console.log(`  ⏭️  ${perm.codigo} (já existe)`);
      } else {
        console.error(`  ❌ ${perm.codigo}: ${error.message}`);
      }
    }
  }
  
  // 3. Atribuir todas as permissões ao admin
  console.log('\n🔗 Atribuindo permissões ao administrador...');
  if (papelIdMap['admin']) {
    for (const [codigo, permId] of Object.entries(permissaoIdMap)) {
      try {
        await db.insert(schema.papelPermissao).values({
          papelId: papelIdMap['admin'],
          permissaoId: permId,
        });
      } catch (error: any) {
        // Ignora duplicatas
      }
    }
    console.log('  ✅ Todas as permissões atribuídas ao admin');
  }
  
  // 4. Plano de Contas
  console.log('\n📊 Inserindo plano de contas...');
  const contaIdMap: Record<string, string> = {};
  for (const conta of planoContasData) {
    const parentCode = getParentCode(conta.codigo);
    const parentId = parentCode ? contaIdMap[parentCode] : null;
    
    try {
      const [result] = await db.insert(schema.planoContas).values({
        codigo: conta.codigo,
        nome: conta.nome,
        tipo: conta.tipo,
        naturezaSaldo: conta.naturezaSaldo,
        classificacao: conta.classificacao,
        nivel: calcularNivel(conta.codigo),
        contaPaiId: parentId,
        aceitaLancamento: conta.classificacao === 'analitica',
        ativo: true,
      }).returning({ id: schema.planoContas.id });
      
      contaIdMap[conta.codigo] = result.id;
      console.log(`  ✅ ${conta.codigo} - ${conta.nome}`);
    } catch (error: any) {
      if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
        console.log(`  ⏭️  ${conta.codigo} (já existe)`);
      } else {
        console.error(`  ❌ ${conta.codigo}: ${error.message}`);
      }
    }
  }
  
  // 5. Centros de Custo
  console.log('\n🏢 Inserindo centros de custo...');
  for (const cc of centrosCusto) {
    try {
      await db.insert(schema.centroCusto).values(cc);
      console.log(`  ✅ ${cc.codigo} - ${cc.nome}`);
    } catch (error: any) {
      if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
        console.log(`  ⏭️  ${cc.codigo} (já existe)`);
      } else {
        console.error(`  ❌ ${cc.codigo}: ${error.message}`);
      }
    }
  }
  
  // 6. Configurações
  console.log('\n⚙️  Inserindo configurações...');
  for (const config of configuracoes) {
    try {
      await db.insert(schema.configuracaoSistema).values(config);
      console.log(`  ✅ ${config.chave}`);
    } catch (error: any) {
      if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
        console.log(`  ⏭️  ${config.chave} (já existe)`);
      } else {
        console.error(`  ❌ ${config.chave}: ${error.message}`);
      }
    }
  }
  
  console.log('\n✅ Seed completo finalizado!');
  console.log(`📊 Resumo:`);
  console.log(`   - Papéis: ${papeis.length}`);
  console.log(`   - Permissões: ${permissoes.length}`);
  console.log(`   - Contas contábeis: ${planoContasData.length}`);
  console.log(`   - Centros de custo: ${centrosCusto.length}`);
  console.log(`   - Configurações: ${configuracoes.length}`);
}

seed().catch(console.error);

