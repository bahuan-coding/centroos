/**
 * Hook para Motor Fiscal
 * 
 * Acesso aos endpoints do motor fiscal unificado.
 */

import { trpc } from '@/lib/trpc';

// ============================================================================
// TYPES
// ============================================================================

export type TipoDocumentoFiscal = 'NFSE_SP' | 'NFSE_NACIONAL' | 'NFE' | 'NFCE';

export type EstadoDocumentoFiscal = 
  | 'RASCUNHO' 
  | 'VALIDADO' 
  | 'TRANSMITIDO' 
  | 'AUTORIZADO' 
  | 'REJEITADO' 
  | 'DENEGADO'
  | 'CANCELAMENTO_PENDENTE' 
  | 'CANCELADO' 
  | 'SUBSTITUIDO' 
  | 'INUTILIZADO';

export interface DecisaoFiscalInput {
  tipoOperacao: 'SERVICO' | 'MERCADORIA' | 'MISTO';
  emitente: {
    cpfCnpj: string;
    uf: string;
    codigoMunicipio: string;
    inscricaoEstadual?: string;
    inscricaoMunicipal?: string;
    regimeTributario: 'SIMPLES_NACIONAL' | 'LUCRO_PRESUMIDO' | 'LUCRO_REAL' | 'MEI';
  };
  destinatario: {
    tipo: 'PJ' | 'PF' | 'ESTRANGEIRO';
    cpfCnpj?: string;
    uf?: string;
    codigoMunicipio?: string;
    isConsumidorFinal: boolean;
  };
  localVenda: 'PRESENCIAL' | 'INTERNET' | 'TELEFONE' | 'DOMICILIO';
  valorTotal: number;
  servico?: {
    codigoLC116: string;
    codigoTribNacional?: string;
  };
  mercadoria?: {
    ncm: string;
    cfop: string;
  };
}

export interface DecisaoFiscalResult {
  tipoDocumento: TipoDocumentoFiscal;
  motivo: string;
  regras: string[];
  modelo: number | null;
  isNFSe: boolean;
  isNFe: boolean;
}

export interface FeatureFlags {
  usarNovoCore: boolean;
  shadowMode: boolean;
  logComparacao: boolean;
}

export interface MetricasFiscais {
  emissaoTotal: number;
  emissaoSucesso: number;
  emissaoErro: number;
  consultaTotal: number;
  cancelamentoTotal: number;
  errosPorCategoria: Record<string, number>;
}

// ============================================================================
// HOOK PRINCIPAL
// ============================================================================

export function useFiscal() {
  const utils = trpc.useUtils();

  // Decisor fiscal
  const decidir = trpc.fiscal.decidir.useQuery;

  // Validadores
  const validar = trpc.fiscal.validar.useQuery;
  const validarRPS = trpc.fiscal.validarRPS.useQuery;

  // Máquina de estados
  const transicoesPermitidas = trpc.fiscal.transicoesPermitidas.useQuery;
  const podeTransitar = trpc.fiscal.podeTransitar.useQuery;

  // Feature flags
  const getFeatureFlags = trpc.fiscal.getFeatureFlags.useQuery;
  const setFeatureFlags = trpc.fiscal.setFeatureFlags.useMutation({
    onSuccess: () => {
      utils.fiscal.getFeatureFlags.invalidate();
    },
  });

  // Métricas
  const metricas = trpc.fiscal.metricas.useQuery;

  // Auditoria
  const auditoria = trpc.fiscal.auditoria.useQuery;

  // Catálogo de erros
  const categoriasErro = trpc.fiscal.categoriasErro.useQuery;
  const infoErro = trpc.fiscal.infoErro.useQuery;

  // Emissão NFS-e SP
  const emitirRPSSP = trpc.fiscal.emitirRPSSP.useMutation({
    onSuccess: () => {
      utils.fiscal.metricas.invalidate();
      utils.fiscal.auditoria.invalidate();
    },
  });

  return {
    // Queries
    decidir,
    validar,
    validarRPS,
    transicoesPermitidas,
    podeTransitar,
    getFeatureFlags,
    metricas,
    auditoria,
    categoriasErro,
    infoErro,
    
    // Mutations
    setFeatureFlags,
    emitirRPSSP,

    // Utils
    invalidate: () => {
      utils.fiscal.invalidate();
    },
  };
}

// ============================================================================
// HOOK PARA DECISÃO FISCAL
// ============================================================================

export function useDecisaoFiscal(input: DecisaoFiscalInput | undefined, enabled = true) {
  return trpc.fiscal.decidir.useQuery(input!, {
    enabled: enabled && !!input,
  });
}

// ============================================================================
// HOOK PARA VALIDAÇÃO
// ============================================================================

export function useValidarDocumento(tipo: 'cpf' | 'cnpj' | 'municipio' | 'uf' | 'ncm' | 'cfop', valor: string, enabled = true) {
  return trpc.fiscal.validar.useQuery(
    { tipo, valor },
    { enabled: enabled && valor.length > 0 }
  );
}

// ============================================================================
// HOOK PARA FEATURE FLAGS
// ============================================================================

export function useFeatureFlags() {
  const query = trpc.fiscal.getFeatureFlags.useQuery(undefined, {
    staleTime: 30000, // 30 segundos
  });

  const mutation = trpc.fiscal.setFeatureFlags.useMutation({
    onSuccess: () => {
      query.refetch();
    },
  });

  return {
    flags: query.data,
    isLoading: query.isLoading,
    error: query.error,
    setFlags: mutation.mutate,
    isUpdating: mutation.isPending,
  };
}

// ============================================================================
// HOOK PARA MÉTRICAS
// ============================================================================

export function useMetricasFiscais() {
  return trpc.fiscal.metricas.useQuery(undefined, {
    refetchInterval: 60000, // Atualiza a cada minuto
  });
}


