# Plano de Implementacao

> Versao: 1.0.0 | Data: 2025-12-24
> Status: SPEC FINAL - Pronto para implementacao

---

## 1. Objetivo

Definir a **ordem de implementacao** do Motor Fiscal, considerando dependencias tecnicas, prioridades de negocio e o que pode ser feito **antes da liberacao da chave SERPRO**.

---

## 2. Visao Geral das Ondas

```
+------------------+------------------+------------------+
|     ONDA 1       |     ONDA 2       |     ONDA 3       |
|  (4-6 semanas)   |  (4-6 semanas)   |  (2-4 semanas)   |
+------------------+------------------+------------------+
|                  |                  |                  |
| - Core unificado | - NFS-e Nacional | - NFC-e          |
| - Decisor        | - NF-e           | - Contingencias  |
| - Maquina estados| - Eventos        | - Extensoes      |
| - Contratos      | - Conciliacao    |                  |
| - Idempotencia   |                  |                  |
| - Erros          |                  |                  |
| - Auditoria      |                  |                  |
|                  |                  |                  |
| Nao depende      | Depende parcial  | Depende total    |
| de SERPRO        | de SERPRO        | de SERPRO        |
+------------------+------------------+------------------+
```

---

## 3. ONDA 1: Core do Motor Fiscal

### 3.1 Escopo

| Componente | Descricao | Dependencia SERPRO |
|------------|-----------|-------------------|
| Decisor Fiscal | Logica de roteamento | Nao |
| Maquina de Estados | Estados e transicoes | Nao |
| Contratos Canonicos | Tipos TypeScript | Nao |
| Validadores | Validacao de schema | Nao |
| Idempotencia | UUID, locks, retry | Nao |
| Erros | Catalogo unificado | Nao |
| Auditoria | Tabelas e logs | Nao |
| NFS-e SP (refactor) | Migrar para core | Nao |

### 3.2 Entregaveis

| ID | Entregavel | Arquivo |
|----|------------|---------|
| O1-01 | Tipos canonicos | `server/fiscal/types.ts` |
| O1-02 | Decisor fiscal | `server/fiscal/decisor.ts` |
| O1-03 | Maquina de estados | `server/fiscal/estado-machine.ts` |
| O1-04 | Validadores por tipo | `server/fiscal/validators/*.ts` |
| O1-05 | Handler de erros | `server/fiscal/errors.ts` |
| O1-06 | Idempotencia | `server/fiscal/idempotencia.ts` |
| O1-07 | Auditoria | `server/fiscal/auditoria.ts` |
| O1-08 | Refactor NFS-e SP | `server/fiscal/integradores/nfse-sp.ts` |
| O1-09 | Testes unitarios | `server/fiscal/__tests__/*.ts` |

### 3.3 Ordem de Execucao

```
Semana 1-2:
  [1] Criar tipos canonicos (O1-01)
  [2] Implementar decisor (O1-02)
  [3] Implementar maquina de estados (O1-03)

Semana 3-4:
  [4] Implementar validadores (O1-04)
  [5] Implementar handler de erros (O1-05)
  [6] Implementar idempotencia (O1-06)

Semana 5-6:
  [7] Implementar auditoria (O1-07)
  [8] Refatorar NFS-e SP para usar core (O1-08)
  [9] Testes de integracao (O1-09)
```

### 3.4 Criterios de Aceite ONDA 1

- [ ] Todos os tipos TypeScript compilam sem erro
- [ ] Decisor retorna documento correto para todos os cenarios
- [ ] Maquina de estados valida todas as transicoes
- [ ] Validadores cobrem 100% dos campos obrigatorios
- [ ] Erros sao mapeados corretamente
- [ ] NFS-e SP continua funcionando em producao
- [ ] Cobertura de testes > 80%

---

## 4. ONDA 2: Integradores NFS-e Nacional e NF-e

### 4.1 Escopo

| Componente | Descricao | Dependencia SERPRO |
|------------|-----------|-------------------|
| NFS-e Nacional | API ADN/SEFIN | Sim (chave) |
| NF-e | API SEFAZ | Sim (certificado) |
| Eventos | Cancelamento, CCe, Manifestacao | Sim |
| Conciliacao | Sync com autoridade | Sim |
| DANFE/DANFSe | Geracao de PDF | Nao |

### 4.2 O que pode ser feito ANTES da chave SERPRO

| Tarefa | Pode fazer agora |
|--------|------------------|
| Montagem de XML NFS-e ADN | Sim |
| Assinatura de XML NFS-e ADN | Sim (com cert existente) |
| Montagem de XML NF-e | Sim |
| Assinatura de XML NF-e | Sim (com cert existente) |
| Validacao contra XSD | Sim |
| Testes unitarios | Sim |
| Parser de respostas (mock) | Sim |

| Tarefa | Precisa de SERPRO |
|--------|-------------------|
| Transmissao real para SEFIN | Sim |
| Transmissao real para SEFAZ | Sim |
| Testes de integracao reais | Sim |
| Homologacao | Sim |

### 4.3 Entregaveis

| ID | Entregavel | Arquivo |
|----|------------|---------|
| O2-01 | Builder XML NFS-e ADN | `server/fiscal/builders/nfse-adn.ts` |
| O2-02 | Integrador NFS-e ADN | `server/fiscal/integradores/nfse-adn.ts` |
| O2-03 | Builder XML NF-e | `server/fiscal/builders/nfe.ts` |
| O2-04 | Integrador NF-e | `server/fiscal/integradores/nfe.ts` |
| O2-05 | Builder eventos | `server/fiscal/builders/eventos.ts` |
| O2-06 | Conciliacao | `server/fiscal/conciliacao.ts` |
| O2-07 | Gerador DANFE | `server/fiscal/danfe.ts` |
| O2-08 | Testes integracao | `server/fiscal/__tests__/integracao/*.ts` |

### 4.4 Ordem de Execucao

```
Semana 7-8:
  [1] Builder XML NFS-e ADN (O2-01)
  [2] Testes com XSD (validacao local)
  [3] Builder XML NF-e (O2-03)
  [4] Testes com XSD

Semana 9-10:
  [5] Integrador NFS-e ADN (O2-02) - mock ate ter chave
  [6] Integrador NF-e (O2-04) - mock ate ter chave
  [7] Builder eventos (O2-05)

Semana 11-12:
  [8] Conciliacao (O2-06)
  [9] Gerador DANFE (O2-07)
  [10] Testes de integracao em homologacao (quando chave disponivel)
```

### 4.5 Criterios de Aceite ONDA 2

- [ ] XMLs gerados passam validacao XSD
- [ ] Assinaturas digitais sao validas
- [ ] Integradores funcionam em homologacao
- [ ] Cancelamento funciona
- [ ] DANFE e gerado corretamente
- [ ] Conciliacao recupera estado corretamente

---

## 5. ONDA 3: NFC-e e Extensoes

### 5.1 Escopo

| Componente | Descricao |
|------------|-----------|
| NFC-e | Varejo, QR Code |
| Contingencia | EPEC, SVC, Offline |
| Extensoes | CT-e, SPED (futuro) |

### 5.2 Entregaveis

| ID | Entregavel | Arquivo |
|----|------------|---------|
| O3-01 | Builder XML NFC-e | `server/fiscal/builders/nfce.ts` |
| O3-02 | Integrador NFC-e | `server/fiscal/integradores/nfce.ts` |
| O3-03 | Gerador QR Code | `server/fiscal/qrcode.ts` |
| O3-04 | Contingencia EPEC | `server/fiscal/contingencia/epec.ts` |
| O3-05 | Contingencia SVC | `server/fiscal/contingencia/svc.ts` |
| O3-06 | Contingencia Offline | `server/fiscal/contingencia/offline.ts` |

### 5.3 Ordem de Execucao

```
Semana 13-14:
  [1] Builder NFC-e (O3-01)
  [2] Integrador NFC-e (O3-02)
  [3] QR Code (O3-03)

Semana 15-16:
  [4] EPEC (O3-04)
  [5] SVC (O3-05)
  [6] Offline (O3-06)
```

---

## 6. Estrutura de Arquivos

### 6.1 Estrutura Proposta

```
server/
  fiscal/
    index.ts                    # Exports publicos
    types.ts                    # Tipos canonicos
    decisor.ts                  # Logica de roteamento
    estado-machine.ts           # Maquina de estados
    errors.ts                   # Handler de erros
    idempotencia.ts             # Estrategias de retry
    auditoria.ts                # Logs e auditoria
    conciliacao.ts              # Sync com autoridades
    
    validators/
      index.ts
      comum.ts                  # Validacoes compartilhadas
      nfse-sp.ts
      nfse-adn.ts
      nfe.ts
      nfce.ts
    
    builders/
      index.ts
      nfse-sp.ts                # Montagem XML SP
      nfse-adn.ts               # Montagem XML ADN
      nfe.ts                    # Montagem XML NF-e
      nfce.ts                   # Montagem XML NFC-e
      eventos.ts                # Eventos fiscais
    
    integradores/
      index.ts
      base.ts                   # Classe base abstrata
      nfse-sp.ts                # API Prefeitura SP
      nfse-adn.ts               # API SEFIN/ADN
      nfe.ts                    # API SEFAZ
      nfce.ts                   # API SEFAZ
    
    contingencia/
      index.ts
      epec.ts
      svc.ts
      offline.ts
    
    utils/
      xmldsig.ts
      c14n.ts
      qrcode.ts
      danfe.ts
    
    __tests__/
      decisor.test.ts
      estado-machine.test.ts
      validators/
      builders/
      integradores/
```

---

## 7. Dependencias Tecnicas

### 7.1 Dependencias Existentes

| Pacote | Uso | Instalado |
|--------|-----|-----------|
| node-forge | Certificados, assinatura | Sim |
| xml2js | Parse/build XML | Sim |
| fast-xml-parser | Parse XML rapido | Verificar |

### 7.2 Dependencias Novas

| Pacote | Uso | Prioridade |
|--------|-----|------------|
| qrcode | Geracao QR NFC-e | Onda 3 |
| pdfkit ou puppeteer | Geracao DANFE | Onda 2 |
| zod | Validacao de schemas | Onda 1 |

---

## 8. Riscos Conhecidos

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|---------------|---------|-----------|
| Atraso chave SERPRO | Alta | Alto | Preparar tudo que nao depende |
| Mudancas na NT 2025.002 (RTC) | Media | Medio | Monitorar Portal NF-e |
| Certificado vencendo | Baixa | Critico | Alertas de 30 dias |
| Rate limit SEFAZ | Media | Medio | Backoff exponencial |
| Municipios nao conveniados | Certa | Medio | Erro claro + fallback |

---

## 9. Pontos de Extensao Futuros

### 9.1 Outros Documentos Fiscais

| Documento | Modelo | Prioridade | Complexidade |
|-----------|--------|------------|--------------|
| CT-e | 57 | Media | Alta |
| MDF-e | 58 | Baixa | Media |
| NF3-e | 66 | Baixa | Media |

### 9.2 Integracoes Acessorias

| Integracao | Descricao | Prioridade |
|------------|-----------|------------|
| SPED Fiscal | Geracao de blocos | Media |
| EFD Contribuicoes | PIS/COFINS | Media |
| REINF | Retencoes federais | Alta |
| eSocial | Eventos trabalhistas | Fora de escopo |

---

## 10. Checklist de Go-Live

### 10.1 Antes de Producao

- [ ] Testes em homologacao aprovados
- [ ] Certificado de producao configurado
- [ ] Variaveis de ambiente de producao
- [ ] Logs configurados
- [ ] Alertas configurados
- [ ] Backup de banco testado
- [ ] Runbook documentado

### 10.2 Smoke Test Producao

1. [ ] Emitir NFS-e SP de teste
2. [ ] Consultar NFS-e emitida
3. [ ] Cancelar NFS-e de teste
4. [ ] (Quando disponivel) Emitir NFS-e Nacional
5. [ ] (Quando disponivel) Emitir NF-e
6. [ ] (Quando disponivel) Emitir NFC-e

---

## 11. Metricas de Sucesso do Projeto

| Metrica | Meta | Medicao |
|---------|------|---------|
| Cobertura de testes | > 80% | Jest coverage |
| Tempo de emissao p95 | < 10s | Prometheus |
| Taxa de erro | < 1% | Prometheus |
| Uptime | > 99.5% | Health checks |
| Documentos por dia | > 100 | Metricas de negocio |

---

## 12. Responsabilidades

| Papel | Responsabilidade |
|-------|------------------|
| Tech Lead | Arquitetura, revisao de codigo |
| Backend Dev | Implementacao dos modulos |
| QA | Testes de integracao |
| DevOps | Infraestrutura, deploy |
| Contador | Validacao de regras fiscais |

---

## 13. Cronograma Resumido

| Semana | Onda | Entregavel Principal |
|--------|------|---------------------|
| 1-2 | 1 | Tipos, Decisor, Estados |
| 3-4 | 1 | Validadores, Erros, Idempotencia |
| 5-6 | 1 | Auditoria, Refactor SP |
| 7-8 | 2 | Builders XML |
| 9-10 | 2 | Integradores (mock) |
| 11-12 | 2 | Conciliacao, DANFE, Homologacao |
| 13-14 | 3 | NFC-e |
| 15-16 | 3 | Contingencias |

**Duracao total estimada: 16 semanas (4 meses)**

---

## 14. Proximos Passos Imediatos

1. **Criar estrutura de pastas** `server/fiscal/`
2. **Criar `types.ts`** com todos os tipos canonicos
3. **Implementar `decisor.ts`** com testes
4. **Implementar `estado-machine.ts`** com testes
5. **Criar PR para revisao da Onda 1**



