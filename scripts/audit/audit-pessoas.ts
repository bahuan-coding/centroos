/**
 * @deprecated Este script foi substituído pelo audit-runner.ts unificado.
 * Use: npx tsx scripts/audit-runner.ts --ano 2025 --todos --modulos pessoas
 * 
 * Script de Auditoria de Pessoas vs Doações (LEGADO)
 * Cruza dados de associados e não-associados com contribuições
 */

console.warn('⚠️  AVISO: Este script está DEPRECADO. Use: npx tsx scripts/audit-runner.ts --ano 2025 --modulos pessoas');
console.warn('');

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAWDATA_DIR = path.join(__dirname, '../rawdata');

interface PessoaRaw {
  nome: string;
  nomeNormalizado: string;
  matricula: string | null;
  tipo: 'associado' | 'nao_associado' | 'ambos';
  contribuicoes: { mes: string; data: string; valor: number }[];
  totalAnual: number;
  variacoes: string[];
}

// Normaliza nome para comparação
function normalizarNome(nome: string): string {
  return nome
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Distância de Levenshtein para detectar nomes similares
function levenshtein(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      matrix[i][j] = b.charAt(i - 1) === a.charAt(j - 1)
        ? matrix[i - 1][j - 1]
        : Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
    }
  }
  return matrix[b.length][a.length];
}

// Parse valor monetário brasileiro
function parseValor(valor: string): number {
  if (!valor || valor.trim() === '' || valor.trim() === '-') return 0;
  const cleaned = valor.replace(/[^\d.,\-]/g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
}

// Parse CSV de doações (associados ou não-associados)
function parseDoacaoCsv(filePath: string, tipo: 'associado' | 'nao_associado'): Map<string, PessoaRaw> {
  const pessoas = new Map<string, PessoaRaw>();
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').slice(4); // Pula cabeçalhos
  
  const meses = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
  
  for (const line of lines) {
    if (!line.trim() || line.startsWith('Totais')) continue;
    
    const cols = line.split(',');
    const nome = cols[0]?.trim();
    if (!nome) continue;
    
    const matricula = cols[1]?.trim() || null;
    const nomeNorm = normalizarNome(nome);
    
    // Extrai contribuições por mês
    const contribuicoes: { mes: string; data: string; valor: number }[] = [];
    let totalAnual = 0;
    
    for (let m = 0; m < 12; m++) {
      const dataIdx = 4 + m * 2;
      const valorIdx = 5 + m * 2;
      const data = cols[dataIdx]?.trim() || '';
      const valor = parseValor(cols[valorIdx] || '');
      if (valor > 0) {
        contribuicoes.push({ mes: meses[m], data, valor });
        totalAnual += valor;
      }
    }
    
    if (pessoas.has(nomeNorm)) {
      const existing = pessoas.get(nomeNorm)!;
      existing.contribuicoes.push(...contribuicoes);
      existing.totalAnual += totalAnual;
      if (!existing.variacoes.includes(nome)) existing.variacoes.push(nome);
      if (existing.tipo !== tipo) existing.tipo = 'ambos';
    } else {
      pessoas.set(nomeNorm, {
        nome,
        nomeNormalizado: nomeNorm,
        matricula,
        tipo,
        contribuicoes,
        totalAnual,
        variacoes: [nome],
      });
    }
  }
  return pessoas;
}

// Agrupa nomes similares
function agruparSimilares(pessoas: Map<string, PessoaRaw>): Map<string, PessoaRaw> {
  const nomes = Array.from(pessoas.keys());
  const merged = new Map<string, PessoaRaw>();
  const processed = new Set<string>();
  
  for (const nome of nomes) {
    if (processed.has(nome)) continue;
    
    const pessoa = pessoas.get(nome)!;
    const similares = nomes.filter(n => !processed.has(n) && n !== nome && levenshtein(nome, n) <= 4);
    
    for (const similar of similares) {
      const outra = pessoas.get(similar)!;
      pessoa.contribuicoes.push(...outra.contribuicoes);
      pessoa.totalAnual += outra.totalAnual;
      pessoa.variacoes.push(...outra.variacoes.filter(v => !pessoa.variacoes.includes(v)));
      if (pessoa.tipo !== outra.tipo) pessoa.tipo = 'ambos';
      if (!pessoa.matricula && outra.matricula) pessoa.matricula = outra.matricula;
      processed.add(similar);
    }
    
    processed.add(nome);
    merged.set(nome, pessoa);
  }
  return merged;
}

// Main
async function main() {
  console.log('=== AUDITORIA PESSOAS x DOAÇÕES ===\n');
  
  // Parse associados
  const associadosPath = path.join(RAWDATA_DIR, 'associados_doacao.csv');
  const associados = parseDoacaoCsv(associadosPath, 'associado');
  console.log(`Associados parseados: ${associados.size}`);
  
  // Parse não-associados
  const naoAssociadosPath = path.join(RAWDATA_DIR, 'nao_associados_doacao.csv');
  const naoAssociados = parseDoacaoCsv(naoAssociadosPath, 'nao_associado');
  console.log(`Não-associados parseados: ${naoAssociados.size}`);
  
  // Merge todos
  const todos = new Map<string, PessoaRaw>();
  for (const [k, v] of associados) todos.set(k, v);
  for (const [k, v] of naoAssociados) {
    if (todos.has(k)) {
      const existing = todos.get(k)!;
      existing.contribuicoes.push(...v.contribuicoes);
      existing.totalAnual += v.totalAnual;
      existing.variacoes.push(...v.variacoes.filter(vv => !existing.variacoes.includes(vv)));
      existing.tipo = 'ambos';
    } else {
      todos.set(k, v);
    }
  }
  
  // Agrupa similares
  const agrupados = agruparSimilares(todos);
  console.log(`Total após agrupamento: ${agrupados.size}\n`);
  
  // Gera relatório
  const report: string[] = ['Nome Normalizado,Variações,Tipo,Matrícula,Total 2025,Qtd Contribuições,Status'];
  
  const sortedPessoas = Array.from(agrupados.values()).sort((a, b) => a.nomeNormalizado.localeCompare(b.nomeNormalizado));
  
  let problemCount = 0;
  for (const p of sortedPessoas) {
    const status = p.variacoes.length > 1 || p.tipo === 'ambos' ? 'REVISAR' : 'OK';
    if (status === 'REVISAR') problemCount++;
    
    const variacoes = p.variacoes.join(' | ');
    const matricula = p.matricula || '-';
    const total = p.totalAnual.toFixed(2);
    const qtd = p.contribuicoes.length;
    
    report.push(`"${p.nomeNormalizado}","${variacoes}",${p.tipo},${matricula},${total},${qtd},${status}`);
  }
  
  // Salva CSV
  const outputPath = path.join(__dirname, '../audit-pessoas.csv');
  fs.writeFileSync(outputPath, report.join('\n'), 'utf-8');
  console.log(`Relatório salvo em: ${outputPath}`);
  
  // Resumo
  console.log('\n=== RESUMO ===');
  console.log(`Total de pessoas únicas: ${agrupados.size}`);
  console.log(`Associados: ${Array.from(agrupados.values()).filter(p => p.tipo === 'associado').length}`);
  console.log(`Não-associados: ${Array.from(agrupados.values()).filter(p => p.tipo === 'nao_associado').length}`);
  console.log(`Em ambas listas: ${Array.from(agrupados.values()).filter(p => p.tipo === 'ambos').length}`);
  console.log(`Itens para revisar: ${problemCount}`);
  
  // Lista problemas
  console.log('\n=== ITENS PARA REVISAR ===');
  for (const p of sortedPessoas) {
    if (p.variacoes.length > 1 || p.tipo === 'ambos') {
      console.log(`\n${p.nomeNormalizado}`);
      console.log(`  Tipo: ${p.tipo}`);
      console.log(`  Variações: ${p.variacoes.join(', ')}`);
      console.log(`  Total: R$ ${p.totalAnual.toFixed(2)}`);
    }
  }
}

main().catch(console.error);

