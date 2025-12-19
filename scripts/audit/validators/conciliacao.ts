/**
 * Validador de Conciliação Bancária
 * Cruza extratos bancários com títulos e lançamentos
 */

import type {
  ContextoAuditoria,
  ResultadoValidacao,
  Validador,
  DadosExtrato,
  DadosTitulo,
} from '../types';
import { formatarMoeda, formatarData } from '../types';
import { CONFIG } from '../rules/config';

export class ValidadorConciliacao implements Validador {
  modulo = 'conciliacao' as const;
  nome = 'Validador de Conciliação';
  descricao = 'Valida conciliação bancária entre extratos e títulos';
  regras = [];
  
  async executar(ctx: ContextoAuditoria): Promise<ResultadoValidacao[]> {
    const resultados: ResultadoValidacao[] = [];
    
    resultados.push(...this.validarExtratosNaoConciliados(ctx));
    resultados.push(...this.validarValoresDivergentes(ctx));
    resultados.push(...this.validarDatasDivergentes(ctx));
    
    return resultados;
  }
  
  private validarExtratosNaoConciliados(ctx: ContextoAuditoria): ResultadoValidacao[] {
    const resultados: ResultadoValidacao[] = [];
    
    const naoConcialiados = ctx.extratos.filter(e => !e.conciliado && e.status === 'pendente');
    
    // Limitar a 50 resultados para não poluir o relatório
    const amostra = naoConcialiados.slice(0, 50);
    
    for (const extrato of amostra) {
      resultados.push({
        regraId: 'CON-001',
        regraNome: 'Extrato Não Conciliado',
        severidade: 'aviso',
        categoria: 'conciliacao',
        mensagem: `Linha de extrato pendente: ${extrato.contaNome} - ${formatarData(extrato.dataMovimento)} - ${formatarMoeda(extrato.valor)}`,
        entidade: 'extrato',
        entidadeId: extrato.id,
        valorAtual: extrato.valor,
        sugestao: 'Vincule a um título ou marque como ignorado',
      });
    }
    
    if (naoConcialiados.length > 50) {
      resultados.push({
        regraId: 'CON-001',
        regraNome: 'Extrato Não Conciliado',
        severidade: 'info',
        categoria: 'conciliacao',
        mensagem: `... e mais ${naoConcialiados.length - 50} linhas não conciliadas`,
        entidade: 'extrato',
      });
    }
    
    return resultados;
  }
  
  private validarValoresDivergentes(ctx: ContextoAuditoria): ResultadoValidacao[] {
    const resultados: ResultadoValidacao[] = [];
    
    // Criar mapa de títulos por ID
    const titulosPorId = new Map<string, DadosTitulo>();
    for (const titulo of ctx.titulos) {
      titulosPorId.set(titulo.id, titulo);
    }
    
    // Verificar extratos conciliados
    const conciliados = ctx.extratos.filter(e => e.conciliado && e.tituloVinculadoId);
    
    for (const extrato of conciliados) {
      const titulo = titulosPorId.get(extrato.tituloVinculadoId!);
      
      if (titulo) {
        const diferenca = Math.abs(extrato.valor - titulo.valorLiquido);
        
        if (diferenca > CONFIG.toleranciaValor) {
          resultados.push({
            regraId: 'CON-002',
            regraNome: 'Valor Divergente',
            severidade: 'erro',
            categoria: 'conciliacao',
            mensagem: `Valor do extrato (${formatarMoeda(extrato.valor)}) difere do título (${formatarMoeda(titulo.valorLiquido)})`,
            entidade: 'extrato',
            entidadeId: extrato.id,
            valorAtual: extrato.valor,
            valorEsperado: titulo.valorLiquido,
            sugestao: 'Verifique se o vínculo está correto ou ajuste os valores',
          });
        }
      }
    }
    
    return resultados;
  }
  
  private validarDatasDivergentes(ctx: ContextoAuditoria): ResultadoValidacao[] {
    const resultados: ResultadoValidacao[] = [];
    
    // Criar mapa de títulos por ID com suas baixas
    const titulosPorId = new Map<string, DadosTitulo>();
    for (const titulo of ctx.titulos) {
      titulosPorId.set(titulo.id, titulo);
    }
    
    // Verificar extratos conciliados
    const conciliados = ctx.extratos.filter(e => e.conciliado && e.tituloVinculadoId);
    
    for (const extrato of conciliados) {
      const titulo = titulosPorId.get(extrato.tituloVinculadoId!);
      
      if (titulo && titulo.baixas.length > 0) {
        const baixa = titulo.baixas[0];
        const dataExtrato = new Date(extrato.dataMovimento);
        const dataBaixa = new Date(baixa.dataPagamento);
        
        const diffDias = Math.abs(
          Math.floor((dataExtrato.getTime() - dataBaixa.getTime()) / (1000 * 60 * 60 * 24))
        );
        
        if (diffDias > CONFIG.toleranciaDias && diffDias <= 30) {
          resultados.push({
            regraId: 'CON-003',
            regraNome: 'Data Divergente',
            severidade: 'aviso',
            categoria: 'conciliacao',
            mensagem: `Data do extrato (${formatarData(extrato.dataMovimento)}) difere da baixa (${formatarData(baixa.dataPagamento)}) em ${diffDias} dias`,
            entidade: 'extrato',
            entidadeId: extrato.id,
            valorAtual: formatarData(extrato.dataMovimento),
            valorEsperado: formatarData(baixa.dataPagamento),
            sugestao: 'Verifique as datas de compensação',
          });
        }
      }
    }
    
    return resultados;
  }
}

