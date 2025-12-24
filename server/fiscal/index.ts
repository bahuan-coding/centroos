/**
 * Motor Fiscal - Exports Públicos
 * 
 * Módulo unificado para emissão de documentos fiscais:
 * - NFS-e Municipal (SP)
 * - NFS-e Nacional (ADN) - em desenvolvimento
 * - NF-e (modelo 55) - em desenvolvimento
 * - NFC-e (modelo 65) - em desenvolvimento
 * 
 * Ref: docs/spec-fiscal/00-visao-geral-motor-fiscal.md
 */

// ============================================================================
// TIPOS
// ============================================================================

export * from './types';

// ============================================================================
// DECISOR FISCAL
// ============================================================================

export { 
  decidirDocumentoFiscal,
  isMunicipioConveniado,
  adicionarMunicipioConveniado,
  isNFSe,
  isNFe,
  getModeloFiscal,
} from './decisor';

// ============================================================================
// MÁQUINA DE ESTADOS
// ============================================================================

export {
  MaquinaEstadoFiscal,
  podeTransitar,
  isEstadoFinal,
  estadoDeResposta,
  estadoDeStatusSP,
  estadoDeStatusADN,
} from './estado-machine';

// ============================================================================
// ERROS
// ============================================================================

export {
  FiscalError,
  ERROS,
  mapearErroSP,
  mapearErroSEFAZ,
  isRecuperavel,
} from './errors';

// ============================================================================
// IDEMPOTÊNCIA
// ============================================================================

export {
  gerarIdNFSeSP,
  gerarIdNFSeADN,
  gerarIdNFe,
  gerarCorrelationId,
  executeWithRetry,
  calcularBackoff,
  sleep,
  jaProcessado,
  marcarProcessado,
  comIdempotencia,
  CONFIG_RETRY,
} from './idempotencia';

// ============================================================================
// AUDITORIA
// ============================================================================

export {
  mascararCpf,
  mascararCnpj,
  mascararDocumento,
  mascararEmail,
  mascararChaveAcesso,
  gerarHash,
  verificarHash,
  FiscalLogger,
  registrarAuditoria,
  consultarAuditoria,
  incrementarMetrica,
  incrementarErro,
  obterMetricas,
} from './auditoria';

// ============================================================================
// VALIDADORES
// ============================================================================

export {
  validarCpf,
  validarCnpj,
  validarCpfCnpj,
  validarData,
  validarDataNaoFutura,
  validarValorMonetario,
  validarAliquota,
  validarCodigoMunicipio,
  validarUF,
  validarCEP,
  validarNCM,
  validarCFOP,
  validarDocumentoFiscal,
  validarEmitente,
  validarDestinatario,
  validarItem,
} from './validators';

export {
  validarRPSSP,
  validarDocumentoNFSeSP,
  converterCodigoLC116ParaSP,
  isCodigoServicoValidoSP,
} from './validators/nfse-sp';


