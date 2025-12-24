/**
 * Parser para TXT do extrato do Banco do Brasil
 */

export interface BBTransaction {
  dataBalancete: Date;
  dataMovimento: Date;
  agOrigem: string;
  lote: string;
  historico: string;
  documento: string;
  valor: number;
  tipo: 'credito' | 'debito';
  descricaoExtra: string;
}

export function parseTXTBancoBrasil(content: string): BBTransaction[] {
  const transactions: BBTransaction[] = [];
  const lines = content.split('\n');
  
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    
    // Look for date pattern at start of line (dd/mm/yyyy)
    const dateMatch = line.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (dateMatch) {
      const dataBalancete = new Date(`${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`);
      
      // Read next lines to build transaction
      let agOrigem = '';
      let lote = '';
      let historico = '';
      let documento = '';
      let valorStr = '';
      let descricaoExtra = '';
      
      // Line after date should be agOrigem
      i++;
      if (i < lines.length) agOrigem = lines[i].trim();
      
      // Next line is lote
      i++;
      if (i < lines.length) lote = lines[i].trim();
      
      // Next line is historico (e.g., "821 Pix - Recebido")
      i++;
      if (i < lines.length) historico = lines[i].trim();
      
      // Next line is documento
      i++;
      if (i < lines.length) documento = lines[i].trim();
      
      // Next line is valor
      i++;
      if (i < lines.length) valorStr = lines[i].trim();
      
      // Check for description line (starts with date pattern like "01/11 14:16")
      i++;
      if (i < lines.length && lines[i].match(/^\d{2}\/\d{2}\s+\d{2}:\d{2}/)) {
        descricaoExtra = lines[i].trim();
        i++;
      }
      
      // Skip "Saldo Anterior", "S A L D O", "Rende Facil" lines
      if (historico.includes('Saldo Anterior') || 
          historico.includes('S A L D O') ||
          historico === 'Rende Facil' ||
          historico.startsWith('000 Saldo') ||
          historico.startsWith('999 S A L D O')) {
        continue;
      }
      
      // Parse valor
      let valor = 0;
      let tipo: 'credito' | 'debito' = 'credito';
      
      const valorMatch = valorStr.match(/([\d.,]+)\s*([CD])?/);
      if (valorMatch) {
        valor = parseFloat(valorMatch[1].replace('.', '').replace(',', '.')) || 0;
        tipo = valorMatch[2] === 'D' ? 'debito' : 'credito';
      }
      
      // Extract movement date from descricaoExtra if available
      let dataMovimento = dataBalancete;
      const movDateMatch = descricaoExtra.match(/^(\d{2})\/(\d{2})/);
      if (movDateMatch) {
        const year = dataBalancete.getFullYear();
        dataMovimento = new Date(`${year}-${movDateMatch[2]}-${movDateMatch[1]}`);
      }
      
      if (valor > 0 && historico) {
        transactions.push({
          dataBalancete,
          dataMovimento,
          agOrigem,
          lote,
          historico,
          documento,
          valor,
          tipo,
          descricaoExtra,
        });
      }
    } else {
      i++;
    }
  }
  
  return transactions;
}

// Simplified parser for structured BB extract
export function parseBBSimple(content: string): BBTransaction[] {
  const transactions: BBTransaction[] = [];
  const lines = content.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Match patterns like "821 Pix - Recebido" or "144 Pix - Enviado"
    const transMatch = line.match(/^(\d{3})\s+(.+)$/);
    if (!transMatch) continue;
    
    const [_, codigo, historico] = transMatch;
    
    // Skip non-transaction lines
    if (historico.includes('Saldo') || historico.includes('Rende Facil')) continue;
    
    // Look back for date
    let dateStr = '';
    for (let j = i - 1; j >= Math.max(0, i - 5); j--) {
      const prevLine = lines[j].trim();
      const dateMatch = prevLine.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (dateMatch) {
        dateStr = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
        break;
      }
    }
    
    if (!dateStr) continue;
    
    // Look forward for documento and valor
    let documento = '';
    let valorStr = '';
    let descricaoExtra = '';
    
    if (i + 1 < lines.length) {
      documento = lines[i + 1].trim();
    }
    if (i + 2 < lines.length) {
      valorStr = lines[i + 2].trim();
    }
    if (i + 3 < lines.length && lines[i + 3].match(/^\d{2}\/\d{2}\s+\d{2}:\d{2}/)) {
      descricaoExtra = lines[i + 3].trim();
    }
    
    // Parse valor
    const valorMatch = valorStr.match(/([\d.,]+)\s*([CD])?/);
    if (!valorMatch) continue;
    
    const valor = parseFloat(valorMatch[1].replace('.', '').replace(',', '.')) || 0;
    const tipo: 'credito' | 'debito' = valorMatch[2] === 'D' ? 'debito' : 'credito';
    
    if (valor > 0) {
      transactions.push({
        dataBalancete: new Date(dateStr),
        dataMovimento: new Date(dateStr),
        agOrigem: '',
        lote: '',
        historico: `${codigo} ${historico}`,
        documento,
        valor,
        tipo,
        descricaoExtra,
      });
    }
  }
  
  return transactions;
}
























