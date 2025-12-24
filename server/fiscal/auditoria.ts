/**
 * Motor Fiscal - Auditoria e Observabilidade
 * 
 * Ref: docs/spec-fiscal/06-observabilidade-e-auditoria.md
 * 
 * Logging estruturado, métricas e auditoria fiscal.
 */

import { createHash } from 'crypto';
import { TipoDocumento, AuditRecord, CategoriaErro } from './types';

// ============================================================================
// MASCARAMENTO LGPD
// ============================================================================

/**
 * Mascara CPF para logs
 * "12345678901" -> "***.***.*90-01"
 */
export const mascararCpf = (cpf: string): string => {
  const limpo = cpf.replace(/\D/g, '');
  if (limpo.length !== 11) return '***.***.***-**';
  return `***.***.*${limpo.slice(-4, -2)}-${limpo.slice(-2)}`;
};

/**
 * Mascara CNPJ para logs
 * Exemplo: "12345678000190" vira "XX.XXX.XXX/0001-90"
 */
export const mascararCnpj = (cnpj: string): string => {
  const limpo = cnpj.replace(/\D/g, '');
  if (limpo.length !== 14) return '**.***.****/****-**';
  return `**.***.***/${limpo.slice(-6, -2)}-${limpo.slice(-2)}`;
};

/**
 * Mascara CPF ou CNPJ automaticamente
 */
export const mascararDocumento = (doc: string): string => {
  const limpo = doc.replace(/\D/g, '');
  if (limpo.length === 11) return mascararCpf(doc);
  if (limpo.length === 14) return mascararCnpj(doc);
  return '***';
};

/**
 * Mascara email para logs
 * "usuario@email.com" -> "u***@email.com"
 */
export const mascararEmail = (email: string): string => {
  const [local, dominio] = email.split('@');
  if (!dominio) return '***@***';
  return `${local[0]}***@${dominio}`;
};

/**
 * Mascara chave de acesso (mostra apenas início e fim)
 * "35251223456789000190550010000001231234567890" -> "3525...7890"
 */
export const mascararChaveAcesso = (chave: string): string => {
  if (chave.length < 10) return '***';
  return `${chave.slice(0, 4)}...${chave.slice(-4)}`;
};

// ============================================================================
// HASH DE INTEGRIDADE
// ============================================================================

/**
 * Gera hash SHA256 de conteúdo
 */
export const gerarHash = (conteudo: string): string => {
  return createHash('sha256').update(conteudo, 'utf8').digest('hex');
};

/**
 * Verifica integridade de conteúdo
 */
export const verificarHash = (conteudo: string, hashEsperado: string): boolean => {
  const hashCalculado = gerarHash(conteudo);
  return hashCalculado === hashEsperado;
};

// ============================================================================
// LOG ESTRUTURADO
// ============================================================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntryFiscal {
  timestamp: string;
  level: LogLevel;
  service: string;
  correlationId: string;
  requestId?: string;
  userId?: string;
  orgId?: string;
  operacao: string;
  tipoDocumento?: TipoDocumento;
  ambiente?: 'PRODUCAO' | 'HOMOLOGACAO';
  documentoId?: string;
  chaveAcesso?: string;
  numero?: string;
  serie?: string;
  estado?: string;
  status: 'success' | 'error';
  httpStatus?: number;
  erro?: {
    codigo: string;
    categoria: string;
    mensagem: string;
    codigoAutoridade?: string;
  };
  durationMs: number;
}

/**
 * Formata log entry para output
 */
export const formatarLog = (entry: LogEntryFiscal): string => {
  return JSON.stringify({
    ...entry,
    // Mascarar chave de acesso se presente
    chaveAcesso: entry.chaveAcesso ? mascararChaveAcesso(entry.chaveAcesso) : undefined,
  });
};

/**
 * Logger estruturado para operações fiscais
 */
export class FiscalLogger {
  private service = 'motor-fiscal';
  private correlationId: string;
  private startTime: number;
  private context: Partial<LogEntryFiscal> = {};

  constructor(correlationId: string) {
    this.correlationId = correlationId;
    this.startTime = Date.now();
  }

  setContext(ctx: Partial<LogEntryFiscal>): void {
    this.context = { ...this.context, ...ctx };
  }

  private log(level: LogLevel, operacao: string, extra?: Partial<LogEntryFiscal>): void {
    const entry: LogEntryFiscal = {
      timestamp: new Date().toISOString(),
      level,
      service: this.service,
      correlationId: this.correlationId,
      operacao,
      status: extra?.status || 'success',
      durationMs: Date.now() - this.startTime,
      ...this.context,
      ...extra,
    };

    const output = formatarLog(entry);
    
    switch (level) {
      case 'error':
        console.error(output);
        break;
      case 'warn':
        console.warn(output);
        break;
      case 'debug':
        if (process.env.LOG_LEVEL === 'debug') {
          console.log(output);
        }
        break;
      default:
        console.log(output);
    }
  }

  debug(operacao: string, extra?: Partial<LogEntryFiscal>): void {
    this.log('debug', operacao, extra);
  }

  info(operacao: string, extra?: Partial<LogEntryFiscal>): void {
    this.log('info', operacao, extra);
  }

  warn(operacao: string, extra?: Partial<LogEntryFiscal>): void {
    this.log('warn', operacao, extra);
  }

  error(operacao: string, erro: Error, extra?: Partial<LogEntryFiscal>): void {
    const erroInfo = {
      codigo: (erro as any).codigo || 'UNKNOWN',
      categoria: (erro as any).categoria || 'INTERNO',
      mensagem: erro.message,
      codigoAutoridade: (erro as any).codigoAutoridade,
    };

    this.log('error', operacao, {
      status: 'error',
      erro: erroInfo,
      ...extra,
    });
  }

  /**
   * Finaliza log com duração total
   */
  finalizar(sucesso: boolean, extra?: Partial<LogEntryFiscal>): void {
    this.log(sucesso ? 'info' : 'error', 'operacao_finalizada', {
      status: sucesso ? 'success' : 'error',
      durationMs: Date.now() - this.startTime,
      ...extra,
    });
  }
}

// ============================================================================
// AUDITORIA
// ============================================================================

// Armazenamento em memória (substituir por banco em produção)
const auditRecords: AuditRecord[] = [];

/**
 * Registra operação para auditoria
 */
export const registrarAuditoria = async (
  record: Omit<AuditRecord, 'id' | 'timestamp'>
): Promise<AuditRecord> => {
  const auditRecord: AuditRecord = {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date(),
    ...record,
  };

  // TODO: Persistir em banco de dados
  auditRecords.push(auditRecord);

  // Manter apenas últimos 10000 registros em memória
  if (auditRecords.length > 10000) {
    auditRecords.shift();
  }

  return auditRecord;
};

/**
 * Consulta registros de auditoria
 */
export const consultarAuditoria = async (filtros: {
  documentoId?: string;
  chaveAcesso?: string;
  userId?: string;
  orgId?: string;
  operacao?: string;
  dataInicio?: Date;
  dataFim?: Date;
  limite?: number;
}): Promise<AuditRecord[]> => {
  let resultado = auditRecords;

  if (filtros.documentoId) {
    resultado = resultado.filter(r => r.documentoId === filtros.documentoId);
  }

  if (filtros.chaveAcesso) {
    resultado = resultado.filter(r => r.chaveAcesso === filtros.chaveAcesso);
  }

  if (filtros.userId) {
    resultado = resultado.filter(r => r.userId === filtros.userId);
  }

  if (filtros.orgId) {
    resultado = resultado.filter(r => r.orgId === filtros.orgId);
  }

  if (filtros.operacao) {
    resultado = resultado.filter(r => r.operacao === filtros.operacao);
  }

  if (filtros.dataInicio) {
    resultado = resultado.filter(r => r.timestamp >= filtros.dataInicio!);
  }

  if (filtros.dataFim) {
    resultado = resultado.filter(r => r.timestamp <= filtros.dataFim!);
  }

  // Ordenar por timestamp decrescente
  resultado.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  // Limitar resultados
  if (filtros.limite) {
    resultado = resultado.slice(0, filtros.limite);
  }

  return resultado;
};

// ============================================================================
// MÉTRICAS (placeholder para Prometheus/etc)
// ============================================================================

export interface Metricas {
  emissaoTotal: number;
  emissaoSucesso: number;
  emissaoErro: number;
  consultaTotal: number;
  cancelamentoTotal: number;
  errosPorCategoria: Record<string, number>;
}

const metricas: Metricas = {
  emissaoTotal: 0,
  emissaoSucesso: 0,
  emissaoErro: 0,
  consultaTotal: 0,
  cancelamentoTotal: 0,
  errosPorCategoria: {},
};

export const incrementarMetrica = (nome: keyof Omit<Metricas, 'errosPorCategoria'>): void => {
  metricas[nome]++;
};

export const incrementarErro = (categoria: CategoriaErro): void => {
  metricas.errosPorCategoria[categoria] = (metricas.errosPorCategoria[categoria] || 0) + 1;
};

export const obterMetricas = (): Metricas => ({ ...metricas });

