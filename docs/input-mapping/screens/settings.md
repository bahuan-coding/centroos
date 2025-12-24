# Configurações (Settings)

| Campo | Rota | Arquivo |
|-------|------|---------|
| Configurações | `/settings` | `client/src/pages/Settings.tsx` |

## Categorias

| Categoria | Ícone | Descrição |
|-----------|-------|-----------|
| Entidade | Building2 | Dados da organização |
| Financeiro | DollarSign | Parâmetros financeiros |
| Contabilidade | Calculator | Regime e exercício |
| Notificações | Bell | Alertas e emails |
| Importação | FileUp | Regras de classificação |

## Categoria: Entidade

| Label | name/id | Tipo | Obrigatório | Validação |
|-------|---------|------|-------------|-----------|
| Nome da Entidade | `name` | text | Sim | - |
| CNPJ | `cnpj` | text | Não | Formato CNPJ |
| Telefone | `phone` | text | Não | - |
| E-mail | `email` | email | Não | Formato email |
| Logradouro | `address` | textarea | Não | - |
| Cidade | `city` | text | Não | - |
| UF | `state` | text | Não | max 2 chars |
| CEP | `zipCode` | text | Não | Formato CEP |

## Categoria: Financeiro

| Label | name/id | Tipo | Default | Validação |
|-------|---------|------|---------|-----------|
| Dia de Vencimento Padrão | `financeiro.dia_vencimento_padrao` | number | 10 | 1-28 |
| Dias de Tolerância | `financeiro.tolerancia_vencimento` | number | 5 | 0-30 |
| Valor Mínimo Contribuição | `financeiro.valor_minimo_contribuicao` | number | 10 | >= 0 |
| Formas de Pagamento | - | switch-group | - | Lista fixa |

## Categoria: Contabilidade

| Label | name/id | Tipo | Default | Opções |
|-------|---------|------|---------|--------|
| Mês Início Exercício | `contabilidade.inicio_exercicio` | select | 1 | 1-12 |
| Regime Contábil | `contabilidade.regime` | select | competencia | competencia, caixa |
| Fechamento Automático | - | switch | true | - |
| Exigir Documento | - | switch | false | - |

## Categoria: Notificações

| Label | name/id | Tipo | Default |
|-------|---------|------|---------|
| E-mail do Financeiro | `notificacoes.email_financeiro` | email | - |
| Antecedência de Alerta | `notificacoes.vencimentos_antecedencia` | number | 7 |
| Tipos de Notificação | - | switch-group | - |

## Categoria: Importação (Regras)

| Label | name/id | Tipo | Obrigatório |
|-------|---------|------|-------------|
| Padrão de Busca | `pattern` | text | Sim |
| Conta Contábil | `accountId` | select | Sim |

## Queries tRPC

| Query/Mutation | Descrição |
|----------------|-----------|
| `organization.get` | Dados da entidade |
| `organization.update` | Atualiza entidade |
| `configSistema.list` | Lista configurações |
| `configSistema.update` | Atualiza configuração |
| `rules.list` | Lista regras |
| `rules.create` | Cria regra |
| `rules.delete` | Remove regra |

## Observações

- Layout Master-Detail (sidebar + conteúdo)
- Salvamento individual por campo
- Indicador de alterações não salvas
- Mobile overlay para conteúdo





