# CentrOS - Documentação

Sistema de gestão financeira multi-tenant para Centros Espíritas e Empresas de Tecnologia.

## Estrutura do Projeto

```
docs/
├── data-model/           → Modelo de dados modular (7 módulos)
├── input-mapping/        → Mapeamento de inputs por tela
├── architecture/         → Arquitetura técnica e multi-tenancy
├── business/             → Regras de negócio e compliance
├── ux/                   → Design system e especificações UX
├── flows/                → Fluxos de importação e relatórios
└── integracoes_fiscais/  → Integrações com RFB, SEFAZ, NFS-e
```

## Arquitetura Modular do Schema

O banco de dados está organizado em **7 módulos** funcionais:

| Módulo | Nome | Tabelas Principais |
|--------|------|-------------------|
| **A** | Identidades | `pessoa`, `associado`, `pessoaPapel`, `consentimentoLgpd`, `grupoEstudo` |
| **B** | Dinheiro/Caixa | `contaFinanceira`, `extratoBancario`, `extratoLinha`, `conciliacao` |
| **C** | Contas a Pagar/Receber | `titulo`, `tituloBaixa`, `anexo` |
| **D** | Contabilidade | `planoContas`, `periodoContabil`, `lancamentoContabil`, `lancamentoLinha` |
| **E** | Projetos e Fundos | `centroCusto`, `projeto`, `fundo`, `fundoRegra`, `fundoAlocacao` |
| **F** | Patrimônio | `bemPatrimonial`, `bemDepreciacao`, `bemTransferencia` |
| **G** | Governança | `usuario`, `papel`, `permissao`, `aprovacao`, `eventoAuditoria` |

**Schema completo:** [drizzle/schema.ts](../drizzle/schema.ts)

## Multi-Tenancy

O sistema suporta múltiplas organizações (tenants) com isolamento de dados:

| Componente | Arquivo | Descrição |
|------------|---------|-----------|
| Organizações | [client/src/lib/organizations.ts](../client/src/lib/organizations.ts) | Definição de orgs disponíveis |
| Org Switcher | [client/src/components/OrgSwitcher.tsx](../client/src/components/OrgSwitcher.tsx) | Componente de troca de empresa |
| Guard | [client/src/App.tsx](../client/src/App.tsx) | Proteção de rotas por org |
| Header | `X-Organization-Id` | Propagação em requests tRPC |

## Rotas do Sistema

| Rota | Página | Módulo |
|------|--------|--------|
| `/` | Dashboard | Geral |
| `/pessoas` | Cadastro de Pessoas | A - Identidades |
| `/contas` | Contas Financeiras | B - Dinheiro |
| `/pagar-receber` | Títulos CRUD | C - Contas |
| `/titulos` | Lista de Títulos | C - Contas |
| `/contabilidade` | Lançamentos Contábeis | D - Contabilidade |
| `/accounts` | Plano de Contas | D - Contabilidade |
| `/patrimonio` | Bens Patrimoniais | F - Patrimônio |
| `/projetos-fundos` | Projetos e Fundos | E - Projetos |
| `/periods` | Períodos Contábeis | D - Contabilidade |
| `/conciliacao` | Conciliação Bancária | B - Dinheiro |
| `/import` | Importar Extrato | B - Dinheiro |
| `/reports` | Relatórios | Geral |
| `/governanca` | Governança e Auditoria | G - Governança |
| `/settings` | Configurações | Geral |

---

## Data Model

Arquitetura de banco de dados e plano de migrações.

| Arquivo | Descrição |
|---------|-----------|
| [00-current-schema-diagnosis.md](data-model/00-current-schema-diagnosis.md) | Diagnóstico do schema |
| [01-target-architecture.md](data-model/01-target-architecture.md) | Arquitetura modular alvo |
| [02-erd-text.md](data-model/02-erd-text.md) | ERD textual com cardinalidades |
| [03-data-dictionary.md](data-model/03-data-dictionary.md) | Dicionário: tela → input → coluna |
| [04-migrations-plan.md](data-model/04-migrations-plan.md) | Plano de migrações por módulo |
| [05-open-questions.md](data-model/05-open-questions.md) | Questões pendentes |

## Input Mapping

Mapeamento de campos por tela do sistema.

| Arquivo | Descrição |
|---------|-----------|
| [INDEX.md](input-mapping/INDEX.md) | Índice geral |
| [inputs-summary.csv](input-mapping/inputs-summary.csv) | Consolidado em CSV |
| [screens/](input-mapping/screens/) | Arquivos por tela |

## Architecture

| Arquivo | Descrição |
|---------|-----------|
| [system.md](architecture/system.md) | Stack técnica (Vite, React, tRPC, Drizzle, Neon) |
| [org-selection.md](architecture/org-selection.md) | Sistema de seleção de organização |

**Menu:** Implementado em [`client/src/lib/menu.ts`](../client/src/lib/menu.ts)

## Business

| Arquivo | Descrição |
|---------|-----------|
| [rules.md](business/rules.md) | Regras de negócio e fluxos de trabalho |
| [compliance.md](business/compliance.md) | ITG 2002, NFC, obrigações fiscais para entidades sem fins lucrativos |

## UX

| Arquivo | Descrição |
|---------|-----------|
| [design-guide.md](ux/design-guide.md) | Design system completo |
| [modulo-b-caixa.md](ux/modulo-b-caixa.md) | Especificação UX Módulo B (Caixa/Bancos) |

## Flows

| Arquivo | Descrição |
|---------|-----------|
| [import.md](flows/import.md) | Importação e classificação de extratos bancários |
| [reports.md](flows/reports.md) | Geração de relatórios e compliance |

## Integrações Fiscais

Documentação completa para integrações com órgãos fiscais brasileiros.

### Documentos Base

| Arquivo | Descrição |
|---------|-----------|
| [README.md](integracoes_fiscais/README.md) | Visão geral das integrações |
| [01-panorama-rfb-e-autenticacao-icp.md](integracoes_fiscais/01-panorama-rfb-e-autenticacao-icp.md) | ICP-Brasil, certificados, e-CNPJ |
| [02-catalogo-apis-e-servicos.md](integracoes_fiscais/02-catalogo-apis-e-servicos.md) | Matriz de APIs (NF-e, NFS-e, Serpro) |
| [03-emissao-notas-rfb-vs-sefaz-vs-municipio.md](integracoes_fiscais/03-emissao-notas-rfb-vs-sefaz-vs-municipio.md) | Responsabilidades por órgão |
| [04-plano-implementacao-por-ondas.md](integracoes_fiscais/04-plano-implementacao-por-ondas.md) | Roadmap P0/P1/P2 |
| [05-riscos-conformidade-lgpd-sigilo.md](integracoes_fiscais/05-riscos-conformidade-lgpd-sigilo.md) | LGPD, sigilo fiscal |
| [06-checklist-homologacao-e-testes.md](integracoes_fiscais/06-checklist-homologacao-e-testes.md) | Testes em homologação |

### Templates e Especificações

| Arquivo | Descrição |
|---------|-----------|
| [TEMPLATE-INTEGRACAO.md](integracoes_fiscais/TEMPLATE-INTEGRACAO.md) | **Template universal** para novas integrações |
| [SPEC-NFSE-NACIONAL.md](integracoes_fiscais/SPEC-NFSE-NACIONAL.md) | **NFS-e Nacional** - Especificação completa (P0) |

---

## Stack Técnica

| Camada | Tecnologia |
|--------|------------|
| Frontend | Vite + React 18 + TypeScript |
| Roteamento | Wouter |
| Estado/Cache | TanStack React Query |
| API | tRPC |
| UI Components | Radix UI + Tailwind CSS |
| Backend | Node.js + tRPC |
| Banco de Dados | PostgreSQL (Neon) |
| ORM | Drizzle ORM |
| Testes E2E | Playwright |

---

**Última atualização:** Dezembro 2024
