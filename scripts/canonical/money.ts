/**
 * Money Type - Cents-Based Arithmetic
 * 
 * CRITICAL: NEVER uses float for final values. All amounts stored as integer cents.
 * This ensures deterministic calculations without floating-point precision errors.
 * 
 * Example: R$ 1.234,56 is stored as { cents: 123456, currency: 'BRL' }
 */

/**
 * Represents a monetary value in cents (integer only).
 * Currency is always BRL for this system.
 */
export interface Money {
  /** Amount in cents. MUST be an integer. */
  cents: number;
  /** Currency code. Always 'BRL' for Brazilian Real. */
  currency: 'BRL';
}

/** Zero value constant for convenience */
export const ZERO_BRL: Money = Object.freeze({ cents: 0, currency: 'BRL' });

/**
 * Creates a Money object from cents.
 * @throws Error if cents is not a finite integer
 */
export function money(cents: number): Money {
  if (!Number.isFinite(cents)) {
    throw new Error(`Money cents must be finite, got: ${cents}`);
  }
  if (!Number.isInteger(cents)) {
    throw new Error(`Money cents must be integer, got: ${cents}`);
  }
  return { cents, currency: 'BRL' };
}

/**
 * Creates a Money object from a value in Reais.
 * Uses Math.round to convert to cents, avoiding floating-point issues.
 * 
 * @example fromReais(1234.56) => { cents: 123456, currency: 'BRL' }
 */
export function fromReais(reais: number): Money {
  if (!Number.isFinite(reais)) {
    throw new Error(`fromReais requires finite number, got: ${reais}`);
  }
  // Multiply first, then round to avoid precision loss
  const cents = Math.round(reais * 100);
  return money(cents);
}

/**
 * Converts Money to a number in Reais.
 * WARNING: Use only for display purposes, never for calculations.
 */
export function toReais(m: Money): number {
  return m.cents / 100;
}

/**
 * Adds two Money values.
 */
export function addMoney(a: Money, b: Money): Money {
  return money(a.cents + b.cents);
}

/**
 * Subtracts b from a.
 */
export function subtractMoney(a: Money, b: Money): Money {
  return money(a.cents - b.cents);
}

/**
 * Negates a Money value (flips the sign).
 */
export function negateMoney(m: Money): Money {
  return money(-m.cents);
}

/**
 * Returns the absolute value of a Money.
 */
export function absMoney(m: Money): Money {
  return money(Math.abs(m.cents));
}

/**
 * Sums an array of Money values.
 * Returns ZERO_BRL for empty array.
 */
export function sumMoney(amounts: Money[]): Money {
  if (amounts.length === 0) return ZERO_BRL;
  const total = amounts.reduce((sum, m) => sum + m.cents, 0);
  return money(total);
}

/**
 * Compares two Money values for sorting.
 * Returns negative if a < b, positive if a > b, zero if equal.
 */
export function compareMoney(a: Money, b: Money): number {
  return a.cents - b.cents;
}

/**
 * Checks if two Money values are equal within a tolerance.
 * @param toleranceCents Maximum allowed difference in cents (default: 0)
 */
export function moneyEquals(a: Money, b: Money, toleranceCents: number = 0): boolean {
  return Math.abs(a.cents - b.cents) <= toleranceCents;
}

/**
 * Checks if Money is exactly zero.
 */
export function isZero(m: Money): boolean {
  return m.cents === 0;
}

/**
 * Checks if Money is positive (> 0).
 */
export function isPositive(m: Money): boolean {
  return m.cents > 0;
}

/**
 * Checks if Money is negative (< 0).
 */
export function isNegative(m: Money): boolean {
  return m.cents < 0;
}

/**
 * Formats Money for display in pt-BR format.
 * @example formatMoney({ cents: 123456, currency: 'BRL' }) => "R$ 1.234,56"
 * @example formatMoney({ cents: -10000, currency: 'BRL' }) => "-R$ 100,00"
 */
export function formatMoney(m: Money): string {
  const reais = toReais(m);
  return reais.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Formats Money without currency symbol.
 * @example formatMoneyShort({ cents: 123456, currency: 'BRL' }) => "1.234,56"
 */
export function formatMoneyShort(m: Money): string {
  const reais = toReais(m);
  return reais.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Multiplies Money by a factor.
 * Result is rounded to nearest cent.
 */
export function multiplyMoney(m: Money, factor: number): Money {
  if (!Number.isFinite(factor)) {
    throw new Error(`multiplyMoney factor must be finite, got: ${factor}`);
  }
  return money(Math.round(m.cents * factor));
}

/**
 * Divides Money by a divisor.
 * Result is rounded to nearest cent.
 * @throws Error if divisor is zero
 */
export function divideMoney(m: Money, divisor: number): Money {
  if (divisor === 0) {
    throw new Error('Cannot divide money by zero');
  }
  if (!Number.isFinite(divisor)) {
    throw new Error(`divideMoney divisor must be finite, got: ${divisor}`);
  }
  return money(Math.round(m.cents / divisor));
}

/**
 * Returns the minimum of two Money values.
 */
export function minMoney(a: Money, b: Money): Money {
  return a.cents <= b.cents ? a : b;
}

/**
 * Returns the maximum of two Money values.
 */
export function maxMoney(a: Money, b: Money): Money {
  return a.cents >= b.cents ? a : b;
}
