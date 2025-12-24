/**
 * Testes unitários para error-normalizer.ts
 */

import { describe, it, expect } from 'vitest';
import {
  normalizeErrorCode,
  normalizeSerproError,
  parseRateLimitHeaders,
  isSuccess,
  isProcessing,
  isError,
} from '../error-normalizer';
import { SerproIntegrationError } from '../types';

describe('error-normalizer', () => {
  describe('normalizeErrorCode', () => {
    it('deve normalizar código de erro conhecido', () => {
      const result = normalizeErrorCode('AUTH001', 401);
      
      expect(result.codigo).toBe('AUTH001');
      expect(result.categoria).toBe('AUTH');
      expect(result.mensagem).toBe('Token inválido');
      expect(result.retryable).toBe(true);
    });

    it('deve normalizar código PRO001 (procuração não encontrada)', () => {
      const result = normalizeErrorCode('PRO001', 403);
      
      expect(result.codigo).toBe('PRO001');
      expect(result.categoria).toBe('PRO');
      expect(result.mensagem).toBe('Procuração não encontrada');
      expect(result.retryable).toBe(false);
      expect(result.acaoSugerida).toContain('e-CAC');
    });

    it('deve normalizar código de erro desconhecido baseado no HTTP status', () => {
      const result = normalizeErrorCode('UNKNOWN123', 500);
      
      expect(result.codigo).toBe('UNKNOWN123');
      expect(result.httpStatus).toBe(500);
      expect(result.retryable).toBe(true);
    });

    it('deve incluir retryAfter quando fornecido', () => {
      const result = normalizeErrorCode('SYS001', 429, 60);
      
      expect(result.retryAfter).toBe(60);
    });
  });

  describe('normalizeSerproError', () => {
    it('deve parsear resposta padrão do Integra Contador', () => {
      const body = {
        dadosResposta: {
          codigoStatus: '99',
          mensagem: 'Erro na operação',
        },
        resposta: {
          codigoErro: 'PRO001',
          mensagemErro: 'Procuração não encontrada',
        },
      };

      const result = normalizeSerproError(403, body);
      
      expect(result.codigo).toBe('PRO001');
      expect(result.categoria).toBe('PRO');
    });

    it('deve parsear erro OAuth', () => {
      const body = {
        error: 'invalid_token',
        error_description: 'Token expirado',
      };

      const result = normalizeSerproError(401, body);
      
      expect(result.codigo).toBe('AUTH001');
      expect(result.categoria).toBe('AUTH');
    });

    it('deve parsear body como string', () => {
      const body = '{"error": "unauthorized"}';

      const result = normalizeSerproError(401, body);
      
      expect(result.categoria).toBe('AUTH');
    });

    it('deve extrair Retry-After dos headers', () => {
      const headers = {
        'retry-after': '30',
      };

      const result = normalizeSerproError(429, { error: 'rate_limit' }, headers);
      
      expect(result.retryAfter).toBe(30);
    });
  });

  describe('parseRateLimitHeaders', () => {
    it('deve extrair informações de rate limit', () => {
      const headers = {
        'x-ratelimit-limit': '100',
        'x-ratelimit-remaining': '50',
        'x-ratelimit-reset': '1703443200',
        'retry-after': '60',
      };

      const result = parseRateLimitHeaders(headers);
      
      expect(result).not.toBeNull();
      expect(result!.limit).toBe(100);
      expect(result!.remaining).toBe(50);
      expect(result!.reset).toBe(1703443200);
      expect(result!.retryAfter).toBe(60);
    });

    it('deve retornar null se não houver headers de rate limit', () => {
      const headers = {
        'content-type': 'application/json',
      };

      const result = parseRateLimitHeaders(headers);
      
      expect(result).toBeNull();
    });
  });

  describe('status helpers', () => {
    it('isSuccess deve retornar true para "00"', () => {
      expect(isSuccess('00')).toBe(true);
      expect(isSuccess('01')).toBe(false);
      expect(isSuccess('99')).toBe(false);
    });

    it('isProcessing deve retornar true para "01"', () => {
      expect(isProcessing('01')).toBe(true);
      expect(isProcessing('00')).toBe(false);
      expect(isProcessing('99')).toBe(false);
    });

    it('isError deve retornar true para "99"', () => {
      expect(isError('99')).toBe(true);
      expect(isError('00')).toBe(false);
      expect(isError('01')).toBe(false);
    });
  });

  describe('SerproIntegrationError', () => {
    it('deve criar erro com todas as propriedades', () => {
      const normalized = normalizeErrorCode('SIT001', 404);
      const error = new SerproIntegrationError(normalized);

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('SerproIntegrationError');
      expect(error.codigo).toBe('SIT001');
      expect(error.categoria).toBe('SIT');
      expect(error.message).toBe('Contribuinte não encontrado');
      expect(error.httpStatus).toBe(404);
      expect(error.retryable).toBe(false);
    });
  });
});

