/**
 * Script de Migração de Dados - rawdata para Banco de Dados
 * 
 * Importa todos os dados da pasta rawdata:
 * - Contas financeiras (Caixa, BB, BB Renda, CEF)
 * - Pessoas (associados e não-associados)
 * - Períodos contábeis 2025
 * - Lançamentos mensais (Jan-Nov 2025)
 * - Extratos bancários (BB e CEF novembro 2025)
 * 
 * Executar: npx tsx scripts/seed-migration.ts
 */

import { neon } from '@netlify/neon';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq } from 'drizzle-orm';
import * as schema from '../drizzle/schema';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const databaseUrl = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('❌ NETLIFY_DATABASE_URL ou DATABASE_URL não configurada');
  process.exit(1);
}

const sql = neon(databaseUrl);
const db = drizzle(sql, { schema });

const RAWDATA_PATH = path.join(__dirname, '..', 'rawdata');
const TSV_PATH = path.join(RAWDATA_PATH, 'relatorio_excel_sheets_tsv');

// ============================================================================
// UTILIDADES
// ============================================================================

function parseTSV(filePath: string): string[][] {
  const content = fs.readFileSync(filePath, 'utf-8');
  return content.split('\n').map(line => line.split('\t'));
}

function parseCSV(filePath: string): string[][] {
  const content = fs.readFileSync(filePath, 'utf-8');
  return content.split('\n').map(line => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  });
}

function parseDate(dateStr: string): Date | null {
  if (!dateStr || dateStr.trim() === '') return null;
  // Formato: 2025-01-02 00:00:00 ou 02/01/2025
  const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]));
  }
  const brMatch = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (brMatch) {
    return new Date(parseInt(brMatch[3]), parseInt(brMatch[2]) - 1, parseInt(brMatch[1]));
  }
  return null;
}

function parseValue(valStr: string): number {
  if (!valStr || valStr.trim() === '') return 0;
  // Remove "R$", espaços, e converte vírgula para ponto
  const cleaned = valStr.replace(/R\$\s*/g, '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function formatDateForDB(date: Date): string {
  return date.toISOString().split('T')[0];
}

// ============================================================================
// 1. CONTAS FINANCEIRAS
// ============================================================================

const contasFinanceiras = [
  {
    nome: 'Caixa Físico',
    tipo: 'caixa' as const,
    bancoCodigo: null,
    bancoNome: null,
    agencia: null,
    contaNumero: null,
    saldoInicial: '2.31',
    dataSaldoInicial: '2025-10-31',
  },
  {
    nome: 'Banco do Brasil - Conta Corrente',
    tipo: 'conta_corrente' as const,
    bancoCodigo: '001',
    bancoNome: 'Banco do Brasil S.A.',
    agencia: '0013-2',
    contaNumero: '8197-3',
    saldoInicial: '0.00',
    dataSaldoInicial: '2025-10-31',
  },
  {
    nome: 'BB Renda Fácil',
    tipo: 'aplicacao' as const,
    bancoCodigo: '001',
    bancoNome: 'Banco do Brasil S.A.',
    agencia: '0013-2',
    contaNumero: '9903',
    saldoInicial: '4125.25',
    dataSaldoInicial: '2025-10-31',
  },
  {
    nome: 'Caixa Econômica Federal',
    tipo: 'conta_corrente' as const,
    bancoCodigo: '104',
    bancoNome: 'Caixa Econômica Federal',
    agencia: '2392',
    contaNumero: '1292.000577535744-9',
    saldoInicial: '9422.25',
    dataSaldoInicial: '2025-10-31',
  },
];

async function seedContasFinanceiras(): Promise<Record<string, string>> {
  console.log('\n💳 Inserindo contas financeiras...');
  const contaIdMap: Record<string, string> = {};

  for (const conta of contasFinanceiras) {
    try {
      const [result] = await db.insert(schema.contaFinanceira).values({
        ...conta,
        ativo: true,
      }).returning({ id: schema.contaFinanceira.id });
      contaIdMap[conta.nome] = result.id;
      console.log(`  ✅ ${conta.nome}`);
    } catch (error: any) {
      if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
        // Buscar ID existente
        const existing = await db.select({ id: schema.contaFinanceira.id })
          .from(schema.contaFinanceira)
          .where(eq(schema.contaFinanceira.nome, conta.nome))
          .limit(1);
        if (existing.length > 0) {
          contaIdMap[conta.nome] = existing[0].id;
        }
        console.log(`  ⏭️  ${conta.nome} (já existe)`);
      } else {
        console.error(`  ❌ ${conta.nome}: ${error.message}`);
      }
    }
  }

  return contaIdMap;
}

// ============================================================================
// 2. PERÍODOS CONTÁBEIS 2025
// ============================================================================

async function seedPeriodosContabeis(): Promise<Record<string, string>> {
  console.log('\n📅 Inserindo períodos contábeis 2025...');
  const periodoIdMap: Record<string, string> = {};

  for (let mes = 1; mes <= 12; mes++) {
    const ano = 2025;
    const dataInicio = new Date(ano, mes - 1, 1);
    const dataFim = new Date(ano, mes, 0); // Último dia do mês
    const key = `${ano}-${mes.toString().padStart(2, '0')}`;

    try {
      const [result] = await db.insert(schema.periodoContabil).values({
        ano,
        mes,
        dataInicio: formatDateForDB(dataInicio),
        dataFim: formatDateForDB(dataFim),
        status: 'aberto',
      }).returning({ id: schema.periodoContabil.id });
      periodoIdMap[key] = result.id;
      console.log(`  ✅ ${key}`);
    } catch (error: any) {
      if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
        const existing = await db.select({ id: schema.periodoContabil.id })
          .from(schema.periodoContabil)
          .where(eq(schema.periodoContabil.ano, ano))
          .limit(1);
        if (existing.length > 0) {
          periodoIdMap[key] = existing[0].id;
        }
        console.log(`  ⏭️  ${key} (já existe)`);
      } else {
        console.error(`  ❌ ${key}: ${error.message}`);
      }
    }
  }

  return periodoIdMap;
}

// ============================================================================
// 3. PESSOAS (ASSOCIADOS E NÃO-ASSOCIADOS)
// ============================================================================

interface PessoaData {
  nome: string;
  matricula: string | null;
  isAssociado: boolean;
  contribuicoes: { mes: string; data: Date; valor: number }[];
}

function extrairPessoas(): PessoaData[] {
  const pessoas: PessoaData[] = [];
  const nomesProcessados = new Set<string>();

  // Associados
  const associadosPath = path.join(TSV_PATH, 'CONTRIBUIÇÃO_ASSOCIADOS.tsv');
  if (fs.existsSync(associadosPath)) {
    const rows = parseTSV(associadosPath);
    for (let i = 4; i < rows.length; i++) { // Pula cabeçalhos
      const row = rows[i];
      const nome = row[0]?.trim();
      const matricula = row[1]?.trim() || null;
      
      if (!nome || nome === '' || nome.toLowerCase().startsWith('total')) continue;
      if (nomesProcessados.has(nome.toUpperCase())) continue;
      nomesProcessados.add(nome.toUpperCase());

      const contribuicoes: PessoaData['contribuicoes'] = [];
      const meses = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
      
      // Colunas: 0=nome, 1=matricula, 2=data_anterior, 3=valor_anterior, depois pares data/valor por mês
      for (let m = 0; m < 12; m++) {
        const dataCol = 4 + m * 2;
        const valorCol = 5 + m * 2;
        const dataStr = row[dataCol]?.trim();
        const valorStr = row[valorCol]?.trim();
        
        if (dataStr && valorStr) {
          const data = parseDate(dataStr);
          const valor = parseValue(valorStr);
          if (data && valor > 0) {
            contribuicoes.push({ mes: meses[m], data, valor });
          }
        }
      }

      pessoas.push({ nome, matricula, isAssociado: true, contribuicoes });
    }
  }

  // Não-associados
  const naoAssociadosPath = path.join(TSV_PATH, 'CONTRIBUIÇÃO_NAO_ASSOCIADOS.tsv');
  if (fs.existsSync(naoAssociadosPath)) {
    const rows = parseTSV(naoAssociadosPath);
    for (let i = 4; i < rows.length; i++) {
      const row = rows[i];
      const nome = row[0]?.trim();
      
      if (!nome || nome === '' || nome.toLowerCase().startsWith('total')) continue;
      if (nomesProcessados.has(nome.toUpperCase())) continue;
      nomesProcessados.add(nome.toUpperCase());

      const contribuicoes: PessoaData['contribuicoes'] = [];
      const meses = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
      
      for (let m = 0; m < 12; m++) {
        const dataCol = 4 + m * 2;
        const valorCol = 5 + m * 2;
        const dataStr = row[dataCol]?.trim();
        const valorStr = row[valorCol]?.trim();
        
        if (dataStr && valorStr) {
          const data = parseDate(dataStr);
          const valor = parseValue(valorStr);
          if (data && valor > 0) {
            contribuicoes.push({ mes: meses[m], data, valor });
          }
        }
      }

      pessoas.push({ nome, matricula: null, isAssociado: false, contribuicoes });
    }
  }

  return pessoas;
}

async function seedPessoas(): Promise<Record<string, string>> {
  console.log('\n👥 Inserindo pessoas...');
  const pessoaIdMap: Record<string, string> = {};
  const pessoas = extrairPessoas();
  
  let countAssociados = 0;
  let countNaoAssociados = 0;

  for (const p of pessoas) {
    try {
      // Inserir pessoa
      const [pessoaResult] = await db.insert(schema.pessoa).values({
        tipo: 'fisica',
        nome: p.nome,
        ativo: true,
      }).returning({ id: schema.pessoa.id });

      pessoaIdMap[p.nome.toUpperCase()] = pessoaResult.id;

      // Se for associado, inserir registro de associado
      if (p.isAssociado && p.matricula) {
        const ultimaContribuicao = p.contribuicoes.length > 0 
          ? p.contribuicoes[p.contribuicoes.length - 1].data 
          : new Date();
        
        const status = p.contribuicoes.length > 0 ? 'ativo' : 'suspenso';
        
        await db.insert(schema.associado).values({
          pessoaId: pessoaResult.id,
          numeroRegistro: p.matricula,
          dataAdmissao: formatDateForDB(new Date(2025, 0, 1)),
          status: status as 'ativo' | 'suspenso',
          categoria: 'trabalhador',
          periodicidade: 'mensal',
          isento: false,
        });
        countAssociados++;
      } else {
        countNaoAssociados++;
      }

    } catch (error: any) {
      if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
        // Buscar ID existente
        const existing = await db.select({ id: schema.pessoa.id })
          .from(schema.pessoa)
          .where(eq(schema.pessoa.nome, p.nome))
          .limit(1);
        if (existing.length > 0) {
          pessoaIdMap[p.nome.toUpperCase()] = existing[0].id;
        }
      } else {
        console.error(`  ❌ ${p.nome}: ${error.message}`);
      }
    }
  }

  console.log(`  ✅ ${countAssociados} associados inseridos`);
  console.log(`  ✅ ${countNaoAssociados} não-associados inseridos`);

  return pessoaIdMap;
}

// ============================================================================
// 4. LANÇAMENTOS MENSAIS
// ============================================================================

interface LancamentoRaw {
  data: Date;
  documento: string;
  cnpj: string;
  fornecedor: string;
  descricao: string;
  valorCaixa: number;
  valorBB: number;
  valorBBRenda: number;
  valorCEF: number;
}

function extrairLancamentosMensais(): LancamentoRaw[] {
  const lancamentos: LancamentoRaw[] = [];
  const mesesArquivos = [
    'janeiro.tsv', 'Fevereiro.tsv', 'Março.tsv', 'Abril.tsv', 
    'Maio.tsv', 'junho.tsv', 'julho.tsv', 'agosto.tsv', 
    'setembro.tsv', 'outubro.tsv', 'Novembro.tsv'
  ];

  for (const arquivo of mesesArquivos) {
    const filePath = path.join(TSV_PATH, arquivo);
    if (!fs.existsSync(filePath)) {
      console.log(`  ⚠️  Arquivo não encontrado: ${arquivo}`);
      continue;
    }

    const rows = parseTSV(filePath);
    
    for (let i = 4; i < rows.length; i++) {
      const row = rows[i];
      const dataStr = row[0]?.trim();
      
      if (!dataStr || dataStr === '' || dataStr.toLowerCase().includes('saldo')) continue;
      
      const data = parseDate(dataStr);
      if (!data) continue;

      const documento = row[1]?.trim() || '';
      const cnpj = row[2]?.trim() || '';
      const fornecedor = row[3]?.trim() || '';
      const descricao = row[4]?.trim() || '';
      
      const valorCaixa = parseValue(row[5] || '');
      const valorBB = parseValue(row[6] || '');
      const valorBBRenda = parseValue(row[7] || '');
      const valorCEF = parseValue(row[8] || '');

      // Só adiciona se tiver algum valor
      if (valorCaixa !== 0 || valorBB !== 0 || valorBBRenda !== 0 || valorCEF !== 0) {
        lancamentos.push({
          data,
          documento,
          cnpj,
          fornecedor,
          descricao,
          valorCaixa,
          valorBB,
          valorBBRenda,
          valorCEF,
        });
      }
    }
  }

  return lancamentos;
}

function classificarLancamento(descricao: string): { tipo: 'pagar' | 'receber', natureza: string } {
  const desc = descricao.toLowerCase();
  
  // Receitas
  if (desc.includes('contribuição') || desc.includes('contribuicao')) {
    return { tipo: 'receber', natureza: 'contribuicao' };
  }
  if (desc.includes('rendimento') || desc.includes('renda')) {
    return { tipo: 'receber', natureza: 'outros' };
  }
  if (desc.includes('premiação') || desc.includes('premiacao')) {
    return { tipo: 'receber', natureza: 'outros' };
  }
  
  // Despesas
  if (desc.includes('tarifa')) {
    return { tipo: 'pagar', natureza: 'taxa' };
  }
  if (desc.includes('energia') || desc.includes('equatorial')) {
    return { tipo: 'pagar', natureza: 'utilidade' };
  }
  if (desc.includes('agua') || desc.includes('brk')) {
    return { tipo: 'pagar', natureza: 'utilidade' };
  }
  if (desc.includes('telefone') || desc.includes('claro') || desc.includes('internet')) {
    return { tipo: 'pagar', natureza: 'utilidade' };
  }
  if (desc.includes('limpeza') || desc.includes('faxina')) {
    return { tipo: 'pagar', natureza: 'servico' };
  }
  if (desc.includes('serviço') || desc.includes('servico')) {
    return { tipo: 'pagar', natureza: 'servico' };
  }
  if (desc.includes('aquisição') || desc.includes('aquisicao') || desc.includes('material')) {
    return { tipo: 'pagar', natureza: 'material' };
  }
  if (desc.includes('mensalidade') || desc.includes('federação') || desc.includes('conselho')) {
    return { tipo: 'pagar', natureza: 'taxa' };
  }
  if (desc.includes('pagamento') || desc.includes('pag.')) {
    return { tipo: 'pagar', natureza: 'outros' };
  }
  if (desc.includes('iss') || desc.includes('imposto')) {
    return { tipo: 'pagar', natureza: 'imposto' };
  }
  
  return { tipo: 'pagar', natureza: 'outros' };
}

async function seedLancamentosMensais(
  contaIdMap: Record<string, string>,
  pessoaIdMap: Record<string, string>,
  periodoIdMap: Record<string, string>
): Promise<void> {
  console.log('\n📝 Inserindo lançamentos mensais...');
  const lancamentos = extrairLancamentosMensais();
  
  let count = 0;
  let errors = 0;

  for (const lanc of lancamentos) {
    try {
      // Determinar qual conta usar baseado no valor
      let contaId: string | null = null;
      let valor = 0;
      let contaNome = '';

      if (lanc.valorBB !== 0) {
        contaId = contaIdMap['Banco do Brasil - Conta Corrente'];
        valor = lanc.valorBB;
        contaNome = 'BB';
      } else if (lanc.valorCEF !== 0) {
        contaId = contaIdMap['Caixa Econômica Federal'];
        valor = lanc.valorCEF;
        contaNome = 'CEF';
      } else if (lanc.valorCaixa !== 0) {
        contaId = contaIdMap['Caixa Físico'];
        valor = lanc.valorCaixa;
        contaNome = 'Caixa';
      } else if (lanc.valorBBRenda !== 0) {
        contaId = contaIdMap['BB Renda Fácil'];
        valor = lanc.valorBBRenda;
        contaNome = 'BB Renda';
      }

      if (!contaId) continue;

      // Ignorar transferências internas (BB Renda Fácil)
      if (lanc.descricao.toLowerCase().includes('bb renda fácil') || 
          lanc.descricao.toLowerCase().includes('bb rende fácil') ||
          lanc.descricao.toLowerCase().includes('rende facil')) {
        continue;
      }

      const { tipo, natureza } = classificarLancamento(lanc.descricao);
      const valorAbsoluto = Math.abs(valor);
      
      // Buscar pessoa pelo nome do fornecedor
      let pessoaId: string | null = null;
      if (lanc.fornecedor) {
        const fornecedorUpper = lanc.fornecedor.toUpperCase();
        for (const [nome, id] of Object.entries(pessoaIdMap)) {
          if (nome.includes(fornecedorUpper) || fornecedorUpper.includes(nome.split(' ')[0])) {
            pessoaId = id;
            break;
          }
        }
      }

      // Determinar período
      const mesKey = `2025-${(lanc.data.getMonth() + 1).toString().padStart(2, '0')}`;
      const periodoId = periodoIdMap[mesKey];

      // Criar título
      const [tituloResult] = await db.insert(schema.titulo).values({
        tipo,
        natureza: natureza as any,
        pessoaId,
        descricao: lanc.descricao || lanc.fornecedor || 'Lançamento importado',
        valorOriginal: valorAbsoluto.toFixed(2),
        valorLiquido: valorAbsoluto.toFixed(2),
        dataEmissao: formatDateForDB(lanc.data),
        dataCompetencia: formatDateForDB(lanc.data),
        dataVencimento: formatDateForDB(lanc.data),
        numeroDocumento: lanc.documento || null,
        status: 'quitado',
        sourceSystem: 'migration',
      }).returning({ id: schema.titulo.id });

      // Criar baixa
      await db.insert(schema.tituloBaixa).values({
        tituloId: tituloResult.id,
        contaFinanceiraId: contaId,
        dataPagamento: formatDateForDB(lanc.data),
        valorPago: valorAbsoluto.toFixed(2),
        formaPagamento: lanc.documento?.toLowerCase().includes('pix') ? 'pix' : 'ted',
        documentoReferencia: lanc.documento || null,
      });

      count++;
    } catch (error: any) {
      errors++;
      if (!error.message?.includes('duplicate')) {
        // console.error(`  ❌ ${lanc.descricao}: ${error.message}`);
      }
    }
  }

  console.log(`  ✅ ${count} lançamentos inseridos`);
  if (errors > 0) {
    console.log(`  ⚠️  ${errors} duplicados/erros ignorados`);
  }
}

// ============================================================================
// 5. EXTRATOS BANCÁRIOS
// ============================================================================

interface ExtratoLinha {
  data: Date;
  tipo: 'credito' | 'debito';
  valor: number;
  descricao: string;
  documento: string;
}

function parsearExtratoBB(): ExtratoLinha[] {
  const filePath = path.join(RAWDATA_PATH, 'banco_do_brasil_extrato_novembro_2025_raw.txt');
  if (!fs.existsSync(filePath)) return [];
  
  const linhas: ExtratoLinha[] = [];
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  let currentDate: Date | null = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Detectar data de movimento (formato: 03/11/2025)
    const dateMatch = line.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (dateMatch) {
      currentDate = new Date(
        parseInt(dateMatch[3]), 
        parseInt(dateMatch[2]) - 1, 
        parseInt(dateMatch[1])
      );
      continue;
    }
    
    // Detectar valor (formato: 150,00 C ou 720,00 D)
    const valueMatch = line.match(/^([\d.,]+)\s*([CD])$/);
    if (valueMatch && currentDate) {
      const valor = parseValue(valueMatch[1]);
      const tipo = valueMatch[2] === 'C' ? 'credito' : 'debito';
      
      // Buscar descrição nas linhas anteriores
      let descricao = '';
      for (let j = i - 1; j >= Math.max(0, i - 5); j--) {
        const prevLine = lines[j].trim();
        if (prevLine.includes('Pix') || prevLine.includes('BB Rend') || 
            prevLine.includes('Tarifa') || prevLine.includes('Impostos') ||
            prevLine.includes('Transferência')) {
          descricao = prevLine;
          break;
        }
      }
      
      if (valor > 0) {
        linhas.push({
          data: currentDate,
          tipo,
          valor,
          descricao,
          documento: '',
        });
      }
    }
  }
  
  return linhas;
}

function parsearExtratoCEF(): ExtratoLinha[] {
  const filePath = path.join(RAWDATA_PATH, 'caixa_extrato_novembro_2025_lancamentos.csv');
  if (!fs.existsSync(filePath)) return [];
  
  const linhas: ExtratoLinha[] = [];
  const rows = parseCSV(filePath);
  
  for (let i = 1; i < rows.length; i++) { // Pula cabeçalho
    const row = rows[i];
    if (row.length < 7) continue;
    
    const dataStr = row[0]?.trim();
    const documento = row[1]?.trim() || '';
    const historico = row[2]?.trim() || '';
    const favorecido = row[3]?.trim() || '';
    const valorStr = row[5]?.trim() || '';
    const debCredStr = row[6]?.trim() || '';
    
    // Ignorar linhas de saldo
    if (historico.includes('SALDO DIA')) continue;
    
    const data = parseDate(dataStr);
    if (!data) continue;
    
    const valor = parseValue(valorStr);
    if (valor === 0) continue;
    
    const tipo = debCredStr === 'C' ? 'credito' : 'debito';
    const descricao = `${historico} ${favorecido}`.trim();
    
    linhas.push({ data, tipo, valor, descricao, documento });
  }
  
  return linhas;
}

async function seedExtratosBancarios(contaIdMap: Record<string, string>): Promise<void> {
  console.log('\n🏦 Inserindo extratos bancários...');
  
  // Extrato Banco do Brasil
  const linhasBB = parsearExtratoBB();
  if (linhasBB.length > 0) {
    const contaBBId = contaIdMap['Banco do Brasil - Conta Corrente'];
    if (contaBBId) {
      try {
        const [extratoBB] = await db.insert(schema.extratoBancario).values({
          contaFinanceiraId: contaBBId,
          arquivoNome: 'banco_do_brasil_extrato_novembro_2025_raw.txt',
          arquivoTipo: 'txt',
          arquivoHash: 'migration_bb_nov_2025',
          dataInicio: '2025-11-01',
          dataFim: '2025-11-30',
          totalLinhas: linhasBB.length,
          linhasConciliadas: 0,
          status: 'processado',
          importadoPor: '00000000-0000-0000-0000-000000000000',
          importadoEm: new Date(),
        }).returning({ id: schema.extratoBancario.id });

        let countBB = 0;
        for (const linha of linhasBB) {
          try {
            await db.insert(schema.extratoLinha).values({
              extratoId: extratoBB.id,
              dataMovimento: formatDateForDB(linha.data),
              tipo: linha.tipo,
              valor: linha.valor.toFixed(2),
              descricaoOriginal: linha.descricao,
              status: 'pendente',
            });
            countBB++;
          } catch (e) {
            // Ignora duplicados
          }
        }
        console.log(`  ✅ Banco do Brasil: ${countBB} linhas`);
      } catch (error: any) {
        if (error.message?.includes('duplicate')) {
          console.log(`  ⏭️  Extrato BB já existe`);
        } else {
          console.error(`  ❌ BB: ${error.message}`);
        }
      }
    }
  }

  // Extrato Caixa Econômica
  const linhasCEF = parsearExtratoCEF();
  if (linhasCEF.length > 0) {
    const contaCEFId = contaIdMap['Caixa Econômica Federal'];
    if (contaCEFId) {
      try {
        const [extratoCEF] = await db.insert(schema.extratoBancario).values({
          contaFinanceiraId: contaCEFId,
          arquivoNome: 'caixa_extrato_novembro_2025_lancamentos.csv',
          arquivoTipo: 'csv',
          arquivoHash: 'migration_cef_nov_2025',
          dataInicio: '2025-11-01',
          dataFim: '2025-11-30',
          totalLinhas: linhasCEF.length,
          linhasConciliadas: 0,
          status: 'processado',
          importadoPor: '00000000-0000-0000-0000-000000000000',
          importadoEm: new Date(),
        }).returning({ id: schema.extratoBancario.id });

        let countCEF = 0;
        for (const linha of linhasCEF) {
          try {
            await db.insert(schema.extratoLinha).values({
              extratoId: extratoCEF.id,
              dataMovimento: formatDateForDB(linha.data),
              tipo: linha.tipo,
              valor: linha.valor.toFixed(2),
              descricaoOriginal: linha.descricao,
              documentoReferencia: linha.documento,
              status: 'pendente',
            });
            countCEF++;
          } catch (e) {
            // Ignora duplicados
          }
        }
        console.log(`  ✅ Caixa Econômica: ${countCEF} linhas`);
      } catch (error: any) {
        if (error.message?.includes('duplicate')) {
          console.log(`  ⏭️  Extrato CEF já existe`);
        } else {
          console.error(`  ❌ CEF: ${error.message}`);
        }
      }
    }
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('🚀 Iniciando migração de dados do rawdata...\n');
  console.log('================================================');

  // 1. Contas Financeiras
  const contaIdMap = await seedContasFinanceiras();

  // 2. Períodos Contábeis
  const periodoIdMap = await seedPeriodosContabeis();

  // 3. Pessoas
  const pessoaIdMap = await seedPessoas();

  // 4. Lançamentos Mensais
  await seedLancamentosMensais(contaIdMap, pessoaIdMap, periodoIdMap);

  // 5. Extratos Bancários
  await seedExtratosBancarios(contaIdMap);

  console.log('\n================================================');
  console.log('✅ Migração concluída com sucesso!');
  console.log('\n📊 Resumo:');
  console.log(`   - Contas financeiras: ${Object.keys(contaIdMap).length}`);
  console.log(`   - Períodos contábeis: ${Object.keys(periodoIdMap).length}`);
  console.log(`   - Pessoas cadastradas: ${Object.keys(pessoaIdMap).length}`);
}

main().catch(console.error);

