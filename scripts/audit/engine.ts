/**
 * Motor de Regras de Auditoria
 * Orquestra a execução dos validadores e coleta resultados
 */

import { neon } from '@netlify/neon';
import { drizzle } from 'drizzle-orm/neon-http';
import { sql } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

import type {
  ContextoAuditoria,
  ParametrosAuditoria,
  ResultadoValidacao,
  RelatorioAuditoria,
  DadosPessoa,
  DadosTitulo,
  DadosLancamento,
  DadosExtrato,
  DadosPeriodo,
  DadosRawdata,
  ModuloAuditoria,
  NomeMes,
} from './types';
import { getMesNumero, getMesNome, normalizarNome, MESES } from './types';
import { Reporter } from './reporter';

// Importar validadores
import { ValidadorPessoas } from './validators/pessoas';
import { ValidadorDoacoes } from './validators/doacoes';
import { ValidadorContabil } from './validators/contabil';
import { ValidadorFiscal } from './validators/fiscal';
import { ValidadorConciliacao } from './validators/conciliacao';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// CLASSE PRINCIPAL
// ============================================================================

export class AuditEngine {
  private db: ReturnType<typeof drizzle>;
  private parametros: ParametrosAuditoria;
  private contexto: ContextoAuditoria;
  
  constructor(parametros: ParametrosAuditoria) {
    const databaseUrl = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL não configurada');
    }
    
    const sqlClient = neon(databaseUrl);
    this.db = drizzle(sqlClient);
    this.parametros = parametros;
    
    this.contexto = {
      parametros,
      pessoas: [],
      titulos: [],
      lancamentos: [],
      extratos: [],
      periodos: [],
      rawdata: new Map(),
      pessoasPorId: new Map(),
      pessoasPorNome: new Map(),
      titulosPorPessoa: new Map(),
      titulosPorCompetencia: new Map(),
    };
  }
  
  // ==========================================================================
  // CARREGAMENTO DE DADOS
  // ==========================================================================
  
  async carregarDados(): Promise<void> {
    console.log('📥 Carregando dados do banco...');
    
    await Promise.all([
      this.carregarPessoas(),
      this.carregarTitulos(),
      this.carregarLancamentos(),
      this.carregarExtratos(),
      this.carregarPeriodos(),
    ]);
    
    this.carregarRawdata();
    this.construirIndices();
    
    console.log(`   ✓ ${this.contexto.pessoas.length} pessoas`);
    console.log(`   ✓ ${this.contexto.titulos.length} títulos`);
    console.log(`   ✓ ${this.contexto.lancamentos.length} lançamentos`);
    console.log(`   ✓ ${this.contexto.extratos.length} linhas de extrato`);
    console.log(`   ✓ ${this.contexto.periodos.length} períodos`);
    console.log(`   ✓ ${this.contexto.rawdata.size} meses de rawdata`);
  }
  
  private async carregarPessoas(): Promise<void> {
    const result = await this.db.execute(sql`
      SELECT 
        p.id,
        p.nome,
        p.tipo,
        p.ativo,
        COALESCE(
          (SELECT json_agg(json_build_object('tipo', pd.tipo, 'numero', pd.numero))
           FROM pessoa_documento pd WHERE pd.pessoa_id = p.id),
          '[]'
        ) as documentos,
        COALESCE(
          (SELECT json_agg(json_build_object('tipo', pc.tipo, 'valor', pc.valor))
           FROM pessoa_contato pc WHERE pc.pessoa_id = p.id),
          '[]'
        ) as contatos,
        a.status as associado_status,
        a.categoria as associado_categoria,
        a.data_admissao as associado_data_admissao,
        a.valor_contribuicao_sugerido as associado_valor_contribuicao
      FROM pessoa p
      LEFT JOIN associado a ON a.pessoa_id = p.id
      WHERE p.deleted_at IS NULL
      ORDER BY p.nome
    `);
    
    this.contexto.pessoas = (result.rows as any[]).map(row => ({
      id: row.id,
      nome: row.nome,
      tipo: row.tipo,
      ativo: row.ativo,
      documentos: row.documentos || [],
      contatos: row.contatos || [],
      associado: row.associado_status ? {
        status: row.associado_status,
        categoria: row.associado_categoria,
        dataAdmissao: row.associado_data_admissao,
        valorContribuicao: row.associado_valor_contribuicao ? parseFloat(row.associado_valor_contribuicao) : undefined,
      } : undefined,
    }));
  }
  
  private async carregarTitulos(): Promise<void> {
    const { ano, mes, todos } = this.parametros;
    
    let whereClause = sql`t.deleted_at IS NULL AND EXTRACT(YEAR FROM t.data_competencia::date) = ${ano}`;
    
    if (!todos && mes) {
      const mesNum = typeof mes === 'number' ? mes : getMesNumero(mes);
      whereClause = sql`${whereClause} AND EXTRACT(MONTH FROM t.data_competencia::date) = ${mesNum}`;
    }
    
    const result = await this.db.execute(sql`
      SELECT 
        t.id,
        t.tipo,
        t.natureza,
        t.pessoa_id,
        p.nome as pessoa_nome,
        t.descricao,
        t.valor_original::numeric as valor_original,
        t.valor_liquido::numeric as valor_liquido,
        t.data_emissao,
        t.data_competencia,
        t.data_vencimento,
        t.status,
        t.source_system,
        t.import_batch_id,
        COALESCE(
          (SELECT json_agg(json_build_object(
            'id', tb.id,
            'dataPagamento', tb.data_pagamento,
            'valorPago', tb.valor_pago::numeric,
            'contaFinanceiraId', tb.conta_financeira_id
          ))
           FROM titulo_baixa tb WHERE tb.titulo_id = t.id),
          '[]'
        ) as baixas
      FROM titulo t
      LEFT JOIN pessoa p ON p.id = t.pessoa_id
      WHERE ${whereClause}
      ORDER BY t.data_competencia
    `);
    
    this.contexto.titulos = (result.rows as any[]).map(row => ({
      id: row.id,
      tipo: row.tipo,
      natureza: row.natureza,
      pessoaId: row.pessoa_id,
      pessoaNome: row.pessoa_nome,
      descricao: row.descricao,
      valorOriginal: parseFloat(row.valor_original) || 0,
      valorLiquido: parseFloat(row.valor_liquido) || 0,
      dataEmissao: row.data_emissao,
      dataCompetencia: row.data_competencia,
      dataVencimento: row.data_vencimento,
      status: row.status,
      sourceSystem: row.source_system,
      importBatchId: row.import_batch_id,
      baixas: row.baixas || [],
    }));
  }
  
  private async carregarLancamentos(): Promise<void> {
    const { ano, mes, todos } = this.parametros;
    
    let whereClause = sql`EXTRACT(YEAR FROM lc.data_competencia::date) = ${ano}`;
    
    if (!todos && mes) {
      const mesNum = typeof mes === 'number' ? mes : getMesNumero(mes);
      whereClause = sql`${whereClause} AND EXTRACT(MONTH FROM lc.data_competencia::date) = ${mesNum}`;
    }
    
    const result = await this.db.execute(sql`
      SELECT 
        lc.id,
        lc.numero,
        lc.periodo_id,
        lc.data_lancamento,
        lc.data_competencia,
        lc.historico,
        lc.origem,
        lc.status,
        lc.total_debito::numeric as total_debito,
        lc.total_credito::numeric as total_credito,
        COALESCE(
          (SELECT json_agg(json_build_object(
            'contaId', ll.conta_id,
            'contaCodigo', pc.codigo,
            'contaNome', pc.nome,
            'tipo', ll.tipo,
            'valor', ll.valor::numeric
          ))
           FROM lancamento_linha ll
           JOIN plano_contas pc ON pc.id = ll.conta_id
           WHERE ll.lancamento_id = lc.id),
          '[]'
        ) as linhas
      FROM lancamento_contabil lc
      WHERE ${whereClause}
      ORDER BY lc.data_lancamento
    `);
    
    this.contexto.lancamentos = (result.rows as any[]).map(row => ({
      id: row.id,
      numero: row.numero,
      periodoId: row.periodo_id,
      dataLancamento: row.data_lancamento,
      dataCompetencia: row.data_competencia,
      historico: row.historico,
      origem: row.origem,
      status: row.status,
      totalDebito: parseFloat(row.total_debito) || 0,
      totalCredito: parseFloat(row.total_credito) || 0,
      linhas: row.linhas || [],
    }));
  }
  
  private async carregarExtratos(): Promise<void> {
    const { ano, mes, todos } = this.parametros;
    
    let whereClause = sql`EXTRACT(YEAR FROM el.data_movimento::date) = ${ano}`;
    
    if (!todos && mes) {
      const mesNum = typeof mes === 'number' ? mes : getMesNumero(mes);
      whereClause = sql`${whereClause} AND EXTRACT(MONTH FROM el.data_movimento::date) = ${mesNum}`;
    }
    
    const result = await this.db.execute(sql`
      SELECT 
        el.id,
        el.extrato_id,
        eb.conta_financeira_id,
        cf.nome as conta_nome,
        el.data_movimento,
        el.tipo,
        el.valor::numeric as valor,
        el.descricao_original,
        el.status,
        c.titulo_id as titulo_vinculado_id
      FROM extrato_linha el
      JOIN extrato_bancario eb ON eb.id = el.extrato_id
      JOIN conta_financeira cf ON cf.id = eb.conta_financeira_id
      LEFT JOIN conciliacao c ON c.extrato_linha_id = el.id
      WHERE ${whereClause}
      ORDER BY el.data_movimento
    `);
    
    this.contexto.extratos = (result.rows as any[]).map(row => ({
      id: row.id,
      contaFinanceiraId: row.conta_financeira_id,
      contaNome: row.conta_nome,
      dataMovimento: row.data_movimento,
      tipo: row.tipo,
      valor: parseFloat(row.valor) || 0,
      descricaoOriginal: row.descricao_original,
      status: row.status,
      conciliado: row.status === 'conciliado',
      tituloVinculadoId: row.titulo_vinculado_id,
    }));
  }
  
  private async carregarPeriodos(): Promise<void> {
    const result = await this.db.execute(sql`
      SELECT 
        id,
        ano,
        mes,
        data_inicio,
        data_fim,
        status
      FROM periodo_contabil
      ORDER BY ano, mes
    `);
    
    this.contexto.periodos = (result.rows as any[]).map(row => ({
      id: row.id,
      ano: row.ano,
      mes: row.mes,
      dataInicio: row.data_inicio,
      dataFim: row.data_fim,
      status: row.status,
    }));
  }
  
  private carregarRawdata(): void {
    const rawdataDir = path.join(__dirname, '..', '..', 'rawdata');
    
    // Determinar quais meses carregar
    const mesesParaCarregar: number[] = [];
    
    if (this.parametros.todos) {
      mesesParaCarregar.push(...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    } else if (this.parametros.mes) {
      const mesNum = typeof this.parametros.mes === 'number' 
        ? this.parametros.mes 
        : getMesNumero(this.parametros.mes);
      mesesParaCarregar.push(mesNum);
    }
    
    for (const mesNum of mesesParaCarregar) {
      const mesNome = getMesNome(mesNum);
      const arquivo = path.join(rawdataDir, `rawdata_${mesNome}.csv`);
      
      if (fs.existsSync(arquivo)) {
        try {
          const conteudo = fs.readFileSync(arquivo, 'utf-8');
          const dados = this.parseRawdataCSV(conteudo);
          const chave = `${mesNome}-${this.parametros.ano}`;
          this.contexto.rawdata.set(chave, dados);
        } catch (error) {
          console.warn(`   ⚠ Erro ao ler ${arquivo}: ${error}`);
        }
      }
    }
  }
  
  private parseRawdataCSV(content: string): DadosRawdata[] {
    const lines = content.trim().split('\n');
    const dados: DadosRawdata[] = [];
    
    for (let i = 5; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      
      const cols = this.parseCSVLine(line);
      const dataStr = cols[0]?.trim();
      
      if (!dataStr || dataStr.toLowerCase().includes('saldo')) continue;
      
      const data = this.parseData(dataStr);
      if (!data) continue;
      
      const valorCaixa = this.parseValor(cols[5]);
      const valorBB = this.parseValor(cols[6]);
      const valorBBRF = this.parseValor(cols[7]);
      const valorCEF = this.parseValor(cols[8]);
      
      let valorTotal = 0;
      if (valorBB !== 0) valorTotal = valorBB;
      else if (valorCEF !== 0) valorTotal = valorCEF;
      else if (valorBBRF !== 0) valorTotal = valorBBRF;
      else if (valorCaixa !== 0) valorTotal = valorCaixa;
      
      const descricao = (cols[4] || '').toLowerCase();
      let tipo = 'despesa';
      let natureza = 'outros';
      
      if (descricao.includes('contribuição associado')) {
        tipo = 'contribuicao_associado';
        natureza = 'contribuicao';
      } else if (descricao.includes('contribuição não associado')) {
        tipo = 'contribuicao_nao_associado';
        natureza = 'doacao';
      } else if (descricao.includes('bb rende fácil') || descricao.includes('bb renda')) {
        tipo = 'transferencia_interna';
        natureza = 'transferencia';
      } else if (descricao.includes('rendimento')) {
        tipo = 'rendimento';
        natureza = 'receita_financeira';
      } else if (descricao.includes('tarifa')) {
        tipo = 'tarifa';
        natureza = 'taxa';
      }
      
      dados.push({
        lineNumber: i + 1,
        data,
        documento: cols[1]?.trim() || '',
        cnpj: cols[2]?.trim() || '',
        fornecedor: cols[3]?.trim() || '',
        descricao: cols[4]?.trim() || '',
        valorCaixa,
        valorBB,
        valorBBRF,
        valorCEF,
        valorTotal,
        tipo,
        natureza,
      });
    }
    
    return dados;
  }
  
  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    
    return result;
  }
  
  private parseData(dataStr: string): Date | null {
    const parts = dataStr.split('/');
    if (parts.length !== 3) return null;
    
    const [month, day, year] = parts.map(p => parseInt(p));
    if (isNaN(month) || isNaN(day) || isNaN(year)) return null;
    
    const correctedYear = year < 2020 ? 2025 : year;
    return new Date(correctedYear, month - 1, day);
  }
  
  private parseValor(v: string): number {
    if (!v || v.trim() === '') return 0;
    let clean = v.replace(/"/g, '').replace(/\s/g, '').replace(',', '.');
    if (clean.includes('.') && clean.split('.').length > 2) {
      const parts = clean.split('.');
      const decimal = parts.pop();
      clean = parts.join('') + '.' + decimal;
    }
    return parseFloat(clean) || 0;
  }
  
  private construirIndices(): void {
    // Indexar pessoas
    for (const pessoa of this.contexto.pessoas) {
      this.contexto.pessoasPorId.set(pessoa.id, pessoa);
      
      const nomeNorm = normalizarNome(pessoa.nome);
      if (!this.contexto.pessoasPorNome.has(nomeNorm)) {
        this.contexto.pessoasPorNome.set(nomeNorm, []);
      }
      this.contexto.pessoasPorNome.get(nomeNorm)!.push(pessoa);
    }
    
    // Indexar títulos por pessoa e competência
    for (const titulo of this.contexto.titulos) {
      if (titulo.pessoaId) {
        if (!this.contexto.titulosPorPessoa.has(titulo.pessoaId)) {
          this.contexto.titulosPorPessoa.set(titulo.pessoaId, []);
        }
        this.contexto.titulosPorPessoa.get(titulo.pessoaId)!.push(titulo);
      }
      
      const comp = titulo.dataCompetencia;
      if (!this.contexto.titulosPorCompetencia.has(comp)) {
        this.contexto.titulosPorCompetencia.set(comp, []);
      }
      this.contexto.titulosPorCompetencia.get(comp)!.push(titulo);
    }
  }
  
  // ==========================================================================
  // EXECUÇÃO DOS VALIDADORES
  // ==========================================================================
  
  async executar(): Promise<RelatorioAuditoria> {
    const inicio = Date.now();
    
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  AUDITORIA CONTÁBIL - CENTRO ESPÍRITA');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');
    
    // Carregar dados
    await this.carregarDados();
    console.log('');
    
    // Determinar quais validadores executar
    const modulos = this.parametros.modulos.includes('todos')
      ? ['pessoas', 'doacoes', 'contabil', 'fiscal', 'conciliacao'] as ModuloAuditoria[]
      : this.parametros.modulos;
    
    const resultados: ResultadoValidacao[] = [];
    
    // Executar cada validador
    for (const modulo of modulos) {
      console.log(`🔍 Executando validador: ${modulo}`);
      
      let validador;
      switch (modulo) {
        case 'pessoas':
          validador = new ValidadorPessoas();
          break;
        case 'doacoes':
          validador = new ValidadorDoacoes();
          break;
        case 'contabil':
          validador = new ValidadorContabil();
          break;
        case 'fiscal':
          validador = new ValidadorFiscal();
          break;
        case 'conciliacao':
          validador = new ValidadorConciliacao();
          break;
        default:
          continue;
      }
      
      const resultadosModulo = await validador.executar(this.contexto);
      resultados.push(...resultadosModulo);
      
      const erros = resultadosModulo.filter(r => r.severidade === 'erro').length;
      const avisos = resultadosModulo.filter(r => r.severidade === 'aviso').length;
      const infos = resultadosModulo.filter(r => r.severidade === 'info').length;
      
      console.log(`   ✓ ${resultadosModulo.length} validações (${erros} erros, ${avisos} avisos, ${infos} infos)`);
    }
    
    console.log('');
    
    // Gerar relatório
    const tempoExecucao = Date.now() - inicio;
    const resumo = Reporter.criarResumo(resultados, this.parametros, tempoExecucao);
    
    const relatorio: RelatorioAuditoria = {
      resumo,
      resultados,
    };
    
    // Exibir/salvar relatório
    const reporter = new Reporter(this.parametros.formato, this.parametros.output);
    reporter.gerar(relatorio);
    
    return relatorio;
  }
}

