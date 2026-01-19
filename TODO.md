# TODO - Pendências Técnicas

Este arquivo documenta TODOs espalhados pelo código que precisam ser resolvidos.
Atualizado em: 2026-01-19

## Legenda de Prioridade
- **P0 (Crítico)**: Funcionalidade quebrada ou risco de segurança
- **P1 (Alta)**: Funcionalidade incompleta que afeta uso normal
- **P2 (Média)**: Melhorias importantes mas não urgentes
- **P3 (Baixa)**: Nice-to-have

---

## Motor Fiscal

### P1 - Implementação Pendente

1. **Municípios Conveniados ao SN NFS-e**
   - Arquivo: `server/fiscal/decisor.ts`
   - TODO: Implementar atualização via API de parâmetros
   - Contexto: Lista de municípios está hardcoded

2. **Consulta API de Parâmetros**
   - Arquivo: `server/fiscal/decisor.ts`
   - TODO: Consultar API de parâmetros quando disponível
   - Contexto: Função `isMunicipioConveniado`

3. **Conversão de Código de Serviço**
   - Arquivo: `server/fiscal/validators/nfse-sp.ts`
   - TODO: Implementar lógica real de conversão
   - Contexto: Conversão código LC116 para código municipal SP

4. **Lista Completa de Códigos de Serviço**
   - Arquivo: `server/fiscal/validators/nfse-sp.ts`
   - TODO: Buscar lista completa da prefeitura
   - Contexto: Lista parcial de códigos

### P2 - Métricas e Auditoria

5. **Medir Duração de Emissão**
   - Arquivo: `server/fiscal/router.ts`
   - TODO: medir durationMs
   - Contexto: Registro de auditoria sem tempo de execução

6. **Persistir Auditoria no Banco**
   - Arquivo: `server/fiscal/auditoria.ts`
   - TODO: Persistir em banco de dados
   - Contexto: Registros em memória

---

## Integrações Fiscais

### P1 - Emissão de Notas

7. **Implementar Emissão NFS-e SP via Core**
   - Arquivo: `server/fiscal/integradores/nfse-sp-adapter.ts`
   - TODO: Chamar serviço de emissão via core
   - Contexto: Adapter retorna erro de não implementado

8. **Assinar XML da DPS (NFS-e Nacional)**
   - Arquivo: `server/integrations/fiscal/nfse-nacional.ts`
   - TODO: Assinar XML da DPS
   - Contexto: Assinatura não implementada

9. **Assinar XML de Evento (NFS-e Nacional)**
   - Arquivo: `server/integrations/fiscal/nfse-nacional.ts`
   - TODO: Assinar XML do evento
   - Contexto: Cancelamento/substituição

### P2 - Verificações

10. **Health Check Real da API NFS-e**
    - Arquivo: `server/integrations/fiscal/nfse.ts`
    - TODO: Implement actual API health check
    - Contexto: Apenas valida certificado

11. **Agregações Import NFS-e**
    - Arquivo: `server/integrations/fiscal/import-nfse.ts`
    - TODO: Add aggregations for byStatus and byMonth
    - Contexto: Dashboard de importação

---

## Conciliação e Títulos

### P2 - Melhorias

12. **Usuário Real na Conciliação**
    - Arquivo: `server/routers.ts`
    - TODO: usar usuário real
    - Contexto: UUID mock sendo usado

13. **Detectar Forma de Pagamento**
    - Arquivo: `server/routers.ts`
    - TODO: detectar forma de pagamento
    - Contexto: Sempre assume 'pix'

---

## Relatórios

### P3 - Melhorias

14. **Saldo Inicial Real em Relatórios**
    - Arquivo: `server/services/reports.ts`
    - TODO: buscar saldo inicial real se disponível
    - Contexto: Valor fixo 0

---

## Como Resolver

1. Escolha um TODO baseado na prioridade
2. Crie uma branch: `git checkout -b fix/todo-descricao`
3. Implemente a solução
4. Remova o TODO do código
5. Atualize este arquivo removendo o item
6. Faça PR para review

---

## Decisões Técnicas (ADRs)

Decisões de arquitetura documentadas para referência futura.

### ADR-001: RascunhoBanner Duplicado

- **Status**: Aceito como dívida técnica de baixo risco
- **Data**: 2026-01-19
- **Contexto**: Existem 7 componentes `RascunhoBanner` quase idênticos (~100 linhas cada) em diferentes domínios (titulos, patrimonio, planoContas, periodos, modulo-e). Um componente genérico `DraftBanner` existe em `ui/wizard/` mas não é utilizado.
- **Decisão**: Manter os componentes separados por domínio.
- **Justificativa**:
  1. Cada RascunhoBanner usa um context/hook diferente (useTituloWizard, usePatrimonioWizard, etc.)
  2. Campos exibidos variam por domínio (valorLiquido vs valorAquisicao vs codigo/nome)
  3. Consolidação requer abstração de tipos genéricos que aumenta complexidade
  4. Impacto em disponibilidade: ZERO (é apenas UI)
  5. Custo de manutenção: baixo (componentes simples e estáveis)
- **Consequências**: ~600 linhas de código duplicado, mas isolado e fácil de manter

### ADR-002: Schema Legacy Mantido

- **Status**: Em migração gradual
- **Data**: 2026-01-19
- **Contexto**: O arquivo `drizzle/schema-legacy.ts` contém tabelas do sistema v1 (accounts, periods, entries, bankImports, classificationRules). Estas tabelas ainda são usadas ativamente por:
  - `server/routers.ts` (~100 referências)
  - `server/services/reports.ts` (~50 referências)
  - `server/services/classification.ts` (~10 referências)
- **Decisão**: Manter schema-legacy até migração completa das queries.
- **Justificativa**:
  1. Funcionalidades de relatórios e classificação dependem das tabelas legadas
  2. Migração requer refatoração de routers.ts (9000+ linhas)
  3. Schema legacy está bem documentado com plano de migração no header
- **Regras**:
  1. NÃO adicionar novas tabelas no schema-legacy
  2. Novas features DEVEM usar schema.ts
  3. Migrar um router por vez para schema novo
- **Plano de Migração**:
  - [ ] Migrar accountsRouter para planoContas
  - [ ] Migrar periodsRouter para periodoContabil
  - [ ] Migrar entriesRouter para lancamentoContabil
  - [ ] Migrar bankImportsRouter para extratoBancario
  - [ ] Remover schema-legacy.ts

### ADR-003: Autosave Local em Wizards

- **Status**: Implementado
- **Data**: 2026-01-19
- **Contexto**: Formulários multi-step (wizards) podem ter dados complexos que o usuário não quer perder.
- **Decisão**: Cada wizard implementa autosave em localStorage.
- **Implementação**:
  - Debounce de 2 segundos após última alteração
  - Máximo 10 rascunhos por domínio
  - Expiração de 24h para sugestão de retomada
  - Chave única por domínio: `centroos:{domain}-drafts`
- **Justificativa**:
  1. Máxima disponibilidade (funciona offline)
  2. Não depende de conexão com servidor
  3. Resiliente a crashes de browser/sistema
- **Trade-offs**:
  - Rascunhos são locais ao dispositivo/browser
  - Não sincroniza entre dispositivos

---

## Estatísticas

- Total de TODOs: 14 (de 22 linhas, excluindo comentários de estrutura)
- P0: 0
- P1: 6
- P2: 6
- P3: 2
