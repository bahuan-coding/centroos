/**
 * Parsers Module
 * 
 * Parsers que convertem arquivos raw para tipos canônicos.
 * Cada parser implementa a interface Parser<T>.
 * 
 * @module pipeline/parsers
 */

// Types and interfaces
export {
  type Parser,
  type ParserOptions,
  type LineParseResult,
  buildParseResult,
  createParserProvenance,
} from './types';

// Column Inference Engine
export {
  inferFieldType,
  inferAllFields,
  inferRow,
  realignColumns,
  shouldSkipLine,
  type FieldType,
  type FieldInference,
  type InferredRow,
} from './column-inference';

// Rawdata Parser
export {
  RawdataParser,
  parseRawdata,
  parseRawdataFiles,
} from './rawdata';

