/**
 * Document Signing Types
 * Tipos para assinatura digital de documentos com certificado ICP-Brasil
 */

export interface SignatureMetadata {
  /** Razão da assinatura */
  reason: string;
  /** Local da assinatura */
  location?: string;
  /** Nome de contato */
  contactInfo?: string;
  /** Data da assinatura (ISO string) */
  signedAt: string;
}

export interface SignedDocumentResult {
  /** Documento assinado (Buffer) */
  signedPdf: Buffer;
  /** Hash SHA-256 do documento original */
  originalHash: string;
  /** Hash SHA-256 do documento assinado */
  signedHash: string;
  /** Metadados da assinatura */
  metadata: SignatureMetadata;
  /** Informações do certificado usado */
  certificate: {
    cnpj: string;
    razaoSocial: string;
    emissor: string;
    validadeFim: string;
  };
}

export interface DocumentToSign {
  /** Conteúdo do documento (Buffer ou base64) */
  content: Buffer | string;
  /** Nome do arquivo original */
  filename: string;
  /** Tipo do documento */
  documentType: 'recibo_doacao' | 'contrato' | 'declaracao' | 'ata' | 'outros';
  /** Metadados opcionais */
  metadata?: Partial<SignatureMetadata>;
}

export interface SignatureValidationResult {
  /** Se a assinatura é válida */
  isValid: boolean;
  /** Mensagem de validação */
  message: string;
  /** Informações do signatário */
  signer?: {
    name: string;
    cnpj?: string;
    signedAt?: Date;
  };
  /** Erros encontrados */
  errors?: string[];
}

export interface SigningOptions {
  /** Posição visual da assinatura no PDF (página, x, y) */
  visualSignature?: {
    page: number;
    x: number;
    y: number;
    width: number;
    height: number;
  };
  /** Adicionar timestamp */
  addTimestamp?: boolean;
  /** Razão da assinatura */
  reason: string;
  /** Local */
  location?: string;
}


