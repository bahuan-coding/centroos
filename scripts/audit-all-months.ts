/**
 * Script de Auditoria Completa - Todos os Meses
 * 
 * Valida a integridade dos dados de contribuições em todos os meses,
 * cruzando os dados do rawdata com o banco de dados.
 * 
 * Executar: npx tsx scripts/audit-all-months.ts
 */

import { neon } from '@netlify/neon';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
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

const neonClient = neon(databaseUrl);
const db = drizzle(neonClient, { schema });

const RAWDATA_PATH = path.join(__dirname, '..', 'rawdata', 'relatorio_excel_sheets_tsv');

// ============================================================================
// TIPOS
// ============================================================================

interface ContribuicaoRawdata {
  data: Date;
  fornecedor: string;
  descricao: string;
  valor: number;
  tipo: 'associado' | 'nao_associado';
  mes: string;
}

interface TituloDB {
  id: string;
  dataCompetencia: string;
  pessoaNome: string | null;
  descricao: string;
  valor: number;
}

interface DiscrepanciaResult {
  mes: string;
  tipo: 'faltando_no_db' | 'pessoa_errada' | 'valor_divergente' | 'extra_no_db';
  rawdata?: ContribuicaoRawdata;
  titulo?: TituloDB;
  mensagem: string;
}

// ============================================================================
// UTILIDADES
// ============================================================================

function parseTSV(filePath: string): string[][] {
  const content = fs.readFileSync(filePath, 'utf-8');
  return content.split('\n').map(line => line.split('\t'));
}

function parseDate(dateStr: string): Date | null {
  if (!dateStr || dateStr.trim() === '') return null;
  const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]));
  }
  return null;
}

function parseValue(valStr: string): number {
  if (!valStr || valStr.trim() === '') return 0;
  const cleaned = valStr.replace(/R\$\s*/g, '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function normalizeName(name: string): string {
  if (!name) return '';
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function getNameTokens(name: string): string[] {
  const normalized = normalizeName(name);
  const stopWords = ['DE', 'DA', 'DO', 'DAS', 'DOS', 'E'];
  return normalized
    .split(' ')
    .filter(token => token.length > 1 && !stopWords.includes(token));
}

function calculateNameSimilarity(name1: string, name2: string): number {
  const tokens1 = getNameTokens(name1);
  const tokens2 = getNameTokens(name2);
  
  if (tokens1.length === 0 || tokens2.length === 0) return 0;
  
  let matchingTokens = 0;
  let partialMatches = 0;
  
  for (const t1 of tokens1) {
    for (const t2 of tokens2) {
      if (t1 === t2) {
        matchingTokens++;
        break;
      }
      if (t1.length >= 3 && t2.length >= 3) {
        if (t1.startsWith(t2) || t2.startsWith(t1)) {
          partialMatches += 0.5;
          break;
        }
      }
    }
  }
  
  const totalMatches = matchingTokens + partialMatches;
  const maxTokens = Math.max(tokens1.length, tokens2.length);
  const minTokens = Math.min(tokens1.length, tokens2.length);
  
  const coverageScore = totalMatches / minTokens;
  const overallScore = totalMatches / maxTokens;
  
  return (coverageScore * 0.7) + (overallScore * 0.3);
}

// ============================================================================
// PARSING DE ARQUIVOS MENSAIS
// ============================================================================

const MESES_ARQUIVOS: Record<string, string> = {
  '01': 'janeiro.tsv',
  '02': 'Fevereiro.tsv',
  '03': 'Março.tsv',
  '04': 'Abril.tsv',
  '05': 'Maio.tsv',
  '06': 'junho.tsv',
  '07': 'julho.tsv',
  '08': 'agosto.tsv',
  '09': 'setembro.tsv',
  '10': 'outubro.tsv',
  '11': 'Novembro.tsv',
  '12': 'Dezembro.tsv',
};

const MESES_NOMES: Record<string, string> = {
  '01': 'Janeiro',
  '02': 'Fevereiro',
  '03': 'Março',
  '04': 'Abril',
  '05': 'Maio',
  '06': 'Junho',
  '07': 'Julho',
  '08': 'Agosto',
  '09': 'Setembro',
  '10': 'Outubro',
  '11': 'Novembro',
  '12': 'Dezembro',
};

function extrairContribuicoesDoMes(mesNumero: string): ContribuicaoRawdata[] {
  const arquivo = MESES_ARQUIVOS[mesNumero];
  if (!arquivo) return [];
  
  const filePath = path.join(RAWDATA_PATH, arquivo);
  if (!fs.existsSync(filePath)) {
    return [];
  }
  
  const contribuicoes: ContribuicaoRawdata[] = [];
  const rows = parseTSV(filePath);
  
  for (let i = 5; i < rows.length; i++) {
    const row = rows[i];
    const dataStr = row[0]?.trim();
    const fornecedor = row[3]?.trim() || '';
    const descricao = row[4]?.trim() || '';
    
    // Apenas contribuições
    if (!descricao.toLowerCase().includes('contribuição')) continue;
    
    const data = parseDate(dataStr);
    if (!data) continue;
    
    // Determinar valor (pode estar em várias colunas de conta)
    let valor = 0;
    for (let col = 5; col <= 8; col++) {
      const v = parseValue(row[col] || '');
      if (v !== 0) {
        valor = Math.abs(v);
        break;
      }
    }
    
    if (valor <= 0) continue;
    
    const tipo = descricao.toLowerCase().includes('não associado') 
      ? 'nao_associado' 
      : 'associado';
    
    contribuicoes.push({
      data,
      fornecedor,
      descricao,
      valor,
      tipo,
      mes: MESES_NOMES[mesNumero],
    });
  }
  
  return contribuicoes;
}

// ============================================================================
// BUSCA NO BANCO DE DADOS
// ============================================================================

async function buscarTitulosDoMes(ano: number, mes: number): Promise<TituloDB[]> {
  const dataInicio = `${ano}-${mes.toString().padStart(2, '0')}-01`;
  const dataFim = new Date(ano, mes, 0).toISOString().split('T')[0]; // Último dia do mês
  
  const titulos = await db
    .select({
      id: schema.titulo.id,
      dataCompetencia: schema.titulo.dataCompetencia,
      descricao: schema.titulo.descricao,
      valorLiquido: schema.titulo.valorLiquido,
      pessoaNome: schema.pessoa.nome,
    })
    .from(schema.titulo)
    .leftJoin(schema.pessoa, eq(schema.titulo.pessoaId, schema.pessoa.id))
    .where(
      and(
        eq(schema.titulo.tipo, 'receber'),
        gte(schema.titulo.dataCompetencia, dataInicio),
        lte(schema.titulo.dataCompetencia, dataFim),
        eq(schema.titulo.deletedAt, sql`NULL`)
      )
    );
  
  return titulos.map(t => ({
    id: t.id,
    dataCompetencia: t.dataCompetencia as string,
    pessoaNome: t.pessoaNome,
    descricao: t.descricao || '',
    valor: parseFloat(t.valorLiquido as string) || 0,
  }));
}

// ============================================================================
// AUDITORIA
// ============================================================================

async function auditarMes(ano: number, mesNumero: string): Promise<{
  contribuicoesRawdata: number;
  titulosDB: number;
  discrepancias: DiscrepanciaResult[];
  valorRawdata: number;
  valorDB: number;
}> {
  const mes = parseInt(mesNumero);
  const contribuicoes = extrairContribuicoesDoMes(mesNumero);
  const titulos = await buscarTitulosDoMes(ano, mes);
  
  const discrepancias: DiscrepanciaResult[] = [];
  const titulosUsados = new Set<string>();
  
  // Para cada contribuição no rawdata, buscar título correspondente
  for (const contrib of contribuicoes) {
    let encontrado = false;
    
    for (const titulo of titulos) {
      if (titulosUsados.has(titulo.id)) continue;
      
      // Verificar se a data coincide
      const tituloData = new Date(titulo.dataCompetencia);
      if (tituloData.getDate() !== contrib.data.getDate()) continue;
      
      // Verificar se o valor coincide
      if (Math.abs(titulo.valor - contrib.valor) > 0.01) continue;
      
      // Verificar se o nome é similar
      if (titulo.pessoaNome) {
        const similarity = calculateNameSimilarity(contrib.fornecedor, titulo.pessoaNome);
        if (similarity >= 0.5) {
          titulosUsados.add(titulo.id);
          encontrado = true;
          break;
        }
      }
    }
    
    if (!encontrado) {
      // Tentar encontrar por valor e data, mas com pessoa errada
      const candidatos = titulos.filter(t => 
        !titulosUsados.has(t.id) &&
        new Date(t.dataCompetencia).getDate() === contrib.data.getDate() &&
        Math.abs(t.valor - contrib.valor) <= 0.01
      );
      
      if (candidatos.length > 0) {
        const cand = candidatos[0];
        discrepancias.push({
          mes: MESES_NOMES[mesNumero],
          tipo: 'pessoa_errada',
          rawdata: contrib,
          titulo: cand,
          mensagem: `Contribuição de "${contrib.fornecedor}" (R$ ${contrib.valor.toFixed(2)}) ` +
            `está atribuída a "${cand.pessoaNome}" no banco`,
        });
        titulosUsados.add(cand.id);
      } else {
        discrepancias.push({
          mes: MESES_NOMES[mesNumero],
          tipo: 'faltando_no_db',
          rawdata: contrib,
          mensagem: `Contribuição de "${contrib.fornecedor}" (R$ ${contrib.valor.toFixed(2)}) ` +
            `em ${contrib.data.toLocaleDateString('pt-BR')} não encontrada no banco`,
        });
      }
    }
  }
  
  // Títulos extras no DB que não correspondem a contribuições no rawdata
  for (const titulo of titulos) {
    if (titulosUsados.has(titulo.id)) continue;
    
    // Verificar se a descrição indica contribuição
    const desc = titulo.descricao.toLowerCase();
    if (desc.includes('contribui')) {
      discrepancias.push({
        mes: MESES_NOMES[mesNumero],
        tipo: 'extra_no_db',
        titulo,
        mensagem: `Título "${titulo.pessoaNome}" (R$ ${titulo.valor.toFixed(2)}) ` +
          `não corresponde a nenhuma contribuição no rawdata`,
      });
    }
  }
  
  const valorRawdata = contribuicoes.reduce((sum, c) => sum + c.valor, 0);
  const valorDB = titulos.reduce((sum, t) => sum + t.valor, 0);
  
  return {
    contribuicoesRawdata: contribuicoes.length,
    titulosDB: titulos.length,
    discrepancias,
    valorRawdata,
    valorDB,
  };
}

// ============================================================================
// RELATÓRIO
// ============================================================================

async function main() {
  console.log('🔍 AUDITORIA COMPLETA - TODOS OS MESES DE 2025\n');
  console.log('='.repeat(80));
  
  const ano = 2025;
  const resultadosGerais: {
    mes: string;
    contribuicoesRawdata: number;
    titulosDB: number;
    valorRawdata: number;
    valorDB: number;
    discrepancias: number;
  }[] = [];
  
  const todasDiscrepancias: DiscrepanciaResult[] = [];
  
  // Auditar cada mês
  for (const [mesNumero, mesNome] of Object.entries(MESES_NOMES)) {
    const arquivo = MESES_ARQUIVOS[mesNumero];
    const filePath = path.join(RAWDATA_PATH, arquivo);
    
    if (!fs.existsSync(filePath)) {
      console.log(`\n⚠️  ${mesNome}: Arquivo não encontrado (${arquivo})`);
      continue;
    }
    
    console.log(`\n📅 Auditando ${mesNome}...`);
    
    try {
      const resultado = await auditarMes(ano, mesNumero);
      
      resultadosGerais.push({
        mes: mesNome,
        contribuicoesRawdata: resultado.contribuicoesRawdata,
        titulosDB: resultado.titulosDB,
        valorRawdata: resultado.valorRawdata,
        valorDB: resultado.valorDB,
        discrepancias: resultado.discrepancias.length,
      });
      
      todasDiscrepancias.push(...resultado.discrepancias);
      
      const status = resultado.discrepancias.length === 0 ? '✅' : '⚠️';
      console.log(`   ${status} Rawdata: ${resultado.contribuicoesRawdata} contribuições (R$ ${resultado.valorRawdata.toFixed(2)})`);
      console.log(`   ${status} Banco: ${resultado.titulosDB} títulos (R$ ${resultado.valorDB.toFixed(2)})`);
      console.log(`   ${status} Discrepâncias: ${resultado.discrepancias.length}`);
      
    } catch (error: any) {
      console.error(`   ❌ Erro: ${error.message}`);
    }
  }
  
  // Resumo geral
  console.log('\n' + '='.repeat(80));
  console.log('📊 RESUMO GERAL');
  console.log('='.repeat(80));
  
  console.log('\nMês'.padEnd(12) + 'Rawdata'.padStart(10) + 'Banco'.padStart(10) + 
    'R$ Raw'.padStart(12) + 'R$ Banco'.padStart(12) + 'Discr.'.padStart(8));
  console.log('-'.repeat(64));
  
  let totalRawdata = 0;
  let totalDB = 0;
  let totalValorRaw = 0;
  let totalValorDB = 0;
  let totalDiscrepancias = 0;
  
  for (const r of resultadosGerais) {
    totalRawdata += r.contribuicoesRawdata;
    totalDB += r.titulosDB;
    totalValorRaw += r.valorRawdata;
    totalValorDB += r.valorDB;
    totalDiscrepancias += r.discrepancias;
    
    console.log(
      r.mes.padEnd(12) + 
      r.contribuicoesRawdata.toString().padStart(10) + 
      r.titulosDB.toString().padStart(10) +
      r.valorRawdata.toFixed(2).padStart(12) +
      r.valorDB.toFixed(2).padStart(12) +
      r.discrepancias.toString().padStart(8)
    );
  }
  
  console.log('-'.repeat(64));
  console.log(
    'TOTAL'.padEnd(12) + 
    totalRawdata.toString().padStart(10) + 
    totalDB.toString().padStart(10) +
    totalValorRaw.toFixed(2).padStart(12) +
    totalValorDB.toFixed(2).padStart(12) +
    totalDiscrepancias.toString().padStart(8)
  );
  
  // Detalhes das discrepâncias
  if (todasDiscrepancias.length > 0) {
    console.log('\n' + '='.repeat(80));
    console.log('⚠️  DETALHES DAS DISCREPÂNCIAS');
    console.log('='.repeat(80));
    
    // Agrupar por tipo
    const porTipo = {
      faltando_no_db: todasDiscrepancias.filter(d => d.tipo === 'faltando_no_db'),
      pessoa_errada: todasDiscrepancias.filter(d => d.tipo === 'pessoa_errada'),
      extra_no_db: todasDiscrepancias.filter(d => d.tipo === 'extra_no_db'),
    };
    
    if (porTipo.faltando_no_db.length > 0) {
      console.log(`\n🔴 Contribuições FALTANDO no banco (${porTipo.faltando_no_db.length}):`);
      for (const d of porTipo.faltando_no_db) {
        console.log(`   [${d.mes}] ${d.mensagem}`);
      }
    }
    
    if (porTipo.pessoa_errada.length > 0) {
      console.log(`\n🟡 Contribuições atribuídas a PESSOA ERRADA (${porTipo.pessoa_errada.length}):`);
      for (const d of porTipo.pessoa_errada) {
        console.log(`   [${d.mes}] ${d.mensagem}`);
      }
    }
    
    if (porTipo.extra_no_db.length > 0) {
      console.log(`\n🟠 Títulos EXTRAS no banco (${porTipo.extra_no_db.length}):`);
      for (const d of porTipo.extra_no_db) {
        console.log(`   [${d.mes}] ${d.mensagem}`);
      }
    }
  }
  
  // Gerar CSV com discrepâncias
  if (todasDiscrepancias.length > 0) {
    const csvPath = path.join(__dirname, '..', 'audit-all-months.csv');
    const csvLines = ['Mes,Tipo,Fornecedor_Raw,Valor_Raw,Pessoa_DB,Valor_DB,Mensagem'];
    
    for (const d of todasDiscrepancias) {
      const fornecedorRaw = d.rawdata?.fornecedor || '';
      const valorRaw = d.rawdata?.valor?.toFixed(2) || '';
      const pessoaDB = d.titulo?.pessoaNome || '';
      const valorDB = d.titulo?.valor?.toFixed(2) || '';
      
      csvLines.push(
        `"${d.mes}","${d.tipo}","${fornecedorRaw}","${valorRaw}","${pessoaDB}","${valorDB}","${d.mensagem.replace(/"/g, '""')}"`
      );
    }
    
    fs.writeFileSync(csvPath, csvLines.join('\n'));
    console.log(`\n📄 CSV de discrepâncias gerado: ${csvPath}`);
  }
  
  console.log('\n✅ Auditoria concluída!');
  
  // Código de saída baseado em discrepâncias
  if (totalDiscrepancias > 0) {
    console.log(`\n⚠️  ${totalDiscrepancias} discrepância(s) encontrada(s). Revisar relatório acima.`);
  } else {
    console.log('\n🎉 Nenhuma discrepância encontrada! Dados consistentes.');
  }
}

main().catch(console.error);

