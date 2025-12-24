/**
 * Testes - Endpoints SEFAZ
 */

import { describe, it, expect } from 'vitest';
import {
  getEndpoint,
  getEndpointsUF,
  isUFSuportada,
  getUFsSuportadas,
  getCodigoUF,
  getAutorizadorUF,
  UF_CONFIG,
} from '../endpoints';

describe('Endpoints SEFAZ', () => {
  describe('getEndpoint()', () => {
    it('deve retornar endpoint de SP produção', () => {
      const endpoint = getEndpoint('NFeAutorizacao', 'SP', '1');
      
      expect(endpoint.url).toContain('nfe.fazenda.sp.gov.br');
      expect(endpoint.versao).toBe('4.00');
      expect(endpoint.namespace).toContain('NFeAutorizacao');
    });

    it('deve retornar endpoint de SP homologação', () => {
      const endpoint = getEndpoint('NFeAutorizacao', 'SP', '2');
      
      expect(endpoint.url).toContain('homologacao.nfe.fazenda.sp.gov.br');
    });

    it('deve retornar endpoint de AL via SVRS', () => {
      const endpoint = getEndpoint('NFeAutorizacao', 'AL', '2');
      
      expect(endpoint.url).toContain('svrs.rs.gov.br');
    });

    it('deve retornar endpoint de contingência SVC-AN', () => {
      const endpoint = getEndpoint('NFeAutorizacao', 'SP', '2', 'SVC-AN');
      
      expect(endpoint.url).toContain('svc.fazenda.gov.br');
    });

    it('deve lançar erro para UF não suportada', () => {
      expect(() => getEndpoint('NFeAutorizacao', 'XX', '2'))
        .toThrow('UF não suportada');
    });

    it('deve retornar todos os serviços para SP', () => {
      const servicos = [
        'NFeAutorizacao',
        'NFeRetAutorizacao',
        'NFeConsultaProtocolo',
        'NFeStatusServico',
        'NFeRecepcaoEvento',
        'NFeInutilizacao',
      ] as const;
      
      for (const servico of servicos) {
        const endpoint = getEndpoint(servico, 'SP', '2');
        expect(endpoint.url).toBeTruthy();
      }
    });
  });

  describe('getEndpointsUF()', () => {
    it('deve retornar todos os endpoints de uma UF', () => {
      const endpoints = getEndpointsUF('SP', '2');
      
      expect(endpoints.NFeAutorizacao).toBeDefined();
      expect(endpoints.NFeStatusServico).toBeDefined();
      expect(endpoints.NFeConsultaProtocolo).toBeDefined();
    });

    it('deve lançar erro para UF não suportada', () => {
      expect(() => getEndpointsUF('XX', '2'))
        .toThrow('UF não suportada');
    });
  });

  describe('isUFSuportada()', () => {
    it('deve retornar true para SP', () => {
      expect(isUFSuportada('SP')).toBe(true);
      expect(isUFSuportada('sp')).toBe(true);
    });

    it('deve retornar true para AL', () => {
      expect(isUFSuportada('AL')).toBe(true);
    });

    it('deve retornar false para UF não configurada', () => {
      expect(isUFSuportada('XX')).toBe(false);
    });
  });

  describe('getUFsSuportadas()', () => {
    it('deve retornar lista de UFs', () => {
      const ufs = getUFsSuportadas();
      
      expect(Array.isArray(ufs)).toBe(true);
      expect(ufs).toContain('SP');
      expect(ufs).toContain('AL');
    });
  });

  describe('getCodigoUF()', () => {
    it('deve retornar código IBGE de SP', () => {
      expect(getCodigoUF('SP')).toBe('35');
    });

    it('deve retornar código IBGE de AL', () => {
      expect(getCodigoUF('AL')).toBe('27');
    });

    it('deve retornar null para UF não suportada', () => {
      expect(getCodigoUF('XX')).toBeNull();
    });
  });

  describe('getAutorizadorUF()', () => {
    it('deve retornar PROPRIO para SP', () => {
      expect(getAutorizadorUF('SP')).toBe('PROPRIO');
    });

    it('deve retornar SVRS para AL', () => {
      expect(getAutorizadorUF('AL')).toBe('SVRS');
    });

    it('deve retornar null para UF não suportada', () => {
      expect(getAutorizadorUF('XX')).toBeNull();
    });
  });

  describe('UF_CONFIG', () => {
    it('deve ter configuração de SP', () => {
      expect(UF_CONFIG.SP).toBeDefined();
      expect(UF_CONFIG.SP.nome).toBe('São Paulo');
      expect(UF_CONFIG.SP.codigo).toBe('35');
    });

    it('deve ter configuração de AL', () => {
      expect(UF_CONFIG.AL).toBeDefined();
      expect(UF_CONFIG.AL.nome).toBe('Alagoas');
      expect(UF_CONFIG.AL.codigo).toBe('27');
    });
  });
});


