# Riscos, Conformidade, LGPD e Sigilo Fiscal

## Introdução

Integrações fiscais envolvem dados sensíveis e regulamentados. Este documento aborda os riscos, requisitos de conformidade e boas práticas para implementação segura.

---

## 1. Matriz de Riscos

### 1.1 Riscos Técnicos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| **Certificado expirado** | Média | Alto | Alertas automáticos 60/30/15/7 dias |
| **SEFAZ/Prefeitura fora do ar** | Alta | Médio | Fila com retry, contingência SCAN |
| **Mudança de layout XML** | Média | Médio | Versionamento de schemas, monitoramento de portais |
| **Perda de XMLs** | Baixa | Alto | Backup redundante, hash de integridade |
| **Falha na assinatura** | Baixa | Alto | Validação prévia do certificado |
| **Timeout de requisição** | Alta | Baixo | Retry com backoff exponencial |

### 1.2 Riscos de Compliance

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| **Vazamento de dados fiscais** | Baixa | Crítico | Criptografia, controle de acesso, logs |
| **Violação de sigilo fiscal** | Baixa | Crítico | Acesso restrito, anonimização de logs |
| **Não conformidade LGPD** | Média | Alto | Base legal, consentimento, exclusão |
| **Retenção inadequada** | Média | Alto | Política de 5 anos mínimo para docs fiscais |
| **Scraping de portais** | Baixa | Alto | Proibido - usar apenas APIs oficiais |

### 1.3 Riscos Operacionais

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| **Emissão duplicada** | Média | Médio | Idempotência, validação de número |
| **Cancelamento fora do prazo** | Média | Médio | Alertas de prazo (24h para NF-e) |
| **Dados inconsistentes** | Baixa | Médio | Validação antes de envio |
| **Contrato Serpro expirado** | Baixa | Médio | Alertas de renovação |

---

## 2. LGPD - Lei Geral de Proteção de Dados

### 2.1 Dados Pessoais nas Integrações Fiscais

| Dado | Classificação LGPD | Presente em | Base Legal |
|------|-------------------|-------------|------------|
| **CPF** | Pessoal | NFS-e, consultas | Obrigação legal |
| **Nome completo** | Pessoal | NFS-e, NF-e | Obrigação legal |
| **Endereço** | Pessoal | Notas fiscais | Obrigação legal |
| **E-mail** | Pessoal | Consulta CNPJ | Interesse legítimo |
| **Telefone** | Pessoal | Consulta CNPJ | Interesse legítimo |
| **CNPJ** | Não pessoal | Todos | N/A (PJ) |

### 2.2 Bases Legais Aplicáveis

Para integrações fiscais, as principais bases legais são:

1. **Cumprimento de obrigação legal** (Art. 7º, II)
   - Emissão de notas fiscais
   - Escrituração fiscal
   - Declarações obrigatórias

2. **Execução de contrato** (Art. 7º, V)
   - Consulta de CNPJ para validar cliente/fornecedor
   - Verificação de regularidade fiscal

3. **Interesse legítimo** (Art. 7º, IX)
   - Cache de dados públicos (CNPJ)
   - Análise de crédito

### 2.3 Direitos dos Titulares

| Direito | Aplicabilidade | Implementação |
|---------|---------------|---------------|
| **Acesso** | Sim | Exportar dados fiscais do titular |
| **Correção** | Parcial | Correção via carta de correção/cancelamento |
| **Eliminação** | Não (5 anos) | Retenção obrigatória por lei fiscal |
| **Portabilidade** | Sim | Exportar XMLs |
| **Oposição** | Não | Obrigação legal prevalece |

### 2.4 Retenção de Dados

```
┌─────────────────────────────────────────────────────────────────┐
│              POLÍTICA DE RETENÇÃO DE DADOS FISCAIS              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Documentos Fiscais (NF-e, NFS-e, CT-e)                          │
│  └─▶ Retenção: MÍNIMO 5 anos                                     │
│      Base: Art. 173 CTN, Art. 195 §único CTN                     │
│                                                                  │
│  Escrituração Contábil                                           │
│  └─▶ Retenção: MÍNIMO 5 anos (ou prazo prescricional)            │
│                                                                  │
│  Consultas de CPF/CNPJ                                           │
│  └─▶ Cache: 24 horas (dados públicos)                            │
│  └─▶ Logs: 1 ano (para auditoria)                                │
│                                                                  │
│  Certificados Digitais                                           │
│  └─▶ Certificado expirado: manter até 5 anos após validade       │
│      (para validar assinaturas antigas)                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Sigilo Fiscal

### 3.1 Definição Legal

O **sigilo fiscal** é garantido pelo Art. 198 do Código Tributário Nacional (CTN):

> *"Sem prejuízo do disposto na legislação criminal, é vedada a divulgação, por parte da Fazenda Pública ou de seus servidores, de informação obtida em razão do ofício sobre a situação econômica ou financeira do sujeito passivo ou de terceiros."*

### 3.2 Implicações para o Sistema

**O que é protegido por sigilo:**
- Dados de faturamento
- Valores de notas fiscais
- Situação fiscal perante a RFB
- Declarações e escriturações

**Quem pode acessar:**
- O próprio contribuinte
- Procuradores autorizados
- Autoridades fiscais (no exercício da função)
- **Sistemas autorizados** (via certificado digital do contribuinte)

### 3.3 Boas Práticas

```typescript
// ❌ ERRADO - Log com dados fiscais
console.log(`NFS-e emitida: ${nfse.numero}, valor: ${nfse.valor}, tomador: ${tomador.cnpj}`);

// ✅ CORRETO - Log anonimizado
console.log(`NFS-e emitida: ${nfse.numero}, org: ${organizationId}`);

// ✅ Se precisar dos detalhes, usar tabela de auditoria com acesso restrito
await fiscalEvents.insert({
  organizationId,
  eventType: 'nfse_emit',
  documentKey: nfse.chaveAcesso,
  status: 'success',
  // Payload completo apenas em tabela segura
  requestPayload: encryptPayload(payload),
});
```

---

## 4. Controle de Acesso

### 4.1 Modelo de Permissões

```typescript
// Permissões fiscais por papel

const fiscalPermissions = {
  // Administrador da organização
  admin: [
    'fiscal:certificate:upload',
    'fiscal:certificate:view',
    'fiscal:nfse:emit',
    'fiscal:nfse:cancel',
    'fiscal:nfse:view',
    'fiscal:cnpj:query',
    'fiscal:audit:view',
  ],
  
  // Financeiro
  financeiro: [
    'fiscal:nfse:emit',
    'fiscal:nfse:view',
    'fiscal:cnpj:query',
  ],
  
  // Contabilidade
  contabilidade: [
    'fiscal:nfse:view',
    'fiscal:audit:view',
  ],
  
  // Usuário comum
  usuario: [
    'fiscal:nfse:view', // Apenas suas próprias
  ],
};
```

### 4.2 Auditoria de Acesso

Toda operação fiscal deve ser auditada:

```typescript
interface FiscalAuditLog {
  id: string;
  organizationId: string;
  userId: string;
  action: 'view' | 'emit' | 'cancel' | 'query' | 'download';
  resourceType: 'nfse' | 'nfe' | 'certificate' | 'cnpj' | 'cpf';
  resourceId: string;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  // Sem dados sensíveis no log!
}
```

---

## 5. Segurança de Certificados

### 5.1 Armazenamento

```
┌─────────────────────────────────────────────────────────────────┐
│              ARQUITETURA DE SEGURANÇA DE CERTIFICADOS           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐                                                 │
│  │  Aplicação  │                                                 │
│  └──────┬──────┘                                                 │
│         │                                                        │
│         ▼                                                        │
│  ┌─────────────┐     ┌─────────────────────────────────────┐    │
│  │ Certificate │────▶│ Vault / AWS Secrets Manager          │    │
│  │   Manager   │◀────│ - Master encryption key              │    │
│  └──────┬──────┘     │ - Senhas de certificados             │    │
│         │            └─────────────────────────────────────┘    │
│         │                                                        │
│         ▼                                                        │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Banco de Dados (organization_certificates)              │    │
│  │  - encrypted_pfx: AES-256-GCM                            │    │
│  │  - encrypted_password: AES-256-GCM                       │    │
│  │  - Chave de criptografia NÃO está no banco               │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  Fluxo:                                                          │
│  1. App solicita certificado ao CertificateManager               │
│  2. CertificateManager busca chave de criptografia no Vault      │
│  3. CertificateManager decripta PFX do banco                     │
│  4. Certificado usado em memória (nunca persiste decriptado)     │
│  5. Após uso, referências limpas da memória                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Checklist de Segurança

- [ ] Certificados nunca versionados no git
- [ ] Senhas nunca em texto plano
- [ ] Criptografia AES-256 para dados em repouso
- [ ] TLS 1.2+ para dados em trânsito
- [ ] Logs não contêm conteúdo de certificados
- [ ] Acesso ao Vault/Secrets com least privilege
- [ ] Rotação de chaves de criptografia documentada
- [ ] Backup de certificados em local seguro (offline)

---

## 6. Tratamento de Erros e Logs

### 6.1 O que NÃO logar

```typescript
// ❌ NUNCA logar:
logger.error('Erro ao assinar:', { pfxContent: pfxBuffer.toString('base64') });
logger.info('Certificado carregado:', { password: certPassword });
logger.debug('Consulta CNPJ:', { cpf: '123.456.789-00', dadosBancarios: {...} });
```

### 6.2 O que logar

```typescript
// ✅ Log seguro:
logger.error('Erro ao assinar NFS-e', {
  organizationId,
  errorCode: error.code,
  errorMessage: error.message, // Sem dados sensíveis
  documentKey: nfse.chaveAcesso,
});

logger.info('NFS-e emitida', {
  organizationId,
  documentKey: nfse.chaveAcesso,
  status: 'success',
});

logger.debug('Consulta CNPJ realizada', {
  organizationId,
  cnpjMasked: maskCnpj(cnpj), // '63.***.***/0001-84'
  source: 'cache' | 'api',
});
```

### 6.3 Função de Mascaramento

```typescript
function maskCnpj(cnpj: string): string {
  const clean = cnpj.replace(/\D/g, '');
  return `${clean.slice(0, 2)}.***.***/****-${clean.slice(-2)}`;
}

function maskCpf(cpf: string): string {
  const clean = cpf.replace(/\D/g, '');
  return `***.${clean.slice(3, 6)}.***-**`;
}

function maskEmail(email: string): string {
  const [user, domain] = email.split('@');
  return `${user.slice(0, 2)}***@${domain}`;
}
```

---

## 7. Contingência e Recuperação

### 7.1 Contingência NF-e (SCAN/SVC)

Quando a SEFAZ de origem está indisponível:

```typescript
const contingencyFlow = {
  // 1. Tentar SEFAZ de origem
  primary: 'sefaz_origem',
  
  // 2. Se timeout/erro, tentar Contingência
  fallback: [
    'SVAN', // Ambiente Nacional Virtual (alguns estados)
    'SVC-RS', // Contingência RS
    'SVC-SP', // Contingência SP
  ],
  
  // 3. Se tudo falhar
  offline: 'DPEC', // Declaração Prévia (raro)
};
```

### 7.2 Backup de XMLs

```typescript
const xmlBackupPolicy = {
  // Primário: Banco de dados
  primary: 'postgresql',
  
  // Secundário: Object Storage
  secondary: 's3', // ou outro cloud storage
  
  // Terciário: Cold storage (anual)
  archive: 'glacier',
  
  // Retenção
  retention: {
    hot: '30 days',   // Banco + S3
    warm: '1 year',   // S3
    cold: '5 years',  // Glacier
  },
  
  // Verificação
  integrityCheck: {
    frequency: 'weekly',
    method: 'sha256',
  },
};
```

---

## 8. Conformidade com Reforma Tributária

### 8.1 Timeline

| Ano | Mudança |
|-----|---------|
| 2024 | Preparação, regulamentação |
| 2025 | Início transição |
| 2026 | CBS/IBS em paralelo |
| 2027-2032 | Transição gradual |
| 2033 | Extinção de ICMS/ISS |

### 8.2 Impacto no Sistema

| Aspecto | Atual | Futuro (CBS/IBS) |
|---------|-------|------------------|
| Impostos | ICMS + ISS | IBS (estados+municípios) + CBS (federal) |
| Notas | NF-e + NFS-e | Documento único (provável) |
| Split Payment | Não | Sim |
| Escrituração | EFD-ICMS, EFD-Contribuições | Unificada |

### 8.3 Preparação

1. **Arquitetura modular** - Permitir trocar módulos de impostos
2. **Versionamento de schemas** - Suportar múltiplos layouts
3. **Configuração por período** - Regras podem mudar ao longo do tempo
4. **Monitoramento de legislação** - Acompanhar publicações

---

## 9. Checklist de Conformidade

### 9.1 Antes do Go-Live

- [ ] Política de privacidade atualizada (LGPD)
- [ ] Termos de uso incluem tratamento de dados fiscais
- [ ] Contratos com terceiros (Serpro) revisados
- [ ] Encarregado de dados (DPO) informado
- [ ] Avaliação de Impacto (DPIA) realizada se aplicável
- [ ] Plano de resposta a incidentes documentado
- [ ] Backup testado e documentado
- [ ] Logs de auditoria implementados
- [ ] Controle de acesso configurado
- [ ] Certificados armazenados de forma segura

### 9.2 Operação Contínua

- [ ] Monitoramento de vencimento de certificados (semanal)
- [ ] Verificação de integridade de XMLs (semanal)
- [ ] Revisão de logs de acesso (mensal)
- [ ] Teste de recuperação de backup (trimestral)
- [ ] Atualização de schemas fiscais (conforme publicações)
- [ ] Treinamento de equipe em segurança (anual)

---

## 10. Referências Legais

- **LGPD** - Lei 13.709/2018
- **CTN** - Código Tributário Nacional (Lei 5.172/1966)
- **Lei de Acesso à Informação** - Lei 12.527/2011
- **Marco Civil da Internet** - Lei 12.965/2014
- **Reforma Tributária** - EC 132/2023

---

**Próximo:** [06-checklist-homologacao-e-testes.md](06-checklist-homologacao-e-testes.md) - Como testar integrações sem produção

