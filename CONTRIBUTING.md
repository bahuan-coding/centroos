# Guia de Contribuição

Obrigado por contribuir com o CentrOS! Este documento descreve as convenções e processos para contribuição.

## Pré-requisitos

- Node.js 20+
- PostgreSQL (local ou conta Neon)
- Git

## Setup do Ambiente

```bash
git clone https://github.com/seu-usuario/centroos.git
cd centroos
npm install
cp .env.example .env  # Configure DATABASE_URL
npm run db:push
npm run dev
```

## Fluxo de Trabalho

### 1. Crie uma Branch

```bash
git checkout -b tipo/descricao-curta
```

Prefixos de branch:
- `feat/` - Nova funcionalidade
- `fix/` - Correção de bug
- `docs/` - Documentação
- `refactor/` - Refatoração sem mudança de comportamento
- `chore/` - Manutenção (deps, configs)
- `test/` - Testes

Exemplos:
```bash
git checkout -b feat/wizard-doacoes
git checkout -b fix/conciliacao-duplicados
git checkout -b docs/api-fiscal
```

### 2. Faça as Alterações

Siga as convenções de código descritas abaixo.

### 3. Rode os Testes

```bash
npm test           # Testes unitários
npm run test:e2e   # Testes E2E (opcional, mas recomendado)
```

### 4. Commit

Use mensagens de commit semânticas:

```
tipo: descrição curta (imperativo)

Corpo opcional explicando o "porquê" (não o "o quê").

Refs: #123
```

Tipos válidos:
| Tipo | Descrição |
|------|-----------|
| `feat` | Nova funcionalidade |
| `fix` | Correção de bug |
| `docs` | Documentação |
| `refactor` | Refatoração sem mudança de comportamento |
| `chore` | Manutenção (deps, configs, scripts) |
| `test` | Adição ou correção de testes |
| `style` | Formatação (não afeta lógica) |
| `perf` | Melhoria de performance |

Exemplos:
```bash
git commit -m "feat: adiciona wizard de doações com autosave"
git commit -m "fix: corrige duplicação na conciliação automática"
git commit -m "docs: documenta endpoints do motor fiscal"
```

### 5. Push e Pull Request

```bash
git push -u origin feat/minha-feature
```

Abra um PR no GitHub com:
- Título descritivo
- Descrição do problema/solução
- Checklist de validação

## Estrutura de Pull Request

```markdown
## Descrição

Breve descrição do que foi feito e por quê.

## Mudanças

- Adicionado X
- Corrigido Y
- Removido Z

## Como Testar

1. Passo 1
2. Passo 2
3. Resultado esperado

## Checklist

- [ ] Testes passando (`npm test`)
- [ ] Sem erros de lint
- [ ] Documentação atualizada (se aplicável)
- [ ] PR revisado por mim mesmo
```

## Onde Colocar Código Novo

### Frontend (client/)

| Tipo de Código | Local |
|----------------|-------|
| Nova página | `client/src/pages/NovaPagina.tsx` + rota em `App.tsx` |
| Componente de domínio | `client/src/components/{domain}/` |
| Componente genérico | `client/src/components/ui/` |
| Wizard completo | `client/src/components/{domain}/wizard/` |
| Hook customizado | `client/src/lib/hooks/` ou `client/src/lib/hooks.ts` |
| Utilitário | `client/src/lib/utils.ts` |
| Validador Zod | `client/src/lib/validators.ts` |

### Backend (server/)

| Tipo de Código | Local |
|----------------|-------|
| Nova rota tRPC | `server/routers.ts` (adicionar ao router existente) |
| Novo sub-router | `server/routers.ts` (criar novo router e adicionar ao appRouter) |
| Lógica de negócio | `server/services/` |
| Integração externa | `server/integrations/{nome}/` |
| Motor fiscal | `server/fiscal/` |
| Parser de arquivo | `server/parsers/` |

### Database (drizzle/)

| Tipo de Código | Local |
|----------------|-------|
| Nova tabela | `drizzle/schema.ts` (NUNCA no schema-legacy.ts) |
| Novo enum | `drizzle/schema.ts` |
| Migração | Usar `npm run db:push` após alterar schema |

### Scripts (scripts/)

| Tipo de Código | Local |
|----------------|-------|
| Auditoria de dados | `scripts/audit/` |
| Seed/migração | `scripts/seed/` |
| Pipeline de dados | `scripts/pipeline/` |
| Teste de integração | `scripts/tests/` |

## Convenções de Código

### TypeScript

- Strict mode habilitado
- Preferir `interface` sobre `type` para objetos
- Usar `const` por padrão, `let` quando necessário
- Evitar `any` - usar `unknown` se necessário

### React

- Componentes funcionais apenas
- Hooks no topo do componente
- Preferir composição sobre herança
- Um componente por arquivo

### Imports

Sempre usar path aliases:
```typescript
// Correto
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Incorreto
import { Button } from '../../components/ui/button';
```

### Nomenclatura

| Elemento | Convenção | Exemplo |
|----------|-----------|---------|
| Componentes | PascalCase | `TituloWizard.tsx` |
| Hooks | camelCase com `use` | `useTituloWizard` |
| Utilitários | camelCase | `formatCurrency` |
| Constantes | SCREAMING_SNAKE_CASE | `MAX_DRAFTS` |
| Arquivos TS | kebab-case ou PascalCase | `xml-builder.ts` ou `TituloWizard.tsx` |
| Pastas | kebab-case | `wizard-fundo/` |

### CSS/Tailwind

- Usar classes Tailwind diretamente
- Componentes de UI usam `class-variance-authority` (cva)
- Usar `cn()` para merge de classes condicionais

```typescript
import { cn } from '@/lib/utils';

<div className={cn(
  "base-classes",
  condition && "conditional-classes"
)} />
```

## Testes

### Unitários (Vitest)

Localização: `server/**/__tests__/`

```typescript
import { describe, it, expect } from 'vitest';

describe('minhaFuncao', () => {
  it('deve fazer algo específico', () => {
    expect(minhaFuncao(input)).toBe(expected);
  });
});
```

### E2E (Playwright)

Localização: `e2e/`

```typescript
import { test, expect } from '@playwright/test';

test('deve navegar para dashboard', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL('/');
});
```

## Decisões Técnicas (ADRs)

Algumas decisões de arquitetura estão documentadas em [TODO.md](./TODO.md#decisões-técnicas).

Antes de fazer mudanças arquiteturais significativas:
1. Discuta na issue ou PR
2. Documente a decisão em TODO.md se for aceita

## Dúvidas?

Abra uma issue com a tag `question` ou pergunte diretamente no PR.
