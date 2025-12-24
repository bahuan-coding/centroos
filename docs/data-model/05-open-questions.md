# Perguntas em Aberto - CentrOS Data Model

> **Data**: 2025-12-23  
> **Status**: Aguardando decisões de negócio

## 1. Questões Críticas (Bloqueantes)

### Q1: Multiempresa - Quantidade de Organizações Iniciais

**Contexto**: O sistema foi desenhado para multiempresa, mas atualmente opera com uma única organização.

**Pergunta**: Quantas organizações serão migradas inicialmente?

**Opções**:
- A) Uma única organização (Centro Espírita existente)
- B) Duas organizações (Centro + Fintech)
- C) Múltiplas organizações com hierarquia (holding)

**Impacto**: Define a estratégia de migração de dados e seed inicial.

---

### Q2: Autenticação - Provider Externo

**Contexto**: O modelo assume auth delegada a provider externo.

**Pergunta**: Qual provider de autenticação será utilizado?

**Opções**:
- A) Clerk
- B) Auth0
- C) Supabase Auth
- D) Outro: _____________

**Impacto**: Define o formato de `auth_provider_id` e integração.

---

### Q3: Títulos - Campo `contaId`

**Contexto**: No mapeamento de inputs de Títulos, existe o campo `contaId` marcado como obrigatório.

**Pergunta**: Este campo se refere a:

**Opções**:
- A) Conta financeira (onde será pago/recebido) - Não usual em títulos
- B) Conta contábil (classificação) - Faz sentido
- C) Ambos (duas colunas separadas)
- D) Remover campo (conta financeira só na baixa)

**Recomendação**: Opção D - Conta financeira é definida apenas no momento da baixa/pagamento. Título deve ter apenas `ledger_account_id` para classificação contábil.

---

### Q4: Lançamentos - Campos NFC

**Contexto**: Na tela de Entries existem os campos `isNfc` e `nfcCategory`.

**Pergunta**: O que são esses campos e devem permanecer no modelo?

**Opções**:
- A) Nota Fiscal Cidadã (programa de incentivo fiscal) - Mover para extensão
- B) Near Field Communication (pagamento) - Não faz sentido no contexto
- C) Campos legados a serem removidos
- D) Manter como tags/metadata em `journal_lines`

**Recomendação**: Se for Nota Fiscal Cidadã, criar campo `is_nfc_eligible` em `journal_lines` ou usar sistema de tags.

---

## 2. Questões de Design (Alta Prioridade)

### Q5: Fundos - Vínculo com Conta Contábil

**Contexto**: O input `contaContabilId` em FundoWizard não tem coluna correspondente na tabela `funds`.

**Pergunta**: Fundos devem ter vínculo obrigatório com conta contábil?

**Opções**:
- A) Sim, adicionar `ledger_account_id` em `funds`
- B) Não, a classificação é por lançamento
- C) Opcional, para fundos patrimoniais

**Impacto**: Afeta rastreabilidade contábil de fundos restritos.

---

### Q6: Alocação de Fundos - Vínculo com Projeto

**Contexto**: Na tab de movimentações do Módulo E, a alocação pede `projetoId` mas não há coluna correspondente.

**Pergunta**: Como vincular alocações de fundos a projetos?

**Opções**:
- A) Adicionar `project_id` em `fund_allocations`
- B) Usar `journal_lines.project_id` já existente
- C) Criar tabela associativa `fund_project_allocations`

**Recomendação**: Opção B - A alocação é registrada via `journal_lines`, que já tem `project_id`.

---

### Q7: Pessoas - Campos Espíritas no Core

**Contexto**: A tabela `pessoa` atual contém campos específicos de Centro Espírita: `data_inicio_desenvolvimento`, `tipos_mediunidade`, `observacoes_mediunidade`, `grupo_estudo_id`.

**Pergunta**: Confirma a migração desses campos para `ext_center_mediumship_profiles`?

**Opções**:
- A) Sim, mover para extensão (recomendado)
- B) Não, manter no core (poluição)
- C) Criar tabela `person_attributes` genérica (key-value)

---

### Q8: Patrimônio - Contas Contábeis de Depreciação

**Contexto**: O formulário de Patrimônio pede `contaAtivoId` mas não pede contas de depreciação.

**Pergunta**: As contas de despesa e depreciação acumulada devem ser:

**Opções**:
- A) Configuráveis por bem (input adicional)
- B) Derivadas da categoria do bem (configuração global)
- C) Definidas por padrão no sistema (fixas)

**Impacto**: Flexibilidade vs simplicidade de uso.

---

## 3. Questões de Migração (Média Prioridade)

### Q9: Tabelas Legacy - Estratégia de Deprecação

**Contexto**: Existem 8 tabelas legacy com dados que precisam ser migrados.

**Pergunta**: Qual a estratégia de transição?

**Opções**:
- A) Big Bang - Migrar tudo de uma vez e remover legacy
- B) Dual Write - Escrever em ambas durante transição
- C) Shadow Read - Ler do novo, fallback para legacy
- D) Gradual - Migrar módulo por módulo

**Recomendação**: Opção D - Começar pelo módulo de menor impacto (Períodos), depois Contas, Usuários, e por fim Lançamentos.

---

### Q10: Dados de Títulos - Volume e Limpeza

**Contexto**: A tabela `titulo` tem ~1800 registros com potenciais inconsistências.

**Pergunta**: Antes da migração, deve-se:

**Opções**:
- A) Migrar todos os dados como estão
- B) Limpar duplicados antes
- C) Migrar apenas registros dos últimos 2 anos
- D) Criar snapshot e migrar limpo

**Recomendação**: Opção D - Criar backup, aplicar cleanup, migrar.

---

### Q11: Saldos Iniciais - Cálculo

**Contexto**: A tabela `period_balances` precisa de saldos iniciais.

**Pergunta**: Como calcular o saldo inicial do primeiro período?

**Opções**:
- A) Usar saldos da tabela `accounts` atual (se houver)
- B) Calcular a partir dos lançamentos históricos
- C) Solicitar informação manual (balancete de abertura)
- D) Iniciar zerado e ajustar via lançamento de abertura

**Recomendação**: Opção C ou D dependendo da disponibilidade de dados históricos.

---

## 4. Questões de Negócio (Baixa Prioridade)

### Q12: Extensões Futuras - Vertical Fintech

**Contexto**: A extensão Fintech está minimamente definida.

**Pergunta**: Quais entidades específicas da Fintech são necessárias?

**Sugestões já incluídas**:
- Produtos/Serviços
- Clientes (extensão de persons)
- Assinaturas

**Possíveis adições**:
- [ ] Faturas recorrentes
- [ ] Contratos
- [ ] Planos de assinatura
- [ ] Integrações de pagamento (Stripe, PagSeguro)
- [ ] Notas fiscais de serviço

---

### Q13: LGPD - Consentimento

**Contexto**: A tabela `consentimento_lgpd` existe no schema atual.

**Pergunta**: O modelo de consentimento deve ser:

**Opções**:
- A) Mantido como está (por tratamento)
- B) Simplificado (aceite/recusa geral)
- C) Expandido (granular por finalidade)
- D) Removido (gerenciado externamente)

---

### Q14: Aprovações - Fluxo de Workflow

**Contexto**: A tabela `aprovacao` existe mas o fluxo não está claro.

**Pergunta**: Qual o fluxo de aprovação desejado?

**Opções**:
- A) Simples (1 aprovador)
- B) Sequencial (múltiplos aprovadores em ordem)
- C) Paralelo (qualquer aprovador pode aprovar)
- D) Por alçada (valor define aprovador)

**Impacto**: Define se precisa de tabela `approval_workflow` adicional.

---

### Q15: Relatórios - Configurações Customizadas

**Contexto**: A tabela `report_config` existe mas o formato não está documentado.

**Pergunta**: Os relatórios devem ter:

**Opções**:
- A) Configurações fixas (hardcoded)
- B) Templates customizáveis por organização
- C) Builder visual (drag-and-drop)
- D) Queries SQL diretas

---

## 5. Questões Técnicas

### Q16: UUID Version

**Contexto**: O modelo propõe UUID v7 (ordenável).

**Pergunta**: Confirma uso de UUID v7?

**Nota**: PostgreSQL 17 suporta `gen_random_uuid()` que gera v4. Para v7, seria necessário:
- Extensão `pgcrypto` + função customizada
- Ou geração no application layer

---

### Q17: Particionamento de Tabelas

**Contexto**: Tabelas como `audit_events` e `journal_entries` podem crescer muito.

**Pergunta**: Implementar particionamento por:

**Opções**:
- A) Não particionar inicialmente
- B) Por organização (LIST)
- C) Por data (RANGE mensal)
- D) Por data (RANGE anual)

**Recomendação**: Opção A inicialmente, monitorar crescimento.

---

### Q18: Índices Parciais - Critérios

**Contexto**: O modelo inclui índices parciais para performance.

**Pergunta**: Confirma os critérios propostos?

**Índices parciais propostos**:
- `WHERE deleted_at IS NULL` - Registros ativos
- `WHERE status IN ('pending', 'approved', 'partial')` - Títulos abertos
- `WHERE classification = 'analytical' AND active = true` - Contas lançáveis

---

## 6. Riscos Identificados

### R1: Volume de Dados em Migração

**Risco**: Migração de ~2000 lançamentos pode demorar.  
**Mitigação**: Executar em horário de baixo uso, com transação.

### R2: Integridade Referencial Cruzada

**Risco**: FKs entre módulos podem causar deadlocks.  
**Mitigação**: Migrar na ordem de dependência correta.

### R3: Downtime Durante Migração

**Risco**: Sistema pode ficar indisponível.  
**Mitigação**: Planejar janela de manutenção, comunicar usuários.

### R4: Rollback Complexo

**Risco**: Rollback pode não ser trivial após migração parcial.  
**Mitigação**: Backup antes de cada etapa, scripts de rollback testados.

### R5: Inconsistência de Dados Legacy

**Risco**: Dados legacy podem não passar validações do novo schema.  
**Mitigação**: Relatório de inconsistências antes de migrar, correção manual.

---

## 7. Próximos Passos Sugeridos

1. **Responder questões críticas (Q1-Q4)** antes de prosseguir
2. **Validar mapeamento de inputs** com stakeholders
3. **Revisar extensões** (Centro Espírita está mais detalhada que Fintech)
4. **Definir cronograma** de implementação por módulo
5. **Criar ambiente de staging** para testes de migração
6. **Documentar decisões** em ADRs (Architecture Decision Records)

---

## 8. Matriz de Decisões Pendentes

| ID | Questão | Urgência | Impacto | Responsável | Deadline |
|----|---------|----------|---------|-------------|----------|
| Q1 | Quantidade de orgs | ALTA | ALTO | Product Owner | - |
| Q2 | Auth provider | ALTA | ALTO | Tech Lead | - |
| Q3 | Campo contaId | MÉDIA | MÉDIO | Product Owner | - |
| Q4 | Campos NFC | BAIXA | BAIXO | Product Owner | - |
| Q5 | Fundos + conta | MÉDIA | MÉDIO | Contador | - |
| Q6 | Alocação + projeto | MÉDIA | BAIXO | Contador | - |
| Q7 | Campos espíritas | BAIXA | BAIXO | Product Owner | - |
| Q9 | Estratégia legacy | ALTA | ALTO | Tech Lead | - |





