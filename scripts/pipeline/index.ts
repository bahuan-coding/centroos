/**
 * Pipeline Module
 * 
 * Provides data normalization, parsing, and dataset building capabilities.
 * 
 * @module pipeline
 */

// Dataset Builder
export {
  DatasetBuilder,
  createDatasetBuilder,
  buildDataset,
  type ExtendedDataset,
  type DatasetStats,
} from './dataset-builder';

// Normalizers
export * from './normalizers';

// Parsers
export * from './parsers';

