# Plano de Testes e Aceite - NFS-e Nacional

> Fonte: `docs/integracoes_fiscais/06-checklist-homologacao-e-testes.md`
> Versao: 1.0 | Data: 2025-12-24

---

## 1. Ambiente de Homologacao

### 1.1 URLs

| API | URL Producao Restrita |
|-----|----------------------|
| ADN Contribuintes | https://adn.producaorestrita.nfse.gov.br/contribuintes/docs/index.html |
| ADN Municipios | https://adn.producaorestrita.nfse.gov.br/municipios/docs/index.html |
| CNC | https://adn.producaorestrita.nfse.gov.br/cnc/docs/index.html |
| Parametrizacao | https://adn.producaorestrita.nfse.gov.br/parametrizacao/docs/index.html |
| DANFSE | https://adn.producaorestrita.nfse.gov.br/danfse/docs/index.html |
| SEFIN Nacional | https://sefin.producaorestrita.nfse.gov.br/API/SefinNacional/docs/index |

### 1.2 Requisitos

- Certificado digital ICP-Brasil (e-CPF ou e-CNPJ)
- Municipio conveniado no ambiente de homologacao
- Contribuinte cadastrado (CNC ou RFB)

### 1.3 Dados de Teste

**LACUNA**: Documentacao oficial nao fornece CNPJs/CPFs de teste.
Usar dados reais do contribuinte no ambiente de homologacao.

---

## 2. Casos de Teste

### 2.1 Emissao de NFS-e

| ID | Cenario | Pre-condicao | Acao | Resultado Esperado |
|----|---------|--------------|------|-------------------|
| T01 | Emissao OK | DPS valida, mun conveniado | POST /nfse | HTTP 200, XML NFS-e, chaveAcesso |
| T02 | Schema invalido | XML mal formado | POST /nfse | HTTP 400, erro VAL001 |
| T03 | Campo obrigatorio ausente | DPS sem cTribNac | POST /nfse | HTTP 400, erro VAL003 |
| T04 | Certificado invalido | Cert expirado | POST /nfse | HTTP 401, erro AUTH002 |
| T05 | Municipio nao conveniado | cLocEmi invalido | POST /nfse | HTTP 400, erro NEG001 |
| T06 | Contribuinte bloqueado | Prestador bloqueado | POST /nfse | HTTP 400, erro NEG003 |

### 2.2 Consulta de NFS-e

| ID | Cenario | Pre-condicao | Acao | Resultado Esperado |
|----|---------|--------------|------|-------------------|
| T10 | Consulta por chave | NFS-e existe | GET /nfse/{ch} | HTTP 200, XML NFS-e |
| T11 | Chave inexistente | Chave invalida | GET /nfse/{ch} | HTTP 404 |
| T12 | Verificar DPS existe | DPS processada | HEAD /dps/{id} | HTTP 200 |
| T13 | Verificar DPS nao existe | DPS nova | HEAD /dps/{id} | HTTP 404 |
| T14 | Obter chave por DPS | DPS processada, autor valido | GET /dps/{id} | HTTP 200, chaveAcesso |
| T15 | Obter chave sem permissao | DPS processada, outro autor | GET /dps/{id} | HTTP 403 |

### 2.3 Eventos

| ID | Cenario | Pre-condicao | Acao | Resultado Esperado |
|----|---------|--------------|------|-------------------|
| T20 | Cancelamento OK | NFS-e normal | POST eventos (e101101) | HTTP 200, evento vinculado |
| T21 | Cancelamento nota cancelada | NFS-e ja cancelada | POST eventos (e101101) | HTTP 400, erro NEG004 |
| T22 | Cancelamento sem permissao | Outro autor | POST eventos (e101101) | HTTP 403 |
| T23 | Consultar eventos | NFS-e com eventos | GET eventos | HTTP 200, lista eventos |
| T24 | Manifestacao tomador | Tomador da NFS-e | POST eventos (e203202) | HTTP 200, evento |

### 2.4 Substituicao

| ID | Cenario | Pre-condicao | Acao | Resultado Esperado |
|----|---------|--------------|------|-------------------|
| T30 | Substituicao OK | NFS-e original existe | POST /nfse (DPS com chSubstda) | HTTP 200, nova NFS-e |
| T31 | Substituicao nota inexistente | chSubstda invalida | POST /nfse | HTTP 400 |
| T32 | Consultar nota substituida | Apos substituicao | GET /nfse/{chOriginal} | HTTP 200, status substituida |

### 2.5 DANFSE

| ID | Cenario | Pre-condicao | Acao | Resultado Esperado |
|----|---------|--------------|------|-------------------|
| T40 | Download PDF | NFS-e existe | GET /danfse/{ch} | HTTP 200, application/pdf |
| T41 | Chave inexistente | Chave invalida | GET /danfse/{ch} | HTTP 404 |

### 2.6 Parametros

| ID | Cenario | Pre-condicao | Acao | Resultado Esperado |
|----|---------|--------------|------|-------------------|
| T50 | Consultar convenio | Mun conveniado | GET /parametros/{mun}/convenio | HTTP 200, dados convenio |
| T51 | Consultar servico | Servico existe | GET /parametros/{mun}/{cod} | HTTP 200, aliquotas |
| T52 | Municipio nao existe | Cod IBGE invalido | GET /parametros/{mun}/convenio | HTTP 404 |

---

## 3. Testes de Resiliencia

### 3.1 Timeout

| ID | Cenario | Acao | Verificacao |
|----|---------|------|-------------|
| T60 | Timeout na emissao | Simular timeout | HEAD /dps + retry funciona |
| T61 | Timeout na consulta | Simular timeout | Retry com backoff |

### 3.2 Idempotencia

| ID | Cenario | Acao | Verificacao |
|----|---------|------|-------------|
| T70 | Reenvio mesma DPS | POST /nfse 2x | Segunda retorna mesma NFS-e ou erro idempotente |
| T71 | Cancelamento duplicado | POST evento 2x | Segunda retorna erro NEG006 |

---

## 4. Criterios de Aceite

### 4.1 Funcionais

| Criterio | Evidencia |
|----------|-----------|
| Emissao funciona | NFS-e gerada com chaveAcesso valida |
| Consulta funciona | XML recuperado com todos os dados |
| Cancelamento funciona | Evento registrado, status atualizado |
| Substituicao funciona | Nova NFS-e gerada, original marcada |
| DANFSE funciona | PDF gerado com dados corretos |

### 4.2 Nao-Funcionais

| Criterio | Meta | Medicao |
|----------|------|---------|
| Latencia emissao | < 10s p95 | Monitoramento |
| Taxa de erro | < 1% (excl. validacao) | Logs |
| Disponibilidade | > 99% | Health check |

### 4.3 Seguranca

| Criterio | Verificacao |
|----------|-------------|
| mTLS funciona | Conexao estabelecida |
| Certificado validado | Rejeita cert invalido |
| Assinatura validada | Rejeita XML sem assinatura |
| LGPD | Dados mascarados nos logs |

---

## 5. Checklist de Homologacao

### 5.1 Pre-requisitos

- [ ] Certificado digital ICP-Brasil obtido
- [ ] Certificado configurado na aplicacao
- [ ] URL de homologacao configurada
- [ ] Municipio de teste identificado (conveniado)
- [ ] Contribuinte de teste cadastrado

### 5.2 Testes Obrigatorios

- [ ] T01 - Emissao OK
- [ ] T02 - Validacao schema
- [ ] T10 - Consulta por chave
- [ ] T12 - Verificar DPS (HEAD)
- [ ] T20 - Cancelamento OK
- [ ] T21 - Cancelamento duplicado
- [ ] T30 - Substituicao OK
- [ ] T40 - Download DANFSE
- [ ] T70 - Idempotencia

### 5.3 Evidencias

Para cada teste:
- Screenshot ou log da requisicao
- Resposta completa (status + body)
- Timestamp
- Certificado usado (serial)

---

## 6. Migracao para Producao

### 6.1 Checklist

- [ ] Todos os testes de homologacao aprovados
- [ ] Certificado de producao configurado
- [ ] URL de producao configurada
- [ ] Logs de auditoria habilitados
- [ ] Alertas configurados
- [ ] Backup/recovery testado

### 6.2 Smoke Test em Producao

1. Consultar parametros do municipio
2. Emitir uma NFS-e de valor minimo
3. Consultar a NFS-e emitida
4. Baixar DANFSE
5. (Opcional) Cancelar a NFS-e de teste

---

## 7. Lacunas Identificadas

| Lacuna | Impacto | Mitigacao |
|--------|---------|-----------|
| CNPJs de teste nao fornecidos | Usar dados reais em hom | Certificado proprio |
| Prazo cancelamento nao especificado | Pode falhar em prod | Consultar municipio |
| Codigos de erro incompletos | Debug dificil | Logar resposta completa |
| Rate limiting nao documentado | Pode ser bloqueado | Implementar backoff |
| Formato JSON detalhado ausente | Estrutura incerta | Inspecionar Swagger |

