# Plano de Implementação por Ondas

## Visão Geral

Este documento descreve o roadmap de implementação das integrações fiscais para o sistema CentrOS/Paycubed, organizado em ondas com critérios de aceite e testes definidos.

---

## Timeline

```
2024                    2025                    2026
 │                       │                       │
 ▼                       ▼                       ▼
┌────────────┬───────────────────┬──────────────────────────────────┐
│   Onda 0   │      Onda 1       │     Onda 2     │     Onda 3      │
│ Foundation │       MVP         │    Expansão    │    Avançado     │
│  2-3 sem   │     4-6 sem       │    4-6 sem     │     Futuro      │
└────────────┴───────────────────┴──────────────────────────────────┘
```

---

## Onda 0: Foundation (2-3 semanas)

### Objetivo
Criar a infraestrutura base para todas as integrações fiscais.

### Tarefas

#### 0.1 Estrutura de Diretórios

```
server/
└── integrations/
    └── fiscal/
        ├── index.ts              # Exports centralizados
        ├── types.ts              # Tipos compartilhados
        ├── certificates/
        │   ├── certificate-manager.ts
        │   ├── icp-brasil-validator.ts
        │   └── types.ts
        ├── core/
        │   ├── xml-signer.ts     # Assinatura XML
        │   ├── xml-builder.ts    # Construção de XML
        │   └── http-client.ts    # Cliente HTTP base
        ├── storage/
        │   └── xml-archive.ts    # Armazenamento de XMLs
        ├── queue/
        │   └── fiscal-event-queue.ts
        └── __tests__/
            └── *.test.ts
```

#### 0.2 Gestão de Certificados

```typescript
// server/integrations/fiscal/certificates/certificate-manager.ts

import { decrypt, encrypt } from '@/lib/crypto';

interface CertificateInfo {
  thumbprint: string;
  subjectCN: string;
  issuerCN: string;
  cnpj: string;
  validFrom: Date;
  validUntil: Date;
  daysUntilExpiry: number;
  isValid: boolean;
}

export class CertificateManager {
  /**
   * Carrega certificado de uma organização
   */
  async loadCertificate(organizationId: string): Promise<{
    cert: Buffer;
    key: Buffer;
    info: CertificateInfo;
  }>;
  
  /**
   * Valida certificado antes de usar
   */
  async validateCertificate(organizationId: string): Promise<CertificateInfo>;
  
  /**
   * Upload de novo certificado
   */
  async uploadCertificate(
    organizationId: string,
    pfxBuffer: Buffer,
    password: string
  ): Promise<CertificateInfo>;
  
  /**
   * Lista certificados próximos do vencimento
   */
  async listExpiringCertificates(daysThreshold: number): Promise<Array<{
    organizationId: string;
    organizationName: string;
    daysUntilExpiry: number;
  }>>;
}
```

#### 0.3 Tabelas de Banco de Dados

```sql
-- Migração: fiscal_infrastructure

-- Certificados por organização
CREATE TABLE organization_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Metadados (não sensíveis)
  thumbprint VARCHAR(64) NOT NULL,
  subject_cn VARCHAR(255) NOT NULL,
  issuer_cn VARCHAR(255) NOT NULL,
  cnpj VARCHAR(18) NOT NULL,
  valid_from TIMESTAMPTZ NOT NULL,
  valid_until TIMESTAMPTZ NOT NULL,
  certificate_type VARCHAR(10) NOT NULL CHECK (certificate_type IN ('A1', 'A3')),
  
  -- Dados sensíveis (criptografados)
  encrypted_pfx BYTEA NOT NULL,
  encrypted_password BYTEA NOT NULL,
  encryption_key_id VARCHAR(64) NOT NULL, -- Referência ao key no Vault
  
  -- Controle
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(organization_id, thumbprint)
);

-- Eventos fiscais (auditoria)
CREATE TABLE fiscal_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  
  -- Tipo de operação
  event_type VARCHAR(50) NOT NULL, -- 'nfse_emit', 'nfse_cancel', 'cnpj_query', etc.
  document_type VARCHAR(20), -- 'nfse', 'nfe', etc.
  document_key VARCHAR(100), -- Chave do documento (quando aplicável)
  
  -- Request/Response
  request_payload JSONB,
  response_payload JSONB,
  
  -- Status
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'success', 'error', 'retry')),
  error_message TEXT,
  retry_count INT DEFAULT 0,
  
  -- Timing
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration_ms INT,
  
  -- Auditoria
  user_id UUID REFERENCES users(id),
  ip_address VARCHAR(45),
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Arquivo de XMLs (retenção fiscal)
CREATE TABLE xml_archive (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  
  -- Identificação
  document_type VARCHAR(20) NOT NULL,
  document_key VARCHAR(100) NOT NULL,
  document_number VARCHAR(50),
  
  -- Conteúdo
  xml_content TEXT NOT NULL,
  xml_hash_sha256 VARCHAR(64) NOT NULL,
  
  -- Status
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('sent', 'received')),
  is_authorized BOOLEAN DEFAULT false,
  authorization_date TIMESTAMPTZ,
  protocol_number VARCHAR(50),
  
  -- Retenção
  retention_until DATE NOT NULL, -- Mínimo 5 anos
  
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(organization_id, document_type, document_key)
);

-- Índices
CREATE INDEX idx_fiscal_events_org ON fiscal_events(organization_id);
CREATE INDEX idx_fiscal_events_type ON fiscal_events(event_type);
CREATE INDEX idx_fiscal_events_status ON fiscal_events(status);
CREATE INDEX idx_fiscal_events_date ON fiscal_events(created_at);

CREATE INDEX idx_xml_archive_org ON xml_archive(organization_id);
CREATE INDEX idx_xml_archive_doc ON xml_archive(document_type, document_key);
CREATE INDEX idx_xml_archive_retention ON xml_archive(retention_until);

CREATE INDEX idx_org_cert_valid ON organization_certificates(valid_until);
```

#### 0.4 Secrets Management

**Configuração de variáveis de ambiente:**

```bash
# .env.example (NÃO commitar .env real)

# Chave para criptografia de certificados (AES-256)
FISCAL_ENCRYPTION_KEY=<256-bit-key-base64>

# Serpro (quando contratado)
SERPRO_API_KEY=
SERPRO_CONSUMER_KEY=
SERPRO_CONSUMER_SECRET=

# Ambiente
FISCAL_ENVIRONMENT=homologation # ou 'production'
```

**Nunca fazer:**
```bash
# ERRADO - Não commitar!
git add certificates/*.pfx
git add .env
```

#### 0.5 Fila de Eventos

```typescript
// server/integrations/fiscal/queue/fiscal-event-queue.ts

import { Queue, Worker } from 'bullmq';

export const fiscalQueue = new Queue('fiscal-events', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000, // 5s, 25s, 125s
    },
    removeOnComplete: 100,
    removeOnFail: 1000,
  },
});

// Job types
type FiscalJob = 
  | { type: 'nfse_emit'; data: NfseEmitData }
  | { type: 'nfse_cancel'; data: NfseCancelData }
  | { type: 'cnpj_query'; data: CnpjQueryData };

// Worker
const fiscalWorker = new Worker('fiscal-events', async (job) => {
  switch (job.data.type) {
    case 'nfse_emit':
      return await nfseService.emit(job.data.data);
    case 'nfse_cancel':
      return await nfseService.cancel(job.data.data);
    case 'cnpj_query':
      return await serproService.queryCnpj(job.data.data);
  }
});
```

### Critérios de Aceite - Onda 0

| Critério | Verificação |
|----------|-------------|
| Estrutura de diretórios criada | `ls -la server/integrations/fiscal/` |
| Tabelas de banco criadas | `SELECT * FROM organization_certificates LIMIT 1` |
| CertificateManager funcional | Upload e validação de certificado de teste |
| Secrets não no git | `git log -p | grep -i "pfx\|password"` vazio |
| Fila de eventos operacional | Job enfileirado e processado |
| Testes unitários passando | `npm test -- --testPathPattern=fiscal` |

---

## Onda 1: MVP (4-6 semanas)

### Objetivo
Entregar emissão de NFS-e e consulta de CNPJ funcionando.

### Tarefas P0

#### 1.1 NFS-e Nacional

```typescript
// server/integrations/fiscal/nfse/nfse-nacional-service.ts

interface DPS {
  // Declaração de Prestação de Serviços
  competencia: string; // YYYY-MM
  prestador: {
    cnpj: string;
    inscricaoMunicipal?: string;
  };
  tomador: {
    cnpj?: string;
    cpf?: string;
    razaoSocial: string;
    endereco: Endereco;
  };
  servico: {
    codigoServico: string;
    descricao: string;
    valorServico: number;
    valorDeducoes?: number;
    aliquotaIss: number;
  };
}

interface NfseResponse {
  chaveAcesso: string;
  numeroNfse: string;
  dataEmissao: Date;
  xml: string;
  pdf?: Buffer;
}

export class NfseNacionalService {
  constructor(
    private certificateManager: CertificateManager,
    private xmlArchive: XmlArchiveService
  ) {}
  
  /**
   * Emite NFS-e via Ambiente de Dados Nacional
   */
  async emitir(organizationId: string, dps: DPS): Promise<NfseResponse>;
  
  /**
   * Consulta NFS-e por chave de acesso
   */
  async consultar(chaveAcesso: string): Promise<NfseResponse>;
  
  /**
   * Cancela NFS-e emitida
   */
  async cancelar(chaveAcesso: string, motivo: string): Promise<void>;
  
  /**
   * Substitui NFS-e (cancelamento + nova emissão)
   */
  async substituir(chaveAcesso: string, novaDps: DPS): Promise<NfseResponse>;
}
```

#### 1.2 Consulta CNPJ via Serpro

```typescript
// server/integrations/fiscal/serpro/cnpj-client.ts

interface CnpjData {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  situacaoCadastral: {
    codigo: number;
    descricao: string;
    data: Date;
    motivo: string | null;
  };
  naturezaJuridica: {
    codigo: string;
    descricao: string;
  };
  porte: string;
  endereco: {
    logradouro: string;
    numero: string;
    complemento: string | null;
    bairro: string;
    municipio: string;
    uf: string;
    cep: string;
  };
  cnaePrincipal: {
    codigo: string;
    descricao: string;
  };
  cnaesSecundarios: Array<{
    codigo: string;
    descricao: string;
  }>;
  dataAbertura: Date;
  email: string | null;
  telefone: string | null;
}

export class SerproCnpjClient {
  private baseUrl = 'https://gateway.apiserpro.serpro.gov.br/consulta-cnpj-df/v2';
  
  constructor(
    private apiKey: string,
    private cache: CacheService
  ) {}
  
  /**
   * Consulta dados de CNPJ
   * @param cnpj CNPJ com ou sem pontuação
   * @returns Dados cadastrais ou null se não encontrado
   */
  async consultar(cnpj: string): Promise<CnpjData | null> {
    // Verificar cache primeiro (24h)
    const cached = await this.cache.get(`cnpj:${cnpj}`);
    if (cached) return cached;
    
    // Consultar API
    const response = await fetch(`${this.baseUrl}/cnpj/${cnpj}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Accept': 'application/json',
      },
    });
    
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`Serpro API error: ${response.status}`);
    
    const data = await response.json();
    
    // Cachear resultado
    await this.cache.set(`cnpj:${cnpj}`, data, 86400); // 24h
    
    return this.mapToCnpjData(data);
  }
  
  /**
   * Valida se CNPJ está ativo
   */
  async validar(cnpj: string): Promise<{
    valido: boolean;
    situacao: string;
    razaoSocial: string;
  }>;
}
```

#### 1.3 Integração com Fluxo de Títulos

```typescript
// server/routers/titles.ts - Adicionar

import { nfseService } from '@/integrations/fiscal';

// Ao criar título do tipo "a receber"
createTitle: protectedProcedure
  .input(createTitleSchema)
  .mutation(async ({ input, ctx }) => {
    // ... criar título
    
    // Se configurado para emitir nota automaticamente
    if (input.emitirNota && input.tipo === 'a_receber') {
      await fiscalQueue.add('nfse_emit', {
        type: 'nfse_emit',
        data: {
          organizationId: ctx.organization.id,
          tituloId: titulo.id,
          tomador: input.pessoa,
          servico: input.descricao,
          valor: input.valor,
        },
      });
    }
    
    return titulo;
  }),
```

### Critérios de Aceite - Onda 1

| Critério | Verificação |
|----------|-------------|
| NFS-e emitida em homologação | XML autorizado com protocolo |
| NFS-e consultada | Dados retornados corretamente |
| NFS-e cancelada | Status atualizado no órgão |
| CNPJ consultado via Serpro | Dados cadastrais retornados |
| Cache de CNPJ funcionando | Segunda consulta vem do cache |
| XMLs arquivados | Registro em `xml_archive` |
| Auditoria completa | Eventos em `fiscal_events` |
| Testes de integração | Passando em ambiente homologação |

### Testes Onda 1

```typescript
// server/integrations/fiscal/__tests__/nfse-nacional.test.ts

describe('NFS-e Nacional Service', () => {
  describe('Emissão', () => {
    it('deve emitir NFS-e com dados válidos', async () => {
      const dps: DPS = {
        competencia: '2024-12',
        prestador: { cnpj: '63552022000184' },
        tomador: {
          cnpj: '00000000000191', // CNPJ de teste
          razaoSocial: 'TOMADOR TESTE',
          endereco: { /* ... */ },
        },
        servico: {
          codigoServico: '01.01',
          descricao: 'Desenvolvimento de software',
          valorServico: 1000.00,
          aliquotaIss: 5,
        },
      };
      
      const result = await nfseService.emitir('org-paycubed', dps);
      
      expect(result.chaveAcesso).toBeDefined();
      expect(result.numeroNfse).toBeDefined();
      expect(result.xml).toContain('<NFS-e>');
    });
    
    it('deve rejeitar DPS com CNPJ inválido', async () => {
      // ...
    });
  });
  
  describe('Cancelamento', () => {
    it('deve cancelar NFS-e existente', async () => {
      // ...
    });
    
    it('deve falhar ao cancelar NFS-e já cancelada', async () => {
      // ...
    });
  });
});
```

---

## Onda 2: Expansão (4-6 semanas)

### Objetivo
Adicionar NF-e (se necessário), consulta CPF e melhorias.

### Tarefas P1

#### 2.1 NF-e SEFAZ (Condicional)

Apenas implementar se Paycubed precisar vender produtos físicos.

```typescript
// server/integrations/fiscal/nfe/nfe-service.ts

export class NfeService {
  // Similar à NFS-e, mas:
  // - SOAP em vez de REST
  // - Endpoints por UF
  // - Modelo 55/65
  
  async autorizar(nfe: Nfe): Promise<NfeAutorizada>;
  async cancelar(chaveNfe: string, justificativa: string): Promise<void>;
  async inutilizar(serie: number, numeroInicial: number, numeroFinal: number): Promise<void>;
  async cartaCorrecao(chaveNfe: string, correcao: string): Promise<void>;
}
```

#### 2.2 Consulta CPF

```typescript
// server/integrations/fiscal/serpro/cpf-client.ts

interface CpfData {
  cpf: string;
  nome: string;
  situacao: {
    codigo: number;
    descricao: string; // 'Regular', 'Pendente de Regularização', etc.
  };
  dataNascimento: Date;
}

export class SerproCpfClient {
  async consultar(cpf: string): Promise<CpfData | null>;
  async validar(cpf: string): Promise<boolean>;
}
```

#### 2.3 Dashboard de Monitoramento

```typescript
// server/routers/fiscal.ts

export const fiscalRouter = router({
  // Dashboard
  dashboard: protectedProcedure.query(async ({ ctx }) => {
    return {
      certificado: await getCertificateStatus(ctx.organization.id),
      ultimasNotas: await getRecentNfse(ctx.organization.id, 10),
      estatisticas: {
        notasEmitidas30d: await countNfse(ctx.organization.id, 30),
        valorTotal30d: await sumNfseValue(ctx.organization.id, 30),
        consultasCnpj30d: await countCnpjQueries(ctx.organization.id, 30),
      },
      alertas: await getAlerts(ctx.organization.id),
    };
  }),
  
  // Lista de notas
  listarNotas: protectedProcedure
    .input(z.object({
      page: z.number().default(1),
      limit: z.number().default(20),
      status: z.enum(['all', 'authorized', 'cancelled']).optional(),
    }))
    .query(async ({ input, ctx }) => {
      // ...
    }),
});
```

### Critérios de Aceite - Onda 2

| Critério | Verificação |
|----------|-------------|
| NF-e funcionando (se implementada) | Autorização em homologação |
| Consulta CPF | Dados retornados e cacheados |
| Dashboard operacional | Métricas e alertas visíveis |
| Webhooks de status | Notificação em tempo real |
| Alertas de certificado | Email 30/15/7 dias antes |

---

## Onda 3: Avançado (Futuro)

### Objetivo
Automações tributárias e preparação para reforma tributária.

### Tarefas P2

#### 3.1 Integrações SPED

- EFD-Reinf (API REST disponível)
- Geração de arquivos SPED (exportação, não transmissão)

#### 3.2 Geração de DARF

- Cálculo de tributos federais
- Geração de guia para pagamento

#### 3.3 Preparação para Reforma Tributária (2026+)

- CBS (Contribuição sobre Bens e Serviços)
- IBS (Imposto sobre Bens e Serviços)
- Novos layouts de XML
- Split Payment

### Critérios de Aceite - Onda 3

A definir conforme evolução da legislação e necessidades do negócio.

---

## Matriz de Dependências

```
┌─────────────────────────────────────────────────────────────────┐
│                    DEPENDÊNCIAS                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Onda 0 (Foundation)                                             │
│  └─▶ Onda 1 (MVP)                                                │
│      ├─▶ NFS-e Nacional                                          │
│      │   └── Depende: CertificateManager, XmlArchive, Queue      │
│      └─▶ Consulta CNPJ                                           │
│          └── Depende: Contrato Serpro, Cache                     │
│                                                                  │
│  Onda 1 (MVP)                                                    │
│  └─▶ Onda 2 (Expansão)                                           │
│      ├─▶ NF-e (se necessário)                                    │
│      │   └── Depende: Credenciamento SEFAZ, IE                   │
│      └─▶ Dashboard                                               │
│          └── Depende: fiscal_events populado                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Checklist de Pré-Requisitos

### Antes de Iniciar Onda 0

- [ ] Certificado e-CNPJ A1 de teste obtido
- [ ] Ambiente de homologação configurado
- [ ] Variáveis de ambiente definidas
- [ ] Redis disponível (para filas)

### Antes de Iniciar Onda 1

- [ ] Onda 0 completa e validada
- [ ] Contrato Serpro assinado (ou sandbox liberado)
- [ ] Maceió/AL verificado no NFS-e Nacional
- [ ] Ambiente de testes documentado

### Antes de Iniciar Onda 2

- [ ] Onda 1 em produção e estável
- [ ] Métricas coletadas
- [ ] Feedback de usuários analisado
- [ ] Decisão sobre NF-e tomada

---

## Estimativa de Esforço

| Onda | Duração | Desenvolvedores | Complexidade |
|------|---------|-----------------|--------------|
| 0 - Foundation | 2-3 semanas | 1 | Média |
| 1 - MVP | 4-6 semanas | 1-2 | Alta |
| 2 - Expansão | 4-6 semanas | 1-2 | Média |
| 3 - Avançado | Indefinido | 1+ | Variável |

---

**Próximo:** [05-riscos-conformidade-lgpd-sigilo.md](05-riscos-conformidade-lgpd-sigilo.md) - Riscos, LGPD e conformidade

