// PDF Design System - Baseado no design do CentroOS
// Cores em RGB para jsPDF

export const PDF_COLORS = {
  // Primary - Azul Sereno
  primary: [37, 99, 235] as [number, number, number],        // #2563eb
  primaryLight: [219, 234, 254] as [number, number, number], // #dbeafe
  primaryDark: [30, 64, 175] as [number, number, number],    // #1e40af

  // Accent - Violeta Transmutação
  accent: [124, 58, 237] as [number, number, number],        // #7c3aed
  accentLight: [237, 233, 254] as [number, number, number],  // #ede9fe
  accentDark: [91, 33, 182] as [number, number, number],     // #5b21b6

  // Success - Verde Esperança
  success: [22, 163, 74] as [number, number, number],        // #16a34a
  successLight: [220, 252, 231] as [number, number, number], // #dcfce7
  successDark: [21, 128, 61] as [number, number, number],    // #15803d

  // Danger - Vermelho
  danger: [220, 38, 38] as [number, number, number],         // #dc2626
  dangerLight: [254, 226, 226] as [number, number, number],  // #fee2e2
  dangerDark: [153, 27, 27] as [number, number, number],     // #991b1b

  // Warning - Laranja/Amarelo
  warning: [234, 179, 8] as [number, number, number],        // #eab308
  warningLight: [254, 249, 195] as [number, number, number], // #fef9c3

  // Gold - Dourado Espiritual
  gold: [202, 138, 4] as [number, number, number],           // #ca8a04
  goldLight: [254, 243, 199] as [number, number, number],    // #fef3c7

  // Neutrals
  white: [255, 255, 255] as [number, number, number],
  black: [0, 0, 0] as [number, number, number],
  textPrimary: [31, 41, 55] as [number, number, number],     // #1f2937
  textSecondary: [107, 114, 128] as [number, number, number],// #6b7280
  textMuted: [156, 163, 175] as [number, number, number],    // #9ca3af
  border: [229, 231, 235] as [number, number, number],       // #e5e7eb
  borderLight: [243, 244, 246] as [number, number, number],  // #f3f4f6
  background: [249, 250, 251] as [number, number, number],   // #f9fafb
  backgroundAlt: [243, 244, 246] as [number, number, number],// #f3f4f6
} as const;

export const PDF_TYPOGRAPHY = {
  // Tamanhos de fonte
  title: 24,
  subtitle: 16,
  sectionTitle: 14,
  body: 10,
  small: 9,
  caption: 8,
  micro: 7,

  // Line heights (multiplicador)
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

export const PDF_LAYOUT = {
  // Dimensões A4 em mm
  pageWidth: 210,
  pageHeight: 297,

  // Margens
  margin: {
    top: 20,
    right: 15,
    bottom: 25,
    left: 15,
  },

  // Área útil
  get contentWidth() {
    return this.pageWidth - this.margin.left - this.margin.right;
  },

  get contentHeight() {
    return this.pageHeight - this.margin.top - this.margin.bottom;
  },

  // Espaçamentos
  spacing: {
    xs: 2,
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    xxl: 24,
  },

  // KPI Cards
  kpiCard: {
    width: 85,
    height: 45,
    gap: 10,
  },

  // Rodapé
  footer: {
    height: 15,
    y: 282,
  },

  // Cabeçalho de página (não capa)
  header: {
    height: 12,
  },
} as const;

// Estilos base para tabelas jsPDF-autotable
export const PDF_TABLE_STYLES = {
  base: {
    theme: 'grid' as const,
    styles: {
      fontSize: PDF_TYPOGRAPHY.small,
      cellPadding: 4,
      lineColor: PDF_COLORS.border,
      lineWidth: 0.3,
      textColor: PDF_COLORS.textPrimary,
      font: 'helvetica',
    },
    headStyles: {
      fillColor: PDF_COLORS.backgroundAlt,
      textColor: PDF_COLORS.textPrimary,
      fontStyle: 'bold' as const,
      halign: 'left' as const,
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250] as [number, number, number],
    },
    margin: { 
      left: PDF_LAYOUT.margin.left, 
      right: PDF_LAYOUT.margin.right 
    },
    showHead: 'everyPage' as const,
  },

  // Estilo para tabelas de receita
  revenue: {
    headStyles: {
      fillColor: PDF_COLORS.successLight,
      textColor: PDF_COLORS.successDark,
    },
    footStyles: {
      fillColor: PDF_COLORS.successLight,
      textColor: PDF_COLORS.successDark,
      fontStyle: 'bold' as const,
    },
  },

  // Estilo para tabelas de despesa
  expense: {
    headStyles: {
      fillColor: PDF_COLORS.dangerLight,
      textColor: PDF_COLORS.dangerDark,
    },
    footStyles: {
      fillColor: PDF_COLORS.dangerLight,
      textColor: PDF_COLORS.dangerDark,
      fontStyle: 'bold' as const,
    },
  },

  // Estilo neutro
  neutral: {
    headStyles: {
      fillColor: PDF_COLORS.primaryLight,
      textColor: PDF_COLORS.primaryDark,
    },
  },
} as const;

// Helpers de formatação
export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('pt-BR', { 
    style: 'currency', 
    currency: 'BRL' 
  }).format(cents / 100);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('pt-BR');
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('pt-BR');
}

export function formatPeriodLong(month: number, year: number): string {
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  return `${months[month - 1]} de ${year}`;
}

export function formatPeriodShort(month: number, year: number): string {
  return `${String(month).padStart(2, '0')}/${year}`;
}

// Gera hash curto para identificação do documento
export function generateDocumentHash(periodId: number, timestamp: Date): string {
  const base = `${periodId}-${timestamp.getTime()}`;
  let hash = 0;
  for (let i = 0; i < base.length; i++) {
    const char = base.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36).toUpperCase().slice(0, 6);
}

