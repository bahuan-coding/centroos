/**
 * Integra Contador SERPRO - Cliente mTLS
 * 
 * Implementa autenticação mútua TLS (mutual TLS) usando certificado digital ICP-Brasil
 * para requisições que exigem certificado cliente.
 * 
 * Usado quando a Paycubed consulta seus próprios dados fiscais.
 */

import https from 'https';
import forge from 'node-forge';
import { loadActiveCertificate, type LoadedCertificate } from '../fiscal/certificates';

export interface MtlsAgentOptions {
  /** Se deve validar o certificado do servidor (default: true) */
  rejectUnauthorized?: boolean;
  /** Timeout em ms para conexão (default: 30000) */
  timeout?: number;
}

/**
 * Cache do agente HTTPS para reutilização
 */
let cachedAgent: https.Agent | null = null;
let cachedCertId: string | null = null;

/**
 * Converte certificado forge para formato PEM
 */
function forgeCertToPem(cert: forge.pki.Certificate): string {
  return forge.pki.certificateToPem(cert);
}

/**
 * Converte chave privada forge para formato PEM
 */
function forgeKeyToPem(key: forge.pki.PrivateKey): string {
  return forge.pki.privateKeyToPem(key);
}

/**
 * Cria um agente HTTPS com certificado cliente (mTLS)
 * 
 * O agente é cacheado para reutilização e recriado se o certificado mudar.
 * 
 * @param options - Opções do agente
 * @returns Agente HTTPS configurado com certificado cliente
 */
export async function createMtlsAgent(options: MtlsAgentOptions = {}): Promise<https.Agent> {
  const {
    rejectUnauthorized = true,
    timeout = 30000,
  } = options;

  // Carregar certificado ativo
  const cert = await loadActiveCertificate();
  
  if (!cert) {
    throw new Error(
      'Nenhum certificado digital ativo encontrado. ' +
      'Configure o certificado PFX em Configurações > Certificado Digital.'
    );
  }

  // Verificar se certificado ainda é válido
  if (!cert.info.isValid) {
    throw new Error(
      `Certificado digital expirado em ${cert.info.validadeFim}. ` +
      'Atualize o certificado em Configurações > Certificado Digital.'
    );
  }

  // Verificar se podemos reutilizar o agente cacheado
  if (cachedAgent && cachedCertId === cert.info.id) {
    console.log('[mTLS] Reutilizando agente em cache');
    return cachedAgent;
  }

  console.log('[mTLS] Criando novo agente com certificado:', {
    cnpj: cert.info.cnpj,
    razaoSocial: cert.info.razaoSocial,
    validoAte: cert.info.validadeFim,
    diasRestantes: cert.info.daysUntilExpiry,
  });

  // Converter certificado e chave para PEM
  const certPem = forgeCertToPem(cert.cert);
  const keyPem = forgeKeyToPem(cert.privateKey);

  // Criar agente HTTPS com certificado cliente
  const agent = new https.Agent({
    cert: certPem,
    key: keyPem,
    rejectUnauthorized,
    timeout,
    keepAlive: true,
    maxSockets: 10,
  });

  // Cachear para reutilização
  cachedAgent = agent;
  cachedCertId = cert.info.id;

  console.log('[mTLS] Agente criado com sucesso');

  return agent;
}

/**
 * Invalida o agente em cache (força recriação)
 */
export function invalidateMtlsAgent(): void {
  if (cachedAgent) {
    cachedAgent.destroy();
    cachedAgent = null;
    cachedCertId = null;
    console.log('[mTLS] Agente invalidado');
  }
}

/**
 * Obtém informações do certificado atual
 */
export async function getMtlsCertificateInfo(): Promise<{
  loaded: boolean;
  cnpj?: string;
  razaoSocial?: string;
  validoAte?: string;
  diasRestantes?: number;
  isValid?: boolean;
  error?: string;
}> {
  try {
    const cert = await loadActiveCertificate();
    
    if (!cert) {
      return {
        loaded: false,
        error: 'Nenhum certificado ativo encontrado',
      };
    }

    return {
      loaded: true,
      cnpj: cert.info.cnpj,
      razaoSocial: cert.info.razaoSocial,
      validoAte: cert.info.validadeFim,
      diasRestantes: cert.info.daysUntilExpiry,
      isValid: cert.info.isValid,
    };
  } catch (error: any) {
    return {
      loaded: false,
      error: error.message,
    };
  }
}

/**
 * Faz uma requisição HTTP com mTLS
 * 
 * Usa o módulo https nativo do Node.js para suportar agente customizado.
 * 
 * @param url - URL da requisição
 * @param options - Opções da requisição
 * @param agent - Agente HTTPS com certificado (opcional, cria automaticamente)
 */
export async function mtlsFetch(
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  } = {},
  agent?: https.Agent
): Promise<{
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  ok: boolean;
}> {
  const { method = 'GET', headers = {}, body } = options;
  
  // Criar ou usar agente fornecido
  const httpsAgent = agent || await createMtlsAgent();
  
  // Parse URL
  const urlObj = new URL(url);
  
  return new Promise((resolve, reject) => {
    const requestOptions: https.RequestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method,
      headers: {
        'User-Agent': 'Centroos/1.0 SERPRO-Integration',
        ...headers,
      },
      agent: httpsAgent,
    };

    const req = https.request(requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const responseHeaders: Record<string, string> = {};
        for (const [key, value] of Object.entries(res.headers)) {
          if (value) {
            responseHeaders[key.toLowerCase()] = Array.isArray(value) ? value.join(', ') : value;
          }
        }
        
        resolve({
          status: res.statusCode || 0,
          statusText: res.statusMessage || '',
          headers: responseHeaders,
          body: data,
          ok: (res.statusCode || 0) >= 200 && (res.statusCode || 0) < 300,
        });
      });
    });

    req.on('error', (error) => {
      console.error('[mTLS] Erro na requisição:', error.message);
      reject(new Error(`Erro mTLS: ${error.message}`));
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout na conexão mTLS'));
    });

    if (body) {
      req.write(body);
    }
    
    req.end();
  });
}

/**
 * Verifica se mTLS está configurado e funcional
 */
export async function testMtlsConnection(): Promise<{
  success: boolean;
  certificateInfo?: Awaited<ReturnType<typeof getMtlsCertificateInfo>>;
  error?: string;
}> {
  try {
    const certInfo = await getMtlsCertificateInfo();
    
    if (!certInfo.loaded || !certInfo.isValid) {
      return {
        success: false,
        certificateInfo: certInfo,
        error: certInfo.error || 'Certificado inválido ou expirado',
      };
    }

    // Criar agente para validar que certificado pode ser carregado
    await createMtlsAgent();

    return {
      success: true,
      certificateInfo: certInfo,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

