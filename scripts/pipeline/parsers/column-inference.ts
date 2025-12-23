/**
 * Column Inference Engine - Deteccao Semantica de Campos
 * 
 * Motor inteligente que analisa cada campo de uma linha CSV e infere
 * sua funcao semantica, permitindo auto-correcao de colunas deslocadas.
 * 
 * @module pipeline/parsers/column-inference
 */

// =============================================================================
// TYPES
// =============================================================================

export type FieldType = 
  | 'date' 
  | 'documento' 
  | 'cnpj' 
  | 'cpf' 
  | 'nome' 
  | 'descricao'
  | 'money' 
  | 'empty' 
  | 'unknown';

export interface FieldInference {
  value: string;
  type: FieldType;
  confidence: number;  // 0-100
  originalIndex: number;
}

export interface InferredRow {
  data: FieldInference | null;
  documento: FieldInference | null;
  cnpjCpf: FieldInference | null;
  fornecedor: FieldInference | null;
  descricao: FieldInference | null;
  valorCaixa: FieldInference | null;
  valorBB: FieldInference | null;
  valorBBRF: FieldInference | null;
  valorCEF: FieldInference | null;
  warnings: string[];
  wasRealigned: boolean;
}

// =============================================================================
// PATTERN DETECTION
// =============================================================================

/** Detecta se o valor é uma data (vários formatos) */
function isDatePattern(value: string): number {
  const v = value.trim();
  if (!v) return 0;
  
  // MM/DD/YYYY ou DD/MM/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(v)) return 95;
  
  // D-Mon format: "4-Aug", "15-Sep"
  if (/^\d{1,2}-[A-Za-z]{3}$/.test(v)) return 90;
  
  // DD-Mon-YYYY: "15-Jan-2025"
  if (/^\d{1,2}-[A-Za-z]{3}-\d{2,4}$/.test(v)) return 90;
  
  return 0;
}

/** Detecta se o valor é um CNPJ (14 dígitos) */
function isCNPJPattern(value: string): number {
  const v = value.trim();
  if (!v) return 0;
  
  // Remove formatação
  const digits = v.replace(/\D/g, '');
  
  // CNPJ tem exatamente 14 dígitos
  if (digits.length === 14) return 95;
  
  // CNPJ parcial (8+ dígitos com / ou -)
  if (digits.length >= 8 && (v.includes('/') || v.includes('-'))) {
    if (/\d{2,}[\.\s]?\d{3}[\.\s]?\d{3}[\/]/.test(v)) return 85;
  }
  
  return 0;
}

/** Detecta se o valor é um CPF (11 dígitos) */
function isCPFPattern(value: string): number {
  const v = value.trim();
  if (!v) return 0;
  
  const digits = v.replace(/\D/g, '');
  
  // CPF tem exatamente 11 dígitos
  if (digits.length === 11) return 95;
  
  // CPF formatado parcial
  if (/^\d{3}[\.\s]?\d{3}[\.\s]?\d{3}[-]?\d{2}$/.test(v)) return 90;
  
  // CPF com traço no meio (formato alternativo): 059923754-65
  if (/^\d{9}-\d{2}$/.test(v)) return 90;
  
  return 0;
}

/** Detecta se o valor é um documento (Nota Fiscal, Pix, etc.) */
function isDocumentoPattern(value: string): number {
  const v = value.trim().toLowerCase();
  if (!v) return 0;
  
  // Tipos de documento conhecidos
  const patterns = [
    /^nota\s*fiscal/i,
    /^pix$/i,
    /^d[eé]bito$/i,
    /^cr[eé]dito$/i,
    /^transfer[eê]ncia$/i,
    /^recibo$/i,
    /^boleto$/i,
    /^ted$/i,
    /^doc$/i,
  ];
  
  for (const p of patterns) {
    if (p.test(value)) return 85;
  }
  
  // Nota Fiscal com número
  if (/nota\s*fiscal\s*\d*/i.test(value)) return 90;
  
  return 0;
}

/** Detecta se o valor é um valor monetário */
function isMoneyPattern(value: string): number {
  const v = value.trim();
  if (!v) return 0;
  
  // Remove aspas
  const cleaned = v.replace(/^["'\s]+|["'\s]+$/g, '').trim();
  if (!cleaned) return 0;
  
  // Deve conter pelo menos um dígito
  if (!/\d/.test(cleaned)) return 0;
  
  // Padrões monetários brasileiros
  // "100.00", "-100.00", "1,234.56", "1.234,56", "(100.00)"
  // Com R$: "R$ 100,00"
  
  // Valor com R$
  if (/^R\$?\s*[\d.,\-\(\)]+$/i.test(cleaned)) return 95;
  
  // Valor negativo com parênteses
  if (/^\([\d.,]+\)$/.test(cleaned)) return 90;
  
  // Valor com vírgula como decimal (brasileiro)
  if (/^-?[\d.]+,\d{1,2}$/.test(cleaned)) return 85;
  
  // Valor com ponto como decimal
  if (/^-?[\d,]+\.\d{1,2}$/.test(cleaned)) return 85;
  
  // Valor simples
  if (/^-?\d+([.,]\d{1,2})?$/.test(cleaned)) return 75;
  
  // Número grande com separadores
  if (/^-?[\d.,]+$/.test(cleaned) && cleaned.length >= 3) return 60;
  
  return 0;
}

/** Detecta se o valor parece um nome de pessoa/empresa */
function isNomePattern(value: string): number {
  const v = value.trim();
  if (!v) return 0;
  
  // Nome não começa com número (exceto se for CPF/CNPJ)
  if (/^\d/.test(v) && isCPFPattern(v) === 0 && isCNPJPattern(v) === 0) return 0;
  
  // Nomes conhecidos de bancos/instituições (são fornecedores)
  const instituicoes = [
    /banco\s*(do\s*)?brasil/i,
    /caixa\s*econ/i,
    /equatorial/i,
    /claro/i,
    /brk/i,
    /prefeitura/i,
    /federa[çc][ãa]o/i,
    /conselho/i,
  ];
  
  for (const p of instituicoes) {
    if (p.test(v)) return 80;
  }
  
  // Nome de pessoa (2+ palavras, maiúsculas)
  const words = v.split(/\s+/).filter(w => w.length > 0);
  if (words.length >= 2) {
    // Verifica se parece nome próprio
    const hasUpperWords = words.some(w => /^[A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇ]/.test(w));
    if (hasUpperWords) return 70;
  }
  
  // Palavra única que parece nome
  if (words.length === 1 && /^[A-Za-zÁÉÍÓÚÂÊÎÔÛÃÕÇáéíóúâêîôûãõç]+$/.test(v)) {
    return 50;
  }
  
  return 30; // Pode ser nome, baixa confiança
}

/** Detecta se o valor parece uma descrição de transação */
function isDescricaoPattern(value: string): number {
  const v = value.trim().toLowerCase();
  if (!v) return 0;
  
  // Descrições conhecidas
  const patterns = [
    /contribui[çc][ãa]o/i,
    /pagamento/i,
    /aquisi[çc][ãa]o/i,
    /servi[çc]o/i,
    /tarifa/i,
    /renda?\s*f[áa]cil/i,
    /rend[ei]mento/i,
    /energia/i,
    /internet/i,
    /[áa]gua/i,
    /limpeza/i,
    /material/i,
    /premia[çc][ãa]o/i,
    /mensalidade/i,
    /iss\s/i,
    /imposto/i,
  ];
  
  for (const p of patterns) {
    if (p.test(value)) return 85;
  }
  
  // Descrição genérica (texto longo sem números no início)
  if (v.length > 10 && !/^\d/.test(v)) return 50;
  
  return 0;
}

// =============================================================================
// FIELD INFERENCE
// =============================================================================

/** Infere o tipo de um campo com base em padrões */
export function inferFieldType(value: string): { type: FieldType; confidence: number } {
  const v = value.trim();
  
  if (!v) {
    return { type: 'empty', confidence: 100 };
  }
  
  // Testa cada padrão e retorna o de maior confiança
  const scores: Array<{ type: FieldType; score: number }> = [
    { type: 'date', score: isDatePattern(v) },
    { type: 'cnpj', score: isCNPJPattern(v) },
    { type: 'cpf', score: isCPFPattern(v) },
    { type: 'documento', score: isDocumentoPattern(v) },
    { type: 'money', score: isMoneyPattern(v) },
    { type: 'descricao', score: isDescricaoPattern(v) },
    { type: 'nome', score: isNomePattern(v) },
  ];
  
  // Ordena por score decrescente
  scores.sort((a, b) => b.score - a.score);
  
  const best = scores[0];
  if (best.score > 0) {
    return { type: best.type, confidence: best.score };
  }
  
  return { type: 'unknown', confidence: 0 };
}

/** Infere todos os campos de uma linha */
export function inferAllFields(cols: string[]): FieldInference[] {
  return cols.map((value, index) => {
    const { type, confidence } = inferFieldType(value);
    return {
      value: value.trim(),
      type,
      confidence,
      originalIndex: index,
    };
  });
}

// =============================================================================
// COLUMN REALIGNMENT
// =============================================================================

/**
 * Estrutura esperada do rawdata:
 * [0] Data
 * [1] Documento
 * [2] CNPJ
 * [3] Fornecedor/Nome
 * [4] Descrição
 * [5] Valor CAIXA
 * [6] Valor BB
 * [7] Valor BBRF
 * [8] Valor CEF
 */

interface RealignmentResult {
  cols: string[];
  wasRealigned: boolean;
  warnings: string[];
}

/**
 * Detecta e corrige desalinhamento de colunas.
 * 
 * Problema comum: CNPJ/CPF aparece na coluna 2 mas deveria estar na 3,
 * ou o contrário, causando shift em todas as colunas subsequentes.
 */
export function realignColumns(cols: string[]): RealignmentResult {
  const warnings: string[] = [];
  const inferred = inferAllFields(cols);
  
  // Se não temos pelo menos 5 colunas, não há o que realinhar
  if (cols.length < 5) {
    return { cols, wasRealigned: false, warnings };
  }
  
  // Verifica se a coluna 0 é data (deve ser)
  if (inferred[0]?.type !== 'date' && inferred[0]?.type !== 'empty') {
    // Primeira coluna não é data - problema sério
    warnings.push('Primeira coluna não é data');
    return { cols, wasRealigned: false, warnings };
  }
  
  // Detecta padrões de desalinhamento
  const result = [...cols];
  let wasRealigned = false;
  
  // CASO 1: CPF/CNPJ na coluna 2 e coluna 3 está vazia
  // Esperado: [0]=Data, [1]=Doc, [2]=CNPJ, [3]=Nome, [4]=Desc
  // Problema: [0]=Data, [1]=Doc, [2]=CPF, [3]="", [4]=Nome, [5]=Desc
  if (inferred[2] && (inferred[2].type === 'cpf' || inferred[2].type === 'cnpj')) {
    if (inferred[3]?.type === 'empty' && inferred[4]?.type === 'nome') {
      // Shift detectado: coluna 3 vazia, nome na 4
      // Mantém como está - CPF/CNPJ na col 2 está correto, nome na col 4 precisa mover para 3
      result[3] = cols[4];  // Move nome para col 3 (fornecedor)
      result[4] = cols[5] || '';  // Move descrição
      
      // Ajusta valores monetários
      for (let i = 5; i < 9; i++) {
        result[i] = cols[i + 1] || '';
      }
      
      wasRealigned = true;
      warnings.push('Auto-corrigido: coluna vazia removida após CNPJ/CPF');
    }
  }
  
  // CASO 2: CPF/CNPJ na coluna 1 (deveria ser documento)
  // Problema: [0]=Data, [1]=CPF, [2]="", [3]=Nome...
  if (inferred[1] && (inferred[1].type === 'cpf' || inferred[1].type === 'cnpj')) {
    if (inferred[0]?.type === 'date') {
      // CPF/CNPJ está na coluna de documento - inserir coluna vazia
      result[1] = '';  // Documento vazio
      result[2] = cols[1];  // CPF/CNPJ move para col 2
      
      // Shift do resto
      for (let i = 3; i < Math.min(cols.length + 1, 9); i++) {
        result[i] = cols[i - 1] || '';
      }
      
      wasRealigned = true;
      warnings.push('Auto-corrigido: CNPJ/CPF movido da coluna documento para coluna correta');
    }
  }
  
  // CASO 3: Nome na coluna 2 (onde deveria ser CNPJ)
  // Se col[2] parece nome e col[3] parece descrição
  if (inferred[2]?.type === 'nome' && inferred[3]?.type === 'descricao') {
    // CNPJ ausente, nome e descrição estão uma coluna antes
    // Inserir coluna vazia para CNPJ
    const newCols = [...cols.slice(0, 2), '', ...cols.slice(2)];
    for (let i = 0; i < Math.min(newCols.length, 9); i++) {
      result[i] = newCols[i] || '';
    }
    wasRealigned = true;
    warnings.push('Auto-corrigido: inserida coluna CNPJ vazia');
  }
  
  // CASO 4: Descrição na coluna 3 (onde deveria ser nome)
  // Se col[3] parece descrição e não nome
  if (!wasRealigned && inferred[3]?.type === 'descricao' && inferred[2]?.type !== 'nome') {
    // Fornecedor ausente
    if (inferred[2]?.type === 'empty' || inferred[2]?.type === 'cnpj' || inferred[2]?.type === 'cpf') {
      // OK, fornecedor pode estar vazio ou já ter CNPJ
    }
  }
  
  return { cols: result.slice(0, 9), wasRealigned, warnings };
}

// =============================================================================
// EXPORTED ROW INFERENCE
// =============================================================================

/**
 * Infere e extrai campos de uma linha CSV com auto-correção.
 */
export function inferRow(cols: string[]): InferredRow {
  const { cols: alignedCols, wasRealigned, warnings } = realignColumns(cols);
  const inferred = inferAllFields(alignedCols);
  
  // Helper para encontrar campo por índice
  const getField = (idx: number): FieldInference | null => {
    if (idx >= inferred.length) return null;
    const field = inferred[idx];
    if (field.type === 'empty') return null;
    return field;
  };
  
  // Helper para encontrar campos monetários (cols 5-8)
  const getMoneyField = (idx: number): FieldInference | null => {
    if (idx >= inferred.length) return null;
    const field = inferred[idx];
    if (field.type === 'empty') return null;
    // Valida que parece dinheiro
    if (field.type === 'money' || isMoneyPattern(field.value) > 50) {
      return field;
    }
    // Tenta parsear como money mesmo assim
    if (/[\d.,]+/.test(field.value)) {
      return { ...field, type: 'money', confidence: 50 };
    }
    return null;
  };
  
  return {
    data: getField(0),
    documento: getField(1),
    cnpjCpf: getField(2),
    fornecedor: getField(3),
    descricao: getField(4),
    valorCaixa: getMoneyField(5),
    valorBB: getMoneyField(6),
    valorBBRF: getMoneyField(7),
    valorCEF: getMoneyField(8),
    warnings,
    wasRealigned,
  };
}

/**
 * Verifica se uma linha deve ser ignorada (saldo, total, vazia, rodapé).
 */
export function shouldSkipLine(cols: string[]): boolean {
  // Linhas vazias ou só com vírgulas
  const allContent = cols.join('').trim();
  if (!allContent) return true;
  
  const firstCol = (cols[0] || '').toLowerCase().trim();
  const allText = cols.join(' ').toLowerCase();
  
  // Linhas de saldo/total em qualquer posição
  if (/saldo\s*(anterior|atual|dia|final)/i.test(allText)) return true;
  if (/^(total|subtotal)/i.test(firstCol)) return true;
  
  // Linhas de cabeçalho
  if (firstCol === 'data' || firstCol === 'período') return true;
  
  // Linhas de rodapé comuns
  if (/recursos\s*dispon[íi]vel/i.test(allText)) return true;
  if (/movimenta[çc][õo]es/i.test(allText) && !/\d{1,2}\/\d{1,2}/.test(allText)) return true;
  
  // Linha com primeira coluna vazia e sem data em nenhum lugar
  if (!firstCol && !cols.some(c => /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(c.trim()))) {
    // Verifica se há pelo menos algo útil
    const hasUsefulContent = cols.some(c => {
      const t = c.trim();
      return t.length > 3 && !/^[\d.,\s]+$/.test(t);  // Não é só número
    });
    if (!hasUsefulContent) return true;
  }
  
  // Linha que é só um número solto (tipo total geral no final)
  if (cols.filter(c => c.trim()).length === 1) {
    const onlyValue = cols.find(c => c.trim());
    if (onlyValue && /^[\d.,\s]+$/.test(onlyValue.trim())) return true;
  }
  
  return false;
}

