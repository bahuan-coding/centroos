/**
 * Script de Sanitização - Deletar títulos de pessoas sem doações no RawData
 * 
 * Executar: npx tsx scripts/sanitize-titulos.ts
 */

import { neon } from '@netlify/neon';
import { drizzle } from 'drizzle-orm/neon-http';
import { sql } from 'drizzle-orm';

const databaseUrl = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('❌ NETLIFY_DATABASE_URL ou DATABASE_URL não configurada');
  process.exit(1);
}

const sqlClient = neon(databaseUrl);
const db = drizzle(sqlClient);

// Lista de pessoas que NÃO TÊM doações no RawData
// Qualquer título associado a elas deve ser DELETADO
const PESSOAS_SEM_DOACAO = [
  'CÉLIA MARIA BRAGA NETTO COSTA',
  'DIVA GALVÃO CAVALCANTE',
  'MARIA JÚLIA TEIXEIRA LEMOS',
  'ELISABETE FREIRE COSTA BARROS',
  'SAMIRA CAVALCANTE LIMA',
  'ELIANE FERREIRA DOS SANTOS',
  'IRACI SILVA MELO',
  'CRISTINA RAQUEL LOPES DOS S. TONIAL',
  'ANA PAULA BORGES MENDONÇA',
  'MARIA ADRIANA DE MELO SARMENTO',
  'CRISTINA FEITOSA SILVA',
  'CRISTINA FEITOSA  SILVA', // variação com espaço duplo
  'ZEJANE CARDOSO DA SILVA CAMINHO',
  'CLAUDIO F. PERRELLI',
  'LUIZ BEZERRA MENDONÇA',
  'PAULO OLIVEIRA DE MORAIS',
  'EDNILTON LUCENA',
  'SONIA MARIA ALVES DE LIMA',
  'ANGELA LÚCIA OLIVEIRA DA SILVA',
  'JOSE MARIA VIEIRA DA SILVA',
  'JEFERSON GABRIEL SOARES',
  'LAÍS SANTIAGO SOARES',
  'JORGE MEDEIROS',
  'ELILDIERLI SOARES FERREIRA',
  'ALCIONE SOARES FERREIRA',
  'JANE COSTA DA SILVA',
  'YAGO ALMEIDA',
  // Não-associados sem doação
  'LARISSA MOURA',
  'MARIA EDUARDO',
  'THAYZE KEYLLA',
  'VICTOR FERREIRA',
];

async function main() {
  console.log('🧹 SANITIZAÇÃO DA BASE DE DADOS\n');
  console.log('='.repeat(80));
  console.log(`Pessoas a verificar: ${PESSOAS_SEM_DOACAO.length}`);

  let totalTitulosDeletados = 0;

  for (const nome of PESSOAS_SEM_DOACAO) {
    // Encontrar pessoa pelo nome
    const pessoaResult = await db.execute(sql`
      SELECT id, nome FROM pessoa 
      WHERE UPPER(TRIM(nome)) = UPPER(TRIM(${nome}))
        AND deleted_at IS NULL
    `);

    if (pessoaResult.rows.length === 0) {
      console.log(`  ⚪ ${nome} - não encontrada na base`);
      continue;
    }

    const pessoa = pessoaResult.rows[0] as { id: string; nome: string };

    // Contar títulos associados
    const titulosResult = await db.execute(sql`
      SELECT id, descricao, valor_liquido, data_emissao
      FROM titulo 
      WHERE pessoa_id = ${pessoa.id}
        AND deleted_at IS NULL
    `);

    if (titulosResult.rows.length === 0) {
      console.log(`  ✅ ${nome} - OK (sem títulos)`);
      continue;
    }

    const qtdTitulos = titulosResult.rows.length;
    const valorTotal = titulosResult.rows.reduce((sum: number, t: any) => sum + parseFloat(t.valor_liquido || 0), 0);

    console.log(`\n  🔴 ${nome}`);
    console.log(`     - ${qtdTitulos} título(s) encontrado(s) - Total: R$ ${valorTotal.toFixed(2)}`);

    // SOFT DELETE dos títulos (marcar como deletado, não remover fisicamente)
    const deleteResult = await db.execute(sql`
      UPDATE titulo 
      SET deleted_at = NOW()
      WHERE pessoa_id = ${pessoa.id}
        AND deleted_at IS NULL
    `);

    console.log(`     ✅ ${qtdTitulos} título(s) deletado(s) (soft delete)`);
    totalTitulosDeletados += qtdTitulos;
  }

  console.log('\n' + '='.repeat(80));
  console.log(`📊 RESUMO DA SANITIZAÇÃO`);
  console.log(`   Total de títulos deletados: ${totalTitulosDeletados}`);
  console.log('\n✅ Sanitização concluída!');
}

main().catch(console.error);


























