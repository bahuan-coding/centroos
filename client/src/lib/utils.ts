import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// ============================================================================
// CLASSNAMES
// ============================================================================

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ============================================================================
// FORMATACAO DE MOEDA
// ============================================================================

/**
 * Formata valor em reais para moeda brasileira
 * @param value - Valor em reais (ex: 1234.56)
 */
export function formatCurrency(value: number | string): string {
  const num = typeof value === 'string' ? Number(value) : value;
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
}

/**
 * Formata valor em centavos para moeda brasileira
 * @param cents - Valor em centavos (ex: 123456 = R$ 1.234,56)
 */
export function formatCurrencyFromCents(cents: number): string {
  return formatCurrency(cents / 100);
}

/**
 * Formata valor de forma compacta (1K, 1M)
 * @param value - Valor em reais
 */
export function formatCurrencyCompact(value: number): string {
  if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `R$ ${(value / 1000).toFixed(1)}K`;
  return formatCurrency(value);
}

// ============================================================================
// FORMATACAO DE DATAS
// ============================================================================

/**
 * Formata data para formato brasileiro (dd/mm/aaaa)
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('pt-BR');
}

/**
 * Formata data para formato curto (dd/mm/aa)
 */
export function formatDateShort(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

/**
 * Formata periodo mensal (ex: "Janeiro 2025")
 */
export function formatPeriod(month: number, year: number): string {
  const date = new Date(year, month - 1);
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

/**
 * Formata periodo curto (ex: "Jan/25")
 */
export function formatPeriodShort(month: number, year: number): string {
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${meses[month - 1]}/${String(year).slice(2)}`;
}

/**
 * Formata tempo relativo (ex: "há 5 min", "há 2h", "há 3 dias")
 */
export function formatTimeAgo(dateStr: string | Date): string {
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  return `há ${days} dia(s)`;
}

// ============================================================================
// FORMATACAO DE NUMEROS
// ============================================================================

/**
 * Formata percentual com uma casa decimal
 */
export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

/**
 * Formata numero com separador de milhares brasileiro
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(value);
}

