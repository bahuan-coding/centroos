/**
 * Importa pessoas e doações de NÃO ASSOCIADOS do CSV
 * Executar: npx tsx scripts/seed-nao-associados-csv.ts
 */

import { neon } from '@netlify/neon';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq, sql, isNull } from 'drizzle-orm';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as schema from '../drizzle/schema';

const databaseUrl = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('❌ DATABASE_URL não configurada');
  process.exit(1);
}

const sqlClient = neon(databaseUrl);
const db = drizzle(sqlClient, { schema });

const lowercaseWords = ['de', 'da', 'do', 'das', 'dos', 'e', 'a', 'o'];

function toTitleCase(name: string): string {
  return name.toLowerCase().split(' ')
    .map((word, index) => {
      if (!word) return '';
      if (index > 0 && lowercaseWords.includes(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    }).join(' ').replace(/\s+/g, ' ').trim();
}

interface Doacao {
  nome: string;
  mes: string;
  mesNum: number;
  data: Date;
  valor: number;
}

function parseDate(dateStr: string): Date | null {
  if (!dateStr || dateStr.trim() === '') return null;
  dateStr = dateStr.trim();
  
  // Format: M/D/YYYY (e.g., 1/3/2025)
  const mdyMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdyMatch) {
    return new Date(parseInt(mdyMatch[3]), parseInt(mdyMatch[1]) - 1, parseInt(mdyMatch[2]));
  }
  
  // Format: D-Mon (e.g., 4-Aug, 1-Sep)
  const dayMonMatch = dateStr.match(/^(\d{1,2})-([A-Za-z]{3})$/);
  if (dayMonMatch) {
    const months: Record<string, number> = {
      'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
      'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
    };
    const mon = dayMonMatch[2].toLowerCase();
    if (months[mon] !== undefined) {
      return new Date(2025, months[mon], parseInt(dayMonMatch[1]));
    }
  }
  
  return null;
}

function parseValue(valStr: string): number {
  if (!valStr) return 0;
  // Remove aspas, espaços e trata vírgula de milhar americana (1,000.00)
  let cleaned = valStr.trim().replace(/"/g, '').trim();
  // Se tem formato americano (vírgula seguida de 3 dígitos e ponto), remove a vírgula
  if (/\d,\d{3}\./.test(cleaned)) {
    cleaned = cleaned.replace(/,/g, '');
  } else {
    // Formato brasileiro: vírgula como decimal
    cleaned = cleaned.replace(/[^\d.,]/g, '').replace(',', '.');
  }
  return parseFloat(cleaned) || 0;
}

function parseCSV(filePath: string): { nomes: string[]; doacoes: Doacao[] } {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const doacoes: Doacao[] = [];
  const nomesSet = new Set<string>();
  const meses = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
  
  for (let i = 4; i < lines.length; i++) {
    const cols = lines[i].split(',');
    const nome = cols[0]?.trim();
    if (!nome || nome === '' || nome.toLowerCase().includes('totais')) continue;
    
    const nomeNorm = toTitleCase(nome);
    nomesSet.add(nomeNorm);
    
    // Colunas: 0=nome, 1=matricula, 2=valor_atual, 3=bco_cx
    // JAN: cols 4,5 | FEV: cols 6,7 | etc.
    for (let m = 0; m < 12; m++) {
      const dataCol = 4 + m * 2;
      const valorCol = 5 + m * 2;
      const dataStr = cols[dataCol]?.trim();
      const valorStr = cols[valorCol]?.trim();
      
      if (dataStr && valorStr) {
        const data = parseDate(dataStr);
        const valor = parseValue(valorStr);
        if (data && valor > 0) {
          doacoes.push({ nome: nomeNorm, mes: meses[m], mesNum: m + 1, data, valor });
        }
      }
    }
  }
  
  return { nomes: Array.from(nomesSet), doacoes };
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

async function seed() {
  console.log('🌱 Importando NÃO ASSOCIADOS do CSV...\n');
  
  const csvPath = join(process.cwd(), 'rawdata', 'nao_associados_doacao.csv');
  const { nomes, doacoes } = parseCSV(csvPath);
  
  console.log(`📋 ${nomes.length} pessoas, ${doacoes.length} doações no CSV\n`);
  
  // Buscar pessoas existentes
  const pessoasExistentes = await db.select({ id: schema.pessoa.id, nome: schema.pessoa.nome })
    .from(schema.pessoa).where(isNull(schema.pessoa.deletedAt));
  
  const pessoaMap: Record<string, string> = {};
  for (const p of pessoasExistentes) {
    pessoaMap[p.nome.toLowerCase()] = p.id;
  }
  
  // Criar pessoas que não existem
  let pessoasCriadas = 0;
  for (const nome of nomes) {
    if (!pessoaMap[nome.toLowerCase()]) {
      const [novaPessoa] = await db.insert(schema.pessoa).values({
        tipo: 'fisica',
        nome,
        ativo: true,
      }).returning({ id: schema.pessoa.id });
      pessoaMap[nome.toLowerCase()] = novaPessoa.id;
      pessoasCriadas++;
      console.log(`  + ${nome}`);
    }
  }
  console.log(`\n✅ Pessoas: ${pessoasCriadas} criadas (${nomes.length - pessoasCriadas} já existiam)\n`);
  
  // Inserir títulos
  let titulosCriados = 0, erros = 0;
  const totaisPorMes: Record<number, number> = {};
  
  for (const d of doacoes) {
    const pessoaId = pessoaMap[d.nome.toLowerCase()];
    if (!pessoaId) {
      console.error(`❌ Pessoa não encontrada: ${d.nome}`);
      erros++;
      continue;
    }
    
    try {
      await db.insert(schema.titulo).values({
        tipo: 'receber',
        natureza: 'doacao',
        pessoaId,
        descricao: `Doação ${d.mes}/2025`,
        valorOriginal: String(d.valor),
        valorLiquido: String(d.valor),
        dataEmissao: formatDate(d.data),
        dataCompetencia: formatDate(d.data),
        dataVencimento: formatDate(d.data),
        status: 'quitado',
        sourceSystem: 'csv_import_nao_associado',
      });
      titulosCriados++;
      totaisPorMes[d.mesNum] = (totaisPorMes[d.mesNum] || 0) + d.valor;
    } catch (error: any) {
      console.error(`❌ ${d.nome} ${d.mes}: ${error.message}`);
      erros++;
    }
  }
  
  const totalGeral = Object.values(totaisPorMes).reduce((a, b) => a + b, 0);
  console.log(`✅ Títulos: ${titulosCriados} criados, ${erros} erros`);
  console.log(`✅ Total: R$ ${totalGeral.toFixed(2)}\n`);
  
  // Dupla checagem - query no banco
  console.log('📊 Verificação no banco (títulos inseridos):');
  const verificacao = await db.execute(sql`
    SELECT 
      EXTRACT(MONTH FROM data_competencia::date) as mes,
      COUNT(*) as qtd,
      SUM(valor_liquido::numeric) as total
    FROM titulo 
    WHERE source_system = 'csv_import_nao_associado'
    GROUP BY 1 ORDER BY 1
  `);
  
  const mesesNome = ['', 'JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
  let totalBanco = 0;
  for (const row of verificacao.rows as any[]) {
    const mes = parseInt(row.mes);
    const total = parseFloat(row.total);
    totalBanco += total;
    const esperado = totaisPorMes[mes] || 0;
    const ok = Math.abs(total - esperado) < 0.01 ? '✓' : '✗';
    console.log(`  ${mesesNome[mes]}: R$ ${total.toFixed(2)} (${row.qtd} títulos) ${ok}`);
  }
  console.log(`  TOTAL: R$ ${totalBanco.toFixed(2)}`);
  
  // Comparar com totais do CSV (linha 67)
  const totaisCSV = { JAN: 530, FEV: 610, MAR: 845.50, ABR: 1040, MAI: 500, JUN: 1045, JUL: 965, AGO: 580, SET: 920 };
  console.log('\n📋 Comparação com totais do CSV:');
  for (const [mes, esperado] of Object.entries(totaisCSV)) {
    const mesNum = mesesNome.indexOf(mes);
    const real = totaisPorMes[mesNum] || 0;
    const ok = Math.abs(real - esperado) < 0.01 ? '✓' : `✗ (esperado: ${esperado})`;
    console.log(`  ${mes}: R$ ${real.toFixed(2)} ${ok}`);
  }
}

seed().catch(console.error);

