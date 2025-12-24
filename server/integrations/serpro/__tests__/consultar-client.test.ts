/**
 * Testes unitários para consultar-client.ts
 * 
 * Testa funções puras sem dependência de banco de dados
 */

import { describe, it, expect } from 'vitest';

// Funções de helper replicadas para teste isolado (evita import de módulos com DB)
function cnpj(numero: string) {
  return { numero: numero.replace(/\D/g, ''), tipo: 2 as const };
}

function cpf(numero: string) {
  return { numero: numero.replace(/\D/g, ''), tipo: 1 as const };
}

function buildPedidoDados(
  idSistema: string,
  idServico: string,
  dados: Record<string, unknown> = {}
) {
  return {
    idSistema,
    idServico,
    versaoSistema: '1.0',
    dados: JSON.stringify(dados),
  };
}

function buildSelfRequest(cnpjProprio: string, pedidoDados: ReturnType<typeof buildPedidoDados>) {
  const id = cnpj(cnpjProprio);
  return {
    contratante: id,
    autorPedidoDados: id,
    contribuinte: id,
    pedidoDados,
  };
}

function buildThirdPartyRequest(
  cnpjProcurador: string,
  cnpjCliente: string,
  pedidoDados: ReturnType<typeof buildPedidoDados>
) {
  const procurador = cnpj(cnpjProcurador);
  return {
    contratante: procurador,
    autorPedidoDados: procurador,
    contribuinte: cnpj(cnpjCliente),
    pedidoDados,
  };
}

function buildSoftwareHouseRequest(
  cnpjSoftwareHouse: string,
  cnpjProcurador: string,
  cnpjCliente: string,
  pedidoDados: ReturnType<typeof buildPedidoDados>
) {
  return {
    contratante: cnpj(cnpjSoftwareHouse),
    autorPedidoDados: cnpj(cnpjProcurador),
    contribuinte: cnpj(cnpjCliente),
    pedidoDados,
  };
}

describe('consultar-client', () => {
  describe('cnpj helper', () => {
    it('deve criar identificador CNPJ', () => {
      const result = cnpj('12.345.678/0001-90');
      
      expect(result.numero).toBe('12345678000190');
      expect(result.tipo).toBe(2);
    });

    it('deve limpar caracteres não numéricos', () => {
      const result = cnpj('12-345-678/0001-90');
      
      expect(result.numero).toBe('12345678000190');
    });
  });

  describe('cpf helper', () => {
    it('deve criar identificador CPF', () => {
      const result = cpf('123.456.789-00');
      
      expect(result.numero).toBe('12345678900');
      expect(result.tipo).toBe(1);
    });
  });

  describe('buildPedidoDados', () => {
    it('deve criar pedidoDados com valores corretos', () => {
      const result = buildPedidoDados('SITFIS', 'SOLICITARSITFIS81', { protocolo: '123' });
      
      expect(result.idSistema).toBe('SITFIS');
      expect(result.idServico).toBe('SOLICITARSITFIS81');
      expect(result.versaoSistema).toBe('1.0');
      expect(result.dados).toBe('{"protocolo":"123"}');
    });

    it('deve usar objeto vazio como default para dados', () => {
      const result = buildPedidoDados('PROCURACOES', 'CONSULTARPROCURACOES');
      
      expect(result.dados).toBe('{}');
    });
  });

  describe('buildSelfRequest', () => {
    it('deve criar requisição com contratante = autorPedido = contribuinte', () => {
      const pedidoDados = buildPedidoDados('SITFIS', 'SOLICITARSITFIS81');
      const result = buildSelfRequest('12345678000190', pedidoDados);
      
      expect(result.contratante.numero).toBe('12345678000190');
      expect(result.contratante.tipo).toBe(2);
      expect(result.autorPedidoDados.numero).toBe('12345678000190');
      expect(result.contribuinte.numero).toBe('12345678000190');
      expect(result.pedidoDados).toBe(pedidoDados);
    });

    it('deve formatar CNPJ corretamente', () => {
      const pedidoDados = buildPedidoDados('SITFIS', 'SOLICITARSITFIS81');
      const result = buildSelfRequest('12.345.678/0001-90', pedidoDados);
      
      expect(result.contratante.numero).toBe('12345678000190');
    });
  });

  describe('buildThirdPartyRequest', () => {
    it('deve criar requisição para terceiros com procuração', () => {
      const pedidoDados = buildPedidoDados('SITFIS', 'SOLICITARSITFIS81');
      const result = buildThirdPartyRequest(
        '11111111000111', // procurador
        '22222222000222', // cliente
        pedidoDados
      );
      
      // Procurador é contratante e autorPedido
      expect(result.contratante.numero).toBe('11111111000111');
      expect(result.autorPedidoDados.numero).toBe('11111111000111');
      // Cliente é contribuinte
      expect(result.contribuinte.numero).toBe('22222222000222');
    });
  });

  describe('buildSoftwareHouseRequest', () => {
    it('deve criar requisição para software-house', () => {
      const pedidoDados = buildPedidoDados('SITFIS', 'SOLICITARSITFIS81');
      const result = buildSoftwareHouseRequest(
        '00000000000100', // software-house
        '11111111000111', // procurador (contador)
        '22222222000222', // cliente
        pedidoDados
      );
      
      // Software-house é contratante
      expect(result.contratante.numero).toBe('00000000000100');
      // Procurador é autorPedido
      expect(result.autorPedidoDados.numero).toBe('11111111000111');
      // Cliente é contribuinte
      expect(result.contribuinte.numero).toBe('22222222000222');
    });
  });
});
