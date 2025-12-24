/**
 * Gerador de Recibos de Doação
 * 
 * Gera PDFs de recibos de doação para comprovação junto à Receita Federal (IRPF)
 * Conforme ITG 2002 (R1) e legislação aplicável a entidades sem fins lucrativos
 */

import crypto from 'crypto';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { signPdfDocument } from '../../integrations/document-signing';
import type {
  DadosDoador,
  DadosDoacao,
  DadosEntidade,
  ReciboDoacao,
  GerarReciboOptions,
} from './types';

// Cores do tema
const COLORS = {
  primary: [37, 99, 235] as [number, number, number], // blue-600
  secondary: [100, 116, 139] as [number, number, number], // slate-500
  text: [30, 41, 59] as [number, number, number], // slate-800
  muted: [148, 163, 184] as [number, number, number], // slate-400
  success: [22, 163, 74] as [number, number, number], // green-600
  border: [226, 232, 240] as [number, number, number], // slate-200
};

/**
 * Formata valor em Reais
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Formata data para exibição
 */
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

/**
 * Converte número para extenso (básico)
 */
function valorPorExtenso(valor: number): string {
  const unidades = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
  const dezenas = ['', 'dez', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
  const centenas = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];
  
  const parteInteira = Math.floor(valor);
  const centavos = Math.round((valor - parteInteira) * 100);
  
  if (parteInteira === 0 && centavos === 0) return 'zero reais';
  
  let extenso = '';
  
  // Simplificado para valores até 999.999
  if (parteInteira > 0) {
    if (parteInteira >= 1000) {
      const milhares = Math.floor(parteInteira / 1000);
      if (milhares === 1) {
        extenso += 'mil';
      } else {
        extenso += unidades[milhares] + ' mil';
      }
    }
    
    const resto = parteInteira % 1000;
    if (resto > 0) {
      if (parteInteira >= 1000) extenso += ' ';
      
      const c = Math.floor(resto / 100);
      const d = Math.floor((resto % 100) / 10);
      const u = resto % 10;
      
      if (c > 0) {
        if (resto === 100) {
          extenso += 'cem';
        } else {
          extenso += centenas[c];
        }
      }
      
      if (d > 0 || u > 0) {
        if (c > 0) extenso += ' e ';
        if (d === 1 && u > 0) {
          const especiais = ['onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
          extenso += especiais[u - 1];
        } else {
          if (d > 0) extenso += dezenas[d];
          if (u > 0) {
            if (d > 0) extenso += ' e ';
            extenso += unidades[u];
          }
        }
      }
    }
    
    extenso += parteInteira === 1 ? ' real' : ' reais';
  }
  
  if (centavos > 0) {
    if (parteInteira > 0) extenso += ' e ';
    if (centavos < 10) {
      extenso += unidades[centavos];
    } else {
      const dc = Math.floor(centavos / 10);
      const uc = centavos % 10;
      extenso += dezenas[dc];
      if (uc > 0) extenso += ' e ' + unidades[uc];
    }
    extenso += centavos === 1 ? ' centavo' : ' centavos';
  }
  
  return extenso;
}

/**
 * Formata CPF ou CNPJ para exibição
 */
function formatDocumento(doc: string, tipo: 'cpf' | 'cnpj'): string {
  const digits = doc.replace(/\D/g, '');
  
  if (tipo === 'cpf' && digits.length === 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  
  if (tipo === 'cnpj' && digits.length === 14) {
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  
  return doc;
}

/**
 * Gera o PDF do recibo de doação
 */
async function gerarPdfRecibo(
  doador: DadosDoador,
  doacao: DadosDoacao,
  entidade: DadosEntidade,
  options: GerarReciboOptions = {}
): Promise<Buffer> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  let y = margin;

  // ============= CABEÇALHO =============
  
  // Nome da entidade
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...COLORS.primary);
  doc.text(entidade.razaoSocial.toUpperCase(), pageWidth / 2, y, { align: 'center' });
  y += 7;

  // Qualificação (se houver)
  if (entidade.qualificacao) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.secondary);
    doc.text(entidade.qualificacao, pageWidth / 2, y, { align: 'center' });
    y += 5;
  }

  // CNPJ
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.text);
  doc.text(`CNPJ: ${formatDocumento(entidade.cnpj, 'cnpj')}`, pageWidth / 2, y, { align: 'center' });
  y += 5;

  // Endereço
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.secondary);
  doc.text(`${entidade.endereco} - ${entidade.cidadeUf}`, pageWidth / 2, y, { align: 'center' });
  y += 5;

  // Contatos
  const contatos = [entidade.telefone, entidade.email, entidade.site].filter(Boolean).join(' • ');
  if (contatos) {
    doc.text(contatos, pageWidth / 2, y, { align: 'center' });
    y += 5;
  }

  y += 3;

  // Linha separadora
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // ============= TÍTULO DO RECIBO =============
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...COLORS.text);
  doc.text('RECIBO DE DOAÇÃO', pageWidth / 2, y, { align: 'center' });
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.secondary);
  doc.text(`Nº ${doacao.numeroRecibo}`, pageWidth / 2, y, { align: 'center' });
  y += 12;

  // ============= CORPO DO RECIBO =============
  
  // Box do valor
  doc.setFillColor(240, 249, 255); // blue-50
  doc.setDrawColor(...COLORS.primary);
  doc.roundedRect(margin, y, contentWidth, 25, 3, 3, 'FD');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...COLORS.primary);
  doc.text(formatCurrency(doacao.valor), pageWidth / 2, y + 12, { align: 'center' });
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.secondary);
  const extenso = `(${valorPorExtenso(doacao.valor)})`;
  doc.text(extenso, pageWidth / 2, y + 20, { align: 'center' });
  y += 35;

  // Texto principal
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.text);

  const textoRecibo = [
    `Recebemos de ${doador.nome.toUpperCase()}, `,
    `inscrito(a) no ${doador.tipoDocumento.toUpperCase()} sob o nº ${formatDocumento(doador.documento, doador.tipoDocumento)}, `,
    `a importância de ${formatCurrency(doacao.valor)} (${valorPorExtenso(doacao.valor)}), `,
    `referente à doação efetuada em ${formatDate(doacao.dataDoacao)}, `,
    `através de ${traduzirFormaPagamento(doacao.formaPagamento)}.`,
  ].join('');

  const lines = doc.splitTextToSize(textoRecibo, contentWidth);
  doc.text(lines, margin, y);
  y += lines.length * 6 + 5;

  // Descrição/finalidade (se houver)
  if (doacao.descricao) {
    y += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Finalidade:', margin, y);
    doc.setFont('helvetica', 'normal');
    const descLines = doc.splitTextToSize(doacao.descricao, contentWidth - 25);
    doc.text(descLines, margin + 25, y);
    y += descLines.length * 5 + 5;
  }

  // Declaração de regularidade
  y += 10;
  doc.setFillColor(240, 253, 244); // green-50
  doc.setDrawColor(...COLORS.success);
  doc.roundedRect(margin, y, contentWidth, 20, 2, 2, 'FD');
  
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.success);
  const declaracao = 'Declaramos que a doação foi recebida e será aplicada integralmente nas finalidades sociais da entidade, conforme previsto em seu estatuto.';
  const declLines = doc.splitTextToSize(declaracao, contentWidth - 10);
  doc.text(declLines, margin + 5, y + 8);
  y += 30;

  // ============= DADOS DO DOADOR =============
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.text);
  doc.text('DADOS DO DOADOR', margin, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Nome: ${doador.nome}`, margin, y);
  y += 5;
  doc.text(`${doador.tipoDocumento.toUpperCase()}: ${formatDocumento(doador.documento, doador.tipoDocumento)}`, margin, y);
  y += 5;

  if (doador.endereco) {
    const end = doador.endereco;
    doc.text(`Endereço: ${end.logradouro}, ${end.numero}${end.complemento ? `, ${end.complemento}` : ''} - ${end.bairro}`, margin, y);
    y += 5;
    doc.text(`${end.cidade}/${end.uf} - CEP: ${end.cep}`, margin, y);
    y += 5;
  }

  if (doador.email) {
    doc.text(`E-mail: ${doador.email}`, margin, y);
    y += 5;
  }

  y += 15;

  // ============= ASSINATURA =============
  
  // Linha para assinatura
  const assinaturaY = y + 20;
  doc.setDrawColor(...COLORS.muted);
  doc.line(margin + 30, assinaturaY, pageWidth - margin - 30, assinaturaY);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.text);
  doc.text('Assinatura do Responsável', pageWidth / 2, assinaturaY + 6, { align: 'center' });

  // ============= RODAPÉ =============
  
  const footerY = 280;
  
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.3);
  doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.muted);

  // Data e local
  doc.text(`${entidade.cidadeUf}, ${formatDate(new Date())}`, margin, footerY);

  // Texto legal
  const textoLegal = options.textoRodape || 
    'Este recibo é válido para fins de comprovação de doação conforme art. 27 da Lei 9.250/95.';
  doc.text(textoLegal, pageWidth / 2, footerY + 5, { align: 'center' });

  // Referência interna
  if (doacao.referenciaInterna) {
    doc.setFontSize(7);
    doc.text(`Ref: ${doacao.referenciaInterna}`, pageWidth - margin, footerY, { align: 'right' });
  }

  return Buffer.from(doc.output('arraybuffer'));
}

/**
 * Traduz forma de pagamento para texto
 */
function traduzirFormaPagamento(forma: string): string {
  const traducoes: Record<string, string> = {
    dinheiro: 'dinheiro',
    pix: 'transferência PIX',
    transferencia: 'transferência bancária',
    cheque: 'cheque',
    cartao: 'cartão',
    outros: 'outro meio',
  };
  return traducoes[forma] || forma;
}

/**
 * Gera recibo de doação completo
 */
export async function gerarReciboDoacao(
  doador: DadosDoador,
  doacao: DadosDoacao,
  entidade: DadosEntidade,
  options: GerarReciboOptions = {}
): Promise<ReciboDoacao> {
  const id = crypto.randomUUID();
  
  // Gerar PDF
  let pdfBuffer = await gerarPdfRecibo(doador, doacao, entidade, options);
  let assinadoDigitalmente = false;
  let hashDocumento: string | undefined;
  
  // Assinar digitalmente se solicitado
  if (options.assinarDigitalmente) {
    try {
      const resultado = await signPdfDocument(
        {
          content: pdfBuffer,
          filename: `recibo-doacao-${doacao.numeroRecibo}.pdf`,
          documentType: 'recibo_doacao',
        },
        {
          reason: `Recibo de doação nº ${doacao.numeroRecibo}`,
          location: entidade.cidadeUf,
        }
      );
      
      pdfBuffer = resultado.signedPdf;
      assinadoDigitalmente = true;
      hashDocumento = resultado.signedHash;
    } catch (error) {
      console.warn('Não foi possível assinar o recibo digitalmente:', error);
      // Continua sem assinatura
    }
  }
  
  return {
    id,
    doador,
    doacao,
    entidade,
    pdfBase64: pdfBuffer.toString('base64'),
    assinadoDigitalmente,
    hashDocumento,
    geradoEm: new Date(),
  };
}

/**
 * Gera próximo número de recibo
 */
export function gerarNumeroRecibo(ano?: number): string {
  const anoAtual = ano || new Date().getFullYear();
  const sequencial = Math.floor(Math.random() * 999999).toString().padStart(6, '0');
  return `${anoAtual}/${sequencial}`;
}

