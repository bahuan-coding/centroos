# Relatório de Auditoria - RawData vs Base de Dados

**Data:** 17/12/2025  
**Fonte:** `rawdata/relatorio_excel_sheets_tsv/CONTRIBUIÇÃO_*.tsv`

---

## Resumo Executivo

| Métrica | Valor |
|---------|-------|
| Total de pessoas no RawData | 80 |
| Com doações | 50 |
| Sem doações | 30 |
| Valor total de doações | R$ 17.690,50 |

---

## PROBLEMA IDENTIFICADO: Maria Júlia Teixeira Lemos

- **Matrícula:** 14
- **Contribuições no RawData:** 0
- **Valor Total no RawData:** R$ 0,00
- **O que aparece no sistema:** 48x · R$ 3.760,00

**VEREDICTO:** Dados incorretos. Ela NUNCA fez doação segundo o RawData.

---

## Pessoas SEM DOAÇÕES no RawData (30 pessoas)

Se qualquer uma dessas aparecer como doadora no sistema, está **ERRADO**.

### Associados sem doação (26):

| Nome | Matrícula |
|------|-----------|
| CÉLIA MARIA BRAGA NETTO COSTA | 4 |
| DIVA GALVÃO CAVALCANTE | 5 |
| **MARIA JÚLIA TEIXEIRA LEMOS** | **14** |
| ELISABETE FREIRE COSTA BARROS | 26 |
| SAMIRA CAVALCANTE LIMA | 29 |
| ELIANE FERREIRA DOS SANTOS | 36 |
| IRACI SILVA MELO | 37 |
| CRISTINA RAQUEL LOPES DOS S. TONIAL | 42 |
| ANA PAULA BORGES MENDONÇA | 43 |
| MARIA ADRIANA DE MELO SARMENTO | 46 |
| CRISTINA FEITOSA SILVA | 51 |
| ZEJANE CARDOSO DA SILVA CAMINHO | 52 |
| CLAUDIO F. PERRELLI | 56 |
| LUIZ BEZERRA MENDONÇA | 58 |
| PAULO OLIVEIRA DE MORAIS | 60 |
| EDNILTON LUCENA | 63 |
| SONIA MARIA ALVES DE LIMA | 66 |
| ANGELA LÚCIA OLIVEIRA DA SILVA | 67 |
| JOSE MARIA VIEIRA DA SILVA | 68 |
| JEFERSON GABRIEL SOARES | 69 |
| LAÍS SANTIAGO SOARES | 87 |
| JORGE MEDEIROS | 99 |
| ELILDIERLI SOARES FERREIRA | - |
| ALCIONE SOARES FERREIRA | - |
| JANE COSTA DA SILVA | - |
| YAGO ALMEIDA | - |

### Não-associados sem doação (4):

| Nome |
|------|
| LARISSA MOURA |
| MARIA EDUARDO |
| THAYZE KEYLLA |
| VICTOR FERREIRA |

---

## TOP 15 Doadores Reais (conforme RawData)

| # | Nome | Tipo | Qtd | Valor Total |
|---|------|------|-----|-------------|
| 1 | NAZIDIR MARIA DOS SANTOS | Associado | 31 | R$ 2.625,00 |
| 2 | EDNA S TENORIO | Não Assoc. | 9 | R$ 1.350,00 |
| 3 | TATIANE MOREIRA | Não Assoc. | 9 | R$ 1.350,00 |
| 4 | CELIA COSTA DOS SANTOS | Associado | 10 | R$ 1.000,00 |
| 5 | MARLENE A ALBUQUERQUE | Não Assoc. | 1 | R$ 1.000,00 |
| 6 | MARIA CRISTINA ANTUNES DO C.PINHEIRO | Associado | 9 | R$ 960,00 |
| 7 | ROSILENE MARQUES AGUIAR BORGES | Associado | 10 | R$ 800,00 |
| 8 | CLAUDINETE B. TENORIO CAVALCANTE | Não Assoc. | 8 | R$ 750,00 |
| 9 | JOSE OLINDINO | Não Assoc. | 2 | R$ 600,00 |
| 10 | SIRLEIDE G. DE ALBUQUERQUE SANTOS | Associado | 12 | R$ 590,00 |
| 11 | GUSTAVO REIS SARMENTO | Associado | 9 | R$ 450,00 |
| 12 | MICHELINE BATISTA | Não Assoc. | 8 | R$ 400,00 |
| 13 | ANDREIA SANTOS SANTANA | Associado | 7 | R$ 350,00 |
| 14 | MARCOS ANTÔNIO SANTIAGO SOARES | Associado | 10 | R$ 300,00 |
| 15 | ENEIDE ROSSO | Não Assoc. | 3 | R$ 300,00 |

---

## Ações Recomendadas

1. **Deletar títulos incorretos** da Maria Júlia e outras pessoas sem doação
2. **Re-executar seed** apenas com dados validados do RawData
3. **Verificar lógica de importação** que pode ter criado associações erradas

---

## Arquivos Gerados

- `audit-issues.csv` - CSV completo para análise
- `scripts/audit-rawdata.ts` - Script de auditoria reutilizável
