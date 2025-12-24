# SPEC Fiscal - Motor Fiscal Unificado

> Versao: 1.0.0 | Data: 2025-12-24
> Status: SPEC FINAL - Pronto para implementacao

---

## Visao Geral

Esta pasta contem a **especificacao tecnica completa** do Motor Fiscal do CentrOS, integrando:

- **NFS-e Municipal (SP)** - Producao validada
- **NFS-e Nacional (ADN)** - Documentado
- **NF-e (modelo 55)** - Documentado
- **NFC-e (modelo 65)** - Documentado

---

## Indice de Documentos

| Arquivo | Conteudo |
|---------|----------|
| [00-visao-geral-motor-fiscal.md](00-visao-geral-motor-fiscal.md) | Arquitetura, responsabilidades, glossario |
| [01-decisor-fiscal.md](01-decisor-fiscal.md) | Logica de roteamento deterministico |
| [02-maquina-de-estados-unificada.md](02-maquina-de-estados-unificada.md) | Estados, transicoes, eventos |
| [03-contratos-canonicos.md](03-contratos-canonicos.md) | Tipos TypeScript, mapeamentos |
| [04-idempotencia-e-consistencia.md](04-idempotencia-e-consistencia.md) | Retry seguro, conciliacao |
| [05-erros-e-tratamento.md](05-erros-e-tratamento.md) | Catalogo unificado de erros |
| [06-observabilidade-e-auditoria.md](06-observabilidade-e-auditoria.md) | Logs, metricas, retencao |
| [07-plano-implementacao.md](07-plano-implementacao.md) | Cronograma, ondas, dependencias |

---

## Fontes Utilizadas

Esta especificacao foi baseada exclusivamente em:

- `docs/nfse-nacional/` - Documentacao NFS-e Nacional (ADN)
- `docs/nfe-nfce/` - Documentacao NF-e/NFC-e (SEFAZ)
- `docs/nfse-sp/` - Schemas NFS-e Paulistana
- `server/integrations/fiscal/` - Codigo NFS-e SP em producao

---

## Principios da Especificacao

1. **Deterministico** - Sem heuristica, todas as decisoes sao explicitas
2. **Unificado** - Uma API para todos os tipos de documento
3. **Idempotente** - Operacoes seguras para retry
4. **Auditavel** - Rastreabilidade completa por 5 anos
5. **Extensivel** - Preparado para CT-e, SPED, etc

---

## Como Usar Esta Especificacao

### Para Desenvolvedores

1. Ler `00-visao-geral` para contexto
2. Consultar `01-decisor` para logica de roteamento
3. Implementar conforme `07-plano-implementacao`

### Para QA

1. Usar casos de teste em `01-decisor` (secao 12)
2. Validar estados em `02-maquina-de-estados`
3. Verificar tratamento de erros em `05-erros`

### Para DevOps

1. Consultar `06-observabilidade` para metricas e alertas
2. Verificar politicas de retencao
3. Configurar dashboards conforme especificado

---

## Status de Implementacao

| Componente | Status |
|------------|--------|
| NFS-e SP | Producao |
| NFS-e Nacional | Aguardando SERPRO |
| NF-e | Aguardando SERPRO |
| NFC-e | Aguardando SERPRO |

---

## Proximos Passos

Apos aprovacao desta SPEC:

1. Criar estrutura `server/fiscal/`
2. Implementar Onda 1 (core)
3. Implementar Onda 2 (integradores)
4. Implementar Onda 3 (NFC-e + contingencias)

---

## Documentos Relacionados

- [NFS-e Nacional - Documentacao](../nfse-nacional/README.md)
- [NF-e/NFC-e - Documentacao](../nfe-nfce/README.md)
- [Compliance Contabil](../business/compliance.md)

---

**Elaborado por**: Tech Lead / Arquiteto de Integracoes Fiscais  
**Data**: 2025-12-24  
**Revisao**: 1.0.0



