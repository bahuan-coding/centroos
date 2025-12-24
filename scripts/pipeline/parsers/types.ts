/**
 * Parser Interface - Contrato Genérico para Parsers
 * 
 * Define a interface que todos os parsers do pipeline devem implementar.
 * Cada parser converte um formato específico para tipos canônicos.
 * 
 * @module pipeline/parsers/types
 */

import type { ParseResult, Provenance } from '../../canonical';

/**
 * Interface genérica para parsers.
 * Cada parser implementa esta interface para um tipo canônico específico.
 */
export interface Parser<T> {
  /** Nome único do parser (para provenance) */
  readonly name: string;
  
  /** Versão do parser (para provenance e compatibilidade) */
  readonly version: string;
  
  /**
   * Detecta se o conteúdo pode ser parseado por este parser.
   * 
   * @param content Conteúdo do arquivo
   * @param filename Nome do arquivo (opcional, para heurísticas)
   * @returns Score de 0-100 indicando confiança na detecção
   *   - 0-20: Provavelmente não é este formato
   *   - 21-50: Possível, mas incerto
   *   - 51-80: Provável
   *   - 81-100: Certeza alta (headers/structure matches)
   */
  detect(content: string, filename?: string): number;
  
  /**
   * Parseia o conteúdo e retorna registros canônicos.
   * 
   * @param content Conteúdo do arquivo
   * @param sourceFile Caminho do arquivo fonte (para provenance)
   * @returns ParseResult com registros e metadados
   */
  parse(content: string, sourceFile: string): ParseResult<T>;
}

/**
 * Opções comuns para configuração de parsers.
 */
export interface ParserOptions {
  /** Ano padrão para datas incompletas */
  defaultYear?: number;
  /** Se deve ignorar erros de parsing por linha */
  skipInvalid?: boolean;
  /** Número máximo de linhas a processar (para debug/preview) */
  maxLines?: number;
}

/**
 * Resultado intermediário de parsing de uma linha.
 * Usado internamente antes de consolidar no ParseResult final.
 */
export interface LineParseResult<T> {
  /** Registro parseado, ou null se falhou */
  record: T | null;
  /** Número da linha no arquivo original (1-indexed) */
  lineNumber: number;
  /** Conteúdo raw da linha */
  rawLine: string;
  /** Warnings gerados durante parsing */
  warnings: string[];
  /** Se o parsing foi bem-sucedido */
  success: boolean;
  /** Erro se falhou */
  error?: string;
}

/**
 * Helper para criar um ParseResult a partir de LineParseResults.
 */
export function buildParseResult<T>(
  lineResults: LineParseResult<T>[],
  provenance: Provenance
): ParseResult<T> {
  const successful = lineResults.filter(r => r.success && r.record !== null);
  const failed = lineResults.filter(r => !r.success);
  
  const records = successful.map(r => ({
    record: r.record as T,
    warnings: r.warnings,
    lineNumber: r.lineNumber,
  }));
  
  const fileWarnings: string[] = [];
  if (failed.length > 0) {
    fileWarnings.push(`${failed.length} linha(s) com erro de parsing`);
  }
  
  // Confidence based on success rate
  const totalLines = lineResults.length;
  const successRate = totalLines > 0 ? successful.length / totalLines : 0;
  
  return {
    records,
    provenance,
    confidence: successRate,
    warnings: fileWarnings,
    failedCount: failed.length,
  };
}

/**
 * Helper para criar provenance builder para um parser.
 */
export function createParserProvenance(
  parser: Parser<unknown>,
  sourceFile: string
): Provenance {
  return {
    sourceFile,
    parserName: parser.name,
    parserVersion: parser.version,
    parsedAt: new Date().toISOString(),
    rawHash: '',
    warnings: [],
  };
}






