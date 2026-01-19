/**
 * Hooks customizados do sistema
 * 
 * Este módulo exporta todos os hooks reutilizáveis.
 * Para usar: import { useIsMobile, useFiscal } from '@/lib/hooks';
 */

// UI Hooks
export { useIsMobile } from './useIsMobile';

// Domain Hooks
export { 
  useFiscal, 
  useDecisaoFiscal, 
  useValidarDocumento, 
  useFeatureFlags, 
  useMetricasFiscais 
} from './useFiscal';

// Types re-exports
export type { 
  TipoDocumentoFiscal, 
  EstadoDocumentoFiscal, 
  DecisaoFiscalInput, 
  DecisaoFiscalResult,
  FeatureFlags,
  MetricasFiscais,
} from './useFiscal';
