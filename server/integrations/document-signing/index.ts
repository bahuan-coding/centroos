/**
 * Document Signing Module
 * Módulo de assinatura digital de documentos com certificado ICP-Brasil
 */

export * from './types';
export {
  signPdfDocument,
  verifySignedPdf,
  createSimplePdf,
  addDigitalSignatureWatermark,
} from './pdf-signer';



