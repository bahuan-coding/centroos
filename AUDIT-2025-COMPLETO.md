# Relatório de Auditoria Completo - 2025

**Data da Auditoria:** 19/12/2025  
**Executado via:** Neon MCP + Análise de Rawdata  
**Projeto:** gentle-salad-37180890

---

## Resumo Executivo

| Métrica | Valor |
|---------|-------|
| Total de Pessoas Cadastradas | 84 |
| Pessoas Ativas | 84 |
| Associados Ativos | 57 |
| Total de Títulos (não deletados) | 1.131 |
| Títulos a Receber | 451 |
| Títulos a Pagar | 680 |
| Valor Total de Títulos | R$ 147.024,44 |

---

## PROBLEMAS CRÍTICOS IDENTIFICADOS

### 1. Títulos Atribuídos a Pessoas INCORRETAS

Os seguintes associados têm títulos de contribuição no sistema, mas segundo os arquivos `associados_doacao.csv` e `nao_associados_doacao.csv`, **NUNCA fizeram doações**:

| Nome | Matrícula | Qtd Títulos 2025 | Valor Total | Status |
|------|-----------|-----------------|-------------|--------|
| Célia Maria Braga Netto Costa | 4 | 7 | R$ 700,00 | **INCORRETO** |
| Maria Adriana de Melo Sarmento | 46 | 13 | R$ 1.240,00 | **INCORRETO** |
| Jose Maria Vieira da Silva | 68 | 2 | R$ 600,00 | **INCORRETO** |
| Luiz Bezerra Mendonça | 58 | 1 | R$ 220,00 | **INCORRETO** |

**Total de valores incorretamente atribuídos: R$ 2.760,00**

### 2. Contribuições Faltando para Pessoas CORRETAS

Os seguintes associados deveriam ter entradas que estão FALTANDO:

| Nome | Matrícula | Meses Faltando | Problema |
|------|-----------|----------------|----------|
| Celia Costa dos Santos | 3 | Janeiro, Novembro | Entradas atribuídas a "Célia Maria Braga Netto Costa" |
| Maria Cristina Antunes do C.pinheiro | 18 | Fevereiro, Novembro | Entradas atribuídas a "Maria Adriana de Melo Sarmento" |
| Maria de Lourdes Lopes dos Santos | 20 | Novembro | Entrada atribuída a "Maria Adriana de Melo Sarmento" |

---

## Análise Detalhada - Novembro 2025

### Rawdata (rawdata_novembro.csv) - 25 Contribuições

| Data | Nome no Rawdata | Valor | Tipo |
|------|-----------------|-------|------|
| 11/03 | Edna S Tenório | R$ 150 | Não Associado |
| 11/03 | Celia Costa | R$ 100 | Associado |
| 11/03 | Tatiaria Moreira | R$ 150 | Não Associado |
| 11/03 | Nazidir Maria dos Santos | R$ 100 | Associado |
| 11/03 | Eneide Rosso | R$ 100 | Não Associado |
| 11/03 | **Maria Cristina Cunha** | R$ 120 | Associado |
| 11/05 | Gustavo Reis | R$ 75 | Associado |
| 11/05 | **Maria de lourdes L.Santos** | R$ 30 | Associado |
| 11/05 | Andreia dos Santos Santana | R$ 50 | Associado |
| 11/05 | Patricia Lopes Brandão | R$ 25 | Associado |
| 11/06 | Claudinete Bol | R$ 50 | Não Associado |
| 11/07 | Mauricio Ferreira da Silva | R$ 50 | Associado |
| 11/10 | Severina Correia | R$ 20 | Associado |
| 11/10 | Dayse Lidia Lucena | R$ 25 | Associado |
| 11/10 | Paulo Cesar Rodrigues | R$ 30 | Não Associado |
| 11/10 | Nazidir Maria dos Santos | R$ 50 | Não Associado |
| 11/11 | Rosangela Maria | R$ 30 | Não Associado |
| 11/13 | Eduardo Henrique | R$ 50 | Associado |
| 11/18 | Marco Antonio Santiago Soares | R$ 30 | Associado |
| 11/24 | Micheline Gomes | R$ 50 | Não Associado |
| 11/26 | Jailton Rodrigues | R$ 50 | Associado |
| 11/27 | Luciana Silva | R$ 15 | Associado |
| 11/27 | Paulo Gomes/Bianca Almeida | R$ 40 | Associado |
| 11/27 | Nazidir Maria dos Santos | R$ 130 | Não Associado |
| 11/28 | Rosilene Marques | R$ 100 | Associado |

### Discrepâncias Identificadas

#### ❌ Entrada ERRADA no Banco:
- **Célia Maria Braga Netto Costa** → R$ 100 em 11/03
  - Deveria ser: **Celia Costa dos Santos**
  
- **Maria Adriana de Melo Sarmento** → R$ 120 em 11/03
  - Deveria ser: **Maria Cristina Antunes do C.pinheiro**
  
- **Maria Adriana de Melo Sarmento** → R$ 30 em 11/05
  - Deveria ser: **Maria de Lourdes Lopes dos Santos**

---

## Associados Ativos SEM Contribuições em 2025

Os seguintes 22 associados ativos não têm nenhuma contribuição registrada em 2025 (confirmado pelo rawdata que não fizeram doações):

| Nome | Matrícula | Status |
|------|-----------|--------|
| Alcione Soares Ferreira | - | ativo |
| Ana Paula Borges Mendonça | 43 | ativo |
| Angela Lúcia Oliveira da Silva | 67 | ativo |
| Claudio F. Perrelli | 56 | ativo |
| Cristina Feitosa Silva | 51 | ativo |
| Cristina Raquel Lopes dos S. Tonial | 42 | ativo |
| Diva Galvão Cavalcante | 5 | ativo |
| Ednilton Lucena | 63 | ativo |
| Eliane Ferreira dos Santos | 36 | ativo |
| Elildierli Soares Ferreira | - | ativo |
| Elisabete Freire Costa Barros | 26 | ativo |
| Iraci Silva Melo | 37 | ativo |
| Jane Costa da Silva | - | ativo |
| Jeferson Gabriel Soares | 69 | ativo |
| Jorge Medeiros | 99 | ativo |
| Laís Santiago Soares | 87 | ativo |
| Maria Júlia Teixeira Lemos | 14 | ativo |
| Paulo Oliveira de Morais | 60 | ativo |
| Samira Cavalcante Lima | 29 | ativo |
| Sonia Maria Alves de Lima | 66 | ativo |
| Yago Almeida | - | ativo |
| Zejane Cardoso da Silva Caminho | 52 | ativo |

---

## Top 20 Contribuidores 2025

| # | Nome | Qtd | Total |
|---|------|-----|-------|
| 1 | Nazidir Maria dos Santos | 63 | R$ 4.495,00 |
| 2 | Tatiane Moreira | 11 | R$ 1.650,00 |
| 3 | Edna S Tenorio | 10 | R$ 1.500,00 |
| 4 | Maria Adriana de Melo Sarmento* | 13 | R$ 1.240,00 |
| 5 | Gustavo Reis Sarmento | 19 | R$ 1.200,00 |
| 6 | Marlene a Albuquerque | 1 | R$ 1.000,00 |
| 7 | Maurício Ferreira da Silva | 22 | R$ 980,50 |
| 8 | Rosilene Marques Aguiar Borges | 11 | R$ 975,00 |
| 9 | Maria Cristina Antunes do C.pinheiro | 9 | R$ 960,00 |
| 10 | Celia Costa dos Santos | 9 | R$ 900,00 |
| 11 | Claudinete B. Tenorio Cavalcante | 10 | R$ 850,00 |
| 12 | Eduardo Henrique Nunes Buarque | 21 | R$ 800,00 |
| 13 | Jailton Rodrigues dos Santos | 21 | R$ 730,00 |
| 14 | Célia Maria Braga Netto Costa* | 7 | R$ 700,00 |
| 15 | Jose Olindino | 2 | R$ 600,00 |
| 16 | Jose Maria Vieira da Silva* | 2 | R$ 600,00 |
| 17 | Micheline Gomes | 11 | R$ 550,00 |
| 18 | Andreia Santos Santana | 8 | R$ 400,00 |
| 19 | Eneide Rosso | 4 | R$ 400,00 |
| 20 | Edleuza Melo Vasconcelos | 2 | R$ 375,00 |

*Marcados com asterisco = valores incorretamente atribuídos

---

## Contribuições por Mês - 2025

| Mês | Qtd Títulos | Valor Total |
|-----|-------------|-------------|
| Janeiro | 32 | R$ 1.515,00 |
| Fevereiro | 36 | R$ 2.250,00 |
| Março | 43 | R$ 2.140,50 |
| Abril | 39 | R$ 2.660,00 |
| Maio | 38 | R$ 1.990,00 |
| Junho | 48 | R$ 2.835,00 |
| Julho | 44 | R$ 2.870,00 |
| Agosto | 33 | R$ 1.825,00 |
| Setembro | 45 | R$ 2.815,00 |
| Outubro | 46 | R$ 3.280,00 |
| Novembro | 25 | R$ 1.620,00 |
| **Total** | **429** | **R$ 25.800,50** |

---

## Ações Corretivas Recomendadas

### Prioridade ALTA (Dados Incorretos):

1. **Deletar títulos de pessoas que NUNCA contribuíram:**
   - Célia Maria Braga Netto Costa (7 títulos, R$ 700)
   - Maria Adriana de Melo Sarmento (13 títulos, R$ 1.240)
   - Jose Maria Vieira da Silva (2 títulos, R$ 600)
   - Luiz Bezerra Mendonça (1 título, R$ 220)

2. **Criar títulos para pessoas CORRETAS:**
   - Celia Costa dos Santos - adicionar Jan e Nov
   - Maria Cristina Antunes do C.pinheiro - adicionar Fev e Nov
   - Maria de Lourdes Lopes dos Santos - adicionar Nov

### Prioridade MÉDIA (Validação):

3. **Revisar script de importação** (`scripts/seed-*.ts`) para corrigir mapeamento de nomes
4. **Verificar confusão de nomes similares** no parser de rawdata

### Prioridade BAIXA (Cadastro):

5. Considerar desativar associados que nunca contribuíram (22 pessoas)
6. Adicionar contatos faltando para pessoas ativas

---

## Conclusão

A auditoria identificou **problemas significativos de atribuição** onde contribuições foram registradas para pessoas erradas devido a confusão de nomes similares. O valor total incorretamente atribuído é de aproximadamente **R$ 2.760,00**.

A correção requer:
- Exclusão de 23 títulos incorretos
- Criação de ~5 títulos para as pessoas corretas
- Revisão do processo de importação para evitar recorrência

---

*Relatório gerado automaticamente via auditoria de dados*

