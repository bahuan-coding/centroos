# Plano de Contas (Accounts)

| Campo | Rota | Arquivo |
|-------|------|---------|
| Plano de Contas | `/accounts` | `client/src/pages/Accounts.tsx` |

## Inputs da Tela Principal

| Label | name/id | Tipo | Obrigatório | Validação | Source | Destination | Notas |
|-------|---------|------|-------------|-----------|--------|-------------|-------|
| Buscar | - | text | Não | - | Usuário | Filtro local | Busca por código ou nome |

## Filtros (Tabs por Natureza)

| Filtro | Valor | Descrição |
|--------|-------|-----------|
| Todas | `all` | Todas as contas |
| Ativo | `1` | Contas do ativo |
| Passivo | `2` | Contas do passivo |
| Receita | `3` | Contas de receita |
| Despesa | `4` | Contas de despesa |

## Estrutura Hierárquica

| Nível | Exemplo | Descrição |
|-------|---------|-----------|
| 1 | 1 | Grupo principal (Ativo) |
| 2 | 1.1 | Subgrupo (Ativo Circulante) |
| 3 | 1.1.1 | Conta analítica |
| 4+ | 1.1.1.01 | Subconta |

## Modal: Nova Conta / Editar Conta

| Label | name/id | Tipo | Obrigatório | Validação |
|-------|---------|------|-------------|-----------|
| Código | `codigo` | text | Sim | Formato X.X.X... |
| Nome | `nome` | text | Sim | min 3 chars |
| Tipo | `tipo` | select | Sim | `analitica`, `sintetica` |
| Natureza | `natureza` | select | Sim | `1-4` (ativo, passivo, receita, despesa) |
| Conta Pai | `contaPaiId` | select | Condicional | Se nível > 1 |
| Ativo | `ativo` | switch | Não | default: true |
| Descrição | `descricao` | textarea | Não | - |

## Tipos de Conta

| Tipo | Descrição | Pode ter lançamentos? |
|------|-----------|----------------------|
| Sintética | Agrupadora | Não |
| Analítica | Detalhada | Sim |

## Queries tRPC

| Query/Mutation | Descrição |
|----------------|-----------|
| `accounts.list` | Lista hierárquica do plano |
| `accounts.create` | Cria conta |
| `accounts.update` | Atualiza conta |
| `accounts.delete` | Remove conta (se sem filhos/lançamentos) |

## Observações

- Plano de contas pré-configurado para entidades do terceiro setor
- Baseado em modelo da CFC para ESFL
- Hierarquia em árvore expansível
- Proteção: contas com lançamentos não podem ser excluídas








