/**
 * Testes - Erros
 * 
 * Ref: docs/spec-fiscal/05-erros-e-tratamento.md
 */

import { describe, it, expect } from 'vitest';
import {
  FiscalError,
  ERROS,
  mapearErroSP,
  mapearErroSEFAZ,
  isRecuperavel,
} from '../errors';
import { CategoriaErro } from '../types';

describe('FiscalError', () => {
  it('deve criar erro com todas as propriedades', () => {
    const erro = ERROS.VAL_001('campo_teste');
    
    expect(erro).toBeInstanceOf(FiscalError);
    expect(erro.codigo).toBe('FISCAL-VAL-001');
    expect(erro.categoria).toBe(CategoriaErro.VALIDACAO);
    expect(erro.campo).toBe('campo_teste');
    expect(erro.recuperavel).toBe(true);
  });

  it('deve serializar para JSON', () => {
    const erro = ERROS.VAL_001('teste');
    const json = erro.toJSON();
    
    expect(json.codigo).toBe('FISCAL-VAL-001');
    expect(json.mensagem).toBeDefined();
    expect(json.mensagemUsuario).toBeDefined();
  });
});

describe('Catálogo de Erros', () => {
  describe('Validação', () => {
    it('VAL_001 - campo obrigatório', () => {
      const erro = ERROS.VAL_001('email');
      
      expect(erro.codigo).toBe('FISCAL-VAL-001');
      expect(erro.mensagem).toContain('email');
      expect(erro.recuperavel).toBe(true);
    });

    it('VAL_002 - formato inválido', () => {
      const erro = ERROS.VAL_002('cpf', '123');
      
      expect(erro.codigo).toBe('FISCAL-VAL-002');
      expect(erro.valorRecebido).toBe('123');
    });

    it('VAL_004 - CPF/CNPJ inválido', () => {
      const erro = ERROS.VAL_004('00000000000');
      
      expect(erro.codigo).toBe('FISCAL-VAL-004');
      expect(erro.campo).toBe('cpfCnpj');
    });
  });

  describe('Autenticação', () => {
    it('AUT_001 - certificado não apresentado', () => {
      const erro = ERROS.AUT_001();
      
      expect(erro.codigo).toBe('FISCAL-AUT-001');
      expect(erro.recuperavel).toBe(false);
    });

    it('AUT_002 - certificado expirado', () => {
      const erro = ERROS.AUT_002('2024-12-01');
      
      expect(erro.codigo).toBe('FISCAL-AUT-002');
      expect(erro.mensagem).toContain('2024-12-01');
    });
  });

  describe('Rejeição', () => {
    it('REJ_001 - documento já autorizado', () => {
      const erro = ERROS.REJ_001('35251212345');
      
      expect(erro.codigo).toBe('FISCAL-REJ-001');
      expect(erro.recuperavel).toBe(false);
    });

    it('REJ_002 - já cancelado', () => {
      const erro = ERROS.REJ_002();
      
      expect(erro.codigo).toBe('FISCAL-REJ-002');
    });

    it('REJ_003 - prazo expirado', () => {
      const erro = ERROS.REJ_003();
      
      expect(erro.codigo).toBe('FISCAL-REJ-003');
    });
  });

  describe('Ambiente', () => {
    it('AMB_001 - serviço indisponível', () => {
      const erro = ERROS.AMB_001();
      
      expect(erro.codigo).toBe('FISCAL-AMB-001');
      expect(erro.recuperavel).toBe(true);
    });

    it('AMB_002 - timeout', () => {
      const erro = ERROS.AMB_002();
      
      expect(erro.codigo).toBe('FISCAL-AMB-002');
      expect(erro.recuperavel).toBe(true);
    });
  });
});

describe('Mapeadores', () => {
  describe('mapearErroSP', () => {
    it('deve mapear código 1000 para REJ_001', () => {
      const erro = mapearErroSP('1000', 'RPS já convertido');
      
      expect(erro.codigo).toBe('FISCAL-REJ-001');
      expect(erro.codigoAutoridade).toBe('1000');
      expect(erro.tipoDocumento).toBe('NFSE_SP');
    });

    it('deve mapear código desconhecido para genérico', () => {
      const erro = mapearErroSP('9999', 'Erro desconhecido');
      
      expect(erro.codigo).toBe('FISCAL-REJ-999');
      expect(erro.mensagemAutoridade).toBe('Erro desconhecido');
    });
  });

  describe('mapearErroSEFAZ', () => {
    it('deve mapear cStat 204 para duplicidade', () => {
      const erro = mapearErroSEFAZ(204, 'Duplicidade de NF-e', 'NFE');
      
      expect(erro.codigo).toBe('FISCAL-REJ-001');
      expect(erro.tipoDocumento).toBe('NFE');
    });

    it('deve mapear cStat 301 para denegação', () => {
      const erro = mapearErroSEFAZ(301, 'Uso Denegado', 'NFE');
      
      expect(erro.categoria).toBe(CategoriaErro.DENEGACAO);
    });

    it('deve mapear cStat 539 para evento duplicado', () => {
      const erro = mapearErroSEFAZ(539, 'Evento duplicado', 'NFE');
      
      expect(erro.codigo).toBe('FISCAL-REJ-004');
    });
  });
});

describe('isRecuperavel', () => {
  it('deve identificar FiscalError recuperável', () => {
    const erro = ERROS.AMB_001();
    expect(isRecuperavel(erro)).toBe(true);
  });

  it('deve identificar FiscalError não recuperável', () => {
    const erro = ERROS.AUT_001();
    expect(isRecuperavel(erro)).toBe(false);
  });

  it('deve identificar erro de timeout como recuperável', () => {
    const erro = new Error('Timeout') as any;
    erro.code = 'ETIMEDOUT';
    expect(isRecuperavel(erro)).toBe(true);
  });

  it('deve identificar HTTP 500 como recuperável', () => {
    const erro = new Error('Internal Server Error') as any;
    erro.statusCode = 500;
    expect(isRecuperavel(erro)).toBe(true);
  });

  it('deve identificar HTTP 429 como recuperável', () => {
    const erro = new Error('Rate Limited') as any;
    erro.statusCode = 429;
    expect(isRecuperavel(erro)).toBe(true);
  });
});


