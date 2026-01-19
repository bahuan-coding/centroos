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

## Estatísticas

- Total de TODOs: 14 (de 22 linhas, excluindo comentários de estrutura)
- P0: 0
- P1: 6
- P2: 6
- P3: 2
