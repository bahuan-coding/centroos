/**
 * Testes - Idempotência
 * 
 * Ref: docs/spec-fiscal/04-idempotencia-e-consistencia.md
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  gerarIdNFSeSP,
  gerarIdNFSeADN,
  gerarIdNFe,
  gerarCorrelationId,
  calcularBackoff,
  executeWithRetry,
  jaProcessado,
  marcarProcessado,
  comIdempotencia,
  CONFIG_RETRY,
} from '../idempotencia';

describe('Geração de IDs', () => {
  describe('NFS-e SP', () => {
    it('deve gerar ID no formato correto', () => {
      const id = gerarIdNFSeSP('12345678', 'A', 1);
      
      expect(id).toMatch(/^NFSE_SP_\d{8}_[A-Z_]{5}_\d{12}$/);
      expect(id).toBe('NFSE_SP_12345678_____A_000000000001');
    });

    it('deve gerar IDs únicos para RPS diferentes', () => {
      const id1 = gerarIdNFSeSP('12345678', 'A', 1);
      const id2 = gerarIdNFSeSP('12345678', 'A', 2);
      
      expect(id1).not.toBe(id2);
    });
  });

  describe('NFS-e ADN', () => {
    it('deve gerar ID no formato correto', () => {
      const id = gerarIdNFSeADN('3550308', '2', '12345678000190', 'A', '1');
      
      expect(id).toMatch(/^NFSE_ADN_/);
      expect(id).toContain('3550308');
    });
  });

  describe('NF-e', () => {
    it('deve gerar ID com chave de acesso', () => {
      const id = gerarIdNFe('35', '2512', '12345678000190', '55', '1', '1', '1', '12345678');
      
      expect(id).toMatch(/^NFE_/);
      expect(id.length).toBeGreaterThan(44);
    });

    it('deve gerar ID para NFC-e', () => {
      const id = gerarIdNFe('35', '2512', '12345678000190', '65', '1', '1', '1', '12345678');
      
      expect(id).toMatch(/^NFCE_/);
    });
  });

  describe('Correlation ID', () => {
    it('deve gerar ID único', () => {
      const id1 = gerarCorrelationId();
      const id2 = gerarCorrelationId();
      
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^fiscal-\d+-[a-f0-9]+$/);
    });
  });
});

describe('Backoff', () => {
  it('deve calcular backoff exponencial', () => {
    expect(calcularBackoff(0)).toBe(1000);
    expect(calcularBackoff(1)).toBe(2000);
    expect(calcularBackoff(2)).toBe(4000);
    expect(calcularBackoff(3)).toBe(8000);
  });

  it('deve respeitar máximo', () => {
    expect(calcularBackoff(10)).toBeLessThanOrEqual(CONFIG_RETRY.maxBackoff);
  });
});

describe('Retry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('deve executar com sucesso na primeira tentativa', async () => {
    const operacao = vi.fn().mockResolvedValue('sucesso');
    
    const resultado = await executeWithRetry(operacao, { ...CONFIG_RETRY, maxTentativas: 3 });
    
    expect(resultado).toBe('sucesso');
    expect(operacao).toHaveBeenCalledTimes(1);
  });

  it('deve lançar erro não recuperável imediatamente', async () => {
    const erro = new Error('Erro fatal');
    (erro as any).recuperavel = false;
    const operacao = vi.fn().mockRejectedValue(erro);
    
    await expect(executeWithRetry(operacao)).rejects.toThrow('Erro fatal');
    expect(operacao).toHaveBeenCalledTimes(1);
  });
});

describe('Cache de idempotência', () => {
  it('deve armazenar e recuperar resultado', () => {
    const id = 'test-id-' + Date.now();
    const resultado = { sucesso: true, numero: '123' };
    
    marcarProcessado(id, resultado);
    const cached = jaProcessado(id);
    
    expect(cached).toEqual(resultado);
  });

  it('deve retornar null para ID não processado', () => {
    const cached = jaProcessado('id-inexistente');
    
    expect(cached).toBeNull();
  });
});

describe('comIdempotencia', () => {
  it('deve executar operação e cachear resultado', async () => {
    const id = 'idem-' + Date.now();
    const operacao = vi.fn().mockResolvedValue({ numero: '456' });
    
    const { resultado, origem } = await comIdempotencia(id, operacao);
    
    expect(resultado).toEqual({ numero: '456' });
    expect(origem).toBe('operacao');
    expect(operacao).toHaveBeenCalledTimes(1);
  });

  it('deve retornar do cache na segunda chamada', async () => {
    const id = 'idem-cache-' + Date.now();
    const operacao = vi.fn().mockResolvedValue({ numero: '789' });
    
    await comIdempotencia(id, operacao);
    const { resultado, origem } = await comIdempotencia(id, operacao);
    
    expect(resultado).toEqual({ numero: '789' });
    expect(origem).toBe('cache');
    expect(operacao).toHaveBeenCalledTimes(1); // Não chamou novamente
  });
});

