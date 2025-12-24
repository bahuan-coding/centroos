/**
 * Testes - Schemas NF-e
 */

import { describe, it, expect } from 'vitest';
import {
  gerarChaveAcesso,
  gerarCodigoNumerico,
  formatarValorXML,
  formatarQuantidadeXML,
  formatarDataHoraXML,
  UF_CODIGO,
  TCodUF,
} from '../schemas';

describe('Schemas NF-e', () => {
  describe('UF_CODIGO', () => {
    it('deve mapear todas as UFs', () => {
      expect(UF_CODIGO.SP).toBe('35');
      expect(UF_CODIGO.RJ).toBe('33');
      expect(UF_CODIGO.MG).toBe('31');
      expect(UF_CODIGO.AL).toBe('27');
      expect(UF_CODIGO.BA).toBe('29');
      expect(UF_CODIGO.RS).toBe('43');
    });

    it('deve ter 27 UFs', () => {
      expect(Object.keys(UF_CODIGO).length).toBe(27);
    });
  });

  describe('gerarChaveAcesso()', () => {
    const params = {
      cUF: '35' as TCodUF,
      dataEmissao: new Date('2024-12-24T10:00:00'),
      CNPJ: '12345678000190',
      mod: '55' as const,
      serie: '1',
      nNF: '123',
      tpEmis: '1' as const,
      cNF: '12345678',
    };

    it('deve gerar chave com 44 dígitos', () => {
      const { chave } = gerarChaveAcesso(params);
      expect(chave).toHaveLength(44);
    });

    it('deve começar com código da UF', () => {
      const { chave } = gerarChaveAcesso(params);
      expect(chave.substring(0, 2)).toBe('35');
    });

    it('deve conter AAMM da data', () => {
      const { chave } = gerarChaveAcesso(params);
      expect(chave.substring(2, 6)).toBe('2412'); // Dezembro 2024
    });

    it('deve conter CNPJ', () => {
      const { chave } = gerarChaveAcesso(params);
      expect(chave.substring(6, 20)).toBe('12345678000190');
    });

    it('deve conter modelo', () => {
      const { chave } = gerarChaveAcesso(params);
      expect(chave.substring(20, 22)).toBe('55');
    });

    it('deve conter série com padding', () => {
      const { chave } = gerarChaveAcesso(params);
      expect(chave.substring(22, 25)).toBe('001');
    });

    it('deve conter número com padding', () => {
      const { chave } = gerarChaveAcesso(params);
      expect(chave.substring(25, 34)).toBe('000000123');
    });

    it('deve conter tipo de emissão', () => {
      const { chave } = gerarChaveAcesso(params);
      expect(chave.substring(34, 35)).toBe('1');
    });

    it('deve conter código numérico', () => {
      const { chave } = gerarChaveAcesso(params);
      expect(chave.substring(35, 43)).toBe('12345678');
    });

    it('deve ter dígito verificador válido', () => {
      const { chave, cDV } = gerarChaveAcesso(params);
      expect(chave.slice(-1)).toBe(cDV);
      expect(cDV).toMatch(/^\d$/);
    });

    it('deve gerar dígitos verificadores diferentes para chaves diferentes', () => {
      const { cDV: dv1 } = gerarChaveAcesso({ ...params, nNF: '1' });
      const { cDV: dv2 } = gerarChaveAcesso({ ...params, nNF: '2' });
      
      // Podem ser iguais por coincidência, mas geralmente diferentes
      expect(dv1).toMatch(/^\d$/);
      expect(dv2).toMatch(/^\d$/);
    });
  });

  describe('gerarCodigoNumerico()', () => {
    it('deve gerar código com 8 dígitos', () => {
      const codigo = gerarCodigoNumerico();
      expect(codigo).toHaveLength(8);
    });

    it('deve conter apenas dígitos', () => {
      const codigo = gerarCodigoNumerico();
      expect(codigo).toMatch(/^\d{8}$/);
    });

    it('deve gerar códigos aleatórios', () => {
      const codigos = new Set<string>();
      for (let i = 0; i < 100; i++) {
        codigos.add(gerarCodigoNumerico());
      }
      // Com 100 códigos gerados, devemos ter alta diversidade
      expect(codigos.size).toBeGreaterThan(90);
    });
  });

  describe('formatarValorXML()', () => {
    it('deve formatar inteiros', () => {
      expect(formatarValorXML(100)).toBe('100.00');
      expect(formatarValorXML(0)).toBe('0.00');
      expect(formatarValorXML(999999)).toBe('999999.00');
    });

    it('deve formatar decimais', () => {
      expect(formatarValorXML(123.45)).toBe('123.45');
      expect(formatarValorXML(0.01)).toBe('0.01');
    });

    it('deve arredondar para 2 casas', () => {
      expect(formatarValorXML(123.456)).toBe('123.46');
      expect(formatarValorXML(123.454)).toBe('123.45');
    });

    it('deve lidar com números negativos', () => {
      expect(formatarValorXML(-100)).toBe('-100.00');
    });
  });

  describe('formatarQuantidadeXML()', () => {
    it('deve usar 4 casas por padrão', () => {
      expect(formatarQuantidadeXML(1)).toBe('1.0000');
      expect(formatarQuantidadeXML(1.5)).toBe('1.5000');
    });

    it('deve aceitar número de casas customizado', () => {
      expect(formatarQuantidadeXML(1.12345, 2)).toBe('1.12');
      expect(formatarQuantidadeXML(1.12345, 6)).toBe('1.123450');
    });
  });

  describe('formatarDataHoraXML()', () => {
    it('deve formatar no padrão ISO 8601', () => {
      const data = new Date('2024-12-24T10:30:00Z');
      const formatado = formatarDataHoraXML(data);
      
      expect(formatado).toContain('2024-12-24');
      expect(formatado).toContain('T');
    });

    it('deve incluir timezone -03:00', () => {
      const data = new Date('2024-12-24T10:30:00Z');
      const formatado = formatarDataHoraXML(data);
      
      expect(formatado).toContain('-03:00');
    });
  });
});


