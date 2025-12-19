/**
 * Validador de Doações/Contribuições
 * Cruza dados com rawdata, detecta duplicatas e inconsistências
 */

import type {
  ContextoAuditoria,
  ResultadoValidacao,
  Validador,
  DadosTitulo,
  DadosRawdata,
} from '../types';
import { normalizarNome, formatarMoeda, getMesNome } from '../types';
import { CONFIG } from '../rules/config';

export class ValidadorDoacoes implements Validador {
  modulo = 'doacoes' as const;
  nome = 'Validador de Doações';
  descricao = 'Valida contribuições e doações contra rawdata original';
  regras = [];
  
  async executar(ctx: ContextoAuditoria): Promise<ResultadoValidacao[]> {
    const resultados: ResultadoValidacao[] = [];
    
    resultados.push(...this.validarDoacoesSemPessoa(ctx));
    resultados.push(...this.validarTitulosDuplicados(ctx));
    resultados.push(...this.validarTitulosSemBaixa(ctx));
    resultados.push(...this.validarContraRawdata(ctx));
    
    return resultados;
  }
  
  private validarDoacoesSemPessoa(ctx: ContextoAuditoria): ResultadoValidacao[] {
    const resultados: ResultadoValidacao[] = [];
    
    const doacoes = ctx.titulos.filter(
      t => t.tipo === 'receber' && (t.natureza === 'contribuicao' || t.natureza === 'doacao')
    );
    
    for (const titulo of doacoes) {
      if (!titulo.pessoaId) {
        resultados.push({
          regraId: 'DOA-001',
          regraNome: 'Doação Sem Pessoa',
          severidade: 'aviso',
          categoria: 'operacional',
          mensagem: `Doação sem pessoa vinculada: ${titulo.descricao} - ${formatarMoeda(titulo.valorLiquido)}`,
          entidade: 'titulo',
          entidadeId: titulo.id,
          valorAtual: titulo.valorLiquido,
          sugestao: 'Vincule este título a uma pessoa cadastrada',
        });
      }
    }
    
    return resultados;
  }
  
  private validarTitulosDuplicados(ctx: ContextoAuditoria): ResultadoValidacao[] {
    const resultados: ResultadoValidacao[] = [];
    const chavesVistas = new Map<string, DadosTitulo[]>();
    
    for (const titulo of ctx.titulos) {
      if (!titulo.pessoaId) continue;
      
      // Chave: pessoa + data + valor (com tolerância)
      const chave = `${titulo.pessoaId}|${titulo.dataCompetencia}|${Math.round(titulo.valorLiquido * 100)}`;
      
      if (!chavesVistas.has(chave)) {
        chavesVistas.set(chave, []);
      }
      chavesVistas.get(chave)!.push(titulo);
    }
    
    for (const [chave, titulos] of chavesVistas) {
      if (titulos.length > 1) {
        const primeiro = titulos[0];
        const pessoaNome = primeiro.pessoaNome || 'Desconhecido';
        
        resultados.push({
          regraId: 'DOA-004',
          regraNome: 'Título Duplicado',
          severidade: 'erro',
          categoria: 'operacional',
          mensagem: `${titulos.length} títulos duplicados: ${pessoaNome} - ${primeiro.dataCompetencia} - ${formatarMoeda(primeiro.valorLiquido)}`,
          entidade: 'titulo',
          entidadeId: primeiro.id,
          valorAtual: titulos.length,
          valorEsperado: 1,
          sugestao: 'Remova os títulos duplicados mantendo apenas um',
        });
      }
    }
    
    return resultados;
  }
  
  private validarTitulosSemBaixa(ctx: ContextoAuditoria): ResultadoValidacao[] {
    const resultados: ResultadoValidacao[] = [];
    
    const titulosQuitados = ctx.titulos.filter(t => t.status === 'quitado');
    
    for (const titulo of titulosQuitados) {
      if (titulo.baixas.length === 0) {
        resultados.push({
          regraId: 'DOA-005',
          regraNome: 'Título Sem Baixa',
          severidade: 'aviso',
          categoria: 'operacional',
          mensagem: `Título quitado sem baixa: ${titulo.descricao} - ${formatarMoeda(titulo.valorLiquido)}`,
          entidade: 'titulo',
          entidadeId: titulo.id,
          sugestao: 'Registre a baixa com conta financeira e data de pagamento',
        });
      }
    }
    
    return resultados;
  }
  
  private validarContraRawdata(ctx: ContextoAuditoria): ResultadoValidacao[] {
    const resultados: ResultadoValidacao[] = [];
    
    // Processar cada mês de rawdata
    for (const [chave, rawdataList] of ctx.rawdata) {
      const [mesNome, ano] = chave.split('-');
      
      // Filtrar apenas contribuições do rawdata
      const contribuicoes = rawdataList.filter(
        r => r.tipo === 'contribuicao_associado' || r.tipo === 'contribuicao_nao_associado'
      );
      
      for (const raw of contribuicoes) {
        const nomeNorm = normalizarNome(raw.fornecedor);
        const pessoasEncontradas = ctx.pessoasPorNome.get(nomeNorm) || [];
        
        if (pessoasEncontradas.length === 0) {
          // Tentar busca parcial (primeiro + último nome)
          const partes = nomeNorm.split(' ').filter(p => p.length > 2);
          let encontrada = false;
          
          if (partes.length >= 2) {
            const primeiro = partes[0];
            const ultimo = partes[partes.length - 1];
            
            for (const [nome, pessoas] of ctx.pessoasPorNome) {
              if (nome.startsWith(primeiro) && nome.endsWith(ultimo)) {
                encontrada = true;
                break;
              }
            }
          }
          
          if (!encontrada) {
            resultados.push({
              regraId: 'DOA-003',
              regraNome: 'Pessoa Não Encontrada',
              severidade: 'aviso',
              categoria: 'operacional',
              mensagem: `Pessoa do rawdata não encontrada no cadastro: ${raw.fornecedor}`,
              entidade: 'rawdata',
              linha: raw.lineNumber,
              arquivo: `rawdata_${mesNome}.csv`,
              valorAtual: raw.fornecedor,
              sugestao: 'Cadastre a pessoa ou verifique se o nome está correto',
            });
          }
        } else {
          // Verificar se existe título correspondente
          const pessoaId = pessoasEncontradas[0].id;
          const titulos = ctx.titulosPorPessoa.get(pessoaId) || [];
          
          const dataRaw = raw.data.toISOString().split('T')[0];
          const valorRaw = Math.abs(raw.valorTotal);
          
          const tituloCorrespondente = titulos.find(t => {
            const dataT = t.dataCompetencia;
            const valorT = t.valorLiquido;
            const diferencaValor = Math.abs(valorT - valorRaw);
            
            return dataT === dataRaw && diferencaValor <= CONFIG.toleranciaValor;
          });
          
          if (!tituloCorrespondente && valorRaw > 0) {
            // Pode ser que o título existe mas com data diferente
            const tituloValorIgual = titulos.find(t => {
              const valorT = t.valorLiquido;
              const diferencaValor = Math.abs(valorT - valorRaw);
              return diferencaValor <= CONFIG.toleranciaValor;
            });
            
            if (!tituloValorIgual) {
              resultados.push({
                regraId: 'DOA-002',
                regraNome: 'Valor Divergente do Rawdata',
                severidade: 'erro',
                categoria: 'operacional',
                mensagem: `Contribuição no rawdata sem título correspondente: ${raw.fornecedor} - ${formatarMoeda(valorRaw)} em ${dataRaw}`,
                entidade: 'rawdata',
                linha: raw.lineNumber,
                arquivo: `rawdata_${mesNome}.csv`,
                valorAtual: valorRaw,
                sugestao: 'Crie o título correspondente ou verifique se a contribuição foi registrada',
              });
            }
          }
        }
      }
    }
    
    return resultados;
  }
}

