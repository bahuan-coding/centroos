# Contabilidade

| Campo | Rota | Arquivo |
|-------|------|---------|
| Contabilidade | `/contabilidade` | `client/src/pages/Contabilidade.tsx` |

## Visão Geral

Tela principal do módulo contábil. Exibe demonstrativos e permite navegação para sub-módulos.

## Inputs da Tela Principal

| Label | name/id | Tipo | Obrigatório | Validação | Source | Destination | Notas |
|-------|---------|------|-------------|-----------|--------|-------------|-------|
| Ano | `ano` | select | Sim | - | Anos disponíveis | Query filter | Default: ano atual |
| Mês | `mes` | select | Não | - | 1-12 | Query filter | Para relatórios mensais |

## Tabs/Seções

| Tab | Conteúdo |
|-----|----------|
| Resumo | KPIs e gráficos contábeis |
| Balancete | Demonstração de saldos |
| DRE | Demonstração de Resultado |
| Balanço | Balanço Patrimonial |

## KPIs Exibidos

| Indicador | Descrição |
|-----------|-----------|
| Total Receitas | Soma contas de receita |
| Total Despesas | Soma contas de despesa |
| Resultado | Receitas - Despesas |
| Ativo | Total do ativo |
| Passivo | Total do passivo |

## Modal: Novo Lançamento Manual

| Label | name/id | Tipo | Obrigatório | Validação |
|-------|---------|------|-------------|-----------|
| Data | `data` | date | Sim | - |
| Conta Débito | `contaDebitoId` | select | Sim | Plano de contas |
| Conta Crédito | `contaCreditoId` | select | Sim | Plano de contas |
| Valor | `valor` | number | Sim | > 0 |
| Histórico | `historico` | text | Sim | min 5 chars |
| Documento | `documento` | text | Não | - |
| Competência | `competencia` | date | Não | - |

## Queries tRPC

| Query | Descrição |
|-------|-----------|
| `contabilidade.balancete` | Balancete de verificação |
| `contabilidade.dre` | Demonstração de resultado |
| `contabilidade.balanco` | Balanço patrimonial |
| `lancamentos.create` | Cria lançamento contábil |

## Navegação Interna

| Link | Destino |
|------|---------|
| Plano de Contas | `/accounts` |
| Lançamentos | `/entries` |
| Períodos | `/periods` |

## Observações

- Relatórios seguem padrão NBC T 10.19 (entidades sem fins lucrativos)
- Competência vs Caixa: sistema suporta ambos regimes
- Exportação PDF/Excel disponível





