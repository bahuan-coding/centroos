# CentrOS Data Model - Índice

> **Data de Geração**: 2025-12-23  
> **Status**: Planejamento completo, aguardando execução

## Documentos

| # | Documento | Descrição | Status |
|---|-----------|-----------|--------|
| 00 | [current-schema-diagnosis.md](./00-current-schema-diagnosis.md) | Diagnóstico do schema atual do Neon | Completo |
| 01 | [target-architecture.md](./01-target-architecture.md) | Arquitetura de dados alvo (modular) | Completo |
| 02 | [erd-text.md](./02-erd-text.md) | ERD em formato textual | Completo |
| 03 | [data-dictionary.md](./03-data-dictionary.md) | Mapeamento tela → input → coluna | Completo |
| 04 | [migrations-plan.md](./04-migrations-plan.md) | Plano de migrações segregado | Completo |
| 05 | [open-questions.md](./05-open-questions.md) | Perguntas em aberto | Completo |

## Resumo Executivo

### Problemas Identificados no Schema Atual

1. **Ausência de multiempresa** - Nenhuma tabela tem `organization_id`
2. **PKs inconsistentes** - Tabelas legacy usam `integer`, novas usam `UUID`
3. **Duplicidade de entidades** - 6 pares de tabelas duplicadas
4. **FKs ausentes** - ~15 relações sem constraints
5. **Campos específicos no core** - Campos espíritas poluindo `pessoa`

### Modelo Alvo Proposto

```
MÓDULOS:
├── 00-core (organizations, configurations)
├── 01-identity (users, persons, addresses, contacts, documents)
├── 02-finance (accounts, statements, receivables, payments, reconciliations)
├── 03-accounting (chart_of_accounts, periods, journal_entries, balances)
├── 04-assets (fixed_assets, depreciation, transfers)
├── 05-governance (roles, permissions, audit)
├── 06-projects (cost_centers, projects, funds, movements)
└── extensions/
    ├── center/ (members, study_groups, mediumship)
    └── fintech/ (products, customers, subscriptions)
```

### Migrações Planejadas

- **25 migrations** ordenadas por dependência
- **8 módulos** core + 2 extensões
- **2 migrations** de dados legacy

### Questões Pendentes

- **4 críticas** (bloqueantes)
- **4 de design** (alta prioridade)
- **3 de migração** (média prioridade)
- **4 de negócio** (baixa prioridade)
- **3 técnicas** (infraestrutura)

## Próximos Passos

1. Responder questões críticas (Q1-Q4) em `05-open-questions.md`
2. Validar mapeamento com stakeholders
3. Criar ambiente de staging
4. Executar migrations na ordem definida
5. Migrar dados legacy
6. Atualizar backend (routers, services)
7. Atualizar frontend (types, queries)

## Fontes de Referência

- **Schema atual**: Neon project `gentle-salad-37180890`
- **Mapeamento de inputs**: `/docs/input-mapping/`
- **Schema Drizzle**: `/drizzle/schema.ts`

