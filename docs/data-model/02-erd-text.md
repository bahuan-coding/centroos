# ERD Textual - CentrOS

> **Data**: 2025-12-23  
> **Formato**: Notação textual com cardinalidades

## 1. Convenções

```
[TABELA]                    = Entidade
(coluna tipo)               = Atributo
PK                          = Primary Key
FK                          = Foreign Key
UK                          = Unique Key
NN                          = Not Null
---> 1:N                    = Um para Muitos
---< N:1                    = Muitos para Um
<--> N:M                    = Muitos para Muitos (via tabela associativa)
- - > 0..1:N                = Zero ou Um para Muitos (opcional)
```

---

## 2. Módulo Core

### 2.1 Organizations

```
[organizations] ─────────────────────────────────────────────────────
│ (id uuid PK)
│ (code varchar(20) UK NN)
│ (name varchar(255) NN)
│ (legal_name varchar(255))
│ (tax_id varchar(20))
│ (org_type organization_type NN)  -- enum: spiritist_center, fintech, generic
│ (address_line text)
│ (city varchar(100))
│ (state varchar(2))
│ (postal_code varchar(10))
│ (country varchar(2) DEFAULT 'BR')
│ (phone varchar(20))
│ (email varchar(320))
│ (website varchar(255))
│ (fiscal_year_start_month integer DEFAULT 1)
│ (accounting_method varchar(20) DEFAULT 'accrual')
│ (currency varchar(3) DEFAULT 'BRL')
│ (timezone varchar(50) DEFAULT 'America/Sao_Paulo')
│ (active boolean NN DEFAULT true)
│ (created_at timestamptz NN)
│ (updated_at timestamptz NN)
│
│──── 1:N ────> [users]
│──── 1:N ────> [persons]
│──── 1:N ────> [financial_accounts]
│──── 1:N ────> [chart_of_accounts]
│──── 1:N ────> [accounting_periods]
│──── 1:N ────> [receivables_payables]
│──── 1:N ────> [cost_centers]
│──── 1:N ────> [projects]
│──── 1:N ────> [funds]
│──── 1:N ────> [fixed_assets]
│──── 1:N ────> [roles] (org-specific)
└────────────────────────────────────────────────────────────────────
```

### 2.2 Users

```
[users] ─────────────────────────────────────────────────────────────
│ (id uuid PK)
│ (organization_id uuid FK NN) ────> [organizations]
│ (auth_provider_id varchar(100) NN)
│ (email varchar(320) NN)
│ (name varchar(255) NN)
│ (avatar_url text)
│ (active boolean NN DEFAULT true)
│ (email_verified boolean NN DEFAULT false)
│ (last_login_at timestamptz)
│ (created_at timestamptz NN)
│ (created_by uuid FK) - - > [users]
│ (updated_at timestamptz NN)
│ (updated_by uuid FK) - - > [users]
│
│ UK(organization_id, email)
│
│<──── N:1 ────┤ [organizations]
│──── 1:N ────> [user_roles]
│──── 1:N ────> [audit_events] (as actor)
└────────────────────────────────────────────────────────────────────
```

### 2.3 Persons e Relacionados

```
[persons] ───────────────────────────────────────────────────────────
│ (id uuid PK)
│ (organization_id uuid FK NN) ────> [organizations]
│ (person_type person_type NN)  -- enum: individual, company
│ (name varchar(255) NN)
│ (legal_name varchar(255))
│ (tax_id varchar(20))
│ (active boolean NN DEFAULT true)
│ (notes text)
│ (deleted_at timestamptz)
│ (created_at timestamptz NN)
│ (created_by uuid FK)
│ (updated_at timestamptz NN)
│ (updated_by uuid FK)
│
│<──── N:1 ────┤ [organizations]
│──── 1:N ────> [person_addresses]
│──── 1:N ────> [person_contacts]
│──── 1:N ────> [person_documents]
│──── 0..1:1 ──> [ext_center_members]
│──── 0..1:1 ──> [ext_center_mediumship_profiles]
│──── 0..1:1 ──> [ext_fintech_customers]
│──── 1:N ────> [receivables_payables]
│──── 1:N ────> [fixed_assets] (as supplier)
│──── 1:N ────> [fixed_assets] (as responsible)
└────────────────────────────────────────────────────────────────────

[person_addresses] ──────────────────────────────────────────────────
│ (id uuid PK)
│ (person_id uuid FK NN) ────> [persons]
│ (address_type address_type NN)  -- enum: residential, commercial, mailing
│ (street varchar(255) NN)
│ (number varchar(20))
│ (complement varchar(100))
│ (neighborhood varchar(100))
│ (city varchar(100) NN)
│ (state varchar(2) NN)
│ (postal_code varchar(10))
│ (is_primary boolean NN DEFAULT false)
│ (created_at timestamptz NN)
│ (updated_at timestamptz NN)
│
│<──── N:1 ────┤ [persons]
└────────────────────────────────────────────────────────────────────

[person_contacts] ───────────────────────────────────────────────────
│ (id uuid PK)
│ (person_id uuid FK NN) ────> [persons]
│ (contact_type contact_type NN)  -- enum: email, phone, mobile, whatsapp
│ (value varchar(320) NN)
│ (is_primary boolean NN DEFAULT false)
│ (is_verified boolean NN DEFAULT false)
│ (created_at timestamptz NN)
│ (updated_at timestamptz NN)
│
│<──── N:1 ────┤ [persons]
└────────────────────────────────────────────────────────────────────

[person_documents] ──────────────────────────────────────────────────
│ (id uuid PK)
│ (person_id uuid FK NN) ────> [persons]
│ (document_type document_type NN)  -- enum: cpf, cnpj, rg, ie, im
│ (number varchar(30) NN)
│ (created_at timestamptz NN)
│ (updated_at timestamptz NN)
│
│ UK(person_id, document_type)
│
│<──── N:1 ────┤ [persons]
└────────────────────────────────────────────────────────────────────
```

### 2.4 RBAC

```
[roles] ─────────────────────────────────────────────────────────────
│ (id uuid PK)
│ (organization_id uuid FK) - - > [organizations]  -- NULL = global
│ (code varchar(50) NN)
│ (name varchar(100) NN)
│ (description text)
│ (level integer NN DEFAULT 0)
│ (created_at timestamptz NN)
│ (updated_at timestamptz NN)
│
│ UK(organization_id, code)
│
│<──── N:1 ────┤ [organizations] (optional)
│──── 1:N ────> [role_permissions]
│──── 1:N ────> [user_roles]
└────────────────────────────────────────────────────────────────────

[permissions] ───────────────────────────────────────────────────────
│ (id uuid PK)
│ (code varchar(100) UK NN)
│ (name varchar(200) NN)
│ (module varchar(50) NN)
│ (description text)
│
│──── 1:N ────> [role_permissions]
└────────────────────────────────────────────────────────────────────

[role_permissions] ──────────────────────────────────────────────────
│ (role_id uuid FK NN) ────> [roles]
│ (permission_id uuid FK NN) ────> [permissions]
│
│ PK(role_id, permission_id)
│
│<──── N:1 ────┤ [roles]
│<──── N:1 ────┤ [permissions]
└────────────────────────────────────────────────────────────────────

[user_roles] ────────────────────────────────────────────────────────
│ (user_id uuid FK NN) ────> [users]
│ (role_id uuid FK NN) ────> [roles]
│ (granted_at timestamptz NN)
│ (granted_by uuid FK) - - > [users]
│ (expires_at timestamptz)
│
│ PK(user_id, role_id)
│
│<──── N:1 ────┤ [users]
│<──── N:1 ────┤ [roles]
└────────────────────────────────────────────────────────────────────
```

---

## 3. Módulo Financeiro

### 3.1 Financial Accounts

```
[financial_accounts] ────────────────────────────────────────────────
│ (id uuid PK)
│ (organization_id uuid FK NN) ────> [organizations]
│ (account_type financial_account_type NN)  -- enum: cash, checking, savings, investment, credit_card
│ (name varchar(100) NN)
│ (bank_code varchar(10))
│ (bank_name varchar(100))
│ (agency varchar(20))
│ (account_number varchar(30))
│ (account_digit varchar(5))
│ (pix_key varchar(100))
│ (pix_key_type varchar(20))
│ (ledger_account_id uuid FK) - - > [chart_of_accounts]
│ (opening_balance numeric(14,2) NN DEFAULT 0)
│ (opening_balance_date date NN)
│ (active boolean NN DEFAULT true)
│ (created_at timestamptz NN)
│ (created_by uuid FK)
│ (updated_at timestamptz NN)
│ (updated_by uuid FK)
│
│<──── N:1 ────┤ [organizations]
│- - - N:1 - - ┤ [chart_of_accounts] (optional)
│──── 1:N ────> [bank_statements]
│──── 1:N ────> [payments]
└────────────────────────────────────────────────────────────────────
```

### 3.2 Bank Statements

```
[bank_statements] ───────────────────────────────────────────────────
│ (id uuid PK)
│ (financial_account_id uuid FK NN) ────> [financial_accounts]
│ (file_name varchar(255) NN)
│ (file_type file_type NN)  -- enum: ofx, csv, txt, pdf
│ (file_url text)
│ (file_hash varchar(64) NN)
│ (start_date date)
│ (end_date date)
│ (opening_balance numeric(14,2))
│ (closing_balance numeric(14,2))
│ (total_lines integer NN DEFAULT 0)
│ (reconciled_lines integer NN DEFAULT 0)
│ (status statement_status NN)  -- enum: pending, processing, processed, error
│ (error_message text)
│ (imported_by uuid FK NN) ────> [users]
│ (imported_at timestamptz NN)
│
│ UK(financial_account_id, file_hash)
│
│<──── N:1 ────┤ [financial_accounts]
│<──── N:1 ────┤ [users]
│──── 1:N ────> [statement_lines]
└────────────────────────────────────────────────────────────────────

[statement_lines] ───────────────────────────────────────────────────
│ (id uuid PK)
│ (bank_statement_id uuid FK NN) ────> [bank_statements]
│ (transaction_date date NN)
│ (posting_date date)
│ (line_type movement_type NN)  -- enum: credit, debit
│ (amount numeric(14,2) NN)
│ (original_description text NN)
│ (normalized_description text)
│ (transaction_code varchar(50))
│ (bank_transaction_type varchar(50))
│ (reference_document varchar(100))
│ (status line_status NN)  -- enum: pending, reconciled, ignored, duplicate
│ (ignore_reason text)
│
│<──── N:1 ────┤ [bank_statements]
│──── 0..1:1 ──> [reconciliations]
└────────────────────────────────────────────────────────────────────

[reconciliations] ───────────────────────────────────────────────────
│ (id uuid PK)
│ (statement_line_id uuid FK UK NN) ────> [statement_lines]
│ (link_type link_type NN)  -- enum: receivable_payable, journal_entry, fee, yield
│ (receivable_payable_id uuid FK) - - > [receivables_payables]
│ (journal_entry_id uuid FK) - - > [journal_entries]
│ (method reconciliation_method NN)  -- enum: automatic, manual, suggested
│ (confidence numeric(5,2))
│ (reconciled_by uuid FK NN) ────> [users]
│ (reconciled_at timestamptz NN)
│
│<──── 1:1 ────┤ [statement_lines]
│- - - N:1 - - ┤ [receivables_payables] (optional)
│- - - N:1 - - ┤ [journal_entries] (optional)
└────────────────────────────────────────────────────────────────────
```

### 3.3 Receivables/Payables

```
[receivables_payables] ──────────────────────────────────────────────
│ (id uuid PK)
│ (organization_id uuid FK NN) ────> [organizations]
│ (direction rp_direction NN)  -- enum: in, out
│ (nature rp_nature NN)  -- enum: contribution, donation, service, etc.
│ (person_id uuid FK) - - > [persons]
│ (description varchar(500) NN)
│ (original_amount numeric(14,2) NN)
│ (discount_amount numeric(14,2) NN DEFAULT 0)
│ (addition_amount numeric(14,2) NN DEFAULT 0)
│ (net_amount numeric(14,2) NN)
│ (issue_date date NN)
│ (accrual_date date NN)
│ (due_date date NN)
│ (document_number varchar(100))
│ (document_series varchar(20))
│ (installment_number integer)
│ (total_installments integer)
│ (parent_id uuid FK) - - > [receivables_payables]
│ (cost_center_id uuid FK) - - > [cost_centers]
│ (project_id uuid FK) - - > [projects]
│ (fund_id uuid FK) - - > [funds]
│ (ledger_account_id uuid FK) - - > [chart_of_accounts]
│ (status rp_status NN DEFAULT 'draft')
│ (approved_by uuid FK) - - > [users]
│ (approved_at timestamptz)
│ (notes text)
│ (source_system varchar(50))
│ (import_batch_id uuid)
│ (deleted_at timestamptz)
│ (created_at timestamptz NN)
│ (created_by uuid FK)
│ (updated_at timestamptz NN)
│ (updated_by uuid FK)
│
│ CHECK(original_amount > 0)
│ CHECK(net_amount > 0)
│
│<──── N:1 ────┤ [organizations]
│- - - N:1 - - ┤ [persons] (optional)
│- - - N:1 - - ┤ [receivables_payables] (parent, optional)
│- - - N:1 - - ┤ [cost_centers] (optional)
│- - - N:1 - - ┤ [projects] (optional)
│- - - N:1 - - ┤ [funds] (optional)
│- - - N:1 - - ┤ [chart_of_accounts] (optional)
│──── 1:N ────> [payments]
│──── 1:N ────> [attachments]
│──── 1:N ────> [reconciliations]
└────────────────────────────────────────────────────────────────────

[payments] ──────────────────────────────────────────────────────────
│ (id uuid PK)
│ (receivable_payable_id uuid FK NN) ────> [receivables_payables]
│ (financial_account_id uuid FK NN) ────> [financial_accounts]
│ (payment_date date NN)
│ (amount_paid numeric(14,2) NN)
│ (interest_amount numeric(14,2) NN DEFAULT 0)
│ (fine_amount numeric(14,2) NN DEFAULT 0)
│ (discount_amount numeric(14,2) NN DEFAULT 0)
│ (payment_method payment_method NN)
│ (reference_document varchar(100))
│ (is_reversal boolean NN DEFAULT false)
│ (reversal_reason text)
│ (reverses_payment_id uuid FK) - - > [payments]
│ (journal_entry_id uuid FK) - - > [journal_entries]
│ (notes text)
│ (created_at timestamptz NN)
│ (created_by uuid FK)
│ (updated_at timestamptz NN)
│ (updated_by uuid FK)
│
│ CHECK(amount_paid > 0)
│
│<──── N:1 ────┤ [receivables_payables]
│<──── N:1 ────┤ [financial_accounts]
│- - - N:1 - - ┤ [payments] (reversal, optional)
│- - - N:1 - - ┤ [journal_entries] (optional)
└────────────────────────────────────────────────────────────────────

[attachments] ───────────────────────────────────────────────────────
│ (id uuid PK)
│ (entity_type entity_type NN)  -- enum: receivable_payable, payment, journal_entry, person, asset
│ (entity_id uuid NN)
│ (file_name varchar(255) NN)
│ (file_type varchar(100) NN)
│ (file_size integer NN)
│ (storage_url text NN)
│ (file_hash varchar(64) NN)
│ (category attachment_category)  -- enum: invoice, receipt, proof, contract, other
│ (description text)
│ (created_at timestamptz NN)
│ (created_by uuid FK)
│ (updated_at timestamptz NN)
│ (updated_by uuid FK)
│
│ (Polymorphic: entity_type + entity_id)
└────────────────────────────────────────────────────────────────────
```

---

## 4. Módulo Contábil

### 4.1 Chart of Accounts

```
[chart_of_accounts] ─────────────────────────────────────────────────
│ (id uuid PK)
│ (organization_id uuid FK NN) ────> [organizations]
│ (code varchar(20) NN)
│ (name varchar(255) NN)
│ (category account_category NN)  -- enum: asset, liability, equity, revenue, expense
│ (balance_type balance_type NN)  -- enum: debit, credit
│ (classification account_classification NN)  -- enum: synthetic, analytical
│ (level integer NN)
│ (parent_id uuid FK) - - > [chart_of_accounts]
│ (allows_entries boolean NN)
│ (active boolean NN DEFAULT true)
│ (description text)
│ (tags text[])
│ (deleted_at timestamptz)
│ (created_at timestamptz NN)
│ (created_by uuid FK)
│ (updated_at timestamptz NN)
│ (updated_by uuid FK)
│
│ UK(organization_id, code)
│
│<──── N:1 ────┤ [organizations]
│- - - N:1 - - ┤ [chart_of_accounts] (parent, optional)
│──── 1:N ────> [chart_of_accounts] (children)
│──── 1:N ────> [journal_lines]
│──── 1:N ────> [period_balances]
│──── 1:N ────> [financial_accounts] (linked)
│──── 1:N ────> [receivables_payables] (classification)
│──── 1:N ────> [fixed_assets] (asset account)
└────────────────────────────────────────────────────────────────────
```

### 4.2 Accounting Periods

```
[accounting_periods] ────────────────────────────────────────────────
│ (id uuid PK)
│ (organization_id uuid FK NN) ────> [organizations]
│ (year integer NN)
│ (month integer NN)
│ (start_date date NN)
│ (end_date date NN)
│ (status period_status NN DEFAULT 'open')  -- enum: open, review, closed, reopened
│ (closed_by uuid FK) - - > [users]
│ (closed_at timestamptz)
│ (reopened_by uuid FK) - - > [users]
│ (reopened_at timestamptz)
│ (reopen_reason text)
│ (notes text)
│ (created_at timestamptz NN)
│ (created_by uuid FK)
│ (updated_at timestamptz NN)
│ (updated_by uuid FK)
│
│ UK(organization_id, year, month)
│
│<──── N:1 ────┤ [organizations]
│──── 1:N ────> [journal_entries]
│──── 1:N ────> [period_balances]
│──── 1:N ────> [depreciation_entries]
└────────────────────────────────────────────────────────────────────
```

### 4.3 Journal Entries (Partidas Dobradas)

```
[journal_entries] ───────────────────────────────────────────────────
│ (id uuid PK)
│ (organization_id uuid FK NN) ────> [organizations]
│ (entry_number serial NN)
│ (period_id uuid FK NN) ────> [accounting_periods]
│ (entry_date date NN)
│ (accrual_date date NN)
│ (memo text NN)
│ (document_ref varchar(100))
│ (origin journal_origin NN)  -- enum: manual, payment, bank_statement, depreciation, closing, adjustment
│ (origin_id uuid)
│ (status journal_status NN DEFAULT 'draft')  -- enum: draft, posted, reversed
│ (reverses_entry_id uuid FK) - - > [journal_entries]
│ (total_debit numeric(14,2) NN)
│ (total_credit numeric(14,2) NN)
│ (created_at timestamptz NN)
│ (created_by uuid FK)
│ (updated_at timestamptz NN)
│ (updated_by uuid FK)
│
│ UK(organization_id, entry_number)
│ CHECK(total_debit = total_credit)
│
│<──── N:1 ────┤ [organizations]
│<──── N:1 ────┤ [accounting_periods]
│- - - N:1 - - ┤ [journal_entries] (reversal, optional)
│──── 1:N ────> [journal_lines]
│──── 1:N ────> [payments] (origin)
│──── 1:N ────> [reconciliations]
└────────────────────────────────────────────────────────────────────

[journal_lines] ─────────────────────────────────────────────────────
│ (id uuid PK)
│ (journal_entry_id uuid FK NN) ────> [journal_entries] ON DELETE CASCADE
│ (line_order integer NN)
│ (account_id uuid FK NN) ────> [chart_of_accounts]
│ (line_type line_type NN)  -- enum: debit, credit
│ (amount numeric(14,2) NN)
│ (memo text)
│ (cost_center_id uuid FK) - - > [cost_centers]
│ (project_id uuid FK) - - > [projects]
│ (fund_id uuid FK) - - > [funds]
│
│ UK(journal_entry_id, line_order)
│ CHECK(amount > 0)
│
│<──── N:1 ────┤ [journal_entries]
│<──── N:1 ────┤ [chart_of_accounts]
│- - - N:1 - - ┤ [cost_centers] (optional)
│- - - N:1 - - ┤ [projects] (optional)
│- - - N:1 - - ┤ [funds] (optional)
└────────────────────────────────────────────────────────────────────

[period_balances] ───────────────────────────────────────────────────
│ (id uuid PK)
│ (account_id uuid FK NN) ────> [chart_of_accounts]
│ (period_id uuid FK NN) ────> [accounting_periods]
│ (opening_balance numeric(14,2) NN)
│ (total_debits numeric(14,2) NN)
│ (total_credits numeric(14,2) NN)
│ (closing_balance numeric(14,2) NN)
│
│ UK(account_id, period_id)
│
│<──── N:1 ────┤ [chart_of_accounts]
│<──── N:1 ────┤ [accounting_periods]
└────────────────────────────────────────────────────────────────────
```

---

## 5. Módulo Patrimônio

```
[fixed_assets] ──────────────────────────────────────────────────────
│ (id uuid PK)
│ (organization_id uuid FK NN) ────> [organizations]
│ (asset_code varchar(30) NN)
│ (description varchar(500) NN)
│ (category asset_category NN)  -- enum: real_estate, vehicle, equipment, furniture, it, other
│ (acquisition_date date NN)
│ (acquisition_value numeric(14,2) NN)
│ (residual_value numeric(14,2) NN DEFAULT 0)
│ (useful_life_months integer NN)
│ (depreciation_method depreciation_method NN)  -- enum: linear, none
│ (asset_account_id uuid FK NN) ────> [chart_of_accounts]
│ (depreciation_expense_account_id uuid FK) - - > [chart_of_accounts]
│ (accumulated_depreciation_account_id uuid FK) - - > [chart_of_accounts]
│ (supplier_id uuid FK) - - > [persons]
│ (invoice_number varchar(50))
│ (location varchar(200))
│ (responsible_person_id uuid FK) - - > [persons]
│ (project_id uuid FK) - - > [projects]
│ (fund_id uuid FK) - - > [funds]
│ (status asset_status NN)  -- enum: in_use, maintenance, disposed, sold, lost
│ (disposal_date date)
│ (disposal_reason text)
│ (disposal_value numeric(14,2))
│ (acquisition_payable_id uuid FK) - - > [receivables_payables]
│ (created_at timestamptz NN)
│ (created_by uuid FK)
│ (updated_at timestamptz NN)
│ (updated_by uuid FK)
│
│ UK(organization_id, asset_code)
│
│<──── N:1 ────┤ [organizations]
│<──── N:1 ────┤ [chart_of_accounts] (asset)
│- - - N:1 - - ┤ [chart_of_accounts] (depreciation expense)
│- - - N:1 - - ┤ [chart_of_accounts] (accumulated depreciation)
│- - - N:1 - - ┤ [persons] (supplier)
│- - - N:1 - - ┤ [persons] (responsible)
│- - - N:1 - - ┤ [projects]
│- - - N:1 - - ┤ [funds]
│- - - N:1 - - ┤ [receivables_payables] (acquisition)
│──── 1:N ────> [depreciation_entries]
│──── 1:N ────> [asset_transfers]
└────────────────────────────────────────────────────────────────────

[depreciation_entries] ──────────────────────────────────────────────
│ (id uuid PK)
│ (fixed_asset_id uuid FK NN) ────> [fixed_assets]
│ (period_id uuid FK NN) ────> [accounting_periods]
│ (depreciation_amount numeric(14,2) NN)
│ (accumulated_depreciation numeric(14,2) NN)
│ (book_value numeric(14,2) NN)
│ (journal_entry_id uuid FK) - - > [journal_entries]
│
│ UK(fixed_asset_id, period_id)
│
│<──── N:1 ────┤ [fixed_assets]
│<──── N:1 ────┤ [accounting_periods]
│- - - N:1 - - ┤ [journal_entries]
└────────────────────────────────────────────────────────────────────

[asset_transfers] ───────────────────────────────────────────────────
│ (id uuid PK)
│ (fixed_asset_id uuid FK NN) ────> [fixed_assets]
│ (transfer_date timestamptz NN)
│ (previous_location varchar(200))
│ (new_location varchar(200))
│ (previous_responsible_id uuid FK) - - > [persons]
│ (new_responsible_id uuid FK) - - > [persons]
│ (reason text NN)
│ (created_by uuid FK)
│ (created_at timestamptz NN)
│
│<──── N:1 ────┤ [fixed_assets]
└────────────────────────────────────────────────────────────────────
```

---

## 6. Módulo Projetos/Fundos

```
[cost_centers] ──────────────────────────────────────────────────────
│ (id uuid PK)
│ (organization_id uuid FK NN) ────> [organizations]
│ (code varchar(20) NN)
│ (name varchar(100) NN)
│ (description text)
│ (responsible_id uuid FK) - - > [persons]
│ (active boolean NN DEFAULT true)
│ (created_at timestamptz NN)
│ (created_by uuid FK)
│ (updated_at timestamptz NN)
│ (updated_by uuid FK)
│
│ UK(organization_id, code)
│
│<──── N:1 ────┤ [organizations]
│──── 1:N ────> [projects]
│──── 1:N ────> [receivables_payables]
│──── 1:N ────> [journal_lines]
└────────────────────────────────────────────────────────────────────

[projects] ──────────────────────────────────────────────────────────
│ (id uuid PK)
│ (organization_id uuid FK NN) ────> [organizations]
│ (code varchar(20) NN)
│ (name varchar(200) NN)
│ (description text)
│ (start_date date)
│ (planned_end_date date)
│ (actual_end_date date)
│ (budget numeric(14,2))
│ (status project_status NN)  -- enum: planning, active, suspended, completed, cancelled
│ (cost_center_id uuid FK) - - > [cost_centers]
│ (responsible_id uuid FK) - - > [persons]
│ (is_mrosc_partnership boolean NN DEFAULT false)
│ (partnership_number varchar(50))
│ (partner_agency varchar(200))
│ (created_at timestamptz NN)
│ (created_by uuid FK)
│ (updated_at timestamptz NN)
│ (updated_by uuid FK)
│
│ UK(organization_id, code)
│
│<──── N:1 ────┤ [organizations]
│- - - N:1 - - ┤ [cost_centers]
│──── 1:N ────> [receivables_payables]
│──── 1:N ────> [journal_lines]
│──── 1:N ────> [fixed_assets]
│──── 1:N ────> [fund_allocations]
└────────────────────────────────────────────────────────────────────

[funds] ─────────────────────────────────────────────────────────────
│ (id uuid PK)
│ (organization_id uuid FK NN) ────> [organizations]
│ (code varchar(20) NN)
│ (name varchar(200) NN)
│ (description text)
│ (fund_type fund_type NN)  -- enum: restricted, designated, unrestricted
│ (purpose text)
│ (start_date date)
│ (end_date date)
│ (target_amount numeric(14,2))
│ (current_balance numeric(14,2) NN DEFAULT 0)
│ (active boolean NN DEFAULT true)
│ (created_at timestamptz NN)
│ (created_by uuid FK)
│ (updated_at timestamptz NN)
│ (updated_by uuid FK)
│
│ UK(organization_id, code)
│
│<──── N:1 ────┤ [organizations]
│──── 1:N ────> [fund_rules]
│──── 1:N ────> [fund_allocations]
│──── 1:N ────> [fund_consumptions]
│──── 1:N ────> [receivables_payables]
│──── 1:N ────> [journal_lines]
│──── 1:N ────> [fixed_assets]
└────────────────────────────────────────────────────────────────────

[fund_allocations] ──────────────────────────────────────────────────
│ (id uuid PK)
│ (fund_id uuid FK NN) ────> [funds]
│ (journal_line_id uuid FK) - - > [journal_lines]
│ (amount numeric(14,2) NN)
│ (allocation_date date NN)
│ (source_description text)
│ (created_at timestamptz NN)
│ (created_by uuid FK)
│
│<──── N:1 ────┤ [funds]
│- - - N:1 - - ┤ [journal_lines]
└────────────────────────────────────────────────────────────────────

[fund_consumptions] ─────────────────────────────────────────────────
│ (id uuid PK)
│ (fund_id uuid FK NN) ────> [funds]
│ (journal_line_id uuid FK) - - > [journal_lines]
│ (receivable_payable_id uuid FK) - - > [receivables_payables]
│ (amount numeric(14,2) NN)
│ (consumption_date date NN)
│ (justification text)
│ (approved_by uuid FK) - - > [users]
│ (approved_at timestamptz)
│ (created_at timestamptz NN)
│ (created_by uuid FK)
│
│<──── N:1 ────┤ [funds]
│- - - N:1 - - ┤ [journal_lines]
│- - - N:1 - - ┤ [receivables_payables]
│- - - N:1 - - ┤ [users] (approver)
└────────────────────────────────────────────────────────────────────
```

---

## 7. Extensão Centro Espírita

```
[ext_center_members] ────────────────────────────────────────────────
│ (id uuid PK)
│ (person_id uuid FK UK NN) ────> [persons]
│ (registration_number varchar(20))
│ (admission_date date NN)
│ (departure_date date)
│ (status member_status NN)  -- enum: active, suspended, inactive, deceased
│ (category member_category NN)  -- enum: worker, attendee, honorary, medium, etc.
│ (suggested_contribution numeric(14,2))
│ (contribution_periodicity periodicity NN DEFAULT 'monthly')
│ (contribution_due_day integer)
│ (is_exempt boolean NN DEFAULT false)
│ (exemption_reason text)
│ (created_at timestamptz NN)
│ (created_by uuid FK)
│ (updated_at timestamptz NN)
│ (updated_by uuid FK)
│
│<──── 1:1 ────┤ [persons]
└────────────────────────────────────────────────────────────────────

[ext_center_study_groups] ───────────────────────────────────────────
│ (id uuid PK)
│ (organization_id uuid FK NN) ────> [organizations]
│ (name varchar(100) NN)
│ (description text)
│ (weekday integer)
│ (time varchar(10))
│ (room varchar(50))
│ (leader_person_id uuid FK) - - > [persons]
│ (current_book varchar(200))
│ (active boolean NN DEFAULT true)
│ (created_at timestamptz NN)
│ (created_by uuid FK)
│ (updated_at timestamptz NN)
│ (updated_by uuid FK)
│
│<──── N:1 ────┤ [organizations]
│- - - N:1 - - ┤ [persons] (leader)
│──── 1:N ────> [ext_center_mediumship_profiles]
└────────────────────────────────────────────────────────────────────

[ext_center_mediumship_profiles] ────────────────────────────────────
│ (id uuid PK)
│ (person_id uuid FK UK NN) ────> [persons]
│ (mediumship_types text[])
│ (development_start_date date)
│ (study_group_id uuid FK) - - > [ext_center_study_groups]
│ (notes text)
│ (created_at timestamptz NN)
│ (created_by uuid FK)
│ (updated_at timestamptz NN)
│ (updated_by uuid FK)
│
│<──── 1:1 ────┤ [persons]
│- - - N:1 - - ┤ [ext_center_study_groups]
└────────────────────────────────────────────────────────────────────
```

---

## 8. Auditoria

```
[audit_events] ──────────────────────────────────────────────────────
│ (id uuid PK)
│ (user_id uuid FK) - - > [users]
│ (entity_type varchar(50) NN)
│ (entity_id uuid NN)
│ (action audit_action NN)  -- enum: create, update, delete, view, export, close, reopen, approve, reject
│ (old_data jsonb)
│ (new_data jsonb)
│ (ip_address varchar(45))
│ (user_agent text)
│ (created_at timestamptz NN)
│
│- - - N:1 - - ┤ [users]
└────────────────────────────────────────────────────────────────────
```

---

## 9. Resumo de Cardinalidades

| Relação | Cardinalidade | FK Location |
|---------|---------------|-------------|
| organizations → users | 1:N | users.organization_id |
| organizations → persons | 1:N | persons.organization_id |
| organizations → financial_accounts | 1:N | financial_accounts.organization_id |
| organizations → chart_of_accounts | 1:N | chart_of_accounts.organization_id |
| organizations → accounting_periods | 1:N | accounting_periods.organization_id |
| organizations → journal_entries | 1:N | journal_entries.organization_id |
| organizations → receivables_payables | 1:N | receivables_payables.organization_id |
| organizations → cost_centers | 1:N | cost_centers.organization_id |
| organizations → projects | 1:N | projects.organization_id |
| organizations → funds | 1:N | funds.organization_id |
| organizations → fixed_assets | 1:N | fixed_assets.organization_id |
| persons → person_addresses | 1:N | person_addresses.person_id |
| persons → person_contacts | 1:N | person_contacts.person_id |
| persons → person_documents | 1:N | person_documents.person_id |
| persons → ext_center_members | 1:0..1 | ext_center_members.person_id |
| persons → receivables_payables | 1:N | receivables_payables.person_id |
| financial_accounts → bank_statements | 1:N | bank_statements.financial_account_id |
| financial_accounts → payments | 1:N | payments.financial_account_id |
| bank_statements → statement_lines | 1:N | statement_lines.bank_statement_id |
| statement_lines → reconciliations | 1:0..1 | reconciliations.statement_line_id |
| receivables_payables → payments | 1:N | payments.receivable_payable_id |
| receivables_payables → attachments | 1:N | attachments.entity_id (polymorphic) |
| chart_of_accounts → chart_of_accounts (self) | 1:N | chart_of_accounts.parent_id |
| chart_of_accounts → journal_lines | 1:N | journal_lines.account_id |
| accounting_periods → journal_entries | 1:N | journal_entries.period_id |
| journal_entries → journal_lines | 1:N | journal_lines.journal_entry_id |
| fixed_assets → depreciation_entries | 1:N | depreciation_entries.fixed_asset_id |
| fixed_assets → asset_transfers | 1:N | asset_transfers.fixed_asset_id |
| cost_centers → projects | 1:N | projects.cost_center_id |
| funds → fund_allocations | 1:N | fund_allocations.fund_id |
| funds → fund_consumptions | 1:N | fund_consumptions.fund_id |
| roles → role_permissions | 1:N | role_permissions.role_id |
| permissions → role_permissions | 1:N | role_permissions.permission_id |
| users → user_roles | 1:N | user_roles.user_id |
| roles → user_roles | 1:N | user_roles.role_id |

