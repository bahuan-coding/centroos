/**
 * Seed de Associados a partir do CSV
 * Executar: npx tsx scripts/seed-associados-csv.ts
 */

import { neon } from '@netlify/neon';
import { drizzle } from 'drizzle-orm/neon-http';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as schema from '../drizzle/schema';

const databaseUrl = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('❌ DATABASE_URL não configurada');
  process.exit(1);
}

const sql = neon(databaseUrl);
const db = drizzle(sql, { schema });

// Palavras que devem ficar em minúsculo (exceto no início)
const lowercaseWords = ['de', 'da', 'do', 'das', 'dos', 'e', 'a', 'o'];

function toTitleCase(name: string): string {
  return name
    .toLowerCase()
    .split(' ')
    .map((word, index) => {
      if (!word) return '';
      if (index > 0 && lowercaseWords.includes(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

interface Associado {
  nome: string;
  matricula: string | null;
}

function parseCSV(filePath: string): Associado[] {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const associados: Associado[] = [];
  
  // Pular headers (linhas 0-4) e processar dados
  for (let i = 4; i < lines.length; i++) {
    const line = lines[i];
    const cols = line.split(',');
    const nome = cols[0]?.trim();
    const matricula = cols[1]?.trim();
    
    // Pular linhas vazias, totais, ou sem nome válido
    if (!nome || nome === '' || nome.toLowerCase().includes('totais')) continue;
    
    associados.push({
      nome: toTitleCase(nome),
      matricula: matricula && matricula !== '' ? matricula : null,
    });
  }
  
  return associados;
}

async function seed() {
  console.log('🌱 Carregando associados do CSV...\n');
  
  const csvPath = join(process.cwd(), 'rawdata', 'associados_doacao.csv');
  const associados = parseCSV(csvPath);
  
  console.log(`📋 ${associados.length} associados encontrados no CSV\n`);
  
  let criados = 0;
  for (const assoc of associados) {
    try {
      // Criar pessoa
      const [pessoa] = await db.insert(schema.pessoa).values({
        tipo: 'fisica',
        nome: assoc.nome,
        ativo: true,
      }).returning({ id: schema.pessoa.id });
      
      // Criar registro de associado
      await db.insert(schema.associado).values({
        pessoaId: pessoa.id,
        numeroRegistro: assoc.matricula || undefined,
        dataAdmissao: '2024-01-01',
        status: 'ativo',
        categoria: 'trabalhador',
        periodicidade: 'mensal',
        isento: false,
        diaVencimento: 10,
      });
      
      criados++;
      console.log(`✅ ${assoc.nome}${assoc.matricula ? ` (mat: ${assoc.matricula})` : ''}`);
    } catch (error: any) {
      console.error(`❌ ${assoc.nome}: ${error.message}`);
    }
  }

  console.log(`\n✅ Seed finalizado! ${criados} associados criados.`);
}

seed().catch(console.error);

























