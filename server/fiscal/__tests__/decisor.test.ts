/**
 * Testes - Decisor Fiscal
 * 
 * Ref: docs/spec-fiscal/01-decisor-fiscal.md
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  decidirDocumentoFiscal,
  adicionarMunicipioConveniado,
  isNFSe,
  isNFe,
  getModeloFiscal,
} from '../decisor';
import { DecisaoFiscalInput, RegimeTributario } from '../types';
import { FiscalError } from '../errors';

describe('Decisor Fiscal', () => {
  const baseInput: DecisaoFiscalInput = {
    tipoOperacao: 'SERVICO',
    emitente: {
      cpfCnpj: '12345678000190',
      uf: 'SP',
      codigoMunicipio: '3550308', // São Paulo
      inscricaoMunicipal: '12345678',
      regimeTributario: RegimeTributario.SIMPLES_NACIONAL,
    },
    destinatario: {
      tipo: 'PJ',
      cpfCnpj: '98765432000110',
      uf: 'SP',
      codigoMunicipio: '3550308',
      isConsumidorFinal: false,
    },
    localVenda: 'PRESENCIAL',
    valorTotal: 1000,
    servico: {
      codigoLC116: '01.08',
    },
  };

  describe('Serviços', () => {
    it('deve retornar NFSE_SP para serviço prestado em São Paulo capital', async () => {
      const resultado = await decidirDocumentoFiscal(baseInput);
      
      expect(resultado.tipoDocumento).toBe('NFSE_SP');
      expect(resultado.regras).toContain('R-SVC-01');
    });

    it('deve retornar NFSE_NACIONAL para município conveniado', async () => {
      // Adicionar BH como conveniado
      adicionarMunicipioConveniado('3106200');
      
      const input: DecisaoFiscalInput = {
        ...baseInput,
        emitente: {
          ...baseInput.emitente,
          uf: 'MG',
          codigoMunicipio: '3106200', // Belo Horizonte
        },
      };
      
      const resultado = await decidirDocumentoFiscal(input);
      
      expect(resultado.tipoDocumento).toBe('NFSE_NACIONAL');
      expect(resultado.regras).toContain('R-SVC-02');
    });

    it('deve lançar erro para município não conveniado', async () => {
      const input: DecisaoFiscalInput = {
        ...baseInput,
        emitente: {
          ...baseInput.emitente,
          uf: 'RS',
          codigoMunicipio: '4314902', // Porto Alegre (não conveniado no teste)
        },
      };
      
      await expect(decidirDocumentoFiscal(input)).rejects.toThrow(FiscalError);
    });
  });

  describe('Mercadorias', () => {
    it('deve retornar NFE para venda B2B', async () => {
      const input: DecisaoFiscalInput = {
        ...baseInput,
        tipoOperacao: 'MERCADORIA',
        destinatario: {
          tipo: 'PJ',
          cpfCnpj: '98765432000110',
          isConsumidorFinal: false,
        },
        mercadoria: {
          ncm: '84715010',
          cfop: '5102',
        },
      };
      
      const resultado = await decidirDocumentoFiscal(input);
      
      expect(resultado.tipoDocumento).toBe('NFE');
      expect(resultado.regras).toContain('R-MER-01');
    });

    it('deve retornar NFCE para venda presencial ao consumidor final', async () => {
      const input: DecisaoFiscalInput = {
        ...baseInput,
        tipoOperacao: 'MERCADORIA',
        localVenda: 'PRESENCIAL',
        destinatario: {
          tipo: 'PF',
          cpfCnpj: '12345678901',
          isConsumidorFinal: true,
        },
        mercadoria: {
          ncm: '84715010',
          cfop: '5102',
        },
      };
      
      const resultado = await decidirDocumentoFiscal(input);
      
      expect(resultado.tipoDocumento).toBe('NFCE');
      expect(resultado.regras).toContain('R-MER-04');
    });

    it('deve retornar NFE para venda online ao consumidor final', async () => {
      const input: DecisaoFiscalInput = {
        ...baseInput,
        tipoOperacao: 'MERCADORIA',
        localVenda: 'INTERNET',
        destinatario: {
          tipo: 'PF',
          cpfCnpj: '12345678901',
          isConsumidorFinal: true,
        },
        mercadoria: {
          ncm: '84715010',
          cfop: '5102',
        },
      };
      
      const resultado = await decidirDocumentoFiscal(input);
      
      expect(resultado.tipoDocumento).toBe('NFE');
      expect(resultado.regras).toContain('R-MER-05');
    });

    it('deve retornar NFE para exportação', async () => {
      const input: DecisaoFiscalInput = {
        ...baseInput,
        tipoOperacao: 'MERCADORIA',
        destinatario: {
          tipo: 'ESTRANGEIRO',
          isConsumidorFinal: true,
        },
        mercadoria: {
          ncm: '84715010',
          cfop: '7101',
        },
      };
      
      const resultado = await decidirDocumentoFiscal(input);
      
      expect(resultado.tipoDocumento).toBe('NFE');
      expect(resultado.regras).toContain('R-MER-03');
    });
  });

  describe('Misto', () => {
    it('deve retornar NFE para operação mista', async () => {
      const input: DecisaoFiscalInput = {
        ...baseInput,
        tipoOperacao: 'MISTO',
      };
      
      const resultado = await decidirDocumentoFiscal(input);
      
      expect(resultado.tipoDocumento).toBe('NFE');
      expect(resultado.regras).toContain('R-MIX-01');
    });
  });

  describe('Helpers', () => {
    it('isNFSe deve identificar corretamente', () => {
      expect(isNFSe('NFSE_SP')).toBe(true);
      expect(isNFSe('NFSE_NACIONAL')).toBe(true);
      expect(isNFSe('NFE')).toBe(false);
      expect(isNFSe('NFCE')).toBe(false);
    });

    it('isNFe deve identificar corretamente', () => {
      expect(isNFe('NFE')).toBe(true);
      expect(isNFe('NFCE')).toBe(true);
      expect(isNFe('NFSE_SP')).toBe(false);
      expect(isNFe('NFSE_NACIONAL')).toBe(false);
    });

    it('getModeloFiscal deve retornar modelo correto', () => {
      expect(getModeloFiscal('NFE')).toBe(55);
      expect(getModeloFiscal('NFCE')).toBe(65);
      expect(getModeloFiscal('NFSE_SP')).toBeNull();
      expect(getModeloFiscal('NFSE_NACIONAL')).toBeNull();
    });
  });
});


