# Data Dictionary - CentrOS

> **Data**: 2025-12-23  
> **Fonte**: `docs/input-mapping/screens/*.md` e `inputs-summary.csv`

## 1. Convenções

| Símbolo | Significado |
|---------|-------------|
| ✓ | Campo mapeado diretamente do input |
| ○ | Campo derivado/calculado |
| ◇ | Campo recomendado (não no input) |
| ? | Campo unknown/a confirmar |

---

## 2. Tela: Login

**Rota**: `/login`  
**Arquivo**: `client/src/pages/Login.tsx`

| Input | Tipo | Obrigatório | Validação | Tabela Proposta | Coluna | Status |
|-------|------|-------------|-----------|-----------------|--------|--------|
| email | email | Sim | formato email | `users` | `email` | ✓ |
| password | password | Sim | - | (auth provider) | - | ✓ |

**Notas**: Autenticação delegada ao provider (Clerk/Auth0). Password não armazenado no banco.

---

## 3. Tela: Dashboard

**Rota**: `/`  
**Arquivo**: `client/src/pages/Dashboard.tsx`

| Input | Tipo | Obrigatório | Tabela Proposta | Coluna | Status |
|-------|------|-------------|-----------------|--------|--------|
| - | - | - | - | - | (read-only) |

**Dados Exibidos**:
- KPIs de `receivables_payables` (somatórios)
- KPIs de `journal_entries` (receitas/despesas)
- Gráficos de `period_balances`

---

## 4. Tela: Pessoas

**Rota**: `/pessoas`  
**Arquivo**: `client/src/pages/Pessoas.tsx`

### 4.1 Filtros

| Input | Tipo | Obrigatório | Destino | Status |
|-------|------|-------------|---------|--------|
| search | text | Não | Query filter (nome, documento) | ✓ |

### 4.2 Formulário (PessoaWizard)

| Input | Tipo | Obrigatório | Validação | Tabela | Coluna | Status |
|-------|------|-------------|-----------|--------|--------|--------|
| nome | text | Sim | min 3 chars | `persons` | `name` | ✓ |
| documento | text | Não | CPF/CNPJ | `person_documents` | `number` | ✓ |
| email | email | Não | formato email | `person_contacts` | `value` | ✓ |
| telefone | text | Não | - | `person_contacts` | `value` | ✓ |
| endereco | textarea | Não | - | `person_addresses` | (múltiplos campos) | ✓ |
| isAssociado | checkbox | Não | - | `ext_center_members` | (existência) | ✓ |
| ativo | switch | Não | default: true | `persons` | `active` | ✓ |

### 4.3 Campos Derivados/Recomendados

| Campo | Tabela | Coluna | Tipo | Status |
|-------|--------|--------|------|--------|
| Tipo Pessoa | `persons` | `person_type` | enum | ◇ (inferido do documento) |
| Razão Social | `persons` | `legal_name` | varchar | ◇ (PJ) |
| organization_id | `persons` | `organization_id` | uuid FK | ◇ (multiempresa) |

---

## 5. Tela: Contas Financeiras

**Rota**: `/contas`  
**Arquivo**: `client/src/pages/ContasFinanceiras.tsx`

### 5.1 Filtros

| Input | Tipo | Obrigatório | Destino | Status |
|-------|------|-------------|---------|--------|
| search | text | Não | Filtro local | ✓ |

### 5.2 Formulário (ContaFinanceiraWizard)

| Input | Tipo | Obrigatório | Validação | Tabela | Coluna | Status |
|-------|------|-------------|-----------|--------|--------|--------|
| tipo | select | Sim | enum | `financial_accounts` | `account_type` | ✓ |
| nome | text | Sim | - | `financial_accounts` | `name` | ✓ |
| bancoCodigo | select | Condicional | se tipo !== 'caixa' | `financial_accounts` | `bank_code` | ✓ |
| bancoNome | text | Condicional | auto-preenchido | `financial_accounts` | `bank_name` | ✓ |

### 5.3 Campos Recomendados

| Campo | Tabela | Coluna | Tipo | Status |
|-------|--------|--------|------|--------|
| Agência | `financial_accounts` | `agency` | varchar | ◇ |
| Número da Conta | `financial_accounts` | `account_number` | varchar | ◇ |
| Dígito | `financial_accounts` | `account_digit` | varchar | ◇ |
| Chave PIX | `financial_accounts` | `pix_key` | varchar | ◇ |
| Tipo PIX | `financial_accounts` | `pix_key_type` | varchar | ◇ |
| Conta Contábil | `financial_accounts` | `ledger_account_id` | uuid FK | ◇ |
| Saldo Inicial | `financial_accounts` | `opening_balance` | numeric | ◇ |
| Data Saldo Inicial | `financial_accounts` | `opening_balance_date` | date | ◇ |

---

## 6. Tela: Extratos

**Rota**: `/extratos/:id`  
**Arquivo**: `client/src/pages/Extratos.tsx`

| Input | Tipo | Status |
|-------|------|--------|
| - | - | (read-only) |

**Dados Exibidos de**:
- `bank_statements` (header)
- `statement_lines` (linhas)
- `reconciliations` (status de conciliação)

---

## 7. Tela: Títulos

**Rota**: `/titulos`  
**Arquivo**: `client/src/pages/Titulos.tsx`

### 7.1 Filtros

| Input | Tipo | Obrigatório | Destino | Status |
|-------|------|-------------|---------|--------|
| search | text | Não | Filtro local | ✓ |
| periodoInicio | date | Não | Query filter | ✓ |
| periodoFim | date | Não | Query filter | ✓ |

### 7.2 Formulário (TituloWizard)

| Input | Tipo | Obrigatório | Validação | Tabela | Coluna | Status |
|-------|------|-------------|-----------|--------|--------|--------|
| tipo | radio | Sim | receita/despesa | `receivables_payables` | `direction` | ✓ |
| descricao | text | Sim | min 3 chars | `receivables_payables` | `description` | ✓ |
| valor | number | Sim | > 0 | `receivables_payables` | `original_amount`, `net_amount` | ✓ |
| competencia | date | Sim | - | `receivables_payables` | `accrual_date` | ✓ |
| vencimento | date | Não | - | `receivables_payables` | `due_date` | ✓ |
| contaId | select | Sim | - | `receivables_payables` | `financial_account_id` | ? |
| pessoaId | combobox | Não | - | `receivables_payables` | `person_id` | ✓ |
| contaContabilId | select | Não | - | `receivables_payables` | `ledger_account_id` | ✓ |

**Nota**: O input `contaId` no mapeamento aponta para conta financeira, mas títulos normalmente não têm vínculo direto com conta financeira até a baixa. Verificar se deve ser `ledger_account_id` ou campo removido.

### 7.3 Campos Derivados/Recomendados

| Campo | Tabela | Coluna | Tipo | Status |
|-------|--------|--------|------|--------|
| Natureza | `receivables_payables` | `nature` | enum | ◇ |
| Data Emissão | `receivables_payables` | `issue_date` | date | ○ (default: hoje) |
| Número Documento | `receivables_payables` | `document_number` | varchar | ◇ |
| Centro de Custo | `receivables_payables` | `cost_center_id` | uuid FK | ◇ |
| Projeto | `receivables_payables` | `project_id` | uuid FK | ◇ |
| Fundo | `receivables_payables` | `fund_id` | uuid FK | ◇ |
| Status | `receivables_payables` | `status` | enum | ○ (default: draft) |

---

## 8. Tela: Pagar e Receber (TitulosCrud)

**Rota**: `/pagar-receber`  
**Arquivo**: `client/src/pages/TitulosCrud.tsx`

### 8.1 Filtros

| Input | Tipo | Obrigatório | Destino | Status |
|-------|------|-------------|---------|--------|
| search | text | Não | Filtro local | ✓ |
| periodoInicio | date | Não | Query filter | ✓ |
| periodoFim | date | Não | Query filter | ✓ |

### 8.2 Modal de Baixa

| Input | Tipo | Obrigatório | Validação | Tabela | Coluna | Status |
|-------|------|-------------|-----------|--------|--------|--------|
| dataBaixa | date | Sim | <= hoje | `payments` | `payment_date` | ✓ |
| valorPago | number | Sim | > 0 | `payments` | `amount_paid` | ✓ |
| contaId | select | Sim | - | `payments` | `financial_account_id` | ✓ |
| observacao | textarea | Não | - | `payments` | `notes` | ✓ |

### 8.3 Campos Derivados

| Campo | Tabela | Coluna | Tipo | Status |
|-------|--------|--------|------|--------|
| Forma Pagamento | `payments` | `payment_method` | enum | ◇ |
| Juros | `payments` | `interest_amount` | numeric | ◇ |
| Multa | `payments` | `fine_amount` | numeric | ◇ |
| Desconto | `payments` | `discount_amount` | numeric | ◇ |
| Documento Ref | `payments` | `reference_document` | varchar | ◇ |

---

## 9. Tela: Contabilidade

**Rota**: `/contabilidade`  
**Arquivo**: `client/src/pages/Contabilidade.tsx`

### 9.1 Filtros

| Input | Tipo | Obrigatório | Destino | Status |
|-------|------|-------------|---------|--------|
| ano | select | Sim | Query filter | ✓ |
| mes | select | Não | Query filter | ✓ |

### 9.2 Modal Novo Lançamento Manual

| Input | Tipo | Obrigatório | Validação | Tabela | Coluna | Status |
|-------|------|-------------|-----------|--------|--------|--------|
| data | date | Sim | - | `journal_entries` | `entry_date` | ✓ |
| contaDebitoId | select | Sim | - | `journal_lines` | `account_id` (D) | ✓ |
| contaCreditoId | select | Sim | - | `journal_lines` | `account_id` (C) | ✓ |
| valor | number | Sim | > 0 | `journal_lines` | `amount` | ✓ |
| historico | text | Sim | min 5 chars | `journal_entries` | `memo` | ✓ |
| documento | text | Não | - | `journal_entries` | `document_ref` | ✓ |
| competencia | date | Não | - | `journal_entries` | `accrual_date` | ✓ |

**Notas**: Lançamento simples (1 débito, 1 crédito). Para partidas múltiplas, usar `/entries`.

---

## 10. Tela: Plano de Contas

**Rota**: `/accounts`  
**Arquivo**: `client/src/pages/Accounts.tsx`

### 10.1 Filtros

| Input | Tipo | Obrigatório | Destino | Status |
|-------|------|-------------|---------|--------|
| search | text | Não | Filtro local | ✓ |

### 10.2 Formulário

| Input | Tipo | Obrigatório | Validação | Tabela | Coluna | Status |
|-------|------|-------------|-----------|--------|--------|--------|
| codigo | text | Sim | formato X.X.X | `chart_of_accounts` | `code` | ✓ |
| nome | text | Sim | min 3 chars | `chart_of_accounts` | `name` | ✓ |
| tipo | select | Sim | analitica/sintetica | `chart_of_accounts` | `classification` | ✓ |
| natureza | select | Sim | 1-4 | `chart_of_accounts` | `category` | ✓ |
| contaPaiId | select | Condicional | se nivel > 1 | `chart_of_accounts` | `parent_id` | ✓ |
| ativo | switch | Não | default: true | `chart_of_accounts` | `active` | ✓ |
| descricao | textarea | Não | - | `chart_of_accounts` | `description` | ✓ |

### 10.3 Mapeamento de Natureza

| Valor Input | Enum Proposto |
|-------------|---------------|
| 1 | `asset` |
| 2 | `liability` |
| 3 | `revenue` |
| 4 | `expense` |

**Nota**: Considerar adicionar `equity` (patrimônio líquido/social) como 5ª natureza.

---

## 11. Tela: Lançamentos

**Rota**: `/entries`  
**Arquivo**: `client/src/pages/Entries.tsx`

### 11.1 Filtros

| Input | Tipo | Obrigatório | Destino | Status |
|-------|------|-------------|---------|--------|
| periodFilter | select | Não | Query filter | ✓ |

### 11.2 Formulário

| Input | Tipo | Obrigatório | Validação | Tabela | Coluna | Status |
|-------|------|-------------|-----------|--------|--------|--------|
| periodId | select | Sim | período aberto | `journal_entries` | `period_id` | ✓ |
| transactionDate | date | Sim | - | `journal_entries` | `entry_date` | ✓ |
| accountId | select | Sim | conta analítica | `journal_lines` | `account_id` | ✓ |
| type | select | Sim | debit/credit | `journal_lines` | `line_type` | ✓ |
| amountCents | text | Sim | > 0 | `journal_lines` | `amount` | ✓ |
| description | text | Sim | - | `journal_entries` | `memo` | ✓ |
| isNfc | checkbox | Não | - | (campo específico) | ? | ? |
| nfcCategory | select | Condicional | se isNfc && debit | (campo específico) | ? | ? |
| notes | textarea | Não | - | `journal_lines` | `memo` | ✓ |

**Campos Específicos `isNfc` e `nfcCategory`**:
- Relacionados a "Nota Fiscal Cidadã" (programa específico)
- Sugestão: mover para extensão ou configuração por organização
- Opção: adicionar tags/metadata em `journal_lines`

---

## 12. Tela: Períodos

**Rota**: `/periods`  
**Arquivo**: `client/src/pages/Periods.tsx`

### 12.1 Filtros

| Input | Tipo | Obrigatório | Destino | Status |
|-------|------|-------------|---------|--------|
| filtroAno | select | Não | Filtro local | ✓ |

### 12.2 Formulário (PeriodoWizard)

| Input | Tipo | Obrigatório | Validação | Tabela | Coluna | Status |
|-------|------|-------------|-----------|--------|--------|--------|
| year | select | Sim | - | `accounting_periods` | `year` | ✓ |
| month | select | Sim | 1-12 | `accounting_periods` | `month` | ✓ |

### 12.3 Campos Derivados

| Campo | Tabela | Coluna | Tipo | Status |
|-------|--------|--------|------|--------|
| Data Início | `accounting_periods` | `start_date` | date | ○ (calculado) |
| Data Fim | `accounting_periods` | `end_date` | date | ○ (calculado) |
| Status | `accounting_periods` | `status` | enum | ○ (default: open) |

---

## 13. Tela: Conciliação

**Rota**: `/conciliacao`  
**Arquivo**: `client/src/pages/Conciliacao.tsx`

### 13.1 Filtros

| Input | Tipo | Obrigatório | Destino | Status |
|-------|------|-------------|---------|--------|
| contaId | select | Sim | Query filter | ✓ |
| periodo | select | Não | Query filter | ✓ |

### 13.2 Ações

| Ação | Tabela Afetada | Campos | Status |
|------|----------------|--------|--------|
| Match Automático | `reconciliations` | `method='automatic'` | ✓ |
| Match Manual | `reconciliations` | `method='manual'` | ✓ |
| Criar Título | `receivables_payables` | (novo registro) | ✓ |
| Ignorar | `statement_lines` | `status='ignored'` | ✓ |

---

## 14. Tela: Importação

**Rota**: `/import`  
**Arquivo**: `client/src/pages/Import.tsx`

### 14.1 Inputs

| Input | Tipo | Obrigatório | Validação | Destino | Status |
|-------|------|-------------|-----------|---------|--------|
| file | file | Sim | .csv, .ofx, .xlsx | Parser | ✓ |
| tipoImportacao | select | Sim | enum | Parser config | ✓ |

### 14.2 Tipos de Importação → Tabela Destino

| Tipo | Tabela Destino | Status |
|------|----------------|--------|
| Extrato Bancário | `bank_statements`, `statement_lines` | ✓ |
| Títulos | `receivables_payables` | ✓ |
| Pessoas | `persons`, `person_*` | ✓ |
| Plano de Contas | `chart_of_accounts` | ✓ |

---

## 15. Tela: Relatórios

**Rota**: `/reports`  
**Arquivo**: `client/src/pages/Reports.tsx`

### 15.1 Filtros

| Input | Tipo | Obrigatório | Validação | Destino | Status |
|-------|------|-------------|-----------|---------|--------|
| tipoRelatorio | select | Sim | - | Query config | ✓ |
| periodoInicio | date | Sim | - | Query filter | ✓ |
| periodoFim | date | Sim | >= inicio | Query filter | ✓ |
| formato | select | Não | pdf/xlsx/csv | Exportação | ✓ |

### 15.2 Filtros Adicionais (por relatório)

| Input | Relatórios | Tabela | Coluna | Status |
|-------|------------|--------|--------|--------|
| contaId | Razão | `chart_of_accounts` | `id` | ✓ |
| pessoaId | Contribuições | `persons` | `id` | ✓ |
| status | Inadimplência | `receivables_payables` | `status` | ✓ |
| centroCustoId | Vários | `cost_centers` | `id` | ✓ |

---

## 16. Tela: Governança

**Rota**: `/governanca`  
**Arquivo**: `client/src/pages/Governanca.tsx`

### 16.1 Seção Usuários

| Input | Tipo | Obrigatório | Validação | Tabela | Coluna | Status |
|-------|------|-------------|-----------|--------|--------|--------|
| nome | text | Sim | min 3 chars | `users` | `name` | ✓ |
| email | email | Sim | formato email | `users` | `email` | ✓ |
| papelId | select | Não | - | `user_roles` | `role_id` | ✓ |
| ativo | switch | Não | default: true | `users` | `active` | ✓ |

### 16.2 Seção Papéis

| Input | Tipo | Obrigatório | Validação | Tabela | Coluna | Status |
|-------|------|-------------|-----------|--------|--------|--------|
| nome | text | Sim | min 3 chars | `roles` | `name` | ✓ |
| descricao | text | Não | - | `roles` | `description` | ✓ |
| permissoes | checkbox-group | Não | - | `role_permissions` | `permission_id` | ✓ |

### 16.3 Seção Auditoria (Filtros)

| Input | Tipo | Obrigatório | Tabela | Coluna | Status |
|-------|------|-------------|--------|--------|--------|
| periodo | daterange | Não | `audit_events` | `created_at` | ✓ |
| usuarioId | select | Não | `audit_events` | `user_id` | ✓ |
| acao | select | Não | `audit_events` | `action` | ✓ |
| entidade | select | Não | `audit_events` | `entity_type` | ✓ |

---

## 17. Tela: Configurações

**Rota**: `/settings`  
**Arquivo**: `client/src/pages/Settings.tsx`

### 17.1 Categoria: Entidade

| Input | Tipo | Obrigatório | Validação | Tabela | Coluna | Status |
|-------|------|-------------|-----------|--------|--------|--------|
| name | text | Sim | - | `organizations` | `name` | ✓ |
| cnpj | text | Não | formato CNPJ | `organizations` | `tax_id` | ✓ |
| phone | text | Não | - | `organizations` | `phone` | ✓ |
| email | email | Não | formato email | `organizations` | `email` | ✓ |
| address | textarea | Não | - | `organizations` | `address_line` | ✓ |
| city | text | Não | - | `organizations` | `city` | ✓ |
| state | text | Não | max 2 chars | `organizations` | `state` | ✓ |
| zipCode | text | Não | formato CEP | `organizations` | `postal_code` | ✓ |

### 17.2 Categoria: Financeiro

| Input | Tipo | Obrigatório | Tabela | Coluna/Chave | Status |
|-------|------|-------------|--------|--------------|--------|
| financeiro.dia_vencimento_padrao | number | Não | `configurations` | chave JSON | ◇ |
| financeiro.tolerancia_vencimento | number | Não | `configurations` | chave JSON | ◇ |
| financeiro.valor_minimo_contribuicao | number | Não | `configurations` | chave JSON | ◇ |

### 17.3 Categoria: Contabilidade

| Input | Tipo | Obrigatório | Tabela | Coluna/Chave | Status |
|-------|------|-------------|--------|--------------|--------|
| contabilidade.inicio_exercicio | select | Não | `organizations` | `fiscal_year_start_month` | ✓ |
| contabilidade.regime | select | Não | `organizations` | `accounting_method` | ✓ |

---

## 18. Tela: Patrimônio

**Rota**: `/patrimonio`  
**Arquivo**: `client/src/pages/Patrimonio.tsx`

### 18.1 Filtros

| Input | Tipo | Obrigatório | Destino | Status |
|-------|------|-------------|---------|--------|
| search | text | Não | Filtro local | ✓ |

### 18.2 Formulário (PatrimonioWizard)

| Input | Tipo | Obrigatório | Validação | Tabela | Coluna | Status |
|-------|------|-------------|-----------|--------|--------|--------|
| codigo | text | Sim | único | `fixed_assets` | `asset_code` | ✓ |
| descricao | text | Sim | min 5 chars | `fixed_assets` | `description` | ✓ |
| categoria | select | Sim | enum | `fixed_assets` | `category` | ✓ |
| dataAquisicao | date | Sim | <= hoje | `fixed_assets` | `acquisition_date` | ✓ |
| valorAquisicao | number | Sim | > 0 | `fixed_assets` | `acquisition_value` | ✓ |
| valorResidual | number | Não | >= 0 | `fixed_assets` | `residual_value` | ✓ |
| vidaUtilMeses | number | Sim | > 0 | `fixed_assets` | `useful_life_months` | ✓ |
| metodoDepreciacao | select | Sim | linear/nenhum | `fixed_assets` | `depreciation_method` | ✓ |
| contaAtivoId | select | Não | - | `fixed_assets` | `asset_account_id` | ✓ |
| localizacao | text | Não | - | `fixed_assets` | `location` | ✓ |
| responsavelId | select | Não | - | `fixed_assets` | `responsible_person_id` | ✓ |

### 18.3 Dialog Transferência

| Input | Tipo | Obrigatório | Tabela | Coluna | Status |
|-------|------|-------------|--------|--------|--------|
| novaLocalizacao | text | Não | `asset_transfers` | `new_location` | ✓ |
| novoResponsavelId | select | Não | `asset_transfers` | `new_responsible_id` | ✓ |
| motivo | textarea | Sim | `asset_transfers` | `reason` | ✓ |

### 18.4 Dialog Baixa

| Input | Tipo | Obrigatório | Tabela | Coluna | Status |
|-------|------|-------------|--------|--------|--------|
| motivoBaixa (tipo) | select | Sim | `fixed_assets` | `status` | ✓ |
| dataBaixa | date | Sim | `fixed_assets` | `disposal_date` | ✓ |
| motivoBaixa (desc) | textarea | Sim | `fixed_assets` | `disposal_reason` | ✓ |
| valorBaixa | number | Condicional | `fixed_assets` | `disposal_value` | ✓ |

---

## 19. Tela: Módulo E

**Rota**: `/modulo-e`  
**Arquivo**: `client/src/pages/ModuloE.tsx`

### 19.1 Filtros

| Input | Tipo | Obrigatório | Destino | Status |
|-------|------|-------------|---------|--------|
| search | text | Não | Filtro local | ✓ |

### 19.2 CentroWizard

| Input | Tipo | Obrigatório | Validação | Tabela | Coluna | Status |
|-------|------|-------------|-----------|--------|--------|--------|
| codigo | text | Sim | único | `cost_centers` | `code` | ✓ |
| nome | text | Sim | min 3 chars | `cost_centers` | `name` | ✓ |
| descricao | textarea | Não | - | `cost_centers` | `description` | ✓ |
| ativo | switch | Não | default: true | `cost_centers` | `active` | ✓ |

### 19.3 ProjetoWizard

| Input | Tipo | Obrigatório | Validação | Tabela | Coluna | Status |
|-------|------|-------------|-----------|--------|--------|--------|
| codigo | text | Sim | único | `projects` | `code` | ✓ |
| nome | text | Sim | min 3 chars | `projects` | `name` | ✓ |
| centroCustoId | select | Não | - | `projects` | `cost_center_id` | ✓ |
| dataInicio | date | Não | - | `projects` | `start_date` | ✓ |
| dataFim | date | Não | >= início | `projects` | `planned_end_date` | ✓ |
| orcamentoPrevisto | number | Não | >= 0 | `projects` | `budget` | ✓ |
| parceriaMrosc | switch | Não | - | `projects` | `is_mrosc_partnership` | ✓ |
| status | select | Sim | enum | `projects` | `status` | ✓ |

### 19.4 FundoWizard

| Input | Tipo | Obrigatório | Validação | Tabela | Coluna | Status |
|-------|------|-------------|-----------|--------|--------|--------|
| codigo | text | Sim | único | `funds` | `code` | ✓ |
| nome | text | Sim | min 3 chars | `funds` | `name` | ✓ |
| tipo | select | Sim | restrito/irrestrito | `funds` | `fund_type` | ✓ |
| descricao | textarea | Não | - | `funds` | `description` | ✓ |
| contaContabilId | select | Não | - | (não mapeado) | ? | ? |
| ativo | switch | Não | default: true | `funds` | `active` | ✓ |

### 19.5 Tab Movimentações - Alocar

| Input | Tipo | Obrigatório | Tabela | Coluna | Status |
|-------|------|-------------|--------|--------|--------|
| fundoId | select | Sim | `fund_allocations` | `fund_id` | ✓ |
| projetoId | select | Sim | (relação via journal) | - | ? |
| valor | number | Sim | `fund_allocations` | `amount` | ✓ |
| descricao | text | Sim | `fund_allocations` | `source_description` | ✓ |

### 19.6 Tab Movimentações - Consumir

| Input | Tipo | Obrigatório | Tabela | Coluna | Status |
|-------|------|-------------|--------|--------|--------|
| fundoId | select | Sim | `fund_consumptions` | `fund_id` | ✓ |
| tituloId | select | Sim | `fund_consumptions` | `receivable_payable_id` | ✓ |
| valor | number | Sim | `fund_consumptions` | `amount` | ✓ |
| justificativa | textarea | Sim | `fund_consumptions` | `justification` | ✓ |

---

## 20. Resumo de Campos Unknown/Pendentes

| Tela | Campo | Questão |
|------|-------|---------|
| Títulos | `contaId` | Deve ser conta financeira ou conta contábil? |
| Entries | `isNfc`, `nfcCategory` | Manter como campo ou mover para extensão? |
| Módulo E | Fundo `contaContabilId` | Não há coluna correspondente em `funds` |
| Módulo E | Alocação `projetoId` | Como relacionar alocação com projeto? |

---

## 21. Campos Recomendados (Não nos Inputs)

| Tabela | Coluna | Tipo | Justificativa |
|--------|--------|------|---------------|
| Todas | `organization_id` | uuid FK | Multiempresa |
| Todas | `created_at`, `updated_at` | timestamptz | Auditoria |
| Todas | `created_by`, `updated_by` | uuid FK | Rastreabilidade |
| Entidades de negócio | `deleted_at` | timestamptz | Soft delete |
| `receivables_payables` | `issue_date` | date | Data emissão |
| `receivables_payables` | `nature` | enum | Classificação |
| `payments` | `payment_method` | enum | Forma pagamento |
| `journal_entries` | `status` | enum | Controle de efetivação |
| `chart_of_accounts` | `balance_type` | enum | Natureza saldo |
| `chart_of_accounts` | `allows_entries` | boolean | Controle analítica |


