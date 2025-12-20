/**
 * Importa doações do CSV para a tabela titulo
 * Executar: npx tsx scripts/seed-doacoes-csv.ts
 */

import { neon } from '@netlify/neon';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq, sql } from 'drizzle-orm';
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
  data: Date;
  valor: number;
}

function parseDate(dateStr: string): Date | null {
  if (!dateStr || dateStr.trim() === '') return null;
  dateStr = dateStr.trim();
  
  // Format: M/D/YYYY (e.g., 1/2/2025)
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
  const cleaned = valStr.trim().replace(/[^\d.,]/g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
}

function parseCSV(filePath: string): Doacao[] {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const doacoes: Doacao[] = [];
  const meses = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
  
  for (let i = 4; i < lines.length; i++) {
    const cols = lines[i].split(',');
    const nome = cols[0]?.trim();
    if (!nome || nome === '' || nome.toLowerCase().includes('totais')) continue;
    
    // Colunas: 0=nome, 1=matricula, 2=data_ant, 3=valor_ant, depois pares data/valor por mês
    // ANO ANTERIOR: cols 2,3
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
          doacoes.push({ nome: toTitleCase(nome), mes: meses[m], data, valor });
        }
      }
    }
  }
  
  return doacoes;
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

async function seed() {
  console.log('🌱 Importando doações do CSV...\n');
  
  const csvPath = join(process.cwd(), 'rawdata', 'associados_doacao.csv');
  const doacoes = parseCSV(csvPath);
  console.log(`📋 ${doacoes.length} doações encontradas\n`);
  
  // Buscar mapa de pessoas
  const pessoas = await db.select({ id: schema.pessoa.id, nome: schema.pessoa.nome })
    .from(schema.pessoa).where(eq(schema.pessoa.deletedAt, sql`NULL`));
  
  const pessoaMap: Record<string, string> = {};
  for (const p of pessoas) {
    pessoaMap[p.nome.toLowerCase()] = p.id;
  }
  
  let criados = 0, erros = 0;
  const naoEncontrados = new Set<string>();
  
  for (const d of doacoes) {
    const pessoaId = pessoaMap[d.nome.toLowerCase()];
    if (!pessoaId) {
      naoEncontrados.add(d.nome);
      erros++;
      continue;
    }
    
    try {
      await db.insert(schema.titulo).values({
        tipo: 'receber',
        natureza: 'contribuicao',
        pessoaId,
        descricao: `Contribuição ${d.mes}/2025`,
        valorOriginal: String(d.valor),
        valorLiquido: String(d.valor),
        dataEmissao: formatDate(d.data),
        dataCompetencia: formatDate(d.data),
        dataVencimento: formatDate(d.data),
        status: 'quitado',
        sourceSystem: 'csv_import',
      });
      criados++;
    } catch (error: any) {
      console.error(`❌ ${d.nome} ${d.mes}: ${error.message}`);
      erros++;
    }
  }
  
  if (naoEncontrados.size > 0) {
    console.log('\n⚠️ Pessoas não encontradas no banco:');
    naoEncontrados.forEach(n => console.log(`  - ${n}`));
  }
  
  console.log(`\n✅ ${criados} doações importadas, ${erros} erros`);
}

seed().catch(console.error);











