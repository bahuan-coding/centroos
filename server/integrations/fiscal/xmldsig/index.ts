/**
 * XMLDSig Module for Brazilian NFSe
 * 
 * Proprietary implementation of XML Digital Signature (XMLDSig)
 * compliant with W3C specifications and Brazilian fiscal requirements.
 * 
 * Features:
 * - Canonical XML 1.0 (C14N) implementation
 * - RSA-SHA1 signature algorithm
 * - Enveloped signature format
 * - RPS signature for NFSe Paulistana
 * - Signature validation for debugging
 */

// Core canonicalization
export {
  canonicalize,
  removeSignatureElement,
  applyTransforms,
  canonicalizeSignedInfo
} from './c14n';

// XMLDSig signer
export {
  signXml,
  signNFSeXml,
  type SignerOptions,
  type CertificateData
} from './signer';

// RPS signature (NFSe Paulistana specific)
export {
  buildRPSSignatureString,
  signRPSString,
  signRPS,
  formatDateForRPS,
  valorToCentavos,
  type RPSData
} from './rps-signer';

// Validator
export {
  validateSignature,
  hasSignature,
  extractCertificateInfo,
  debugCanonical,
  type ValidationResult
} from './validator';




