# RELATÓRIO DE AUDITORIA - RawData vs Base
Data: 17/12/2025, 11:10:13

## 1. RESUMO EXECUTIVO

- **Total de problemas identificados:** 11
  - 🔴 Alta severidade: 11
  - 🟡 Média severidade: 0
  - 🟢 Baixa severidade: 0

## 2. INVENTÁRIO DE DADOS

| Fonte | Registros | Período |
|-------|-----------|---------|
| Extrato CEF | 13 | Nov/2025 |
| Extrato BB | 46 | Nov/2025 |
| Contribuições Associados | 247 | 2025 |
| Contribuições Não Associados | 79 | 2025 |
| Transações Mensais (Excel) | 728 | 2025 |

## 3. DISTRIBUIÇÃO POR TIPO DE PROBLEMA

| Tipo | Quantidade |
|------|------------|
| OUTLIER | 2 |
| MISSING_IN_BASE | 9 |

## 4. LISTA PRIORIZADA DE CASOS PARA AUDITORIA MANUAL

| ID | Origem | Data | Valor (R$) | Tipo | Sev. | Hipótese |
|----|--------|------|------------|------|------|----------|
| OUT-CEF-1 | caixa_extrato_novemb... | 2025-11-11 | 7865.00 | OUTLIER | Alta | Valor atípico - pode ser pagamento grand... |
| OUT-BB-2 | banco_do_brasil_extr... | 2025-11-03 | 720.00 | OUTLIER | Alta | Valor fora do padrão de transações típic... |
| MISS-CEF-3 | Novembro.tsv (Excel)... | 2025-11-03 | 8.50 | MISSING_IN_BASE | Alta | Transação não baixada no banco ou data d... |
| MISS-CEF-4 | Novembro.tsv (Excel)... | 2025-11-07 | 150.64 | MISSING_IN_BASE | Alta | Transação não baixada no banco ou data d... |
| MISS-CEF-5 | Novembro.tsv (Excel)... | 2025-11-07 | 171.14 | MISSING_IN_BASE | Alta | Transação não baixada no banco ou data d... |
| MISS-CEF-6 | Novembro.tsv (Excel)... | 2025-11-07 | 5.34 | MISSING_IN_BASE | Alta | Transação não baixada no banco ou data d... |
| MISS-CEF-7 | Novembro.tsv (Excel)... | 2025-10-10 | 600.00 | MISSING_IN_BASE | Alta | Transação não baixada no banco ou data d... |
| MISS-CEF-8 | Novembro.tsv (Excel)... | 2025-11-10 | 7865.30 | MISSING_IN_BASE | Alta | Transação não baixada no banco ou data d... |
| MISS-CEF-9 | Novembro.tsv (Excel)... | 2025-11-17 | 433.32 | MISSING_IN_BASE | Alta | Transação não baixada no banco ou data d... |
| MISS-CEF-10 | Novembro.tsv (Excel)... | 2025-11-28 | 618.86 | MISSING_IN_BASE | Alta | Transação não baixada no banco ou data d... |
| MISS-CEF-11 | Novembro.tsv (Excel)... | 2025-11-28 | 5.50 | MISSING_IN_BASE | Alta | Transação não baixada no banco ou data d... |

## 5. DETALHES DOS CASOS

### OUT-CEF-1
- **Origem:** caixa_extrato_novembro_2025_lancamentos.csv
- **Data:** 2025-11-11
- **Valor:** R$ 7865.00
- **Descrição:** PREMIACAO
- **Tipo:** OUTLIER
- **Severidade:** Alta
- **Evidência:** Z-score: 3.41 (valor extremo estatisticamente)
- **Hipótese:** Valor atípico - pode ser pagamento grande ou erro de digitação
- **Ação Sugerida:** Conferir comprovante original

### OUT-BB-2
- **Origem:** banco_do_brasil_extrato_novembro_2025_raw.txt
- **Data:** 2025-11-03
- **Valor:** R$ 720.00
- **Descrição:** 351 BB Rende Fácil
- **Tipo:** OUTLIER
- **Severidade:** Alta
- **Evidência:** Z-score: 5.88
- **Hipótese:** Valor fora do padrão de transações típicas
- **Ação Sugerida:** Conferir extrato bancário original

### MISS-CEF-3
- **Origem:** Novembro.tsv (Excel)
- **Data:** 2025-11-03
- **Valor:** R$ 8.50
- **Descrição:** Caixa Economica Federal - Tarifa de Pix
- **Tipo:** MISSING_IN_BASE
- **Severidade:** Alta
- **Evidência:** Valor R$ 8.50 não encontrado no extrato CEF
- **Hipótese:** Transação não baixada no banco ou data divergente
- **Ação Sugerida:** Verificar se a transação foi efetivada e em qual data

### MISS-CEF-4
- **Origem:** Novembro.tsv (Excel)
- **Data:** 2025-11-07
- **Valor:** R$ 150.64
- **Descrição:** Claro S/A - Pagamento Telefone
- **Tipo:** MISSING_IN_BASE
- **Severidade:** Alta
- **Evidência:** Valor R$ 150.64 não encontrado no extrato CEF
- **Hipótese:** Transação não baixada no banco ou data divergente
- **Ação Sugerida:** Verificar se a transação foi efetivada e em qual data

### MISS-CEF-5
- **Origem:** Novembro.tsv (Excel)
- **Data:** 2025-11-07
- **Valor:** R$ 171.14
- **Descrição:** Equatorial Alagoas Distribuidora de Energia S/A - Pagmento de Energia
- **Tipo:** MISSING_IN_BASE
- **Severidade:** Alta
- **Evidência:** Valor R$ 171.14 não encontrado no extrato CEF
- **Hipótese:** Transação não baixada no banco ou data divergente
- **Ação Sugerida:** Verificar se a transação foi efetivada e em qual data

### MISS-CEF-6
- **Origem:** Novembro.tsv (Excel)
- **Data:** 2025-11-07
- **Valor:** R$ 5.34
- **Descrição:** Caixa Economica Federal - Tarifa de Pix
- **Tipo:** MISSING_IN_BASE
- **Severidade:** Alta
- **Evidência:** Valor R$ 5.34 não encontrado no extrato CEF
- **Hipótese:** Transação não baixada no banco ou data divergente
- **Ação Sugerida:** Verificar se a transação foi efetivada e em qual data

### MISS-CEF-7
- **Origem:** Novembro.tsv (Excel)
- **Data:** 2025-10-10
- **Valor:** R$ 600.00
- **Descrição:** Messias de Lima Santos - Pag. de Serv.de montagem da porta da cozinha e ajuste das portas
- **Tipo:** MISSING_IN_BASE
- **Severidade:** Alta
- **Evidência:** Valor R$ 600.00 não encontrado no extrato CEF
- **Hipótese:** Transação não baixada no banco ou data divergente
- **Ação Sugerida:** Verificar se a transação foi efetivada e em qual data

### MISS-CEF-8
- **Origem:** Novembro.tsv (Excel)
- **Data:** 2025-11-10
- **Valor:** R$ 7865.30
- **Descrição:** Caixa Economica Federal - Premiação
- **Tipo:** MISSING_IN_BASE
- **Severidade:** Alta
- **Evidência:** Valor R$ 7865.30 não encontrado no extrato CEF
- **Hipótese:** Transação não baixada no banco ou data divergente
- **Ação Sugerida:** Verificar se a transação foi efetivada e em qual data

### MISS-CEF-9
- **Origem:** Novembro.tsv (Excel)
- **Data:** 2025-11-17
- **Valor:** R$ 433.32
- **Descrição:** BRK - Pagamento de Agua
- **Tipo:** MISSING_IN_BASE
- **Severidade:** Alta
- **Evidência:** Valor R$ 433.32 não encontrado no extrato CEF
- **Hipótese:** Transação não baixada no banco ou data divergente
- **Ação Sugerida:** Verificar se a transação foi efetivada e em qual data

### MISS-CEF-10
- **Origem:** Novembro.tsv (Excel)
- **Data:** 2025-11-28
- **Valor:** R$ 618.86
- **Descrição:** Plastifestas Ltda - Aquisição de material de embalagens
- **Tipo:** MISSING_IN_BASE
- **Severidade:** Alta
- **Evidência:** Valor R$ 618.86 não encontrado no extrato CEF
- **Hipótese:** Transação não baixada no banco ou data divergente
- **Ação Sugerida:** Verificar se a transação foi efetivada e em qual data

### MISS-CEF-11
- **Origem:** Novembro.tsv (Excel)
- **Data:** 2025-11-28
- **Valor:** R$ 5.50
- **Descrição:** Caixa Economica Federal - Tarifa de Pix
- **Tipo:** MISSING_IN_BASE
- **Severidade:** Alta
- **Evidência:** Valor R$ 5.50 não encontrado no extrato CEF
- **Hipótese:** Transação não baixada no banco ou data divergente
- **Ação Sugerida:** Verificar se a transação foi efetivada e em qual data

## 6. HIPÓTESES DE ERRO NO PIPELINE DE MIGRAÇÃO

| # | Hipótese | Sinais que Confirmam | Sinais que Refutam |
|---|----------|---------------------|-------------------|
| 1 | Parsing de valores BR incorreto | Valores x10/x100 | Maioria dos valores corretos |
| 2 | Datas parseadas com timezone errado | Datas ±1 dia | Datas batem exatamente |
| 3 | Duplicação por reimportação | IDs duplicados | Hash de arquivo validado |
| 4 | Movimentos Rende Fácil não filtrados | Débito+Crédito mesmo valor/dia | Movimentos classificados |
| 5 | Contribuições consolidadas indevidamente | Soma de valores diverge | Valores individuais batem |

## 7. CHECKLIST DE VALIDAÇÃO DO PIPELINE

- [ ] Parsing de valores BR (`1.234,56`) vs US (`1,234.56`)
- [ ] Conversão de datas (`DD/MM/YYYY` vs `YYYY-MM-DD`)
- [ ] Detecção de tipo (C/D) nos extratos
- [ ] Deduplicação de importações (hash de arquivo)
- [ ] Normalização de descrições
- [ ] Mapeamento de contas financeiras (BB → uuid, CEF → uuid)
- [ ] Tratamento de movimentos BB Rende Fácil
- [ ] Validação de saldos (saldo anterior + movimentos = saldo final)

## 8. SUPOSIÇÕES FEITAS NESTA AUDITORIA

1. O período analisado é Novembro/2025
2. Os extratos bancários são a fonte primária (fonte de verdade)
3. O relatório Excel é um controle paralelo manual
4. Contribuições via PIX entram pelo Banco do Brasil
5. Movimentos do BB Rende Fácil são automáticos e devem ser filtrados ou tratados
6. Tolerância de data para matching: ±2 dias
7. Tolerância de valor para matching: ±R$ 0.01
