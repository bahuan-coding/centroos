/**
 * Normalização de nomes de pessoas
 * Executar: npx tsx scripts/normalize-pessoas.ts
 */

import { neon } from '@netlify/neon';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq } from 'drizzle-orm';
import * as schema from '../drizzle/schema';

const databaseUrl = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('❌ NETLIFY_DATABASE_URL ou DATABASE_URL não configurada');
  process.exit(1);
}

const sql = neon(databaseUrl);
const db = drizzle(sql, { schema });

// Preposições que ficam em minúsculo
const preposicoes = ['de', 'da', 'do', 'dos', 'das', 'e'];

function normalizeName(name: string): string {
  // Remove espaços duplos
  let normalized = name.replace(/\s+/g, ' ').trim();
  
  // Adiciona espaço após ponto colado (ex: "C.PINHEIRO" → "C. PINHEIRO")
  normalized = normalized.replace(/\.([A-Za-zÀ-ú])/g, '. $1');
  
  // Title Case
  normalized = normalized
    .toLowerCase()
    .split(' ')
    .map((word, index) => {
      // Preposições ficam minúsculas (exceto no início)
      if (index > 0 && preposicoes.includes(word)) {
        return word;
      }
      
      // Abreviações (ex: "c.", "g.", "s.") - manter maiúscula
      if (word.length === 2 && word.endsWith('.')) {
        return word.toUpperCase();
      }
      
      // Capitalizar primeira letra
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
  
  return normalized;
}

async function main() {
  console.log('🔄 Iniciando normalização de nomes...\n');
  
  const pessoas = await db.select().from(schema.pessoa);
  console.log(`📋 ${pessoas.length} pessoas encontradas\n`);
  
  let alterados = 0;
  
  for (const pessoa of pessoas) {
    const nomeOriginal = pessoa.nome;
    const nomeNormalizado = normalizeName(nomeOriginal);
    
    if (nomeOriginal !== nomeNormalizado) {
      await db.update(schema.pessoa)
        .set({ nome: nomeNormalizado })
        .where(eq(schema.pessoa.id, pessoa.id));
      
      console.log(`✅ "${nomeOriginal}" → "${nomeNormalizado}"`);
      alterados++;
    }
  }
  
  console.log(`\n✅ Normalização concluída! ${alterados} nomes atualizados.`);
}

main().catch(console.error);

