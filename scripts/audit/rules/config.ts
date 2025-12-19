/**
 * Configuração de Regras de Auditoria
 * Sistema de Gestão Financeira para Centro Espírita
 * Baseado em ITG 2002 (R1), NBC T-10.19 e legislação fiscal
 */

import type { ConfiguracaoRegras, RegraAuditoria, Severidade, Categoria, ModuloAuditoria } from '../types';

// ============================================================================
// CONFIGURAÇÃO GLOBAL
// ============================================================================

export const CONFIG: ConfiguracaoRegras = {
  toleranciaValor: 1, // R$ 0,01 de tolerância
  toleranciaDias: 0, // Sem tolerância para datas
  limiteDuplicatas: 3, // Distância Levenshtein máxima para considerar duplicata
  percentualNFC70: 70, // 70% para projetos (NFC)
  percentualNFC30: 30, // 30% para custeio (NFC)
};

// ============================================================================
// DEFINIÇÃO DE REGRAS POR CATEGORIA
// ============================================================================

interface RegraDefinicao {
  id: string;
  nome: string;
  descricao: string;
  severidade: Severidade;
  categoria: Categoria;
  modulo: ModuloAuditoria;
  ativa: boolean;
}

export const REGRAS_CADASTRO: RegraDefinicao[] = [
  {
    id: 'CAD-001',
    nome: 'Pessoa Duplicada por Nome',
    descricao: 'Detecta pessoas com nomes muito similares que podem ser duplicatas',
    severidade: 'aviso',
    categoria: 'cadastro',
    modulo: 'pessoas',
    ativa: true,
  },
  {
    id: 'CAD-002',
    nome: 'CPF Inválido',
    descricao: 'Valida dígitos verificadores do CPF',
    severidade: 'erro',
    categoria: 'cadastro',
    modulo: 'pessoas',
    ativa: true,
  },
  {
    id: 'CAD-003',
    nome: 'CNPJ Inválido',
    descricao: 'Valida dígitos verificadores do CNPJ',
    severidade: 'erro',
    categoria: 'cadastro',
    modulo: 'pessoas',
    ativa: true,
  },
  {
    id: 'CAD-004',
    nome: 'Documento Duplicado',
    descricao: 'Detecta CPF/CNPJ cadastrado em mais de uma pessoa',
    severidade: 'erro',
    categoria: 'cadastro',
    modulo: 'pessoas',
    ativa: true,
  },
  {
    id: 'CAD-005',
    nome: 'Associado Sem Contribuição',
    descricao: 'Associado ativo sem nenhuma contribuição no período',
    severidade: 'aviso',
    categoria: 'cadastro',
    modulo: 'pessoas',
    ativa: true,
  },
  {
    id: 'CAD-006',
    nome: 'Pessoa Sem Contato',
    descricao: 'Pessoa ativa sem nenhum contato cadastrado',
    severidade: 'info',
    categoria: 'cadastro',
    modulo: 'pessoas',
    ativa: true,
  },
];

export const REGRAS_DOACOES: RegraDefinicao[] = [
  {
    id: 'DOA-001',
    nome: 'Doação Sem Pessoa',
    descricao: 'Título de doação/contribuição sem pessoa vinculada',
    severidade: 'aviso',
    categoria: 'operacional',
    modulo: 'doacoes',
    ativa: true,
  },
  {
    id: 'DOA-002',
    nome: 'Valor Divergente do Rawdata',
    descricao: 'Valor do título difere do valor no rawdata original',
    severidade: 'erro',
    categoria: 'operacional',
    modulo: 'doacoes',
    ativa: true,
  },
  {
    id: 'DOA-003',
    nome: 'Pessoa Não Encontrada',
    descricao: 'Nome no rawdata não encontra correspondência no cadastro',
    severidade: 'aviso',
    categoria: 'operacional',
    modulo: 'doacoes',
    ativa: true,
  },
  {
    id: 'DOA-004',
    nome: 'Título Duplicado',
    descricao: 'Mesmo valor, pessoa e data aparecem mais de uma vez',
    severidade: 'erro',
    categoria: 'operacional',
    modulo: 'doacoes',
    ativa: true,
  },
  {
    id: 'DOA-005',
    nome: 'Título Sem Baixa',
    descricao: 'Título quitado sem registro de baixa correspondente',
    severidade: 'aviso',
    categoria: 'operacional',
    modulo: 'doacoes',
    ativa: true,
  },
];

export const REGRAS_CONTABIL: RegraDefinicao[] = [
  {
    id: 'CTB-001',
    nome: 'Partida Desbalanceada',
    descricao: 'Lançamento com débito diferente de crédito',
    severidade: 'erro',
    categoria: 'contabil',
    modulo: 'contabil',
    ativa: true,
  },
  {
    id: 'CTB-002',
    nome: 'Lançamento em Período Fechado',
    descricao: 'Tentativa de lançamento em período já fechado',
    severidade: 'erro',
    categoria: 'contabil',
    modulo: 'contabil',
    ativa: true,
  },
  {
    id: 'CTB-003',
    nome: 'Conta Sintética com Lançamento',
    descricao: 'Lançamento direto em conta sintética (não-analítica)',
    severidade: 'erro',
    categoria: 'contabil',
    modulo: 'contabil',
    ativa: true,
  },
  {
    id: 'CTB-004',
    nome: 'Período Sem Fechamento',
    descricao: 'Período passado ainda em status aberto',
    severidade: 'aviso',
    categoria: 'contabil',
    modulo: 'contabil',
    ativa: true,
  },
  {
    id: 'CTB-005',
    nome: 'Saldo Conta Negativo',
    descricao: 'Conta de ativo com saldo credor ou passivo com saldo devedor',
    severidade: 'aviso',
    categoria: 'contabil',
    modulo: 'contabil',
    ativa: true,
  },
  {
    id: 'CTB-006',
    nome: 'Lançamento Sem Histórico',
    descricao: 'Lançamento contábil sem histórico adequado',
    severidade: 'aviso',
    categoria: 'contabil',
    modulo: 'contabil',
    ativa: true,
  },
];

export const REGRAS_FISCAL: RegraDefinicao[] = [
  {
    id: 'FIS-001',
    nome: 'NFC - Distribuição 70/30',
    descricao: 'Recursos da Nota Fiscal Cidadã devem ser 70% projeto e 30% custeio',
    severidade: 'erro',
    categoria: 'fiscal',
    modulo: 'fiscal',
    ativa: true,
  },
  {
    id: 'FIS-002',
    nome: 'ITG 2002 - Regime de Competência',
    descricao: 'Verificar se lançamentos seguem regime de competência mensal',
    severidade: 'erro',
    categoria: 'fiscal',
    modulo: 'fiscal',
    ativa: true,
  },
  {
    id: 'FIS-003',
    nome: 'Despesa Sem Documento',
    descricao: 'Despesa sem número de documento fiscal',
    severidade: 'aviso',
    categoria: 'fiscal',
    modulo: 'fiscal',
    ativa: true,
  },
  {
    id: 'FIS-004',
    nome: 'SEFAZ - Prazo Declaração',
    descricao: 'Verificar prazos de declaração SEFAZ',
    severidade: 'info',
    categoria: 'fiscal',
    modulo: 'fiscal',
    ativa: true,
  },
  {
    id: 'FIS-005',
    nome: 'Receita Não Classificada',
    descricao: 'Receita sem classificação adequada (doação/contribuição/convênio)',
    severidade: 'aviso',
    categoria: 'fiscal',
    modulo: 'fiscal',
    ativa: true,
  },
];

export const REGRAS_CONCILIACAO: RegraDefinicao[] = [
  {
    id: 'CON-001',
    nome: 'Extrato Não Conciliado',
    descricao: 'Linha de extrato sem vínculo com título ou lançamento',
    severidade: 'aviso',
    categoria: 'conciliacao',
    modulo: 'conciliacao',
    ativa: true,
  },
  {
    id: 'CON-002',
    nome: 'Valor Divergente',
    descricao: 'Valor do extrato difere do valor do título vinculado',
    severidade: 'erro',
    categoria: 'conciliacao',
    modulo: 'conciliacao',
    ativa: true,
  },
  {
    id: 'CON-003',
    nome: 'Data Divergente',
    descricao: 'Data do movimento difere da data de pagamento do título',
    severidade: 'aviso',
    categoria: 'conciliacao',
    modulo: 'conciliacao',
    ativa: true,
  },
  {
    id: 'CON-004',
    nome: 'Saldo Extrato Divergente',
    descricao: 'Saldo calculado difere do saldo informado no extrato',
    severidade: 'erro',
    categoria: 'conciliacao',
    modulo: 'conciliacao',
    ativa: true,
  },
];

// ============================================================================
// EXPORTAR TODAS AS REGRAS
// ============================================================================

export const TODAS_REGRAS: RegraDefinicao[] = [
  ...REGRAS_CADASTRO,
  ...REGRAS_DOACOES,
  ...REGRAS_CONTABIL,
  ...REGRAS_FISCAL,
  ...REGRAS_CONCILIACAO,
];

export function obterRegrasPorModulo(modulo: ModuloAuditoria): RegraDefinicao[] {
  if (modulo === 'todos') return TODAS_REGRAS.filter(r => r.ativa);
  return TODAS_REGRAS.filter(r => r.modulo === modulo && r.ativa);
}

export function obterRegrasPorCategoria(categoria: Categoria): RegraDefinicao[] {
  return TODAS_REGRAS.filter(r => r.categoria === categoria && r.ativa);
}

export function obterRegraPorId(id: string): RegraDefinicao | undefined {
  return TODAS_REGRAS.find(r => r.id === id);
}

