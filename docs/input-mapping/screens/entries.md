# Lançamentos (Entries)

| Campo | Rota | Arquivo |
|-------|------|---------|
| Lançamentos | `/entries` | `client/src/pages/Entries.tsx` |

## Inputs da Tela Principal

| Label | name/id | Tipo | Obrigatório | Validação | Source | Destination | Notas |
|-------|---------|------|-------------|-----------|--------|-------------|-------|
| Período | `periodFilter` | select | Não | - | Query `periods.list` | Query filter | Todos por default |

## Modal: Novo Lançamento

| Label | name/id | Tipo | Obrigatório | Validação | Default |
|-------|---------|------|-------------|-----------|---------|
| Período | `periodId` | select | Sim | Período aberto | Período atual |
| Data | `transactionDate` | date | Sim | - | Hoje |
| Conta | `accountId` | select | Sim | Conta analítica | - |
| Tipo | `type` | select | Sim | `debit` ou `credit` | `debit` |
| Valor (R$) | `amountCents` | text | Sim | > 0, formato BRL | - |
| Descrição | `description` | text | Sim | - | - |
| Recurso NFC | `isNfc` | checkbox | Não | - | `false` |
| Categoria NFC | `nfcCategory` | select | Condicional | Se isNfc && type=debit | - |
| Notas | `notes` | textarea | Não | - | - |

## Opções de NFC Category

| Valor | Label |
|-------|-------|
| `project_70` | 70% Projeto |
| `operating_30` | 30% Custeio |

## Tipos de Lançamento

| Valor | Label | Semântica |
|-------|-------|-----------|
| `debit` | Débito (Despesa) | Saída |
| `credit` | Crédito (Receita) | Entrada |

## Queries tRPC

| Query/Mutation | Descrição |
|----------------|-----------|
| `periods.list` | Lista períodos para filtro |
| `accounts.list` | Lista contas para seleção |
| `entries.list` | Lista lançamentos paginados |
| `entries.create` | Cria lançamento |
| `entries.exportCSV` | Exporta em CSV |

## Eventos

| Evento | Descrição |
|--------|-----------|
| Novo Lançamento | Abre modal de criação |
| Exportar CSV | Download de lançamentos |
| Filtrar | Atualiza lista por período |

## Observações

- Paginação: 20 itens por página
- Exportação CSV com BOM UTF-8
- Conta: apenas contas analíticas (sem filhos) e ativas
- Período: apenas períodos abertos para novos lançamentos
- Badge NFC para identificar recursos da Nota Fiscal Cidadã


