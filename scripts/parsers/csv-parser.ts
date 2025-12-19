/**
 * Parser para CSV do extrato da Caixa Econômica Federal
 */

export interface CaixaTransaction {
  dataHora: Date;
  nrDoc: string;
  historico: string;
  favorecido: string;
  cpfCnpj: string;
  valor: number;
  tipo: 'credito' | 'debito';
  saldo: number;
}

export function parseCSVCaixa(content: string): CaixaTransaction[] {
  const lines = content.trim().split('\n');
  const transactions: CaixaTransaction[] = [];
  
  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const parts = line.split(',');
    if (parts.length < 9) continue;
    
    const dataHora = parts[0];
    const nrDoc = parts[1];
    const historico = parts[2];
    const favorecido = parts[3];
    const cpfCnpj = parts[4];
    const valorStr = parts[5].replace(/"/g, '').replace('.', '').replace(',', '.');
    const debCred = parts[6];
    const saldoStr = parts[7].replace(/"/g, '').replace('.', '').replace(',', '.');
    
    // Skip SALDO DIA entries
    if (historico === 'SALDO DIA') continue;
    
    const [datePart, timePart] = dataHora.split(' ');
    const [day, month, year] = datePart.split('/');
    const date = new Date(`${year}-${month}-${day}T${timePart || '00:00:00'}`);
    
    transactions.push({
      dataHora: date,
      nrDoc,
      historico,
      favorecido,
      cpfCnpj,
      valor: Math.abs(parseFloat(valorStr) || 0),
      tipo: debCred === 'D' ? 'debito' : 'credito',
      saldo: parseFloat(saldoStr) || 0,
    });
  }
  
  return transactions;
}











