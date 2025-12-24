# Períodos Contábeis

| Campo | Rota | Arquivo |
|-------|------|---------|
| Períodos | `/periods` | `client/src/pages/Periods.tsx` |

## Inputs da Tela Principal

| Label | name/id | Tipo | Obrigatório | Validação | Source | Destination | Notas |
|-------|---------|------|-------------|-----------|--------|-------------|-------|
| Ano | `filtroAno` | select | Não | - | Anos existentes | Filtro local | Default: ano atual |

## Filtros (Quick Stats clicáveis)

| Filtro | Valor | Descrição |
|--------|-------|-----------|
| Total | `all` | Todos os períodos do ano |
| Abertos | `open` | Períodos abertos |
| Fechados | `closed` | Períodos fechados |

## Componente: PeriodoWizard (Modal)

### Campos do Wizard

| Label | name/id | Tipo | Obrigatório | Validação |
|-------|---------|------|-------------|-----------|
| Ano | `year` | select | Sim | Anos disponíveis |
| Mês | `month` | select | Sim | 1-12 |
| Tipo | `tipo` | radio | Sim | `regular`, `especial` |
| Nome | `nome` | text | Condicional | Se tipo=especial |

## Status de Período

| Status | Descrição | Permite edição? |
|--------|-----------|-----------------|
| `open` | Aberto | Sim |
| `closed` | Fechado | Não (bloqueado) |

## Queries tRPC

| Query/Mutation | Descrição |
|----------------|-----------|
| `periods.listWithStats` | Lista com estatísticas |
| `periods.list` | Lista simples |
| `periods.create` | Cria período |
| `periods.close` | Fecha período |
| `periods.reopen` | Reabre período |

## Componente: PeriodDetail (Painel Direito)

Detalhes do período selecionado:

| Seção | Descrição |
|-------|-----------|
| KPIs | Receitas, Despesas, Resultado |
| Composição | Gráfico de composição |
| Lançamentos | Lista resumida |
| Ações | Fechar/Reabrir período |

## Alertas e Insights

| Tipo | Descrição |
|------|-----------|
| `danger` | Déficit significativo |
| `warning` | Período próximo de vencer |
| `info` | Sugestões de ação |

## Observações

- Layout Master-Detail
- Indicador de déficit/superávit por período
- Resumo do exercício (ano) no topo
- URL query param `?selected=ID` para deep linking
- Mobile: overlay para detalhes





