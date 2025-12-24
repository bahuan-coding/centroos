# Extratos

| Campo | Rota | Arquivo |
|-------|------|---------|
| Extratos | `/extratos/:id` | `client/src/pages/Extratos.tsx` |

## Inputs

**Nenhum input de formulário.** Tela é read-only (visualização de extrato da conta selecionada).

## Parâmetros de Rota

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `:id` | string | ID da conta financeira |

## Dados Exibidos

| Query tRPC | Descrição |
|------------|-----------|
| `contasFinanceiras.getById` | Dados da conta |
| `contasFinanceiras.extrato` | Movimentações da conta |

## Navegação

- Acessada via clique em conta na tela `/contas`
- Não aparece no menu de navegação principal

## Observações

- Tela read-only para visualização de movimentações
- Usada internamente pelo fluxo de contas financeiras






