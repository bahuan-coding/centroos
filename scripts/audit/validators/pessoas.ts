/**
 * Validador de Pessoas/Cadastros
 * Detecta duplicatas, documentos inválidos, dados incompletos
 */

import type {
  ContextoAuditoria,
  ResultadoValidacao,
  Validador,
  DadosPessoa,
} from '../types';
import { normalizarNome, levenshtein, validarCPF, validarCNPJ } from '../types';
import { CONFIG } from '../rules/config';

export class ValidadorPessoas implements Validador {
  modulo = 'pessoas' as const;
  nome = 'Validador de Pessoas';
  descricao = 'Valida cadastros de pessoas, detecta duplicatas e documentos inválidos';
  regras = [];
  
  async executar(ctx: ContextoAuditoria): Promise<ResultadoValidacao[]> {
    const resultados: ResultadoValidacao[] = [];
    
    resultados.push(...this.validarDuplicatasPorNome(ctx));
    resultados.push(...this.validarDocumentos(ctx));
    resultados.push(...this.validarDocumentosDuplicados(ctx));
    resultados.push(...this.validarAssociadosSemContribuicao(ctx));
    resultados.push(...this.validarPessoasSemContato(ctx));
    
    return resultados;
  }
  
  private validarDuplicatasPorNome(ctx: ContextoAuditoria): ResultadoValidacao[] {
    const resultados: ResultadoValidacao[] = [];
    const processados = new Set<string>();
    const nomes = ctx.pessoas.map(p => ({ id: p.id, nome: p.nome, nomeNorm: normalizarNome(p.nome) }));
    
    for (let i = 0; i < nomes.length; i++) {
      const p1 = nomes[i];
      if (processados.has(p1.id)) continue;
      
      const similares: typeof nomes = [];
      
      for (let j = i + 1; j < nomes.length; j++) {
        const p2 = nomes[j];
        if (processados.has(p2.id)) continue;
        
        const distancia = levenshtein(p1.nomeNorm, p2.nomeNorm);
        
        if (distancia <= CONFIG.limiteDuplicatas) {
          similares.push(p2);
          processados.add(p2.id);
        }
      }
      
      if (similares.length > 0) {
        const todosNomes = [p1.nome, ...similares.map(s => s.nome)].join(', ');
        
        resultados.push({
          regraId: 'CAD-001',
          regraNome: 'Pessoa Duplicada por Nome',
          severidade: 'aviso',
          categoria: 'cadastro',
          mensagem: `Possíveis duplicatas detectadas: ${todosNomes}`,
          entidade: 'pessoa',
          entidadeId: p1.id,
          sugestao: 'Verifique e unifique os cadastros se forem a mesma pessoa',
        });
      }
      
      processados.add(p1.id);
    }
    
    return resultados;
  }
  
  private validarDocumentos(ctx: ContextoAuditoria): ResultadoValidacao[] {
    const resultados: ResultadoValidacao[] = [];
    
    for (const pessoa of ctx.pessoas) {
      for (const doc of pessoa.documentos) {
        if (doc.tipo === 'cpf' && !validarCPF(doc.numero)) {
          resultados.push({
            regraId: 'CAD-002',
            regraNome: 'CPF Inválido',
            severidade: 'erro',
            categoria: 'cadastro',
            mensagem: `CPF inválido para ${pessoa.nome}: ${doc.numero}`,
            entidade: 'pessoa',
            entidadeId: pessoa.id,
            campo: 'cpf',
            valorAtual: doc.numero,
            sugestao: 'Corrija o número do CPF',
          });
        }
        
        if (doc.tipo === 'cnpj' && !validarCNPJ(doc.numero)) {
          resultados.push({
            regraId: 'CAD-003',
            regraNome: 'CNPJ Inválido',
            severidade: 'erro',
            categoria: 'cadastro',
            mensagem: `CNPJ inválido para ${pessoa.nome}: ${doc.numero}`,
            entidade: 'pessoa',
            entidadeId: pessoa.id,
            campo: 'cnpj',
            valorAtual: doc.numero,
            sugestao: 'Corrija o número do CNPJ',
          });
        }
      }
    }
    
    return resultados;
  }
  
  private validarDocumentosDuplicados(ctx: ContextoAuditoria): ResultadoValidacao[] {
    const resultados: ResultadoValidacao[] = [];
    const documentosPorNumero = new Map<string, DadosPessoa[]>();
    
    for (const pessoa of ctx.pessoas) {
      for (const doc of pessoa.documentos) {
        const chave = `${doc.tipo}:${doc.numero.replace(/\D/g, '')}`;
        
        if (!documentosPorNumero.has(chave)) {
          documentosPorNumero.set(chave, []);
        }
        documentosPorNumero.get(chave)!.push(pessoa);
      }
    }
    
    for (const [chave, pessoas] of documentosPorNumero) {
      if (pessoas.length > 1) {
        const [tipo, numero] = chave.split(':');
        const nomes = pessoas.map(p => p.nome).join(', ');
        
        resultados.push({
          regraId: 'CAD-004',
          regraNome: 'Documento Duplicado',
          severidade: 'erro',
          categoria: 'cadastro',
          mensagem: `${tipo.toUpperCase()} ${numero} cadastrado em múltiplas pessoas: ${nomes}`,
          entidade: 'pessoa',
          campo: tipo,
          valorAtual: numero,
          sugestao: 'Unifique os cadastros ou corrija o documento',
        });
      }
    }
    
    return resultados;
  }
  
  private validarAssociadosSemContribuicao(ctx: ContextoAuditoria): ResultadoValidacao[] {
    const resultados: ResultadoValidacao[] = [];
    
    const associadosAtivos = ctx.pessoas.filter(
      p => p.associado && p.associado.status === 'ativo' && !p.associado.valorContribuicao
    );
    
    for (const pessoa of associadosAtivos) {
      // Verificar se tem algum título de contribuição
      const titulos = ctx.titulosPorPessoa.get(pessoa.id) || [];
      const temContribuicao = titulos.some(
        t => t.tipo === 'receber' && (t.natureza === 'contribuicao' || t.natureza === 'doacao')
      );
      
      if (!temContribuicao) {
        resultados.push({
          regraId: 'CAD-005',
          regraNome: 'Associado Sem Contribuição',
          severidade: 'aviso',
          categoria: 'cadastro',
          mensagem: `Associado ativo sem contribuição no período: ${pessoa.nome}`,
          entidade: 'pessoa',
          entidadeId: pessoa.id,
          sugestao: 'Verifique se o associado ainda é ativo ou se falta registrar contribuições',
        });
      }
    }
    
    return resultados;
  }
  
  private validarPessoasSemContato(ctx: ContextoAuditoria): ResultadoValidacao[] {
    const resultados: ResultadoValidacao[] = [];
    
    const pessoasAtivas = ctx.pessoas.filter(p => p.ativo);
    
    for (const pessoa of pessoasAtivas) {
      if (pessoa.contatos.length === 0) {
        resultados.push({
          regraId: 'CAD-006',
          regraNome: 'Pessoa Sem Contato',
          severidade: 'info',
          categoria: 'cadastro',
          mensagem: `Pessoa ativa sem contato cadastrado: ${pessoa.nome}`,
          entidade: 'pessoa',
          entidadeId: pessoa.id,
          sugestao: 'Cadastre pelo menos um contato (email ou telefone)',
        });
      }
    }
    
    return resultados;
  }
}

