# Input Mapping - CentrOS

> **Objetivo**: Inventário completo de inputs por tela para auditoria futura do modelo de dados.
> 
> **Gerado em**: 2025-12-23
> **Versão do Sistema**: 1.0.0

## Resumo

| Tela | Rota | Arquivo | Qtd Inputs | Status |
|------|------|---------|------------|--------|
| Login | `/login` | `Login.tsx` | 2 | ✅ Mapeado |
| Dashboard | `/` | `Dashboard.tsx` | 0 | ✅ Mapeado (read-only) |
| Pessoas | `/pessoas` | `Pessoas.tsx` | 3 | ✅ Mapeado |
| Contas Financeiras | `/contas` | `ContasFinanceiras.tsx` | 2 | ✅ Mapeado |
| Extratos | `/extratos/:id` | `Extratos.tsx` | 0 | ✅ Mapeado (read-only) |
| Títulos | `/titulos` | `Titulos.tsx` | 4 | ✅ Mapeado |
| Pagar e Receber | `/pagar-receber` | `TitulosCrud.tsx` | 4 | ✅ Mapeado |
| Contabilidade | `/contabilidade` | `Contabilidade.tsx` | 15+ | ✅ Mapeado |
| Plano de Contas | `/accounts` | `Accounts.tsx` | 2 | ✅ Mapeado |
| Lançamentos | `/entries` | `Entries.tsx` | 10 | ✅ Mapeado |
| Períodos | `/periods` | `Periods.tsx` | 4 | ✅ Mapeado |
| Conciliação | `/conciliacao` | `Conciliacao.tsx` | 4 | ✅ Mapeado |
| Importar | `/import` | `Import.tsx` | 6 | ✅ Mapeado |
| Relatórios | `/reports` | `Reports.tsx` | 3 | ✅ Mapeado |
| Auditoria | `/audit` | `Audit.tsx` | 0 | ✅ Mapeado (read-only) |
| Governança | `/governanca` | `Governanca.tsx` | 12 | ✅ Mapeado |
| Configurações | `/settings` | `Settings.tsx` | 20+ | ✅ Mapeado |
| Patrimônio | `/patrimonio` | `Patrimonio.tsx` | 20+ | ✅ Mapeado |
| Módulo E | `/modulo-e` | `ModuloE.tsx` | 25+ | ✅ Mapeado |

## Estrutura de Arquivos

```
docs/input-mapping/
├── INDEX.md                 (este arquivo)
├── CLEANUP_REPORT.md        (relatório de limpeza)
├── VERSIONING_NOTES.md      (documentação de versionamento)
├── inputs-summary.csv       (consolidado CSV)
└── screens/
    ├── login.md
    ├── dashboard.md
    ├── pessoas.md
    ├── contas-financeiras.md
    ├── extratos.md
    ├── titulos.md
    ├── titulos-crud.md
    ├── contabilidade.md
    ├── accounts.md
    ├── entries.md
    ├── periods.md
    ├── conciliacao.md
    ├── import.md
    ├── reports.md
    ├── audit.md
    ├── governanca.md
    ├── settings.md
    ├── patrimonio.md
    └── modulo-e.md
```

## Legenda de Status

- ✅ **Mapeado**: Inputs documentados
- ⚠️ **Rota órfã**: Rota existe mas não está no menu

## Observações

1. **Componentes de Modal/Wizard**: Inputs de modais estão documentados junto com a tela principal
2. **Inputs Dinâmicos**: Campos que aparecem condicionalmente estão marcados
3. **Validações**: Extraídas do código fonte quando disponíveis

