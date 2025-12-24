/**
 * Nota Fiscal Paulistana (São Paulo) Integration
 * 
 * API SOAP da Prefeitura de São Paulo para:
 * - Consultar NFS-e emitidas
 * - Emitir RPS (Recibo Provisório de Serviços)
 * - Cancelar NFS-e
 * 
 * Documentação: https://notadomilhao.sf.prefeitura.sp.gov.br/desenvolvedor/
 * 
 * Uses the proprietary XMLDSig engine for W3C-compliant signatures.
 */

import { soapRequest, buildSOAPEnvelope, formatDateForApi, cleanCnpj, type SOAPResponse } from './soap-client';
import { loadActiveCertificate, type LoadedCertificate } from './certificates';
import { signNFSeXml, validateSignature, type CertificateData } from './xmldsig';
import { signRPS, buildRPSSignatureString, type RPSData } from './xmldsig/rps-signer';

// Endpoints (per manual section 4.1)
// New endpoint supports both v1 and v2 schemas
const NFSE_SP_ENDPOINTS = {
  production: 'https://nfews.prefeitura.sp.gov.br/lotenfe.asmx',
  legacy: 'https://nfe.prefeitura.sp.gov.br/ws/lotenfe.asmx', // Deprecated
};

// Environment configuration
// Note: SP does not have separate homologation - uses production endpoint
const getEndpoint = () => {
  const useLegacy = process.env.NFSE_SP_USE_LEGACY_ENDPOINT === 'true';
  return useLegacy ? NFSE_SP_ENDPOINTS.legacy : NFSE_SP_ENDPOINTS.production;
};

/**
 * Multi-tenant credentials lookup
 * 
 * For organization with code "PAYCUBED", looks for:
 * - PAYCUBED_CNPJ (global) or NFSE_SP_PAYCUBED_CNPJ
 * - NFSE_SP_PAYCUBED_CCM
 * - NFSE_SP_PAYCUBED_SENHA_WEB
 * 
 * Falls back to legacy single-tenant variables for backwards compatibility:
 * - NFSE_SP_CNPJ
 * - NFSE_SP_CCM
 * - NFSE_SP_SENHA_WEB
 */
const getCredentials = (orgCode?: string) => {
  // If orgCode provided, try org-specific env vars first
  if (orgCode) {
    const prefix = `NFSE_SP_${orgCode.toUpperCase()}_`;
    // For PAYCUBED, also check the global PAYCUBED_CNPJ variable
    const orgCnpj = orgCode.toUpperCase() === 'PAYCUBED' 
      ? (process.env.PAYCUBED_CNPJ || process.env[`${prefix}CNPJ`])
      : process.env[`${prefix}CNPJ`];
    const orgCcm = process.env[`${prefix}CCM`];
    const orgSenhaWeb = process.env[`${prefix}SENHA_WEB`];
    
    // Only use org-specific if at least CNPJ is configured
    if (orgCnpj) {
      return {
        cnpj: orgCnpj,
        ccm: orgCcm || '',
        senhaWeb: orgSenhaWeb || '',
        orgCode,
      };
    }
  }
  
  // Fallback to legacy single-tenant env vars
  return {
    cnpj: process.env.NFSE_SP_CNPJ || '',
    ccm: process.env.NFSE_SP_CCM || '',
    senhaWeb: process.env.NFSE_SP_SENHA_WEB || '',
    orgCode: undefined,
  };
};

// Types
export interface NFSeConsultaSP {
  numeroNFe: string;
  codigoVerificacao: string;
  dataEmissao: string;
  valorServicos: number;
  valorDeducoes: number;
  valorPIS: number;
  valorCOFINS: number;
  valorINSS: number;
  valorIR: number;
  valorCSLL: number;
  valorISS: number;
  aliquotaServicos: number;
  issRetido: boolean;
  discriminacaoServicos: string;
  cpfCnpjTomador: string;
  razaoSocialTomador: string;
  emailTomador?: string;
  statusNFe: 'N' | 'C'; // N = Normal, C = Cancelada
}

export interface NFSeListResultSP {
  notas: NFSeConsultaSP[];
  total: number;
  sucesso: boolean;
  mensagemErro?: string;
}

// Types for RPS emission
export type TipoTributacao = 'T' | 'F' | 'A' | 'B' | 'M' | 'N' | 'X';
// T = Tributado em SP, F = Fora de SP, A = Isento, B = Imune, M = Suspenso, N = Não incidente, X = Exportação

export interface EnderecoTomador {
  tipoLogradouro?: string;
  logradouro?: string;
  numeroEndereco?: string;
  complementoEndereco?: string;
  bairro?: string;
  cidade?: number; // Código IBGE
  uf?: string;
  cep?: number;
}

export interface EmissaoRPSParams {
  serieRPS: string;           // Serie do RPS (ex: "NF", max 5 chars)
  numeroRPS: number;          // Numero sequencial do RPS
  dataEmissao: Date;          // Data de emissao
  tributacao: TipoTributacao; // Tipo de tributacao
  valorServicos: number;      // Valor em reais
  valorDeducoes?: number;     // Deducoes (default 0)
  codigoServico: string;      // Codigo municipal (ex: "17020")
  aliquota: number;           // Aliquota ISS (0 para isento)
  issRetido: boolean;         // ISS retido pelo tomador
  discriminacao: string;      // Descricao dos servicos (max 2000 chars)
  tomador: {
    cpfCnpj: string;
    razaoSocial?: string;
    inscricaoMunicipal?: string; // CCM do tomador (se estiver em SP)
    inscricaoEstadual?: number;
    email?: string;
    endereco?: EnderecoTomador;
  };
  // Valores opcionais de retenção
  valorPIS?: number;
  valorCOFINS?: number;
  valorINSS?: number;
  valorIR?: number;
  valorCSLL?: number;
}

export interface EmissaoRPSResult {
  sucesso: boolean;
  mensagem: string;
  numeroNFe?: string;
  codigoVerificacao?: string;
  dataEmissaoNFe?: string;
  chaveRPS?: {
    inscricaoPrestador: string;
    serieRPS: string;
    numeroRPS: string;
  };
}

/**
 * Convert LoadedCertificate to CertificateData for XMLDSig
 */
function toCertificateData(cert: LoadedCertificate): CertificateData {
  return {
    cert: cert.cert,
    privateKey: cert.privateKey
  };
}

/**
 * Sign XML content using the new XMLDSig engine
 * 
 * This uses proper C14N canonicalization and correct digest/signature calculation
 * as required by the Nota Fiscal Paulistana API.
 */
async function signXml(xmlContent: string, tagToSign: string): Promise<string> {
  const cert = await loadActiveCertificate();
  if (!cert) {
    throw new Error('Certificado digital não encontrado');
  }

  // Use the new XMLDSig engine with proper canonicalization
  const signedXml = signNFSeXml(xmlContent, toCertificateData(cert), tagToSign);
  
  // Validate the signature in debug mode
  if (process.env.XMLDSIG_DEBUG === 'true') {
    const validation = validateSignature(signedXml);
    if (!validation.valid) {
      console.warn('[XMLDSig] Signature validation warnings:', validation.errors);
    } else {
      console.log('[XMLDSig] Signature validated successfully');
    }
  }
  
  return signedXml;
}

/**
 * Build Cabecalho for PedidoConsultaNFePeriodo (based on official XSD schema)
 */
function buildCabecalhoConsultaPeriodo(dataInicio: string, dataFim: string, pagina: number, orgCode?: string): string {
  const creds = getCredentials(orgCode);
  const cnpj = cleanCnpj(creds.cnpj);
  const ccmPadded = creds.ccm.padStart(8, '0');
  // xmlns="" is required to reset namespace for child elements (XSD expects no namespace)
  return `<Cabecalho xmlns="" Versao="1">` +
    `<CPFCNPJRemetente><CNPJ>${cnpj}</CNPJ></CPFCNPJRemetente>` +
    `<CPFCNPJ><CNPJ>${cnpj}</CNPJ></CPFCNPJ>` +
    `<Inscricao>${ccmPadded}</Inscricao>` +
    `<dtInicio>${dataInicio}</dtInicio>` +
    `<dtFim>${dataFim}</dtFim>` +
    `<NumeroPagina>${pagina}</NumeroPagina>` +
    `</Cabecalho>`;
}

/**
 * Build Cabecalho for PedidoConsultaNFe (single invoice query)
 * Per XSD: Only CPFCNPJRemetente is in Cabecalho. ChaveNFe goes in Detalhe.
 */
function buildCabecalhoConsultaNFe(orgCode?: string): string {
  const creds = getCredentials(orgCode);
  const cnpj = cleanCnpj(creds.cnpj);
  // xmlns="" is required to reset namespace for child elements (XSD expects no namespace)
  return `<Cabecalho xmlns="" Versao="1">` +
    `<CPFCNPJRemetente><CNPJ>${cnpj}</CNPJ></CPFCNPJRemetente>` +
    `</Cabecalho>`;
}

/**
 * Build Cabecalho for PedidoCancelamentoNFe
 */
function buildCabecalhoCancelamento(orgCode?: string): string {
  const creds = getCredentials(orgCode);
  // xmlns="" is required to reset namespace for child elements (XSD expects no namespace)
  return `<Cabecalho xmlns="" Versao="1">` +
    `<CPFCNPJRemetente><CNPJ>${cleanCnpj(creds.cnpj)}</CNPJ></CPFCNPJRemetente>` +
    `<transacao>true</transacao>` +
    `</Cabecalho>`;
}

/**
 * Consultar NFS-e por período
 * Structure based on official XSD: PedidoConsultaNFePeriodo_v01.xsd
 * 
 * @param dataInicio - Data inicial do período
 * @param dataFim - Data final do período
 * @param pagina - Número da página (default: 1)
 * @param orgCode - Código da organização para credenciais multi-tenant
 */
export async function consultarNFSePeriodo(
  dataInicio: string | Date,
  dataFim: string | Date,
  pagina: number = 1,
  orgCode?: string
): Promise<NFSeListResultSP> {
  const creds = getCredentials(orgCode);
  
  if (!creds.cnpj) {
    return { notas: [], total: 0, sucesso: false, mensagemErro: 'CNPJ não configurado (NFSE_SP_CNPJ)' };
  }
  
  if (!creds.ccm) {
    return { notas: [], total: 0, sucesso: false, mensagemErro: 'CCM não configurado (NFSE_SP_CCM)' };
  }
  
  const dataInicioStr = formatDateForApi(dataInicio);
  const dataFimStr = formatDateForApi(dataFim);
  
  // Build XML according to official XSD schema (PedidoConsultaNFePeriodo_v01.xsd)
  const pedido = `<PedidoConsultaNFePeriodo xmlns="http://www.prefeitura.sp.gov.br/nfe">${buildCabecalhoConsultaPeriodo(dataInicioStr, dataFimStr, pagina, orgCode)}</PedidoConsultaNFePeriodo>`;
  
  // Sign the request with proper XMLDSig
  const pedidoAssinado = await signXml(pedido, 'PedidoConsultaNFePeriodo');
  
  const envelope = buildSOAPEnvelope(`
    <ns:ConsultaNFeEmitidasRequest>
      <ns:VersaoSchema>1</ns:VersaoSchema>
      <ns:MensagemXML><![CDATA[${pedidoAssinado}]]></ns:MensagemXML>
    </ns:ConsultaNFeEmitidasRequest>
  `);
  
  // SOAP action per manual: consultaNFeEmitidas (same XML schema as ConsultaNFePeriodo)
  const response = await soapRequest({
    url: getEndpoint(),
    action: 'http://www.prefeitura.sp.gov.br/nfe/ws/consultaNFeEmitidas',
    body: envelope,
    useCertificate: true,
  });
  
  if (!response.success) {
    return { notas: [], total: 0, sucesso: false, mensagemErro: response.error };
  }
  
  return await parseNFSeListResponse(response);
}

/**
 * Consultar NFS-e por número
 * Structure based on official XSD: PedidoConsultaNFe_v01.xsd
 * 
 * Per XSD: Cabecalho only contains CPFCNPJRemetente.
 * ChaveNFe (with InscricaoPrestador + NumeroNFe) goes inside Detalhe.
 * 
 * @param numeroNFe - Número da NFS-e
 * @param orgCode - Código da organização para credenciais multi-tenant
 */
export async function consultarNFSePorNumero(numeroNFe: string, orgCode?: string): Promise<NFSeConsultaSP | null> {
  const creds = getCredentials(orgCode);
  
  if (!creds.cnpj) {
    throw new Error('CNPJ não configurado (NFSE_SP_CNPJ)');
  }
  
  if (!creds.ccm) {
    throw new Error('CCM não configurado (NFSE_SP_CCM)');
  }
  
  // CCM must be 8 digits per XSD tpInscricaoMunicipal
  const ccmPadded = creds.ccm.padStart(8, '0');
  
  // Build XML according to official XSD schema (PedidoConsultaNFe_v01.xsd)
  // xmlns="" is required to reset namespace for child elements (XSD expects no namespace)
  const pedido = `<PedidoConsultaNFe xmlns="http://www.prefeitura.sp.gov.br/nfe">` +
    buildCabecalhoConsultaNFe(orgCode) +
    `<Detalhe xmlns="">` +
    `<ChaveNFe>` +
    `<InscricaoPrestador>${ccmPadded}</InscricaoPrestador>` +
    `<NumeroNFe>${numeroNFe}</NumeroNFe>` +
    `</ChaveNFe>` +
    `</Detalhe>` +
    `</PedidoConsultaNFe>`;
  
  const pedidoAssinado = await signXml(pedido, 'PedidoConsultaNFe');
  
  const envelope = buildSOAPEnvelope(`
    <ns:ConsultaNFeRequest>
      <ns:VersaoSchema>1</ns:VersaoSchema>
      <ns:MensagemXML><![CDATA[${pedidoAssinado}]]></ns:MensagemXML>
    </ns:ConsultaNFeRequest>
  `);
  
  const response = await soapRequest({
    url: getEndpoint(),
    action: 'http://www.prefeitura.sp.gov.br/nfe/ws/consultaNFe',
    body: envelope,
    useCertificate: true,
  });
  
  if (!response.success) {
    throw new Error(response.error || 'Erro ao consultar NFS-e');
  }
  
  const result = await parseNFSeListResponse(response);
  return result.notas[0] || null;
}

/**
 * Cancelar NFS-e
 * Structure based on official XSD: PedidoCancelamentoNFe_v01.xsd
 * 
 * AssinaturaCancelamento (per TiposNFe_v01.xsd tpAssinaturaCancelamento):
 * - String of 20 ASCII chars signed with RSA-SHA1
 * - CCM (8 chars, left-padded with zeros)
 * - NumeroNFe (12 chars, left-padded with zeros)
 * 
 * @param numeroNFe - Número da NFS-e a cancelar
 * @param orgCode - Código da organização para credenciais multi-tenant
 */
export async function cancelarNFSe(numeroNFe: string, orgCode?: string): Promise<{ sucesso: boolean; mensagem: string }> {
  const creds = getCredentials(orgCode);
  
  if (!creds.cnpj || !creds.ccm) {
    return { sucesso: false, mensagem: 'CNPJ ou CCM não configurado' };
  }
  
  // Load certificate for cancellation signature
  const cert = await loadActiveCertificate();
  if (!cert) {
    return { sucesso: false, mensagem: 'Certificado digital não encontrado' };
  }
  
  // CCM must be 8 digits per XSD tpInscricaoMunicipal
  const ccmPadded = creds.ccm.padStart(8, '0');
  // NumeroNFe must be up to 12 digits per XSD tpNumero
  const numeroPadded = numeroNFe.padStart(12, '0');
  
  // Build cancellation signature string (20 chars total)
  const cancelString = ccmPadded + numeroPadded;
  
  // Sign with RSA-SHA1 (PKCS#1 v1.5)
  const forgeModule = await import('node-forge');
  const forge = forgeModule.default || forgeModule;
  const md = forge.md.sha1.create();
  md.update(cancelString, 'utf8');
  const assinaturaCancelamento = forge.util.encode64(cert.privateKey.sign(md));
  
  // Build XML according to official XSD schema (PedidoCancelamentoNFe_v01.xsd)
  // xmlns="" is required to reset namespace for child elements (XSD expects no namespace)
  const pedido = `<PedidoCancelamentoNFe xmlns="http://www.prefeitura.sp.gov.br/nfe">` +
    `<Cabecalho xmlns="" Versao="1">` +
    `<CPFCNPJRemetente><CNPJ>${cleanCnpj(creds.cnpj)}</CNPJ></CPFCNPJRemetente>` +
    `<transacao>true</transacao>` +
    `</Cabecalho>` +
    `<Detalhe xmlns="">` +
    `<ChaveNFe>` +
    `<InscricaoPrestador>${ccmPadded}</InscricaoPrestador>` +
    `<NumeroNFe>${numeroPadded}</NumeroNFe>` +
    `</ChaveNFe>` +
    `<AssinaturaCancelamento>${assinaturaCancelamento}</AssinaturaCancelamento>` +
    `</Detalhe>` +
    `</PedidoCancelamentoNFe>`;
  
  const pedidoAssinado = await signXml(pedido, 'PedidoCancelamentoNFe');
  
  const envelope = buildSOAPEnvelope(`
    <ns:CancelamentoNFeRequest>
      <ns:VersaoSchema>1</ns:VersaoSchema>
      <ns:MensagemXML><![CDATA[${pedidoAssinado}]]></ns:MensagemXML>
    </ns:CancelamentoNFeRequest>
  `);
  
  const response = await soapRequest({
    url: getEndpoint(),
    action: 'http://www.prefeitura.sp.gov.br/nfe/ws/cancelamentoNFe',
    body: envelope,
    useCertificate: true,
  });
  
  if (!response.success) {
    return { sucesso: false, mensagem: response.error || 'Erro ao cancelar NFS-e' };
  }
  
  // Parse response for success/error
  const data = response.data;
  const retornoXmlString = data?.CancelamentoNFeResponse?.RetornoXML;
  
  // RetornoXML is returned as a string that needs to be parsed
  let retorno: any;
  if (typeof retornoXmlString === 'string') {
    const { parseStringPromise } = await import('xml2js');
    const parsed = await parseStringPromise(retornoXmlString, {
      explicitArray: false,
      ignoreAttrs: true,
      tagNameProcessors: [(name: string) => name.replace(/^.*:/, '')], // Remove namespace prefixes
    });
    retorno = parsed.RetornoCancelamentoNFe || parsed;
  } else {
    retorno = retornoXmlString || data?.RetornoCancelamentoNFe;
  }
  
  if (retorno?.Cabecalho?.Sucesso === 'true') {
    return { sucesso: true, mensagem: 'NFS-e cancelada com sucesso' };
  }
  
  // Extract error messages
  const erros = retorno?.Erro;
  if (erros) {
    const errosArray = Array.isArray(erros) ? erros : [erros];
    const mensagens = errosArray.map((e: any) => e.Descricao || e.Mensagem || e.Codigo).filter(Boolean).join('; ');
    if (mensagens) {
      return { sucesso: false, mensagem: mensagens };
    }
  }
  
  return { sucesso: false, mensagem: 'Erro desconhecido no cancelamento' };
}

/**
 * Emitir RPS (Recibo Provisório de Serviços)
 * O RPS é convertido automaticamente em NFS-e pela prefeitura.
 * 
 * Structure based on official XSD: PedidoEnvioRPS_v01.xsd
 * 
 * @param params - Dados do RPS a ser emitido
 * @param orgCode - Código da organização para credenciais multi-tenant
 * @returns Resultado da emissão com número da NFS-e gerada
 */
export async function emitirRPS(params: EmissaoRPSParams, orgCode?: string): Promise<EmissaoRPSResult> {
  const creds = getCredentials(orgCode);
  
  if (!creds.cnpj) {
    return { sucesso: false, mensagem: 'CNPJ não configurado (NFSE_SP_CNPJ)' };
  }
  
  if (!creds.ccm) {
    return { sucesso: false, mensagem: 'CCM não configurado (NFSE_SP_CCM)' };
  }
  
  // Load certificate for RPS signature
  const cert = await loadActiveCertificate();
  if (!cert) {
    return { sucesso: false, mensagem: 'Certificado digital não encontrado' };
  }
  
  const cnpj = cleanCnpj(creds.cnpj);
  const ccmPadded = creds.ccm.padStart(8, '0');
  const tomadorCpfCnpj = params.tomador.cpfCnpj.replace(/\D/g, '');
  const isTomadorCNPJ = tomadorCpfCnpj.length === 14;
  
  // Format date for XML (YYYY-MM-DD) and for RPS signature (YYYYMMDD)
  // Use the same date source to ensure consistency
  const dataEmissaoXml = formatDateForApi(params.dataEmissao);
  // Convert YYYY-MM-DD to YYYYMMDD for RPS signature
  const dataEmissaoRps = dataEmissaoXml.replace(/-/g, '');
  
  // Build RPS signature string (86 chars) and sign it
  const rpsData: RPSData = {
    inscricaoMunicipal: ccmPadded,
    serieRPS: params.serieRPS,
    numeroRPS: String(params.numeroRPS),
    dataEmissao: dataEmissaoRps, // Use same date as XML
    tributacao: params.tributacao,
    situacao: 'N', // Normal
    issRetido: params.issRetido ? 'S' : 'N',
    valorServicos: params.valorServicos,
    valorDeducoes: params.valorDeducoes || 0,
    codigoServico: params.codigoServico,
    cpfCnpjTomador: tomadorCpfCnpj,
  };
  
  // Sign the RPS with PKCS#1 RSA-SHA1
  const assinaturaRPS = signRPS(rpsData, cert.privateKey);
  
  // Debug: show the signature string
  if (process.env.NFSE_DEBUG === 'true') {
    const sigString = buildRPSSignatureString(rpsData);
    console.log('[NFSE_DEBUG] RPS signature string (' + sigString.length + ' chars):', sigString);
    console.log('[NFSE_DEBUG] RPS signature (base64):', assinaturaRPS.substring(0, 50) + '...');
  }
  
  // Build RPS XML element per tpRPS schema
  let rpsXml = `<RPS>`;
  rpsXml += `<Assinatura>${assinaturaRPS}</Assinatura>`;
  rpsXml += `<ChaveRPS>`;
  rpsXml += `<InscricaoPrestador>${ccmPadded}</InscricaoPrestador>`;
  rpsXml += `<SerieRPS>${params.serieRPS}</SerieRPS>`;
  rpsXml += `<NumeroRPS>${params.numeroRPS}</NumeroRPS>`;
  rpsXml += `</ChaveRPS>`;
  rpsXml += `<TipoRPS>RPS</TipoRPS>`;
  rpsXml += `<DataEmissao>${dataEmissaoXml}</DataEmissao>`;
  rpsXml += `<StatusRPS>N</StatusRPS>`;
  rpsXml += `<TributacaoRPS>${params.tributacao}</TributacaoRPS>`;
  rpsXml += `<ValorServicos>${params.valorServicos.toFixed(2)}</ValorServicos>`;
  rpsXml += `<ValorDeducoes>${(params.valorDeducoes || 0).toFixed(2)}</ValorDeducoes>`;
  
  // Optional retention values
  if (params.valorPIS !== undefined) {
    rpsXml += `<ValorPIS>${params.valorPIS.toFixed(2)}</ValorPIS>`;
  }
  if (params.valorCOFINS !== undefined) {
    rpsXml += `<ValorCOFINS>${params.valorCOFINS.toFixed(2)}</ValorCOFINS>`;
  }
  if (params.valorINSS !== undefined) {
    rpsXml += `<ValorINSS>${params.valorINSS.toFixed(2)}</ValorINSS>`;
  }
  if (params.valorIR !== undefined) {
    rpsXml += `<ValorIR>${params.valorIR.toFixed(2)}</ValorIR>`;
  }
  if (params.valorCSLL !== undefined) {
    rpsXml += `<ValorCSLL>${params.valorCSLL.toFixed(2)}</ValorCSLL>`;
  }
  
  rpsXml += `<CodigoServico>${params.codigoServico}</CodigoServico>`;
  rpsXml += `<AliquotaServicos>${params.aliquota.toFixed(4)}</AliquotaServicos>`;
  rpsXml += `<ISSRetido>${params.issRetido}</ISSRetido>`;
  
  // Tomador info
  if (params.tomador.inscricaoMunicipal) {
    rpsXml += `<InscricaoMunicipalTomador>${params.tomador.inscricaoMunicipal}</InscricaoMunicipalTomador>`;
  }
  
  rpsXml += `<CPFCNPJTomador>`;
  rpsXml += isTomadorCNPJ ? `<CNPJ>${tomadorCpfCnpj}</CNPJ>` : `<CPF>${tomadorCpfCnpj.padStart(11, '0')}</CPF>`;
  rpsXml += `</CPFCNPJTomador>`;
  
  if (params.tomador.inscricaoEstadual) {
    rpsXml += `<InscricaoEstadualTomador>${params.tomador.inscricaoEstadual}</InscricaoEstadualTomador>`;
  }
  
  if (params.tomador.razaoSocial) {
    rpsXml += `<RazaoSocialTomador>${escapeXml(params.tomador.razaoSocial)}</RazaoSocialTomador>`;
  }
  
  // Tomador address (required for CNPJ)
  if (params.tomador.endereco) {
    const end = params.tomador.endereco;
    rpsXml += `<EnderecoTomador>`;
    if (end.tipoLogradouro) rpsXml += `<TipoLogradouro>${end.tipoLogradouro}</TipoLogradouro>`;
    if (end.logradouro) rpsXml += `<Logradouro>${escapeXml(end.logradouro)}</Logradouro>`;
    if (end.numeroEndereco) rpsXml += `<NumeroEndereco>${end.numeroEndereco}</NumeroEndereco>`;
    if (end.complementoEndereco) rpsXml += `<ComplementoEndereco>${escapeXml(end.complementoEndereco)}</ComplementoEndereco>`;
    if (end.bairro) rpsXml += `<Bairro>${escapeXml(end.bairro)}</Bairro>`;
    if (end.cidade) rpsXml += `<Cidade>${end.cidade}</Cidade>`;
    if (end.uf) rpsXml += `<UF>${end.uf}</UF>`;
    if (end.cep) rpsXml += `<CEP>${end.cep}</CEP>`;
    rpsXml += `</EnderecoTomador>`;
  }
  
  if (params.tomador.email) {
    rpsXml += `<EmailTomador>${params.tomador.email}</EmailTomador>`;
  }
  
  rpsXml += `<Discriminacao>${escapeXml(params.discriminacao)}</Discriminacao>`;
  rpsXml += `</RPS>`;
  
  // Build complete PedidoEnvioRPS
  // Note: Cabecalho and RPS must NOT have namespace (xmlns="")
  const pedido = `<PedidoEnvioRPS xmlns="http://www.prefeitura.sp.gov.br/nfe">` +
    `<Cabecalho xmlns="" Versao="1">` +
    `<CPFCNPJRemetente><CNPJ>${cnpj}</CNPJ></CPFCNPJRemetente>` +
    `</Cabecalho>` +
    rpsXml.replace('<RPS>', '<RPS xmlns="">') +
    `</PedidoEnvioRPS>`;
  
  // Sign the complete XML with XMLDSig
  const pedidoAssinado = await signXml(pedido, 'PedidoEnvioRPS');
  
  // Build SOAP envelope
  const envelope = buildSOAPEnvelope(`
    <ns:EnvioRPSRequest>
      <ns:VersaoSchema>1</ns:VersaoSchema>
      <ns:MensagemXML><![CDATA[${pedidoAssinado}]]></ns:MensagemXML>
    </ns:EnvioRPSRequest>
  `);
  
  // Send request
  const response = await soapRequest({
    url: getEndpoint(),
    action: 'http://www.prefeitura.sp.gov.br/nfe/ws/envioRPS',
    body: envelope,
    useCertificate: true,
  });
  
  if (!response.success) {
    return { sucesso: false, mensagem: response.error || 'Erro ao emitir RPS' };
  }
  
  // Parse response
  return parseEmissaoRPSResponse(response, {
    inscricaoPrestador: ccmPadded,
    serieRPS: params.serieRPS,
    numeroRPS: String(params.numeroRPS),
  });
}

/**
 * Escape special XML characters
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Parse RPS emission response
 */
function parseEmissaoRPSResponse(
  response: SOAPResponse,
  chaveRPS: { inscricaoPrestador: string; serieRPS: string; numeroRPS: string }
): EmissaoRPSResult {
  try {
    const data = response.data;
    
    // Debug: log full response in debug mode
    if (process.env.NFSE_DEBUG === 'true') {
      console.log('[NFSE_DEBUG] Response data:', JSON.stringify(data, null, 2));
    }
    
    // Navigate through SOAP response structure
    const retorno = 
      data?.EnvioRPSResponse?.RetornoXML ||
      data?.RetornoEnvioRPS;
    
    if (!retorno) {
      // Try to find any error in the response
      const rawXml = response.rawXml || '';
      if (rawXml.includes('Erro') || rawXml.includes('Alerta')) {
        // Extract error from raw XML for debugging
        const errorMatch = rawXml.match(/<Descricao>([^<]+)<\/Descricao>/);
        const codeMatch = rawXml.match(/<Codigo>([^<]+)<\/Codigo>/);
        if (errorMatch || codeMatch) {
          return { 
            sucesso: false, 
            mensagem: `[${codeMatch?.[1] || '?'}] ${errorMatch?.[1] || 'Erro não identificado'}`, 
            chaveRPS 
          };
        }
      }
      return { sucesso: false, mensagem: 'Resposta vazia da API', chaveRPS };
    }
    
    // Check success flag FIRST
    const isSuccess = 
      retorno.Cabecalho?.Sucesso === 'true' || 
      retorno.Cabecalho?.Sucesso === true ||
      (typeof retorno === 'string' && retorno.includes('<Sucesso>true</Sucesso>'));
    
    // Check for ERRORS (not alerts) - only fail if there are actual errors
    let erros = retorno.Erro;
    
    // If retorno is a string (raw XML), we need to parse differently
    if (typeof retorno === 'string') {
      // Extract errors from raw XML (not alerts)
      const errorMatches = [...retorno.matchAll(/<Erro[^>]*>.*?<Codigo>([^<]+)<\/Codigo>.*?<Descricao>([^<]+)<\/Descricao>.*?<\/Erro>/gs)];
      if (errorMatches.length > 0) {
        erros = errorMatches.map(match => ({ Codigo: match[1], Descricao: match[2] }));
      }
    }
    
    // If there are errors and no success, return error
    if (erros && !isSuccess) {
      const errosArray = Array.isArray(erros) ? erros : [erros];
      const mensagens = errosArray.map((e: any) => `[${e.Codigo}] ${e.Descricao || e.Mensagem || 'Erro'}`).join('; ');
      return { sucesso: false, mensagem: mensagens, chaveRPS };
    }
    
    // If no success flag, return error
    if (!isSuccess) {
      const details = typeof retorno === 'string' ? retorno.substring(0, 300) : JSON.stringify(retorno.Cabecalho || retorno).substring(0, 200);
      return { sucesso: false, mensagem: `Emissão não confirmada. Detalhes: ${details}`, chaveRPS };
    }
    
    // Alerts are informational - note them but continue
    
    // Extract NFS-e data from response
    let nfe: any = null;
    
    if (typeof retorno === 'string') {
      // Parse from raw XML string
      const numMatch = retorno.match(/<NumeroNFe>([^<]+)<\/NumeroNFe>/);
      const codMatch = retorno.match(/<CodigoVerificacao>([^<]+)<\/CodigoVerificacao>/);
      if (numMatch || codMatch) {
        nfe = {
          NumeroNFe: numMatch?.[1] || '',
          CodigoVerificacao: codMatch?.[1] || '',
        };
      }
    } else {
      const chaveNFeRPS = retorno.ChaveNFeRPS || retorno.ChaveNFe;
      nfe = chaveNFeRPS?.ChaveNFe || chaveNFeRPS;
    }
    
    return {
      sucesso: true,
      mensagem: 'NFS-e emitida com sucesso',
      numeroNFe: nfe?.NumeroNFe || '',
      codigoVerificacao: nfe?.CodigoVerificacao || '',
      dataEmissaoNFe: retorno.DataEmissaoNFe || '',
      chaveRPS,
    };
  } catch (error: any) {
    return {
      sucesso: false,
      mensagem: `Erro ao processar resposta: ${error.message}`,
      chaveRPS,
    };
  }
}

/**
 * Validar conexão com a API
 * 
 * @param orgCode - Código da organização para credenciais multi-tenant
 */
export async function validarConexaoSP(orgCode?: string): Promise<{
  sucesso: boolean;
  mensagem: string;
  ambiente: string;
}> {
  const creds = getCredentials(orgCode);
  const useLegacy = process.env.NFSE_SP_USE_LEGACY_ENDPOINT === 'true';
  const ambiente = useLegacy ? 'legacy' : 'production';
  
  const envPrefix = orgCode ? `NFSE_SP_${orgCode}_` : 'NFSE_SP_';
  
  if (!creds.cnpj) {
    return {
      sucesso: false,
      mensagem: `CNPJ não configurado. Defina ${envPrefix}CNPJ no ambiente`,
      ambiente,
    };
  }
  
  if (!creds.senhaWeb) {
    return {
      sucesso: false,
      mensagem: `Senha Web não configurada. Defina ${envPrefix}SENHA_WEB no ambiente`,
      ambiente,
    };
  }
  
  try {
    const cert = await loadActiveCertificate();
    if (!cert) {
      return {
        sucesso: false,
        mensagem: 'Certificado digital não encontrado',
        ambiente,
      };
    }
    
    if (!cert.info.isValid) {
      return {
        sucesso: false,
        mensagem: `Certificado expirado em ${cert.info.validadeFim}`,
        ambiente,
      };
    }
    
    // Check if certificate CNPJ matches
    if (cert.info.cnpj !== cleanCnpj(creds.cnpj)) {
      return {
        sucesso: false,
        mensagem: `CNPJ do certificado (${cert.info.cnpj}) não corresponde ao configurado (${creds.cnpj})`,
        ambiente,
      };
    }
    
    return {
      sucesso: true,
      mensagem: `Configuração válida. Certificado expira em ${cert.info.daysUntilExpiry} dias. XMLDSig engine: v2.0`,
      ambiente,
    };
  } catch (error: any) {
    return {
      sucesso: false,
      mensagem: `Erro: ${error.message}`,
      ambiente,
    };
  }
}

/**
 * Parse NFS-e list response from SOAP
 */
async function parseNFSeListResponse(response: SOAPResponse): Promise<NFSeListResultSP> {
  try {
    const data = response.data;
    
    // Navigate through SOAP response structure - RetornoXML is a string that needs parsing
    const retornoXmlString = 
      data?.ConsultaNFeEmitidasResponse?.RetornoXML ||
      data?.ConsultaNFeResponse?.RetornoXML ||
      data?.ConsultaNFeRecebidasResponse?.RetornoXML;
    
    if (!retornoXmlString) {
      return { notas: [], total: 0, sucesso: false, mensagemErro: 'Resposta vazia da API' };
    }
    
    // Parse the inner XML string
    const { parseStringPromise } = await import('xml2js');
    const parsed = await parseStringPromise(retornoXmlString, {
      explicitArray: false,
      ignoreAttrs: true,
      tagNameProcessors: [(name: string) => name.replace(/^.*:/, '')], // Remove namespace prefixes
    });
    
    const retorno = parsed.RetornoConsulta;
    
    if (!retorno) {
      return { notas: [], total: 0, sucesso: false, mensagemErro: 'Estrutura de resposta inválida' };
    }
    
    // Check for errors
    if (retorno.Erro) {
      const erros = Array.isArray(retorno.Erro) ? retorno.Erro : [retorno.Erro];
      const mensagens = erros.map((e: any) => `${e.Codigo}: ${e.Descricao || e.Mensagem}`).join('; ');
      return { notas: [], total: 0, sucesso: false, mensagemErro: mensagens };
    }
    
    // Check for success flag
    if (retorno.Cabecalho?.Sucesso === 'false') {
      return { notas: [], total: 0, sucesso: false, mensagemErro: 'Consulta não retornou sucesso' };
    }
    
    // Parse NFe list
    const nfeList = retorno.NFe || retorno.ListaNFe?.NFe || [];
    const nfeArray = Array.isArray(nfeList) ? nfeList : [nfeList].filter(Boolean);
    
    const notas: NFSeConsultaSP[] = nfeArray.map((nfe: any) => ({
      numeroNFe: nfe.ChaveNFe?.NumeroNFe || nfe.NumeroNFe || '',
      codigoVerificacao: nfe.ChaveNFe?.CodigoVerificacao || nfe.CodigoVerificacao || '',
      dataEmissao: nfe.DataEmissaoNFe || nfe.DataEmissao || '',
      valorServicos: parseFloat(nfe.ValorServicos || '0'),
      valorDeducoes: parseFloat(nfe.ValorDeducoes || '0'),
      valorPIS: parseFloat(nfe.ValorPIS || '0'),
      valorCOFINS: parseFloat(nfe.ValorCOFINS || '0'),
      valorINSS: parseFloat(nfe.ValorINSS || '0'),
      valorIR: parseFloat(nfe.ValorIR || '0'),
      valorCSLL: parseFloat(nfe.ValorCSLL || '0'),
      valorISS: parseFloat(nfe.ValorISS || '0'),
      aliquotaServicos: parseFloat(nfe.AliquotaServicos || '0'),
      issRetido: nfe.ISSRetido === 'true' || nfe.ISSRetido === true,
      discriminacaoServicos: nfe.Discriminacao || nfe.DiscriminacaoServicos || '',
      cpfCnpjTomador: nfe.CPFCNPJTomador?.CNPJ || nfe.CPFCNPJTomador?.CPF || '',
      razaoSocialTomador: nfe.RazaoSocialTomador || nfe.NomeTomador || '',
      emailTomador: nfe.EmailTomador || undefined,
      statusNFe: nfe.StatusNFe || 'N',
    }));
    
    return {
      notas,
      total: notas.length,
      sucesso: true,
    };
  } catch (error: any) {
    return {
      notas: [],
      total: 0,
      sucesso: false,
      mensagemErro: `Erro ao processar resposta: ${error.message}`,
    };
  }
}
