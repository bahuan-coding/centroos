/**
 * Validador de Rawdata
 * Compara totais mensais do rawdata com o banco de dados
 * Detecta transferências internas não filtradas e valida SEFAZ
 */

import type {
  ContextoAuditoria,
  ResultadoValidacao,
  Validador,
  DadosRawdata,
  DadosTitulo,
} from '../types';
import { formatarMoeda, getMesNome } from '../types';
import { CONFIG } from '../rules/config';

export class ValidadorRawdata implements Validador {
  modulo = 'doacoes' as const; // Integra com módulo de doações
  nome = 'Validador de Rawdata';
  descricao = 'Valida consistência entre rawdata original e banco de dados';
  regras = [];
  
  async executar(ctx: ContextoAuditoria): Promise<ResultadoValidacao[]> {
    const resultados: ResultadoValidacao[] = [];
    
    resultados.push(...this.validarTotaisMensais(ctx));
    resultados.push(...this.validarTransferenciasInternas(ctx));
    resultados.push(...this.validarPremiacoesSEFAZ(ctx));
    resultados.push(...this.validarDuplicatasRawdata(ctx));
    
    return resultados;
  }
  
  /**
   * Compara totais mensais do rawdata com o banco
   */
  private validarTotaisMensais(ctx: ContextoAuditoria): ResultadoValidacao[] {
    const resultados: ResultadoValidacao[] = [];
    
    for (const [chave, rawdataList] of ctx.rawdata) {
      const [mesNome] = chave.split('-');
      
      // Calcular totais do rawdata (excluindo transferências internas)
      const rawReceitas = rawdataList
        .filter(r => r.tipo !== 'transferencia_interna' && r.valorTotal > 0)
        .reduce((sum, r) => sum + r.valorTotal, 0);
      
      const rawDespesas = rawdataList
        .filter(r => r.tipo !== 'transferencia_interna' && r.valorTotal < 0)
        .reduce((sum, r) => sum + Math.abs(r.valorTotal), 0);
      
      // Calcular totais do banco para o mesmo mês
      const mesNum = this.getMesNumero(mesNome);
      const titulosMes = ctx.titulos.filter(t => {
        const data = new Date(t.dataCompetencia);
        return data.getMonth() + 1 === mesNum;
      });
      
      const dbReceitas = titulosMes
        .filter(t => t.tipo === 'receber')
        .reduce((sum, t) => sum + t.valorLiquido, 0);
      
      const dbDespesas = titulosMes
        .filter(t => t.tipo === 'pagar')
        .reduce((sum, t) => sum + t.valorLiquido, 0);
      
      // Verificar diferenças
      const diffReceitas = Math.abs(dbReceitas - rawReceitas);
      const diffDespesas = Math.abs(dbDespesas - rawDespesas);
      
      if (diffReceitas > 100) { // Tolerância de R$ 100
        resultados.push({
          regraId: 'RAW-001',
          regraNome: 'Divergência Receitas Mensais',
          severidade: diffReceitas > 1000 ? 'erro' : 'aviso',
          categoria: 'operacional',
          mensagem: `${mesNome}: Receitas divergem R$ ${diffReceitas.toFixed(2)} (Banco: ${formatarMoeda(dbReceitas)}, Rawdata: ${formatarMoeda(rawReceitas)})`,
          entidade: 'rawdata',
          arquivo: `rawdata_${mesNome}.csv`,
          valorAtual: dbReceitas,
          valorEsperado: rawReceitas,
          sugestao: 'Verifique lançamentos faltantes ou duplicados no banco',
        });
      }
      
      if (diffDespesas > 100) {
        resultados.push({
          regraId: 'RAW-002',
          regraNome: 'Divergência Despesas Mensais',
          severidade: diffDespesas > 1000 ? 'erro' : 'aviso',
          categoria: 'operacional',
          mensagem: `${mesNome}: Despesas divergem R$ ${diffDespesas.toFixed(2)} (Banco: ${formatarMoeda(dbDespesas)}, Rawdata: ${formatarMoeda(rawDespesas)})`,
          entidade: 'rawdata',
          arquivo: `rawdata_${mesNome}.csv`,
          valorAtual: dbDespesas,
          valorEsperado: rawDespesas,
          sugestao: 'Verifique lançamentos faltantes ou duplicados no banco',
        });
      }
    }
    
    return resultados;
  }
  
  /**
   * Detecta transferências internas BB Rende Fácil que entraram no banco como receita/despesa
   */
  private validarTransferenciasInternas(ctx: ContextoAuditoria): ResultadoValidacao[] {
    const resultados: ResultadoValidacao[] = [];
    
    // Procurar títulos que parecem transferências internas
    const padroesTransferencia = [
      'bb rende',
      'rende fácil',
      'renda fácil',
      'aplicação automática',
      'resgate automático',
    ];
    
    for (const titulo of ctx.titulos) {
      const desc = titulo.descricao.toLowerCase();
      const isTransferencia = padroesTransferencia.some(p => desc.includes(p));
      
      if (isTransferencia) {
        resultados.push({
          regraId: 'RAW-003',
          regraNome: 'Transferência Interna no Banco',
          severidade: 'erro',
          categoria: 'operacional',
          mensagem: `Título parece ser transferência interna: "${titulo.descricao}" - ${formatarMoeda(titulo.valorLiquido)}`,
          entidade: 'titulo',
          entidadeId: titulo.id,
          valorAtual: titulo.valorLiquido,
          sugestao: 'Remova este título - transferências BB Rende Fácil são movimentações internas',
        });
      }
    }
    
    return resultados;
  }
  
  /**
   * Valida se as premiações SEFAZ estão presentes no banco
   */
  private validarPremiacoesSEFAZ(ctx: ContextoAuditoria): ResultadoValidacao[] {
    const resultados: ResultadoValidacao[] = [];
    
    // Procurar premiações SEFAZ no rawdata
    for (const [chave, rawdataList] of ctx.rawdata) {
      const [mesNome] = chave.split('-');
      
      const premiacoes = rawdataList.filter(r => {
        const desc = r.descricao.toLowerCase();
        return desc.includes('sefaz') || 
               desc.includes('nfc') || 
               desc.includes('nota fiscal cidadã') ||
               desc.includes('premiação');
      });
      
      for (const premiacao of premiacoes) {
        // Verificar se existe título correspondente
        const mesNum = this.getMesNumero(mesNome);
        const tituloCorrespondente = ctx.titulos.find(t => {
          const data = new Date(t.dataCompetencia);
          const mesmoMes = data.getMonth() + 1 === mesNum;
          const mesmoValor = Math.abs(t.valorLiquido - Math.abs(premiacao.valorTotal)) <= CONFIG.toleranciaValor;
          const descSimilar = t.descricao.toLowerCase().includes('sefaz') || 
                              t.descricao.toLowerCase().includes('nfc') ||
                              t.descricao.toLowerCase().includes('premiação');
          return mesmoMes && mesmoValor && descSimilar;
        });
        
        if (!tituloCorrespondente && Math.abs(premiacao.valorTotal) > 100) {
          resultados.push({
            regraId: 'RAW-004',
            regraNome: 'Premiação SEFAZ Faltando',
            severidade: 'erro',
            categoria: 'fiscal',
            mensagem: `Premiação SEFAZ não encontrada no banco: ${premiacao.descricao} - ${formatarMoeda(Math.abs(premiacao.valorTotal))}`,
            entidade: 'rawdata',
            linha: premiacao.lineNumber,
            arquivo: `rawdata_${mesNome}.csv`,
            valorAtual: 0,
            valorEsperado: Math.abs(premiacao.valorTotal),
            sugestao: 'Insira o título de premiação SEFAZ/NFC no banco',
          });
        }
      }
    }
    
    return resultados;
  }
  
  /**
   * Detecta lançamentos duplicados no rawdata que podem ter sido importados múltiplas vezes
   */
  private validarDuplicatasRawdata(ctx: ContextoAuditoria): ResultadoValidacao[] {
    const resultados: ResultadoValidacao[] = [];
    
    for (const [chave, rawdataList] of ctx.rawdata) {
      const [mesNome] = chave.split('-');
      
      // Criar chave de identificação por data+valor+fornecedor
      const contagem = new Map<string, DadosRawdata[]>();
      
      for (const raw of rawdataList) {
        const dataStr = raw.data.toISOString().split('T')[0];
        const chaveItem = `${dataStr}|${Math.round(raw.valorTotal * 100)}|${raw.fornecedor.substring(0, 20)}`;
        
        if (!contagem.has(chaveItem)) {
          contagem.set(chaveItem, []);
        }
        contagem.get(chaveItem)!.push(raw);
      }
      
      for (const [, items] of contagem) {
        if (items.length > 1) {
          const primeiro = items[0];
          resultados.push({
            regraId: 'RAW-005',
            regraNome: 'Duplicata no Rawdata',
            severidade: 'aviso',
            categoria: 'operacional',
            mensagem: `${items.length} lançamentos idênticos no rawdata: ${primeiro.fornecedor} - ${formatarMoeda(primeiro.valorTotal)}`,
            entidade: 'rawdata',
            linha: primeiro.lineNumber,
            arquivo: `rawdata_${mesNome}.csv`,
            valorAtual: items.length,
            valorEsperado: 1,
            sugestao: 'Verifique se são lançamentos distintos ou duplicatas',
          });
        }
      }
    }
    
    return resultados;
  }
  
  private getMesNumero(mesNome: string): number {
    const meses: Record<string, number> = {
      'janeiro': 1, 'fevereiro': 2, 'marco': 3, 'abril': 4,
      'maio': 5, 'junho': 6, 'julho': 7, 'agosto': 8,
      'setembro': 9, 'outubro': 10, 'novembro': 11, 'dezembro': 12,
    };
    return meses[mesNome.toLowerCase()] || 0;
  }
}
















