# Contas Financeiras

| Campo | Rota | Arquivo |
|-------|------|---------|
| Contas Financeiras | `/contas` | `client/src/pages/ContasFinanceiras.tsx` |

## Inputs da Tela Principal

| Label | name/id | Tipo | Obrigatório | Validação | Source | Destination | Notas |
|-------|---------|------|-------------|-----------|--------|-------------|-------|
| Buscar | - | text | Não | - | Usuário | Filtro local | Busca por nome, banco ou número |

## Filtros (Quick Stats clicáveis)

| Filtro | Valor | Descrição |
|--------|-------|-----------|
| Todas | `all` | Mostra todas as contas |
| Bancos | `bancos` | Contas tipo !== 'caixa' |
| Caixa | `caixa` | Contas tipo === 'caixa' |

## Tipos de Conta (enum)

```typescript
type TipoConta = 'caixa' | 'conta_corrente' | 'poupanca' | 'aplicacao' | 'cartao';
```

## Componente: ContaFinanceiraWizard (Modal)

### Campos do Wizard

| Label | name/id | Tipo | Obrigatório | Validação |
|-------|---------|------|-------------|-----------|
| Tipo | `tipo` | select | Sim | enum TipoConta |
| Nome | `nome` | text | Sim | - |
| Banco | `bancoCodigo` | select | Condicional | Se tipo !== 'caixa' |
| Nome do Banco | `bancoNome` | text | Condicional | Auto-preenchido |

## LocalStorage (Rascunho)

| Chave | Descrição |
|-------|-----------|
| `conta_financeira_draft` | Rascunho de cadastro incompleto |

## Queries tRPC

| Query/Mutation | Descrição |
|----------------|-----------|
| `contasFinanceiras.list` | Lista todas as contas |
| `contasFinanceiras.update` | Atualiza conta (inclui inativar) |

## Eventos

| Evento | Descrição |
|--------|-----------|
| Nova Conta | Abre ContaFinanceiraWizard |
| Editar | Abre wizard em modo edição |
| Inativar | Abre modal de confirmação |
| Retomar Rascunho | Restaura draft do localStorage |

## Observações

- Layout Master-Detail
- Banner de rascunho quando há draft no localStorage
- Saldo calculado automaticamente baseado em movimentações

