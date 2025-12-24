# Módulo E - Projetos, Centros e Fundos

| Campo | Rota | Arquivo |
|-------|------|---------|
| Módulo E | `/modulo-e` | `client/src/pages/ModuloE.tsx` |

## Visão Geral

Controle de recursos por área (Centro de Custo), projeto e fundo restrito/irrestrito.

## Modos de Visualização

| Modo | Descrição |
|------|-----------|
| Cadastros | Lista master-detail |
| Movimentações | Alocação e consumo |
| Relatórios | Análises e demonstrativos |

## Inputs da Tela Principal (Cadastros)

| Label | name/id | Tipo | Obrigatório | Validação | Source | Destination | Notas |
|-------|---------|------|-------------|-----------|--------|-------------|-------|
| Buscar | - | text | Não | - | Usuário | Filtro local | Código ou nome |

## Filtros (Quick Stats clicáveis)

| Filtro | Descrição |
|--------|-----------|
| Centro | Apenas centros de custo |
| Projeto | Apenas projetos |
| Fundo | Apenas fundos |

## Componente: CentroWizard

| Label | name/id | Tipo | Obrigatório | Validação |
|-------|---------|------|-------------|-----------|
| Código | `codigo` | text | Sim | Único |
| Nome | `nome` | text | Sim | min 3 chars |
| Descrição | `descricao` | textarea | Não | - |
| Ativo | `ativo` | switch | Não | default: true |

## Componente: ProjetoWizard

| Label | name/id | Tipo | Obrigatório | Validação |
|-------|---------|------|-------------|-----------|
| Código | `codigo` | text | Sim | Único |
| Nome | `nome` | text | Sim | min 3 chars |
| Centro de Custo | `centroCustoId` | select | Não | Centros ativos |
| Data Início | `dataInicio` | date | Não | - |
| Data Fim | `dataFim` | date | Não | >= início |
| Orçamento Previsto | `orcamentoPrevisto` | number | Não | >= 0 |
| Parceria MROSC | `parceriaMrosc` | switch | Não | - |
| Status | `status` | select | Sim | enum |

## Status de Projeto

| Status | Descrição |
|--------|-----------|
| `planejamento` | Em planejamento |
| `em_andamento` | Em execução |
| `concluido` | Finalizado |
| `cancelado` | Cancelado |

## Componente: FundoWizard

| Label | name/id | Tipo | Obrigatório | Validação |
|-------|---------|------|-------------|-----------|
| Código | `codigo` | text | Sim | Único |
| Nome | `nome` | text | Sim | min 3 chars |
| Tipo | `tipo` | select | Sim | restrito, irrestrito |
| Descrição | `descricao` | textarea | Não | - |
| Conta Contábil | `contaContabilId` | select | Não | Plano de contas |
| Ativo | `ativo` | switch | Não | default: true |

## Tipo de Fundo

| Tipo | Descrição |
|------|-----------|
| `restrito` | Uso específico (doações vinculadas) |
| `irrestrito` | Uso geral |

## Tab: Movimentações

### Alocar

| Label | name/id | Tipo | Obrigatório |
|-------|---------|------|-------------|
| Fundo Origem | `fundoId` | select | Sim |
| Projeto Destino | `projetoId` | select | Sim |
| Valor | `valor` | number | Sim |
| Descrição | `descricao` | text | Sim |

### Consumir

| Label | name/id | Tipo | Obrigatório |
|-------|---------|------|-------------|
| Fundo | `fundoId` | select | Sim |
| Título | `tituloId` | select | Sim |
| Valor | `valor` | number | Sim |
| Justificativa | `justificativa` | textarea | Sim |

### Aprovações

Lista de consumos pendentes de aprovação.

## Queries tRPC

| Query/Mutation | Descrição |
|----------------|-----------|
| `centroCusto.list` | Lista centros |
| `projeto.list` | Lista projetos |
| `fundo.list` | Lista fundos |
| `fundoConsumo.pendentes` | Consumos pendentes |

## Observações

- Layout Master-Detail
- Badge de aprovações pendentes
- Atalho `/` para busca, `Esc` para fechar
- Health stats: % ativos, com saldo, em andamento








