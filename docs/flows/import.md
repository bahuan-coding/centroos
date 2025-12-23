# Guia de Importação e Classificação Automática de Extratos Bancários

> **Atualizado:** Dezembro 2024  
> **Módulo:** B - Dinheiro/Caixa

## 1. VISÃO GERAL

### 1.1 Objetivo

O módulo de importação automatiza a extração de transações de extratos bancários em diferentes formatos (CSV, OFX, TXT) e sugere classificações contábeis baseadas em regras, reduzindo o trabalho manual de lançamento.

**Benefícios:**
- **Economia de tempo**: Importação de dezenas de transações em minutos
- **Redução de erros**: Eliminação de digitação manual
- **Consistência**: Classificação padronizada baseada em regras
- **Rastreabilidade**: Vínculo direto entre extrato e lançamentos

### 1.2 Arquitetura de Parsers

**Localização:** `server/parsers/`

| Arquivo | Descrição |
|---------|-----------|
| `index.ts` | Entry point - função `parseStatement(buffer, fileType)` |
| `types.ts` | Interfaces `ParsedTransaction` e `ParseResult` |
| `csv-parser.ts` | Parser para arquivos CSV |
| `ofx-parser.ts` | Parser para arquivos OFX (padrão bancário) |
| `txt-parser.ts` | Parser para arquivos TXT |

### 1.3 Formatos Suportados

| Formato | Extensão | Status | Observações |
|---------|----------|--------|-------------|
| **OFX** | `.ofx` | ✅ Recomendado | Padrão Open Financial Exchange |
| **CSV** | `.csv` | ✅ Implementado | Parser genérico com detecção de colunas |
| **TXT** | `.txt` | ✅ Implementado | Parser para extratos em texto |

### 1.4 Tabelas do Schema

| Tabela | Descrição |
|--------|-----------|
| `extratoBancario` | Arquivo importado com metadados |
| `extratoLinha` | Linhas individuais do extrato |
| `conciliacao` | Vínculo entre linha e título/lançamento |

### 1.5 Fluxo Geral

```
Upload → Parsing → Detecção de Duplicatas → Classificação → Revisão Manual → Conciliação
```

**Rota do Frontend:** `/import`

---

## 2. FORMATOS DE ARQUIVO

### 2.1 Tipos de Dados

**Interface ParsedTransaction (`server/parsers/types.ts`):**
```typescript
export interface ParsedTransaction {
  date: Date;
  description: string;
  amountCents: number;
  type: 'credit' | 'debit';
  balance?: number;
  fitId?: string;  // Identificador único do banco (OFX)
}

export interface ParseResult {
  transactions: ParsedTransaction[];
  startDate?: Date;
  endDate?: Date;
  bank?: string;
  account?: string;
}
```

**Entry Point (`server/parsers/index.ts`):**
```typescript
export async function parseStatement(buffer: Buffer, fileType: string): Promise<ParseResult> {
  switch (fileType.toLowerCase()) {
    case 'ofx':
      return parseOFX(buffer);
    case 'csv':
      return parseCSV(buffer);
    case 'txt':
      return parseTXT(buffer);
    default:
      throw new Error(`Formato não suportado: ${fileType}. Use CSV, OFX ou TXT.`);
  }
}
```

### 2.2 OFX (Recomendado)

**Características:**
- Padrão Open Financial Exchange
- Formato mais confiável e estruturado
- Contém metadados do banco e conta
- Identificador único por transação (FITID)

**Arquivo:** `server/parsers/ofx-parser.ts`

### 2.3 CSV

**Características:**
- Formato genérico exportado por diversos bancos
- Requer detecção de colunas
- Separadores: vírgula, ponto-e-vírgula, tab

**Arquivo:** `server/parsers/csv-parser.ts`

### 2.4 TXT

**Características:**
- Extratos em texto plano
- Parsing baseado em padrões de linha
- Menos confiável que OFX

**Arquivo:** `server/parsers/txt-parser.ts`

### 2.5 Exemplo de Parsing (Conceitual)
}
```

**Estrutura Típica - Caixa Econômica:**
```
CAIXA ECONÔMICA FEDERAL
Agência: 0123  Operação: 001  Conta: 12345-6

Extrato Período: 01/12/2024 a 31/12/2024

Data    Lançamento                              Valor        Saldo
15/12   PIX RECEBIDO                            500,00+      5.500,00
        JOAO SILVA
14/12   DEB AUTOM CEMIG                         250,00-      5.000,00
13/12   TRANSF RECEBIDA                         1.200,00+    5.250,00
        NOTA FISCAL CIDADA
```

**Parser Caixa:**
```typescript
// server/parsers/caixa-pdf.ts
export async function parseCaixaPDF(fileBuffer: Buffer): Promise<Transaction[]> {
  const data = await pdf(fileBuffer);
  const text = data.text;
  
  const transactionSection = extractTransactionSection(text);
  const lines = transactionSection.split("\n");
  
  const transactions: Transaction[] = [];
  let currentTransaction: Partial<Transaction> | null = null;
  
  for (const line of lines) {
    // Linha de data e descrição principal
    const mainLineMatch = line.match(/(\d{2}\/\d{2})\s+(.+?)\s+([\d.]+,\d{2})([+-])\s+([\d.]+,\d{2})/);
    
    if (mainLineMatch) {
      // Salvar transação anterior se existir
      if (currentTransaction) {
        transactions.push(currentTransaction as Transaction);
      }
      
      const [, dateStr, description, valueStr, sign, balanceStr] = mainLineMatch;
      
      // Data (assumir ano atual)
      const [day, month] = dateStr.split("/").map(Number);
      const year = new Date().getFullYear();
      const date = new Date(year, month - 1, day);
      
      const value = parseFloat(valueStr.replace(/\./g, "").replace(",", "."));
      const amountCents = Math.round(value * 100);
      
      const balance = parseFloat(balanceStr.replace(/\./g, "").replace(",", "."));
      
      currentTransaction = {
        date,
        description: description.trim(),
        amountCents,
        type: sign === "+" ? "credit" : "debit",
        balance: Math.round(balance * 100),
      };
    } else if (currentTransaction && line.trim()) {
      // Linha de descrição complementar
      currentTransaction.description += " " + line.trim();
    }
  }
  
  // Adicionar última transação
  if (currentTransaction) {
    transactions.push(currentTransaction as Transaction);
  }
  
  return transactions;
}
```

### 2.2 CSV (Genérico)

**Formato Esperado:**
```csv
Data,Descrição,Valor,Tipo
15/12/2024,PIX RECEBIDO - JOAO SILVA,500.00,C
14/12/2024,DEBITO AUTOMATICO - CEMIG,-250.00,D
13/12/2024,TRANSFERENCIA RECEBIDA - NOTA FISCAL CIDADA,1200.00,C
```

**Variações Aceitas:**
- Separador: vírgula (`,`) ou ponto-e-vírgula (`;`)
- Encoding: UTF-8, ISO-8859-1 (Latin-1)
- Cabeçalho: Primeira linha (obrigatório)
- Formato de data: DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY
- Formato de valor: 1234.56, 1.234,56, 1234,56

**Parser CSV:**
```typescript
// server/parsers/csv-parser.ts
import { parse } from "csv-parse/sync";
import iconv from "iconv-lite";

export async function parseCSV(fileBuffer: Buffer): Promise<Transaction[]> {
  // Detectar encoding
  const text = detectEncoding(fileBuffer);
  
  // Detectar delimitador
  const delimiter = detectDelimiter(text);
  
  // Parsear CSV
  const records = parse(text, {
    columns: true,
    skip_empty_lines: true,
    delimiter,
    trim: true,
  });
  
  // Mapear para transações
  const transactions: Transaction[] = records.map((record: any) => {
    const date = parseDate(record.Data || record.data || record.DATE);
    const description = record.Descrição || record["Descricao"] || record.Description || record.DESCRIPTION;
    const value = parseValue(record.Valor || record.Value || record.VALOR);
    const type = detectType(record.Tipo || record.Type || record.TIPO, value);
    
    return {
      date,
      description,
      amountCents: Math.abs(Math.round(value * 100)),
      type,
    };
  });
  
  return transactions;
}

function detectEncoding(buffer: Buffer): string {
  // Tentar UTF-8 primeiro
  try {
    const utf8 = buffer.toString("utf-8");
    if (!utf8.includes("�")) {
      return utf8;
    }
  } catch (e) {
    // Ignorar
  }
  
  // Tentar ISO-8859-1
  return iconv.decode(buffer, "ISO-8859-1");
}

function detectDelimiter(text: string): string {
  const firstLine = text.split("\n")[0];
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  
  return semicolonCount > commaCount ? ";" : ",";
}

function parseDate(dateStr: string): Date {
  // DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    const [day, month, year] = dateStr.split("/").map(Number);
    return new Date(year, month - 1, day);
  }
  
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return new Date(dateStr);
  }
  
  // DD-MM-YYYY
  if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
    const [day, month, year] = dateStr.split("-").map(Number);
    return new Date(year, month - 1, day);
  }
  
  throw new Error(`Formato de data não reconhecido: ${dateStr}`);
}

function parseValue(valueStr: string): number {
  // Remover símbolos de moeda
  let cleaned = valueStr.replace(/[R$\s]/g, "");
  
  // Detectar formato
  if (cleaned.includes(",") && cleaned.includes(".")) {
    // 1.234,56 → 1234.56
    if (cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".")) {
      cleaned = cleaned.replace(/\./g, "").replace(",", ".");
    } else {
      // 1,234.56 → 1234.56
      cleaned = cleaned.replace(/,/g, "");
    }
  } else if (cleaned.includes(",")) {
    // 1234,56 → 1234.56
    cleaned = cleaned.replace(",", ".");
  }
  
  return parseFloat(cleaned);
}

function detectType(typeStr: string | undefined, value: number): "credit" | "debit" {
  if (typeStr) {
    const normalized = typeStr.toUpperCase();
    if (normalized === "C" || normalized === "CREDIT" || normalized === "CREDITO") {
      return "credit";
    }
    if (normalized === "D" || normalized === "DEBIT" || normalized === "DEBITO") {
      return "debit";
    }
  }
  
  // Inferir pelo sinal do valor
  return value >= 0 ? "credit" : "debit";
}
```

### 2.3 OFX (Open Financial Exchange)

**Formato:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<OFX>
  <SIGNONMSGSRSV1>
    <SONRS>
      <STATUS>
        <CODE>0</CODE>
        <SEVERITY>INFO</SEVERITY>
      </STATUS>
      <DTSERVER>20241215120000</DTSERVER>
      <LANGUAGE>POR</LANGUAGE>
    </SONRS>
  </SIGNONMSGSRSV1>
  <BANKMSGSRSV1>
    <STMTTRNRS>
      <TRNUID>1</TRNUID>
      <STATUS>
        <CODE>0</CODE>
        <SEVERITY>INFO</SEVERITY>
      </STATUS>
      <STMTRS>
        <CURDEF>BRL</CURDEF>
        <BANKACCTFROM>
          <BANKID>001</BANKID>
          <ACCTID>12345-6</ACCTID>
          <ACCTTYPE>CHECKING</ACCTTYPE>
        </BANKACCTFROM>
        <BANKTRANLIST>
          <DTSTART>20241201</DTSTART>
          <DTEND>20241231</DTEND>
          <STMTTRN>
            <TRNTYPE>CREDIT</TRNTYPE>
            <DTPOSTED>20241215</DTPOSTED>
            <TRNAMT>500.00</TRNAMT>
            <FITID>20241215001</FITID>
            <MEMO>PIX RECEBIDO - JOAO SILVA</MEMO>
          </STMTTRN>
          <STMTTRN>
            <TRNTYPE>DEBIT</TRNTYPE>
            <DTPOSTED>20241214</DTPOSTED>
            <TRNAMT>-250.00</TRNAMT>
            <FITID>20241214001</FITID>
            <MEMO>DEBITO AUTOMATICO - CEMIG</MEMO>
          </STMTTRN>
        </BANKTRANLIST>
      </STMTRS>
    </STMTTRNRS>
  </BANKMSGSRSV1>
</OFX>
```

**Parser OFX:**
```typescript
// server/parsers/ofx-parser.ts
import { parseStringPromise } from "xml2js";

export async function parseOFX(fileBuffer: Buffer): Promise<Transaction[]> {
  const text = fileBuffer.toString("utf-8");
  
  // OFX pode ter header SGML antes do XML
  const xmlStart = text.indexOf("<OFX>");
  const xml = xmlStart !== -1 ? text.substring(xmlStart) : text;
  
  // Parsear XML
  const parsed = await parseStringPromise(xml);
  
  // Navegar estrutura OFX
  const stmtrs = parsed.OFX.BANKMSGSRSV1[0].STMTTRNRS[0].STMTRS[0];
  const tranList = stmtrs.BANKTRANLIST[0];
  const transactions = tranList.STMTTRN;
  
  return transactions.map((trn: any) => {
    // Data no formato YYYYMMDD
    const dateStr = trn.DTPOSTED[0];
    const year = parseInt(dateStr.substring(0, 4));
    const month = parseInt(dateStr.substring(4, 6)) - 1;
    const day = parseInt(dateStr.substring(6, 8));
    const date = new Date(year, month, day);
    
    // Valor
    const amount = parseFloat(trn.TRNAMT[0]);
    const amountCents = Math.abs(Math.round(amount * 100));
    
    // Tipo
    const type = amount >= 0 ? "credit" : "debit";
    
    // Descrição
    const description = trn.MEMO ? trn.MEMO[0] : trn.NAME ? trn.NAME[0] : "Transação";
    
    return {
      date,
      description,
      amountCents,
      type,
      fitId: trn.FITID[0], // ID único da transação
    };
  });
}
```

---

## 3. DETECÇÃO DE DUPLICATAS

### 3.1 Estratégia de Detecção

**Critérios de Duplicata:**

Uma transação é considerada duplicata se **todos** os seguintes critérios forem atendidos:
1. **Data** idêntica
2. **Valor** idêntico (em centavos)
3. **Descrição** similar (>90% de similaridade)

**Implementação:**
```typescript
async function detectDuplicates(
  transactions: Transaction[],
  periodStart: Date,
  periodEnd: Date
): Promise<{
  transaction: Transaction;
  duplicateOf: Entry | null;
  isDuplicate: boolean;
}[]> {
  // Buscar lançamentos existentes no período
  const existingEntries = await getEntries({
    startDate: periodStart,
    endDate: periodEnd,
  });
  
  return transactions.map(transaction => {
    const duplicate = existingEntries.find(entry => {
      // Critério 1: Data idêntica
      if (entry.transactionDate.getTime() !== transaction.date.getTime()) {
        return false;
      }
      
      // Critério 2: Valor idêntico
      if (entry.amountCents !== transaction.amountCents) {
        return false;
      }
      
      // Critério 3: Descrição similar
      const similarity = calculateSimilarity(
        entry.description.toLowerCase(),
        transaction.description.toLowerCase()
      );
      
      return similarity > 0.9;
    });
    
    return {
      transaction,
      duplicateOf: duplicate || null,
      isDuplicate: !!duplicate,
    };
  });
}
```

### 3.2 Tratamento de Duplicatas

**Opções para o Usuário:**

1. **Ignorar Duplicatas** (padrão): Não importar transações duplicadas
2. **Importar Todas**: Importar mesmo duplicatas (não recomendado)
3. **Revisar Manualmente**: Usuário decide caso a caso

**Interface:**
```tsx
<Card>
  <CardHeader>
    <CardTitle>Duplicatas Detectadas</CardTitle>
    <CardDescription>
      {duplicates.length} transações já existem no sistema
    </CardDescription>
  </CardHeader>
  <CardContent>
    <div className="space-y-2">
      {duplicates.map((dup, index) => (
        <div key={index} className="flex items-center justify-between p-2 border rounded">
          <div>
            <p className="font-medium">{dup.transaction.description}</p>
            <p className="text-sm text-muted-foreground">
              {formatDate(dup.transaction.date)} - {formatCurrency(dup.transaction.amountCents)}
            </p>
          </div>
          <Badge variant="outline">Duplicata</Badge>
        </div>
      ))}
    </div>
    
    <div className="mt-4">
      <Label>Ação para duplicatas:</Label>
      <RadioGroup value={duplicateAction} onValueChange={setDuplicateAction}>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="ignore" id="ignore" />
          <Label htmlFor="ignore">Ignorar (não importar)</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="import" id="import" />
          <Label htmlFor="import">Importar mesmo assim</Label>
        </div>
      </RadioGroup>
    </div>
  </CardContent>
</Card>
```

---

## 4. CLASSIFICAÇÃO AUTOMÁTICA

### 4.1 Sistema de Regras

**Estrutura de Regra:**
```typescript
{
  id: number,
  pattern: string,           // Texto a buscar na descrição
  accountId: number,         // Conta sugerida
  priority: number,          // Prioridade (maior = mais importante)
  active: boolean,           // Ativa ou não
  usageCount: number,        // Quantas vezes foi usada
  createdBy: number,
  createdAt: Date,
}
```

**Exemplos de Regras:**
| Pattern | Conta | Prioridade | Uso |
|---------|-------|------------|-----|
| `PIX RECEBIDO` | 6.1.1 Doações de Associados | 10 | Receita de doações via PIX |
| `NOTA FISCAL CIDADA` | 6.2.1 Nota Fiscal Cidadã | 20 | Receita NFC (alta prioridade) |
| `CEMIG` | 7.3.1 Energia Elétrica | 15 | Despesa com luz |
| `COPASA` | 7.3.2 Água e Esgoto | 15 | Despesa com água |
| `SALARIO` | 7.1.1 Salários | 18 | Despesa com pessoal |
| `TARIFA` | 7.6.1 Tarifas Bancárias | 12 | Despesa bancária |

**Criação de Regras:**

1. **Manual**: Usuário cria regra explicitamente
2. **Sugerida**: Sistema sugere baseado em padrões
3. **Aprendizado**: Sistema aprende com classificações manuais

```typescript
// Criar regra manual
async function createClassificationRule(data: {
  pattern: string;
  accountId: number;
  priority?: number;
}) {
  // Validar pattern único
  const existing = await findRuleByPattern(data.pattern);
  if (existing) {
    throw new Error("Já existe uma regra com este padrão");
  }
  
  // Criar regra
  return await db.insert(classificationRules).values({
    pattern: data.pattern.toLowerCase(),
    accountId: data.accountId,
    priority: data.priority || 10,
    active: true,
    usageCount: 0,
    createdBy: getCurrentUserId(),
  });
}

// Aprender com classificação manual
async function learnFromClassification(entry: Entry) {
  // Extrair keywords da descrição
  const keywords = extractKeywords(entry.description);
  
  for (const keyword of keywords) {
    // Verificar se já existe regra similar
    const existing = await findSimilarRule(keyword, entry.accountId);
    
    if (existing) {
      // Incrementar prioridade
      await updateRule(existing.id, {
        priority: existing.priority + 1,
        usageCount: existing.usageCount + 1,
      });
    } else if (keyword.length >= 4) {
      // Criar nova regra se keyword significativa
      await createClassificationRule({
        pattern: keyword,
        accountId: entry.accountId,
        priority: 5, // Baixa prioridade inicial
      });
    }
  }
}

function extractKeywords(description: string): string[] {
  // Remover stopwords e extrair palavras significativas
  const stopwords = ["de", "da", "do", "para", "com", "em", "a", "o", "e"];
  
  const words = description
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length >= 4)
    .filter(word => !stopwords.includes(word));
  
  return [...new Set(words)]; // Remover duplicatas
}
```

### 4.2 Algoritmo de Classificação

**Fluxo:**
```
1. Normalizar descrição da transação
2. Buscar regras ativas ordenadas por prioridade
3. Para cada regra:
   a. Verificar match exato
   b. Se não, verificar match fuzzy (similaridade > 80%)
   c. Se match, retornar sugestão com confiança
4. Se nenhuma regra match, retornar sem sugestão
```

**Implementação Completa:**
```typescript
async function classifyTransaction(transaction: Transaction): Promise<{
  suggestedAccountId: number | null;
  confidence: number;
  ruleId: number | null;
  isNfc: boolean;
  nfcCategory: "project_70" | "operating_30" | null;
}> {
  const description = transaction.description.toLowerCase().trim();
  
  // Buscar regras ativas ordenadas por prioridade
  const rules = await getClassificationRules({
    active: true,
    orderBy: "priority",
    order: "desc",
  });
  
  // Tentar match com cada regra
  for (const rule of rules) {
    const pattern = rule.pattern.toLowerCase();
    
    // Match exato
    if (description.includes(pattern)) {
      await incrementRuleUsage(rule.id);
      
      const account = await getAccountById(rule.accountId);
      const isNfc = detectNfc(description);
      const nfcCategory = isNfc ? inferNfcCategory(account.type) : null;
      
      return {
        suggestedAccountId: rule.accountId,
        confidence: 0.95,
        ruleId: rule.id,
        isNfc,
        nfcCategory,
      };
    }
    
    // Match fuzzy
    const similarity = calculateSimilarity(description, pattern);
    if (similarity > 0.8) {
      await incrementRuleUsage(rule.id);
      
      const account = await getAccountById(rule.accountId);
      const isNfc = detectNfc(description);
      const nfcCategory = isNfc ? inferNfcCategory(account.type) : null;
      
      return {
        suggestedAccountId: rule.accountId,
        confidence: similarity,
        ruleId: rule.id,
        isNfc,
        nfcCategory,
      };
    }
  }
  
  // Sem match - detectar apenas NFC
  const isNfc = detectNfc(description);
  
  return {
    suggestedAccountId: null,
    confidence: 0,
    ruleId: null,
    isNfc,
    nfcCategory: null,
  };
}

function detectNfc(description: string): boolean {
  const nfcKeywords = [
    "nota fiscal cidada",
    "nota fiscal cidadã",
    "nfc",
    "programa nota fiscal",
  ];
  
  const normalized = description.toLowerCase();
  return nfcKeywords.some(keyword => normalized.includes(keyword));
}

function inferNfcCategory(accountType: string): "project_70" | "operating_30" {
  // Imobilizado = 70% projeto
  if (accountType === "fixed_asset") {
    return "project_70";
  }
  
  // Despesa = 30% custeio
  if (accountType === "expense") {
    return "operating_30";
  }
  
  // Default: custeio
  return "operating_30";
}
```

### 4.3 Confiança da Classificação

**Níveis de Confiança:**

| Confiança | Descrição | Ação Recomendada |
|-----------|-----------|------------------|
| **0.95 - 1.0** | Match exato | Auto-classificar |
| **0.80 - 0.94** | Match fuzzy alto | Sugerir com destaque |
| **0.60 - 0.79** | Match fuzzy médio | Sugerir com aviso |
| **< 0.60** | Match fraco | Não sugerir |

**Indicador Visual:**
```tsx
function ConfidenceBadge({ confidence }: { confidence: number }) {
  if (confidence >= 0.95) {
    return (
      <Badge variant="default" className="bg-green-600">
        <CheckCircle className="mr-1 h-3 w-3" />
        Alta confiança
      </Badge>
    );
  }
  
  if (confidence >= 0.80) {
    return (
      <Badge variant="secondary">
        <AlertCircle className="mr-1 h-3 w-3" />
        Média confiança
      </Badge>
    );
  }
  
  return (
    <Badge variant="outline">
      <HelpCircle className="mr-1 h-3 w-3" />
      Baixa confiança
    </Badge>
  );
}
```

---

## 5. INTERFACE DE IMPORTAÇÃO

### 5.1 Wizard de 3 Etapas

**Etapa 1: Upload**
```tsx
function ImportStep1({ onNext }: { onNext: (file: File, bank: string) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [bank, setBank] = useState<string>("banco_brasil");
  const [isDragging, setIsDragging] = useState(false);
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      validateAndSetFile(droppedFile);
    }
  };
  
  const validateAndSetFile = (file: File) => {
    // Validar tamanho
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Arquivo muito grande (máximo 10MB)");
      return;
    }
    
    // Validar tipo
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!["pdf", "csv", "ofx"].includes(extension || "")) {
      toast.error("Tipo de arquivo não suportado");
      return;
    }
    
    setFile(file);
  };
  
  return (
    <div className="space-y-6">
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors",
          isDragging ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
        )}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">
          Arraste o extrato bancário aqui
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          ou clique para selecionar um arquivo
        </p>
        <p className="text-xs text-muted-foreground">
          Formatos aceitos: PDF, CSV, OFX (máx. 10MB)
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.csv,.ofx"
          className="hidden"
          onChange={(e) => {
            const selectedFile = e.target.files?.[0];
            if (selectedFile) validateAndSetFile(selectedFile);
          }}
        />
      </div>
      
      {file && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                <span className="font-medium">{file.name}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setFile(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      <div>
        <Label>Banco</Label>
        <Select value={bank} onValueChange={setBank}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="banco_brasil">Banco do Brasil</SelectItem>
            <SelectItem value="caixa_economica">Caixa Econômica Federal</SelectItem>
            <SelectItem value="other">Outro Banco</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="flex justify-end">
        <Button
          onClick={() => file && onNext(file, bank)}
          disabled={!file}
        >
          Próximo
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
```

**Etapa 2: Processamento e Revisão**
```tsx
function ImportStep2({
  transactions,
  duplicates,
  onNext,
  onBack,
}: {
  transactions: Transaction[];
  duplicates: Transaction[];
  onNext: (options: { ignoreDuplicates: boolean }) => void;
  onBack: () => void;
}) {
  const [ignoreDuplicates, setIgnoreDuplicates] = useState(true);
  
  const uniqueTransactions = ignoreDuplicates
    ? transactions.filter(t => !duplicates.includes(t))
    : transactions;
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Resumo da Importação</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total de Transações</p>
              <p className="text-2xl font-bold">{transactions.length}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Duplicatas</p>
              <p className="text-2xl font-bold text-orange-600">{duplicates.length}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">A Importar</p>
              <p className="text-2xl font-bold text-green-600">{uniqueTransactions.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {duplicates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Duplicatas Detectadas</CardTitle>
            <CardDescription>
              {duplicates.length} transações já existem no sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 mb-4">
              {duplicates.slice(0, 3).map((dup, index) => (
                <div key={index} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <p className="font-medium">{dup.description}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(dup.date)} - {formatCurrency(dup.amountCents)}
                    </p>
                  </div>
                  <Badge variant="outline">Duplicata</Badge>
                </div>
              ))}
              {duplicates.length > 3 && (
                <p className="text-sm text-muted-foreground text-center">
                  ... e mais {duplicates.length - 3} duplicatas
                </p>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="ignore-duplicates"
                checked={ignoreDuplicates}
                onCheckedChange={(checked) => setIgnoreDuplicates(checked as boolean)}
              />
              <Label htmlFor="ignore-duplicates">
                Ignorar duplicatas (recomendado)
              </Label>
            </div>
          </CardContent>
        </Card>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle>Preview das Transações</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {uniqueTransactions.slice(0, 5).map((tx, index) => (
                <TableRow key={index}>
                  <TableCell>{formatDate(tx.date)}</TableCell>
                  <TableCell>{tx.description}</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(tx.amountCents)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {uniqueTransactions.length > 5 && (
            <p className="text-sm text-muted-foreground text-center mt-2">
              ... e mais {uniqueTransactions.length - 5} transações
            </p>
          )}
        </CardContent>
      </Card>
      
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <Button onClick={() => onNext({ ignoreDuplicates })}>
          Próximo
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
```

**Etapa 3: Classificação**
```tsx
function ImportStep3({
  transactions,
  classifications,
  onClassify,
  onFinish,
  onBack,
}: {
  transactions: Transaction[];
  classifications: Map<number, Classification>;
  onClassify: (index: number, classification: Classification) => void;
  onFinish: () => void;
  onBack: () => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentTransaction = transactions[currentIndex];
  const currentClassification = classifications.get(currentIndex);
  
  const classifiedCount = Array.from(classifications.values()).filter(c => c.accountId).length;
  const progress = (classifiedCount / transactions.length) * 100;
  
  const handleNext = () => {
    if (currentIndex < transactions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };
  
  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Classificação de Transações</CardTitle>
          <CardDescription>
            {classifiedCount} de {transactions.length} classificadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={progress} className="w-full" />
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>
            Transação {currentIndex + 1} de {transactions.length}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Descrição</Label>
            <p className="text-lg font-medium">{currentTransaction.description}</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Data</Label>
              <p>{formatDate(currentTransaction.date)}</p>
            </div>
            <div>
              <Label>Valor</Label>
              <p className="text-lg font-mono font-bold">
                {formatCurrency(currentTransaction.amountCents)}
              </p>
            </div>
          </div>
          
          {currentClassification?.suggestedAccountId && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium">Sugestão Automática</p>
                <ConfidenceBadge confidence={currentClassification.confidence} />
              </div>
              <p className="text-sm">{currentClassification.suggestedAccount?.name}</p>
            </div>
          )}
          
          <div>
            <Label>Conta Contábil</Label>
            <AccountCombobox
              value={currentClassification?.accountId}
              onChange={(accountId) => onClassify(currentIndex, { ...currentClassification, accountId })}
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="is-nfc"
              checked={currentClassification?.isNfc || false}
              onCheckedChange={(checked) =>
                onClassify(currentIndex, { ...currentClassification, isNfc: checked as boolean })
              }
            />
            <Label htmlFor="is-nfc">Marcar como Nota Fiscal Cidadã</Label>
          </div>
          
          {currentClassification?.isNfc && (
            <div>
              <Label>Categoria NFC</Label>
              <RadioGroup
                value={currentClassification.nfcCategory || ""}
                onValueChange={(value) =>
                  onClassify(currentIndex, { ...currentClassification, nfcCategory: value as any })
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="project_70" id="project_70" />
                  <Label htmlFor="project_70">70% Projeto</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="operating_30" id="operating_30" />
                  <Label htmlFor="operating_30">30% Custeio</Label>
                </div>
              </RadioGroup>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentIndex === 0}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Anterior
          </Button>
          <Button
            onClick={handleNext}
            disabled={currentIndex === transactions.length - 1}
          >
            Próxima
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>
      
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Voltar
        </Button>
        <Button
          onClick={onFinish}
          disabled={classifiedCount < transactions.length}
        >
          Concluir Importação
          <Check className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
```

---

## 6. OTIMIZAÇÕES E BOAS PRÁTICAS

### 6.1 Performance

**Processamento em Lote:**
```typescript
// Criar lançamentos em lote (transaction)
async function createEntriesBatch(entries: InsertEntry[]): Promise<Entry[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.transaction(async (tx) => {
    const created: Entry[] = [];
    
    for (const entry of entries) {
      const [newEntry] = await tx.insert(entries).values(entry).returning();
      created.push(newEntry);
    }
    
    return created;
  });
}
```

**Caching de Regras:**
```typescript
// Cache de regras em memória (renovado a cada 5 minutos)
let rulesCache: ClassificationRule[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

async function getCachedRules(): Promise<ClassificationRule[]> {
  const now = Date.now();
  
  if (!rulesCache || now - cacheTimestamp > CACHE_TTL) {
    rulesCache = await getClassificationRules({ active: true });
    cacheTimestamp = now;
  }
  
  return rulesCache;
}
```

### 6.2 Tratamento de Erros

**Erros Comuns:**
```typescript
class ImportError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = "ImportError";
  }
}

// Uso
try {
  const transactions = await parseBancoBrasilPDF(fileBuffer);
} catch (error) {
  if (error instanceof ImportError) {
    switch (error.code) {
      case "INVALID_FORMAT":
        toast.error("Formato de arquivo inválido", {
          description: "O arquivo não parece ser um extrato do Banco do Brasil",
        });
        break;
      case "PARSE_ERROR":
        toast.error("Erro ao processar arquivo", {
          description: error.message,
        });
        break;
      default:
        toast.error("Erro desconhecido", {
          description: error.message,
        });
    }
  }
}
```

### 6.3 Logs e Auditoria

**Registrar Importação:**
```typescript
await createAuditLog({
  userId: getCurrentUserId(),
  entityType: "import",
  entityId: bankImport.id,
  action: "create",
  newValues: {
    filename: bankImport.filename,
    bank: bankImport.bank,
    totalTransactions: transactions.length,
    classifiedCount: classified.length,
    duplicatesIgnored: duplicates.length,
  },
});
```

---

**Documento elaborado em:** Dezembro 2024  
**Versão:** 1.0  
**Autor:** Manus AI  
**Referências:** Formatos OFX, CSV, PDF bancários brasileiros
