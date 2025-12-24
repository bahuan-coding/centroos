# Panorama RFB e Autenticação ICP-Brasil

## 1. Visão Geral do ICP-Brasil

### O que é ICP-Brasil?

A **Infraestrutura de Chaves Públicas Brasileira (ICP-Brasil)** é o sistema nacional de certificação digital que garante:

- **Autenticidade** - Confirma a identidade do emissor
- **Integridade** - Garante que o documento não foi alterado
- **Não-repúdio** - O emissor não pode negar a autoria
- **Validade jurídica** - Equivale à assinatura manuscrita

### Hierarquia de Certificação

```
                    ICP-Brasil (Raiz)
                          │
            ┌─────────────┼─────────────┐
            │             │             │
      AC Raiz v5    AC Raiz v10   AC Raiz v11
            │
    ┌───────┼───────┬───────┬───────┐
    │       │       │       │       │
  Serpro  Certisign  Valid  Serasa  ...
    │
    └── Certificados e-CNPJ / e-CPF
```

---

## 2. Tipos de Certificados Digitais

### 2.1 Por Titular

| Tipo | Destinatário | Uso Principal |
|------|--------------|---------------|
| **e-CPF** | Pessoa Física | Assinatura de documentos, acesso e-CAC |
| **e-CNPJ** | Pessoa Jurídica | Emissão de NF-e, NFS-e, obrigações fiscais |
| **NF-e** | Empresa (emissão NF-e) | Específico para nota fiscal eletrônica |

### 2.2 Por Armazenamento

| Tipo | Armazenamento | Validade | Uso em Automação |
|------|---------------|----------|------------------|
| **A1** | Arquivo (.pfx/.p12) | 1 ano | Recomendado |
| **A3** | Token USB / Smartcard | 1-5 anos | Requer driver |

#### Certificado A1 (Recomendado para Sistemas)

**Vantagens:**
- Arquivo exportável (.pfx com senha)
- Pode ser carregado em memória pelo sistema
- Não requer hardware adicional
- Permite múltiplas instâncias simultâneas

**Desvantagens:**
- Validade de apenas 1 ano
- Arquivo pode ser copiado (requer proteção adequada)

**Uso no código:**
```typescript
import { readFileSync } from 'fs';
import forge from 'node-forge';

// Carregar certificado A1
const pfxBuffer = readFileSync('/path/to/certificate.pfx');
const pfxAsn1 = forge.asn1.fromDer(pfxBuffer.toString('binary'));
const pfx = forge.pkcs12.pkcs12FromAsn1(pfxAsn1, 'senha-do-certificado');

// Extrair chave privada e certificado
const bags = pfx.getBags({ bagType: forge.pki.oids.certBag });
const cert = bags[forge.pki.oids.certBag][0].cert;
```

#### Certificado A3 (Token/Smartcard)

**Vantagens:**
- Validade de até 5 anos
- Chave privada nunca sai do dispositivo
- Maior segurança física

**Desvantagens:**
- Requer driver PKCS#11 instalado
- Uma operação por vez (serialização)
- Complexidade adicional em ambientes cloud

---

## 3. Obtenção de Certificado e-CNPJ

### 3.1 Passo a Passo

1. **Escolher Autoridade Certificadora (AC)**
   - Serpro, Certisign, Valid, Serasa, etc.
   - Comparar preços e prazos

2. **Solicitar Certificado Online**
   - Informar CNPJ e dados da empresa
   - Escolher tipo (A1 ou A3)

3. **Validação Presencial ou por Videoconferência**
   - Apresentar documentos originais
   - Conferência biométrica (algumas ACs)

4. **Emissão do Certificado**
   - A1: Download do arquivo .pfx
   - A3: Gravação no token/smartcard

### 3.2 Documentos Necessários

Para **Pessoa Jurídica (e-CNPJ)**:
- Contrato Social ou Estatuto atualizado
- CNPJ (comprovante)
- Documento de identidade do representante legal
- CPF do representante legal
- Procuração (se aplicável)

### 3.3 Custos Estimados (2024)

| Tipo | Validade | Preço Médio |
|------|----------|-------------|
| e-CNPJ A1 | 1 ano | R$ 150 - R$ 300 |
| e-CNPJ A3 | 3 anos | R$ 300 - R$ 600 |
| Token USB | N/A | R$ 100 - R$ 200 |

---

## 4. Procuração Eletrônica (e-CAC)

### 4.1 O que é?

A **procuração eletrônica** permite que uma empresa delegue a terceiros (contador, sistema, etc.) poderes para acessar serviços da Receita Federal em seu nome.

### 4.2 Tipos de Procuração

| Tipo | Descrição | Uso |
|------|-----------|-----|
| **Procuração RFB** | Delegação para pessoa física/jurídica | Contador acessando e-CAC |
| **Substabelecimento** | Repasse de poderes delegados | Escritório terceirizado |

### 4.3 Serviços que Podem ser Delegados

- Consulta de situação fiscal
- Emissão de certidões
- Consulta de processos
- Acesso a declarações (DCTF, ECF, etc.)
- **Nota:** NF-e/NFS-e geralmente não usam procuração, mas certificado próprio

### 4.4 Como Cadastrar Procuração

1. Acessar e-CAC com certificado digital
2. Menu: Senhas e Procurações > Procuração Eletrônica
3. Informar CNPJ/CPF do outorgado
4. Selecionar serviços a delegar
5. Definir validade (até 5 anos)
6. Assinar com certificado digital

---

## 5. Implicações para o Sistema Multi-Tenant

### 5.1 Modelo de Certificados por Organização

Cada organização no sistema (tenant) pode ter:

```
organizations
├── org_paycubed (CNPJ: 63.552.022/0001-84)
│   └── certificate: paycubed_ecnpj_a1.pfx (criptografado)
│
├── org_centro_espirita_xyz
│   └── certificate: centro_xyz_ecnpj_a1.pfx (criptografado)
│
└── org_empresa_demo
    └── certificate: NULL (sem integração fiscal)
```

### 5.2 Armazenamento Seguro

**NUNCA fazer:**
- Commit de certificados .pfx no repositório
- Armazenar senha em texto plano
- Logar conteúdo do certificado

**Fazer:**
- Armazenar certificado criptografado (AES-256)
- Senha em secrets manager (Vault, AWS Secrets, etc.)
- Logs apenas de metadados (thumbprint, validade)

### 5.3 Schema Sugerido

```sql
CREATE TABLE organization_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  
  -- Metadados (podem ser logados)
  thumbprint VARCHAR(64) NOT NULL,
  subject_cn VARCHAR(255) NOT NULL,
  issuer_cn VARCHAR(255) NOT NULL,
  valid_from TIMESTAMP NOT NULL,
  valid_until TIMESTAMP NOT NULL,
  certificate_type VARCHAR(10) NOT NULL, -- 'A1' ou 'A3'
  
  -- Dados sensíveis (criptografados)
  encrypted_pfx BYTEA NOT NULL, -- Certificado criptografado com AES-256
  encrypted_password BYTEA NOT NULL, -- Senha criptografada
  
  -- Auditoria
  created_at TIMESTAMP DEFAULT now(),
  created_by UUID REFERENCES users(id),
  updated_at TIMESTAMP DEFAULT now(),
  
  -- Constraints
  CONSTRAINT valid_type CHECK (certificate_type IN ('A1', 'A3'))
);

-- Índices
CREATE INDEX idx_org_cert_org ON organization_certificates(organization_id);
CREATE INDEX idx_org_cert_valid ON organization_certificates(valid_until);
```

---

## 6. Validação de Certificado

### 6.1 Verificações Obrigatórias

Antes de usar um certificado, validar:

1. **Validade temporal**
   - `valid_from <= now <= valid_until`
   
2. **Cadeia de confiança**
   - Certificado assinado por AC válida da ICP-Brasil
   
3. **Revogação**
   - Consultar CRL (Certificate Revocation List) ou OCSP
   
4. **CNPJ correspondente**
   - Subject do certificado deve conter o CNPJ da organização

### 6.2 Exemplo de Validação

```typescript
interface CertificateInfo {
  thumbprint: string;
  subjectCN: string;
  issuerCN: string;
  validFrom: Date;
  validUntil: Date;
  cnpj: string | null;
  isValid: boolean;
  validationErrors: string[];
}

function validateCertificate(pfxBuffer: Buffer, password: string): CertificateInfo {
  const errors: string[] = [];
  
  // Parse certificado
  const cert = parsePfx(pfxBuffer, password);
  
  // Verificar validade temporal
  const now = new Date();
  if (now < cert.validFrom) {
    errors.push('Certificado ainda não é válido');
  }
  if (now > cert.validUntil) {
    errors.push('Certificado expirado');
  }
  
  // Verificar se expira em breve (30 dias)
  const daysUntilExpiry = Math.floor((cert.validUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysUntilExpiry <= 30) {
    errors.push(`Certificado expira em ${daysUntilExpiry} dias`);
  }
  
  // Extrair CNPJ do Subject
  const cnpjMatch = cert.subjectCN.match(/\d{14}/);
  const cnpj = cnpjMatch ? formatCnpj(cnpjMatch[0]) : null;
  
  return {
    thumbprint: cert.thumbprint,
    subjectCN: cert.subjectCN,
    issuerCN: cert.issuerCN,
    validFrom: cert.validFrom,
    validUntil: cert.validUntil,
    cnpj,
    isValid: errors.length === 0,
    validationErrors: errors,
  };
}
```

---

## 7. Alertas de Vencimento

### 7.1 Estratégia de Notificação

| Dias para Vencimento | Ação |
|----------------------|------|
| 60 dias | Email informativo |
| 30 dias | Notificação no sistema + Email |
| 15 dias | Alerta crítico + Email para admin |
| 7 dias | Bloqueio de novas emissões + Alerta |
| 0 dias | Certificado inválido |

### 7.2 Job de Verificação

```typescript
// Executar diariamente
async function checkCertificateExpiry() {
  const certificates = await db
    .select()
    .from(organizationCertificates)
    .where(gte(organizationCertificates.validUntil, now()));
  
  for (const cert of certificates) {
    const daysUntilExpiry = calculateDaysUntil(cert.validUntil);
    
    if (daysUntilExpiry <= 60) {
      await sendExpiryNotification(cert.organizationId, daysUntilExpiry);
    }
    
    if (daysUntilExpiry <= 7) {
      await blockFiscalOperations(cert.organizationId);
    }
  }
}
```

---

## 8. Considerações de UX Multi-Tenant

### 8.1 Fluxo de Upload de Certificado

1. Admin da organização acessa Configurações > Certificado Digital
2. Faz upload do arquivo .pfx
3. Informa a senha do certificado
4. Sistema valida e extrai metadados
5. Exibe resumo (CNPJ, validade, AC emissora)
6. Admin confirma
7. Sistema criptografa e armazena

### 8.2 Interface Sugerida

```
┌─────────────────────────────────────────────────────────────┐
│  Certificado Digital                                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Status: ✅ Válido (expira em 234 dias)                      │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ CNPJ: 63.552.022/0001-84                                ││
│  │ Razão Social: PAYCUBED STACK FINANCEIRO LTDA            ││
│  │ Tipo: e-CNPJ A1                                         ││
│  │ Autoridade: AC SERPRO RFB v5                            ││
│  │ Válido de: 01/03/2024 até 01/03/2025                    ││
│  │ Thumbprint: 3A:B2:C4:...                                ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
│  [Renovar Certificado]  [Remover]                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 9. Referências

- [ICP-Brasil - Instituto Nacional de Tecnologia da Informação](https://www.gov.br/iti)
- [Regulamento ICP-Brasil](https://www.gov.br/iti/pt-br/assuntos/icp-brasil)
- [Lista de Autoridades Certificadoras](https://www.gov.br/iti/pt-br/assuntos/icp-brasil/estrutura-da-icp-brasil)
- [RFC 5280 - X.509 PKI Certificate](https://tools.ietf.org/html/rfc5280)
- [PKCS#12 - Personal Information Exchange](https://tools.ietf.org/html/rfc7292)

---

**Próximo:** [02-catalogo-apis-e-servicos.md](02-catalogo-apis-e-servicos.md) - Catálogo completo de APIs e serviços fiscais





