/**
 * Testes - Auditoria
 * 
 * Ref: docs/spec-fiscal/06-observabilidade-e-auditoria.md
 */

import { describe, it, expect } from 'vitest';
import {
  mascararCpf,
  mascararCnpj,
  mascararDocumento,
  mascararEmail,
  mascararChaveAcesso,
  gerarHash,
  verificarHash,
  FiscalLogger,
  registrarAuditoria,
  consultarAuditoria,
} from '../auditoria';

describe('Mascaramento LGPD', () => {
  describe('CPF', () => {
    it('deve mascarar CPF mantendo últimos 4 dígitos', () => {
      const resultado = mascararCpf('12345678901');
      
      expect(resultado).toBe('***.***.*89-01');
    });

    it('deve lidar com CPF formatado', () => {
      const resultado = mascararCpf('123.456.789-01');
      
      expect(resultado).toBe('***.***.*89-01');
    });

    it('deve retornar máscara padrão para CPF inválido', () => {
      const resultado = mascararCpf('123');
      
      expect(resultado).toBe('***.***.***-**');
    });
  });

  describe('CNPJ', () => {
    it('deve mascarar CNPJ mantendo últimos 6 dígitos', () => {
      const resultado = mascararCnpj('12345678000190');
      
      expect(resultado).toBe('**.***.***/0001-90');
    });

    it('deve lidar com CNPJ formatado', () => {
      const resultado = mascararCnpj('12.345.678/0001-90');
      
      expect(resultado).toBe('**.***.***/0001-90');
    });
  });

  describe('Documento automático', () => {
    it('deve identificar e mascarar CPF', () => {
      const resultado = mascararDocumento('12345678901');
      
      expect(resultado).toContain('***');
    });

    it('deve identificar e mascarar CNPJ', () => {
      const resultado = mascararDocumento('12345678000190');
      
      expect(resultado).toContain('***');
    });
  });

  describe('Email', () => {
    it('deve mascarar email mantendo primeira letra', () => {
      const resultado = mascararEmail('usuario@email.com');
      
      expect(resultado).toBe('u***@email.com');
    });
  });

  describe('Chave de Acesso', () => {
    it('deve mascarar chave mantendo início e fim', () => {
      const chave = '35251223456789000190550010000001231234567890';
      const resultado = mascararChaveAcesso(chave);
      
      expect(resultado).toBe('3525...7890');
    });
  });
});

describe('Hash de Integridade', () => {
  it('deve gerar hash SHA256', () => {
    const hash = gerarHash('conteudo de teste');
    
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[a-f0-9]+$/);
  });

  it('deve gerar mesmo hash para mesmo conteúdo', () => {
    const hash1 = gerarHash('conteudo');
    const hash2 = gerarHash('conteudo');
    
    expect(hash1).toBe(hash2);
  });

  it('deve gerar hash diferente para conteúdo diferente', () => {
    const hash1 = gerarHash('conteudo1');
    const hash2 = gerarHash('conteudo2');
    
    expect(hash1).not.toBe(hash2);
  });

  it('deve verificar hash corretamente', () => {
    const conteudo = 'meu conteudo';
    const hash = gerarHash(conteudo);
    
    expect(verificarHash(conteudo, hash)).toBe(true);
    expect(verificarHash('outro conteudo', hash)).toBe(false);
  });
});

describe('FiscalLogger', () => {
  it('deve criar logger com correlation ID', () => {
    const logger = new FiscalLogger('test-correlation-id');
    
    expect(logger).toBeDefined();
  });

  it('deve permitir setar contexto', () => {
    const logger = new FiscalLogger('test-id');
    
    logger.setContext({
      tipoDocumento: 'NFSE_SP',
      orgId: 'org-123',
    });
    
    // Logger deve funcionar sem erros
    logger.info('teste');
  });
});

describe('Auditoria', () => {
  it('deve registrar operação', async () => {
    const record = await registrarAuditoria({
      operacao: 'emissao',
      tipoDocumento: 'NFSE_SP',
      documentoId: 'doc-123',
      chaveAcesso: '12345',
      numero: '1',
      userId: 'user-1',
      orgId: 'org-1',
      ipOrigem: '127.0.0.1',
      sucesso: true,
      durationMs: 150,
    });
    
    expect(record.id).toBeDefined();
    expect(record.timestamp).toBeDefined();
    expect(record.operacao).toBe('emissao');
  });

  it('deve consultar por documentoId', async () => {
    const docId = 'doc-' + Date.now();
    
    await registrarAuditoria({
      operacao: 'consulta',
      tipoDocumento: 'NFSE_SP',
      documentoId: docId,
      userId: 'user-1',
      orgId: 'org-1',
      ipOrigem: '127.0.0.1',
      sucesso: true,
      durationMs: 50,
    });
    
    const resultados = await consultarAuditoria({ documentoId: docId });
    
    expect(resultados.length).toBeGreaterThan(0);
    expect(resultados[0].documentoId).toBe(docId);
  });

  it('deve limitar resultados', async () => {
    const resultados = await consultarAuditoria({ limite: 5 });
    
    expect(resultados.length).toBeLessThanOrEqual(5);
  });
});

