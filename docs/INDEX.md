# CentrOS - Documentação

## Estrutura

```
docs/
├── data-model/       → Modelo de dados e migrações
├── input-mapping/    → Mapeamento de inputs por tela
├── architecture/     → Arquitetura técnica
├── business/         → Regras de negócio e compliance
├── ux/               → Design e especificações UX
└── flows/            → Fluxos de importação e relatórios
```

## Data Model

Arquitetura de banco de dados e plano de migrações.

| Arquivo | Descrição |
|---------|-----------|
| [00-current-schema-diagnosis.md](data-model/00-current-schema-diagnosis.md) | Diagnóstico do schema atual (Neon) |
| [01-target-architecture.md](data-model/01-target-architecture.md) | Arquitetura alvo modular |
| [02-erd-text.md](data-model/02-erd-text.md) | ERD textual com cardinalidades |
| [03-data-dictionary.md](data-model/03-data-dictionary.md) | Dicionário: tela → input → coluna |
| [04-migrations-plan.md](data-model/04-migrations-plan.md) | Plano de 25 migrações por módulo |
| [05-open-questions.md](data-model/05-open-questions.md) | Questões pendentes |

## Input Mapping

Mapeamento de campos por tela do sistema.

| Arquivo | Tela |
|---------|------|
| [INDEX.md](input-mapping/INDEX.md) | Índice geral |
| [inputs-summary.csv](input-mapping/inputs-summary.csv) | Consolidado em CSV |
| [screens/](input-mapping/screens/) | 18 arquivos por tela |

## Architecture

| Arquivo | Descrição |
|---------|-----------|
| [system.md](architecture/system.md) | Stack técnica, banco, APIs |
| [org-selection.md](architecture/org-selection.md) | Sistema de seleção de organização |

## Business

| Arquivo | Descrição |
|---------|-----------|
| [rules.md](business/rules.md) | Regras de negócio e fluxos |
| [compliance.md](business/compliance.md) | ITG 2002, NFC, obrigações fiscais |

## UX

| Arquivo | Descrição |
|---------|-----------|
| [design-guide.md](ux/design-guide.md) | Design system completo |
| [modulo-b-caixa.md](ux/modulo-b-caixa.md) | Especificação UX Módulo B (Caixa/Bancos) |

## Flows

| Arquivo | Descrição |
|---------|-----------|
| [import.md](flows/import.md) | Importação e classificação de extratos |
| [reports.md](flows/reports.md) | Geração de relatórios e compliance |

