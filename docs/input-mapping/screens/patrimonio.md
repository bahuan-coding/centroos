# Patrimônio

| Campo | Rota | Arquivo |
|-------|------|---------|
| Patrimônio | `/patrimonio` | `client/src/pages/Patrimonio.tsx` |

## Inputs da Tela Principal

| Label | name/id | Tipo | Obrigatório | Validação | Source | Destination | Notas |
|-------|---------|------|-------------|-----------|--------|-------------|-------|
| Buscar | - | text | Não | - | Usuário | Filtro local | Busca por código ou descrição |

## Filtros (Quick Stats clicáveis)

| Filtro | Valor | Descrição |
|--------|-------|-----------|
| Total | `all` | Todos os bens |
| Em Uso | `ativos` | status === 'em_uso' |
| Baixados | `inativos` | status in ['baixado', 'alienado', 'perdido'] |

## Categorias de Bem

| Categoria | Vida Útil Padrão | Ícone |
|-----------|------------------|-------|
| `imovel` | 300 meses | Building2 |
| `veiculo` | 60 meses | Car |
| `equipamento` | 120 meses | Monitor |
| `mobiliario` | 120 meses | Armchair |
| `informatica` | 60 meses | Cpu |
| `outro` | 60 meses | Package |

## Componente: PatrimonioWizard (Modal Cadastro)

| Label | name/id | Tipo | Obrigatório | Validação |
|-------|---------|------|-------------|-----------|
| Código | `codigo` | text | Sim | Único |
| Descrição | `descricao` | text | Sim | min 5 chars |
| Categoria | `categoria` | select | Sim | enum |
| Data Aquisição | `dataAquisicao` | date | Sim | <= hoje |
| Valor Aquisição | `valorAquisicao` | number | Sim | > 0 |
| Valor Residual | `valorResidual` | number | Não | >= 0 |
| Vida Útil (meses) | `vidaUtilMeses` | number | Sim | > 0 |
| Método Depreciação | `metodoDepreciacao` | select | Sim | linear, nenhum |
| Conta Ativo | `contaAtivoId` | select | Não | Plano de contas |
| Localização | `localizacao` | text | Não | - |
| Responsável | `responsavelId` | select | Não | Pessoas |

## Dialog: Transferência

| Label | name/id | Tipo | Obrigatório |
|-------|---------|------|-------------|
| Nova Localização | `novaLocalizacao` | text | Não |
| Novo Responsável | `novoResponsavelId` | select | Não |
| Motivo | `motivo` | textarea | Sim (min 10 chars) |

## Dialog: Baixa (Wizard 3 passos)

### Passo 1: Motivo

| Opção | Descrição |
|-------|-----------|
| `baixado` | Baixa por obsolescência |
| `alienado` | Venda/Alienação |
| `perdido` | Perda/Sinistro |

### Passo 2: Dados

| Label | name/id | Tipo | Obrigatório |
|-------|---------|------|-------------|
| Data da Baixa | `dataBaixa` | date | Sim |
| Descrição do Motivo | `motivoBaixa` | textarea | Sim (min 10 chars) |
| Valor de Venda | `valorBaixa` | number | Se alienado |

### Passo 3: Confirmação

| Campo | Descrição |
|-------|-----------|
| Checkbox | Confirmo que os dados estão corretos |

## Dialog: Depreciação Mensal

| Label | name/id | Tipo | Obrigatório |
|-------|---------|------|-------------|
| Período | - | month | Sim |
| Apenas Simular | `simular` | checkbox | Não |

## Status de Bem

| Status | Cor | Permite Edição? |
|--------|-----|-----------------|
| `em_uso` | Verde | Sim |
| `em_manutencao` | Amarelo | Sim |
| `baixado` | Cinza | Não |
| `alienado` | Azul | Não |
| `perdido` | Vermelho | Não |

## Queries tRPC (Mock)

*Nota: Página usa dados mock atualmente.*

## Observações

- Layout Master-Detail
- Cálculo de depreciação linear
- Linha do tempo de eventos
- ITG 2002 para entidades sem fins lucrativos
- Atalho `/` para busca





