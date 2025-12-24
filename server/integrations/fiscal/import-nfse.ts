/**
 * NFSe Import Service
 * 
 * Imports NFS-e data from API into database for a specific organization.
 * Uses certificate associated with the organization for authentication.
 */

import crypto from 'crypto';
import { eq, and } from 'drizzle-orm';
import { getDb } from '../../db';
import * as schema from '../../../drizzle/schema';
import { listarNfse, consultarNfse, type NfseConsulta } from './nfse';

export interface ImportResult {
  success: boolean;
  imported: number;
  updated: number;
  skipped: number;
  errors: string[];
  lastChaveAcesso?: string;
}

/**
 * Calculate hash of XML for idempotency
 */
function calculateXmlHash(xml: string): string {
  return crypto.createHash('sha256').update(xml).digest('hex');
}

/**
 * Map NfseConsulta to nota_fiscal database record
 */
function mapNfseToRecord(nota: NfseConsulta, organizationId: string) {
  return {
    organization_id: organizationId,
    chave_acesso: nota.chaveAcesso,
    numero: nota.numero,
    serie: nota.serie,
    tipo: 'nfse' as const,
    data_emissao: new Date(nota.dataEmissao),
    competencia: nota.competencia,
    valor_servico: nota.valorServico,
    valor_liquido: nota.valorLiquido,
    valor_iss: nota.valorIss,
    aliquota_iss: null, // Not in API response
    iss_retido: nota.issRetido,
    codigo_servico: nota.codigoServico,
    descricao_servico: nota.descricaoServico,
    prestador_cnpj: nota.prestador.cnpj,
    prestador_razao_social: nota.prestador.razaoSocial,
    tomador_cpf_cnpj: nota.tomador.cpfCnpj,
    tomador_razao_social: nota.tomador.razaoSocial,
    tomador_email: nota.tomador.email || null,
    status: nota.status,
    xml_original: nota.xmlBase64 ? Buffer.from(nota.xmlBase64, 'base64').toString('utf-8') : null,
    xml_hash: nota.xmlBase64 ? calculateXmlHash(Buffer.from(nota.xmlBase64, 'base64').toString('utf-8')) : null,
  };
}

/**
 * Import NFS-e for an organization within a date range
 */
export async function importNfseForOrganization(
  organizationId: string,
  cnpjPrestador: string,
  dataInicio: string,
  dataFim: string,
  userId?: string
): Promise<ImportResult> {
  const db = await getDb();
  const result: ImportResult = {
    success: true,
    imported: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  try {
    let pagina = 1;
    let hasMore = true;

    while (hasMore) {
      console.log(`[ImportNFSe] Fetching page ${pagina} for ${cnpjPrestador}...`);
      
      const listResult = await listarNfse({
        cnpjPrestador,
        dataInicio,
        dataFim,
        pagina,
        tamanhoPagina: 50,
      });

      for (const nota of listResult.notas) {
        try {
          // Check if already exists
          const [existing] = await db
            .select({ id: schema.notaFiscal.id, xml_hash: schema.notaFiscal.xmlHash })
            .from(schema.notaFiscal)
            .where(eq(schema.notaFiscal.chaveAcesso, nota.chaveAcesso))
            .limit(1);

          const record = mapNfseToRecord(nota, organizationId);

          if (existing) {
            // Check if content changed (via hash)
            if (record.xml_hash && existing.xml_hash !== record.xml_hash) {
              await db
                .update(schema.notaFiscal)
                .set({
                  ...record,
                  updatedAt: new Date(),
                })
                .where(eq(schema.notaFiscal.id, existing.id));
              result.updated++;
            } else {
              result.skipped++;
            }
          } else {
            await db.insert(schema.notaFiscal).values({
              ...record,
              importadoEm: new Date(),
              importadoPor: userId || null,
            } as any);
            result.imported++;
          }

          result.lastChaveAcesso = nota.chaveAcesso;
        } catch (error: any) {
          result.errors.push(`Nota ${nota.chaveAcesso}: ${error.message}`);
        }
      }

      hasMore = pagina < listResult.totalPaginas;
      pagina++;
    }

    console.log(`[ImportNFSe] Complete: ${result.imported} imported, ${result.updated} updated, ${result.skipped} skipped`);
    
  } catch (error: any) {
    result.success = false;
    result.errors.push(`Erro geral: ${error.message}`);
    console.error('[ImportNFSe] Error:', error);
  }

  return result;
}

/**
 * Import a single NFS-e by access key
 */
export async function importSingleNfse(
  organizationId: string,
  chaveAcesso: string,
  userId?: string
): Promise<{ success: boolean; action: 'imported' | 'updated' | 'skipped'; error?: string }> {
  const db = await getDb();

  try {
    const nota = await consultarNfse(chaveAcesso);
    if (!nota) {
      return { success: false, action: 'skipped', error: 'NFS-e não encontrada' };
    }

    const record = mapNfseToRecord(nota, organizationId);

    const [existing] = await db
      .select({ id: schema.notaFiscal.id, xml_hash: schema.notaFiscal.xmlHash })
      .from(schema.notaFiscal)
      .where(eq(schema.notaFiscal.chaveAcesso, chaveAcesso))
      .limit(1);

    if (existing) {
      if (record.xml_hash && existing.xml_hash !== record.xml_hash) {
        await db
          .update(schema.notaFiscal)
          .set({
            ...record,
            updatedAt: new Date(),
          })
          .where(eq(schema.notaFiscal.id, existing.id));
        return { success: true, action: 'updated' };
      }
      return { success: true, action: 'skipped' };
    }

    await db.insert(schema.notaFiscal).values({
      ...record,
      importadoEm: new Date(),
      importadoPor: userId || null,
    } as any);
    
    return { success: true, action: 'imported' };
  } catch (error: any) {
    return { success: false, action: 'skipped', error: error.message };
  }
}

/**
 * Get import statistics for an organization
 */
export async function getImportStats(organizationId: string): Promise<{
  total: number;
  byStatus: Record<string, number>;
  byMonth: Record<string, number>;
  lastImport: Date | null;
}> {
  const db = await getDb();

  const [total] = await db
    .select({ count: schema.notaFiscal.id })
    .from(schema.notaFiscal)
    .where(eq(schema.notaFiscal.organizationId, organizationId));

  // TODO: Add aggregations for byStatus and byMonth
  
  return {
    total: typeof total?.count === 'number' ? total.count : 0,
    byStatus: {},
    byMonth: {},
    lastImport: null,
  };
}





