# Arquitetura de Dados Alvo - CentrOS

> **Versão**: 1.0  
> **Data**: 2025-12-23  
> **Status**: Design (não implementado)

## 1. Visão Geral

### 1.1 Objetivos

1. **Multiempresa nativo** - Suporte a múltiplas organizações no mesmo banco
2. **Modularidade** - Separação clara entre Core, Financeiro, Contábil, Patrimônio, Governança
3. **Extensibilidade** - Extensões por vertical (Centro Espírita, Fintech) sem poluir o core
4. **Integridade referencial** - FKs em todas as relações
5. **Auditabilidade** - Trilha completa de alterações
6. **Imutabilidade contábil** - Lançamentos não editáveis após efetivação

### 1.2 Princípios de Design

| Princípio | Implementação |
|-----------|---------------|
| **UUID v7 para PKs** | `gen_random_uuid()` (Postgres 17) - ordenável por tempo |
| **Multiempresa** | `organization_id UUID NOT NULL` em entidades de negócio |
| **Soft Delete** | `deleted_at timestamptz` onde aplicável |
| **Audit Trail** | `created_at`, `updated_at`, `created_by`, `updated_by` |
| **Timestamps UTC** | `timestamp with time zone` sempre |
| **Valores Monetários** | `numeric(14,2)` - 14 dígitos, 2 decimais |
| **Enums Tipados** | PostgreSQL ENUMs para domínios fechados |
| **Índices Compostos** | `(organization_id, ...)` para queries por tenant |

---

## 2. Arquitetura Modular

### 2.1 Diagrama de Módulos

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CORE (Agnóstico)                               │
├─────────────────────────────────────────────────────────────────────────────┤
│  organizations  │  users  │  persons  │  roles  │  permissions  │  audit   │
│  addresses      │  contacts│ documents │ configurations                     │
└─────────────────────────────────────────────────────────────────────────────┘
          │                    │                    │
          ▼                    ▼                    ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│    FINANCEIRO    │  │   CONTABILIDADE  │  │   PATRIMÔNIO     │
├──────────────────┤  ├──────────────────┤  ├──────────────────┤
│ financial_accts  │  │ chart_of_accounts│  │ fixed_assets     │
│ bank_statements  │  │ accounting_periods│ │ depreciation     │
│ statement_lines  │  │ journal_entries  │  │ asset_transfers  │
│ receivables_pay  │  │ journal_lines    │  │                  │
│ payments         │  │ period_balances  │  │                  │
│ reconciliations  │  │                  │  │                  │
│ attachments      │  │                  │  │                  │
└──────────────────┘  └──────────────────┘  └──────────────────┘
          │                    │                    │
          └────────────────────┼────────────────────┘
                               │
                               ▼
               ┌──────────────────────────────┐
               │    PROJETOS/FUNDOS           │
               ├──────────────────────────────┤
               │ cost_centers │ projects      │
               │ funds        │ fund_movements│
               └──────────────────────────────┘
                               │
          ┌────────────────────┼────────────────────┐
          ▼                                         ▼
┌──────────────────────────┐          ┌──────────────────────────┐
│   EXT: CENTRO ESPÍRITA   │          │    EXT: FINTECH          │
├──────────────────────────┤          ├──────────────────────────┤
│ ext_center_members       │          │ ext_fintech_products     │
│ ext_center_study_groups  │          │ ext_fintech_subscriptions│
│ ext_center_mediumship    │          │ ext_fintech_invoices     │
│ ext_center_donations     │          │ ext_fintech_customers    │
└──────────────────────────┘          └──────────────────────────┘
```

### 2.2 Convenção de Nomenclatura

| Tipo | Convenção | Exemplo |
|------|-----------|---------|
| Tabelas Core | `snake_case` singular | `person`, `financial_account` |
| Tabelas Extensão | `ext_{vertical}_{entity}` | `ext_center_member` |
| PKs | `id` (UUID) | `id uuid PRIMARY KEY` |
| FKs | `{entity}_id` | `person_id`, `organization_id` |
| Timestamps | `{action}_at` | `created_at`, `deleted_at` |
| Booleans | `is_{adjective}` ou `{adjective}` | `active`, `is_reconciled` |
| Enums | `{entity}_{field}` | `person_type`, `payment_method` |
| Índices | `idx_{table}_{columns}` | `idx_person_org_active` |

---

## 3. Modelo Core

### 3.1 Organizations (Multiempresa)

```sql
CREATE TYPE organization_type AS ENUM ('spiritist_center', 'fintech', 'generic');

CREATE TABLE organizations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code varchar(20) NOT NULL UNIQUE,
    name varchar(255) NOT NULL,
    legal_name varchar(255),
    tax_id varchar(20),  -- CNPJ
    org_type organization_type NOT NULL,
    
    -- Endereço
    address_line text,
    city varchar(100),
    state varchar(2),
    postal_code varchar(10),
    country varchar(2) DEFAULT 'BR',
    
    -- Contato
    phone varchar(20),
    email varchar(320),
    website varchar(255),
    
    -- Configurações
    fiscal_year_start_month integer DEFAULT 1,
    accounting_method varchar(20) DEFAULT 'accrual', -- accrual, cash
    currency varchar(3) DEFAULT 'BRL',
    timezone varchar(50) DEFAULT 'America/Sao_Paulo',
    
    -- Audit
    active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_org_type ON organizations(org_type);
CREATE INDEX idx_org_active ON organizations(active);
```

### 3.2 Users (Unificado)

```sql
CREATE TABLE users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id),
    
    -- Autenticação
    auth_provider_id varchar(100) NOT NULL,
    email varchar(320) NOT NULL,
    
    -- Perfil
    name varchar(255) NOT NULL,
    avatar_url text,
    
    -- Status
    active boolean NOT NULL DEFAULT true,
    email_verified boolean NOT NULL DEFAULT false,
    last_login_at timestamptz,
    
    -- Audit
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid,
    updated_at timestamptz NOT NULL DEFAULT now(),
    updated_by uuid,
    
    UNIQUE(organization_id, email)
);

CREATE INDEX idx_user_org ON users(organization_id);
CREATE INDEX idx_user_auth ON users(auth_provider_id);
CREATE INDEX idx_user_active ON users(organization_id, active);
```

### 3.3 Persons (Agnóstico)

```sql
CREATE TYPE person_type AS ENUM ('individual', 'company');

CREATE TABLE persons (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id),
    
    person_type person_type NOT NULL,
    name varchar(255) NOT NULL,
    legal_name varchar(255),  -- Razão social (PJ)
    tax_id varchar(20),       -- CPF ou CNPJ
    
    -- Status
    active boolean NOT NULL DEFAULT true,
    notes text,
    
    -- Soft delete
    deleted_at timestamptz,
    
    -- Audit
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid,
    updated_at timestamptz NOT NULL DEFAULT now(),
    updated_by uuid
);

CREATE INDEX idx_person_org ON persons(organization_id);
CREATE INDEX idx_person_type ON persons(organization_id, person_type);
CREATE INDEX idx_person_tax ON persons(organization_id, tax_id);
CREATE INDEX idx_person_active ON persons(organization_id, active) WHERE deleted_at IS NULL;
```

### 3.4 RBAC (Roles e Permissions)

```sql
CREATE TABLE roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid REFERENCES organizations(id), -- NULL = role global
    
    code varchar(50) NOT NULL,
    name varchar(100) NOT NULL,
    description text,
    level integer NOT NULL DEFAULT 0,  -- Hierarquia
    
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    
    UNIQUE(organization_id, code)
);

CREATE TABLE permissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code varchar(100) NOT NULL UNIQUE,
    name varchar(200) NOT NULL,
    module varchar(50) NOT NULL,
    description text
);

CREATE TABLE role_permissions (
    role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id uuid NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE user_roles (
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    granted_at timestamptz NOT NULL DEFAULT now(),
    granted_by uuid,
    expires_at timestamptz,
    PRIMARY KEY (user_id, role_id)
);
```

---

## 4. Modelo Financeiro

### 4.1 Financial Accounts

```sql
CREATE TYPE financial_account_type AS ENUM (
    'cash', 'checking', 'savings', 'investment', 'credit_card'
);

CREATE TABLE financial_accounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id),
    
    account_type financial_account_type NOT NULL,
    name varchar(100) NOT NULL,
    
    -- Dados bancários (quando aplicável)
    bank_code varchar(10),
    bank_name varchar(100),
    agency varchar(20),
    account_number varchar(30),
    account_digit varchar(5),
    
    -- PIX
    pix_key varchar(100),
    pix_key_type varchar(20),  -- cpf, cnpj, email, phone, random
    
    -- Vínculo contábil
    ledger_account_id uuid,  -- FK para chart_of_accounts
    
    -- Saldo inicial
    opening_balance numeric(14,2) NOT NULL DEFAULT 0,
    opening_balance_date date NOT NULL,
    
    -- Status
    active boolean NOT NULL DEFAULT true,
    
    -- Audit
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid,
    updated_at timestamptz NOT NULL DEFAULT now(),
    updated_by uuid
);

CREATE INDEX idx_fin_acct_org ON financial_accounts(organization_id);
CREATE INDEX idx_fin_acct_type ON financial_accounts(organization_id, account_type);
CREATE INDEX idx_fin_acct_active ON financial_accounts(organization_id, active);
```

### 4.2 Receivables/Payables (Títulos)

```sql
CREATE TYPE receivable_payable_direction AS ENUM ('in', 'out');  -- receber, pagar
CREATE TYPE receivable_payable_status AS ENUM (
    'draft', 'pending', 'approved', 'partial', 'paid', 'cancelled', 'overdue'
);
CREATE TYPE receivable_payable_nature AS ENUM (
    'contribution', 'donation', 'event', 'agreement', 'service',
    'utility', 'tax', 'fee', 'material', 'other'
);

CREATE TABLE receivables_payables (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id),
    
    -- Classificação
    direction receivable_payable_direction NOT NULL,
    nature receivable_payable_nature NOT NULL,
    
    -- Pessoa
    person_id uuid REFERENCES persons(id),
    
    -- Descrição
    description varchar(500) NOT NULL,
    
    -- Valores
    original_amount numeric(14,2) NOT NULL,
    discount_amount numeric(14,2) NOT NULL DEFAULT 0,
    addition_amount numeric(14,2) NOT NULL DEFAULT 0,
    net_amount numeric(14,2) NOT NULL,
    
    -- Datas
    issue_date date NOT NULL,
    accrual_date date NOT NULL,  -- Competência
    due_date date NOT NULL,
    
    -- Documento
    document_number varchar(100),
    document_series varchar(20),
    
    -- Parcelamento
    installment_number integer,
    total_installments integer,
    parent_id uuid REFERENCES receivables_payables(id),
    
    -- Classificação gerencial
    cost_center_id uuid,  -- FK cost_centers
    project_id uuid,      -- FK projects
    fund_id uuid,         -- FK funds
    ledger_account_id uuid,  -- FK chart_of_accounts
    
    -- Fluxo de aprovação
    status receivable_payable_status NOT NULL DEFAULT 'draft',
    approved_by uuid,
    approved_at timestamptz,
    
    -- Notas
    notes text,
    
    -- Importação
    source_system varchar(50),
    import_batch_id uuid,
    
    -- Soft delete
    deleted_at timestamptz,
    
    -- Audit
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid,
    updated_at timestamptz NOT NULL DEFAULT now(),
    updated_by uuid,
    
    -- Constraints
    CONSTRAINT chk_positive_amounts CHECK (original_amount > 0 AND net_amount > 0)
);

CREATE INDEX idx_rp_org ON receivables_payables(organization_id);
CREATE INDEX idx_rp_direction ON receivables_payables(organization_id, direction);
CREATE INDEX idx_rp_status ON receivables_payables(organization_id, status);
CREATE INDEX idx_rp_due ON receivables_payables(organization_id, due_date);
CREATE INDEX idx_rp_accrual ON receivables_payables(organization_id, accrual_date);
CREATE INDEX idx_rp_person ON receivables_payables(person_id);
```

### 4.3 Payments (Baixas)

```sql
CREATE TYPE payment_method AS ENUM (
    'cash', 'pix', 'wire', 'doc', 'boleto', 'debit', 'credit', 'check'
);

CREATE TABLE payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    receivable_payable_id uuid NOT NULL REFERENCES receivables_payables(id),
    financial_account_id uuid NOT NULL REFERENCES financial_accounts(id),
    
    -- Pagamento
    payment_date date NOT NULL,
    amount_paid numeric(14,2) NOT NULL,
    interest_amount numeric(14,2) NOT NULL DEFAULT 0,
    fine_amount numeric(14,2) NOT NULL DEFAULT 0,
    discount_amount numeric(14,2) NOT NULL DEFAULT 0,
    
    payment_method payment_method NOT NULL,
    reference_document varchar(100),
    
    -- Estorno
    is_reversal boolean NOT NULL DEFAULT false,
    reversal_reason text,
    reverses_payment_id uuid REFERENCES payments(id),
    
    -- Vínculo contábil
    journal_entry_id uuid,  -- FK journal_entries
    
    -- Notas
    notes text,
    
    -- Audit
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid,
    updated_at timestamptz NOT NULL DEFAULT now(),
    updated_by uuid,
    
    CONSTRAINT chk_positive_payment CHECK (amount_paid > 0)
);

CREATE INDEX idx_payment_rp ON payments(receivable_payable_id);
CREATE INDEX idx_payment_date ON payments(payment_date);
CREATE INDEX idx_payment_acct ON payments(financial_account_id);
```

---

## 5. Modelo Contábil

### 5.1 Chart of Accounts (Plano de Contas)

```sql
CREATE TYPE account_category AS ENUM (
    'asset', 'liability', 'equity', 'revenue', 'expense'
);
CREATE TYPE account_balance_type AS ENUM ('debit', 'credit');
CREATE TYPE account_classification AS ENUM ('synthetic', 'analytical');

CREATE TABLE chart_of_accounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id),
    
    code varchar(20) NOT NULL,
    name varchar(255) NOT NULL,
    
    category account_category NOT NULL,
    balance_type account_balance_type NOT NULL,
    classification account_classification NOT NULL,
    
    level integer NOT NULL,
    parent_id uuid REFERENCES chart_of_accounts(id),
    
    allows_entries boolean NOT NULL,  -- Apenas analíticas
    active boolean NOT NULL DEFAULT true,
    
    description text,
    tags text[],
    
    -- Soft delete
    deleted_at timestamptz,
    
    -- Audit
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid,
    updated_at timestamptz NOT NULL DEFAULT now(),
    updated_by uuid,
    
    UNIQUE(organization_id, code)
);

CREATE INDEX idx_coa_org ON chart_of_accounts(organization_id);
CREATE INDEX idx_coa_parent ON chart_of_accounts(parent_id);
CREATE INDEX idx_coa_category ON chart_of_accounts(organization_id, category);
CREATE INDEX idx_coa_analytical ON chart_of_accounts(organization_id, classification) 
    WHERE classification = 'analytical';
```

### 5.2 Accounting Periods

```sql
CREATE TYPE period_status AS ENUM ('open', 'review', 'closed', 'reopened');

CREATE TABLE accounting_periods (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id),
    
    year integer NOT NULL,
    month integer NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    
    status period_status NOT NULL DEFAULT 'open',
    
    -- Fechamento
    closed_by uuid,
    closed_at timestamptz,
    
    -- Reabertura
    reopened_by uuid,
    reopened_at timestamptz,
    reopen_reason text,
    
    notes text,
    
    -- Audit
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid,
    updated_at timestamptz NOT NULL DEFAULT now(),
    updated_by uuid,
    
    UNIQUE(organization_id, year, month)
);

CREATE INDEX idx_period_org ON accounting_periods(organization_id);
CREATE INDEX idx_period_status ON accounting_periods(organization_id, status);
CREATE INDEX idx_period_dates ON accounting_periods(organization_id, start_date, end_date);
```

### 5.3 Journal Entries (Partidas Dobradas)

```sql
CREATE TYPE journal_origin AS ENUM (
    'manual', 'payment', 'bank_statement', 'depreciation', 'closing', 'adjustment'
);
CREATE TYPE journal_status AS ENUM ('draft', 'posted', 'reversed');
CREATE TYPE journal_line_type AS ENUM ('debit', 'credit');

CREATE TABLE journal_entries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id),
    
    entry_number serial NOT NULL,
    period_id uuid NOT NULL REFERENCES accounting_periods(id),
    
    entry_date date NOT NULL,
    accrual_date date NOT NULL,
    
    memo text NOT NULL,
    document_ref varchar(100),
    
    -- Origem
    origin journal_origin NOT NULL,
    origin_id uuid,  -- ID da entidade origem
    
    -- Status
    status journal_status NOT NULL DEFAULT 'draft',
    
    -- Estorno
    reverses_entry_id uuid REFERENCES journal_entries(id),
    
    -- Totais (denormalizados para validação)
    total_debit numeric(14,2) NOT NULL,
    total_credit numeric(14,2) NOT NULL,
    
    -- Audit
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid,
    updated_at timestamptz NOT NULL DEFAULT now(),
    updated_by uuid,
    
    -- Constraint: débito = crédito
    CONSTRAINT chk_balanced CHECK (total_debit = total_credit),
    
    UNIQUE(organization_id, entry_number)
);

CREATE TABLE journal_lines (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    journal_entry_id uuid NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
    
    line_order integer NOT NULL,
    account_id uuid NOT NULL REFERENCES chart_of_accounts(id),
    
    line_type journal_line_type NOT NULL,
    amount numeric(14,2) NOT NULL,
    
    memo text,
    
    -- Classificação gerencial
    cost_center_id uuid,
    project_id uuid,
    fund_id uuid,
    
    CONSTRAINT chk_positive_amount CHECK (amount > 0),
    UNIQUE(journal_entry_id, line_order)
);

CREATE INDEX idx_je_org ON journal_entries(organization_id);
CREATE INDEX idx_je_period ON journal_entries(period_id);
CREATE INDEX idx_je_date ON journal_entries(organization_id, entry_date);
CREATE INDEX idx_je_origin ON journal_entries(origin, origin_id);
CREATE INDEX idx_je_status ON journal_entries(organization_id, status);

CREATE INDEX idx_jl_entry ON journal_lines(journal_entry_id);
CREATE INDEX idx_jl_account ON journal_lines(account_id);
```

---

## 6. Extensões por Vertical

### 6.1 Extensão Centro Espírita

```sql
-- Associados (Membros)
CREATE TYPE member_status AS ENUM ('active', 'suspended', 'inactive', 'deceased');
CREATE TYPE member_category AS ENUM (
    'worker', 'attendee', 'honorary', 'medium', 'healer', 
    'study_leader', 'youth_worker', 'assisted'
);
CREATE TYPE contribution_periodicity AS ENUM ('monthly', 'quarterly', 'semiannual', 'annual');

CREATE TABLE ext_center_members (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id uuid NOT NULL UNIQUE REFERENCES persons(id),
    
    registration_number varchar(20),
    admission_date date NOT NULL,
    departure_date date,
    
    status member_status NOT NULL,
    category member_category NOT NULL,
    
    -- Contribuição
    suggested_contribution numeric(14,2),
    contribution_periodicity contribution_periodicity NOT NULL DEFAULT 'monthly',
    contribution_due_day integer,
    is_exempt boolean NOT NULL DEFAULT false,
    exemption_reason text,
    
    -- Audit
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid,
    updated_at timestamptz NOT NULL DEFAULT now(),
    updated_by uuid
);

-- Grupos de Estudo
CREATE TABLE ext_center_study_groups (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id),
    
    name varchar(100) NOT NULL,
    description text,
    weekday integer,  -- 0=Sun, 6=Sat
    time varchar(10),
    room varchar(50),
    
    leader_person_id uuid REFERENCES persons(id),
    current_book varchar(200),
    
    active boolean NOT NULL DEFAULT true,
    
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid,
    updated_at timestamptz NOT NULL DEFAULT now(),
    updated_by uuid
);

-- Perfis de Mediunidade
CREATE TABLE ext_center_mediumship_profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id uuid NOT NULL UNIQUE REFERENCES persons(id),
    
    mediumship_types text[],  -- Array de tipos
    development_start_date date,
    study_group_id uuid REFERENCES ext_center_study_groups(id),
    notes text,
    
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid,
    updated_at timestamptz NOT NULL DEFAULT now(),
    updated_by uuid
);
```

### 6.2 Extensão Fintech (Estrutura Básica)

```sql
-- Produtos/Serviços
CREATE TABLE ext_fintech_products (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id),
    
    sku varchar(50) NOT NULL,
    name varchar(200) NOT NULL,
    description text,
    
    unit_price numeric(14,2) NOT NULL,
    is_recurring boolean NOT NULL DEFAULT false,
    billing_period varchar(20),  -- monthly, yearly
    
    active boolean NOT NULL DEFAULT true,
    
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    
    UNIQUE(organization_id, sku)
);

-- Clientes (extensão de persons)
CREATE TABLE ext_fintech_customers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id uuid NOT NULL UNIQUE REFERENCES persons(id),
    
    customer_since date NOT NULL,
    credit_limit numeric(14,2),
    payment_terms integer DEFAULT 30,  -- dias
    
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Assinaturas
CREATE TABLE ext_fintech_subscriptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id),
    customer_id uuid NOT NULL REFERENCES ext_fintech_customers(id),
    product_id uuid NOT NULL REFERENCES ext_fintech_products(id),
    
    status varchar(20) NOT NULL,  -- active, cancelled, suspended
    start_date date NOT NULL,
    end_date date,
    next_billing_date date,
    
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
```

---

## 7. Triggers e Constraints

### 7.1 Imutabilidade Contábil

```sql
-- Impedir edição de lançamentos efetivados
CREATE OR REPLACE FUNCTION prevent_posted_entry_update()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status = 'posted' AND NEW.status != 'reversed' THEN
        RAISE EXCEPTION 'Cannot modify posted journal entry. Use reversal instead.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_posted_entry_update
    BEFORE UPDATE ON journal_entries
    FOR EACH ROW
    EXECUTE FUNCTION prevent_posted_entry_update();

-- Impedir lançamentos em período fechado
CREATE OR REPLACE FUNCTION check_period_open()
RETURNS TRIGGER AS $$
DECLARE
    period_status period_status;
BEGIN
    SELECT status INTO period_status 
    FROM accounting_periods 
    WHERE id = NEW.period_id;
    
    IF period_status NOT IN ('open', 'reopened') THEN
        RAISE EXCEPTION 'Cannot create entries in closed period';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_period_open
    BEFORE INSERT ON journal_entries
    FOR EACH ROW
    EXECUTE FUNCTION check_period_open();
```

### 7.2 Audit Trail Automático

```sql
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_events (
        user_id,
        entity_type,
        entity_id,
        action,
        old_data,
        new_data,
        created_at
    ) VALUES (
        current_setting('app.current_user_id', true)::uuid,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        TG_OP,
        CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) END,
        now()
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Aplicar em tabelas críticas
CREATE TRIGGER audit_journal_entries
    AFTER INSERT OR UPDATE OR DELETE ON journal_entries
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_receivables_payables
    AFTER INSERT OR UPDATE OR DELETE ON receivables_payables
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_payments
    AFTER INSERT OR UPDATE OR DELETE ON payments
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
```

---

## 8. Índices de Performance

### 8.1 Índices Compostos para Multiempresa

```sql
-- Queries mais comuns incluem organization_id
CREATE INDEX idx_rp_org_status_due ON receivables_payables(organization_id, status, due_date);
CREATE INDEX idx_rp_org_direction_accrual ON receivables_payables(organization_id, direction, accrual_date);
CREATE INDEX idx_je_org_period_status ON journal_entries(organization_id, period_id, status);
CREATE INDEX idx_coa_org_category_active ON chart_of_accounts(organization_id, category, active);
```

### 8.2 Índices Parciais

```sql
-- Apenas registros ativos/não deletados
CREATE INDEX idx_person_active_only ON persons(organization_id, name) 
    WHERE active = true AND deleted_at IS NULL;

CREATE INDEX idx_rp_open_only ON receivables_payables(organization_id, due_date) 
    WHERE status IN ('pending', 'approved', 'partial') AND deleted_at IS NULL;

CREATE INDEX idx_coa_analytical_only ON chart_of_accounts(organization_id, code) 
    WHERE classification = 'analytical' AND active = true;
```

---

## 9. Considerações de Migração

### 9.1 Estratégia

1. **Criar novas tabelas** sem remover antigas
2. **Migrar dados** com scripts validados
3. **Dual-write temporário** durante transição
4. **Deprecar tabelas antigas** após validação
5. **Drop final** após período de quarentena

### 9.2 Mapeamento Legacy → Novo

| Tabela Legacy | Tabela Nova | Transformação |
|---------------|-------------|---------------|
| `users` + `usuario` | `users` | Unificar, adicionar `organization_id` |
| `accounts` | `chart_of_accounts` | Converter tipos, adicionar `organization_id` |
| `entries` | `journal_entries` + `journal_lines` | Normalizar partidas |
| `periods` | `accounting_periods` | Converter status enum |
| `organization_settings` | `organizations` | Expandir campos |
| `pessoa` | `persons` + `ext_center_mediumship_profiles` | Separar campos espíritas |

