/**
 * Certificate Manager for Fiscal Integrations
 * Loads and decrypts A1/A3 certificates from database for NFSe operations
 */

import crypto from 'crypto';
import forge from 'node-forge';
import { eq } from 'drizzle-orm';
import { getDb } from '../../db';
import * as schema from '../../../drizzle/schema';

const CERT_ENCRYPTION_KEY = process.env.CERTIFICATE_ENCRYPTION_KEY || 'default-dev-key-change-in-prod-32ch';

/**
 * Decrypts data encrypted with AES-256-GCM
 */
function decryptData(encryptedData: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedData.split(':');
  const key = crypto.scryptSync(CERT_ENCRYPTION_KEY, 'salt', 32);
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export interface CertificateInfo {
  id: string;
  cnpj: string;
  razaoSocial: string;
  validadeInicio: string;
  validadeFim: string;
  serialNumber: string;
  emissor: string;
  daysUntilExpiry: number;
  isValid: boolean;
}

export interface LoadedCertificate {
  pfxBuffer: Buffer;
  password: string;
  info: CertificateInfo;
  /** node-forge certificate object for signing */
  cert: forge.pki.Certificate;
  /** node-forge private key for signing */
  privateKey: forge.pki.PrivateKey;
}

/**
 * Load active certificate for a specific CNPJ
 * @param cnpj - CNPJ to match (14 digits, no formatting)
 */
export async function loadCertificateByCnpj(cnpj: string): Promise<LoadedCertificate | null> {
  const db = await getDb();
  
  // Normalize CNPJ (remove formatting)
  const cnpjClean = cnpj.replace(/\D/g, '');
  
  const [certRecord] = await db
    .select()
    .from(schema.certificadoDigital)
    .where(eq(schema.certificadoDigital.status, 'ativo'))
    .limit(1);
  
  if (!certRecord) {
    return null;
  }
  
  // Verify CNPJ matches (optional - can be removed if single-tenant)
  if (certRecord.cnpj !== cnpjClean) {
    console.warn(`Certificate CNPJ mismatch: expected ${cnpjClean}, got ${certRecord.cnpj}`);
    // For now, return the active certificate anyway (single-tenant mode)
  }
  
  // Decrypt the stored data
  const pfxBase64 = decryptData(certRecord.arquivoCriptografado);
  const password = decryptData(certRecord.senhaCriptografada);
  const pfxBuffer = Buffer.from(pfxBase64, 'base64');
  
  // Parse certificate using node-forge
  const pfxDer = forge.util.decode64(pfxBase64);
  const pfxAsn1 = forge.asn1.fromDer(pfxDer);
  const p12 = forge.pkcs12.pkcs12FromAsn1(pfxAsn1, password);
  
  // Get certificate
  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
  const certBag = certBags[forge.pki.oids.certBag]?.[0];
  if (!certBag?.cert) {
    throw new Error('Certificate not found in PFX file');
  }
  
  // Get private key
  const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
  const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0];
  if (!keyBag?.key) {
    throw new Error('Private key not found in PFX file');
  }
  
  // Calculate days until expiry
  const expiryDate = new Date(certRecord.validadeFim);
  const now = new Date();
  const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  return {
    pfxBuffer,
    password,
    info: {
      id: certRecord.id,
      cnpj: certRecord.cnpj,
      razaoSocial: certRecord.razaoSocial,
      validadeInicio: certRecord.validadeInicio,
      validadeFim: certRecord.validadeFim,
      serialNumber: certRecord.serialNumber,
      emissor: certRecord.emissor,
      daysUntilExpiry,
      isValid: daysUntilExpiry > 0,
    },
    cert: certBag.cert,
    privateKey: keyBag.key,
  };
}

/**
 * Load the currently active certificate (regardless of CNPJ)
 * Used when there's only one active certificate in the system
 */
export async function loadActiveCertificate(): Promise<LoadedCertificate | null> {
  const db = await getDb();
  
  const [certRecord] = await db
    .select()
    .from(schema.certificadoDigital)
    .where(eq(schema.certificadoDigital.status, 'ativo'))
    .limit(1);
  
  if (!certRecord) {
    return null;
  }
  
  return loadCertificateByCnpj(certRecord.cnpj);
}

/**
 * Validate that a certificate exists and is not expired
 */
export async function validateCertificate(): Promise<{ valid: boolean; error?: string; info?: CertificateInfo }> {
  try {
    const cert = await loadActiveCertificate();
    
    if (!cert) {
      return { valid: false, error: 'Nenhum certificado ativo encontrado' };
    }
    
    if (!cert.info.isValid) {
      return { valid: false, error: 'Certificado expirado', info: cert.info };
    }
    
    if (cert.info.daysUntilExpiry < 30) {
      console.warn(`Certificate expiring in ${cert.info.daysUntilExpiry} days`);
    }
    
    return { valid: true, info: cert.info };
  } catch (error: any) {
    return { valid: false, error: `Erro ao validar certificado: ${error.message}` };
  }
}





