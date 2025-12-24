# Títulos

| Campo | Rota | Arquivo |
|-------|------|---------|
| Títulos | `/titulos` | `client/src/pages/Titulos.tsx` |

## Inputs da Tela Principal

| Label | name/id | Tipo | Obrigatório | Validação | Source | Destination | Notas |
|-------|---------|------|-------------|-----------|--------|-------------|-------|
| Buscar | - | text | Não | - | Usuário | Filtro local | Busca por pessoa ou descrição |
| Período Início | `periodoInicio` | date | Não | - | Usuário | Query filter | Filtro de período |
| Período Fim | `periodoFim` | date | Não | - | Usuário | Query filter | Filtro de período |

## Filtros (Tabs)

| Filtro | Valor | Descrição |
|--------|-------|-----------|
| Todos | `undefined` | Sem filtro de tipo |
| Receitas | `receita` | `tipo === 'receita'` |
| Despesas | `despesa` | `tipo === 'despesa'` |

## Filtros (Status via Quick Stats)

| Filtro | Descrição |
|--------|-----------|
| Total | Todos os títulos |
| Abertos | `status === 'aberto'` |
| Baixados | `status === 'baixado'` |
| Vencidos | `status === 'aberto' AND vencimento < hoje` |

## Componente: TituloWizard (Modal)

### Passo 1: Tipo

| Label | name/id | Tipo | Obrigatório | Opções |
|-------|---------|------|-------------|--------|
| Tipo | `tipo` | radio | Sim | `receita`, `despesa` |

### Passo 2: Dados Principais

| Label | name/id | Tipo | Obrigatório | Validação |
|-------|---------|------|-------------|-----------|
| Descrição | `descricao` | text | Sim | min 3 chars |
| Valor | `valor` | number | Sim | > 0 |
| Competência | `competencia` | date | Sim | - |
| Vencimento | `vencimento` | date | Não | - |
| Conta | `contaId` | select | Sim | Lista de contas ativas |
| Pessoa | `pessoaId` | combobox | Não | Busca pessoas |

### Passo 3: Categorização

| Label | name/id | Tipo | Obrigatório | Validação |
|-------|---------|------|-------------|-----------|
| Conta Contábil | `contaContabilId` | select | Não | Plano de contas |

## Queries tRPC

| Query/Mutation | Descrição |
|----------------|-----------|
| `titulos.list` | Lista com filtros |
| `titulos.stats` | Estatísticas |
| `titulos.create` | Cria novo título |
| `titulos.update` | Atualiza título |
| `titulos.delete` | Exclui título |
| `titulos.baixar` | Registra baixa/pagamento |

## Eventos

| Evento | Descrição |
|--------|-----------|
| Novo Título | Abre TituloWizard |
| Registrar Baixa | Modal de baixa com data e valor |
| Editar | Edição inline ou modal |
| Excluir | Confirmação e exclusão |

## Observações

- Layout Master-Detail
- Badges de status: aberto (amarelo), baixado (verde), vencido (vermelho)
- Formatação monetária BRL





