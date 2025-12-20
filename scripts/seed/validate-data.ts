/**
 * Validação: Comparar dados do banco com rawdata
 * Gera relatório de discrepâncias e totais por mês
 * 
 * Executar: npx tsx scripts/seed/validate-data.ts
 */

import { sql as rawSql } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';
import { db, log } from './config';
import { parseRawdataCSV, classificarLancamento } from '../parsers/rawdata-parser';

// ============================================================================
// RAWDATA LOADING
// ============================================================================

interface RawdataSummary {
  month: number;
  year: number;
  file: string;
  totalReceitas: number;
  totalDespesas: number;
  transactions: number;
}

function loadRawdataFiles(): RawdataSummary[] {
  const rawdataDir = path.join(process.cwd(), 'rawdata');
  const summaries: RawdataSummary[] = [];
  
  if (!fs.existsSync(rawdataDir)) {
    log.warn('Diretório rawdata não encontrado');
    return summaries;
  }
  
  const files = fs.readdirSync(rawdataDir).filter(f => f.endsWith('.csv'));
  
  const monthMap: Record<string, number> = {
    'janeiro': 1, 'fevereiro': 2, 'marco': 3, 'abril': 4,
    'maio': 5, 'junho': 6, 'julho': 7, 'agosto': 8,
    'setembro': 9, 'outubro': 10, 'novembro': 11, 'dezembro': 12,
  };
  
  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(rawdataDir, file), 'utf-8');
      const linhas = parseRawdataCSV(content);
      
      let totalReceitas = 0;
      let totalDespesas = 0;
      let month = 0;
      let year = 2025;
      
      for (const linha of linhas) {
        const classificado = classificarLancamento(linha);
        
        // Ignorar transferências internas
        if (classificado.tipo === 'transferencia_interna') continue;
        
        // Determinar mês pela primeira linha
        if (month === 0 && linha.data) {
          month = linha.data.getMonth() + 1;
          year = linha.data.getFullYear();
        }
        
        // Somar receitas e despesas
        if (classificado.valorTotal > 0) {
          totalReceitas += classificado.valorTotal;
        } else if (classificado.valorTotal < 0) {
          totalDespesas += Math.abs(classificado.valorTotal);
        }
      }
      
      // Fallback: deduzir mês do nome do arquivo
      if (month === 0) {
        const baseName = file.replace('.csv', '').replace('rawdata_', '').toLowerCase();
        month = monthMap[baseName] || 0;
      }
      
      if (month > 0) {
        summaries.push({
          month,
          year,
          file,
          totalReceitas,
          totalDespesas,
          transactions: linhas.length,
        });
      }
    } catch (error: any) {
      log.warn(`Erro ao processar ${file}: ${error.message}`);
    }
  }
  
  return summaries.sort((a, b) => a.month - b.month);
}

// ============================================================================
// DATABASE QUERIES
// ============================================================================

interface DbSummary {
  month: number;
  year: number;
  totalReceitas: number;
  totalDespesas: number;
  transactions: number;
}

async function getEntriesSummary(): Promise<DbSummary[]> {
  const result = await db.execute(rawSql`
    SELECT 
      p.month,
      p.year,
      SUM(CASE WHEN e.type = 'credit' THEN e.amount_cents ELSE 0 END) / 100.0 as receitas,
      SUM(CASE WHEN e.type = 'debit' THEN e.amount_cents ELSE 0 END) / 100.0 as despesas,
      COUNT(*) as transactions
    FROM entries e
    JOIN periods p ON p.id = e.period_id
    GROUP BY p.month, p.year
    ORDER BY p.year, p.month
  `);
  
  return result.rows.map((row: any) => ({
    month: row.month,
    year: row.year,
    totalReceitas: parseFloat(row.receitas) || 0,
    totalDespesas: parseFloat(row.despesas) || 0,
    transactions: parseInt(row.transactions) || 0,
  }));
}

async function getTitulosSummary(): Promise<DbSummary[]> {
  const result = await db.execute(rawSql`
    SELECT 
      EXTRACT(MONTH FROM tb.data_pagamento)::int as month,
      EXTRACT(YEAR FROM tb.data_pagamento)::int as year,
      SUM(CASE WHEN t.tipo = 'receber' THEN tb.valor_pago ELSE 0 END) as receitas,
      SUM(CASE WHEN t.tipo = 'pagar' THEN tb.valor_pago ELSE 0 END) as despesas,
      COUNT(*) as transactions
    FROM titulo_baixa tb
    JOIN titulo t ON t.id = tb.titulo_id
    WHERE t.deleted_at IS NULL
    GROUP BY EXTRACT(MONTH FROM tb.data_pagamento), EXTRACT(YEAR FROM tb.data_pagamento)
    ORDER BY year, month
  `);
  
  return result.rows.map((row: any) => ({
    month: row.month,
    year: row.year,
    totalReceitas: parseFloat(row.receitas) || 0,
    totalDespesas: parseFloat(row.despesas) || 0,
    transactions: parseInt(row.transactions) || 0,
  }));
}

// ============================================================================
// VALIDATION
// ============================================================================

interface ValidationResult {
  month: number;
  year: number;
  rawdata: { receitas: number; despesas: number; count: number } | null;
  entries: { receitas: number; despesas: number; count: number } | null;
  titulos: { receitas: number; despesas: number; count: number } | null;
  discrepancies: string[];
}

function compareValues(a: number, b: number, tolerance: number = 0.01): boolean {
  return Math.abs(a - b) <= tolerance;
}

export async function validateData(): Promise<ValidationResult[]> {
  log.header('VALIDAÇÃO: COMPARAÇÃO COM RAWDATA');
  
  const rawdataSummaries = loadRawdataFiles();
  const entriesSummaries = await getEntriesSummary();
  const titulosSummaries = await getTitulosSummary();
  
  log.info(`Arquivos rawdata: ${rawdataSummaries.length}`);
  log.info(`Meses com entries: ${entriesSummaries.length}`);
  log.info(`Meses com titulos: ${titulosSummaries.length}`);
  
  const results: ValidationResult[] = [];
  const allMonths = new Set<string>();
  
  rawdataSummaries.forEach(s => allMonths.add(`${s.year}-${s.month}`));
  entriesSummaries.forEach(s => allMonths.add(`${s.year}-${s.month}`));
  titulosSummaries.forEach(s => allMonths.add(`${s.year}-${s.month}`));
  
  for (const key of Array.from(allMonths).sort()) {
    const [year, month] = key.split('-').map(Number);
    
    const rawdata = rawdataSummaries.find(s => s.month === month && s.year === year);
    const entries = entriesSummaries.find(s => s.month === month && s.year === year);
    const titulos = titulosSummaries.find(s => s.month === month && s.year === year);
    
    const discrepancies: string[] = [];
    
    // Compare rawdata vs titulos
    if (rawdata && titulos) {
      if (!compareValues(rawdata.totalReceitas, titulos.totalReceitas, 1)) {
        discrepancies.push(`Receitas: rawdata=${rawdata.totalReceitas.toFixed(2)} vs titulos=${titulos.totalReceitas.toFixed(2)} (diff=${(rawdata.totalReceitas - titulos.totalReceitas).toFixed(2)})`);
      }
      if (!compareValues(rawdata.totalDespesas, titulos.totalDespesas, 1)) {
        discrepancies.push(`Despesas: rawdata=${rawdata.totalDespesas.toFixed(2)} vs titulos=${titulos.totalDespesas.toFixed(2)} (diff=${(rawdata.totalDespesas - titulos.totalDespesas).toFixed(2)})`);
      }
    }
    
    // Compare entries vs titulos
    if (entries && titulos) {
      if (!compareValues(entries.totalReceitas, titulos.totalReceitas, 1)) {
        discrepancies.push(`Receitas entries=${entries.totalReceitas.toFixed(2)} vs titulos=${titulos.totalReceitas.toFixed(2)}`);
      }
      if (!compareValues(entries.totalDespesas, titulos.totalDespesas, 1)) {
        discrepancies.push(`Despesas entries=${entries.totalDespesas.toFixed(2)} vs titulos=${titulos.totalDespesas.toFixed(2)}`);
      }
    }
    
    results.push({
      month,
      year,
      rawdata: rawdata ? { receitas: rawdata.totalReceitas, despesas: rawdata.totalDespesas, count: rawdata.transactions } : null,
      entries: entries ? { receitas: entries.totalReceitas, despesas: entries.totalDespesas, count: entries.transactions } : null,
      titulos: titulos ? { receitas: titulos.totalReceitas, despesas: titulos.totalDespesas, count: titulos.transactions } : null,
      discrepancies,
    });
  }
  
  // Print summary table
  console.log('\n┌─────────────────────────────────────────────────────────────────────┐');
  console.log('│                    RESUMO DE VALIDAÇÃO POR MÊS                      │');
  console.log('├──────┬──────────────────┬──────────────────┬──────────────────┬─────┤');
  console.log('│ Mês  │     Rawdata      │     Entries      │     Titulos      │ OK  │');
  console.log('├──────┼──────────────────┼──────────────────┼──────────────────┼─────┤');
  
  for (const r of results) {
    const monthStr = `${r.month}/${r.year}`.padStart(5);
    const rawStr = r.rawdata ? `R$${r.rawdata.receitas.toFixed(0)}/-${r.rawdata.despesas.toFixed(0)}`.padStart(16) : '-'.padStart(16);
    const entStr = r.entries ? `R$${r.entries.receitas.toFixed(0)}/-${r.entries.despesas.toFixed(0)}`.padStart(16) : '-'.padStart(16);
    const titStr = r.titulos ? `R$${r.titulos.receitas.toFixed(0)}/-${r.titulos.despesas.toFixed(0)}`.padStart(16) : '-'.padStart(16);
    const ok = r.discrepancies.length === 0 ? ' ✓ ' : ' ✗ ';
    
    console.log(`│${monthStr} │${rawStr} │${entStr} │${titStr} │${ok}│`);
  }
  
  console.log('└──────┴──────────────────┴──────────────────┴──────────────────┴─────┘');
  
  // Print discrepancies
  const withDiscrepancies = results.filter(r => r.discrepancies.length > 0);
  if (withDiscrepancies.length > 0) {
    log.header('DISCREPÂNCIAS ENCONTRADAS');
    for (const r of withDiscrepancies) {
      log.warn(`${r.month}/${r.year}:`);
      for (const d of r.discrepancies) {
        log.dim(`  - ${d}`);
      }
    }
  } else {
    log.success('Nenhuma discrepância encontrada!');
  }
  
  return results;
}

// Run if called directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  validateData().catch(console.error);
}

