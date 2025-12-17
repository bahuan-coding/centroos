# Documentação Completa - Sistema de Gestão Financeira para Centro Espírita

## 📋 Visão Geral

Esta pasta contém a **especificação técnica completa** para desenvolvimento de um sistema de gestão financeira e contábil especializado para Centros Espíritas e entidades sem fins lucrativos no Brasil.

O sistema foi projetado para automatizar processos contábeis, garantir compliance com normas ITG 2002 (R1) e legislação específica (como Nota Fiscal Cidadã), e proporcionar transparência total na gestão de recursos.

---

## 📁 Estrutura da Documentação

```
docs/
├── README.md                                    (Este arquivo)
├── 01-PESQUISA-CONTABIL-FISCAL.md              (Base legal e contábil)
├── technical/
│   └── 02-ARQUITETURA-SISTEMA.md                (Stack técnica e estrutura)
├── ux/
│   └── 03-UX-DESIGN-GUIDE.md                    (Design system e padrões)
├── business/
│   └── 04-REGRAS-NEGOCIO-FLUXOS.md              (Regras de negócio)
├── flows/
│   ├── 05-IMPORTACAO-CLASSIFICACAO.md           (Importação de extratos)
│   └── 06-RELATORIOS-COMPLIANCE.md              (Geração de relatórios)
└── examples/
    ├── plano-contas-exemplo.csv                 (Plano de contas modelo)
    ├── extrato-bb-exemplo.pdf                   (Exemplo de extrato)
    └── relatorio-mensal-exemplo.pdf             (Exemplo de relatório)
```

---

## 📖 Guia de Leitura

### Para Desenvolvedores

**Leitura Recomendada (Ordem):**

1. **README.md** (este arquivo) - Visão geral do projeto
2. **02-ARQUITETURA-SISTEMA.md** - Stack técnica, banco de dados, APIs
3. **04-REGRAS-NEGOCIO-FLUXOS.md** - Regras de negócio e validações
4. **05-IMPORTACAO-CLASSIFICACAO.md** - Lógica de importação e classificação
5. **06-RELATORIOS-COMPLIANCE.md** - Geração de relatórios em PDF
6. **03-UX-DESIGN-GUIDE.md** - Design system e componentes
7. **01-PESQUISA-CONTABIL-FISCAL.md** - Contexto contábil (opcional)

**Tempo Estimado de Leitura:** 2-3 horas

### Para Designers/UX

**Leitura Recomendada:**

1. **03-UX-DESIGN-GUIDE.md** - Design system completo
2. **04-REGRAS-NEGOCIO-FLUXOS.md** - Fluxos de trabalho
3. **README.md** - Visão geral

**Tempo Estimado:** 1-2 horas

### Para Gestores/Product Owners

**Leitura Recomendada:**

1. **README.md** - Visão geral
2. **04-REGRAS-NEGOCIO-FLUXOS.md** - Funcionalidades e regras
3. **01-PESQUISA-CONTABIL-FISCAL.md** - Contexto legal

**Tempo Estimado:** 1 hora

---

## 🎯 Funcionalidades Principais

### 1. Gestão de Plano de Contas

**Descrição:** Sistema hierárquico de contas contábeis conforme estrutura padrão para entidades sem fins lucrativos.

**Principais Recursos:**
- Estrutura em árvore (sintéticas e analíticas)
- 5 grupos principais: Ativo, Passivo, Patrimônio Social, Receitas, Despesas
- Importação/exportação em CSV
- Validações de integridade

**Documentação:** `02-ARQUITETURA-SISTEMA.md` (Seção 3)

---

### 2. Importação Automática de Extratos Bancários

**Descrição:** Parser inteligente que extrai transações de extratos em PDF, CSV e OFX.

**Principais Recursos:**
- Suporte para Banco do Brasil e Caixa Econômica Federal
- Detecção automática de duplicatas
- Classificação automática baseada em regras
- Aprendizado de máquina com histórico

**Documentação:** `05-IMPORTACAO-CLASSIFICACAO.md`

**Formatos Suportados:**
- PDF (Banco do Brasil, Caixa, outros)
- CSV (genérico com auto-detecção)
- OFX (padrão bancário)

---

### 3. Classificação Contábil Automática

**Descrição:** Sistema de regras e machine learning para sugerir classificação de transações.

**Principais Recursos:**
- Regras customizáveis por padrão de texto
- Confiança da sugestão (0-100%)
- Aprendizado com classificações manuais
- Detecção automática de Nota Fiscal Cidadã

**Documentação:** `05-IMPORTACAO-CLASSIFICACAO.md` (Seção 4)

---

### 4. Gestão de Períodos Contábeis

**Descrição:** Controle de períodos mensais com fechamento e reabertura controlada.

**Principais Recursos:**
- Criação automática de períodos mensais
- Fechamento com validações
- Reabertura com justificativa e auditoria
- Bloqueio de edição em períodos fechados

**Documentação:** `04-REGRAS-NEGOCIO-FLUXOS.md` (Seção 3)

---

### 5. Lançamentos Contábeis

**Descrição:** Registro manual ou automático de receitas e despesas.

**Principais Recursos:**
- Partida dobrada (débito/crédito)
- Origem rastreável (manual, importação, etc.)
- Marcação de Nota Fiscal Cidadã
- Histórico de alterações completo

**Documentação:** `04-REGRAS-NEGOCIO-FLUXOS.md` (Seção 4)

---

### 6. Geração Automática de Relatórios

**Descrição:** Relatórios contábeis em PDF conforme normas ITG 2002.

**Principais Recursos:**
- Relatório Financeiro Mensal
- Balancete Mensal
- Demonstração do Resultado
- Balanço Patrimonial
- Relatório Nota Fiscal Cidadã (compliance)

**Documentação:** `06-RELATORIOS-COMPLIANCE.md`

---

### 7. Compliance Nota Fiscal Cidadã

**Descrição:** Validação automática da proporção 70% projeto / 30% custeio.

**Principais Recursos:**
- Marcação de receitas NFC
- Classificação de despesas (projeto ou custeio)
- Validação automática de proporção
- Relatório específico para SEFAZ

**Documentação:** `06-RELATORIOS-COMPLIANCE.md` (Seção 3)

---

### 8. Dashboard e Visualizações

**Descrição:** Painéis com indicadores financeiros e gráficos.

**Principais Recursos:**
- Resumo de receitas e despesas
- Gráficos de evolução mensal
- Saldos bancários consolidados
- Análise de categorias

**Documentação:** `03-UX-DESIGN-GUIDE.md` (Seção 4)

---

### 9. Controle de Acesso e Auditoria

**Descrição:** Sistema de permissões e log completo de operações.

**Principais Recursos:**
- 4 perfis: Administrador, Contador, Gestor, Visualizador
- Auditoria de todas as operações
- Histórico de alterações em lançamentos
- Rastreabilidade completa

**Documentação:** `04-REGRAS-NEGOCIO-FLUXOS.md` (Seção 7)

---

## 🛠️ Stack Tecnológica

### Backend
- **Runtime:** Node.js 22.x
- **Framework:** Express 4.x
- **API:** tRPC 11.x (type-safe)
- **Banco de Dados:** MySQL 8.x / TiDB
- **ORM:** Drizzle ORM
- **Validação:** Zod
- **Autenticação:** Manus OAuth + JWT

### Frontend
- **Framework:** React 19.x
- **Roteamento:** Wouter
- **Estilização:** TailwindCSS 4.x
- **Componentes:** shadcn/ui
- **State:** TanStack Query (React Query)
- **Formulários:** React Hook Form + Zod

### Ferramentas
- **PDF:** jsPDF + jsPDF-AutoTable
- **Gráficos:** Chart.js
- **Parsing:** pdf-parse, csv-parse, xml2js
- **Storage:** AWS S3 (via SDK)
- **Testes:** Vitest

**Documentação Completa:** `02-ARQUITETURA-SISTEMA.md`

---

## 📊 Modelo de Dados

### Principais Entidades

| Entidade | Descrição | Relacionamentos |
|----------|-----------|-----------------|
| **users** | Usuários do sistema | → audit_logs |
| **accounts** | Plano de contas | → entries, self (hierarquia) |
| **periods** | Períodos contábeis mensais | → entries |
| **entries** | Lançamentos contábeis | → accounts, periods, bank_imports |
| **bank_imports** | Importações de extratos | → entries |
| **classification_rules** | Regras de classificação | → accounts |
| **audit_logs** | Log de auditoria | → users |
| **organization_settings** | Configurações da organização | - |

**Diagrama ER Completo:** `02-ARQUITETURA-SISTEMA.md` (Seção 3.2)

---

## 🎨 Design System

### Paleta de Cores

**Cores Principais:**
- **Primary:** Blue 600 (#2563EB) - Ações principais
- **Success:** Green 600 (#16A34A) - Receitas, confirmações
- **Danger:** Red 600 (#DC2626) - Despesas, erros
- **Warning:** Amber 600 (#D97706) - Alertas
- **Info:** Sky 600 (#0284C7) - Informações

**Cores Semânticas:**
- **Revenue:** Green (receitas)
- **Expense:** Red (despesas)
- **NFC:** Purple (Nota Fiscal Cidadã)
- **Bank:** Blue (contas bancárias)

### Tipografia
- **Família:** Inter (Google Fonts)
- **Tamanhos:** 12px, 14px, 16px, 18px, 24px, 32px
- **Pesos:** 400 (regular), 500 (medium), 600 (semibold), 700 (bold)

### Componentes
- **Formulários:** shadcn/ui (Input, Select, Checkbox, etc.)
- **Tabelas:** TanStack Table
- **Gráficos:** Chart.js com cores do design system
- **Feedback:** Sonner (toasts)

**Guia Completo:** `03-UX-DESIGN-GUIDE.md`

---

## 🔐 Segurança e Compliance

### Segurança
- ✅ Autenticação OAuth 2.0 (Manus)
- ✅ JWT com expiração configurável
- ✅ HTTPS obrigatório em produção
- ✅ Sanitização de inputs (Zod)
- ✅ Proteção CSRF
- ✅ Rate limiting em APIs

### Compliance Contábil
- ✅ ITG 2002 (R1) - Entidades sem fins lucrativos
- ✅ NBC T 3 - Demonstrações contábeis
- ✅ Legislação Nota Fiscal Cidadã (SEFAZ)
- ✅ Auditoria completa de operações
- ✅ Rastreabilidade de lançamentos

### LGPD
- ✅ Consentimento para uso de dados
- ✅ Direito ao esquecimento
- ✅ Portabilidade de dados
- ✅ Logs de acesso

**Documentação:** `01-PESQUISA-CONTABIL-FISCAL.md`

---

## 🚀 Roadmap de Desenvolvimento

### Fase 1: Fundação (2-3 semanas)
- [x] Setup do projeto (backend + frontend)
- [x] Autenticação e controle de acesso
- [x] Banco de dados e migrações
- [x] Plano de contas (CRUD)
- [x] Períodos contábeis
- [x] Dashboard básico

### Fase 2: Core Contábil (3-4 semanas)
- [ ] Lançamentos manuais (CRUD)
- [ ] Validações contábeis
- [ ] Cálculo de saldos
- [ ] Balancete mensal
- [ ] Relatório financeiro básico

### Fase 3: Importação (2-3 semanas)
- [ ] Parser de PDF (Banco do Brasil)
- [ ] Parser de PDF (Caixa Econômica)
- [ ] Parser de CSV genérico
- [ ] Parser de OFX
- [ ] Detecção de duplicatas
- [ ] Interface de importação (wizard)

### Fase 4: Classificação Automática (2 semanas)
- [ ] Sistema de regras
- [ ] Classificação automática
- [ ] Aprendizado de máquina
- [ ] Interface de revisão

### Fase 5: Relatórios Avançados (2-3 semanas)
- [ ] Demonstração do Resultado
- [ ] Balanço Patrimonial
- [ ] Fluxo de Caixa
- [ ] Relatório NFC completo
- [ ] Geração de gráficos

### Fase 6: Compliance e Auditoria (1-2 semanas)
- [ ] Validação NFC (70/30)
- [ ] Logs de auditoria
- [ ] Histórico de alterações
- [ ] Exportação de dados

### Fase 7: Refinamentos (1-2 semanas)
- [ ] Otimizações de performance
- [ ] Testes automatizados
- [ ] Documentação de API
- [ ] Deploy em produção

**Tempo Total Estimado:** 13-19 semanas (3-5 meses)

---

## 📝 Convenções de Código

### Nomenclatura
- **Variáveis/Funções:** camelCase (`getUserById`, `totalRevenue`)
- **Tipos/Interfaces:** PascalCase (`User`, `FinancialReport`)
- **Constantes:** UPPER_SNAKE_CASE (`MAX_FILE_SIZE`, `DEFAULT_PERIOD`)
- **Arquivos:** kebab-case (`user-service.ts`, `bank-import.tsx`)

### Estrutura de Arquivos
```
server/
  routers.ts              # Routers tRPC principais
  db.ts                   # Helpers de banco de dados
  parsers/                # Parsers de extratos
    banco-brasil-pdf.ts
    caixa-pdf.ts
    csv-parser.ts
  services/               # Lógica de negócio
    classification.ts
    reports.ts
  
client/src/
  pages/                  # Páginas
    Dashboard.tsx
    Accounts.tsx
  components/             # Componentes reutilizáveis
    ui/                   # shadcn/ui
    AccountTree.tsx
    EntryForm.tsx
  lib/                    # Utilitários
    trpc.ts
    utils.ts
```

### Comentários
```typescript
/**
 * Calcula o saldo de uma conta em um período específico.
 * 
 * @param accountId - ID da conta
 * @param year - Ano do período
 * @param month - Mês do período (1-12)
 * @returns Saldo em centavos
 */
async function calculateAccountBalance(
  accountId: number,
  year: number,
  month: number
): Promise<number> {
  // Implementação...
}
```

---

## 🧪 Testes

### Estrutura de Testes
```
server/
  accounts.test.ts        # Testes de contas
  periods.test.ts         # Testes de períodos
  entries.test.ts         # Testes de lançamentos
  parsers.test.ts         # Testes de parsers
  reports.test.ts         # Testes de relatórios
```

### Exemplo de Teste
```typescript
describe("accounts.create", () => {
  it("should create a new account", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    
    const account = await caller.accounts.create({
      code: "1.1.1.01",
      name: "Banco do Brasil",
      type: "asset",
    });
    
    expect(account.code).toBe("1.1.1.01");
    expect(account.name).toBe("Banco do Brasil");
  });
  
  it("should reject duplicate code", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    
    await caller.accounts.create({
      code: "1.1.1.01",
      name: "Banco do Brasil",
      type: "asset",
    });
    
    await expect(
      caller.accounts.create({
        code: "1.1.1.01",
        name: "Outro Banco",
        type: "asset",
      })
    ).rejects.toThrow("Código já existe");
  });
});
```

**Cobertura Mínima:** 80%

---

## 📚 Recursos Adicionais

### Normas Contábeis
- [ITG 2002 (R1) - CFC](http://www1.cfc.org.br/sisweb/SRE/docs/ITG2002(R1).pdf)
- [NBC T 3 - Demonstrações Contábeis](http://www1.cfc.org.br/sisweb/SRE/docs/NBCT3.pdf)

### Legislação NFC
- [Programa Nota Fiscal Cidadã - SEFAZ](https://www.sefaz.al.gov.br/noticias/item/2090)

### Ferramentas
- [tRPC Documentation](https://trpc.io)
- [Drizzle ORM](https://orm.drizzle.team)
- [shadcn/ui](https://ui.shadcn.com)
- [TailwindCSS](https://tailwindcss.com)

---

## 🤝 Contribuição

### Fluxo de Trabalho
1. Criar branch a partir de `main`
2. Desenvolver funcionalidade
3. Escrever testes
4. Criar Pull Request
5. Code Review
6. Merge após aprovação

### Commits
Seguir padrão [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: adicionar parser de extrato Caixa
fix: corrigir cálculo de saldo em contas credoras
docs: atualizar documentação de importação
test: adicionar testes para classificação automática
```

---

## 📞 Suporte

Para dúvidas sobre a documentação ou especificação técnica:

- **Email:** suporte@sistema-financeiro.com.br
- **Documentação:** Esta pasta `/docs`
- **Issues:** GitHub Issues (se aplicável)

---

## 📄 Licença

Este projeto e sua documentação são **proprietários** e destinados exclusivamente ao desenvolvimento do sistema de gestão financeira para o Centro Espírita especificado.

**Uso não autorizado é proibido.**

---

**Última Atualização:** Dezembro 2024  
**Versão da Documentação:** 1.0  
**Elaborado por:** Manus AI  
**Revisão:** Pendente
