/**
 * PDF Document Signer
 * Assina documentos PDF digitalmente usando certificado ICP-Brasil (e-CNPJ A1)
 * 
 * Utiliza node-signpdf para assinatura compatível com ICP-Brasil
 */

import crypto from 'crypto';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { P12Signer } from '@signpdf/signer-p12';
import { plainAddPlaceholder } from '@signpdf/placeholder-plain';
import { SignPdf } from '@signpdf/signpdf';
import { loadActiveCertificate } from '../fiscal/certificates';
import type {
  DocumentToSign,
  SignedDocumentResult,
  SignatureMetadata,
  SigningOptions,
  SignatureValidationResult,
} from './types';

/**
 * Calcula hash SHA-256 de um buffer
 */
function calculateHash(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Adiciona placeholder de assinatura ao PDF
 */
async function addSignaturePlaceholder(
  pdfBuffer: Buffer,
  options: SigningOptions
): Promise<Buffer> {
  // Carregar PDF com pdf-lib para adicionar informações visuais
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const pages = pdfDoc.getPages();
  
  // Adicionar informação visual da assinatura se configurado
  if (options.visualSignature) {
    const { page: pageNum, x, y, width, height } = options.visualSignature;
    const page = pages[Math.min(pageNum - 1, pages.length - 1)];
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    
    // Desenhar caixa de assinatura
    page.drawRectangle({
      x,
      y,
      width,
      height,
      borderColor: rgb(0.2, 0.4, 0.6),
      borderWidth: 1,
    });
    
    // Texto da assinatura
    const fontSize = 8;
    page.drawText('Documento assinado digitalmente', {
      x: x + 5,
      y: y + height - 15,
      size: fontSize,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });
    
    page.drawText(`Razão: ${options.reason}`, {
      x: x + 5,
      y: y + height - 28,
      size: fontSize - 1,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });
    
    if (options.location) {
      page.drawText(`Local: ${options.location}`, {
        x: x + 5,
        y: y + height - 40,
        size: fontSize - 1,
        font,
        color: rgb(0.4, 0.4, 0.4),
      });
    }
    
    const dateStr = new Date().toLocaleString('pt-BR');
    page.drawText(`Data: ${dateStr}`, {
      x: x + 5,
      y: y + height - 52,
      size: fontSize - 1,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });
  }
  
  // Salvar PDF modificado
  const modifiedPdf = await pdfDoc.save();
  
  // Adicionar placeholder de assinatura digital
  const pdfWithPlaceholder = plainAddPlaceholder({
    pdfBuffer: Buffer.from(modifiedPdf),
    reason: options.reason,
    location: options.location || 'Brasil',
    name: 'Assinatura Digital ICP-Brasil',
    contactInfo: 'Sistema CentrOS',
  });
  
  return pdfWithPlaceholder;
}

/**
 * Assina um documento PDF com certificado digital ICP-Brasil
 */
export async function signPdfDocument(
  document: DocumentToSign,
  options: SigningOptions
): Promise<SignedDocumentResult> {
  // Carregar certificado ativo
  const cert = await loadActiveCertificate();
  if (!cert) {
    throw new Error('Nenhum certificado digital ativo encontrado. Configure em Configurações > Certificado Digital.');
  }
  
  if (!cert.info.isValid) {
    throw new Error(`Certificado expirado em ${cert.info.validadeFim}`);
  }
  
  // Converter content para Buffer se necessário
  const pdfBuffer = Buffer.isBuffer(document.content)
    ? document.content
    : Buffer.from(document.content, 'base64');
  
  // Calcular hash do documento original
  const originalHash = calculateHash(pdfBuffer);
  
  // Adicionar placeholder de assinatura
  const pdfWithPlaceholder = await addSignaturePlaceholder(pdfBuffer, options);
  
  // Criar signer com certificado P12/PFX
  const signer = new P12Signer(cert.pfxBuffer, { passphrase: cert.password });
  
  // Assinar o PDF
  const signedPdf = await new SignPdf().sign(pdfWithPlaceholder, signer);
  
  // Calcular hash do documento assinado
  const signedHash = calculateHash(signedPdf);
  
  // Preparar metadados
  const metadata: SignatureMetadata = {
    reason: options.reason,
    location: options.location,
    contactInfo: document.metadata?.contactInfo,
    signedAt: new Date().toISOString(),
  };
  
  return {
    signedPdf,
    originalHash,
    signedHash,
    metadata,
    certificate: {
      cnpj: cert.info.cnpj,
      razaoSocial: cert.info.razaoSocial,
      emissor: cert.info.emissor,
      validadeFim: cert.info.validadeFim,
    },
  };
}

/**
 * Verifica informações básicas de um PDF assinado
 * Nota: Validação completa requer bibliotecas adicionais
 */
export async function verifySignedPdf(
  pdfBuffer: Buffer
): Promise<SignatureValidationResult> {
  try {
    // Carregar PDF
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    
    // Verificar se contém assinatura (busca básica)
    const pdfString = pdfBuffer.toString('binary');
    const hasSignature = pdfString.includes('/Type /Sig') || 
                         pdfString.includes('/SubFilter /adbe.pkcs7.detached');
    
    if (!hasSignature) {
      return {
        isValid: false,
        message: 'Documento não contém assinatura digital',
        errors: ['Nenhuma assinatura encontrada no PDF'],
      };
    }
    
    // Extrair informações básicas da assinatura
    const signatureMatch = pdfString.match(/\/Reason\s*\(([^)]+)\)/);
    const locationMatch = pdfString.match(/\/Location\s*\(([^)]+)\)/);
    const nameMatch = pdfString.match(/\/Name\s*\(([^)]+)\)/);
    
    return {
      isValid: true,
      message: 'Documento contém assinatura digital',
      signer: {
        name: nameMatch ? nameMatch[1] : 'Desconhecido',
        signedAt: new Date(), // Seria extraído da assinatura real
      },
    };
  } catch (error: any) {
    return {
      isValid: false,
      message: 'Erro ao verificar assinatura',
      errors: [error.message],
    };
  }
}

/**
 * Cria um PDF simples para assinatura (útil para testes)
 */
export async function createSimplePdf(
  title: string,
  content: string,
  footer?: string
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  const { width, height } = page.getSize();
  const margin = 50;
  
  // Título
  page.drawText(title, {
    x: margin,
    y: height - margin - 30,
    size: 18,
    font: boldFont,
    color: rgb(0.1, 0.1, 0.1),
  });
  
  // Linha sob título
  page.drawLine({
    start: { x: margin, y: height - margin - 40 },
    end: { x: width - margin, y: height - margin - 40 },
    thickness: 1,
    color: rgb(0.3, 0.3, 0.3),
  });
  
  // Conteúdo
  const lines = content.split('\n');
  let y = height - margin - 70;
  
  for (const line of lines) {
    if (y < margin + 50) break;
    
    page.drawText(line, {
      x: margin,
      y,
      size: 11,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });
    y -= 16;
  }
  
  // Footer
  if (footer) {
    page.drawText(footer, {
      x: margin,
      y: margin,
      size: 8,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });
  }
  
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

/**
 * Adiciona marca d'água "ASSINADO DIGITALMENTE" ao PDF
 */
export async function addDigitalSignatureWatermark(
  pdfBuffer: Buffer
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const pages = pdfDoc.getPages();
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  for (const page of pages) {
    const { width, height } = page.getSize();
    
    // Desenhar texto rotacionado como marca d'água
    page.drawText('ASSINADO DIGITALMENTE', {
      x: width / 2 - 100,
      y: height / 2,
      size: 24,
      font,
      color: rgb(0.9, 0.9, 0.9),
      opacity: 0.3,
      // Nota: rotação requer versão específica do pdf-lib
    });
  }
  
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

