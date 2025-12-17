# 🚀 Guia Rápido para Desenvolvimento no Cursor

## 📌 Início Rápido

Você está prestes a desenvolver um **Sistema de Gestão Financeira e Contábil** completo para Centros Espíritas. Esta pasta contém TODA a especificação técnica necessária.

---

## ✅ Checklist Inicial

Antes de começar a codificar:

- [ ] Ler este documento completo (5 minutos)
- [ ] Ler `README.md` para visão geral (10 minutos)
- [ ] Ler `02-ARQUITETURA-SISTEMA.md` para entender stack e banco de dados (20 minutos)
- [ ] Ler `04-REGRAS-NEGOCIO-FLUXOS.md` para regras de negócio (20 minutos)
- [ ] Configurar ambiente de desenvolvimento (15 minutos)

**Tempo Total:** ~70 minutos

---

## 🎯 O Que Você Vai Construir

### Sistema Completo com 9 Módulos:

1. **Plano de Contas Hierárquico** - Estrutura contábil em árvore
2. **Gestão de Períodos** - Controle mensal com fechamento
3. **Lançamentos Contábeis** - Registro de receitas e despesas
4. **Importação de Extratos** - Parser automático de PDF/CSV/OFX
5. **Classificação Automática** - IA para sugerir classificação
6. **Dashboard** - Visualizações e indicadores
7. **Relatórios em PDF** - Geração automática conforme ITG 2002
8. **Compliance NFC** - Validação Nota Fiscal Cidadã (70/30)
9. **Auditoria** - Log completo de operações

---

## 📁 Documentação Disponível

| Documento | O Que Contém | Quando Ler |
|-----------|--------------|------------|
| **README.md** | Visão geral, funcionalidades, roadmap | PRIMEIRO |
| **01-PESQUISA-CONTABIL-FISCAL.md** | Base legal, ITG 2002, NFC | Quando precisar de contexto contábil |
| **02-ARQUITETURA-SISTEMA.md** | Stack, banco de dados, APIs | ANTES de começar backend |
| **03-UX-DESIGN-GUIDE.md** | Design system, componentes, UX | ANTES de começar frontend |
| **04-REGRAS-NEGOCIO-FLUXOS.md** | Regras de negócio, validações | SEMPRE que implementar funcionalidade |
| **05-IMPORTACAO-CLASSIFICACAO.md** | Parsers, classificação automática | Ao implementar importação |
| **06-RELATORIOS-COMPLIANCE.md** | Geração de PDFs, relatórios | Ao implementar relatórios |

---

## 🛠️ Setup do Ambiente

### 1. Clonar Projeto Base

O projeto já foi inicializado com a estrutura base:

```bash
cd /home/ubuntu/gestao_financeira_ce
```

**Estrutura Atual:**
```
gestao_financeira_ce/
├── client/               # Frontend React
├── server/               # Backend Express + tRPC
├── drizzle/              # Schema e migrações
├── shared/               # Tipos compartilhados
└── package.json
```

### 2. Instalar Dependências

```bash
pnpm install
```

### 3. Configurar Banco de Dados

O banco já está configurado. Aplicar migrações:

```bash
pnpm db:push
```

### 4. Iniciar Servidor de Desenvolvimento

```bash
pnpm dev
```

**Servidor:** http://localhost:3000

---

## 📊 Banco de Dados

### Schema Atual (9 Tabelas)

| Tabela | Descrição | Campos Principais |
|--------|-----------|-------------------|
| `users` | Usuários do sistema | id, openId, name, email, role |
| `accounts` | Plano de contas | id, code, name, type, parentId |
| `periods` | Períodos mensais | id, year, month, status |
| `entries` | Lançamentos | id, accountId, periodId, amount, type |
| `bank_imports` | Importações | id, filename, bank, status |
| `classification_rules` | Regras de classificação | id, pattern, accountId, priority |
| `audit_logs` | Auditoria | id, userId, action, entityType |
| `organization_settings` | Configurações | id, name, cnpj, address |

**Schema Completo:** Ver `drizzle/schema.ts` ou `02-ARQUITETURA-SISTEMA.md` (Seção 3.2)

---

## 🎨 Design System

### Cores Principais

```typescript
// Cores semânticas já configuradas em index.css
primary: "#2563EB"      // Blue 600 - Ações principais
success: "#16A34A"      // Green 600 - Receitas
danger: "#DC2626"       // Red 600 - Despesas
warning: "#D97706"      // Amber 600 - Alertas
nfc: "#9333EA"          // Purple 600 - Nota Fiscal Cidadã
```

### Componentes Disponíveis (shadcn/ui)

Já instalados e prontos para uso:
- `Button`, `Input`, `Select`, `Checkbox`, `RadioGroup`
- `Card`, `Table`, `Dialog`, `Sheet`, `Tabs`
- `Form` (com React Hook Form + Zod)
- `Toast` (Sonner)

**Importação:**
```tsx
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
```

---

## 🔧 APIs tRPC

### Estrutura de Routers

```typescript
// server/routers.ts
export const appRouter = router({
  auth: authRouter,           // Autenticação
  accounts: accountsRouter,   // Plano de contas
  periods: periodsRouter,     // Períodos
  entries: entriesRouter,     // Lançamentos
  imports: importsRouter,     // Importações
  reports: reportsRouter,     // Relatórios
  system: systemRouter,       // Sistema
});
```

### Uso no Frontend

```tsx
// Buscar dados
const { data, isLoading } = trpc.accounts.list.useQuery();

// Mutação
const createMutation = trpc.accounts.create.useMutation({
  onSuccess: () => {
    toast.success("Conta criada!");
    trpc.useUtils().accounts.list.invalidate();
  },
});

createMutation.mutate({
  code: "1.1.1.01",
  name: "Banco do Brasil",
  type: "asset",
});
```

---

## 📝 Padrões de Código

### Nomenclatura

```typescript
// ✅ BOM
function calculateAccountBalance(accountId: number): number { }
const totalRevenue = 1000;
interface FinancialReport { }
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// ❌ EVITAR
function calc_balance(id: number): number { }
const TotalRevenue = 1000;
interface financial_report { }
const maxFileSize = 10 * 1024 * 1024;
```

### Estrutura de Componentes

```tsx
// ✅ BOM - Componente bem estruturado
export default function AccountsPage() {
  // 1. Hooks
  const { data, isLoading } = trpc.accounts.list.useQuery();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // 2. Mutations
  const createMutation = trpc.accounts.create.useMutation({
    onSuccess: () => {
      toast.success("Conta criada!");
      setIsDialogOpen(false);
    },
  });
  
  // 3. Handlers
  const handleCreate = (data: AccountFormData) => {
    createMutation.mutate(data);
  };
  
  // 4. Early returns
  if (isLoading) return <LoadingSpinner />;
  
  // 5. Render
  return (
    <DashboardLayout>
      {/* Conteúdo */}
    </DashboardLayout>
  );
}
```

### Validação com Zod

```typescript
// Schema de validação
const accountSchema = z.object({
  code: z.string().min(1, "Código obrigatório"),
  name: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  type: z.enum(["asset", "liability", "equity", "revenue", "expense"]),
  parentId: z.number().optional(),
});

// Uso em tRPC
export const accountsRouter = router({
  create: protectedProcedure
    .input(accountSchema)
    .mutation(async ({ input, ctx }) => {
      return await createAccount(input);
    }),
});

// Uso em formulário
const form = useForm({
  resolver: zodResolver(accountSchema),
});
```

---

## 🎯 Roadmap de Implementação

### Fase 1: Core Contábil (PRIORIDADE ALTA)

**Já Implementado:**
- ✅ Plano de contas (CRUD)
- ✅ Períodos (CRUD, fechamento)
- ✅ Dashboard básico

**A Implementar:**
```
1. Lançamentos Contábeis
   - Formulário de criação (débito/crédito)
   - Validação de período fechado
   - Listagem com filtros
   - Edição e exclusão (com auditoria)
   
2. Cálculo de Saldos
   - Função calculateAccountBalance()
   - Respeitar natureza da conta (devedora/credora)
   - Cache de saldos para performance
   
3. Balancete Mensal
   - Geração de PDF
   - Saldo anterior + movimentação + saldo atual
   - Totais de débitos e créditos
```

**Documentação:** `04-REGRAS-NEGOCIO-FLUXOS.md` (Seção 4 e 5)

---

### Fase 2: Importação de Extratos (PRIORIDADE ALTA)

```
1. Parser de PDF (Banco do Brasil)
   - Extrair texto com pdf-parse
   - Regex para identificar transações
   - Parsear data, descrição, valor
   
2. Parser de PDF (Caixa Econômica)
   - Layout diferente do BB
   - Descrição em múltiplas linhas
   
3. Parser CSV Genérico
   - Auto-detecção de delimitador
   - Auto-detecção de encoding
   - Mapeamento flexível de colunas
   
4. Detecção de Duplicatas
   - Comparar data + valor + descrição similar
   - Interface para revisar duplicatas
   
5. Interface de Importação
   - Wizard de 3 etapas (upload → revisão → classificação)
   - Drag & drop de arquivos
   - Preview de transações
```

**Documentação:** `05-IMPORTACAO-CLASSIFICACAO.md`

**Código de Exemplo:** Seções 2.1, 2.2, 2.3 do documento

---

### Fase 3: Classificação Automática (PRIORIDADE MÉDIA)

```
1. Sistema de Regras
   - CRUD de regras (pattern, accountId, priority)
   - Match exato e fuzzy
   - Priorização por ordem
   
2. Classificação Automática
   - Aplicar regras em ordem de prioridade
   - Calcular confiança (0-100%)
   - Detectar Nota Fiscal Cidadã automaticamente
   
3. Aprendizado
   - Criar regras baseado em classificações manuais
   - Incrementar prioridade de regras usadas
   - Extrair keywords significativas
   
4. Interface de Revisão
   - Mostrar sugestão com confiança
   - Permitir aceitar/rejeitar
   - Criar regra a partir de classificação
```

**Documentação:** `05-IMPORTACAO-CLASSIFICACAO.md` (Seção 4)

---

### Fase 4: Relatórios (PRIORIDADE ALTA)

```
1. Relatório Financeiro Mensal
   - Coletar dados (receitas, despesas, saldos)
   - Gerar PDF com jsPDF
   - Incluir gráficos (Chart.js)
   - Seções: sumário, receitas, despesas, saldos, NFC
   
2. Balancete Mensal
   - Todas as contas com movimentação
   - Saldo anterior, débitos, créditos, saldo atual
   - Formato paisagem
   
3. Relatório Nota Fiscal Cidadã
   - Análise de conformidade (70/30)
   - Detalhamento de aplicação
   - Declaração de conformidade
   - Assinaturas
   
4. Interface de Geração
   - Seleção de relatório
   - Seleção de período
   - Opções (incluir gráficos, etc.)
   - Download de PDF
```

**Documentação:** `06-RELATORIOS-COMPLIANCE.md`

**Código de Exemplo:** Seções 2.2, 3.3, 4.2 do documento

---

## 💡 Dicas Importantes

### 1. Sempre Validar Período Fechado

```typescript
// Antes de criar/editar lançamento
const period = await getPeriodById(periodId);
if (period.status === "closed") {
  throw new TRPCError({
    code: "FORBIDDEN",
    message: "Período fechado. Não é possível editar lançamentos.",
  });
}
```

### 2. Usar Centavos para Valores Monetários

```typescript
// ✅ BOM - Armazenar em centavos (evita problemas de float)
const amountCents = 12345; // R$ 123,45

// Formatação para exibição
function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}
```

### 3. Auditoria em Todas as Operações Críticas

```typescript
// Após criar/editar/excluir
await createAuditLog({
  userId: ctx.user.id,
  entityType: "entry",
  entityId: entry.id,
  action: "create",
  newValues: entry,
});
```

### 4. Usar Optimistic Updates para UX

```typescript
const deleteMutation = trpc.entries.delete.useMutation({
  onMutate: async (id) => {
    // Cancelar queries em andamento
    await utils.entries.list.cancel();
    
    // Snapshot do estado atual
    const previous = utils.entries.list.getData();
    
    // Update otimista
    utils.entries.list.setData(undefined, (old) =>
      old?.filter((entry) => entry.id !== id)
    );
    
    return { previous };
  },
  onError: (err, id, context) => {
    // Rollback em caso de erro
    utils.entries.list.setData(undefined, context?.previous);
  },
  onSettled: () => {
    // Refetch para garantir sincronização
    utils.entries.list.invalidate();
  },
});
```

### 5. Tratamento de Erros Consistente

```typescript
// Backend
throw new TRPCError({
  code: "BAD_REQUEST",
  message: "Código de conta já existe",
});

// Frontend
const createMutation = trpc.accounts.create.useMutation({
  onError: (error) => {
    toast.error("Erro ao criar conta", {
      description: error.message,
    });
  },
});
```

---

## 🧪 Testes

### Estrutura de Teste

```typescript
import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import { createAuthContext } from "./test-utils";

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
});
```

### Executar Testes

```bash
pnpm test
```

**Meta de Cobertura:** 80%

---

## 📚 Referências Rápidas

### Documentos por Funcionalidade

| Funcionalidade | Documento | Seção |
|----------------|-----------|-------|
| Plano de Contas | `04-REGRAS-NEGOCIO-FLUXOS.md` | Seção 2 |
| Períodos | `04-REGRAS-NEGOCIO-FLUXOS.md` | Seção 3 |
| Lançamentos | `04-REGRAS-NEGOCIO-FLUXOS.md` | Seção 4 |
| Importação BB | `05-IMPORTACAO-CLASSIFICACAO.md` | Seção 2.1 |
| Importação Caixa | `05-IMPORTACAO-CLASSIFICACAO.md` | Seção 2.1 |
| Classificação | `05-IMPORTACAO-CLASSIFICACAO.md` | Seção 4 |
| Relatório Mensal | `06-RELATORIOS-COMPLIANCE.md` | Seção 2 |
| Relatório NFC | `06-RELATORIOS-COMPLIANCE.md` | Seção 3 |
| Balancete | `06-RELATORIOS-COMPLIANCE.md` | Seção 4 |
| Design System | `03-UX-DESIGN-GUIDE.md` | Todas |

### Comandos Úteis

```bash
# Desenvolvimento
pnpm dev                    # Iniciar servidor
pnpm db:push                # Aplicar migrações
pnpm test                   # Executar testes
pnpm check                  # Verificar TypeScript

# Build
pnpm build                  # Build de produção
pnpm start                  # Iniciar produção

# Utilitários
pnpm format                 # Formatar código
```

---

## 🎯 Próximos Passos

1. **Ler documentação essencial** (README + Arquitetura + Regras de Negócio)
2. **Configurar ambiente** (já está pronto, apenas `pnpm install`)
3. **Escolher uma funcionalidade** da Fase 1 ou 2
4. **Implementar seguindo a documentação** correspondente
5. **Escrever testes** para a funcionalidade
6. **Testar manualmente** no navegador
7. **Repetir** para próxima funcionalidade

---

## ❓ Dúvidas Frequentes

### Q: Por que armazenar valores em centavos?
**A:** Para evitar problemas de precisão com ponto flutuante. `0.1 + 0.2 !== 0.3` em JavaScript.

### Q: Como funciona a hierarquia de contas?
**A:** Cada conta pode ter um `parentId` apontando para conta pai. Contas sem filhos são "analíticas" (recebem lançamentos). Contas com filhos são "sintéticas" (apenas agrupamento).

### Q: O que é ITG 2002?
**A:** Norma contábil brasileira específica para entidades sem fins lucrativos. Define estrutura de demonstrações contábeis.

### Q: O que é Nota Fiscal Cidadã?
**A:** Programa governamental que repassa recursos para entidades. Exige que 70% seja aplicado em projetos e 30% em custeio.

### Q: Como funciona a classificação automática?
**A:** Sistema de regras que busca padrões na descrição da transação (ex: "PIX RECEBIDO" → conta de doações). Quanto mais usado, maior a prioridade.

---

## 📞 Suporte

Se tiver dúvidas sobre a especificação:

1. **Primeiro:** Consultar documentação correspondente
2. **Segundo:** Buscar no README.md
3. **Terceiro:** Verificar código de exemplo nos documentos

**Todos os detalhes estão documentados!**

---

## ✅ Checklist Final

Antes de começar a codificar:

- [ ] Li este guia completo
- [ ] Li README.md
- [ ] Li 02-ARQUITETURA-SISTEMA.md
- [ ] Li 04-REGRAS-NEGOCIO-FLUXOS.md
- [ ] Entendi o modelo de dados
- [ ] Entendi o design system
- [ ] Ambiente configurado e funcionando
- [ ] Sei qual funcionalidade vou implementar primeiro

**Pronto para começar! 🚀**

---

**Boa sorte no desenvolvimento!**

**Lembre-se:** Esta documentação contém TUDO que você precisa. Se algo não estiver claro, releia a seção correspondente. Cada detalhe foi cuidadosamente especificado.
