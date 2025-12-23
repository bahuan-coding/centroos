# Dashboard

| Campo | Rota | Arquivo |
|-------|------|---------|
| Dashboard | `/` | `client/src/pages/Dashboard.tsx` |

## Inputs

**Nenhum input de formulário.** Tela é read-only (visualização de KPIs e gráficos).

## Dados Exibidos (via tRPC)

| Query tRPC | Descrição |
|------------|-----------|
| `dashboard.kpisEnhanced` | KPIs principais (saldo, receitas, despesas, resultado) |
| `dashboard.fluxoCaixa` | Gráfico de fluxo de caixa 12 meses |
| `dashboard.composicaoReceitas` | Composição por tipo de pessoa |
| `dashboard.topContribuintes` | Top 5 contribuintes |
| `dashboard.contasComSaldo` | Contas financeiras com saldo |
| `dashboard.newsFeed` | Feed de notícias do movimento espírita |

## Navegação

| Elemento | Destino |
|----------|---------|
| Botão "Fluxo de Caixa" | `/titulos` |
| Link "Ver todos" contribuintes | `/pessoas` |
| Link "Gerenciar" contas | `/contas` |
| Links "Ações Rápidas" | `/pessoas`, `/titulos`, `/contas`, `/reports` |

## Observações

- Período exibido: mês atual (baseado em data de competência)
- Gráficos: Chart.js (Line, Doughnut)

