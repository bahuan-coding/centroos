# Pessoas

| Campo | Rota | Arquivo |
|-------|------|---------|
| Pessoas | `/pessoas` | `client/src/pages/Pessoas.tsx` |

## Inputs da Tela Principal

| Label | name/id | Tipo | Obrigatório | Validação | Source | Destination | Notas |
|-------|---------|------|-------------|-----------|--------|-------------|-------|
| Buscar | - | text | Não | - | Usuário | Query `search` | Busca por nome ou CPF/CNPJ |

## Filtros (Quick Stats clicáveis)

| Filtro | Valor | Descrição |
|--------|-------|-----------|
| Total | `undefined` | Mostra todos |
| Associados | `true` | Filtra `apenasAssociados=true` |
| Doadores | `false` | Filtra `apenasAssociados=false` |

## Componente: PessoaWizard (Modal)

Wizard de criação de pessoa em múltiplos passos. Inputs detalhados no componente `client/src/components/pessoas/PessoaWizard.tsx`.

### Campos esperados:

| Label | name/id | Tipo | Obrigatório | Validação |
|-------|---------|------|-------------|-----------|
| Nome | `nome` | text | Sim | min 3 chars |
| CPF/CNPJ | `documento` | text | Não | Formato CPF/CNPJ |
| Email | `email` | email | Não | Formato email |
| Telefone | `telefone` | text | Não | - |
| Endereço | `endereco` | textarea | Não | - |
| É Associado? | `isAssociado` | checkbox/switch | Não | - |
| Ativo | `ativo` | checkbox/switch | Não | default: true |

## Queries tRPC

| Query | Descrição |
|-------|-----------|
| `pessoas.list` | Lista paginada com filtros |
| `pessoas.stats` | Totais e estatísticas |
| `pessoas.healthStats` | Saúde dos dados (% preenchimento) |
| `pessoas.inconsistencias` | Alertas de inconsistências |

## Eventos

| Evento | Descrição |
|--------|-----------|
| Nova Pessoa | Abre PessoaWizard |
| Selecionar Pessoa | Abre PessoaDetail no painel direito |

## Observações

- Layout Master-Detail
- Paginação: 20 itens por página
- Indicadores de saúde: % CPF, Email, Telefone, Endereço preenchidos





