/**
 * Validador Fiscal
 * Valida conformidade com ITG 2002, NFC Cidadã (70/30), SEFAZ
 */

import type {
  ContextoAuditoria,
  ResultadoValidacao,
  Validador,
  DadosTitulo,
} from '../types';
import { formatarMoeda, formatarData } from '../types';
import { CONFIG } from '../rules/config';

export class ValidadorFiscal implements Validador {
  modulo = 'fiscal' as const;
  nome = 'Validador Fiscal';
  descricao = 'Valida conformidade fiscal: ITG 2002, NFC Cidadã, documentação';
  regras = [];
  
  async executar(ctx: ContextoAuditoria): Promise<ResultadoValidacao[]> {
    const resultados: ResultadoValidacao[] = [];
    
    resultados.push(...this.validarDistribuicaoNFC(ctx));
    resultados.push(...this.validarRegimeCompetencia(ctx));
    resultados.push(...this.validarDespesasSemDocumento(ctx));
    resultados.push(...this.validarReceitasNaoClassificadas(ctx));
    
    return resultados;
  }
  
  private validarDistribuicaoNFC(ctx: ContextoAuditoria): ResultadoValidacao[] {
    const resultados: ResultadoValidacao[] = [];
    
    // Agrupar títulos por mês/ano para verificar distribuição
    const porMes = new Map<string, { projeto: number; custeio: number; total: number }>();
    
    for (const titulo of ctx.titulos) {
      if (titulo.tipo !== 'receber') continue;
      
      const data = new Date(titulo.dataCompetencia);
      const chave = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
      
      if (!porMes.has(chave)) {
        porMes.set(chave, { projeto: 0, custeio: 0, total: 0 });
      }
      
      const valores = porMes.get(chave)!;
      valores.total += titulo.valorLiquido;
      
      // Classificar como projeto ou custeio baseado na natureza
      // (simplificado - em produção seria necessário tag específica para NFC)
      if (titulo.natureza === 'evento' || titulo.natureza === 'convenio') {
        valores.projeto += titulo.valorLiquido;
      } else {
        valores.custeio += titulo.valorLiquido;
      }
    }
    
    // Verificar proporção 70/30 para meses com receitas significativas
    for (const [chave, valores] of porMes) {
      if (valores.total < 1000) continue; // Ignorar meses com poucos valores
      
      const percentualProjeto = (valores.projeto / valores.total) * 100;
      const percentualCusteio = (valores.custeio / valores.total) * 100;
      
      // Esta é uma verificação informativa - NFC real requer rastreamento específico
      if (valores.projeto > 0 && percentualProjeto < 60) {
        resultados.push({
          regraId: 'FIS-001',
          regraNome: 'NFC - Distribuição 70/30',
          severidade: 'info',
          categoria: 'fiscal',
          mensagem: `Período ${chave}: Receitas de projeto ${percentualProjeto.toFixed(1)}% (recomendado ≥70% para NFC)`,
          entidade: 'periodo',
          valorAtual: percentualProjeto.toFixed(1) + '%',
          valorEsperado: '70%',
          sugestao: 'Verifique a classificação de receitas para conformidade NFC',
        });
      }
    }
    
    return resultados;
  }
  
  private validarRegimeCompetencia(ctx: ContextoAuditoria): ResultadoValidacao[] {
    const resultados: ResultadoValidacao[] = [];
    
    for (const titulo of ctx.titulos) {
      const dataEmissao = new Date(titulo.dataEmissao);
      const dataCompetencia = new Date(titulo.dataCompetencia);
      
      // Verificar se competência é posterior à emissão (incorreto)
      if (dataCompetencia < dataEmissao) {
        const diffDias = Math.floor((dataEmissao.getTime() - dataCompetencia.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDias > 30) { // Tolerância de 30 dias para ajustes
          resultados.push({
            regraId: 'FIS-002',
            regraNome: 'ITG 2002 - Regime de Competência',
            severidade: 'erro',
            categoria: 'fiscal',
            mensagem: `Título com competência ${diffDias} dias antes da emissão: ${titulo.descricao}`,
            entidade: 'titulo',
            entidadeId: titulo.id,
            valorAtual: formatarData(dataCompetencia),
            valorEsperado: formatarData(dataEmissao),
            sugestao: 'Ajuste a data de competência conforme regime de competência (ITG 2002)',
          });
        }
      }
    }
    
    return resultados;
  }
  
  private validarDespesasSemDocumento(ctx: ContextoAuditoria): ResultadoValidacao[] {
    const resultados: ResultadoValidacao[] = [];
    
    const despesas = ctx.titulos.filter(t => t.tipo === 'pagar');
    
    for (const titulo of despesas) {
      // Verificar se tem documento de referência nas baixas ou no próprio título
      const temDocumento = titulo.baixas.some(b => b.contaFinanceiraId) || 
                          titulo.sourceSystem;
      
      // Despesas sem fonte conhecida (sem importação ou sem referência)
      if (!temDocumento && titulo.valorLiquido > 100) {
        resultados.push({
          regraId: 'FIS-003',
          regraNome: 'Despesa Sem Documento',
          severidade: 'aviso',
          categoria: 'fiscal',
          mensagem: `Despesa sem documento fiscal: ${titulo.descricao} - ${formatarMoeda(titulo.valorLiquido)}`,
          entidade: 'titulo',
          entidadeId: titulo.id,
          valorAtual: titulo.valorLiquido,
          sugestao: 'Anexe nota fiscal ou recibo para documentar a despesa',
        });
      }
    }
    
    return resultados;
  }
  
  private validarReceitasNaoClassificadas(ctx: ContextoAuditoria): ResultadoValidacao[] {
    const resultados: ResultadoValidacao[] = [];
    
    const receitas = ctx.titulos.filter(t => t.tipo === 'receber');
    
    for (const titulo of receitas) {
      if (titulo.natureza === 'outros' && titulo.valorLiquido > 50) {
        resultados.push({
          regraId: 'FIS-005',
          regraNome: 'Receita Não Classificada',
          severidade: 'aviso',
          categoria: 'fiscal',
          mensagem: `Receita classificada como 'outros': ${titulo.descricao} - ${formatarMoeda(titulo.valorLiquido)}`,
          entidade: 'titulo',
          entidadeId: titulo.id,
          sugestao: 'Classifique como doação, contribuição, evento ou convênio',
        });
      }
    }
    
    return resultados;
  }
}

