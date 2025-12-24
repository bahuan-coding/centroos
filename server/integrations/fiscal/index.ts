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

// Import Services
export {
  importNfseForOrganization,
  importSingleNfse,
  getImportStats,
  type ImportResult,
} from './import-nfse';

// NFS-e São Paulo (Nota Fiscal Paulistana)
export {
  consultarNFSePeriodo,
  consultarNFSePorNumero,
  cancelarNFSe,
  emitirRPS,
  validarConexaoSP,
  type NFSeConsultaSP,
  type NFSeListResultSP,
  type EmissaoRPSParams,
  type EmissaoRPSResult,
  type EnderecoTomador,
  type TipoTributacao,
} from './nfse-sp';

// SOAP Client utilities
export {
  soapRequest,
  buildSOAPEnvelope,
  type SOAPRequest,
  type SOAPResponse,
} from './soap-client';

// NFS-e Nacional (ADN - Ambiente de Dados Nacional)
export {
  emitirNFSeNacional,
  consultarNFSeNacional,
  cancelarNFSeNacional,
  verificarDPSExiste,
  montarIdDPS,
  consultarParametrosMunicipio,
  consultarAliquotaServico,
  consultarEventosNFSe,
  baixarDANFSE,
  validarConexaoNacional,
  type DPSData,
  type NFSeNacional,
  type NFSeNacionalResult,
  type NFSeListResultNacional,
  type EventoNFSe,
  type EventoResult,
  type ParametrosMunicipais,
  type AliquotaServico,
  type TipoAmbiente,
  type TipoEmitente,
  type TipoSimplesNacional,
  type TipoRegimeEspecial,
  type TipoTributacaoISSQN,
  type TipoRetencaoISSQN,
  type TipoEvento,
  type PrestadorDPS,
  type TomadorDPS,
  type ServicoDPS,
  type ValoresDPS,
} from './nfse-nacional';

