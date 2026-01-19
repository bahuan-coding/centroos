# Scripts

Este diretório contém scripts utilitários para manutenção, migração e testes do sistema.

## Estrutura

```
scripts/
├── audit/          # Scripts de auditoria de dados
├── seed/           # Scripts de seed e migração de dados
├── pipeline/       # Pipeline de processamento de dados
├── parsers/        # Parsers para diferentes formatos de arquivo
├── matching/       # Algoritmos de matching e reconciliação
├── canonical/      # Funções de normalização canônica
├── fiscal/         # Scripts relacionados ao módulo fiscal
├── tests/          # Scripts de teste de integrações
└── run-pipeline.ts # Executor principal do pipeline
```

## Pastas

### audit/
Scripts para auditoria e validação de dados do sistema.

- `audit.ts` - Auditoria principal
- `engine.ts` - Motor de regras de auditoria
- `validators/` - Validadores específicos por domínio

### seed/
Scripts para popular e migrar dados.

- `index.ts` - Orquestrador de seed
- `seed-accounts.ts` - Seed de plano de contas
- `seed-complete.ts` - Seed completo do sistema

### pipeline/
Pipeline de processamento de dados brutos.

- `orchestrator.ts` - Orquestrador do pipeline
- `parsers/` - Parsers para diferentes fontes
- `normalizers/` - Normalizadores de dados

## Executando Scripts

```bash
# Via tsx
npx tsx scripts/seed/index.ts

# Via package.json (se configurado)
npm run seed
npm run audit
```

## Convenções

1. Novos scripts de auditoria devem ir em `audit/`
2. Novos scripts de seed/migração devem ir em `seed/`
3. Scripts de teste de integrações devem ir em `tests/`
