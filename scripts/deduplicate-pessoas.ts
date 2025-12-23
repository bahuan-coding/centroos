/**
 * Script de Deduplicação de Pessoas
 * 
 * Identifica duplicatas por nome normalizado, escolhe o registro mestre,
 * migra títulos e marca duplicatas como deleted.
 */

import { neon } from '@netlify/neon';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL required');

const sql = neon(DATABASE_URL);

interface DuplicateGroup {
  nome_normalizado: string;
  count: number;
  ids: string[];
}

interface PessoaRecord {
  id: string;
  nome: string;
  has_associado: boolean;
  has_cpf: boolean;
  titulo_count: number;
  created_at: string;
}

async function findDuplicates(): Promise<DuplicateGroup[]> {
  const result = await sql`
    SELECT 
      UPPER(TRIM(nome)) as nome_normalizado,
      COUNT(*)::int as count,
      ARRAY_AGG(id) as ids
    FROM pessoa 
    WHERE deleted_at IS NULL
    GROUP BY UPPER(TRIM(nome))
    HAVING COUNT(*) > 1
    ORDER BY COUNT(*) DESC
  `;
  return result as DuplicateGroup[];
}

async function getPessoaDetails(ids: string[]): Promise<PessoaRecord[]> {
  const result = await sql`
    SELECT 
      p.id,
      p.nome,
      p.created_at::text,
      (a.id IS NOT NULL) as has_associado,
      (SELECT COUNT(*) > 0 FROM pessoa_documento pd WHERE pd.pessoa_id = p.id AND pd.tipo = 'cpf') as has_cpf,
      (SELECT COUNT(*)::int FROM titulo t WHERE t.pessoa_id = p.id AND t.deleted_at IS NULL) as titulo_count
    FROM pessoa p
    LEFT JOIN associado a ON a.pessoa_id = p.id
    WHERE p.id = ANY(${ids}::uuid[])
    ORDER BY p.created_at ASC
  `;
  return result as PessoaRecord[];
}

function chooseMaster(records: PessoaRecord[]): { master: PessoaRecord; duplicates: PessoaRecord[] } {
  // Priority: 1) Has CPF, 2) Has associado, 3) Most titulos, 4) Oldest
  const sorted = [...records].sort((a, b) => {
    if (a.has_cpf !== b.has_cpf) return a.has_cpf ? -1 : 1;
    if (a.has_associado !== b.has_associado) return a.has_associado ? -1 : 1;
    if (a.titulo_count !== b.titulo_count) return b.titulo_count - a.titulo_count;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
  
  return { master: sorted[0], duplicates: sorted.slice(1) };
}

async function mergeDuplicates(master: PessoaRecord, duplicates: PessoaRecord[]): Promise<number> {
  let migratedTitulos = 0;
  
  for (const dup of duplicates) {
    // Migrate titulos to master
    const updated = await sql`
      UPDATE titulo 
      SET pessoa_id = ${master.id}, updated_at = NOW()
      WHERE pessoa_id = ${dup.id} AND deleted_at IS NULL
      RETURNING id
    `;
    migratedTitulos += updated.length;
    
    // If duplicate has associado but master doesn't, migrate it
    if (dup.has_associado && !master.has_associado) {
      await sql`UPDATE associado SET pessoa_id = ${master.id} WHERE pessoa_id = ${dup.id}`;
    } else if (dup.has_associado) {
      // Both have associado - soft delete the duplicate's
      await sql`DELETE FROM associado WHERE pessoa_id = ${dup.id}`;
    }
    
    // Migrate documentos (if master doesn't have them)
    await sql`
      INSERT INTO pessoa_documento (id, pessoa_id, tipo, numero, created_at, updated_at)
      SELECT gen_random_uuid(), ${master.id}, tipo, numero, NOW(), NOW()
      FROM pessoa_documento
      WHERE pessoa_id = ${dup.id}
        AND NOT EXISTS (
          SELECT 1 FROM pessoa_documento pd2 
          WHERE pd2.pessoa_id = ${master.id} AND pd2.tipo = pessoa_documento.tipo
        )
      ON CONFLICT DO NOTHING
    `;
    
    // Migrate contatos
    await sql`
      INSERT INTO pessoa_contato (id, pessoa_id, tipo, valor, principal, verificado, created_at, updated_at)
      SELECT gen_random_uuid(), ${master.id}, tipo, valor, false, false, NOW(), NOW()
      FROM pessoa_contato
      WHERE pessoa_id = ${dup.id}
        AND NOT EXISTS (
          SELECT 1 FROM pessoa_contato pc2 
          WHERE pc2.pessoa_id = ${master.id} AND pc2.valor = pessoa_contato.valor
        )
    `;
    
    // Soft delete the duplicate
    await sql`UPDATE pessoa SET deleted_at = NOW() WHERE id = ${dup.id}`;
  }
  
  return migratedTitulos;
}

async function main() {
  console.log('🔍 Buscando duplicatas...\n');
  
  const duplicates = await findDuplicates();
  console.log(`Encontradas ${duplicates.length} grupos de duplicatas\n`);
  
  if (duplicates.length === 0) {
    console.log('✅ Nenhuma duplicata encontrada!');
    return;
  }
  
  let totalMerged = 0;
  let totalTitulosMigrated = 0;
  
  for (const group of duplicates) {
    console.log(`\n📋 Processando: "${group.nome_normalizado}" (${group.count} registros)`);
    
    const records = await getPessoaDetails(group.ids);
    const { master, duplicates: dups } = chooseMaster(records);
    
    console.log(`   Master: ${master.nome} (${master.id.slice(0, 8)}...)`);
    console.log(`   - CPF: ${master.has_cpf ? 'Sim' : 'Não'}`);
    console.log(`   - Associado: ${master.has_associado ? 'Sim' : 'Não'}`);
    console.log(`   - Títulos: ${master.titulo_count}`);
    
    for (const dup of dups) {
      console.log(`   Duplicata: ${dup.nome} - ${dup.titulo_count} títulos`);
    }
    
    const migrated = await mergeDuplicates(master, dups);
    totalMerged += dups.length;
    totalTitulosMigrated += migrated;
    
    console.log(`   ✅ Merge concluído. ${migrated} títulos migrados.`);
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`🎉 Deduplicação concluída!`);
  console.log(`   - ${totalMerged} registros duplicados removidos`);
  console.log(`   - ${totalTitulosMigrated} títulos migrados`);
  
  // Verify final count
  const [count] = await sql`SELECT COUNT(*)::int as count FROM pessoa WHERE deleted_at IS NULL`;
  console.log(`   - ${count.count} pessoas ativas restantes`);
}

main().catch(console.error);



















