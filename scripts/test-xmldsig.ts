/**
 * XMLDSig Test Suite
 * 
 * Comprehensive tests for the proprietary XMLDSig implementation.
 * Run with: npx tsx scripts/test-xmldsig.ts
 */

import crypto from 'crypto';
import forge from 'node-forge';
import {
  canonicalize,
  removeSignatureElement,
  applyTransforms,
  signXml,
  signNFSeXml,
  validateSignature,
  hasSignature,
  buildRPSSignatureString,
  signRPS,
  formatDateForRPS,
  type CertificateData,
  type RPSData
} from '../server/integrations/fiscal/xmldsig';

// Test results tracking
let passed = 0;
let failed = 0;
const failures: string[] = [];

function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`✅ ${name}`);
  } catch (error: any) {
    failed++;
    failures.push(`${name}: ${error.message}`);
    console.log(`❌ ${name}`);
    console.log(`   Error: ${error.message}`);
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEqual(actual: any, expected: any, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}\n   Expected: ${expected}\n   Actual: ${actual}`);
  }
}

/**
 * Generate a test certificate for signing
 */
function generateTestCertificate(): CertificateData {
  // Generate key pair
  const keys = forge.pki.rsa.generateKeyPair(2048);
  
  // Create certificate
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = '01';
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);
  
  const attrs = [{
    name: 'commonName',
    value: 'Test Certificate for XMLDSig'
  }, {
    name: 'countryName',
    value: 'BR'
  }, {
    shortName: 'ST',
    value: 'São Paulo'
  }, {
    name: 'organizationName',
    value: 'Test Organization'
  }];
  
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  
  // Self-sign
  cert.sign(keys.privateKey, forge.md.sha256.create());
  
  return {
    cert,
    privateKey: keys.privateKey
  };
}

// ==================== C14N Tests ====================

console.log('\n📋 C14N (Canonicalization) Tests\n');

test('C14N: Remove XML declaration', () => {
  const xml = '<?xml version="1.0" encoding="UTF-8"?><root><child>value</child></root>';
  const canonical = canonicalize(xml);
  assert(!canonical.includes('<?xml'), 'XML declaration should be removed');
  assert(canonical.includes('<root>'), 'Root element should be present');
});

test('C14N: Normalize whitespace between elements', () => {
  const xml = `<root>
    <child>value</child>
  </root>`;
  const canonical = canonicalize(xml);
  // Text nodes with whitespace are preserved in C14N
  assert(canonical.includes('<root>'), 'Root should be present');
  assert(canonical.includes('<child>value</child>'), 'Child should be present');
});

test('C14N: Sort attributes lexicographically', () => {
  const xml = '<root zebra="z" alpha="a" beta="b">content</root>';
  const canonical = canonicalize(xml);
  // Check that alpha comes before beta comes before zebra
  const alphaPos = canonical.indexOf('alpha=');
  const betaPos = canonical.indexOf('beta=');
  const zebraPos = canonical.indexOf('zebra=');
  assert(alphaPos < betaPos, 'alpha should come before beta');
  assert(betaPos < zebraPos, 'beta should come before zebra');
});

test('C14N: Handle namespace declarations', () => {
  const xml = '<root xmlns="http://example.com"><child/></root>';
  const canonical = canonicalize(xml);
  assert(canonical.includes('xmlns="http://example.com"'), 'Namespace should be preserved');
});

test('C14N: Normalize attribute values (escape special chars)', () => {
  const xml = '<root attr="value with &amp; and &lt;special&gt;">content</root>';
  const canonical = canonicalize(xml);
  assert(canonical.includes('&amp;'), 'Ampersand should be escaped');
  assert(canonical.includes('&lt;'), 'Less-than should be escaped');
});

test('removeSignatureElement: Remove Signature from XML', () => {
  const xml = '<root><data>value</data><Signature xmlns="http://www.w3.org/2000/09/xmldsig#"><SignedInfo/></Signature></root>';
  const clean = removeSignatureElement(xml);
  assert(!clean.includes('<Signature'), 'Signature should be removed');
  assert(clean.includes('<data>value</data>'), 'Data should be preserved');
});

// ==================== XMLDSig Tests ====================

console.log('\n📋 XMLDSig Signing Tests\n');

const testCert = generateTestCertificate();

test('signXml: Creates valid signature structure', () => {
  const xml = '<PedidoConsulta xmlns="http://example.com"><Data>test</Data></PedidoConsulta>';
  const signed = signXml(xml, testCert, { insertBeforeTag: 'PedidoConsulta' });
  
  assert(signed.includes('<Signature xmlns="http://www.w3.org/2000/09/xmldsig#">'), 'Should have Signature element');
  assert(signed.includes('<SignedInfo'), 'Should have SignedInfo');
  assert(signed.includes('<SignatureValue>'), 'Should have SignatureValue');
  assert(signed.includes('<X509Certificate>'), 'Should have certificate');
  assert(signed.includes('<DigestValue>'), 'Should have DigestValue');
});

test('signXml: Signature is inserted before closing tag', () => {
  const xml = '<Root><Child>data</Child></Root>';
  const signed = signXml(xml, testCert, { insertBeforeTag: 'Root' });
  
  const signaturePos = signed.indexOf('<Signature');
  const closingPos = signed.indexOf('</Root>');
  assert(signaturePos < closingPos, 'Signature should be before closing tag');
  assert(signaturePos > 0, 'Signature should be present');
});

test('signXml: DigestValue is Base64 encoded SHA-1', () => {
  const xml = '<Root><Data>test data</Data></Root>';
  const signed = signXml(xml, testCert);
  
  const digestMatch = signed.match(/<DigestValue>([^<]+)<\/DigestValue>/);
  assert(digestMatch !== null, 'DigestValue should be present');
  
  // Check it's valid Base64
  const digestValue = digestMatch![1];
  const decoded = Buffer.from(digestValue, 'base64');
  assertEqual(decoded.length, 20, 'SHA-1 digest should be 20 bytes');
});

test('signNFSeXml: Works with NFSe format', () => {
  const xml = '<PedidoConsultaNFe xmlns="http://www.prefeitura.sp.gov.br/nfe"><Cabecalho/><Detalhe/></PedidoConsultaNFe>';
  const signed = signNFSeXml(xml, testCert, 'PedidoConsultaNFe');
  
  assert(signed.includes('<Signature'), 'Should have signature');
  assert(!signed.includes('<?xml'), 'XML declaration should be removed');
});

// ==================== Signature Validation Tests ====================

console.log('\n📋 Signature Validation Tests\n');

test('validateSignature: Validates correctly signed XML', () => {
  const xml = '<Root xmlns="http://test.com"><Data>test</Data></Root>';
  const signed = signXml(xml, testCert);
  
  const result = validateSignature(signed);
  
  assert(result.details.digestValid === true, 'Digest should be valid');
  assert(result.details.signatureValid === true, 'Signature should be valid');
  assert(result.details.certificateValid === true, 'Certificate should be valid');
  assert(result.valid === true, 'Overall validation should pass');
});

test('hasSignature: Detects signature presence', () => {
  const withSig = '<Root><Signature xmlns="http://www.w3.org/2000/09/xmldsig#"><SignedInfo/></Signature></Root>';
  const withoutSig = '<Root><Data>test</Data></Root>';
  
  assert(hasSignature(withSig), 'Should detect signature');
  assert(!hasSignature(withoutSig), 'Should not detect signature');
});

// ==================== RPS Signature Tests ====================

console.log('\n📋 RPS Signature Tests\n');

test('buildRPSSignatureString: Creates correct 86-char string', () => {
  const rps: RPSData = {
    inscricaoMunicipal: '12345678',
    serieRPS: 'A',
    numeroRPS: '1',
    dataEmissao: '20240115',
    tributacao: 'T',
    situacao: 'N',
    issRetido: 'N',
    valorServicos: 100.00,
    valorDeducoes: 0,
    codigoServico: '01001',
    cpfCnpjTomador: '12345678000199'
  };
  
  const str = buildRPSSignatureString(rps);
  assertEqual(str.length, 86, 'RPS string should be 86 characters');
});

test('buildRPSSignatureString: Pads values correctly', () => {
  const rps: RPSData = {
    inscricaoMunicipal: '123',
    serieRPS: 'A',
    numeroRPS: '1',
    dataEmissao: '20240115',
    tributacao: 'T',
    situacao: 'N',
    issRetido: 'N',
    valorServicos: 100.00,
    valorDeducoes: 0,
    codigoServico: '1001',
    cpfCnpjTomador: '12345678901' // CPF
  };
  
  const str = buildRPSSignatureString(rps);
  
  // Inscrição Municipal should be left-padded to 8 chars
  assert(str.startsWith('00000123'), 'Inscricao should be left-padded');
  
  // Serie RPS should be right-padded to 5 chars
  assert(str.substring(8, 13) === 'A    ', 'Serie should be right-padded');
});

test('formatDateForRPS: Converts date to AAAAMMDD', () => {
  // Use UTC date to avoid timezone issues
  const date = new Date(2024, 0, 15); // January 15, 2024 local time
  const formatted = formatDateForRPS(date);
  assertEqual(formatted, '20240115', 'Date should be AAAAMMDD format');
});

test('signRPS: Creates Base64 signature', () => {
  const rps: RPSData = {
    inscricaoMunicipal: '12345678',
    serieRPS: 'A',
    numeroRPS: '1',
    dataEmissao: '20240115',
    tributacao: 'T',
    situacao: 'N',
    issRetido: 'N',
    valorServicos: 100.00,
    valorDeducoes: 0,
    codigoServico: '01001',
    cpfCnpjTomador: '12345678000199'
  };
  
  const signature = signRPS(rps, testCert.privateKey);
  
  // Check it's valid Base64
  const decoded = Buffer.from(signature, 'base64');
  assert(decoded.length > 0, 'Signature should decode from Base64');
  
  // RSA-2048 signature is 256 bytes
  assertEqual(decoded.length, 256, 'RSA-2048 signature should be 256 bytes');
});

// ==================== Integration Tests ====================

console.log('\n📋 Integration Tests\n');

test('Full flow: Sign and validate NFSe request', () => {
  const nfseRequest = `<PedidoConsultaNFePeriodo xmlns="http://www.prefeitura.sp.gov.br/nfe"><Cabecalho xmlns="" Versao="1"><CPFCNPJRemetente><CNPJ>12345678000199</CNPJ></CPFCNPJRemetente></Cabecalho><Detalhe><Periodo><DataInicio>2024-01-01</DataInicio><DataFim>2024-01-31</DataFim></Periodo></Detalhe></PedidoConsultaNFePeriodo>`;
  
  const signed = signNFSeXml(nfseRequest, testCert, 'PedidoConsultaNFePeriodo');
  const validation = validateSignature(signed);
  
  assert(validation.valid, `Signature should be valid: ${validation.errors.join(', ')}`);
});

test('Tamper detection: Modified XML fails validation', () => {
  const xml = '<Root><Data>original</Data></Root>';
  let signed = signXml(xml, testCert);
  
  // Tamper with the content
  signed = signed.replace('original', 'modified');
  
  const validation = validateSignature(signed);
  
  assert(!validation.details.digestValid, 'Digest should be invalid after tampering');
  assert(!validation.valid, 'Validation should fail after tampering');
});

// ==================== Summary ====================

console.log('\n' + '='.repeat(50));
console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  console.log('\n❌ Failures:');
  failures.forEach(f => console.log(`   - ${f}`));
  process.exit(1);
} else {
  console.log('\n✅ All tests passed!');
  process.exit(0);
}

