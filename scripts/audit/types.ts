/**
 * Tipos e Interfaces do Framework de Auditoria Contábil
 * Sistema de Gestão Financeira para Centro Espírita
 * Baseado em ITG 2002 (R1) e NBC T-10.19
 */

// ============================================================================
// ENUMS
// ============================================================================

export type Severidade = 'erro' | 'aviso' | 'info';
export type Categoria = 'fiscal' | 'contabil' | 'cadastro' | 'operacional' | 'conciliacao';
export type ModuloAuditoria = 'pessoas' | 'doacoes' | 'contabil' | 'fiscal' | 'conciliacao' | 'todos';
export type FormatoRelatorio = 'csv' | 'md' | 'json' | 'console';

export const MESES = [
  'janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
] as const;

export type NomeMes = typeof MESES[number];

// ============================================================================
// INTERFACES PRINCIPAIS
// ============================================================================

export interface ParametrosAuditoria {
  mes?: NomeMes | number;
  ano: number;
  todos: boolean;
  modulos: ModuloAuditoria[];
  dryRun: boolean;
  formato: FormatoRelatorio;
  output?: string;
  verbose: boolean;
}

export interface ResultadoValidacao {
  regraId: string;
  regraNome: string;
  severidade: Severidade;
  categoria: Categoria;
  mensagem: string;
  entidade?: string;
  entidadeId?: string;
  campo?: string;
  valorAtual?: string | number;
  valorEsperado?: string | number;
  sugestao?: string;
  linha?: number;
  arquivo?: string;
}

export interface ResumoAuditoria {
  dataExecucao: Date;
  parametros: ParametrosAuditoria;
  totalValidacoes: number;
  erros: number;
  avisos: number;
  infos: number;
  porCategoria: Record<Categoria, number>;
  porModulo: Record<ModuloAuditoria, number>;
  tempoExecucaoMs: number;
}

export interface RelatorioAuditoria {
  resumo: ResumoAuditoria;
  resultados: ResultadoValidacao[];
}

// ============================================================================
// INTERFACES DE DADOS
// ============================================================================

export interface DadosPessoa {
  id: string;
  nome: string;
  tipo: 'fisica' | 'juridica';
  ativo: boolean;
  documentos: Array<{ tipo: string; numero: string }>;
  contatos: Array<{ tipo: string; valor: string }>;
  associado?: {
    status: string;
    categoria: string;
    dataAdmissao: string;
    valorContribuicao?: number;
  };
}

export interface DadosTitulo {
  id: string;
  tipo: 'pagar' | 'receber';
  natureza: string;
  pessoaId?: string;
  pessoaNome?: string;
  descricao: string;
  valorOriginal: number;
  valorLiquido: number;
  dataEmissao: string;
  dataCompetencia: string;
  dataVencimento: string;
  status: string;
  sourceSystem?: string;
  importBatchId?: string;
  baixas: Array<{
    id: string;
    dataPagamento: string;
    valorPago: number;
    contaFinanceiraId: string;
  }>;
}

export interface DadosLancamento {
  id: string;
  numero: number;
  periodoId: string;
  dataLancamento: string;
  dataCompetencia: string;
  historico: string;
  origem: string;
  status: string;
  totalDebito: number;
  totalCredito: number;
  linhas: Array<{
    contaId: string;
    contaCodigo: string;
    contaNome: string;
    tipo: 'debito' | 'credito';
    valor: number;
  }>;
}

export interface DadosExtrato {
  id: string;
  contaFinanceiraId: string;
  contaNome: string;
  dataMovimento: string;
  tipo: 'credito' | 'debito';
  valor: number;
  descricaoOriginal: string;
  status: string;
  conciliado: boolean;
  tituloVinculadoId?: string;
}

export interface DadosPeriodo {
  id: string;
  ano: number;
  mes: number;
  dataInicio: string;
  dataFim: string;
  status: 'aberto' | 'em_revisao' | 'fechado' | 'reaberto';
}

export interface DadosRawdata {
  lineNumber: number;
  data: Date;
  documento: string;
  cnpj: string;
  fornecedor: string;
  descricao: string;
  valorCaixa: number;
  valorBB: number;
  valorBBRF: number;
  valorCEF: number;
  valorTotal: number;
  tipo: string;
  natureza: string;
}

// ============================================================================
// CONTEXTO DE AUDITORIA
// ============================================================================

export interface ContextoAuditoria {
  parametros: ParametrosAuditoria;
  
  // Dados carregados do banco
  pessoas: DadosPessoa[];
  titulos: DadosTitulo[];
  lancamentos: DadosLancamento[];
  extratos: DadosExtrato[];
  periodos: DadosPeriodo[];
  
  // Dados do rawdata
  rawdata: Map<string, DadosRawdata[]>; // Chave: "mes-ano"
  
  // Mapas auxiliares para lookup rápido
  pessoasPorId: Map<string, DadosPessoa>;
  pessoasPorNome: Map<string, DadosPessoa[]>;
  titulosPorPessoa: Map<string, DadosTitulo[]>;
  titulosPorCompetencia: Map<string, DadosTitulo[]>;
}

// ============================================================================
// REGRAS DE AUDITORIA
// ============================================================================

export interface RegraAuditoria {
  id: string;
  nome: string;
  descricao: string;
  severidade: Severidade;
  categoria: Categoria;
  modulo: ModuloAuditoria;
  ativa: boolean;
  validar: (ctx: ContextoAuditoria) => Promise<ResultadoValidacao[]>;
}

export interface ConfiguracaoRegras {
  toleranciaValor: number; // Diferença aceitável em centavos
  toleranciaDias: number; // Diferença aceitável em dias para datas
  limiteDuplicatas: number; // Distância Levenshtein para considerar duplicata
  percentualNFC70: number; // 70% para projetos (NFC)
  percentualNFC30: number; // 30% para custeio (NFC)
}

// ============================================================================
// VALIDADORES
// ============================================================================

export interface Validador {
  modulo: ModuloAuditoria;
  nome: string;
  descricao: string;
  regras: RegraAuditoria[];
  executar: (ctx: ContextoAuditoria) => Promise<ResultadoValidacao[]>;
}

// ============================================================================
// UTILIDADES
// ============================================================================

export function getMesNumero(mes: NomeMes | number): number {
  if (typeof mes === 'number') return mes;
  return MESES.indexOf(mes) + 1;
}

export function getMesNome(mes: number): NomeMes {
  return MESES[mes - 1];
}

export function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export function formatarData(data: Date | string): string {
  const d = typeof data === 'string' ? new Date(data) : data;
  return d.toLocaleDateString('pt-BR');
}

export function normalizarNome(nome: string): string {
  return nome
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

export function levenshtein(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      matrix[i][j] = b.charAt(i - 1) === a.charAt(j - 1)
        ? matrix[i - 1][j - 1]
        : Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
    }
  }
  return matrix[b.length][a.length];
}

export function validarCPF(cpf: string): boolean {
  const cleaned = cpf.replace(/\D/g, '');
  if (cleaned.length !== 11 || /^(\d)\1+$/.test(cleaned)) return false;
  
  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(cleaned[i]) * (10 - i);
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cleaned[9])) return false;
  
  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(cleaned[i]) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  return resto === parseInt(cleaned[10]);
}

export function validarCNPJ(cnpj: string): boolean {
  const cleaned = cnpj.replace(/\D/g, '');
  if (cleaned.length !== 14 || /^(\d)\1+$/.test(cleaned)) return false;
  
  const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  
  let soma = 0;
  for (let i = 0; i < 12; i++) soma += parseInt(cleaned[i]) * pesos1[i];
  let resto = soma % 11;
  const dig1 = resto < 2 ? 0 : 11 - resto;
  if (dig1 !== parseInt(cleaned[12])) return false;
  
  soma = 0;
  for (let i = 0; i < 13; i++) soma += parseInt(cleaned[i]) * pesos2[i];
  resto = soma % 11;
  const dig2 = resto < 2 ? 0 : 11 - resto;
  return dig2 === parseInt(cleaned[13]);
}

