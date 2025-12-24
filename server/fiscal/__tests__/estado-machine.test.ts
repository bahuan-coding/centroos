/**
 * Testes - Máquina de Estados
 * 
 * Ref: docs/spec-fiscal/02-maquina-de-estados-unificada.md
 */

import { describe, it, expect } from 'vitest';
import {
  MaquinaEstadoFiscal,
  podeTransitar,
  isEstadoFinal,
  estadoDeResposta,
  estadoDeStatusSP,
  estadoDeStatusADN,
} from '../estado-machine';
import { EstadoDocumentoFiscal } from '../types';

describe('Máquina de Estados Fiscal', () => {
  describe('Transições básicas', () => {
    it('deve iniciar em RASCUNHO', () => {
      const maquina = new MaquinaEstadoFiscal();
      expect(maquina.estadoAtual).toBe(EstadoDocumentoFiscal.RASCUNHO);
    });

    it('deve transitar de RASCUNHO para VALIDADO', () => {
      const maquina = new MaquinaEstadoFiscal();
      
      const transicao = maquina.transitar(EstadoDocumentoFiscal.VALIDADO, 'Validação OK');
      
      expect(maquina.estadoAtual).toBe(EstadoDocumentoFiscal.VALIDADO);
      expect(transicao.de).toBe(EstadoDocumentoFiscal.RASCUNHO);
      expect(transicao.para).toBe(EstadoDocumentoFiscal.VALIDADO);
    });

    it('deve transitar de VALIDADO para TRANSMITIDO', () => {
      const maquina = new MaquinaEstadoFiscal(EstadoDocumentoFiscal.VALIDADO);
      
      maquina.transitar(EstadoDocumentoFiscal.TRANSMITIDO, 'Enviado para autoridade');
      
      expect(maquina.estadoAtual).toBe(EstadoDocumentoFiscal.TRANSMITIDO);
    });

    it('deve transitar de TRANSMITIDO para AUTORIZADO', () => {
      const maquina = new MaquinaEstadoFiscal(EstadoDocumentoFiscal.TRANSMITIDO);
      
      maquina.transitar(EstadoDocumentoFiscal.AUTORIZADO, 'Autorizado pela SEFAZ');
      
      expect(maquina.estadoAtual).toBe(EstadoDocumentoFiscal.AUTORIZADO);
    });

    it('deve transitar de AUTORIZADO para CANCELADO', () => {
      const maquina = new MaquinaEstadoFiscal(EstadoDocumentoFiscal.AUTORIZADO);
      
      maquina.transitar(EstadoDocumentoFiscal.CANCELADO, 'Cancelamento solicitado');
      
      expect(maquina.estadoAtual).toBe(EstadoDocumentoFiscal.CANCELADO);
    });
  });

  describe('Transições inválidas', () => {
    it('deve lançar erro ao tentar transição inválida', () => {
      const maquina = new MaquinaEstadoFiscal(EstadoDocumentoFiscal.RASCUNHO);
      
      expect(() => {
        maquina.transitar(EstadoDocumentoFiscal.AUTORIZADO, 'Pular etapas');
      }).toThrow();
    });

    it('deve lançar erro ao tentar sair de estado final', () => {
      const maquina = new MaquinaEstadoFiscal(EstadoDocumentoFiscal.CANCELADO);
      
      expect(() => {
        maquina.transitar(EstadoDocumentoFiscal.AUTORIZADO, 'Tentativa inválida');
      }).toThrow();
    });
  });

  describe('Histórico', () => {
    it('deve manter histórico de transições', () => {
      const maquina = new MaquinaEstadoFiscal();
      
      maquina.transitar(EstadoDocumentoFiscal.VALIDADO, 'Validado');
      maquina.transitar(EstadoDocumentoFiscal.TRANSMITIDO, 'Transmitido');
      maquina.transitar(EstadoDocumentoFiscal.AUTORIZADO, 'Autorizado');
      
      const historico = maquina.historico;
      
      expect(historico).toHaveLength(3);
      expect(historico[0].para).toBe(EstadoDocumentoFiscal.VALIDADO);
      expect(historico[1].para).toBe(EstadoDocumentoFiscal.TRANSMITIDO);
      expect(historico[2].para).toBe(EstadoDocumentoFiscal.AUTORIZADO);
    });
  });

  describe('Verificações', () => {
    it('podeTransitar deve retornar true para transição válida', () => {
      expect(podeTransitar(EstadoDocumentoFiscal.RASCUNHO, EstadoDocumentoFiscal.VALIDADO)).toBe(true);
    });

    it('podeTransitar deve retornar false para transição inválida', () => {
      expect(podeTransitar(EstadoDocumentoFiscal.RASCUNHO, EstadoDocumentoFiscal.AUTORIZADO)).toBe(false);
    });

    it('isEstadoFinal deve identificar estados finais', () => {
      expect(isEstadoFinal(EstadoDocumentoFiscal.CANCELADO)).toBe(true);
      expect(isEstadoFinal(EstadoDocumentoFiscal.REJEITADO)).toBe(true);
      expect(isEstadoFinal(EstadoDocumentoFiscal.DENEGADO)).toBe(true);
      expect(isEstadoFinal(EstadoDocumentoFiscal.SUBSTITUIDO)).toBe(true);
      expect(isEstadoFinal(EstadoDocumentoFiscal.INUTILIZADO)).toBe(true);
    });

    it('isEstadoFinal deve retornar false para estados intermediários', () => {
      expect(isEstadoFinal(EstadoDocumentoFiscal.RASCUNHO)).toBe(false);
      expect(isEstadoFinal(EstadoDocumentoFiscal.VALIDADO)).toBe(false);
      expect(isEstadoFinal(EstadoDocumentoFiscal.TRANSMITIDO)).toBe(false);
      expect(isEstadoFinal(EstadoDocumentoFiscal.AUTORIZADO)).toBe(false);
    });
  });

  describe('Mapeamentos de resposta', () => {
    it('estadoDeResposta deve retornar AUTORIZADO para sucesso', () => {
      expect(estadoDeResposta('NFE', true)).toBe(EstadoDocumentoFiscal.AUTORIZADO);
    });

    it('estadoDeResposta deve retornar REJEITADO para erro', () => {
      expect(estadoDeResposta('NFE', false, 100)).toBe(EstadoDocumentoFiscal.REJEITADO);
    });

    it('estadoDeResposta deve retornar DENEGADO para cStat 301-302', () => {
      expect(estadoDeResposta('NFE', false, 301)).toBe(EstadoDocumentoFiscal.DENEGADO);
      expect(estadoDeResposta('NFE', false, 302)).toBe(EstadoDocumentoFiscal.DENEGADO);
    });

    it('estadoDeStatusSP deve mapear corretamente', () => {
      expect(estadoDeStatusSP('N')).toBe(EstadoDocumentoFiscal.AUTORIZADO);
      expect(estadoDeStatusSP('C')).toBe(EstadoDocumentoFiscal.CANCELADO);
    });

    it('estadoDeStatusADN deve mapear corretamente', () => {
      expect(estadoDeStatusADN('normal')).toBe(EstadoDocumentoFiscal.AUTORIZADO);
      expect(estadoDeStatusADN('cancelada')).toBe(EstadoDocumentoFiscal.CANCELADO);
      expect(estadoDeStatusADN('substituida')).toBe(EstadoDocumentoFiscal.SUBSTITUIDO);
    });
  });

  describe('Forçar estado', () => {
    it('deve permitir forçar estado para conciliação', () => {
      const maquina = new MaquinaEstadoFiscal(EstadoDocumentoFiscal.TRANSMITIDO);
      
      const transicao = maquina.forcarEstado(
        EstadoDocumentoFiscal.CANCELADO, 
        'Sincronizado com autoridade'
      );
      
      expect(maquina.estadoAtual).toBe(EstadoDocumentoFiscal.CANCELADO);
      expect(transicao.motivo).toContain('[FORÇADO]');
    });
  });
});


