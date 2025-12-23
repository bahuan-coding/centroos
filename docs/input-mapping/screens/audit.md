# Auditoria (Audit)

| Campo | Rota | Arquivo |
|-------|------|---------|
| Auditoria | `/audit` | `client/src/pages/Audit.tsx` |

## Inputs da Tela Principal

| Label | name/id | Tipo | Obrigatório | Validação | Source | Destination | Notas |
|-------|---------|------|-------------|-----------|--------|-------------|-------|
| Buscar | - | text | Não | - | Usuário | Filtro local | Busca em descrição |
| Período | `periodo` | select | Não | - | Meses disponíveis | Query filter | - |

## Tipos de Auditoria

| Tab | Descrição |
|-----|-----------|
| Títulos | Análise de títulos e inconsistências |
| Pessoas | Verificação de cadastros |
| Contabilidade | Validação de lançamentos |
| Importações | Log de importações |

## Métricas Exibidas

| Métrica | Descrição |
|---------|-----------|
| Total de Registros | Quantidade analisada |
| Alertas | Inconsistências encontradas |
| Corrigidos | Problemas resolvidos |
| Pendentes | Aguardando ação |

## Severidade de Alertas

| Nível | Cor | Descrição |
|-------|-----|-----------|
| `error` | Vermelho | Problema crítico |
| `warning` | Amarelo | Atenção necessária |
| `info` | Azul | Informativo |
| `success` | Verde | OK |

## Ações Disponíveis

| Ação | Descrição |
|------|-----------|
| Corrigir | Aplica correção automática |
| Ignorar | Marca como não-problema |
| Exportar | Baixa relatório de auditoria |
| Detalhar | Abre modal com detalhes |

## Queries tRPC

| Query/Mutation | Descrição |
|----------------|-----------|
| `audit.titulos` | Audita títulos |
| `audit.pessoas` | Audita pessoas |
| `audit.contabilidade` | Audita lançamentos |
| `audit.fix` | Aplica correção |

## Observações

- Tela interna para administradores
- Não aparece no menu principal
- Acesso via `/audit` direto
- Usado para manutenção de dados

