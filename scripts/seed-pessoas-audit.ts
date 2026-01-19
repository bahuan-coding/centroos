/**
 * Seed de Pessoas com dados auditados e normalizados
 * Usa o relatório de auditoria (audit-pessoas.csv) como fonte
 * Executar: npx tsx scripts/seed-pessoas-audit.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { neon } from '@netlify/neon';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../drizzle/schema';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const databaseUrl = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('❌ NETLIFY_DATABASE_URL ou DATABASE_URL não configurada');
  process.exit(1);
}

const sql = neon(databaseUrl);
const db = drizzle(sql, { schema });

interface PessoaAuditada {
  nomeNormalizado: string;
  variacoes: string;
  tipo: 'associado' | 'nao_associado' | 'ambos';
  matricula: string | null;
  totalAnual: number;
  qtdContribuicoes: number;
  status: 'OK' | 'REVISAR';
}

// Parse do CSV de auditoria
function parseAuditCsv(): PessoaAuditada[] {
  const csvPath = path.join(__dirname, '../audit-pessoas.csv');
  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split('\n').slice(1); // Pula cabeçalho
  
  const pessoas: PessoaAuditada[] = [];
  
  for (const line of lines) {
    if (!line.trim()) continue;
    
    // Parse CSV com campos entre aspas
    const match = line.match(/"([^"]+)","([^"]+)",(\w+),([^,]+),([^,]+),(\d+),(\w+)/);
    if (!match) continue;
    
    pessoas.push({
      nomeNormalizado: match[1],
      variacoes: match[2],
      tipo: match[3] as 'associado' | 'nao_associado' | 'ambos',
      matricula: match[4] === '-' ? null : match[4],
      totalAnual: parseFloat(match[5]) || 0,
      qtdContribuicoes: parseInt(match[6]) || 0,
      status: match[7] as 'OK' | 'REVISAR',
    });
  }
  
  return pessoas;
}

// Escolhe o melhor nome dentre as variações
function escolherMelhorNome(variacoes: string): string {
  const nomes = variacoes.split(' | ');
  // Prefere o nome com acentuação correta (mais caracteres especiais)
  return nomes.reduce((best, current) => {
    const bestSpecial = (best.match(/[áéíóúãõâêîôûç]/gi) || []).length;
    const currentSpecial = (current.match(/[áéíóúãõâêîôûç]/gi) || []).length;
    return currentSpecial > bestSpecial ? current : best;
  }, nomes[0]);
}

async function seed() {
  console.log('🌱 Iniciando seed de pessoas com dados auditados...\n');
  
  const pessoas = parseAuditCsv();
  console.log(`📋 ${pessoas.length} pessoas encontradas no relatório de auditoria\n`);
  
  let criados = 0;
  let associadosCriados = 0;
  let erros = 0;
  
  for (const p of pessoas) {
    const nome = escolherMelhorNome(p.variacoes);
    const isAssociado = p.tipo === 'associado' || p.tipo === 'ambos';
    
    try {
      // Criar pessoa
      const [pessoa] = await db.insert(schema.pessoa).values({
        tipo: 'fisica',
        nome,
        ativo: true,
        observacoes: p.status === 'REVISAR' ? `REVISAR: ${p.variacoes}` : undefined,
      }).returning({ id: schema.pessoa.id });
      
      criados++;
      
      // Se é associado, criar registro de associado
      if (isAssociado) {
        await db.insert(schema.associado).values({
          pessoaId: pessoa.id,
          numeroRegistro: p.matricula || undefined,
          dataAdmissao: '2024-01-01',
          status: p.qtdContribuicoes > 0 ? 'ativo' : 'suspenso',
          categoria: 'trabalhador',
          valorContribuicaoSugerido: p.qtdContribuicoes > 0 ? String(Math.round(p.totalAnual / p.qtdContribuicoes)) : undefined,
          periodicidade: 'mensal',
          isento: p.qtdContribuicoes === 0,
          diaVencimento: 10,
        });
        associadosCriados++;
      }
      
      const icon = p.status === 'REVISAR' ? '⚠️' : '✅';
      const tipoLabel = isAssociado ? 'associado' : 'doador';
      console.log(`${icon} ${nome} (${tipoLabel}${p.matricula ? `, mat: ${p.matricula}` : ''})`);
      
    } catch (error: any) {
      if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
        console.log(`⏭️  ${nome} (já existe)`);
      } else {
        console.error(`❌ ${nome}: ${error.message}`);
        erros++;
      }
    }
  }
  
  console.log('\n✅ Seed finalizado!');
  console.log(`📊 Resumo:`);
  console.log(`   - Pessoas criadas: ${criados}`);
  console.log(`   - Associados: ${associadosCriados}`);
  console.log(`   - Não-associados: ${criados - associadosCriados}`);
  console.log(`   - Erros: ${erros}`);
}

seed().catch(console.error);




















