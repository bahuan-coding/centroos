/**
 * Validador Contábil
 * Valida partidas dobradas, períodos, saldos e lançamentos
 */

import type {
  ContextoAuditoria,
  ResultadoValidacao,
  Validador,
  DadosLancamento,
  DadosPeriodo,
} from '../types';
import { formatarMoeda, formatarData } from '../types';
import { CONFIG } from '../rules/config';

export class ValidadorContabil implements Validador {
  modulo = 'contabil' as const;
  nome = 'Validador Contábil';
  descricao = 'Valida partidas dobradas, períodos e lançamentos contábeis';
  regras = [];
  
  async executar(ctx: ContextoAuditoria): Promise<ResultadoValidacao[]> {
    const resultados: ResultadoValidacao[] = [];
    
    resultados.push(...this.validarPartidasDobradas(ctx));
    resultados.push(...this.validarPeriodosFechados(ctx));
    resultados.push(...this.validarLancamentosSemHistorico(ctx));
    resultados.push(...this.validarPeriodosAbertos(ctx));
    
    return resultados;
  }
  
  private validarPartidasDobradas(ctx: ContextoAuditoria): ResultadoValidacao[] {
    const resultados: ResultadoValidacao[] = [];
    
    for (const lancamento of ctx.lancamentos) {
      const diferenca = Math.abs(lancamento.totalDebito - lancamento.totalCredito);
      
      if (diferenca > CONFIG.toleranciaValor) {
        resultados.push({
          regraId: 'CTB-001',
          regraNome: 'Partida Desbalanceada',
          severidade: 'erro',
          categoria: 'contabil',
          mensagem: `Lançamento #${lancamento.numero} desbalanceado: Débito ${formatarMoeda(lancamento.totalDebito)} ≠ Crédito ${formatarMoeda(lancamento.totalCredito)}`,
          entidade: 'lancamento',
          entidadeId: lancamento.id,
          valorAtual: lancamento.totalDebito,
          valorEsperado: lancamento.totalCredito,
          sugestao: 'Corrija as linhas do lançamento para que débitos = créditos',
        });
      }
    }
    
    return resultados;
  }
  
  private validarPeriodosFechados(ctx: ContextoAuditoria): ResultadoValidacao[] {
    const resultados: ResultadoValidacao[] = [];
    
    // Criar mapa de períodos por ano-mês
    const periodosPorMes = new Map<string, DadosPeriodo>();
    for (const periodo of ctx.periodos) {
      periodosPorMes.set(`${periodo.ano}-${periodo.mes}`, periodo);
    }
    
    // Verificar lançamentos em períodos fechados
    for (const lancamento of ctx.lancamentos) {
      const dataComp = new Date(lancamento.dataCompetencia);
      const ano = dataComp.getFullYear();
      const mes = dataComp.getMonth() + 1;
      
      const periodo = periodosPorMes.get(`${ano}-${mes}`);
      
      if (periodo && periodo.status === 'fechado') {
        resultados.push({
          regraId: 'CTB-002',
          regraNome: 'Lançamento em Período Fechado',
          severidade: 'erro',
          categoria: 'contabil',
          mensagem: `Lançamento #${lancamento.numero} em período fechado (${mes}/${ano})`,
          entidade: 'lancamento',
          entidadeId: lancamento.id,
          sugestao: 'Reabra o período ou ajuste a data de competência',
        });
      }
    }
    
    return resultados;
  }
  
  private validarLancamentosSemHistorico(ctx: ContextoAuditoria): ResultadoValidacao[] {
    const resultados: ResultadoValidacao[] = [];
    
    for (const lancamento of ctx.lancamentos) {
      if (!lancamento.historico || lancamento.historico.trim().length < 10) {
        resultados.push({
          regraId: 'CTB-006',
          regraNome: 'Lançamento Sem Histórico',
          severidade: 'aviso',
          categoria: 'contabil',
          mensagem: `Lançamento #${lancamento.numero} sem histórico adequado`,
          entidade: 'lancamento',
          entidadeId: lancamento.id,
          valorAtual: lancamento.historico || '(vazio)',
          sugestao: 'Adicione um histórico descritivo com pelo menos 10 caracteres',
        });
      }
    }
    
    return resultados;
  }
  
  private validarPeriodosAbertos(ctx: ContextoAuditoria): ResultadoValidacao[] {
    const resultados: ResultadoValidacao[] = [];
    
    const hoje = new Date();
    const anoAtual = hoje.getFullYear();
    const mesAtual = hoje.getMonth() + 1;
    
    for (const periodo of ctx.periodos) {
      // Verificar se é um período passado que deveria estar fechado
      const isPeriodoPassado = 
        periodo.ano < anoAtual || 
        (periodo.ano === anoAtual && periodo.mes < mesAtual - 1); // Permite mês anterior aberto
      
      if (isPeriodoPassado && periodo.status === 'aberto') {
        resultados.push({
          regraId: 'CTB-004',
          regraNome: 'Período Sem Fechamento',
          severidade: 'aviso',
          categoria: 'contabil',
          mensagem: `Período ${periodo.mes}/${periodo.ano} ainda está aberto`,
          entidade: 'periodo',
          entidadeId: periodo.id,
          sugestao: 'Revise os lançamentos e feche o período',
        });
      }
    }
    
    return resultados;
  }
}

