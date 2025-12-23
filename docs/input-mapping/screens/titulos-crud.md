# Pagar e Receber (TitulosCrud)

| Campo | Rota | Arquivo |
|-------|------|---------|
| Pagar e Receber | `/pagar-receber` | `client/src/pages/TitulosCrud.tsx` |

## Inputs da Tela Principal

| Label | name/id | Tipo | Obrigatório | Validação | Source | Destination | Notas |
|-------|---------|------|-------------|-----------|--------|-------------|-------|
| Buscar | - | text | Não | - | Usuário | Filtro local | Busca por pessoa ou descrição |
| Período Início | `periodoInicio` | date | Não | - | Usuário | Query filter | Filtro de período |
| Período Fim | `periodoFim` | date | Não | - | Usuário | Query filter | Filtro de período |

## Filtros (Tabs)

| Filtro | Valor | Descrição |
|--------|-------|-----------|
| A Receber | `receita` | Títulos a receber |
| A Pagar | `despesa` | Títulos a pagar |

## Quick Stats

| Stat | Descrição |
|------|-----------|
| Total em Aberto | Soma valores em aberto |
| Vencidos | Quantidade vencida |
| A Vencer 7 dias | Próximos vencimentos |
| Baixados no Mês | Total baixado no mês atual |

## Ações em Lote

| Ação | Descrição |
|------|-----------|
| Selecionar Todos | Checkbox mestre |
| Baixar em Lote | Baixar múltiplos títulos |
| Exportar | Exportar seleção (CSV/PDF) |

## Modal de Baixa

| Label | name/id | Tipo | Obrigatório | Validação |
|-------|---------|------|-------------|-----------|
| Data da Baixa | `dataBaixa` | date | Sim | <= hoje |
| Valor Pago | `valorPago` | number | Sim | > 0 |
| Conta | `contaId` | select | Sim | Contas ativas |
| Observação | `observacao` | textarea | Não | - |

## Diferenças para `/titulos`

| Aspecto | `/titulos` | `/pagar-receber` |
|---------|------------|------------------|
| Foco | Cadastro geral | Operação de baixa |
| Ações | CRUD completo | Baixa e consulta |
| Workflow | Cadastro → Baixa | Baixa rápida |

## Queries tRPC

Mesmas queries de `titulos.*`

## Observações

- Tela focada em operações de baixa
- Suporta seleção múltipla para baixa em lote
- Filtros rápidos por status de vencimento


