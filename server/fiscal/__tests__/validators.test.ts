/**
 * Testes - Validadores
 * 
 * Ref: docs/spec-fiscal/03-contratos-canonicos.md
 */

import { describe, it, expect } from 'vitest';
import {
  validarCpf,
  validarCnpj,
  validarCpfCnpj,
  validarCodigoMunicipio,
  validarUF,
  validarCEP,
  validarNCM,
  validarCFOP,
  validarData,
  validarDataNaoFutura,
  validarValorMonetario,
  validarAliquota,
} from '../validators/comum';
import { validarRPSSP, converterCodigoLC116ParaSP } from '../validators/nfse-sp';

describe('Validadores Comuns', () => {
  describe('CPF', () => {
    it('deve validar CPF válido', () => {
      expect(validarCpf('52998224725')).toBe(true);
      expect(validarCpf('529.982.247-25')).toBe(true);
    });

    it('deve rejeitar CPF inválido', () => {
      expect(validarCpf('00000000000')).toBe(false);
      expect(validarCpf('12345678901')).toBe(false);
      expect(validarCpf('123')).toBe(false);
    });
  });

  describe('CNPJ', () => {
    it('deve validar CNPJ válido', () => {
      expect(validarCnpj('11222333000181')).toBe(true);
      expect(validarCnpj('11.222.333/0001-81')).toBe(true);
    });

    it('deve rejeitar CNPJ inválido', () => {
      expect(validarCnpj('00000000000000')).toBe(false);
      expect(validarCnpj('12345678000190')).toBe(false);
      expect(validarCnpj('123')).toBe(false);
    });
  });

  describe('CPF/CNPJ automático', () => {
    it('deve identificar e validar CPF', () => {
      expect(validarCpfCnpj('52998224725')).toBe(true);
    });

    it('deve identificar e validar CNPJ', () => {
      expect(validarCpfCnpj('11222333000181')).toBe(true);
    });

    it('deve rejeitar documento inválido', () => {
      expect(validarCpfCnpj('123')).toBe(false);
      expect(validarCpfCnpj('')).toBe(false);
    });
  });

  describe('Códigos', () => {
    it('deve validar código de município', () => {
      expect(validarCodigoMunicipio('3550308')).toBe(true); // São Paulo
      expect(validarCodigoMunicipio('3106200')).toBe(true); // Belo Horizonte
      expect(validarCodigoMunicipio('1234567')).toBe(true);
    });

    it('deve rejeitar código de município inválido', () => {
      expect(validarCodigoMunicipio('123')).toBe(false);
      expect(validarCodigoMunicipio('12345678')).toBe(false);
      expect(validarCodigoMunicipio('0000000')).toBe(false);
      expect(validarCodigoMunicipio('6000000')).toBe(false);
    });

    it('deve validar UF', () => {
      expect(validarUF('SP')).toBe(true);
      expect(validarUF('RJ')).toBe(true);
      expect(validarUF('MG')).toBe(true);
    });

    it('deve rejeitar UF inválida', () => {
      expect(validarUF('XX')).toBe(false);
      expect(validarUF('S')).toBe(false);
      expect(validarUF('SPP')).toBe(false);
    });

    it('deve validar CEP', () => {
      expect(validarCEP('01310100')).toBe(true);
      expect(validarCEP('01310-100')).toBe(true);
    });

    it('deve rejeitar CEP inválido', () => {
      expect(validarCEP('123')).toBe(false);
      expect(validarCEP('123456789')).toBe(false);
    });

    it('deve validar NCM', () => {
      expect(validarNCM('84715010')).toBe(true);
      expect(validarNCM('22011000')).toBe(true);
    });

    it('deve rejeitar NCM inválido', () => {
      expect(validarNCM('123')).toBe(false);
      expect(validarNCM('123456789')).toBe(false);
    });

    it('deve validar CFOP', () => {
      expect(validarCFOP('5102')).toBe(true);
      expect(validarCFOP('6102')).toBe(true);
      expect(validarCFOP('7101')).toBe(true);
    });

    it('deve rejeitar CFOP inválido', () => {
      expect(validarCFOP('123')).toBe(false);
      expect(validarCFOP('8102')).toBe(false);
      expect(validarCFOP('0102')).toBe(false);
    });
  });

  describe('Datas', () => {
    it('deve validar data válida', () => {
      expect(validarData(new Date())).toBe(true);
      expect(validarData('2024-01-15')).toBe(true);
    });

    it('deve rejeitar data inválida', () => {
      expect(validarData('invalid')).toBe(false);
      expect(validarData(new Date('invalid'))).toBe(false);
    });

    it('deve validar data não futura', () => {
      expect(validarDataNaoFutura(new Date())).toBe(true);
      expect(validarDataNaoFutura('2020-01-01')).toBe(true);
    });

    it('deve rejeitar data futura', () => {
      const futuro = new Date();
      futuro.setFullYear(futuro.getFullYear() + 1);
      expect(validarDataNaoFutura(futuro)).toBe(false);
    });
  });

  describe('Valores', () => {
    it('deve validar valor monetário válido', () => {
      expect(validarValorMonetario(100)).toBe(true);
      expect(validarValorMonetario(100.5)).toBe(true);
      expect(validarValorMonetario(100.55)).toBe(true);
      expect(validarValorMonetario(0)).toBe(true);
    });

    it('deve rejeitar valor monetário inválido', () => {
      expect(validarValorMonetario(-1)).toBe(false);
      expect(validarValorMonetario(100.555)).toBe(false);
    });

    it('deve validar alíquota válida', () => {
      expect(validarAliquota(5)).toBe(true);
      expect(validarAliquota(0)).toBe(true);
      expect(validarAliquota(100)).toBe(true);
    });

    it('deve rejeitar alíquota inválida', () => {
      expect(validarAliquota(-1)).toBe(false);
      expect(validarAliquota(101)).toBe(false);
    });
  });
});

describe('Validadores NFS-e SP', () => {
  describe('RPS', () => {
    it('deve validar RPS completo', () => {
      const resultado = validarRPSSP({
        serieRPS: 'A',
        numeroRPS: 1,
        dataEmissao: new Date(),
        tributacao: 'T',
        codigoServico: '01015',
        aliquota: 5,
        valorServicos: 1000,
        issRetido: false,
        discriminacao: 'Serviço prestado',
        tomador: {
          cpfCnpj: '52998224725',
        },
      });
      
      expect(resultado.valido).toBe(true);
      expect(resultado.erros).toHaveLength(0);
    });

    it('deve rejeitar RPS sem série', () => {
      const resultado = validarRPSSP({
        serieRPS: '',
        numeroRPS: 1,
        dataEmissao: new Date(),
        tributacao: 'T',
        codigoServico: '01015',
        aliquota: 5,
        valorServicos: 1000,
        issRetido: false,
        discriminacao: 'Serviço prestado',
        tomador: { cpfCnpj: '' },
      });
      
      expect(resultado.valido).toBe(false);
      expect(resultado.erros.some(e => e.campo === 'serieRPS')).toBe(true);
    });

    it('deve rejeitar série muito longa', () => {
      const resultado = validarRPSSP({
        serieRPS: 'ABCDEF',
        numeroRPS: 1,
        dataEmissao: new Date(),
        tributacao: 'T',
        codigoServico: '01015',
        aliquota: 5,
        valorServicos: 1000,
        issRetido: false,
        discriminacao: 'Serviço prestado',
        tomador: { cpfCnpj: '' },
      });
      
      expect(resultado.valido).toBe(false);
    });

    it('deve rejeitar discriminação muito longa', () => {
      const resultado = validarRPSSP({
        serieRPS: 'A',
        numeroRPS: 1,
        dataEmissao: new Date(),
        tributacao: 'T',
        codigoServico: '01015',
        aliquota: 5,
        valorServicos: 1000,
        issRetido: false,
        discriminacao: 'X'.repeat(2001),
        tomador: { cpfCnpj: '' },
      });
      
      expect(resultado.valido).toBe(false);
    });
  });

  describe('Conversão de código', () => {
    it('deve converter código LC 116 para SP', () => {
      expect(converterCodigoLC116ParaSP('01.08')).toBe('00108');
      expect(converterCodigoLC116ParaSP('17.23')).toBe('01723');
    });
  });
});


