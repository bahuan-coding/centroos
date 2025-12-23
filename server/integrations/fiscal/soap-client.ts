/**
 * SOAP Client for Brazilian Fiscal APIs
 * 
 * Generic SOAP client with mTLS support using digital certificates.
 * Used for integrations with municipal NFS-e systems (like Nota Fiscal Paulistana).
 */

import https from 'https';
import { parseStringPromise, Builder } from 'xml2js';
import { loadActiveCertificate, type LoadedCertificate } from './certificates';

export interface SOAPRequest {
  url: string;
  action: string;
  body: string;
  useCertificate?: boolean;
}

export interface SOAPResponse<T = any> {
  success: boolean;
  data?: T;
  rawXml?: string;
  error?: string;
  httpStatus?: number;
}

/**
 * Build a SOAP envelope with the given body
 */
export function buildSOAPEnvelope(body: string, namespace?: string): string {
  const ns = namespace || 'http://www.prefeitura.sp.gov.br/nfe';
  return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns="${ns}">
  <soap:Header/>
  <soap:Body>
    ${body}
  </soap:Body>
</soap:Envelope>`;
}

/**
 * Execute a SOAP request with optional mTLS certificate authentication
 */
export async function soapRequest<T = any>(request: SOAPRequest): Promise<SOAPResponse<T>> {
  const url = new URL(request.url);
  
  let agent: https.Agent | undefined;
  
  if (request.useCertificate !== false) {
    const cert = await loadActiveCertificate();
    if (!cert) {
      return {
        success: false,
        error: 'Certificado digital não encontrado. Configure em Configurações > Certificado Digital.',
      };
    }
    
    if (!cert.info.isValid) {
      return {
        success: false,
        error: `Certificado expirado em ${cert.info.validadeFim}`,
      };
    }
    
    agent = new https.Agent({
      pfx: cert.pfxBuffer,
      passphrase: cert.password,
      rejectUnauthorized: true,
    });
  }
  
  const options: https.RequestOptions = {
    hostname: url.hostname,
    port: url.port || 443,
    path: url.pathname + url.search,
    method: 'POST',
    agent,
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      'SOAPAction': request.action,
      'Content-Length': Buffer.byteLength(request.body, 'utf8'),
    },
  };
  
  return new Promise((resolve) => {
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', async () => {
        try {
          // Parse XML response
          const parsed = await parseStringPromise(data, {
            explicitArray: false,
            ignoreAttrs: true,
            tagNameProcessors: [(name) => name.replace(/^.*:/, '')], // Remove namespace prefixes
          });
          
          // Check for SOAP Fault
          const envelope = parsed.Envelope || parsed['soap:Envelope'];
          const body = envelope?.Body || envelope?.['soap:Body'];
          
          if (body?.Fault) {
            resolve({
              success: false,
              error: body.Fault.faultstring || body.Fault.detail || 'Erro SOAP desconhecido',
              rawXml: data,
              httpStatus: res.statusCode,
            });
            return;
          }
          
          resolve({
            success: res.statusCode === 200,
            data: body as T,
            rawXml: data,
            httpStatus: res.statusCode,
          });
        } catch (parseError: any) {
          resolve({
            success: false,
            error: `Erro ao processar resposta XML: ${parseError.message}`,
            rawXml: data,
            httpStatus: res.statusCode,
          });
        }
      });
    });
    
    req.on('error', (error: any) => {
      resolve({
        success: false,
        error: `Erro de conexão: ${error.message}`,
      });
    });
    
    req.write(request.body);
    req.end();
  });
}

/**
 * Convert JavaScript object to XML string
 */
export function objectToXml(obj: any, rootName: string): string {
  const builder = new Builder({
    headless: true,
    renderOpts: { pretty: false },
  });
  return builder.buildObject({ [rootName]: obj });
}

/**
 * Extract text content from parsed XML safely
 */
export function extractXmlText(obj: any, path: string): string | undefined {
  const parts = path.split('.');
  let current = obj;
  
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = current[part];
  }
  
  if (typeof current === 'string') return current;
  if (typeof current === 'object' && current._) return current._;
  return current?.toString();
}

/**
 * Format date for Brazilian fiscal APIs (YYYY-MM-DD)
 */
export function formatDateForApi(date: Date | string): string {
  if (typeof date === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
    date = new Date(date);
  }
  return date.toISOString().split('T')[0];
}

/**
 * Clean CNPJ (remove formatting)
 */
export function cleanCnpj(cnpj: string): string {
  return cnpj.replace(/\D/g, '');
}

