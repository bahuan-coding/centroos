/**
 * NF-e / NFC-e - Assinatura Digital XMLDSig
 * 
 * Assina XML conforme padrão XML-DSig (XMLDSig-Core)
 * Requisito: Certificado digital ICP-Brasil (e-CNPJ A1)
 */

import * as crypto from 'crypto';

// ============================================================================
// TIPOS
// ============================================================================

export interface CertificadoInfo {
  /** Thumbprint (SHA1 do certificado) */
  thumbprint: string;
  /** Common Name do subject */
  subjectCN: string;
  /** CNPJ extraído do CN */
  cnpj: string;
  /** Data de validade */
  validUntil: Date;
  /** Certificado está válido */
  isValid: boolean;
  /** Erros de validação */
  errors: string[];
}

export interface CertificadoCarregado {
  /** Certificado em PEM */
  cert: string;
  /** Chave privada em PEM */
  key: string;
  /** Informações do certificado */
  info: CertificadoInfo;
}

export interface ConfiguracaoAssinatura {
  /** Caminho do arquivo PFX */
  pfxPath?: string;
  /** Conteúdo do PFX em base64 */
  pfxBase64?: string;
  /** Conteúdo do PFX em buffer */
  pfxBuffer?: Buffer;
  /** Senha do certificado */
  senha: string;
}

// ============================================================================
// CLASSE PRINCIPAL
// ============================================================================

export class NFeXmlSigner {
  private cert: string = '';
  private key: string = '';
  private info: CertificadoInfo | null = null;
  
  /**
   * Carrega certificado PFX
   */
  async carregarCertificado(config: ConfiguracaoAssinatura): Promise<CertificadoCarregado> {
    let pfxBuffer: Buffer;
    
    if (config.pfxBuffer) {
      pfxBuffer = config.pfxBuffer;
    } else if (config.pfxBase64) {
      pfxBuffer = Buffer.from(config.pfxBase64, 'base64');
    } else if (config.pfxPath) {
      const fs = await import('fs');
      pfxBuffer = fs.readFileSync(config.pfxPath);
    } else {
      throw new Error('Nenhuma fonte de certificado fornecida');
    }
    
    // Extrair certificado e chave do PFX
    // Nota: Em produção, usar biblioteca como 'node-forge' para extração de PFX
    // A API nativa do Node.js não suporta PKCS#12 diretamente
    try {
      // Por enquanto, simular um certificado para desenvolvimento
      // Em produção, usar node-forge ou openssl para extrair do PFX
      
      this.info = {
        thumbprint: 'CERTIFICADO_NAO_CONFIGURADO',
        subjectCN: 'Certificado de Teste',
        cnpj: '',
        validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        isValid: false,
        errors: ['Certificado PFX requer biblioteca node-forge para extração. Instale com: npm install node-forge'],
      };
      
      return {
        cert: '',
        key: '',
        info: this.info,
      };
    } catch (error: any) {
      throw new Error(`Erro ao carregar certificado: ${error.message}. Use um certificado A1 (arquivo .pfx/.p12)`);
    }
  }
  
  /**
   * Extrai informações do certificado X509
   */
  private extrairInfoCertificado(x509: crypto.X509Certificate): CertificadoInfo {
    const subject = x509.subject;
    const validTo = new Date(x509.validTo);
    const now = new Date();
    
    // Extrair CN
    const cnMatch = subject.match(/CN=([^,]+)/);
    const cn = cnMatch ? cnMatch[1] : '';
    
    // Extrair CNPJ do CN (formato: RAZAO SOCIAL:12345678000190)
    const cnpjMatch = cn.match(/:(\d{14})/);
    const cnpj = cnpjMatch ? cnpjMatch[1] : '';
    
    // Validar
    const errors: string[] = [];
    if (validTo < now) {
      errors.push('Certificado expirado');
    }
    if (!cnpj) {
      errors.push('CNPJ não encontrado no certificado');
    }
    
    return {
      thumbprint: x509.fingerprint256.replace(/:/g, ''),
      subjectCN: cn,
      cnpj,
      validUntil: validTo,
      isValid: errors.length === 0,
      errors,
    };
  }
  
  /**
   * Assina XML NF-e
   */
  async assinarXml(xml: string, tagAssinar: string = 'infNFe'): Promise<string> {
    if (!this.cert || !this.key) {
      throw new Error('Certificado não carregado. Chame carregarCertificado() primeiro.');
    }
    
    // Encontrar o elemento a ser assinado
    const tagRegex = new RegExp(`<${tagAssinar}[^>]*>([\\s\\S]*?)<\\/${tagAssinar}>`);
    const match = xml.match(tagRegex);
    
    if (!match) {
      throw new Error(`Tag ${tagAssinar} não encontrada no XML`);
    }
    
    // Extrair Id do elemento
    const idMatch = xml.match(new RegExp(`<${tagAssinar}[^>]*Id="([^"]+)"[^>]*>`));
    const referenceUri = idMatch ? `#${idMatch[1]}` : '';
    
    // Canonicalizar o conteúdo a ser assinado
    const conteudoAssinar = this.canonicalize(match[0]);
    
    // Calcular digest (SHA-1)
    const digestValue = this.calcularDigest(conteudoAssinar);
    
    // Criar SignedInfo
    const signedInfo = this.criarSignedInfo(referenceUri, digestValue);
    
    // Assinar SignedInfo
    const signedInfoCanon = this.canonicalize(signedInfo);
    const signatureValue = this.assinar(signedInfoCanon);
    
    // Extrair certificado em base64 (sem cabeçalhos PEM)
    const certBase64 = this.cert
      .replace(/-----BEGIN CERTIFICATE-----/g, '')
      .replace(/-----END CERTIFICATE-----/g, '')
      .replace(/\s/g, '');
    
    // Montar elemento Signature
    const signature = `<Signature xmlns="http://www.w3.org/2000/09/xmldsig#">
${signedInfo}
<SignatureValue>${signatureValue}</SignatureValue>
<KeyInfo>
<X509Data>
<X509Certificate>${certBase64}</X509Certificate>
</X509Data>
</KeyInfo>
</Signature>`;
    
    // Inserir Signature após o elemento assinado
    const xmlAssinado = xml.replace(
      `</${tagAssinar}>`,
      `</${tagAssinar}>${signature}`
    );
    
    return xmlAssinado;
  }
  
  /**
   * Cria elemento SignedInfo
   */
  private criarSignedInfo(referenceUri: string, digestValue: string): string {
    return `<SignedInfo xmlns="http://www.w3.org/2000/09/xmldsig#">
<CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
<SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"/>
<Reference URI="${referenceUri}">
<Transforms>
<Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>
<Transform Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
</Transforms>
<DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>
<DigestValue>${digestValue}</DigestValue>
</Reference>
</SignedInfo>`;
  }
  
  /**
   * Calcula digest SHA-1 do conteúdo
   */
  private calcularDigest(conteudo: string): string {
    const hash = crypto.createHash('sha1');
    hash.update(conteudo, 'utf8');
    return hash.digest('base64');
  }
  
  /**
   * Assina conteúdo com chave privada RSA-SHA1
   */
  private assinar(conteudo: string): string {
    const sign = crypto.createSign('RSA-SHA1');
    sign.update(conteudo, 'utf8');
    return sign.sign(this.key, 'base64');
  }
  
  /**
   * Canonicaliza XML (C14N simplificado)
   * Nota: Em produção, usar biblioteca xml-crypto para canonicalização completa
   */
  private canonicalize(xml: string): string {
    // Remover declaração XML
    let result = xml.replace(/<\?xml[^?]*\?>/g, '');
    
    // Remover espaços extras entre tags
    result = result.replace(/>\s+</g, '><');
    
    // Normalizar quebras de linha
    result = result.replace(/\r\n/g, '\n');
    result = result.replace(/\r/g, '\n');
    
    // Remover espaços em branco no início e fim
    result = result.trim();
    
    return result;
  }
  
  /**
   * Verifica se certificado está carregado
   */
  isCarregado(): boolean {
    return !!(this.cert && this.key);
  }
  
  /**
   * Obtém informações do certificado
   */
  getInfo(): CertificadoInfo | null {
    return this.info;
  }
  
  /**
   * Valida se certificado está válido
   */
  validarCertificado(): { valido: boolean; erros: string[] } {
    if (!this.info) {
      return { valido: false, erros: ['Certificado não carregado'] };
    }
    
    const erros: string[] = [...this.info.errors];
    
    // Verificar validade
    if (this.info.validUntil < new Date()) {
      erros.push('Certificado expirado');
    }
    
    // Verificar se expira em breve (30 dias)
    const diasParaExpirar = Math.floor(
      (this.info.validUntil.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    if (diasParaExpirar > 0 && diasParaExpirar <= 30) {
      erros.push(`Certificado expira em ${diasParaExpirar} dias`);
    }
    
    return {
      valido: erros.length === 0,
      erros,
    };
  }
}

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

/**
 * Cria instância do assinador
 */
export function criarAssinador(): NFeXmlSigner {
  return new NFeXmlSigner();
}

/**
 * Carrega e assina XML em uma operação
 */
export async function assinarXmlNFe(
  xml: string,
  config: ConfiguracaoAssinatura,
  tagAssinar: string = 'infNFe'
): Promise<{ xmlAssinado: string; info: CertificadoInfo }> {
  const signer = new NFeXmlSigner();
  const certificado = await signer.carregarCertificado(config);
  
  if (!certificado.info.isValid) {
    throw new Error(`Certificado inválido: ${certificado.info.errors.join(', ')}`);
  }
  
  const xmlAssinado = await signer.assinarXml(xml, tagAssinar);
  
  return {
    xmlAssinado,
    info: certificado.info,
  };
}

/**
 * Valida assinatura de XML (verificação básica)
 */
export function validarAssinaturaXml(xml: string): { valido: boolean; erro?: string } {
  try {
    // Verificar se tem Signature
    if (!xml.includes('<Signature')) {
      return { valido: false, erro: 'XML não possui assinatura' };
    }
    
    // Extrair DigestValue
    const digestMatch = xml.match(/<DigestValue>([^<]+)<\/DigestValue>/);
    if (!digestMatch) {
      return { valido: false, erro: 'DigestValue não encontrado' };
    }
    
    // Extrair SignatureValue
    const sigMatch = xml.match(/<SignatureValue>([^<]+)<\/SignatureValue>/);
    if (!sigMatch) {
      return { valido: false, erro: 'SignatureValue não encontrado' };
    }
    
    // Extrair X509Certificate
    const certMatch = xml.match(/<X509Certificate>([^<]+)<\/X509Certificate>/);
    if (!certMatch) {
      return { valido: false, erro: 'X509Certificate não encontrado' };
    }
    
    // Verificação completa requer recalcular digest e verificar assinatura
    // Isso seria feito com biblioteca xml-crypto em produção
    
    return { valido: true };
  } catch (error: any) {
    return { valido: false, erro: error.message };
  }
}

