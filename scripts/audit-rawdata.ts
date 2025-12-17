/**
 * Script de Auditoria de Dados Brutos (RawData)
 * Processa as planilhas de contribuições e gera relatório consolidado
 * 
 * Executar: npx tsx scripts/audit-rawdata.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Contribuicao {
  data: string;
  valor: number;
}

interface PessoaAuditada {
  nome: string;
  matricula: string;
  tipo: 'associado' | 'nao_associado';
  contribuicoes: Contribuicao[];
  totalContribuicoes: number;
  valorTotal: number;
  anoAnterior: number;
}

function parseValor(str: string): number {
  if (!str || str.trim() === '') return 0;
  const cleaned = str.replace(',', '.').replace(/[^\d.-]/g, '');
  return parseFloat(cleaned) || 0;
}

function parseTSV(content: string): string[][] {
  return content.split('\n').map(line => line.split('\t'));
}

function processarAssociados(filePath: string): PessoaAuditada[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const rows = parseTSV(content);
  const pessoas: PessoaAuditada[] = [];

  // Pular cabeçalhos (linhas 1-4) e linhas vazias/totais
  for (let i = 4; i < rows.length; i++) {
    const row = rows[i];
    const nome = row[0]?.trim();
    
    // Pular linhas vazias, totais, ou sem nome
    if (!nome || nome === '' || nome.toLowerCase().startsWith('totais')) continue;

    const matricula = row[1]?.trim() || '';
    const contribuicoes: Contribuicao[] = [];
    let anoAnterior = 0;

    // Colunas: ANO ANTERIOR (data, valor), depois JAN a DEZ (data, valor cada)
    // Índices: 2=data ano ant, 3=valor ano ant, 4=data jan, 5=valor jan, ...
    
    // Ano anterior
    const valorAnoAnt = parseValor(row[3]);
    if (valorAnoAnt > 0) {
      anoAnterior = valorAnoAnt;
    }

    // Meses (JAN a DEZ) - pares de colunas começando no índice 4
    for (let col = 4; col < row.length - 1; col += 2) {
      const data = row[col]?.trim();
      const valor = parseValor(row[col + 1]);
      if (data && valor > 0) {
        contribuicoes.push({ data: data.split(' ')[0], valor }); // Remove " 00:00:00"
      }
    }

    const valorTotal = contribuicoes.reduce((sum, c) => sum + c.valor, 0) + anoAnterior;

    pessoas.push({
      nome,
      matricula,
      tipo: 'associado',
      contribuicoes,
      totalContribuicoes: contribuicoes.length,
      valorTotal,
      anoAnterior,
    });
  }

  return pessoas;
}

function processarNaoAssociados(filePath: string): PessoaAuditada[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const rows = parseTSV(content);
  const pessoas: PessoaAuditada[] = [];

  // Pular cabeçalhos (linhas 1-4) e linhas vazias/totais
  for (let i = 4; i < rows.length; i++) {
    const row = rows[i];
    const nome = row[0]?.trim();
    
    // Pular linhas vazias, totais, ou sem nome
    if (!nome || nome === '' || nome.toLowerCase().startsWith('totais')) continue;

    const contribuicoes: Contribuicao[] = [];

    // Colunas: VALOR Atual (2), Bco/Cx (3), depois JAN a DEZ (data, valor cada)
    // Índices: 4=data jan, 5=valor jan, ...
    
    for (let col = 4; col < row.length - 1; col += 2) {
      const data = row[col]?.trim();
      const valor = parseValor(row[col + 1]);
      if (data && valor > 0) {
        contribuicoes.push({ data: data.split(' ')[0], valor });
      }
    }

    const valorTotal = contribuicoes.reduce((sum, c) => sum + c.valor, 0);

    pessoas.push({
      nome,
      matricula: '',
      tipo: 'nao_associado',
      contribuicoes,
      totalContribuicoes: contribuicoes.length,
      valorTotal,
      anoAnterior: 0,
    });
  }

  return pessoas;
}

function consolidarDuplicatas(pessoas: PessoaAuditada[]): Map<string, PessoaAuditada> {
  const consolidado = new Map<string, PessoaAuditada>();

  for (const pessoa of pessoas) {
    const nomeNorm = pessoa.nome.toUpperCase().trim();
    
    if (consolidado.has(nomeNorm)) {
      const existente = consolidado.get(nomeNorm)!;
      existente.contribuicoes.push(...pessoa.contribuicoes);
      existente.totalContribuicoes += pessoa.totalContribuicoes;
      existente.valorTotal += pessoa.valorTotal;
      existente.anoAnterior += pessoa.anoAnterior;
      // Se um é associado, mantém como associado
      if (pessoa.tipo === 'associado') existente.tipo = 'associado';
      if (pessoa.matricula && !existente.matricula) existente.matricula = pessoa.matricula;
    } else {
      consolidado.set(nomeNorm, { ...pessoa });
    }
  }

  return consolidado;
}

async function main() {
  console.log('🔍 AUDITORIA DE DADOS BRUTOS (RawData)\n');
  console.log('='.repeat(80));

  const rawdataDir = path.join(__dirname, '..', 'rawdata', 'relatorio_excel_sheets_tsv');

  // Processar arquivos
  const associados = processarAssociados(path.join(rawdataDir, 'CONTRIBUIÇÃO_ASSOCIADOS.tsv'));
  const naoAssociados = processarNaoAssociados(path.join(rawdataDir, 'CONTRIBUIÇÃO_NAO_ASSOCIADOS.tsv'));

  // Consolidar (algumas pessoas aparecem em ambas listas ou múltiplas vezes)
  const todasPessoas = [...associados, ...naoAssociados];
  const consolidado = consolidarDuplicatas(todasPessoas);

  // Separar em grupos
  const comDoacoes: PessoaAuditada[] = [];
  const semDoacoes: PessoaAuditada[] = [];

  for (const pessoa of consolidado.values()) {
    if (pessoa.valorTotal > 0) {
      comDoacoes.push(pessoa);
    } else {
      semDoacoes.push(pessoa);
    }
  }

  // Ordenar por valor total
  comDoacoes.sort((a, b) => b.valorTotal - a.valorTotal);
  semDoacoes.sort((a, b) => a.nome.localeCompare(b.nome));

  // === RELATÓRIO ===
  console.log('\n📊 RESUMO GERAL');
  console.log('-'.repeat(40));
  console.log(`Total de pessoas no RawData: ${consolidado.size}`);
  console.log(`  - Com doações: ${comDoacoes.length}`);
  console.log(`  - Sem doações: ${semDoacoes.length}`);
  console.log(`Valor total de doações: R$ ${comDoacoes.reduce((s, p) => s + p.valorTotal, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);

  // TOP DOADORES
  console.log('\n🏆 TOP 15 DOADORES (DADOS REAIS DO RAWDATA)');
  console.log('-'.repeat(80));
  console.log('Nome'.padEnd(45) + 'Tipo'.padEnd(15) + 'Qtd'.padStart(5) + 'Valor Total'.padStart(15));
  console.log('-'.repeat(80));

  for (const pessoa of comDoacoes.slice(0, 15)) {
    const tipo = pessoa.tipo === 'associado' ? 'Associado' : 'Não Assoc.';
    const qtd = pessoa.totalContribuicoes.toString();
    const valor = `R$ ${pessoa.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    console.log(pessoa.nome.substring(0, 44).padEnd(45) + tipo.padEnd(15) + qtd.padStart(5) + valor.padStart(15));
  }

  // PESSOAS SEM DOAÇÕES (PROBLEMÁTICAS SE APARECEREM COMO DOADORES NO SISTEMA)
  console.log('\n⚠️  ASSOCIADOS SEM NENHUMA DOAÇÃO NO RAWDATA');
  console.log('-'.repeat(80));
  console.log('(Se alguma dessas pessoas aparecer como doadora no sistema, está ERRADO)');
  console.log('-'.repeat(80));

  const associadosSemDoacao = semDoacoes.filter(p => p.tipo === 'associado');
  for (const pessoa of associadosSemDoacao) {
    console.log(`  ❌ ${pessoa.nome} (matrícula: ${pessoa.matricula || 'N/A'})`);
  }

  console.log('\n⚠️  NÃO-ASSOCIADOS SEM NENHUMA DOAÇÃO NO RAWDATA');
  console.log('-'.repeat(60));
  const naoAssociadosSemDoacao = semDoacoes.filter(p => p.tipo === 'nao_associado');
  for (const pessoa of naoAssociadosSemDoacao) {
    console.log(`  ❌ ${pessoa.nome}`);
  }

  // GERAR CSV PARA AUDITORIA
  const csvPath = path.join(__dirname, '..', 'audit-issues.csv');
  const csvLines = ['Nome,Tipo,Matricula,Total_Contribuicoes,Valor_Total,Status'];
  
  for (const pessoa of consolidado.values()) {
    const status = pessoa.valorTotal > 0 ? 'OK' : 'SEM_DOACAO';
    csvLines.push(`"${pessoa.nome}",${pessoa.tipo},${pessoa.matricula},${pessoa.totalContribuicoes},${pessoa.valorTotal.toFixed(2)},${status}`);
  }

  fs.writeFileSync(csvPath, csvLines.join('\n'));
  console.log(`\n📄 CSV de auditoria gerado: ${csvPath}`);

  // LISTA ESPECÍFICA: MARIA JÚLIA
  console.log('\n' + '='.repeat(80));
  console.log('🔴 CASO ESPECÍFICO: MARIA JÚLIA TEIXEIRA LEMOS');
  console.log('='.repeat(80));
  
  const mariaJulia = consolidado.get('MARIA JÚLIA TEIXEIRA LEMOS');
  if (mariaJulia) {
    console.log(`Nome: ${mariaJulia.nome}`);
    console.log(`Matrícula: ${mariaJulia.matricula}`);
    console.log(`Tipo: ${mariaJulia.tipo}`);
    console.log(`Contribuições no RawData: ${mariaJulia.totalContribuicoes}`);
    console.log(`Valor Total no RawData: R$ ${mariaJulia.valorTotal.toFixed(2)}`);
    console.log('\n➡️  VEREDICTO: Esta pessoa NÃO TEM doações no RawData.');
    console.log('   Qualquer título associado a ela no banco está INCORRETO e deve ser deletado.');
  }

  console.log('\n✅ Auditoria concluída!');
}

main().catch(console.error);
