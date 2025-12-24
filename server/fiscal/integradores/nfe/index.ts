/**
 * NF-e / NFC-e - Exports
 */

// Schemas e tipos
export * from './schemas';

// Endpoints SEFAZ
export * from './endpoints';

// XML Builder
export {
  NFeXmlBuilder,
  criarNFeBuilder,
  gerarEnvelopeAutorizacao,
  gerarEnvelopeStatusServico,
  gerarEnvelopeConsultaChave,
  type NFeDadosEmissao,
  type DadosEmitente,
  type DadosDestinatario,
  type DadosEndereco,
  type DadosItem,
  type DadosTransporte,
  type DadosPagamento,
} from './xml-builder';

// XML Signer
export {
  NFeXmlSigner,
  criarAssinador,
  assinarXmlNFe,
  validarAssinaturaXml,
  type CertificadoInfo,
  type CertificadoCarregado,
  type ConfiguracaoAssinatura,
} from './xml-signer';

// SOAP Client
export {
  NFeSoapClient,
  criarSoapClient,
  type SoapClientConfig,
  type SoapResponse,
} from './soap-client';

// NF-e Service
export {
  NFeService,
  criarNFeService,
  type NFeServiceConfig,
  type ResultadoEmissaoNFe,
  type ResultadoConsultaNFe,
  type ResultadoCancelamentoNFe,
  type ResultadoInutilizacaoNFe,
} from './nfe-service';

// NFC-e Service
export {
  NFCeService,
  criarNFCeService,
  type NFCeServiceConfig,
  type ResultadoEmissaoNFCe,
  type ResultadoCancelamentoNFCe,
} from './nfce-service';


