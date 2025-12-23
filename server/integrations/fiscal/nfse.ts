/**
 * NFS-e (Nota Fiscal de Serviço Eletrônica) Integration
 * 
 * Provides functions to:
 * - Query issued NFS-e from NFS-e Nacional API
 * - Get NFS-e details by key
 * - List NFS-e for a given period
 * 
 * Uses certificate from database for authentication
 */

import https from 'https';
import { loadActiveCertificate, LoadedCertificate } from './certificates';

// NFS-e Nacional API endpoints
const NFSE_API = {
  // Production
  production: 'https://www.nfse.gov.br/api',
  // Homologation (testing)
  homologation: 'https://www.nfse.gov.br/homologacao/api',
};

// Use homologation by default, switch to production when ready
const API_BASE = process.env.NFSE_ENVIRONMENT === 'production' 
  ? NFSE_API.production 
  : NFSE_API.homologation;

export interface NfseConsulta {
  chaveAcesso: string;
  numero: string;
  serie: string;
  dataEmissao: string;
  competencia: string;
  valorServico: number;
  valorLiquido: number;
  issRetido: boolean;
  valorIss: number;
  codigoServico: string;
  descricaoServico: string;
  prestador: {
    cnpj: string;
    razaoSocial: string;
    inscricaoMunicipal?: string;
  };
  tomador: {
    cpfCnpj: string;
    razaoSocial: string;
    email?: string;
  };
  status: 'normal' | 'cancelada' | 'substituida';
  xmlBase64?: string;
}

export interface NfseListParams {
  cnpjPrestador: string;
  dataInicio: string; // YYYY-MM-DD
  dataFim: string;    // YYYY-MM-DD
  pagina?: number;
  tamanhoPagina?: number;
}

export interface NfseListResult {
  notas: NfseConsulta[];
  total: number;
  pagina: number;
  totalPaginas: number;
}

/**
 * Create HTTPS agent with client certificate for mutual TLS
 */
function createHttpsAgent(cert: LoadedCertificate): https.Agent {
  return new https.Agent({
    pfx: cert.pfxBuffer,
    passphrase: cert.password,
    rejectUnauthorized: true,
  });
}

/**
 * Query NFS-e by access key
 */
export async function consultarNfse(chaveAcesso: string): Promise<NfseConsulta | null> {
  const cert = await loadActiveCertificate();
  if (!cert) {
    throw new Error('Nenhum certificado digital ativo. Configure o certificado em Configurações.');
  }
  
  if (!cert.info.isValid) {
    throw new Error(`Certificado expirado em ${cert.info.validadeFim}`);
  }
  
  const agent = createHttpsAgent(cert);
  
  try {
    const response = await fetch(`${API_BASE}/nfse/${chaveAcesso}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      // @ts-ignore - Node 18+ fetch supports agent
      agent,
    });
    
    if (response.status === 404) {
      return null;
    }
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Erro ao consultar NFS-e: ${response.status} - ${error}`);
    }
    
    return await response.json() as NfseConsulta;
  } catch (error: any) {
    console.error('[NFSe] Erro na consulta:', error);
    throw error;
  }
}

/**
 * List NFS-e issued by the company in a given period
 */
export async function listarNfse(params: NfseListParams): Promise<NfseListResult> {
  const cert = await loadActiveCertificate();
  if (!cert) {
    throw new Error('Nenhum certificado digital ativo. Configure o certificado em Configurações.');
  }
  
  if (!cert.info.isValid) {
    throw new Error(`Certificado expirado em ${cert.info.validadeFim}`);
  }
  
  // Validate CNPJ matches certificate
  const cnpjClean = params.cnpjPrestador.replace(/\D/g, '');
  if (cnpjClean !== cert.info.cnpj) {
    throw new Error('CNPJ do prestador não corresponde ao certificado digital ativo.');
  }
  
  const agent = createHttpsAgent(cert);
  
  const queryParams = new URLSearchParams({
    cnpjPrestador: cnpjClean,
    dataInicio: params.dataInicio,
    dataFim: params.dataFim,
    pagina: String(params.pagina || 1),
    tamanhoPagina: String(params.tamanhoPagina || 50),
  });
  
  try {
    const response = await fetch(`${API_BASE}/nfse?${queryParams}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      // @ts-ignore - Node 18+ fetch supports agent
      agent,
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Erro ao listar NFS-e: ${response.status} - ${error}`);
    }
    
    return await response.json() as NfseListResult;
  } catch (error: any) {
    console.error('[NFSe] Erro ao listar:', error);
    throw error;
  }
}

/**
 * Get NFS-e XML by access key
 */
export async function obterXmlNfse(chaveAcesso: string): Promise<string | null> {
  const nota = await consultarNfse(chaveAcesso);
  if (!nota?.xmlBase64) {
    return null;
  }
  return Buffer.from(nota.xmlBase64, 'base64').toString('utf-8');
}

/**
 * Validate connection and certificate with NFS-e API
 */
export async function validarConexaoNfse(): Promise<{ 
  success: boolean; 
  message: string; 
  certificateInfo?: { cnpj: string; razaoSocial: string; validadeFim: string } 
}> {
  try {
    const cert = await loadActiveCertificate();
    if (!cert) {
      return { success: false, message: 'Nenhum certificado digital ativo' };
    }
    
    if (!cert.info.isValid) {
      return { 
        success: false, 
        message: `Certificado expirado em ${cert.info.validadeFim}`,
        certificateInfo: {
          cnpj: cert.info.cnpj,
          razaoSocial: cert.info.razaoSocial,
          validadeFim: cert.info.validadeFim,
        }
      };
    }
    
    // TODO: Implement actual API health check when API is available
    // For now, just validate the certificate can be loaded
    
    return {
      success: true,
      message: `Certificado válido por mais ${cert.info.daysUntilExpiry} dias`,
      certificateInfo: {
        cnpj: cert.info.cnpj,
        razaoSocial: cert.info.razaoSocial,
        validadeFim: cert.info.validadeFim,
      }
    };
  } catch (error: any) {
    return { success: false, message: `Erro: ${error.message}` };
  }
}

