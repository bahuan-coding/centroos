/**
 * Parser para TSV de contribuições e transações mensais
 */

export interface Contribuicao {
  nome: string;
  matricula: string;
  mes: number;
  ano: number;
  data: Date;
  valor: number;
}

export interface TransacaoMensal {
  data: Date;
  documento: string;
  cnpj: string;
  fornecedor: string;
  descricao: string;
  valorCaixa: number;
  valorBB: number;
  valorBBRendaFacil: number;
  valorCEF: number;
}

const MESES_MAP: Record<string, number> = {
  'janeiro': 1, 'fevereiro': 2, 'março': 3, 'abril': 4,
  'maio': 5, 'junho': 6, 'julho': 7, 'agosto': 8,
  'setembro': 9, 'outubro': 10, 'novembro': 11, 'dezembro': 12,
  'jan': 1, 'fev': 2, 'mar': 3, 'abr': 4,
  'mai': 5, 'jun': 6, 'jul': 7, 'ago': 8,
  'set': 9, 'out': 10, 'nov': 11, 'dez': 12,
};

export function parseTSVContribuicoes(content: string, tipo: 'associado' | 'nao_associado'): Contribuicao[] {
  const lines = content.trim().split('\n');
  const contribuicoes: Contribuicao[] = [];
  
  // Skip header lines (first 4 lines)
  for (let i = 4; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim() || line.startsWith('Totais')) continue;
    
    const cols = line.split('\t');
    const nome = cols[0]?.trim();
    const matricula = cols[1]?.trim() || '';
    
    if (!nome) continue;
    
    // Process each month pair (date, value) starting from column 3
    // Columns: Nome, Matricula, AnoAnteriorData, AnoAnteriorValor, JanData, JanValor, ...
    for (let m = 0; m < 13; m++) {
      const dataIdx = 2 + (m * 2);
      const valorIdx = 3 + (m * 2);
      
      const dataStr = cols[dataIdx]?.trim();
      const valorStr = cols[valorIdx]?.trim();
      
      if (!dataStr || !valorStr || valorStr === '0') continue;
      
      // Parse date like "2025-01-02 00:00:00"
      const dateParts = dataStr.match(/(\d{4})-(\d{2})-(\d{2})/);
      if (!dateParts) continue;
      
      const date = new Date(`${dateParts[1]}-${dateParts[2]}-${dateParts[3]}`);
      const valor = parseFloat(valorStr) || 0;
      
      if (valor > 0) {
        contribuicoes.push({
          nome,
          matricula,
          mes: parseInt(dateParts[2]),
          ano: parseInt(dateParts[1]),
          data: date,
          valor,
        });
      }
    }
  }
  
  return contribuicoes;
}

export function parseTSVMensal(content: string, mesNome: string): TransacaoMensal[] {
  const lines = content.trim().split('\n');
  const transacoes: TransacaoMensal[] = [];
  
  // Skip header lines
  for (let i = 4; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    
    const cols = line.split('\t');
    const dataStr = cols[0]?.trim();
    
    if (!dataStr || !dataStr.match(/\d{4}-\d{2}-\d{2}/)) continue;
    
    const dateParts = dataStr.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (!dateParts) continue;
    
    const parseValor = (v: string): number => {
      if (!v) return 0;
      const clean = v.replace(/[^\d.,-]/g, '').replace(',', '.');
      return parseFloat(clean) || 0;
    };
    
    transacoes.push({
      data: new Date(`${dateParts[1]}-${dateParts[2]}-${dateParts[3]}`),
      documento: cols[1]?.trim() || '',
      cnpj: cols[2]?.trim() || '',
      fornecedor: cols[3]?.trim() || '',
      descricao: cols[4]?.trim() || '',
      valorCaixa: parseValor(cols[5]),
      valorBB: parseValor(cols[6]),
      valorBBRendaFacil: parseValor(cols[7]),
      valorCEF: parseValor(cols[8]),
    });
  }
  
  return transacoes;
}












