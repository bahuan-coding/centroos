/**
 * Framework de Auditoria Contábil
 * Sistema de Gestão Financeira para Centro Espírita
 * 
 * Este módulo exporta todas as funcionalidades de auditoria
 * para uso programático em outros scripts.
 */

// Tipos e utilitários
export * from './types';

// Configuração de regras
export { CONFIG, TODAS_REGRAS, obterRegrasPorModulo, obterRegrasPorCategoria } from './rules/config';
export * from './rules/thresholds';

// Motor de execução
export { AuditEngine } from './engine';

// Gerador de relatórios
export { Reporter } from './reporter';

// Validadores
export { ValidadorPessoas } from './validators/pessoas';
export { ValidadorDoacoes } from './validators/doacoes';
export { ValidadorContabil } from './validators/contabil';
export { ValidadorFiscal } from './validators/fiscal';
export { ValidadorConciliacao } from './validators/conciliacao';

