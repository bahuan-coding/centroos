/**
 * Nota Fiscal Paulistana (São Paulo) Integration
 * 
 * API SOAP da Prefeitura de São Paulo para:
 * - Consultar NFS-e emitidas
 * - Emitir RPS (Recibo Provisório de Serviços)
 * - Cancelar NFS-e
 * 
 * Documentação: https://notadomilhao.sf.prefeitura.sp.gov.br/desenvolvedor/
 */

import crypto from 'crypto';
import forge from 'node-forge';
import { soapRequest, buildSOAPEnvelope, formatDateForApi, cleanCnpj, type SOAPResponse } from './soap-client';
import { loadActiveCertificate } from './certificates';

// Endpoints
const NFSE_SP_ENDPOINTS = {
  production: 'https://nfe.prefeitura.sp.gov.br/ws/lotenfe.asmx',
  homologation: 'https://nfews.prefeitura.sp.gov.br/ws/lotenfe.asmx',
};

// Environment configuration
const getEndpoint = () => {
  const env = process.env.NFSE_SP_ENVIRONMENT || 'production';
  return env === 'homologation' ? NFSE_SP_ENDPOINTS.homologation : NFSE_SP_ENDPOINTS.production;
};

const getCredentials = () => ({
  cnpj: process.env.NFSE_SP_CNPJ || '',
  ccm: process.env.NFSE_SP_CCM || '',
  senhaWeb: process.env.NFSE_SP_SENHA_WEB || '',
});

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

/**
 * Sign XML content using the digital certificate
 */
async function signXml(xmlContent: string, tagToSign: string): Promise<string> {
  const cert = await loadActiveCertificate();
  if (!cert) {
    throw new Error('Certificado digital não encontrado');
  }

  // Create canonical XML
  const canonicalXml = xmlContent.replace(/>\s+</g, '><').trim();
  
  // Calculate digest
  const digest = crypto.createHash('sha1').update(canonicalXml, 'utf8').digest('base64');
  
  // Create SignedInfo
  const signedInfo = `<SignedInfo xmlns="http://www.w3.org/2000/09/xmldsig#">
    <CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
    <SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"/>
    <Reference URI="">
      <Transforms>
        <Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>
        <Transform Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
      </Transforms>
      <DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>
      <DigestValue>${digest}</DigestValue>
    </Reference>
  </SignedInfo>`;
  
  // Sign using private key
  const md = forge.md.sha1.create();
  md.update(signedInfo.replace(/>\s+</g, '><').trim(), 'utf8');
  const signature = forge.util.encode64(cert.privateKey.sign(md));
  
  // Get certificate in base64
  const certDer = forge.asn1.toDer(forge.pki.certificateToAsn1(cert.cert)).getBytes();
  const certBase64 = forge.util.encode64(certDer);
  
  // Build Signature element
  const signatureElement = `<Signature xmlns="http://www.w3.org/2000/09/xmldsig#">
    ${signedInfo}
    <SignatureValue>${signature}</SignatureValue>
    <KeyInfo>
      <X509Data>
        <X509Certificate>${certBase64}</X509Certificate>
      </X509Data>
    </KeyInfo>
  </Signature>`;
  
  // Insert signature before closing tag
  const closingTag = `</${tagToSign}>`;
  return xmlContent.replace(closingTag, `${signatureElement}${closingTag}`);
}

/**
 * Build authentication header for Nota Fiscal Paulistana
 */
function buildCabecalho(): string {
  const creds = getCredentials();
  return `<Cabecalho xmlns="" Versao="1">
    <CPFCNPJRemetente>
      <CNPJ>${cleanCnpj(creds.cnpj)}</CNPJ>
    </CPFCNPJRemetente>
  </Cabecalho>`;
}

/**
 * Consultar NFS-e por período
 */
export async function consultarNFSePeriodo(
  dataInicio: string | Date,
  dataFim: string | Date,
  pagina: number = 1
): Promise<NFSeListResultSP> {
  const creds = getCredentials();
  
  if (!creds.cnpj) {
    return { notas: [], total: 0, sucesso: false, mensagemErro: 'CNPJ não configurado (NFSE_SP_CNPJ)' };
  }
  
  const dataInicioStr = formatDateForApi(dataInicio);
  const dataFimStr = formatDateForApi(dataFim);
  
  const pedido = `<PedidoConsultaNFePeriodo xmlns="http://www.prefeitura.sp.gov.br/nfe">
    ${buildCabecalho()}
    <Detalhe>
      <ChaveNFeRPS>
        <CPFCNPJPrestador>
          <CNPJ>${cleanCnpj(creds.cnpj)}</CNPJ>
        </CPFCNPJPrestador>
      </ChaveNFeRPS>
      <Periodo>
        <DataInicio>${dataInicioStr}</DataInicio>
        <DataFim>${dataFimStr}</DataFim>
      </Periodo>
      <Pagina>${pagina}</Pagina>
    </Detalhe>
  </PedidoConsultaNFePeriodo>`;
  
  // Sign the request
  const pedidoAssinado = await signXml(pedido, 'PedidoConsultaNFePeriodo');
  
  const envelope = buildSOAPEnvelope(`
    <ns:ConsultaNFePeriodoRequest>
      <ns:VersaoSchema>1</ns:VersaoSchema>
      <ns:MensagemXML><![CDATA[${pedidoAssinado}]]></ns:MensagemXML>
    </ns:ConsultaNFePeriodoRequest>
  `);
  
  const response = await soapRequest({
    url: getEndpoint(),
    action: 'http://www.prefeitura.sp.gov.br/nfe/ws/ConsultaNFePeriodo',
    body: envelope,
    useCertificate: true,
  });
  
  if (!response.success) {
    return { notas: [], total: 0, sucesso: false, mensagemErro: response.error };
  }
  
  return parseNFSeListResponse(response);
}

/**
 * Consultar NFS-e por número
 */
export async function consultarNFSePorNumero(numeroNFe: string): Promise<NFSeConsultaSP | null> {
  const creds = getCredentials();
  
  if (!creds.cnpj) {
    throw new Error('CNPJ não configurado (NFSE_SP_CNPJ)');
  }
  
  const pedido = `<PedidoConsultaNFe xmlns="http://www.prefeitura.sp.gov.br/nfe">
    ${buildCabecalho()}
    <Detalhe>
      <ChaveNFe>
        <InscricaoPrestador>${creds.ccm}</InscricaoPrestador>
        <NumeroNFe>${numeroNFe}</NumeroNFe>
      </ChaveNFe>
    </Detalhe>
  </PedidoConsultaNFe>`;
  
  const pedidoAssinado = await signXml(pedido, 'PedidoConsultaNFe');
  
  const envelope = buildSOAPEnvelope(`
    <ns:ConsultaNFeRequest>
      <ns:VersaoSchema>1</ns:VersaoSchema>
      <ns:MensagemXML><![CDATA[${pedidoAssinado}]]></ns:MensagemXML>
    </ns:ConsultaNFeRequest>
  `);
  
  const response = await soapRequest({
    url: getEndpoint(),
    action: 'http://www.prefeitura.sp.gov.br/nfe/ws/ConsultaNFe',
    body: envelope,
    useCertificate: true,
  });
  
  if (!response.success) {
    throw new Error(response.error || 'Erro ao consultar NFS-e');
  }
  
  const result = parseNFSeListResponse(response);
  return result.notas[0] || null;
}

/**
 * Cancelar NFS-e
 */
export async function cancelarNFSe(numeroNFe: string): Promise<{ sucesso: boolean; mensagem: string }> {
  const creds = getCredentials();
  
  if (!creds.cnpj || !creds.ccm) {
    return { sucesso: false, mensagem: 'CNPJ ou CCM não configurado' };
  }
  
  const pedido = `<PedidoCancelamentoNFe xmlns="http://www.prefeitura.sp.gov.br/nfe">
    ${buildCabecalho()}
    <Detalhe>
      <ChaveNFe>
        <InscricaoPrestador>${creds.ccm}</InscricaoPrestador>
        <NumeroNFe>${numeroNFe}</NumeroNFe>
      </ChaveNFe>
      <AssinaturaCancelamento>Cancelamento solicitado via sistema</AssinaturaCancelamento>
    </Detalhe>
  </PedidoCancelamentoNFe>`;
  
  const pedidoAssinado = await signXml(pedido, 'PedidoCancelamentoNFe');
  
  const envelope = buildSOAPEnvelope(`
    <ns:CancelamentoNFeRequest>
      <ns:VersaoSchema>1</ns:VersaoSchema>
      <ns:MensagemXML><![CDATA[${pedidoAssinado}]]></ns:MensagemXML>
    </ns:CancelamentoNFeRequest>
  `);
  
  const response = await soapRequest({
    url: getEndpoint(),
    action: 'http://www.prefeitura.sp.gov.br/nfe/ws/CancelamentoNFe',
    body: envelope,
    useCertificate: true,
  });
  
  if (!response.success) {
    return { sucesso: false, mensagem: response.error || 'Erro ao cancelar NFS-e' };
  }
  
  // Parse response for success/error
  const data = response.data;
  const retorno = data?.CancelamentoNFeResponse?.RetornoXML || data?.RetornoCancelamentoNFe;
  
  if (retorno?.Cabecalho?.Sucesso === 'true') {
    return { sucesso: true, mensagem: 'NFS-e cancelada com sucesso' };
  }
  
  const erro = retorno?.Erro?.Mensagem || 'Erro desconhecido no cancelamento';
  return { sucesso: false, mensagem: erro };
}

/**
 * Validar conexão com a API
 */
export async function validarConexaoSP(): Promise<{
  sucesso: boolean;
  mensagem: string;
  ambiente: string;
}> {
  const creds = getCredentials();
  const ambiente = process.env.NFSE_SP_ENVIRONMENT || 'production';
  
  if (!creds.cnpj) {
    return {
      sucesso: false,
      mensagem: 'CNPJ não configurado. Defina NFSE_SP_CNPJ no .env',
      ambiente,
    };
  }
  
  if (!creds.senhaWeb) {
    return {
      sucesso: false,
      mensagem: 'Senha Web não configurada. Defina NFSE_SP_SENHA_WEB no .env',
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
      mensagem: `Configuração válida. Certificado expira em ${cert.info.daysUntilExpiry} dias.`,
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
function parseNFSeListResponse(response: SOAPResponse): NFSeListResultSP {
  try {
    const data = response.data;
    
    // Navigate through SOAP response structure
    const retorno = 
      data?.ConsultaNFePeriodoResponse?.RetornoXML ||
      data?.ConsultaNFeResponse?.RetornoXML ||
      data?.RetornoConsulta;
    
    if (!retorno) {
      return { notas: [], total: 0, sucesso: false, mensagemErro: 'Resposta vazia da API' };
    }
    
    // Check for errors
    if (retorno.Erro) {
      const erros = Array.isArray(retorno.Erro) ? retorno.Erro : [retorno.Erro];
      const mensagens = erros.map((e: any) => e.Mensagem || e.Codigo).join('; ');
      return { notas: [], total: 0, sucesso: false, mensagemErro: mensagens };
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

