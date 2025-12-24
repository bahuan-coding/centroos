/**
 * XMLDSig Signature Validator
 * 
 * Validates XML digital signatures for debugging and testing.
 * This is useful to verify signatures before sending to external APIs.
 */

import crypto from 'crypto';
import forge from 'node-forge';
import { canonicalize, applyTransforms } from './c14n';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  details: {
    digestValid?: boolean;
    signatureValid?: boolean;
    certificateValid?: boolean;
    digestValue?: string;
    calculatedDigest?: string;
    signatureValue?: string;
    certificateInfo?: {
      subject: string;
      issuer: string;
      validFrom: Date;
      validTo: Date;
      serialNumber: string;
    };
  };
}

/**
 * Extract the Signature element from signed XML
 */
function extractSignature(xml: string): {
  signedInfo: string;
  signatureValue: string;
  digestValue: string;
  certificate: string;
  referenceUri: string;
} | null {
  // Extract SignedInfo
  const signedInfoMatch = xml.match(/<SignedInfo[^>]*>([\s\S]*?)<\/SignedInfo>/);
  if (!signedInfoMatch) return null;
  
  // Reconstruct full SignedInfo element with namespace
  const signedInfoContent = signedInfoMatch[0];
  
  // Check if SignedInfo has its own xmlns, if not, add it
  let signedInfo = signedInfoContent;
  if (!signedInfoContent.includes('xmlns=')) {
    signedInfo = signedInfoContent.replace('<SignedInfo', '<SignedInfo xmlns="http://www.w3.org/2000/09/xmldsig#"');
  }
  
  // Extract DigestValue
  const digestMatch = xml.match(/<DigestValue>([^<]+)<\/DigestValue>/);
  if (!digestMatch) return null;
  
  // Extract SignatureValue
  const sigValueMatch = xml.match(/<SignatureValue>([^<]+)<\/SignatureValue>/);
  if (!sigValueMatch) return null;
  
  // Extract Certificate
  const certMatch = xml.match(/<X509Certificate>([^<]+)<\/X509Certificate>/);
  if (!certMatch) return null;
  
  // Extract Reference URI
  const refMatch = xml.match(/<Reference\s+URI="([^"]*)"/);
  const referenceUri = refMatch ? refMatch[1] : '';
  
  return {
    signedInfo,
    signatureValue: sigValueMatch[1].replace(/\s/g, ''),
    digestValue: digestMatch[1].replace(/\s/g, ''),
    certificate: certMatch[1].replace(/\s/g, ''),
    referenceUri
  };
}

/**
 * Calculate SHA-1 digest of data
 */
function sha1Digest(data: string): string {
  return crypto.createHash('sha1').update(data, 'utf8').digest('base64');
}

/**
 * Validate an XMLDSig signature
 * 
 * @param signedXml - The signed XML document
 * @returns Validation result with details
 */
export function validateSignature(signedXml: string): ValidationResult {
  const errors: string[] = [];
  const details: ValidationResult['details'] = {};
  
  try {
    // Extract signature components
    const sigData = extractSignature(signedXml);
    if (!sigData) {
      return {
        valid: false,
        errors: ['Could not extract signature from XML'],
        details
      };
    }
    
    details.digestValue = sigData.digestValue;
    details.signatureValue = sigData.signatureValue.substring(0, 20) + '...';
    
    // Step 1: Validate DigestValue
    // Apply transforms (remove signature, canonicalize) and calculate digest
    const transformedXml = applyTransforms(signedXml);
    const calculatedDigest = sha1Digest(transformedXml);
    
    details.calculatedDigest = calculatedDigest;
    details.digestValid = calculatedDigest === sigData.digestValue;
    
    if (!details.digestValid) {
      errors.push(`DigestValue mismatch: expected ${sigData.digestValue}, calculated ${calculatedDigest}`);
    }
    
    // Step 2: Parse and validate certificate
    try {
      const certDer = forge.util.decode64(sigData.certificate);
      const certAsn1 = forge.asn1.fromDer(certDer);
      const cert = forge.pki.certificateFromAsn1(certAsn1);
      
      const now = new Date();
      const validFrom = cert.validity.notBefore;
      const validTo = cert.validity.notAfter;
      
      details.certificateInfo = {
        subject: cert.subject.getField('CN')?.value || 'Unknown',
        issuer: cert.issuer.getField('CN')?.value || 'Unknown',
        validFrom,
        validTo,
        serialNumber: cert.serialNumber
      };
      
      details.certificateValid = now >= validFrom && now <= validTo;
      
      if (!details.certificateValid) {
        errors.push(`Certificate is expired or not yet valid. Valid from ${validFrom.toISOString()} to ${validTo.toISOString()}`);
      }
      
      // Step 3: Validate SignatureValue
      // Canonicalize SignedInfo and verify with public key
      const canonicalSignedInfo = canonicalize(sigData.signedInfo);
      
      try {
        // Create verifier
        const md = forge.md.sha1.create();
        md.update(canonicalSignedInfo, 'utf8');
        
        const signatureBytes = forge.util.decode64(sigData.signatureValue);
        
        // Verify signature
        details.signatureValid = cert.publicKey.verify(
          md.digest().bytes(),
          signatureBytes
        );
        
        if (!details.signatureValid) {
          errors.push('SignatureValue verification failed');
        }
      } catch (verifyError: any) {
        errors.push(`Signature verification error: ${verifyError.message}`);
        details.signatureValid = false;
      }
    } catch (certError: any) {
      errors.push(`Certificate parsing error: ${certError.message}`);
      details.certificateValid = false;
    }
    
    const valid = details.digestValid === true && 
                  details.signatureValid === true && 
                  details.certificateValid === true;
    
    return { valid, errors, details };
    
  } catch (error: any) {
    return {
      valid: false,
      errors: [`Validation error: ${error.message}`],
      details
    };
  }
}

/**
 * Quick check if XML has a signature element
 */
export function hasSignature(xml: string): boolean {
  return /<Signature[^>]*xmlns="http:\/\/www\.w3\.org\/2000\/09\/xmldsig#"/.test(xml) ||
         /<Signature\s/.test(xml);
}

/**
 * Extract certificate info from signed XML without full validation
 */
export function extractCertificateInfo(signedXml: string): {
  subject: string;
  issuer: string;
  validFrom: Date;
  validTo: Date;
  serialNumber: string;
} | null {
  const certMatch = signedXml.match(/<X509Certificate>([^<]+)<\/X509Certificate>/);
  if (!certMatch) return null;
  
  try {
    const certDer = forge.util.decode64(certMatch[1].replace(/\s/g, ''));
    const certAsn1 = forge.asn1.fromDer(certDer);
    const cert = forge.pki.certificateFromAsn1(certAsn1);
    
    return {
      subject: cert.subject.getField('CN')?.value || 'Unknown',
      issuer: cert.issuer.getField('CN')?.value || 'Unknown',
      validFrom: cert.validity.notBefore,
      validTo: cert.validity.notAfter,
      serialNumber: cert.serialNumber
    };
  } catch {
    return null;
  }
}

/**
 * Debug helper: Show the canonical form of XML
 */
export function debugCanonical(xml: string): {
  original: string;
  canonical: string;
  withoutSignature: string;
} {
  const canonical = canonicalize(xml);
  const withoutSignature = applyTransforms(xml);
  
  return {
    original: xml,
    canonical,
    withoutSignature
  };
}




