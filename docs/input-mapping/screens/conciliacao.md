# Conciliação

| Campo | Rota | Arquivo |
|-------|------|---------|
| Conciliação | `/conciliacao` | `client/src/pages/Conciliacao.tsx` |

## Inputs da Tela Principal

| Label | name/id | Tipo | Obrigatório | Validação | Source | Destination | Notas |
|-------|---------|------|-------------|-----------|--------|-------------|-------|
| Conta | `contaId` | select | Sim | - | Query `contasFinanceiras.list` | Query filter | Seleciona conta para conciliar |
| Período | `periodo` | select | Não | - | Query `periods.list` | Query filter | Filtra por período |

## Workflow

| Passo | Descrição |
|-------|-----------|
| 1. Selecionar Conta | Escolhe conta financeira |
| 2. Importar Extrato | Upload de arquivo bancário (OFX/CSV) |
| 3. Conciliar | Match automático ou manual |
| 4. Confirmar | Salva conciliação |

## Ações de Conciliação

| Ação | Descrição |
|------|-----------|
| Match Automático | Vincula por valor/data |
| Match Manual | Vincula manualmente |
| Criar Título | Gera título a partir de transação |
| Ignorar | Marca como não conciliável |

## Queries tRPC

| Query/Mutation | Descrição |
|----------------|-----------|
| `contasFinanceiras.list` | Lista contas |
| `conciliacao.import` | Importa extrato |
| `conciliacao.match` | Executa matching |
| `conciliacao.confirm` | Confirma conciliação |

## Observações

- Suporte a OFX e CSV
- Matching por valor exato e data aproximada
- Indicador visual de divergências








