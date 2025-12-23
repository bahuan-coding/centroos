# Plano de Migrações - CentrOS

> **Data**: 2025-12-23  
> **Status**: Planejamento (não executar)

## 1. Visão Geral

### 1.1 Estrutura de Pastas Proposta

```
migrations/
├── 00-core/                    # Infraestrutura base
├── 01-identity/                # Pessoas e autenticação
├── 02-finance/                 # Financeiro (contas, títulos, pagamentos)
├── 03-accounting/              # Contabilidade (plano, lançamentos, períodos)
├── 04-assets/                  # Patrimônio
├── 05-governance/              # RBAC, auditoria
├── 06-projects/                # Centros de custo, projetos, fundos
├── extensions/
│   ├── center/                 # Específico Centro Espírita
│   └── fintech/                # Específico Fintech
└── data-migration/             # Migração de dados legacy
```

### 1.2 Convenção de Nomenclatura

```
YYYYMMDD_HHMMSS_<sequencia>_<descricao>.sql

Exemplo:
20251223_100000_001_create_organizations.sql
20251223_100000_002_create_users.sql
```

### 1.3 Dependências entre Módulos

```
┌──────────┐
│  00-core │ ← Base para todos
└────┬─────┘
     │
     ├─────────────────────────────────────────────────┐
     ▼                                                 ▼
┌──────────┐                                    ┌────────────┐
│01-identity│                                    │05-governance│
└────┬─────┘                                    └─────┬──────┘
     │                                                 │
     ├──────────────────────────┐                      │
     ▼                          ▼                      ▼
┌──────────┐              ┌────────────┐        ┌────────────┐
│02-finance│              │ 06-projects│        │(cross-refs)│
└────┬─────┘              └─────┬──────┘        └────────────┘
     │                          │
     ▼                          │
┌──────────┐                    │
│03-accounting│ ◄───────────────┘
└────┬─────┘
     │
     ▼
┌──────────┐
│04-assets │
└──────────┘
     │
     ▼
┌──────────────────┐
│ extensions/center│
│ extensions/fintech│
└──────────────────┘
```

---

## 2. Módulo 00-core

### M00-001: Create Organizations

**Arquivo**: `migrations/00-core/20251223_100000_001_create_organizations.sql`

```sql
-- Migration: M00-001
-- Objetivo: Criar tabela de organizações (multiempresa)
-- Dependências: Nenhuma

-- Enums
CREATE TYPE organization_type AS ENUM (
    'spiritist_center',
    'fintech', 
    'generic'
);

-- Tabela
CREATE TABLE organizations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code varchar(20) NOT NULL,
    name varchar(255) NOT NULL,
    legal_name varchar(255),
    tax_id varchar(20),
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
    fiscal_year_start_month integer NOT NULL DEFAULT 1,
    accounting_method varchar(20) NOT NULL DEFAULT 'accrual',
    currency varchar(3) NOT NULL DEFAULT 'BRL',
    timezone varchar(50) NOT NULL DEFAULT 'America/Sao_Paulo',
    
    -- Status
    active boolean NOT NULL DEFAULT true,
    
    -- Audit
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    
    CONSTRAINT organizations_code_unique UNIQUE (code),
    CONSTRAINT organizations_tax_id_unique UNIQUE (tax_id)
);

-- Índices
CREATE INDEX idx_organizations_type ON organizations(org_type);
CREATE INDEX idx_organizations_active ON organizations(active);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comentários
COMMENT ON TABLE organizations IS 'Organizações/empresas no sistema multiempresa';
COMMENT ON COLUMN organizations.org_type IS 'Tipo: spiritist_center, fintech, generic';
COMMENT ON COLUMN organizations.accounting_method IS 'Regime: accrual (competência) ou cash (caixa)';
```

---

### M00-002: Create Configurations

**Arquivo**: `migrations/00-core/20251223_100000_002_create_configurations.sql`

```sql
-- Migration: M00-002
-- Objetivo: Criar tabela de configurações por organização
-- Dependências: M00-001

CREATE TABLE configurations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    category varchar(50) NOT NULL,
    key varchar(100) NOT NULL,
    value jsonb NOT NULL,
    description text,
    
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    
    CONSTRAINT configurations_org_key_unique UNIQUE (organization_id, category, key)
);

CREATE INDEX idx_configurations_org ON configurations(organization_id);
CREATE INDEX idx_configurations_category ON configurations(organization_id, category);

CREATE TRIGGER trg_configurations_updated_at
    BEFORE UPDATE ON configurations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE configurations IS 'Configurações JSON por organização e categoria';
```

---

## 3. Módulo 01-identity

### M01-001: Create Users

**Arquivo**: `migrations/01-identity/20251223_110000_001_create_users.sql`

```sql
-- Migration: M01-001
-- Objetivo: Criar tabela de usuários unificada
-- Dependências: M00-001

CREATE TABLE users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
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
    
    CONSTRAINT users_org_email_unique UNIQUE (organization_id, email),
    CONSTRAINT users_auth_unique UNIQUE (auth_provider_id)
);

CREATE INDEX idx_users_org ON users(organization_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_active ON users(organization_id, active);

-- Self-reference FKs (após tabela criada)
ALTER TABLE users ADD CONSTRAINT users_created_by_fk 
    FOREIGN KEY (created_by) REFERENCES users(id);
ALTER TABLE users ADD CONSTRAINT users_updated_by_fk 
    FOREIGN KEY (updated_by) REFERENCES users(id);

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE users IS 'Usuários do sistema (auth delegada a provider externo)';
```

---

### M01-002: Create Persons and Related

**Arquivo**: `migrations/01-identity/20251223_110000_002_create_persons.sql`

```sql
-- Migration: M01-002
-- Objetivo: Criar tabelas de pessoas (core agnóstico)
-- Dependências: M01-001

-- Enums
CREATE TYPE person_type AS ENUM ('individual', 'company');
CREATE TYPE address_type AS ENUM ('residential', 'commercial', 'mailing');
CREATE TYPE contact_type AS ENUM ('email', 'phone', 'mobile', 'whatsapp');
CREATE TYPE document_type AS ENUM ('cpf', 'cnpj', 'rg', 'ie', 'im');

-- Tabela principal
CREATE TABLE persons (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    person_type person_type NOT NULL,
    name varchar(255) NOT NULL,
    legal_name varchar(255),
    tax_id varchar(20),
    
    active boolean NOT NULL DEFAULT true,
    notes text,
    
    deleted_at timestamptz,
    
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid REFERENCES users(id),
    updated_at timestamptz NOT NULL DEFAULT now(),
    updated_by uuid REFERENCES users(id)
);

CREATE INDEX idx_persons_org ON persons(organization_id);
CREATE INDEX idx_persons_type ON persons(organization_id, person_type);
CREATE INDEX idx_persons_tax ON persons(organization_id, tax_id);
CREATE INDEX idx_persons_name ON persons(organization_id, name);
CREATE INDEX idx_persons_active ON persons(organization_id, active) WHERE deleted_at IS NULL;

-- Endereços
CREATE TABLE person_addresses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id uuid NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
    
    address_type address_type NOT NULL,
    street varchar(255) NOT NULL,
    number varchar(20),
    complement varchar(100),
    neighborhood varchar(100),
    city varchar(100) NOT NULL,
    state varchar(2) NOT NULL,
    postal_code varchar(10),
    
    is_primary boolean NOT NULL DEFAULT false,
    
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_person_addresses_person ON person_addresses(person_id);

-- Contatos
CREATE TABLE person_contacts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id uuid NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
    
    contact_type contact_type NOT NULL,
    value varchar(320) NOT NULL,
    
    is_primary boolean NOT NULL DEFAULT false,
    is_verified boolean NOT NULL DEFAULT false,
    
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_person_contacts_person ON person_contacts(person_id);

-- Documentos
CREATE TABLE person_documents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id uuid NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
    
    document_type document_type NOT NULL,
    number varchar(30) NOT NULL,
    
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    
    CONSTRAINT person_documents_unique UNIQUE (person_id, document_type)
);

CREATE INDEX idx_person_documents_person ON person_documents(person_id);

-- Triggers
CREATE TRIGGER trg_persons_updated_at
    BEFORE UPDATE ON persons
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_person_addresses_updated_at
    BEFORE UPDATE ON person_addresses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_person_contacts_updated_at
    BEFORE UPDATE ON person_contacts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_person_documents_updated_at
    BEFORE UPDATE ON person_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

---

## 4. Módulo 02-finance

### M02-001: Create Financial Accounts

**Arquivo**: `migrations/02-finance/20251223_120000_001_create_financial_accounts.sql`

```sql
-- Migration: M02-001
-- Objetivo: Criar tabela de contas financeiras
-- Dependências: M00-001, M01-001

-- Enum
CREATE TYPE financial_account_type AS ENUM (
    'cash', 'checking', 'savings', 'investment', 'credit_card'
);

CREATE TABLE financial_accounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    account_type financial_account_type NOT NULL,
    name varchar(100) NOT NULL,
    
    -- Dados bancários
    bank_code varchar(10),
    bank_name varchar(100),
    agency varchar(20),
    account_number varchar(30),
    account_digit varchar(5),
    
    -- PIX
    pix_key varchar(100),
    pix_key_type varchar(20),
    
    -- Saldo inicial
    opening_balance numeric(14,2) NOT NULL DEFAULT 0,
    opening_balance_date date NOT NULL,
    
    -- Vínculo contábil (FK adicionada em M03)
    ledger_account_id uuid,
    
    -- Status
    active boolean NOT NULL DEFAULT true,
    
    -- Audit
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid REFERENCES users(id),
    updated_at timestamptz NOT NULL DEFAULT now(),
    updated_by uuid REFERENCES users(id)
);

CREATE INDEX idx_fin_accts_org ON financial_accounts(organization_id);
CREATE INDEX idx_fin_accts_type ON financial_accounts(organization_id, account_type);
CREATE INDEX idx_fin_accts_active ON financial_accounts(organization_id, active);

CREATE TRIGGER trg_financial_accounts_updated_at
    BEFORE UPDATE ON financial_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

---

### M02-002: Create Bank Statements

**Arquivo**: `migrations/02-finance/20251223_120000_002_create_bank_statements.sql`

```sql
-- Migration: M02-002
-- Objetivo: Criar tabelas de extratos bancários
-- Dependências: M02-001

-- Enums
CREATE TYPE file_type AS ENUM ('ofx', 'csv', 'txt', 'pdf');
CREATE TYPE statement_status AS ENUM ('pending', 'processing', 'processed', 'error');
CREATE TYPE movement_type AS ENUM ('credit', 'debit');
CREATE TYPE line_status AS ENUM ('pending', 'reconciled', 'ignored', 'duplicate');

CREATE TABLE bank_statements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    financial_account_id uuid NOT NULL REFERENCES financial_accounts(id) ON DELETE CASCADE,
    
    file_name varchar(255) NOT NULL,
    file_type file_type NOT NULL,
    file_url text,
    file_hash varchar(64) NOT NULL,
    
    start_date date,
    end_date date,
    opening_balance numeric(14,2),
    closing_balance numeric(14,2),
    
    total_lines integer NOT NULL DEFAULT 0,
    reconciled_lines integer NOT NULL DEFAULT 0,
    
    status statement_status NOT NULL DEFAULT 'pending',
    error_message text,
    
    imported_by uuid NOT NULL REFERENCES users(id),
    imported_at timestamptz NOT NULL DEFAULT now(),
    
    CONSTRAINT bank_statements_hash_unique UNIQUE (financial_account_id, file_hash)
);

CREATE INDEX idx_bank_statements_acct ON bank_statements(financial_account_id);
CREATE INDEX idx_bank_statements_status ON bank_statements(status);

CREATE TABLE statement_lines (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_statement_id uuid NOT NULL REFERENCES bank_statements(id) ON DELETE CASCADE,
    
    transaction_date date NOT NULL,
    posting_date date,
    
    line_type movement_type NOT NULL,
    amount numeric(14,2) NOT NULL,
    
    original_description text NOT NULL,
    normalized_description text,
    
    transaction_code varchar(50),
    bank_transaction_type varchar(50),
    reference_document varchar(100),
    
    status line_status NOT NULL DEFAULT 'pending',
    ignore_reason text,
    
    CONSTRAINT statement_lines_amount_positive CHECK (amount > 0)
);

CREATE INDEX idx_statement_lines_stmt ON statement_lines(bank_statement_id);
CREATE INDEX idx_statement_lines_date ON statement_lines(transaction_date);
CREATE INDEX idx_statement_lines_status ON statement_lines(status);
```

---

### M02-003: Create Receivables and Payables

**Arquivo**: `migrations/02-finance/20251223_120000_003_create_receivables_payables.sql`

```sql
-- Migration: M02-003
-- Objetivo: Criar tabelas de contas a pagar/receber
-- Dependências: M01-002, M02-001

-- Enums
CREATE TYPE rp_direction AS ENUM ('in', 'out');
CREATE TYPE rp_nature AS ENUM (
    'contribution', 'donation', 'event', 'agreement', 
    'service', 'utility', 'tax', 'fee', 'material', 'other'
);
CREATE TYPE rp_status AS ENUM (
    'draft', 'pending', 'approved', 'partial', 'paid', 'cancelled', 'overdue'
);
CREATE TYPE payment_method AS ENUM (
    'cash', 'pix', 'wire', 'doc', 'boleto', 'debit', 'credit', 'check'
);

CREATE TABLE receivables_payables (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Classificação
    direction rp_direction NOT NULL,
    nature rp_nature NOT NULL DEFAULT 'other',
    
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
    accrual_date date NOT NULL,
    due_date date NOT NULL,
    
    -- Documento
    document_number varchar(100),
    document_series varchar(20),
    
    -- Parcelamento
    installment_number integer,
    total_installments integer,
    parent_id uuid REFERENCES receivables_payables(id),
    
    -- Classificação gerencial (FKs adicionadas em M06)
    cost_center_id uuid,
    project_id uuid,
    fund_id uuid,
    ledger_account_id uuid,
    
    -- Status
    status rp_status NOT NULL DEFAULT 'draft',
    approved_by uuid REFERENCES users(id),
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
    created_by uuid REFERENCES users(id),
    updated_at timestamptz NOT NULL DEFAULT now(),
    updated_by uuid REFERENCES users(id),
    
    CONSTRAINT rp_amounts_positive CHECK (original_amount > 0 AND net_amount > 0)
);

CREATE INDEX idx_rp_org ON receivables_payables(organization_id);
CREATE INDEX idx_rp_direction ON receivables_payables(organization_id, direction);
CREATE INDEX idx_rp_status ON receivables_payables(organization_id, status);
CREATE INDEX idx_rp_due ON receivables_payables(organization_id, due_date);
CREATE INDEX idx_rp_accrual ON receivables_payables(organization_id, accrual_date);
CREATE INDEX idx_rp_person ON receivables_payables(person_id);
CREATE INDEX idx_rp_parent ON receivables_payables(parent_id);
CREATE INDEX idx_rp_open ON receivables_payables(organization_id, due_date) 
    WHERE status IN ('pending', 'approved', 'partial') AND deleted_at IS NULL;

CREATE TRIGGER trg_receivables_payables_updated_at
    BEFORE UPDATE ON receivables_payables
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

---

### M02-004: Create Payments

**Arquivo**: `migrations/02-finance/20251223_120000_004_create_payments.sql`

```sql
-- Migration: M02-004
-- Objetivo: Criar tabela de pagamentos/baixas
-- Dependências: M02-003

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
    
    -- Vínculo contábil (FK adicionada em M03)
    journal_entry_id uuid,
    
    -- Notas
    notes text,
    
    -- Audit
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid REFERENCES users(id),
    updated_at timestamptz NOT NULL DEFAULT now(),
    updated_by uuid REFERENCES users(id),
    
    CONSTRAINT payments_amount_positive CHECK (amount_paid > 0)
);

CREATE INDEX idx_payments_rp ON payments(receivable_payable_id);
CREATE INDEX idx_payments_date ON payments(payment_date);
CREATE INDEX idx_payments_acct ON payments(financial_account_id);

CREATE TRIGGER trg_payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

---

### M02-005: Create Reconciliations

**Arquivo**: `migrations/02-finance/20251223_120000_005_create_reconciliations.sql`

```sql
-- Migration: M02-005
-- Objetivo: Criar tabela de conciliações
-- Dependências: M02-002, M02-003

-- Enum
CREATE TYPE link_type AS ENUM ('receivable_payable', 'journal_entry', 'fee', 'yield');
CREATE TYPE reconciliation_method AS ENUM ('automatic', 'manual', 'suggested');

CREATE TABLE reconciliations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    statement_line_id uuid NOT NULL REFERENCES statement_lines(id) ON DELETE CASCADE,
    
    link_type link_type NOT NULL,
    receivable_payable_id uuid REFERENCES receivables_payables(id),
    journal_entry_id uuid,  -- FK adicionada em M03
    
    method reconciliation_method NOT NULL,
    confidence numeric(5,2),
    
    reconciled_by uuid NOT NULL REFERENCES users(id),
    reconciled_at timestamptz NOT NULL DEFAULT now(),
    
    CONSTRAINT reconciliations_line_unique UNIQUE (statement_line_id)
);

CREATE INDEX idx_reconciliations_rp ON reconciliations(receivable_payable_id);
```

---

### M02-006: Create Attachments

**Arquivo**: `migrations/02-finance/20251223_120000_006_create_attachments.sql`

```sql
-- Migration: M02-006
-- Objetivo: Criar tabela de anexos (polimórfica)
-- Dependências: M01-001

-- Enums
CREATE TYPE entity_type AS ENUM (
    'receivable_payable', 'payment', 'journal_entry', 'person', 'asset'
);
CREATE TYPE attachment_category AS ENUM (
    'invoice', 'receipt', 'proof', 'contract', 'other'
);

CREATE TABLE attachments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    
    entity_type entity_type NOT NULL,
    entity_id uuid NOT NULL,
    
    file_name varchar(255) NOT NULL,
    file_type varchar(100) NOT NULL,
    file_size integer NOT NULL,
    storage_url text NOT NULL,
    file_hash varchar(64) NOT NULL,
    
    category attachment_category,
    description text,
    
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid REFERENCES users(id),
    updated_at timestamptz NOT NULL DEFAULT now(),
    updated_by uuid REFERENCES users(id)
);

CREATE INDEX idx_attachments_entity ON attachments(entity_type, entity_id);

CREATE TRIGGER trg_attachments_updated_at
    BEFORE UPDATE ON attachments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

---

## 5. Módulo 03-accounting

### M03-001: Create Chart of Accounts

**Arquivo**: `migrations/03-accounting/20251223_130000_001_create_chart_of_accounts.sql`

```sql
-- Migration: M03-001
-- Objetivo: Criar tabela de plano de contas
-- Dependências: M00-001, M01-001

-- Enums
CREATE TYPE account_category AS ENUM (
    'asset', 'liability', 'equity', 'revenue', 'expense'
);
CREATE TYPE balance_type AS ENUM ('debit', 'credit');
CREATE TYPE account_classification AS ENUM ('synthetic', 'analytical');

CREATE TABLE chart_of_accounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    code varchar(20) NOT NULL,
    name varchar(255) NOT NULL,
    
    category account_category NOT NULL,
    balance_type balance_type NOT NULL,
    classification account_classification NOT NULL,
    
    level integer NOT NULL,
    parent_id uuid REFERENCES chart_of_accounts(id),
    
    allows_entries boolean NOT NULL,
    active boolean NOT NULL DEFAULT true,
    
    description text,
    tags text[],
    
    deleted_at timestamptz,
    
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid REFERENCES users(id),
    updated_at timestamptz NOT NULL DEFAULT now(),
    updated_by uuid REFERENCES users(id),
    
    CONSTRAINT coa_org_code_unique UNIQUE (organization_id, code)
);

CREATE INDEX idx_coa_org ON chart_of_accounts(organization_id);
CREATE INDEX idx_coa_parent ON chart_of_accounts(parent_id);
CREATE INDEX idx_coa_category ON chart_of_accounts(organization_id, category);
CREATE INDEX idx_coa_analytical ON chart_of_accounts(organization_id, classification) 
    WHERE classification = 'analytical' AND active = true;

CREATE TRIGGER trg_coa_updated_at
    BEFORE UPDATE ON chart_of_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Adicionar FK em financial_accounts
ALTER TABLE financial_accounts 
ADD CONSTRAINT financial_accounts_ledger_fk 
    FOREIGN KEY (ledger_account_id) REFERENCES chart_of_accounts(id);

-- Adicionar FK em receivables_payables
ALTER TABLE receivables_payables 
ADD CONSTRAINT rp_ledger_fk 
    FOREIGN KEY (ledger_account_id) REFERENCES chart_of_accounts(id);
```

---

### M03-002: Create Accounting Periods

**Arquivo**: `migrations/03-accounting/20251223_130000_002_create_accounting_periods.sql`

```sql
-- Migration: M03-002
-- Objetivo: Criar tabela de períodos contábeis
-- Dependências: M00-001, M01-001

-- Enum
CREATE TYPE period_status AS ENUM ('open', 'review', 'closed', 'reopened');

CREATE TABLE accounting_periods (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    year integer NOT NULL,
    month integer NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    
    status period_status NOT NULL DEFAULT 'open',
    
    closed_by uuid REFERENCES users(id),
    closed_at timestamptz,
    
    reopened_by uuid REFERENCES users(id),
    reopened_at timestamptz,
    reopen_reason text,
    
    notes text,
    
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid REFERENCES users(id),
    updated_at timestamptz NOT NULL DEFAULT now(),
    updated_by uuid REFERENCES users(id),
    
    CONSTRAINT periods_org_month_unique UNIQUE (organization_id, year, month),
    CONSTRAINT periods_month_valid CHECK (month BETWEEN 1 AND 12)
);

CREATE INDEX idx_periods_org ON accounting_periods(organization_id);
CREATE INDEX idx_periods_status ON accounting_periods(organization_id, status);
CREATE INDEX idx_periods_dates ON accounting_periods(organization_id, start_date, end_date);

CREATE TRIGGER trg_periods_updated_at
    BEFORE UPDATE ON accounting_periods
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

---

### M03-003: Create Journal Entries

**Arquivo**: `migrations/03-accounting/20251223_130000_003_create_journal_entries.sql`

```sql
-- Migration: M03-003
-- Objetivo: Criar tabelas de lançamentos contábeis (partidas dobradas)
-- Dependências: M03-001, M03-002

-- Enums
CREATE TYPE journal_origin AS ENUM (
    'manual', 'payment', 'bank_statement', 'depreciation', 'closing', 'adjustment'
);
CREATE TYPE journal_status AS ENUM ('draft', 'posted', 'reversed');
CREATE TYPE line_type AS ENUM ('debit', 'credit');

-- Sequence para numeração
CREATE SEQUENCE journal_entry_number_seq;

CREATE TABLE journal_entries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    entry_number integer NOT NULL DEFAULT nextval('journal_entry_number_seq'),
    period_id uuid NOT NULL REFERENCES accounting_periods(id),
    
    entry_date date NOT NULL,
    accrual_date date NOT NULL,
    
    memo text NOT NULL,
    document_ref varchar(100),
    
    origin journal_origin NOT NULL,
    origin_id uuid,
    
    status journal_status NOT NULL DEFAULT 'draft',
    
    reverses_entry_id uuid REFERENCES journal_entries(id),
    
    total_debit numeric(14,2) NOT NULL,
    total_credit numeric(14,2) NOT NULL,
    
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid REFERENCES users(id),
    updated_at timestamptz NOT NULL DEFAULT now(),
    updated_by uuid REFERENCES users(id),
    
    CONSTRAINT je_org_number_unique UNIQUE (organization_id, entry_number),
    CONSTRAINT je_balanced CHECK (total_debit = total_credit)
);

CREATE TABLE journal_lines (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    journal_entry_id uuid NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
    
    line_order integer NOT NULL,
    account_id uuid NOT NULL REFERENCES chart_of_accounts(id),
    
    line_type line_type NOT NULL,
    amount numeric(14,2) NOT NULL,
    
    memo text,
    
    -- FKs adicionadas em M06
    cost_center_id uuid,
    project_id uuid,
    fund_id uuid,
    
    CONSTRAINT jl_order_unique UNIQUE (journal_entry_id, line_order),
    CONSTRAINT jl_amount_positive CHECK (amount > 0)
);

CREATE INDEX idx_je_org ON journal_entries(organization_id);
CREATE INDEX idx_je_period ON journal_entries(period_id);
CREATE INDEX idx_je_date ON journal_entries(organization_id, entry_date);
CREATE INDEX idx_je_origin ON journal_entries(origin, origin_id);
CREATE INDEX idx_je_status ON journal_entries(organization_id, status);

CREATE INDEX idx_jl_entry ON journal_lines(journal_entry_id);
CREATE INDEX idx_jl_account ON journal_lines(account_id);

CREATE TRIGGER trg_je_updated_at
    BEFORE UPDATE ON journal_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Adicionar FK em payments
ALTER TABLE payments 
ADD CONSTRAINT payments_journal_fk 
    FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id);

-- Adicionar FK em reconciliations
ALTER TABLE reconciliations 
ADD CONSTRAINT reconciliations_journal_fk 
    FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id);
```

---

### M03-004: Create Period Balances

**Arquivo**: `migrations/03-accounting/20251223_130000_004_create_period_balances.sql`

```sql
-- Migration: M03-004
-- Objetivo: Criar tabela de saldos por período
-- Dependências: M03-001, M03-002

CREATE TABLE period_balances (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id uuid NOT NULL REFERENCES chart_of_accounts(id) ON DELETE CASCADE,
    period_id uuid NOT NULL REFERENCES accounting_periods(id) ON DELETE CASCADE,
    
    opening_balance numeric(14,2) NOT NULL DEFAULT 0,
    total_debits numeric(14,2) NOT NULL DEFAULT 0,
    total_credits numeric(14,2) NOT NULL DEFAULT 0,
    closing_balance numeric(14,2) NOT NULL DEFAULT 0,
    
    CONSTRAINT pb_account_period_unique UNIQUE (account_id, period_id)
);

CREATE INDEX idx_pb_account ON period_balances(account_id);
CREATE INDEX idx_pb_period ON period_balances(period_id);
```

---

### M03-005: Create Immutability Triggers

**Arquivo**: `migrations/03-accounting/20251223_130000_005_create_immutability_triggers.sql`

```sql
-- Migration: M03-005
-- Objetivo: Criar triggers de imutabilidade contábil
-- Dependências: M03-003

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
    p_status period_status;
BEGIN
    SELECT status INTO p_status 
    FROM accounting_periods 
    WHERE id = NEW.period_id;
    
    IF p_status NOT IN ('open', 'reopened') THEN
        RAISE EXCEPTION 'Cannot create entries in closed period';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_period_open
    BEFORE INSERT ON journal_entries
    FOR EACH ROW
    EXECUTE FUNCTION check_period_open();

-- Impedir exclusão de lançamentos efetivados
CREATE OR REPLACE FUNCTION prevent_posted_entry_delete()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status = 'posted' THEN
        RAISE EXCEPTION 'Cannot delete posted journal entry. Use reversal instead.';
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_posted_entry_delete
    BEFORE DELETE ON journal_entries
    FOR EACH ROW
    EXECUTE FUNCTION prevent_posted_entry_delete();
```

---

## 6. Módulo 04-assets

### M04-001: Create Fixed Assets

**Arquivo**: `migrations/04-assets/20251223_140000_001_create_fixed_assets.sql`

```sql
-- Migration: M04-001
-- Objetivo: Criar tabelas de patrimônio
-- Dependências: M01-002, M03-001, M03-002

-- Enums
CREATE TYPE asset_category AS ENUM (
    'real_estate', 'vehicle', 'equipment', 'furniture', 'it', 'other'
);
CREATE TYPE depreciation_method AS ENUM ('linear', 'none');
CREATE TYPE asset_status AS ENUM (
    'in_use', 'maintenance', 'disposed', 'sold', 'lost'
);

CREATE TABLE fixed_assets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    asset_code varchar(30) NOT NULL,
    description varchar(500) NOT NULL,
    category asset_category NOT NULL,
    
    acquisition_date date NOT NULL,
    acquisition_value numeric(14,2) NOT NULL,
    residual_value numeric(14,2) NOT NULL DEFAULT 0,
    useful_life_months integer NOT NULL,
    
    depreciation_method depreciation_method NOT NULL,
    
    asset_account_id uuid NOT NULL REFERENCES chart_of_accounts(id),
    depreciation_expense_account_id uuid REFERENCES chart_of_accounts(id),
    accumulated_depreciation_account_id uuid REFERENCES chart_of_accounts(id),
    
    supplier_id uuid REFERENCES persons(id),
    invoice_number varchar(50),
    
    location varchar(200),
    responsible_person_id uuid REFERENCES persons(id),
    
    project_id uuid,  -- FK adicionada em M06
    fund_id uuid,     -- FK adicionada em M06
    
    status asset_status NOT NULL DEFAULT 'in_use',
    disposal_date date,
    disposal_reason text,
    disposal_value numeric(14,2),
    
    acquisition_payable_id uuid REFERENCES receivables_payables(id),
    
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid REFERENCES users(id),
    updated_at timestamptz NOT NULL DEFAULT now(),
    updated_by uuid REFERENCES users(id),
    
    CONSTRAINT assets_org_code_unique UNIQUE (organization_id, asset_code),
    CONSTRAINT assets_acquisition_positive CHECK (acquisition_value > 0),
    CONSTRAINT assets_useful_life_positive CHECK (useful_life_months > 0)
);

CREATE INDEX idx_assets_org ON fixed_assets(organization_id);
CREATE INDEX idx_assets_category ON fixed_assets(organization_id, category);
CREATE INDEX idx_assets_status ON fixed_assets(organization_id, status);

CREATE TRIGGER trg_assets_updated_at
    BEFORE UPDATE ON fixed_assets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

---

### M04-002: Create Depreciation and Transfers

**Arquivo**: `migrations/04-assets/20251223_140000_002_create_depreciation.sql`

```sql
-- Migration: M04-002
-- Objetivo: Criar tabelas de depreciação e transferências
-- Dependências: M04-001, M03-003

CREATE TABLE depreciation_entries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    fixed_asset_id uuid NOT NULL REFERENCES fixed_assets(id) ON DELETE CASCADE,
    period_id uuid NOT NULL REFERENCES accounting_periods(id),
    
    depreciation_amount numeric(14,2) NOT NULL,
    accumulated_depreciation numeric(14,2) NOT NULL,
    book_value numeric(14,2) NOT NULL,
    
    journal_entry_id uuid REFERENCES journal_entries(id),
    
    CONSTRAINT depreciation_asset_period_unique UNIQUE (fixed_asset_id, period_id)
);

CREATE INDEX idx_depreciation_asset ON depreciation_entries(fixed_asset_id);
CREATE INDEX idx_depreciation_period ON depreciation_entries(period_id);

CREATE TABLE asset_transfers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    fixed_asset_id uuid NOT NULL REFERENCES fixed_assets(id) ON DELETE CASCADE,
    
    transfer_date timestamptz NOT NULL,
    
    previous_location varchar(200),
    new_location varchar(200),
    
    previous_responsible_id uuid REFERENCES persons(id),
    new_responsible_id uuid REFERENCES persons(id),
    
    reason text NOT NULL,
    
    created_by uuid REFERENCES users(id),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_asset_transfers_asset ON asset_transfers(fixed_asset_id);
```

---

## 7. Módulo 05-governance

### M05-001: Create RBAC

**Arquivo**: `migrations/05-governance/20251223_150000_001_create_rbac.sql`

```sql
-- Migration: M05-001
-- Objetivo: Criar tabelas de controle de acesso
-- Dependências: M00-001, M01-001

CREATE TABLE roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
    
    code varchar(50) NOT NULL,
    name varchar(100) NOT NULL,
    description text,
    level integer NOT NULL DEFAULT 0,
    
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    
    CONSTRAINT roles_org_code_unique UNIQUE (organization_id, code)
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
    granted_by uuid REFERENCES users(id),
    expires_at timestamptz,
    
    PRIMARY KEY (user_id, role_id)
);

CREATE INDEX idx_roles_org ON roles(organization_id);
CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role_id);

CREATE TRIGGER trg_roles_updated_at
    BEFORE UPDATE ON roles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

---

### M05-002: Create Audit Events

**Arquivo**: `migrations/05-governance/20251223_150000_002_create_audit_events.sql`

```sql
-- Migration: M05-002
-- Objetivo: Criar tabela de eventos de auditoria
-- Dependências: M01-001

-- Enum
CREATE TYPE audit_action AS ENUM (
    'create', 'update', 'delete', 'view', 'export', 
    'close', 'reopen', 'approve', 'reject', 'login', 'logout'
);

CREATE TABLE audit_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    
    user_id uuid REFERENCES users(id),
    organization_id uuid REFERENCES organizations(id),
    
    entity_type varchar(50) NOT NULL,
    entity_id uuid NOT NULL,
    action audit_action NOT NULL,
    
    old_data jsonb,
    new_data jsonb,
    
    ip_address varchar(45),
    user_agent text,
    
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_user ON audit_events(user_id);
CREATE INDEX idx_audit_org ON audit_events(organization_id);
CREATE INDEX idx_audit_entity ON audit_events(entity_type, entity_id);
CREATE INDEX idx_audit_action ON audit_events(action);
CREATE INDEX idx_audit_date ON audit_events(created_at);

-- Função genérica de auditoria
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_events (
        user_id,
        organization_id,
        entity_type,
        entity_id,
        action,
        old_data,
        new_data,
        created_at
    ) VALUES (
        NULLIF(current_setting('app.current_user_id', true), '')::uuid,
        NULLIF(current_setting('app.current_org_id', true), '')::uuid,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        CASE TG_OP 
            WHEN 'INSERT' THEN 'create'::audit_action
            WHEN 'UPDATE' THEN 'update'::audit_action
            WHEN 'DELETE' THEN 'delete'::audit_action
        END,
        CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) END,
        now()
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Aplicar triggers em tabelas críticas
CREATE TRIGGER audit_journal_entries
    AFTER INSERT OR UPDATE OR DELETE ON journal_entries
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_receivables_payables
    AFTER INSERT OR UPDATE OR DELETE ON receivables_payables
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_payments
    AFTER INSERT OR UPDATE OR DELETE ON payments
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_fixed_assets
    AFTER INSERT OR UPDATE OR DELETE ON fixed_assets
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
```

---

## 8. Módulo 06-projects

### M06-001: Create Cost Centers, Projects, Funds

**Arquivo**: `migrations/06-projects/20251223_160000_001_create_projects.sql`

```sql
-- Migration: M06-001
-- Objetivo: Criar tabelas de centros de custo, projetos e fundos
-- Dependências: M00-001, M01-002

-- Enums
CREATE TYPE project_status AS ENUM (
    'planning', 'active', 'suspended', 'completed', 'cancelled'
);
CREATE TYPE fund_type AS ENUM ('restricted', 'designated', 'unrestricted');

-- Centros de Custo
CREATE TABLE cost_centers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    code varchar(20) NOT NULL,
    name varchar(100) NOT NULL,
    description text,
    
    responsible_id uuid REFERENCES persons(id),
    
    active boolean NOT NULL DEFAULT true,
    
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid REFERENCES users(id),
    updated_at timestamptz NOT NULL DEFAULT now(),
    updated_by uuid REFERENCES users(id),
    
    CONSTRAINT cc_org_code_unique UNIQUE (organization_id, code)
);

-- Projetos
CREATE TABLE projects (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    code varchar(20) NOT NULL,
    name varchar(200) NOT NULL,
    description text,
    
    start_date date,
    planned_end_date date,
    actual_end_date date,
    
    budget numeric(14,2),
    
    status project_status NOT NULL DEFAULT 'planning',
    
    cost_center_id uuid REFERENCES cost_centers(id),
    responsible_id uuid REFERENCES persons(id),
    
    is_mrosc_partnership boolean NOT NULL DEFAULT false,
    partnership_number varchar(50),
    partner_agency varchar(200),
    
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid REFERENCES users(id),
    updated_at timestamptz NOT NULL DEFAULT now(),
    updated_by uuid REFERENCES users(id),
    
    CONSTRAINT projects_org_code_unique UNIQUE (organization_id, code)
);

-- Fundos
CREATE TABLE funds (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    code varchar(20) NOT NULL,
    name varchar(200) NOT NULL,
    description text,
    
    fund_type fund_type NOT NULL,
    purpose text,
    
    start_date date,
    end_date date,
    target_amount numeric(14,2),
    current_balance numeric(14,2) NOT NULL DEFAULT 0,
    
    active boolean NOT NULL DEFAULT true,
    
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid REFERENCES users(id),
    updated_at timestamptz NOT NULL DEFAULT now(),
    updated_by uuid REFERENCES users(id),
    
    CONSTRAINT funds_org_code_unique UNIQUE (organization_id, code)
);

-- Índices
CREATE INDEX idx_cc_org ON cost_centers(organization_id);
CREATE INDEX idx_projects_org ON projects(organization_id);
CREATE INDEX idx_projects_status ON projects(organization_id, status);
CREATE INDEX idx_funds_org ON funds(organization_id);
CREATE INDEX idx_funds_type ON funds(organization_id, fund_type);

-- Triggers
CREATE TRIGGER trg_cc_updated_at
    BEFORE UPDATE ON cost_centers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_funds_updated_at
    BEFORE UPDATE ON funds
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Adicionar FKs pendentes
ALTER TABLE receivables_payables 
ADD CONSTRAINT rp_cost_center_fk 
    FOREIGN KEY (cost_center_id) REFERENCES cost_centers(id);

ALTER TABLE receivables_payables 
ADD CONSTRAINT rp_project_fk 
    FOREIGN KEY (project_id) REFERENCES projects(id);

ALTER TABLE receivables_payables 
ADD CONSTRAINT rp_fund_fk 
    FOREIGN KEY (fund_id) REFERENCES funds(id);

ALTER TABLE journal_lines 
ADD CONSTRAINT jl_cost_center_fk 
    FOREIGN KEY (cost_center_id) REFERENCES cost_centers(id);

ALTER TABLE journal_lines 
ADD CONSTRAINT jl_project_fk 
    FOREIGN KEY (project_id) REFERENCES projects(id);

ALTER TABLE journal_lines 
ADD CONSTRAINT jl_fund_fk 
    FOREIGN KEY (fund_id) REFERENCES funds(id);

ALTER TABLE fixed_assets 
ADD CONSTRAINT assets_project_fk 
    FOREIGN KEY (project_id) REFERENCES projects(id);

ALTER TABLE fixed_assets 
ADD CONSTRAINT assets_fund_fk 
    FOREIGN KEY (fund_id) REFERENCES funds(id);
```

---

### M06-002: Create Fund Movements

**Arquivo**: `migrations/06-projects/20251223_160000_002_create_fund_movements.sql`

```sql
-- Migration: M06-002
-- Objetivo: Criar tabelas de movimentação de fundos
-- Dependências: M06-001, M03-003

CREATE TABLE fund_allocations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    fund_id uuid NOT NULL REFERENCES funds(id) ON DELETE CASCADE,
    
    journal_line_id uuid REFERENCES journal_lines(id),
    
    amount numeric(14,2) NOT NULL,
    allocation_date date NOT NULL,
    source_description text,
    
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid REFERENCES users(id),
    
    CONSTRAINT fund_alloc_amount_positive CHECK (amount > 0)
);

CREATE TABLE fund_consumptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    fund_id uuid NOT NULL REFERENCES funds(id) ON DELETE CASCADE,
    
    journal_line_id uuid REFERENCES journal_lines(id),
    receivable_payable_id uuid REFERENCES receivables_payables(id),
    
    amount numeric(14,2) NOT NULL,
    consumption_date date NOT NULL,
    justification text,
    
    approved_by uuid REFERENCES users(id),
    approved_at timestamptz,
    
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid REFERENCES users(id),
    
    CONSTRAINT fund_cons_amount_positive CHECK (amount > 0)
);

CREATE INDEX idx_fund_alloc_fund ON fund_allocations(fund_id);
CREATE INDEX idx_fund_cons_fund ON fund_consumptions(fund_id);
```

---

## 9. Extensões

### M07-001: Extension - Centro Espírita

**Arquivo**: `migrations/extensions/center/20251223_170000_001_ext_center_members.sql`

```sql
-- Migration: M07-001
-- Objetivo: Criar tabelas específicas Centro Espírita
-- Dependências: M01-002

-- Enums
CREATE TYPE member_status AS ENUM ('active', 'suspended', 'inactive', 'deceased');
CREATE TYPE member_category AS ENUM (
    'worker', 'attendee', 'honorary', 'medium', 
    'healer', 'study_leader', 'youth_worker', 'assisted'
);
CREATE TYPE contribution_periodicity AS ENUM ('monthly', 'quarterly', 'semiannual', 'annual');

-- Membros/Associados
CREATE TABLE ext_center_members (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id uuid NOT NULL UNIQUE REFERENCES persons(id) ON DELETE CASCADE,
    
    registration_number varchar(20),
    admission_date date NOT NULL,
    departure_date date,
    
    status member_status NOT NULL,
    category member_category NOT NULL,
    
    suggested_contribution numeric(14,2),
    contribution_periodicity contribution_periodicity NOT NULL DEFAULT 'monthly',
    contribution_due_day integer,
    is_exempt boolean NOT NULL DEFAULT false,
    exemption_reason text,
    
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid REFERENCES users(id),
    updated_at timestamptz NOT NULL DEFAULT now(),
    updated_by uuid REFERENCES users(id)
);

-- Grupos de Estudo
CREATE TABLE ext_center_study_groups (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    name varchar(100) NOT NULL,
    description text,
    weekday integer,
    time varchar(10),
    room varchar(50),
    
    leader_person_id uuid REFERENCES persons(id),
    current_book varchar(200),
    
    active boolean NOT NULL DEFAULT true,
    
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid REFERENCES users(id),
    updated_at timestamptz NOT NULL DEFAULT now(),
    updated_by uuid REFERENCES users(id)
);

-- Perfis de Mediunidade
CREATE TABLE ext_center_mediumship_profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id uuid NOT NULL UNIQUE REFERENCES persons(id) ON DELETE CASCADE,
    
    mediumship_types text[],
    development_start_date date,
    study_group_id uuid REFERENCES ext_center_study_groups(id),
    notes text,
    
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid REFERENCES users(id),
    updated_at timestamptz NOT NULL DEFAULT now(),
    updated_by uuid REFERENCES users(id)
);

-- Índices
CREATE INDEX idx_ext_members_person ON ext_center_members(person_id);
CREATE INDEX idx_ext_members_status ON ext_center_members(status);
CREATE INDEX idx_ext_study_groups_org ON ext_center_study_groups(organization_id);
CREATE INDEX idx_ext_mediumship_person ON ext_center_mediumship_profiles(person_id);

-- Triggers
CREATE TRIGGER trg_ext_members_updated_at
    BEFORE UPDATE ON ext_center_members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_ext_study_groups_updated_at
    BEFORE UPDATE ON ext_center_study_groups
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_ext_mediumship_updated_at
    BEFORE UPDATE ON ext_center_mediumship_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

---

### M07-002: Extension - Fintech

**Arquivo**: `migrations/extensions/fintech/20251223_170000_001_ext_fintech_base.sql`

```sql
-- Migration: M07-002
-- Objetivo: Criar tabelas específicas Fintech (SaaS)
-- Dependências: M01-002

-- Produtos/Serviços
CREATE TABLE ext_fintech_products (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    sku varchar(50) NOT NULL,
    name varchar(200) NOT NULL,
    description text,
    
    unit_price numeric(14,2) NOT NULL,
    is_recurring boolean NOT NULL DEFAULT false,
    billing_period varchar(20),
    
    active boolean NOT NULL DEFAULT true,
    
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    
    CONSTRAINT ext_products_org_sku_unique UNIQUE (organization_id, sku)
);

-- Clientes
CREATE TABLE ext_fintech_customers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id uuid NOT NULL UNIQUE REFERENCES persons(id) ON DELETE CASCADE,
    
    customer_since date NOT NULL,
    credit_limit numeric(14,2),
    payment_terms integer DEFAULT 30,
    
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Assinaturas
CREATE TABLE ext_fintech_subscriptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    customer_id uuid NOT NULL REFERENCES ext_fintech_customers(id),
    product_id uuid NOT NULL REFERENCES ext_fintech_products(id),
    
    status varchar(20) NOT NULL,
    start_date date NOT NULL,
    end_date date,
    next_billing_date date,
    
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_ext_products_org ON ext_fintech_products(organization_id);
CREATE INDEX idx_ext_customers_person ON ext_fintech_customers(person_id);
CREATE INDEX idx_ext_subscriptions_org ON ext_fintech_subscriptions(organization_id);
CREATE INDEX idx_ext_subscriptions_customer ON ext_fintech_subscriptions(customer_id);

-- Triggers
CREATE TRIGGER trg_ext_products_updated_at
    BEFORE UPDATE ON ext_fintech_products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_ext_customers_updated_at
    BEFORE UPDATE ON ext_fintech_customers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_ext_subscriptions_updated_at
    BEFORE UPDATE ON ext_fintech_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

---

## 10. Migração de Dados Legacy

### M08-001: Migrate Organizations

**Arquivo**: `migrations/data-migration/20251223_180000_001_migrate_organizations.sql`

```sql
-- Migration: M08-001
-- Objetivo: Migrar dados de organization_settings para organizations
-- Dependências: M00-001
-- ATENÇÃO: Executar em ambiente de staging antes de produção

-- 1. Inserir organização a partir de settings
INSERT INTO organizations (
    id,
    code,
    name,
    legal_name,
    tax_id,
    org_type,
    fiscal_year_start_month,
    created_at
)
SELECT 
    gen_random_uuid(),
    'ORG001',  -- Código padrão
    COALESCE(
        (SELECT settings->>'name' FROM organization_settings LIMIT 1),
        'Organização Principal'
    ),
    (SELECT settings->>'legal_name' FROM organization_settings LIMIT 1),
    (SELECT settings->>'cnpj' FROM organization_settings LIMIT 1),
    'spiritist_center'::organization_type,  -- Tipo padrão baseado no contexto
    COALESCE(
        (SELECT (settings->>'fiscal_year_start')::integer FROM organization_settings LIMIT 1),
        1
    ),
    now()
WHERE NOT EXISTS (SELECT 1 FROM organizations);

-- 2. Salvar ID da organização para uso nas próximas migrações
-- (usar variável de sessão ou criar tabela temporária de mapeamento)
```

---

### M08-002: Migrate Users

**Arquivo**: `migrations/data-migration/20251223_180000_002_migrate_users.sql`

```sql
-- Migration: M08-002
-- Objetivo: Migrar dados de users (legacy) e usuario para users (novo)
-- Dependências: M08-001, M01-001

-- 1. Migrar de tabela legacy 'users' se existir dados
INSERT INTO users (
    id,
    organization_id,
    auth_provider_id,
    email,
    name,
    active,
    created_at
)
SELECT 
    gen_random_uuid(),
    (SELECT id FROM organizations LIMIT 1),  -- Assumindo organização única
    CONCAT('legacy_', old_users.id::text),
    old_users.email,
    old_users.username,
    true,
    COALESCE(old_users.created_at, now())
FROM users AS old_users
WHERE old_users.id IS NOT NULL
ON CONFLICT (organization_id, email) DO NOTHING;

-- 2. Migrar de tabela 'usuario' se existir dados
INSERT INTO users (
    id,
    organization_id,
    auth_provider_id,
    email,
    name,
    active,
    created_at
)
SELECT 
    u.id,  -- Preservar UUID original
    (SELECT id FROM organizations LIMIT 1),
    CONCAT('drizzle_', u.id::text),
    u.email,
    u.nome,
    u.ativo,
    u.created_at
FROM usuario AS u
WHERE u.id IS NOT NULL
ON CONFLICT (organization_id, email) DO NOTHING;
```

---

## 11. Ordem de Execução

| Ordem | Módulo | Arquivo | Dependência |
|-------|--------|---------|-------------|
| 1 | 00-core | M00-001_create_organizations | - |
| 2 | 00-core | M00-002_create_configurations | M00-001 |
| 3 | 01-identity | M01-001_create_users | M00-001 |
| 4 | 01-identity | M01-002_create_persons | M01-001 |
| 5 | 02-finance | M02-001_create_financial_accounts | M00-001, M01-001 |
| 6 | 02-finance | M02-002_create_bank_statements | M02-001 |
| 7 | 02-finance | M02-003_create_receivables_payables | M01-002, M02-001 |
| 8 | 02-finance | M02-004_create_payments | M02-003 |
| 9 | 02-finance | M02-005_create_reconciliations | M02-002, M02-003 |
| 10 | 02-finance | M02-006_create_attachments | M01-001 |
| 11 | 03-accounting | M03-001_create_chart_of_accounts | M00-001, M01-001 |
| 12 | 03-accounting | M03-002_create_accounting_periods | M00-001, M01-001 |
| 13 | 03-accounting | M03-003_create_journal_entries | M03-001, M03-002 |
| 14 | 03-accounting | M03-004_create_period_balances | M03-001, M03-002 |
| 15 | 03-accounting | M03-005_create_immutability_triggers | M03-003 |
| 16 | 04-assets | M04-001_create_fixed_assets | M01-002, M03-001 |
| 17 | 04-assets | M04-002_create_depreciation | M04-001, M03-003 |
| 18 | 05-governance | M05-001_create_rbac | M00-001, M01-001 |
| 19 | 05-governance | M05-002_create_audit_events | M01-001 |
| 20 | 06-projects | M06-001_create_projects | M00-001, M01-002 |
| 21 | 06-projects | M06-002_create_fund_movements | M06-001, M03-003 |
| 22 | extensions/center | M07-001_ext_center_members | M01-002 |
| 23 | extensions/fintech | M07-002_ext_fintech_base | M01-002 |
| 24 | data-migration | M08-001_migrate_organizations | M00-001 |
| 25 | data-migration | M08-002_migrate_users | M08-001, M01-001 |

---

## 12. Rollback Strategy

Cada migration deve ter um arquivo de rollback correspondente:

```
migrations/
├── 00-core/
│   ├── 20251223_100000_001_create_organizations.sql
│   └── 20251223_100000_001_create_organizations.down.sql
```

Exemplo de rollback:

```sql
-- File: 20251223_100000_001_create_organizations.down.sql
DROP TRIGGER IF EXISTS trg_organizations_updated_at ON organizations;
DROP TABLE IF EXISTS organizations;
DROP TYPE IF EXISTS organization_type;
```

---

## 13. Checklist Pré-Execução

- [ ] Backup completo do banco
- [ ] Executar em staging primeiro
- [ ] Validar FKs não quebradas
- [ ] Testar rollback de cada migration
- [ ] Verificar índices criados
- [ ] Testar triggers de auditoria
- [ ] Validar constraints de negócio
- [ ] Medir tempo de execução
- [ ] Documentar qualquer erro


