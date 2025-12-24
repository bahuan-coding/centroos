/**
 * XMLDSig Core Signer
 * 
 * Implements XML Digital Signature according to W3C specification
 * https://www.w3.org/TR/xmldsig-core/
 * 
 * Specifically tuned for Brazilian NFSe requirements:
 * - Enveloped signature format
 * - RSA-SHA1 signature algorithm
 * - C14N canonicalization
 */

import crypto from 'crypto';
import forge from 'node-forge';
import { canonicalize, applyTransforms, canonicalizeSignedInfo } from './c14n';

// XMLDSig namespace
const XMLDSIG_NS = 'http://www.w3.org/2000/09/xmldsig#';
const C14N_ALGORITHM = 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315';
const RSA_SHA1_ALGORITHM = 'http://www.w3.org/2000/09/xmldsig#rsa-sha1';
const SHA1_ALGORITHM = 'http://www.w3.org/2000/09/xmldsig#sha1';
const ENVELOPED_TRANSFORM = 'http://www.w3.org/2000/09/xmldsig#enveloped-signature';

export interface SignerOptions {
  /** Reference URI (empty string for entire document) */
  referenceUri?: string;
  /** Tag name where signature should be inserted before closing */
  insertBeforeTag?: string;
  /** ID attribute to reference */
  referenceId?: string;
}

export interface CertificateData {
  /** The X.509 certificate (node-forge format) */
  cert: forge.pki.Certificate;
  /** The private key (node-forge format) */
  privateKey: forge.pki.PrivateKey;
}

/**
 * Calculate SHA-1 digest of data
 */
function sha1Digest(data: string): string {
  return crypto.createHash('sha1').update(data, 'utf8').digest('base64');
}

/**
 * Sign data using RSA-SHA1 with node-forge
 */
function rsaSha1Sign(data: string, privateKey: forge.pki.PrivateKey): string {
  const md = forge.md.sha1.create();
  md.update(data, 'utf8');
  const signature = privateKey.sign(md);
  return forge.util.encode64(signature);
}

/**
 * Get certificate as Base64 DER
 */
function getCertificateBase64(cert: forge.pki.Certificate): string {
  const certAsn1 = forge.pki.certificateToAsn1(cert);
  const certDer = forge.asn1.toDer(certAsn1).getBytes();
  return forge.util.encode64(certDer);
}

/**
 * Build the SignedInfo element
 */
function buildSignedInfo(digestValue: string, referenceUri: string): string {
  // Build without whitespace for proper canonicalization
  return `<SignedInfo xmlns="${XMLDSIG_NS}">` +
    `<CanonicalizationMethod Algorithm="${C14N_ALGORITHM}"/>` +
    `<SignatureMethod Algorithm="${RSA_SHA1_ALGORITHM}"/>` +
    `<Reference URI="${referenceUri}">` +
    `<Transforms>` +
    `<Transform Algorithm="${ENVELOPED_TRANSFORM}"/>` +
    `<Transform Algorithm="${C14N_ALGORITHM}"/>` +
    `</Transforms>` +
    `<DigestMethod Algorithm="${SHA1_ALGORITHM}"/>` +
    `<DigestValue>${digestValue}</DigestValue>` +
    `</Reference>` +
    `</SignedInfo>`;
}

/**
 * Build the complete Signature element
 */
function buildSignatureElement(
  signedInfo: string,
  signatureValue: string,
  certBase64: string
): string {
  return `<Signature xmlns="${XMLDSIG_NS}">` +
    signedInfo +
    `<SignatureValue>${signatureValue}</SignatureValue>` +
    `<KeyInfo>` +
    `<X509Data>` +
    `<X509Certificate>${certBase64}</X509Certificate>` +
    `</X509Data>` +
    `</KeyInfo>` +
    `</Signature>`;
}

/**
 * Insert signature element into XML before the specified closing tag
 */
function insertSignature(xml: string, signature: string, beforeTag: string): string {
  const closingTag = `</${beforeTag}>`;
  const pos = xml.lastIndexOf(closingTag);
  
  if (pos === -1) {
    throw new Error(`Closing tag </${beforeTag}> not found in XML`);
  }
  
  return xml.substring(0, pos) + signature + xml.substring(pos);
}

/**
 * Sign an XML document using XMLDSig (Enveloped Signature)
 * 
 * This follows the standard XMLDSig workflow:
 * 1. Apply transforms (enveloped + C14N) to get canonical form
 * 2. Calculate SHA-1 digest of canonical form
 * 3. Build SignedInfo with the digest
 * 4. Canonicalize SignedInfo
 * 5. Sign canonical SignedInfo with RSA-SHA1
 * 6. Build complete Signature element
 * 7. Insert Signature into original XML
 * 
 * @param xml - The XML document to sign
 * @param certificate - Certificate and private key
 * @param options - Signing options
 * @returns Signed XML document
 */
export function signXml(
  xml: string,
  certificate: CertificateData,
  options: SignerOptions = {}
): string {
  const {
    referenceUri = '',
    insertBeforeTag
  } = options;

  // Step 1: Apply transforms (enveloped + C14N)
  // For the DigestValue, we need to compute the digest over the document
  // after the enveloped signature transform removes any existing signature
  const transformedXml = applyTransforms(xml);
  
  // Step 2: Calculate SHA-1 digest
  const digestValue = sha1Digest(transformedXml);
  
  // Step 3: Build SignedInfo element
  const signedInfo = buildSignedInfo(digestValue, referenceUri);
  
  // Step 4: Canonicalize SignedInfo
  const canonicalSignedInfo = canonicalizeSignedInfo(signedInfo);
  
  // Step 5: Sign canonical SignedInfo with RSA-SHA1
  const signatureValue = rsaSha1Sign(canonicalSignedInfo, certificate.privateKey);
  
  // Step 6: Get certificate as Base64
  const certBase64 = getCertificateBase64(certificate.cert);
  
  // Step 7: Build complete Signature element
  const signatureElement = buildSignatureElement(signedInfo, signatureValue, certBase64);
  
  // Step 8: Insert signature into original XML
  if (insertBeforeTag) {
    return insertSignature(xml, signatureElement, insertBeforeTag);
  }
  
  // Default: Find the root element and insert before its closing tag
  const rootMatch = xml.match(/<([a-zA-Z_][\w\-.:]*)/);
  if (!rootMatch) {
    throw new Error('Could not find root element in XML');
  }
  
  return insertSignature(xml, signatureElement, rootMatch[1]);
}

/**
 * Sign XML for NFSe Paulistana specifically
 * 
 * This is a convenience wrapper that handles the specific requirements
 * of the São Paulo municipal invoice system.
 * 
 * @param xml - The NFSe request XML
 * @param certificate - Certificate and private key  
 * @param tagToSign - The tag name to insert signature before (e.g., 'PedidoConsultaNFe')
 * @returns Signed XML document
 */
export function signNFSeXml(
  xml: string,
  certificate: CertificateData,
  tagToSign: string
): string {
  // Remove XML declaration if present (will be added back by the envelope)
  let cleanXml = xml.replace(/<\?xml[^?]*\?>\s*/gi, '');
  
  // Normalize whitespace within tags (but preserve text content)
  cleanXml = cleanXml.trim();
  
  return signXml(cleanXml, certificate, {
    referenceUri: '',
    insertBeforeTag: tagToSign
  });
}

/**
 * Re-export canonicalize for use in debugging
 */
export { canonicalize, applyTransforms } from './c14n';




