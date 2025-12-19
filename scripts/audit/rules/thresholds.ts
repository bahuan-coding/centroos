/**
 * Limites e Tolerâncias para Auditoria
 * Configurações ajustáveis para diferentes cenários de validação
 */

// ============================================================================
// VALORES MONETÁRIOS
// ============================================================================

/**
 * Tolerância para diferenças de valores em centavos
 * Usado para comparar valores do rawdata com títulos
 */
export const TOLERANCIA_VALOR_CENTAVOS = 1; // R$ 0,01

/**
 * Valor mínimo para considerar uma despesa significativa
 * Despesas abaixo deste valor podem ter regras mais flexíveis
 */
export const DESPESA_MINIMA_DOCUMENTACAO = 100; // R$ 100,00

/**
 * Valor mínimo para receitas que devem ser classificadas
 */
export const RECEITA_MINIMA_CLASSIFICACAO = 50; // R$ 50,00

/**
 * Limite de valor para exigir aprovação de segunda instância
 */
export const LIMITE_APROVACAO_SIMPLES = 5000; // R$ 5.000,00

// ============================================================================
// DATAS E PERÍODOS
// ============================================================================

/**
 * Tolerância em dias para conciliação de datas
 */
export const TOLERANCIA_DIAS_CONCILIACAO = 0;

/**
 * Dias antes do vencimento para alertar sobre pagamentos pendentes
 */
export const ALERTA_VENCIMENTO_DIAS = 7;

/**
 * Máximo de dias de diferença entre emissão e competência (ITG 2002)
 */
export const MAX_DIFERENCA_COMPETENCIA_DIAS = 30;

/**
 * Meses anteriores que devem estar fechados
 * Ex: 2 significa que o mês anterior ao anterior deve estar fechado
 */
export const MESES_ANTERIORES_FECHADOS = 2;

// ============================================================================
// TEXTO E SIMILARIDADE
// ============================================================================

/**
 * Distância Levenshtein máxima para considerar nomes como duplicatas
 */
export const DISTANCIA_LEVENSHTEIN_DUPLICATA = 3;

/**
 * Tamanho mínimo de histórico para lançamentos contábeis
 */
export const TAMANHO_MINIMO_HISTORICO = 10;

/**
 * Tamanho máximo de descrição de título
 */
export const TAMANHO_MAXIMO_DESCRICAO = 500;

// ============================================================================
// PERCENTUAIS
// ============================================================================

/**
 * Percentual mínimo de recursos NFC para projetos
 */
export const PERCENTUAL_NFC_PROJETO = 70;

/**
 * Percentual máximo de recursos NFC para custeio
 */
export const PERCENTUAL_NFC_CUSTEIO = 30;

/**
 * Percentual de confiança para sugestão automática de conciliação
 */
export const CONFIANCA_MINIMA_CONCILIACAO = 85;

// ============================================================================
// LIMITES DE QUANTIDADE
// ============================================================================

/**
 * Número máximo de resultados para exibir no console por categoria
 */
export const MAX_RESULTADOS_CONSOLE_ERROS = 50;
export const MAX_RESULTADOS_CONSOLE_AVISOS = 30;
export const MAX_RESULTADOS_CONSOLE_INFOS = 20;

/**
 * Número máximo de duplicatas a reportar antes de agrupar
 */
export const MAX_DUPLICATAS_REPORTAR = 100;

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

/**
 * Verifica se um valor está dentro da tolerância
 */
export function dentroToleranciaValor(valor1: number, valor2: number): boolean {
  return Math.abs(valor1 - valor2) * 100 <= TOLERANCIA_VALOR_CENTAVOS;
}

/**
 * Verifica se uma data está dentro da tolerância de dias
 */
export function dentroToleranciaDias(data1: Date, data2: Date): boolean {
  const diffMs = Math.abs(data1.getTime() - data2.getTime());
  const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return diffDias <= TOLERANCIA_DIAS_CONCILIACAO;
}

/**
 * Calcula similaridade percentual entre dois nomes
 */
export function calcularSimilaridade(nome1: string, nome2: string): number {
  const maxLen = Math.max(nome1.length, nome2.length);
  if (maxLen === 0) return 100;
  
  // Cálculo simples de distância de Levenshtein
  const matriz: number[][] = [];
  for (let i = 0; i <= nome2.length; i++) matriz[i] = [i];
  for (let j = 0; j <= nome1.length; j++) matriz[0][j] = j;
  
  for (let i = 1; i <= nome2.length; i++) {
    for (let j = 1; j <= nome1.length; j++) {
      matriz[i][j] = nome2[i - 1] === nome1[j - 1]
        ? matriz[i - 1][j - 1]
        : Math.min(matriz[i - 1][j - 1] + 1, matriz[i][j - 1] + 1, matriz[i - 1][j] + 1);
    }
  }
  
  const distancia = matriz[nome2.length][nome1.length];
  return Math.round((1 - distancia / maxLen) * 100);
}

