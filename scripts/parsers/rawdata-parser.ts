/**
 * Parser para rawdata CSV mensal (formato janeiro.csv)
 * Colunas: Data, Dcto, CNPJ, Fornecedor/Contribuição, Descrição, CAIXA, B.BRASIL, BB R.Fácil, C.ECONÔMICA
 */

export interface RawdataLinha {
  lineNumber: number;
  data: Date;
  documento: string;
  cnpj: string;
  fornecedor: string;
  descricao: string;
  valorCaixa: number;
  valorBB: number;
  valorBBRF: number;
  valorCEF: number;
  rawLine: string;
}

export type TipoLancamento = 'contribuicao_associado' | 'contribuicao_nao_associado' | 'despesa' | 'transferencia_interna' | 'rendimento' | 'tarifa';

export interface LancamentoClassificado extends RawdataLinha {
  tipo: TipoLancamento;
  natureza: string;
  valorTotal: number;
  contaOrigem: 'caixa' | 'bb' | 'bbrf' | 'cef' | null;
}

function parseValor(v: string): number {
  if (!v || v.trim() === '') return 0;
  // Remove aspas, espaços e trata formato brasileiro
  let clean = v.replace(/"/g, '').replace(/\s/g, '').replace(',', '.');
  // Trata valores com separador de milhar
  if (clean.includes('.') && clean.split('.').length > 2) {
    const parts = clean.split('.');
    const decimal = parts.pop();
    clean = parts.join('') + '.' + decimal;
  }
  return parseFloat(clean) || 0;
}

function parseData(dataStr: string): Date | null {
  if (!dataStr || dataStr.trim() === '') return null;
  
  // Formato M/D/YYYY ou MM/DD/YYYY
  const parts = dataStr.split('/');
  if (parts.length !== 3) return null;
  
  const [month, day, year] = parts.map(p => parseInt(p));
  if (isNaN(month) || isNaN(day) || isNaN(year)) return null;
  
  // Corrige anos com typo (ex: 2015 -> 2025)
  const correctedYear = year < 2020 ? 2025 : year;
  
  return new Date(correctedYear, month - 1, day);
}

export function parseRawdataCSV(content: string): RawdataLinha[] {
  const lines = content.trim().split('\n');
  const lancamentos: RawdataLinha[] = [];
  
  // Skip header lines (linhas 1-5: título, vazio, período, cabeçalho, saldo anterior)
  for (let i = 5; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    
    // Parse CSV considerando aspas
    const cols = parseCSVLine(line);
    const dataStr = cols[0]?.trim();
    
    // Pular linhas sem data ou linhas de totais
    if (!dataStr || dataStr.toLowerCase().includes('saldo')) continue;
    
    const data = parseData(dataStr);
    if (!data) continue;
    
    lancamentos.push({
      lineNumber: i + 1,
      data,
      documento: cols[1]?.trim() || '',
      cnpj: cols[2]?.trim() || '',
      fornecedor: cols[3]?.trim() || '',
      descricao: cols[4]?.trim() || '',
      valorCaixa: parseValor(cols[5]),
      valorBB: parseValor(cols[6]),
      valorBBRF: parseValor(cols[7]),
      valorCEF: parseValor(cols[8]),
      rawLine: line,
    });
  }
  
  return lancamentos;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  
  return result;
}

export function classificarLancamento(l: RawdataLinha): LancamentoClassificado {
  const desc = l.descricao.toLowerCase();
  const fornec = l.fornecedor.toLowerCase();
  
  // Determinar conta origem e valor
  let contaOrigem: LancamentoClassificado['contaOrigem'] = null;
  let valorTotal = 0;
  
  if (l.valorBB !== 0) { contaOrigem = 'bb'; valorTotal = l.valorBB; }
  else if (l.valorCEF !== 0) { contaOrigem = 'cef'; valorTotal = l.valorCEF; }
  else if (l.valorBBRF !== 0) { contaOrigem = 'bbrf'; valorTotal = l.valorBBRF; }
  else if (l.valorCaixa !== 0) { contaOrigem = 'caixa'; valorTotal = l.valorCaixa; }
  
  // Classificar tipo
  let tipo: TipoLancamento = 'despesa';
  let natureza = 'outros';
  
  if (desc.includes('contribuição associado')) {
    tipo = 'contribuicao_associado';
    natureza = 'contribuicao';
  } else if (desc.includes('contribuição não associado')) {
    tipo = 'contribuicao_nao_associado';
    natureza = 'doacao';
  } else if (desc.includes('bb rende fácil') || desc.includes('bb renda')) {
    tipo = 'transferencia_interna';
    natureza = 'transferencia';
  } else if (desc.includes('rendimento')) {
    tipo = 'rendimento';
    natureza = 'receita_financeira';
  } else if (desc.includes('tarifa')) {
    tipo = 'tarifa';
    natureza = 'taxa';
  } else if (desc.includes('imposto de renda')) {
    tipo = 'tarifa';
    natureza = 'imposto';
  } else if (desc.includes('energia')) {
    natureza = 'utilidade';
  } else if (desc.includes('internet')) {
    natureza = 'utilidade';
  } else if (desc.includes('agua') || desc.includes('esgoto')) {
    natureza = 'utilidade';
  } else if (desc.includes('limpeza') || desc.includes('material')) {
    natureza = 'material';
  } else if (desc.includes('serviço')) {
    natureza = 'servico';
  } else if (desc.includes('aquisição') || desc.includes('adiantamento')) {
    natureza = 'material';
  } else if (desc.includes('contribuição mensal')) {
    natureza = 'taxa';
  }
  
  return { ...l, tipo, natureza, valorTotal, contaOrigem };
}

export function parseAndClassify(content: string): LancamentoClassificado[] {
  const linhas = parseRawdataCSV(content);
  return linhas.map(classificarLancamento);
}

