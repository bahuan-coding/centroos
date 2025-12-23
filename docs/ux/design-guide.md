# UX Design Guide - Sistema de Gestão Financeira para Centros Espíritas

## 1. PRINCÍPIOS DE DESIGN

### 1.1 Filosofia do Sistema
O sistema deve ser **didático, transparente e acessível**, refletindo os valores de um Centro Espírita: simplicidade, clareza e acolhimento. O design deve **educar** o usuário sobre contabilidade, não apenas executar funções.

**Princípios Fundamentais:**

1. **Clarity Over Cleverness** (Clareza acima de complexidade)
   - Terminologia contábil explicada em linguagem simples
   - Tooltips e ajudas contextuais em todos os campos
   - Feedback visual imediato para todas as ações

2. **Progressive Disclosure** (Revelação progressiva)
   - Mostrar informações básicas primeiro
   - Detalhes avançados acessíveis sob demanda
   - Wizards para processos complexos

3. **Forgiveness** (Tolerância a erros)
   - Confirmações antes de ações destrutivas
   - Undo/redo quando possível
   - Validações claras e construtivas

4. **Consistency** (Consistência)
   - Padrões visuais uniformes
   - Comportamentos previsíveis
   - Terminologia padronizada

5. **Accessibility** (Acessibilidade)
   - WCAG 2.1 AA compliance
   - Navegação por teclado completa
   - Contraste adequado (mínimo 4.5:1)
   - Screen reader friendly

---

## 2. SISTEMA DE DESIGN

### 2.1 Paleta de Cores

**Tema Claro (Padrão):**
```css
:root {
  /* Primary - Azul profissional */
  --primary: 217 91% 60%;        /* #3B82F6 - Azul confiável */
  --primary-foreground: 0 0% 100%;

  /* Secondary - Verde contábil */
  --secondary: 142 71% 45%;      /* #22C55E - Verde positivo */
  --secondary-foreground: 0 0% 100%;

  /* Accent - Laranja atenção */
  --accent: 25 95% 53%;          /* #F97316 - Laranja alerta */
  --accent-foreground: 0 0% 100%;

  /* Destructive - Vermelho */
  --destructive: 0 84% 60%;      /* #EF4444 - Vermelho erro */
  --destructive-foreground: 0 0% 100%;

  /* Background */
  --background: 0 0% 100%;       /* Branco puro */
  --foreground: 222 47% 11%;     /* Texto escuro */

  /* Muted */
  --muted: 210 40% 96%;          /* Cinza claro */
  --muted-foreground: 215 16% 47%;

  /* Card */
  --card: 0 0% 100%;
  --card-foreground: 222 47% 11%;

  /* Border */
  --border: 214 32% 91%;         /* Bordas suaves */
  --input: 214 32% 91%;
  --ring: 217 91% 60%;           /* Focus ring */

  /* Radius */
  --radius: 0.5rem;
}
```

**Cores Semânticas:**
```css
:root {
  /* Contabilidade */
  --revenue: 142 71% 45%;        /* Verde - Receitas */
  --expense: 0 84% 60%;          /* Vermelho - Despesas */
  --asset: 217 91% 60%;          /* Azul - Ativos */
  --liability: 25 95% 53%;       /* Laranja - Passivos */
  --fixed-asset: 271 81% 56%;    /* Roxo - Imobilizado */

  /* Status */
  --status-open: 142 71% 45%;    /* Verde - Aberto */
  --status-review: 45 93% 47%;   /* Amarelo - Em revisão */
  --status-closed: 215 16% 47%;  /* Cinza - Fechado */

  /* NFC */
  --nfc-project: 271 81% 56%;    /* Roxo - 70% Projeto */
  --nfc-operating: 45 93% 47%;   /* Amarelo - 30% Custeio */
}
```

### 2.2 Tipografia

**Fonte Principal:** Inter (Google Fonts)
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

:root {
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
}
```

**Escala Tipográfica:**
| Elemento | Tamanho | Peso | Uso |
|----------|---------|------|-----|
| Display | 3rem (48px) | 700 | Títulos de página |
| H1 | 2.25rem (36px) | 700 | Cabeçalhos principais |
| H2 | 1.875rem (30px) | 600 | Seções |
| H3 | 1.5rem (24px) | 600 | Subseções |
| H4 | 1.25rem (20px) | 600 | Cards e grupos |
| Body | 1rem (16px) | 400 | Texto padrão |
| Small | 0.875rem (14px) | 400 | Legendas |
| Tiny | 0.75rem (12px) | 400 | Notas de rodapé |

**Hierarquia Visual:**
- **Títulos**: Bold (600-700), maior espaçamento de linha (1.2)
- **Corpo**: Regular (400), espaçamento confortável (1.5)
- **Números**: Monospace para alinhamento
- **Valores monetários**: Bold para destaque

### 2.3 Espaçamento

**Sistema de 4px:**
```css
:root {
  --space-1: 0.25rem;  /* 4px */
  --space-2: 0.5rem;   /* 8px */
  --space-3: 0.75rem;  /* 12px */
  --space-4: 1rem;     /* 16px */
  --space-5: 1.25rem;  /* 20px */
  --space-6: 1.5rem;   /* 24px */
  --space-8: 2rem;     /* 32px */
  --space-10: 2.5rem;  /* 40px */
  --space-12: 3rem;    /* 48px */
  --space-16: 4rem;    /* 64px */
}
```

**Aplicação:**
- **Componentes pequenos**: 4-8px (botões, inputs)
- **Cards e seções**: 16-24px
- **Margens de página**: 32-48px
- **Separação de blocos**: 48-64px

### 2.4 Sombras e Elevação

```css
:root {
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1);
}
```

**Hierarquia:**
- **Nível 0**: Sem sombra (elementos inline)
- **Nível 1**: shadow-sm (cards, inputs)
- **Nível 2**: shadow-md (dropdowns, tooltips)
- **Nível 3**: shadow-lg (modals, dialogs)
- **Nível 4**: shadow-xl (overlays críticos)

### 2.5 Ícones

**Biblioteca:** Lucide React
- Consistente, moderna, open-source
- 1000+ ícones
- Stroke width: 2px (padrão)
- Tamanho: 16px (small), 20px (default), 24px (large)

**Ícones por Contexto:**
| Contexto | Ícone | Significado |
|----------|-------|-------------|
| Receitas | TrendingUp | Crescimento |
| Despesas | TrendingDown | Redução |
| Saldo | DollarSign | Valor monetário |
| Período | Calendar | Data/período |
| Conta | FolderTree | Hierarquia |
| Lançamento | FileText | Documento |
| Importar | Upload | Upload de arquivo |
| Relatório | FileBarChart | Análise |
| Configuração | Settings | Ajustes |
| Usuário | User | Perfil |
| Ajuda | HelpCircle | Informação |
| Sucesso | CheckCircle | Confirmação |
| Erro | XCircle | Problema |
| Alerta | AlertTriangle | Atenção |

---

## 3. COMPONENTES DE INTERFACE

### 3.1 Layout Principal (DashboardLayout)

**Estrutura:**
```
┌─────────────────────────────────────────────┐
│ Header (Logo + User Menu)                  │
├──────────┬──────────────────────────────────┤
│          │                                  │
│ Sidebar  │  Main Content Area               │
│ Nav      │                                  │
│          │  ┌────────────────────────────┐  │
│          │  │ Page Header                │  │
│          │  ├────────────────────────────┤  │
│          │  │                            │  │
│          │  │ Content                    │  │
│          │  │                            │  │
│          │  │                            │  │
│          │  └────────────────────────────┘  │
│          │                                  │
└──────────┴──────────────────────────────────┘
```

**Sidebar Navigation:**
- Largura: 240px (desktop), collapsible (mobile)
- Itens com ícone + label
- Active state destacado
- Agrupamento por categoria

**Itens de Navegação:**
```
📊 Dashboard
📁 Plano de Contas
📝 Lançamentos
📅 Períodos
📤 Importar Extrato
📊 Relatórios
⚙️ Configurações
```

### 3.2 Cards e Containers

**Card Padrão:**
```tsx
<Card>
  <CardHeader>
    <CardTitle>Título do Card</CardTitle>
    <CardDescription>Descrição opcional</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Conteúdo principal */}
  </CardContent>
  <CardFooter>
    {/* Ações ou informações adicionais */}
  </CardFooter>
</Card>
```

**Variações:**
- **Stat Card**: Métricas com ícone, valor grande, variação
- **Info Card**: Informações contextuais com ícone
- **Action Card**: Card clicável para navegação

**Exemplo de Stat Card:**
```tsx
<Card>
  <CardHeader className="flex flex-row items-center justify-between">
    <CardTitle className="text-sm font-medium">Receitas do Período</CardTitle>
    <TrendingUp className="h-4 w-4 text-green-600" />
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold">R$ 12.450,00</div>
    <p className="text-xs text-muted-foreground">
      <span className="text-green-600">+12.5%</span> vs mês anterior
    </p>
  </CardContent>
</Card>
```

### 3.3 Formulários

**Princípios:**
1. **Labels claros**: Sempre visíveis, nunca como placeholder
2. **Ajuda contextual**: Tooltip ou texto auxiliar quando necessário
3. **Validação inline**: Feedback imediato, não apenas no submit
4. **Agrupamento lógico**: Campos relacionados juntos
5. **Foco automático**: Primeiro campo focado ao abrir

**Estrutura de Campo:**
```tsx
<div className="grid gap-2">
  <Label htmlFor="amount">
    Valor
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <HelpCircle className="h-3 w-3 ml-1 inline" />
        </TooltipTrigger>
        <TooltipContent>
          <p>Informe o valor em reais. Exemplo: 1250.50</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  </Label>
  <Input
    id="amount"
    type="number"
    step="0.01"
    placeholder="0,00"
    {...register("amount")}
  />
  {errors.amount && (
    <p className="text-sm text-destructive">{errors.amount.message}</p>
  )}
  <p className="text-xs text-muted-foreground">
    O valor será registrado em centavos no banco de dados
  </p>
</div>
```

**Tipos de Input:**
| Tipo | Uso | Exemplo |
|------|-----|---------|
| Text | Descrições, nomes | Descrição do lançamento |
| Number | Valores numéricos | Valor em reais |
| Date | Datas | Data da transação |
| Select | Opções limitadas | Tipo de conta |
| Combobox | Muitas opções com busca | Selecionar conta |
| Textarea | Textos longos | Notas explicativas |
| Checkbox | Opções booleanas | Marcar como NFC |
| Radio | Escolha única | Débito ou Crédito |

### 3.4 Tabelas

**Estrutura:**
```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Data</TableHead>
      <TableHead>Descrição</TableHead>
      <TableHead>Conta</TableHead>
      <TableHead className="text-right">Valor</TableHead>
      <TableHead className="text-right">Ações</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {entries.map((entry) => (
      <TableRow key={entry.id}>
        <TableCell>{formatDate(entry.transactionDate)}</TableCell>
        <TableCell>{entry.description}</TableCell>
        <TableCell>{entry.account.name}</TableCell>
        <TableCell className="text-right font-mono">
          {formatCurrency(entry.amountCents)}
        </TableCell>
        <TableCell className="text-right">
          <Button variant="ghost" size="icon">
            <Edit className="h-4 w-4" />
          </Button>
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

**Boas Práticas:**
- **Alinhamento**: Números à direita, texto à esquerda
- **Fonte mono**: Valores monetários para alinhamento
- **Zebra striping**: Alternância de cores (opcional)
- **Hover state**: Destaque da linha ao passar o mouse
- **Ordenação**: Colunas clicáveis para ordenar
- **Paginação**: Máximo 50 itens por página
- **Loading state**: Skeleton durante carregamento

### 3.5 Modais e Dialogs

**Dialog Padrão:**
```tsx
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogTrigger asChild>
    <Button>Abrir Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Título do Dialog</DialogTitle>
      <DialogDescription>
        Descrição do que este dialog faz
      </DialogDescription>
    </DialogHeader>
    {/* Conteúdo */}
    <DialogFooter>
      <Button variant="outline" onClick={() => setIsOpen(false)}>
        Cancelar
      </Button>
      <Button onClick={handleSubmit}>Confirmar</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**AlertDialog (Confirmações):**
```tsx
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="destructive">Excluir</Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
      <AlertDialogDescription>
        Esta ação não pode ser desfeita. O lançamento será excluído permanentemente.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancelar</AlertDialogCancel>
      <AlertDialogAction onClick={handleDelete}>
        Sim, excluir
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

**Quando usar:**
- **Dialog**: Formulários, edição, criação
- **AlertDialog**: Confirmações destrutivas
- **Sheet**: Painéis laterais (mobile)
- **Popover**: Informações contextuais rápidas

### 3.6 Tooltips e Ajudas Contextuais

**Tooltip Simples:**
```tsx
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <Button variant="ghost" size="icon">
        <HelpCircle className="h-4 w-4" />
      </Button>
    </TooltipTrigger>
    <TooltipContent>
      <p>Clique para ver mais informações</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

**Tooltip Educativo (Termos Contábeis):**
```tsx
<span className="inline-flex items-center gap-1">
  Superávit
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger>
        <Info className="h-3 w-3 text-muted-foreground" />
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <p className="font-semibold">Superávit</p>
        <p className="text-sm">
          Resultado positivo quando as receitas superam as despesas.
          Em entidades sem fins lucrativos, o superávit deve ser
          incorporado ao patrimônio social, não distribuído.
        </p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
</span>
```

**Quando usar tooltips:**
- Explicar termos técnicos/contábeis
- Fornecer exemplos de preenchimento
- Mostrar atalhos de teclado
- Exibir informações adicionais sem poluir a UI

### 3.7 Feedback Visual

**Toast Notifications:**
```tsx
import { toast } from "sonner";

// Sucesso
toast.success("Lançamento criado com sucesso!");

// Erro
toast.error("Erro ao criar lançamento", {
  description: "O período selecionado está fechado",
});

// Aviso
toast.warning("Atenção: Este lançamento não foi classificado");

// Informação
toast.info("Importação em andamento...", {
  duration: 5000,
});

// Loading
const toastId = toast.loading("Processando...");
// ... operação assíncrona
toast.success("Concluído!", { id: toastId });
```

**Estados de Loading:**
```tsx
// Skeleton (carregamento inicial)
{isLoading ? (
  <div className="space-y-2">
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-3/4" />
    <Skeleton className="h-4 w-1/2" />
  </div>
) : (
  <Content />
)}

// Spinner (operação em andamento)
<Button disabled={isPending}>
  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
  {isPending ? "Salvando..." : "Salvar"}
</Button>
```

**Empty States:**
```tsx
{entries.length === 0 ? (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <FileText className="h-12 w-12 text-muted-foreground mb-4" />
    <h3 className="text-lg font-semibold">Nenhum lançamento encontrado</h3>
    <p className="text-sm text-muted-foreground mb-4">
      Comece criando seu primeiro lançamento ou importe um extrato bancário
    </p>
    <div className="flex gap-2">
      <Button>
        <Plus className="mr-2 h-4 w-4" />
        Novo Lançamento
      </Button>
      <Button variant="outline">
        <Upload className="mr-2 h-4 w-4" />
        Importar Extrato
      </Button>
    </div>
  </div>
) : (
  <EntriesList entries={entries} />
)}
```

---

## 4. PADRÕES DE INTERAÇÃO

### 4.1 Navegação

**Breadcrumbs:**
```tsx
<Breadcrumb>
  <BreadcrumbList>
    <BreadcrumbItem>
      <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem>
      <BreadcrumbLink href="/entries">Lançamentos</BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem>
      <BreadcrumbPage>Novo Lançamento</BreadcrumbPage>
    </BreadcrumbItem>
  </BreadcrumbList>
</Breadcrumb>
```

**Tabs (Navegação Interna):**
```tsx
<Tabs defaultValue="all">
  <TabsList>
    <TabsTrigger value="all">Todos</TabsTrigger>
    <TabsTrigger value="revenue">Receitas</TabsTrigger>
    <TabsTrigger value="expense">Despesas</TabsTrigger>
  </TabsList>
  <TabsContent value="all">
    <AllEntries />
  </TabsContent>
  <TabsContent value="revenue">
    <RevenueEntries />
  </TabsContent>
  <TabsContent value="expense">
    <ExpenseEntries />
  </TabsContent>
</Tabs>
```

### 4.2 Filtros e Busca

**Barra de Filtros:**
```tsx
<Card>
  <CardHeader>
    <CardTitle className="text-base">Filtros</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <Label>Período</Label>
        <Select value={periodId} onValueChange={setPeriodId}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione o período" />
          </SelectTrigger>
          <SelectContent>
            {periods.map(p => (
              <SelectItem key={p.id} value={p.id.toString()}>
                {formatPeriod(p.month, p.year)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Tipo</Label>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger>
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="revenue">Receitas</SelectItem>
            <SelectItem value="expense">Despesas</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Buscar</Label>
        <Input
          placeholder="Descrição ou conta..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
    </div>
  </CardContent>
</Card>
```

### 4.3 Ações em Massa

**Seleção Múltipla:**
```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead className="w-12">
        <Checkbox
          checked={selectedAll}
          onCheckedChange={handleSelectAll}
        />
      </TableHead>
      <TableHead>Descrição</TableHead>
      {/* ... */}
    </TableRow>
  </TableHeader>
  <TableBody>
    {entries.map(entry => (
      <TableRow key={entry.id}>
        <TableCell>
          <Checkbox
            checked={selected.includes(entry.id)}
            onCheckedChange={() => handleSelect(entry.id)}
          />
        </TableCell>
        <TableCell>{entry.description}</TableCell>
        {/* ... */}
      </TableRow>
    ))}
  </TableBody>
</Table>

{selected.length > 0 && (
  <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg flex items-center gap-4">
    <span>{selected.length} selecionados</span>
    <Button variant="secondary" size="sm">
      Exportar
    </Button>
    <Button variant="destructive" size="sm">
      Excluir
    </Button>
  </div>
)}
```

### 4.4 Drag and Drop

**Upload de Arquivos:**
```tsx
<div
  className={cn(
    "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
    isDragging ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
  )}
  onDragOver={handleDragOver}
  onDragLeave={handleDragLeave}
  onDrop={handleDrop}
  onClick={() => fileInputRef.current?.click()}
>
  <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
  <p className="text-lg font-semibold mb-2">
    Arraste o extrato bancário aqui
  </p>
  <p className="text-sm text-muted-foreground mb-4">
    ou clique para selecionar um arquivo
  </p>
  <p className="text-xs text-muted-foreground">
    Formatos aceitos: PDF, CSV, OFX (máx. 10MB)
  </p>
  <input
    ref={fileInputRef}
    type="file"
    accept=".pdf,.csv,.ofx"
    className="hidden"
    onChange={handleFileSelect}
  />
</div>
```

---

## 5. PÁGINAS ESPECÍFICAS

### 5.1 Dashboard

**Layout:**
```
┌─────────────────────────────────────────────┐
│ Dashboard                                   │
│ Centro Espírita Casa do Caminho             │
├─────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────┐ │
│ │ 📅 Período Atual: Dezembro de 2024      │ │
│ └─────────────────────────────────────────┘ │
├───────────────┬───────────────┬─────────────┤
│ Receitas      │ Despesas      │ Saldo       │
│ R$ 12.450,00  │ R$ 8.320,00   │ R$ 4.130,00 │
│ +12.5% ↑      │ -5.2% ↓       │ Superávit   │
├───────────────┴───────────────┴─────────────┤
│ Ações Rápidas                               │
│ [Novo Lançamento] [Importar] [Relatório]    │
├─────────────────────────────────────────────┤
│ Atividade Recente                           │
│ • Lançamento criado: Doação - R$ 500,00     │
│ • Extrato importado: Banco do Brasil        │
│ • Período novembro/2024 fechado             │
└─────────────────────────────────────────────┘
```

**Componentes:**
1. **Header**: Nome da organização, período atual
2. **Stat Cards**: Receitas, Despesas, Saldo (com variação)
3. **Quick Actions**: Botões para ações frequentes
4. **Recent Activity**: Últimas 5-10 atividades
5. **Charts** (opcional): Gráfico de tendência mensal

### 5.2 Plano de Contas

**Layout:**
```
┌─────────────────────────────────────────────┐
│ Plano de Contas                 [+ Nova]    │
├─────────────────────────────────────────────┤
│ Filtros: [Todos] [Ativo] [Passivo] ...      │
├─────────────────────────────────────────────┤
│ 📁 Ativo                                    │
│   ├─ 1.1 Ativo Circulante                  │
│   │  ├─ 1.1.1 Disponibilidades             │
│   │  │  ├─ 1.1.1.001 Caixa                 │
│   │  │  ├─ 1.1.1.002 Banco do Brasil       │
│   │  │  └─ 1.1.1.003 Caixa Econômica       │
│   │  └─ 1.1.2 Créditos a Receber           │
│   └─ 1.2 Ativo Não Circulante              │
│                                             │
│ 📁 Receitas                                 │
│   ├─ 6.1 Receitas de Doações               │
│   └─ 6.2 Receitas Governamentais           │
│      └─ 6.2.1 Nota Fiscal Cidadã           │
└─────────────────────────────────────────────┘
```

**Funcionalidades:**
- **Visualização hierárquica**: Tree view expansível
- **Filtros por tipo**: Botões de filtro rápido
- **Busca**: Campo de busca por código ou nome
- **Ações por conta**: Editar, desativar, ver lançamentos
- **Indicadores**: Badge de status (ativa/inativa)

**Interações:**
- Click no nome: Expandir/colapsar filhos
- Click no ícone de ação: Menu de contexto
- Drag and drop: Reordenar (futuro)

### 5.3 Lançamentos

**Layout:**
```
┌─────────────────────────────────────────────┐
│ Lançamentos                     [+ Novo]    │
├─────────────────────────────────────────────┤
│ Filtros:                                    │
│ Período: [Dez/2024] Tipo: [Todos] Busca: [] │
├─────────────────────────────────────────────┤
│ Data       │ Descrição      │ Conta │ Valor │
│ 15/12/2024 │ Doação mensal  │ 6.1.1 │ +500  │
│ 14/12/2024 │ Conta de luz   │ 7.3.1 │ -250  │
│ 13/12/2024 │ Nota Fiscal    │ 6.2.1 │ +1200 │
│            │ Cidadã         │       │ [NFC] │
├─────────────────────────────────────────────┤
│ Mostrando 1-10 de 45          [1] 2 3 >     │
└─────────────────────────────────────────────┘
```

**Funcionalidades:**
- **Filtros avançados**: Período, tipo, conta, NFC
- **Busca**: Descrição ou número de documento
- **Ordenação**: Por data, valor, conta
- **Badges**: Indicadores visuais (NFC, origem)
- **Ações**: Editar, excluir, duplicar
- **Paginação**: 50 itens por página

**Dialog de Criação:**
```
┌─────────────────────────────────────────────┐
│ Novo Lançamento                             │
├─────────────────────────────────────────────┤
│ Período: [Dez/2024] ⓘ Período deve estar   │
│                         aberto              │
│                                             │
│ Tipo: ( ) Receita  (•) Despesa              │
│                                             │
│ Conta: [Selecionar conta...] ⓘ Escolha a   │
│                                 conta       │
│                                 contábil    │
│                                             │
│ Valor: [R$ 0,00] ⓘ Informe o valor em reais│
│                                             │
│ Data: [15/12/2024]                          │
│                                             │
│ Descrição: [                              ] │
│                                             │
│ ☐ Marcar como Nota Fiscal Cidadã            │
│   ( ) 70% Projeto  ( ) 30% Custeio          │
│                                             │
│ Notas: [Opcional]                           │
│                                             │
│              [Cancelar]  [Criar Lançamento] │
└─────────────────────────────────────────────┘
```

### 5.4 Períodos

**Layout:**
```
┌─────────────────────────────────────────────┐
│ Períodos Contábeis              [+ Novo]    │
├─────────────────────────────────────────────┤
│ Período      │ Status  │ Abertura │ Ações   │
│ Dez/2024     │ Aberto  │ 4.130,00 │ [Fechar]│
│ Nov/2024     │ Fechado │ 3.850,00 │ [Ver]   │
│ Out/2024     │ Fechado │ 3.200,00 │ [Ver]   │
└─────────────────────────────────────────────┘
```

**Funcionalidades:**
- **Status visual**: Badge colorido (verde=aberto, cinza=fechado)
- **Ação de fechamento**: Dialog de confirmação com validações
- **Visualização**: Resumo do período (receitas, despesas, saldo)
- **Reabertura**: Apenas admin, com justificativa

**Dialog de Fechamento:**
```
┌─────────────────────────────────────────────┐
│ Fechar Período - Dezembro/2024             │
├─────────────────────────────────────────────┤
│ ⚠️ Atenção: Esta ação impedirá novos        │
│    lançamentos neste período.               │
│                                             │
│ Resumo do Período:                          │
│ • Receitas: R$ 12.450,00                    │
│ • Despesas: R$ 8.320,00                     │
│ • Saldo: R$ 4.130,00 (Superávit)            │
│                                             │
│ Saldo de Fechamento: [R$ 4.130,00]          │
│                                             │
│ Notas: [Opcional - observações sobre o     │
│         fechamento]                         │
│                                             │
│              [Cancelar]  [Confirmar Fecham.]│
└─────────────────────────────────────────────┘
```

### 5.5 Importação de Extratos

**Wizard de 3 Etapas:**

**Etapa 1: Upload**
```
┌─────────────────────────────────────────────┐
│ Importar Extrato Bancário          [1/3]    │
├─────────────────────────────────────────────┤
│                                             │
│     ┌───────────────────────────────────┐   │
│     │        📤                         │   │
│     │   Arraste o arquivo aqui          │   │
│     │   ou clique para selecionar       │   │
│     │                                   │   │
│     │   PDF, CSV, OFX (máx. 10MB)       │   │
│     └───────────────────────────────────┘   │
│                                             │
│ Banco: [Banco do Brasil ▼]                  │
│                                             │
│                          [Cancelar] [Próx.] │
└─────────────────────────────────────────────┘
```

**Etapa 2: Revisão**
```
┌─────────────────────────────────────────────┐
│ Importar Extrato Bancário          [2/3]    │
├─────────────────────────────────────────────┤
│ Arquivo: extrato_dez_2024.pdf               │
│ Período: 01/12/2024 a 31/12/2024            │
│ Transações encontradas: 23                  │
│                                             │
│ Data  │ Descrição    │ Valor   │ Conta Sug. │
│ 15/12 │ PIX Recebido │ +500,00 │ 6.1.1      │
│ 14/12 │ Débito CEMIG │ -250,00 │ 7.3.1      │
│ 13/12 │ Transferência│ +1200   │ 6.2.1      │
│                                             │
│ ☑️ Ignorar duplicatas                        │
│ ☑️ Aplicar classificação automática          │
│                                             │
│                          [Voltar]   [Próx.] │
└─────────────────────────────────────────────┘
```

**Etapa 3: Classificação**
```
┌─────────────────────────────────────────────┐
│ Importar Extrato Bancário          [3/3]    │
├─────────────────────────────────────────────┤
│ Classifique as transações:                  │
│                                             │
│ ✅ 18 classificadas automaticamente          │
│ ⚠️  5 requerem classificação manual          │
│                                             │
│ Transação: PIX de João Silva - R$ 300,00    │
│ Conta: [Selecionar conta...] ⓘ             │
│ Tipo: (•) Receita  ( ) Despesa              │
│ ☐ Nota Fiscal Cidadã                        │
│                                             │
│ [Anterior] [Próxima] [Pular]                │
│                                             │
│                          [Cancelar] [Conc.] │
└─────────────────────────────────────────────┘
```

### 5.6 Relatórios

**Seleção de Relatório:**
```
┌─────────────────────────────────────────────┐
│ Relatórios                                  │
├─────────────────────────────────────────────┤
│ Selecione o tipo de relatório:             │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ 📊 Relatório Financeiro Mensal          │ │
│ │ Demonstrativo completo de receitas,     │ │
│ │ despesas, balanço e saldos bancários    │ │
│ │                            [Gerar PDF]  │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ 📋 Relatório Nota Fiscal Cidadã         │ │
│ │ Demonstrativo de aplicação de recursos  │ │
│ │ (70% projeto / 30% custeio)             │ │
│ │                            [Gerar PDF]  │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ 📈 Balancete Mensal                     │ │
│ │ Saldos de todas as contas no período    │ │
│ │                            [Gerar PDF]  │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

**Dialog de Configuração:**
```
┌─────────────────────────────────────────────┐
│ Relatório Financeiro Mensal                 │
├─────────────────────────────────────────────┤
│ Período:                                    │
│ ( ) Mês específico: [Dez/2024 ▼]            │
│ ( ) Trimestre: [Q4 2024 ▼]                  │
│ (•) Ano completo: [2024 ▼]                  │
│                                             │
│ Incluir:                                    │
│ ☑️ Sumário executivo                         │
│ ☑️ Demonstrativo de receitas                 │
│ ☑️ Demonstrativo de despesas                 │
│ ☑️ Balanço patrimonial                       │
│ ☑️ Saldos bancários                          │
│ ☑️ Notas explicativas                        │
│ ☑️ Gráficos e visualizações                  │
│                                             │
│ Formato: (•) PDF  ( ) Excel                 │
│                                             │
│                    [Cancelar]  [Gerar]      │
└─────────────────────────────────────────────┘
```

---

## 6. RESPONSIVIDADE

### 6.1 Breakpoints

```css
/* Mobile first approach */
/* xs: 0-639px (mobile) */
/* sm: 640px-767px (large mobile) */
/* md: 768px-1023px (tablet) */
/* lg: 1024px-1279px (desktop) */
/* xl: 1280px+ (large desktop) */
```

### 6.2 Adaptações Mobile

**Sidebar:**
- Desktop: Fixa, sempre visível (240px)
- Mobile: Drawer/Sheet, acionado por botão hamburguer

**Tabelas:**
- Desktop: Tabela completa
- Mobile: Cards empilhados com informações principais

**Formulários:**
- Desktop: Grid de 2-3 colunas
- Mobile: Single column, full width

**Stat Cards:**
- Desktop: Grid de 3-4 colunas
- Mobile: Single column, scroll horizontal (opcional)

**Exemplo de Tabela Responsiva:**
```tsx
{/* Desktop */}
<div className="hidden md:block">
  <Table>
    {/* Tabela completa */}
  </Table>
</div>

{/* Mobile */}
<div className="md:hidden space-y-4">
  {entries.map(entry => (
    <Card key={entry.id}>
      <CardHeader>
        <CardTitle className="text-base">{entry.description}</CardTitle>
        <CardDescription>
          {formatDate(entry.transactionDate)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">
            {entry.account.name}
          </span>
          <span className="text-lg font-bold">
            {formatCurrency(entry.amountCents)}
          </span>
        </div>
      </CardContent>
    </Card>
  ))}
</div>
```

---

## 7. ACESSIBILIDADE (WCAG 2.1 AA)

### 7.1 Contraste de Cores

**Mínimos Obrigatórios:**
- Texto normal: 4.5:1
- Texto grande (18px+): 3:1
- Componentes UI: 3:1

**Verificação:**
```tsx
// Usar ferramentas como:
// - WebAIM Contrast Checker
// - Chrome DevTools Lighthouse
// - axe DevTools
```

### 7.2 Navegação por Teclado

**Atalhos Globais:**
| Tecla | Ação |
|-------|------|
| `/` | Focar busca |
| `Esc` | Fechar modal/dialog |
| `Tab` | Próximo elemento |
| `Shift+Tab` | Elemento anterior |
| `Enter` | Ativar botão/link |
| `Space` | Toggle checkbox/radio |
| `Arrow keys` | Navegar em listas/menus |

**Focus Management:**
```tsx
// Focar primeiro campo ao abrir dialog
useEffect(() => {
  if (isOpen) {
    firstInputRef.current?.focus();
  }
}, [isOpen]);

// Retornar foco ao elemento que abriu o dialog
const handleClose = () => {
  setIsOpen(false);
  triggerRef.current?.focus();
};
```

### 7.3 ARIA Labels

**Exemplos:**
```tsx
// Botões sem texto
<Button variant="ghost" size="icon" aria-label="Editar lançamento">
  <Edit className="h-4 w-4" />
</Button>

// Inputs
<Label htmlFor="amount">Valor</Label>
<Input
  id="amount"
  type="number"
  aria-describedby="amount-help"
  aria-invalid={!!errors.amount}
/>
<span id="amount-help" className="text-sm text-muted-foreground">
  Informe o valor em reais
</span>

// Regiões
<main role="main" aria-label="Conteúdo principal">
  {/* ... */}
</main>

<nav role="navigation" aria-label="Navegação principal">
  {/* ... */}
</nav>
```

### 7.4 Screen Readers

**Anúncios Dinâmicos:**
```tsx
// Toast com aria-live
<div role="status" aria-live="polite" aria-atomic="true">
  {toastMessage}
</div>

// Loading state
<div role="status" aria-live="polite">
  {isLoading ? "Carregando..." : "Conteúdo carregado"}
</div>
```

---

## 8. MICRO-INTERAÇÕES

### 8.1 Animações

**Princípios:**
- **Sutis**: Não distrair do conteúdo
- **Rápidas**: 150-300ms
- **Propósito**: Indicar mudança de estado ou feedback

**Exemplos:**
```tsx
// Hover em botões
<Button className="transition-all hover:scale-105">
  Salvar
</Button>

// Fade in de conteúdo
<div className="animate-in fade-in duration-300">
  {content}
</div>

// Slide in de sidebar
<Sheet>
  <SheetContent className="animate-in slide-in-from-right duration-300">
    {/* ... */}
  </SheetContent>
</Sheet>

// Skeleton pulse
<Skeleton className="animate-pulse" />
```

### 8.2 Transições

**Estados de Carregamento:**
```tsx
// Botão com loading
<Button disabled={isPending}>
  {isPending ? (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Salvando...
    </>
  ) : (
    "Salvar"
  )}
</Button>

// Progress bar
<Progress value={progress} className="w-full" />
```

### 8.3 Feedback Tátil (Mobile)

```tsx
// Vibração ao completar ação (mobile)
const handleSuccess = () => {
  if (navigator.vibrate) {
    navigator.vibrate(50);
  }
  toast.success("Lançamento criado!");
};
```

---

## 9. FORMATAÇÃO DE DADOS

### 9.1 Valores Monetários

```typescript
// Formatação consistente
export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

// Uso
<span className="font-mono text-lg font-bold">
  {formatCurrency(entry.amountCents)}
</span>
```

**Regras:**
- Sempre em centavos no backend
- Formatado em reais no frontend
- Fonte monospace para alinhamento
- Cores semânticas (verde=positivo, vermelho=negativo)

### 9.2 Datas

```typescript
// Formatação de datas
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("pt-BR");
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("pt-BR");
}

export function formatPeriod(month: number, year: number): string {
  const date = new Date(year, month - 1);
  return date.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}
```

### 9.3 Números

```typescript
// Formatação de números
export function formatNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR").format(value);
}

// Percentuais
export function formatPercent(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100);
}
```

---

## 10. TEMAS E PERSONALIZAÇÃO

### 10.1 Tema Escuro (Futuro)

```css
.dark {
  --background: 222 47% 11%;
  --foreground: 210 40% 98%;
  
  --primary: 217 91% 60%;
  --primary-foreground: 222 47% 11%;
  
  /* ... outros tokens */
}
```

### 10.2 Customização por Organização

**Logo:**
```tsx
<img
  src={organizationSettings.logoUrl || "/default-logo.png"}
  alt={organizationSettings.name}
  className="h-8"
/>
```

**Cores (futuro):**
```tsx
// Permitir customização de cor primária
<style>
  {`:root {
    --primary: ${organizationSettings.primaryColor};
  }`}
</style>
```

---

## 11. CHECKLIST DE QUALIDADE UX

### 11.1 Antes de Lançar uma Feature

- [ ] Todos os campos têm labels claros
- [ ] Termos técnicos têm tooltips explicativos
- [ ] Validações fornecem feedback construtivo
- [ ] Estados de loading são visíveis
- [ ] Empty states são informativos e acionáveis
- [ ] Erros são tratados com mensagens claras
- [ ] Ações destrutivas pedem confirmação
- [ ] Navegação por teclado funciona
- [ ] Contraste de cores é adequado
- [ ] Responsividade mobile foi testada
- [ ] Tooltips e ajudas contextuais estão presentes
- [ ] Feedback visual para todas as ações
- [ ] Breadcrumbs ou indicação de localização
- [ ] Atalhos de teclado documentados (se aplicável)

### 11.2 Testes de Usabilidade

**Cenários Críticos:**
1. Criar primeiro lançamento (usuário novo)
2. Importar extrato bancário completo
3. Fechar período mensal
4. Gerar relatório financeiro
5. Encontrar lançamento específico (busca/filtros)

**Métricas:**
- Tempo para completar tarefa
- Taxa de erro
- Taxa de abandono
- Satisfação (escala 1-5)

---

## 12. REFERÊNCIAS E INSPIRAÇÕES

### 12.1 Design Systems
- [shadcn/ui](https://ui.shadcn.com) - Componentes base
- [Radix UI](https://www.radix-ui.com) - Primitivos acessíveis
- [TailwindCSS](https://tailwindcss.com) - Utility-first CSS

### 12.2 Inspirações de UX
- [Linear](https://linear.app) - Simplicidade e performance
- [Notion](https://notion.so) - Hierarquia e organização
- [Stripe Dashboard](https://dashboard.stripe.com) - Clareza financeira
- [Revolut](https://revolut.com) - UX financeiro moderno

### 12.3 Acessibilidade
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [A11y Project](https://www.a11yproject.com)
- [WebAIM](https://webaim.org)

---

**Documento elaborado em:** Dezembro 2024  
**Versão:** 1.0  
**Autor:** Manus AI  
**Referência Estética:** Revolut, Linear, Stripe
