/**
 * Fiscal Integrations Module
 * 
 * Exports all fiscal integration services
 */

// Certificate management
export {
  loadCertificateByCnpj,
  loadActiveCertificate,
  validateCertificate,
  type CertificateInfo,
  type LoadedCertificate,
} from './certificates';

// NFS-e (Nota Fiscal de Serviço Eletrônica)
export {
  consultarNfse,
  listarNfse,
  obterXmlNfse,
  validarConexaoNfse,
  type NfseConsulta,
  type NfseListParams,
  type NfseListResult,
} from './nfse';

