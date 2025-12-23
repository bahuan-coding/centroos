# Diagnóstico do Schema Atual - CentrOS

> **Data**: 2025-12-23  
> **Projeto Neon**: `gentle-salad-37180890`  
> **Database**: `neondb`  
> **PostgreSQL**: 17

## 1. Inventário Completo

### 1.1 Resumo Quantitativo

| Métrica | Valor |
|---------|-------|
| Total de Tabelas | 48 |
| Tabelas Legacy (integer PK) | 8 |
| Tabelas Novas (UUID PK) | 40 |
| Enums Definidos | 52 |
| FKs Declaradas | ~25 |
| FKs Ausentes (identificadas) | ~15 |

### 1.2 Tabelas por Módulo

#### Módulo A - Identidades (11 tabelas)

| Tabela | PK | Tenant | Status |
|--------|----|---------|----|
| `pessoa` | UUID | Não | Ativo |
| `pessoa_documento` | UUID | Não | Ativo |
| `pessoa_contato` | UUID | Não | Ativo |
| `pessoa_endereco` | UUID | Não | Ativo |
| `associado` | UUID | Não | Ativo |
| `associado_historico` | UUID | Não | Ativo |
| `consentimento_lgpd` | UUID | Não | Ativo |
| `pessoa_papel` | UUID | Não | Ativo |
| `captador_doacao` | UUID | Não | Ativo |
| `administrador_financeiro` | UUID | Não | Ativo |
| `grupo_estudo` | UUID | Não | **Não criado no banco** |

#### Módulo B - Caixa/Bancos (4 tabelas)

| Tabela | PK | Tenant | Status |
|--------|----|---------|----|
| `conta_financeira` | UUID | Não | Ativo |
| `extrato_bancario` | UUID | Não | Ativo |
| `extrato_linha` | UUID | Não | Ativo |
| `conciliacao` | UUID | Não | Ativo |

#### Módulo C - Contas a Pagar/Receber (3 tabelas)

| Tabela | PK | Tenant | Status |
|--------|----|---------|----|
| `titulo` | UUID | Não | Ativo |
| `titulo_baixa` | UUID | Não | Ativo |
| `anexo` | UUID | Não | Ativo |

#### Módulo D - Contabilidade (10 tabelas)

| Tabela | PK | Tenant | Status | Notas |
|--------|----|---------|----|-------|
| `plano_contas` | UUID | Não | Ativo | Novo schema |
| `periodo_contabil` | UUID | Não | Ativo | Novo schema |
| `lancamento_contabil` | UUID | Não | Ativo | Novo schema |
| `lancamento_linha` | UUID | Não | Ativo | Novo schema |
| `saldo_conta_periodo` | UUID | Não | Ativo | Novo schema |
| `nota_explicativa_template` | UUID | Não | Ativo | |
| `accounts` | integer | Não | **Legacy** | Duplicado com plano_contas |
| `entries` | integer | Não | **Legacy** | Duplicado com lancamento_* |
| `periods` | integer | Não | **Legacy** | Duplicado com periodo_contabil |
| `report_config` | UUID | Não | Ativo | |

#### Módulo E - Projetos/Centros/Fundos (6 tabelas)

| Tabela | PK | Tenant | Status |
|--------|----|---------|----|
| `centro_custo` | UUID | Não | Ativo |
| `projeto` | UUID | Não | Ativo |
| `fundo` | UUID | Não | Ativo |
| `fundo_regra` | UUID | Não | Ativo |
| `fundo_alocacao` | UUID | Não | Ativo |
| `fundo_consumo` | UUID | Não | Ativo |

#### Módulo F - Patrimônio (3 tabelas)

| Tabela | PK | Tenant | Status |
|--------|----|---------|----|
| `bem_patrimonial` | UUID | Não | Ativo |
| `bem_depreciacao` | UUID | Não | Ativo |
| `bem_transferencia` | UUID | Não | **Não criado no banco** |

#### Módulo G - Governança (11 tabelas)

| Tabela | PK | Tenant | Status | Notas |
|--------|----|---------|----|-------|
| `usuario` | UUID | Não | Ativo | Novo schema |
| `users` | integer | Não | **Legacy** | Duplicado com usuario |
| `papel` | UUID | Não | Ativo | |
| `permissao` | UUID | Não | Ativo | |
| `papel_permissao` | UUID+UUID | Não | Ativo | |
| `usuario_papel` | UUID+UUID | Não | Ativo | |
| `aprovacao` | UUID | Não | Ativo | |
| `evento_auditoria` | UUID | Não | Ativo | Novo schema |
| `audit_log` | integer | Não | **Legacy** | Duplicado |
| `configuracao_sistema` | UUID | Não | Ativo | |
| `organization_settings` | integer | Não | **Legacy** | |

#### Outras (2 tabelas)

| Tabela | PK | Tenant | Status |
|--------|----|---------|----|
| `bank_imports` | integer | Não | **Legacy** |
| `classification_rules` | integer | Não | **Legacy** |

### 1.3 Enums Existentes (52 total)

```sql
-- Módulo A - Identidades
pessoa_tipo: fisica, juridica
documento_tipo: cpf, cnpj, rg, ie, im
contato_tipo: email, telefone, celular, whatsapp
endereco_tipo: residencial, comercial, correspondencia
associado_status: ativo, suspenso, desligado, falecido
associado_categoria: trabalhador, frequentador, benemerito, honorario
periodicidade: mensal, trimestral, semestral, anual
tratamento_tipo: marketing, comunicacao, compartilhamento, dados_sensiveis
base_legal: consentimento, legitimo_interesse, obrigacao_legal, execucao_contrato
pessoa_papel_tipo: captador_doacao, administrador_financeiro, diretor, conselheiro, voluntario
pessoa_papel_status: ativo, suspenso, encerrado

-- Módulo B - Caixa/Bancos
conta_financeira_tipo: caixa, conta_corrente, poupanca, aplicacao, cartao
pix_tipo: cpf, cnpj, email, telefone, aleatoria
arquivo_tipo: ofx, csv, txt, pdf
extrato_status: pendente, processando, processado, erro
linha_extrato_status: pendente, conciliado, ignorado, duplicado
movimento_tipo: credito, debito
vinculo_tipo: titulo, lancamento_manual, tarifa, rendimento
conciliacao_metodo: automatico, manual, sugerido

-- Módulo C - Títulos
titulo_tipo: pagar, receber
titulo_natureza: contribuicao, doacao, evento, convenio, servico, utilidade, taxa, imposto, material, outros
titulo_status: rascunho, pendente_aprovacao, aprovado, parcial, quitado, cancelado, vencido
forma_pagamento: dinheiro, pix, ted, doc, boleto, debito, credito, cheque
anexo_entidade: titulo, baixa, lancamento, pessoa, bem
anexo_categoria: nota_fiscal, recibo, comprovante, contrato, outros

-- Módulo D - Contabilidade
conta_tipo: ativo, passivo, patrimonio_social, receita, despesa
natureza_saldo: devedora, credora
classificacao_conta: sintetica, analitica
periodo_status: aberto, em_revisao, fechado, reaberto
lancamento_origem: manual, baixa, extrato, depreciacao, fechamento, ajuste
lancamento_status: rascunho, efetivado, estornado
lancamento_linha_tipo: debito, credito

-- Legacy (duplicados)
account_type: asset, liability, equity, revenue, expense, fixed_asset
entry_type: debit, credit
period_status: open, under_review, closed
origin: manual, bank_import, system
nfc_category: project_70, operating_30
role: admin, accountant, manager, viewer
action: create, update, delete, close, reopen
entity_type: entry, account, period, import, rule, setting
bank: banco_brasil, caixa_economica, other
file_type: csv, ofx, txt
import_status: pending, processing, completed, failed

-- Módulo E - Projetos
projeto_status: planejamento, em_andamento, suspenso, concluido, cancelado
fundo_tipo: restrito, designado, livre
regra_tipo: percentual_receita, categoria_permitida, categoria_proibida, valor_maximo, aprovador_obrigatorio

-- Módulo F - Patrimônio
bem_categoria: imovel, veiculo, equipamento, mobiliario, informatica, outro
depreciacao_metodo: linear, nenhum
bem_status: em_uso, em_manutencao, baixado, alienado, perdido

-- Módulo G - Governança
aprovacao_entidade: titulo, lancamento, fundo_consumo
aprovacao_status: pendente, aprovado, rejeitado
auditoria_acao: criar, atualizar, excluir, visualizar, exportar, fechar, reabrir, aprovar, rejeitar
```

---

## 2. Problemas Identificados

### 2.1 Críticos

#### P1: Ausência de Multiempresa (CRÍTICA)
**Descrição**: Nenhuma tabela possui `organization_id`. O sistema não suporta multiempresa no nível de dados.  
**Impacto**: Impossibilidade de isolar dados entre Centro Espírita e Fintech.  
**Tabelas Afetadas**: Todas (48 tabelas).  
**Solução**: Adicionar coluna `organization_id UUID NOT NULL REFERENCES organizations(id)` em todas as entidades de negócio.

#### P2: PKs Inconsistentes (ALTA)
**Descrição**: Tabelas legacy usam `integer` com sequence, tabelas novas usam `UUID`.  
**Impacto**: Impossibilidade de referenciar entre schemas, complexidade em FKs.  
**Tabelas Legacy**: `users`, `accounts`, `entries`, `periods`, `bank_imports`, `classification_rules`, `audit_log`, `organization_settings`.  
**Solução**: Migrar para UUID v7 (ordenável).

#### P3: Duplicidade de Entidades (ALTA)
**Descrição**: Existem tabelas duplicadas com propósitos similares.  
**Duplicações**:
- `accounts` (legacy) vs `plano_contas` (novo)
- `entries` (legacy) vs `lancamento_contabil` + `lancamento_linha` (novo)
- `periods` (legacy) vs `periodo_contabil` (novo)
- `users` (legacy) vs `usuario` (novo)
- `audit_log` (legacy) vs `evento_auditoria` (novo)
- `organization_settings` (legacy) vs `configuracao_sistema` (novo)

**Impacto**: Confusão sobre qual entidade usar, dados fragmentados.  
**Solução**: Deprecar tabelas legacy após migração de dados.

### 2.2 Alta Severidade

#### P4: FKs Ausentes
**Descrição**: Várias colunas de referência não possuem constraints de FK.

| Tabela | Coluna | Referência Esperada |
|--------|--------|---------------------|
| `accounts` | `parent_id` | `accounts(id)` |
| `titulo` | `centro_custo_id` | `centro_custo(id)` |
| `titulo` | `projeto_id` | `projeto(id)` |
| `titulo` | `fundo_id` | `fundo(id)` |
| `titulo` | `conta_contabil_id` | `plano_contas(id)` |
| `titulo` | `titulo_pai_id` | `titulo(id)` |
| `lancamento_contabil` | `estorno_de_id` | `lancamento_contabil(id)` |
| `titulo_baixa` | `lancamento_id` | `lancamento_contabil(id)` |
| `titulo_baixa` | `estorno_de_id` | `titulo_baixa(id)` |
| `centro_custo` | `responsavel_id` | `pessoa(id)` |
| `projeto` | `responsavel_id` | `pessoa(id)` |
| `bem_patrimonial` | `responsavel_id` | `pessoa(id)` |
| `conta_financeira` | `conta_contabil_id` | `plano_contas(id)` |
| `conciliacao` | `titulo_id` | `titulo(id)` |
| `conciliacao` | `lancamento_id` | `lancamento_contabil(id)` |

#### P5: Campos Específicos Centro Espírita no Core
**Descrição**: A tabela `pessoa` contém campos específicos de Centro Espírita que poluem o core agnóstico.

```sql
-- Campos que deveriam estar em extensão
data_inicio_desenvolvimento date
tipos_mediunidade text[]
observacoes_mediunidade text
grupo_estudo_id uuid
```

**Solução**: Mover para tabela extensional `ext_center_mediumship_profiles`.

### 2.3 Média Severidade

#### P6: Timestamps Inconsistentes
**Descrição**: Legacy usa `timestamp without time zone`, novas usam `timestamp with time zone`.

| Padrão Legacy | Padrão Novo |
|---------------|-------------|
| `created_at timestamp DEFAULT now()` | `created_at timestamptz NOT NULL DEFAULT now()` |
| `updated_at timestamp DEFAULT now()` | `updated_at timestamptz NOT NULL DEFAULT now()` |

#### P7: Índices Duplicados
**Descrição**: Algumas tabelas possuem índices redundantes.

| Tabela | Índices Duplicados |
|--------|-------------------|
| `accounts` | `accounts_code_unique` e `code_idx` (ambos em `code`) |
| `bem_patrimonial` | `bem_patrimonial_codigo_unique` e `idx_bem_codigo` |
| `centro_custo` | `centro_custo_codigo_unique` e `idx_centro_custo_codigo` |
| `projeto` | `projeto_codigo_unique` e `idx_projeto_codigo` |
| `fundo` | `fundo_codigo_unique` e `idx_fundo_codigo` |
| `plano_contas` | `plano_contas_codigo_unique` e `idx_plano_codigo` |
| `papel` | `papel_codigo_unique` e `idx_papel_codigo` |
| `usuario` | `usuario_email_unique` e `idx_usuario_email` |

#### P8: Enums Duplicados
**Descrição**: Enums com mesmo propósito em inglês e português.

| Enum Inglês | Enum Português | Propósito |
|-------------|----------------|-----------|
| `period_status` | `periodo_status` | Status de período |
| `entry_type` | `lancamento_linha_tipo` | Tipo de lançamento |
| `account_type` | `conta_tipo` | Tipo de conta |
| `action` | `auditoria_acao` | Ação de auditoria |

### 2.4 Baixa Severidade

#### P9: Tabelas Não Criadas
**Descrição**: Tabelas definidas no schema.ts mas não criadas no banco.
- `grupo_estudo`
- `bem_transferencia`

#### P10: Coluna `active` com Tipo Inconsistente
**Descrição**: Na tabela `accounts`, `active` é `integer` (1/0) ao invés de `boolean`.

---

## 3. Mapa de Impacto (Telas vs Entidades)

### 3.1 Dependências por Tela

```
┌─────────────────────────────────────────────────────────────────────┐
│ TELA                 │ ENTIDADES ATUAIS          │ PROBLEMAS       │
├─────────────────────────────────────────────────────────────────────┤
│ Login                │ users (legacy)            │ Duplicado       │
│ Dashboard            │ Múltiplas (read-only)     │ -               │
│ Pessoas              │ pessoa, pessoa_*, associado│ Campos espíritas│
│ Contas Financeiras   │ conta_financeira          │ Sem tenant      │
│ Extratos             │ extrato_bancario, extrato_linha │ -        │
│ Títulos              │ titulo, titulo_baixa      │ FKs ausentes    │
│ Pagar/Receber        │ titulo, titulo_baixa      │ FKs ausentes    │
│ Contabilidade        │ plano_contas, lancamento_*│ Duplicado       │
│ Plano de Contas      │ plano_contas + accounts   │ Duplicado       │
│ Lançamentos          │ entries + lancamento_*    │ Duplicado       │
│ Períodos             │ periods + periodo_contabil│ Duplicado       │
│ Conciliação          │ conciliacao, extrato_linha│ FKs ausentes    │
│ Importação           │ bank_imports (legacy)     │ Legacy          │
│ Relatórios           │ report_config             │ -               │
│ Patrimônio           │ bem_patrimonial, bem_deprec│ -              │
│ Módulo E             │ centro_custo, projeto, fundo│ -             │
│ Governança           │ usuario, papel, permissao │ -               │
│ Configurações        │ organization_settings + config│ Duplicado   │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 Risco de Migração por Entidade

| Entidade | Dados Atuais | Risco | Ação |
|----------|--------------|-------|------|
| `accounts` | ~80 registros | MÉDIO | Migrar para `chart_of_accounts` |
| `entries` | ~2000 registros | ALTO | Migrar para `journal_entries` + `journal_lines` |
| `periods` | ~12 registros | BAIXO | Migrar para `accounting_periods` |
| `users` | ~3 registros | BAIXO | Unificar com `usuario` |
| `organization_settings` | 1 registro | BAIXO | Migrar para `organizations` |
| `titulo` | ~1800 registros | ALTO | Adicionar `organization_id`, FKs |
| `pessoa` | ~200 registros | MÉDIO | Extrair campos espíritas |

---

## 4. Estatísticas de Uso

### 4.1 Tamanho por Tabela

| Tabela | Dados | Índices | Total |
|--------|-------|---------|-------|
| `titulo` | 1064 kB | 608 kB | 1672 kB |
| `entries` | 192 kB | 192 kB | 384 kB |
| `titulo_baixa` | 0 bytes | 296 kB | 296 kB |
| `plano_contas` | 16 kB | 144 kB | 160 kB |
| `accounts` | 16 kB | 112 kB | 128 kB |
| `associado` | 16 kB | 104 kB | 120 kB |
| `pessoa` | 16 kB | 96 kB | 112 kB |

### 4.2 Contagem de Registros (estimativa por tamanho)

| Tabela | Estimativa |
|--------|------------|
| `titulo` | ~1800 |
| `entries` | ~2000 |
| `pessoa` | ~200 |
| `associado` | ~150 |
| `accounts` | ~80 |
| `plano_contas` | ~60 |
| `periods` | ~12 |

---

## 5. Recomendações Imediatas

### 5.1 Ações Críticas (Antes de Novas Features)

1. **Criar tabela `organizations`** com `org_type` enum
2. **Adicionar `organization_id`** em todas entidades de negócio
3. **Unificar tabelas duplicadas** (deprecar legacy)
4. **Adicionar FKs ausentes** listadas em P4

### 5.2 Ações de Limpeza

1. Remover índices duplicados
2. Padronizar timestamps para `timestamptz`
3. Consolidar enums duplicados
4. Criar tabelas faltantes (`grupo_estudo`, `bem_transferencia`)

### 5.3 Ações de Extensibilidade

1. Mover campos espíritas de `pessoa` para `ext_center_mediumship_profiles`
2. Criar namespace de extensões: `ext_center_*`, `ext_fintech_*`

