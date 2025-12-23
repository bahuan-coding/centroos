# NFS-e Nacional - Especificação Completa

> **Versão:** 1.0  
> **Data:** Dezembro 2024  
> **Status:** Integração Piloto (P0)  
> **Template:** Baseado em `TEMPLATE-INTEGRACAO.md`

---

## 1. Identificação

| Campo | Valor |
|-------|-------|
| **ID** | `nfse_nacional` |
| **Nome** | NFS-e Nacional |
| **Categoria** | Fiscal |
| **Órgão** | RFB / Comitê Gestor NFS-e |
| **Tipo** | A - Oficial |
| **Prioridade** | P0 - Crítico |
| **Ambiente Homologação** | https://www.producaorestrita.nfse.gov.br |
| **Ambiente Produção** | https://www.nfse.gov.br |
| **Protocolo** | REST + SOAP |
| **Formato** | XML/JSON |

---

## 2. Objetivo

Emitir Nota Fiscal de Serviços Eletrônica (NFS-e) via Ambiente de Dados Nacional (ADN) da RFB para prestação de serviços sujeitos ao ISS (Imposto Sobre Serviços).

**Benefícios:**
- Emissão padronizada em +2.000 municípios aderentes
- Não necessita integração individual com cada prefeitura
- XML único e padronizado nacionalmente
- Redução de complexidade operacional

**Casos de Uso:**
- Empresas de TI emitindo nota por serviços prestados
- Consultorias faturando clientes
- Prestadores de serviços em geral

---

## 3. Permissões

| Papel | Configurar Certificado | Emitir NFS-e | Cancelar NFS-e | Visualizar | Exportar XML |
|-------|------------------------|--------------|----------------|------------|--------------|
| admin | ✅ | ✅ | ✅ | ✅ | ✅ |
| accountant | ❌ | ✅ | ✅ | ✅ | ✅ |
| manager | ❌ | ✅ | ❌ | ✅ | ✅ |
| viewer | ❌ | ❌ | ❌ | ✅ | ❌ |

**Notas:**
- Apenas `admin` pode fazer upload e gerenciar o certificado digital
- `accountant` pode cancelar notas dentro do prazo legal
- `manager` pode emitir mas não cancelar (evita reversões não autorizadas)

---

## 4. Pré-requisitos

### 4.1 Organizacionais

- [x] CNPJ ativo e regular na Receita Federal
- [x] Município da sede aderente ao padrão NFS-e Nacional
- [ ] Inscrição Municipal (opcional - depende do município)
- [ ] Cadastro no Ambiente de Dados Nacional (se exigido)

### 4.2 Técnicos

- [x] Certificado Digital e-CNPJ A1 (arquivo .pfx)
- [x] Certificado cadastrado e validado no sistema
- [x] Certificado dentro da validade (mínimo 7 dias restantes)
- [x] CNPJ do certificado corresponde à organização

### 4.3 Cadastrais

- [x] Tomador com CNPJ/CPF válido
- [x] Endereço completo do tomador (logradouro, número, bairro, cidade, UF, CEP)
- [x] Código do serviço conforme Lista Anexa LC 116/2003
- [x] Descrição/discriminação do serviço prestado

---

## 5. Estados da Integração

### 5.1 Diagrama de Estados

```
                          ┌──────────────────────────────────────┐
                          │                                      │
                          ▼                                      │
[nao_configurado] ──(upload cert)──> [configurado] ──(teste)──> [teste_homologacao]
        │                                 │                           │
        │                                 │            ┌──────────────┴──────────────┐
        │                                 │            │                             │
        │                                 │       (sucesso)                      (falha)
        │                                 │            │                             │
        │                                 │            ▼                             ▼
        │                                 └───────> [ativo] <──(corrigir)────── [erro]
        │                                              │                             │
        │                                        (problema)                          │
        │                                              │                             │
        │                                              ▼                             │
        │                                         [pausado] ─────────────────────────┘
        │                                              │
        │                                        (reativar)
        │                                              │
        └──────────────────────────────────────────────┘
```

### 5.2 Detalhamento de Estados

| Estado | Cor Badge | Ícone | Descrição | Ações Disponíveis |
|--------|-----------|-------|-----------|-------------------|
| `nao_configurado` | Cinza | `Circle` | Certificado não cadastrado | Configurar |
| `configurado` | Amarelo | `AlertCircle` | Certificado OK, aguardando teste | Testar em Homologação |
| `teste_homologacao` | Azul | `Loader` | Teste em andamento | Aguardar |
| `ativo` | Verde | `CheckCircle` | Funcionando em produção | Emitir, Consultar, Cancelar, Pausar |
| `pausado` | Laranja | `PauseCircle` | Desativado temporariamente | Reativar |
| `erro` | Vermelho | `XCircle` | Falha que requer atenção | Diagnosticar, Corrigir |

### 5.3 Transições de Estado

| De | Para | Trigger | Validação |
|----|------|---------|-----------|
| `nao_configurado` | `configurado` | Upload de certificado | Certificado válido |
| `configurado` | `teste_homologacao` | Clique em "Testar" | - |
| `teste_homologacao` | `ativo` | Teste bem-sucedido | NFS-e emitida em homologação |
| `teste_homologacao` | `erro` | Teste falhou | - |
| `ativo` | `pausado` | Clique em "Pausar" | Apenas admin |
| `ativo` | `erro` | Certificado expirado | Job automático |
| `pausado` | `ativo` | Clique em "Reativar" | Certificado válido |
| `erro` | `configurado` | Correção aplicada | Novo certificado ou fix |

---

## 6. Fluxo Principal: Emitir NFS-e

### 6.1 Diagrama de Sequência

```
Usuário                    Sistema                      ADN (RFB)
   │                          │                            │
   │  1. Cria título a receber│                            │
   │  com flag "emitir nota"  │                            │
   │─────────────────────────>│                            │
   │                          │                            │
   │                          │  2. Valida pré-requisitos  │
   │                          │  ├─ Certificado OK?        │
   │                          │  ├─ Tomador completo?      │
   │                          │  └─ Serviço válido?        │
   │                          │                            │
   │                          │  3. Monta DPS              │
   │                          │  (Declaração Prestação     │
   │                          │   de Serviços)             │
   │                          │                            │
   │                          │  4. Assina XML com         │
   │                          │     certificado digital    │
   │                          │                            │
   │                          │  5. Enfileira na           │
   │                          │     fiscal_queue           │
   │                          │                            │
   │                          │  6. Worker processa        │
   │                          │     e envia para ADN       │
   │                          │───────────────────────────>│
   │                          │                            │
   │                          │  7. Recebe resposta        │
   │                          │     (autorização ou erro)  │
   │                          │<───────────────────────────│
   │                          │                            │
   │                          │  8. Se sucesso:            │
   │                          │  ├─ Salva em xml_archive   │
   │                          │  ├─ Cria registro nfse     │
   │                          │  ├─ Vincula ao título      │
   │                          │  └─ Registra auditoria     │
   │                          │                            │
   │  9. Notificação de       │                            │
   │     sucesso/erro         │                            │
   │<─────────────────────────│                            │
   │                          │                            │
   │  10. Download PDF/XML    │                            │
   │      disponível          │                            │
   │<─────────────────────────│                            │
```

### 6.2 Passos Detalhados

1. **Criação do Título**: Usuário cria título a receber no módulo Financeiro, marcando checkbox "Emitir NFS-e"
2. **Validação Síncrona**: Sistema valida dados básicos antes de aceitar o título
3. **Montagem DPS**: Sistema monta estrutura XML conforme schema do ADN
4. **Assinatura Digital**: XML é assinado com certificado A1 da organização
5. **Enfileiramento**: Job é adicionado à fila `fiscal_queue` (BullMQ)
6. **Transmissão**: Worker envia para API do ADN via HTTPS
7. **Processamento ADN**: ADN valida, autoriza e retorna protocolo
8. **Persistência**: Sistema salva XML, cria registro, vincula ao título
9. **Notificação**: Toast/notificação informando resultado
10. **Disponibilização**: PDF e XML ficam disponíveis para download

---

## 7. Estrutura da DPS (Declaração de Prestação de Serviços)

### 7.1 Interface TypeScript

```typescript
interface DPS {
  // Identificação
  competencia: string;           // Formato: "YYYY-MM" (ex: "2024-12")
  
  // Prestador
  prestador: {
    cnpj: string;                // 14 dígitos, sem pontuação
    inscricaoMunicipal?: string; // Se obrigatório no município
    razaoSocial: string;         // Nome empresarial
    nomeFantasia?: string;       // Nome fantasia (opcional)
  };
  
  // Tomador
  tomador: {
    documento: {
      tipo: "cnpj" | "cpf";
      numero: string;            // Sem pontuação
    };
    razaoSocial: string;
    nomeFantasia?: string;
    endereco: {
      logradouro: string;
      numero: string;
      complemento?: string;
      bairro: string;
      codigoMunicipio: string;   // Código IBGE (7 dígitos)
      uf: string;                // Sigla UF
      cep: string;               // 8 dígitos, sem hífen
      codigoPais?: string;       // Padrão: "1058" (Brasil)
    };
    contato?: {
      email?: string;
      telefone?: string;         // DDD + número
    };
  };
  
  // Serviço
  servico: {
    codigoServico: string;       // Código LC 116 (ex: "01.01")
    codigoCnae?: string;         // CNAE do serviço
    discriminacao: string;       // Descrição detalhada do serviço
    codigoMunicipioPrestacao: string; // IBGE onde serviço foi prestado
    
    // Valores em centavos
    valorServico: number;        // Valor bruto do serviço
    valorDeducoes?: number;      // Deduções legais permitidas
    descontoIncondicionado?: number; // Desconto incondicional
    descontoCondicionado?: number;   // Desconto condicionado
    
    // Tributos
    aliquotaIss: number;         // 2 a 5 (percentual)
    issRetido: boolean;          // true se ISS retido pelo tomador
    
    // Outros tributos (opcional)
    valorPis?: number;
    valorCofins?: number;
    valorInss?: number;
    valorIr?: number;
    valorCsll?: number;
  };
  
  // Campos calculados (preenchidos pelo sistema)
  valores?: {
    baseCalculo: number;         // valorServico - valorDeducoes
    valorIss: number;            // baseCalculo * (aliquotaIss / 100)
    valorLiquido: number;        // valorServico - descontos - (ISS se retido)
  };
  
  // Informações adicionais
  informacoesComplementares?: string;
  regimeEspecialTributacao?: 
    | "nenhum"
    | "microempresa_municipal"
    | "estimativa"
    | "sociedade_profissionais"
    | "cooperativa"
    | "mei"
    | "simples_nacional";
}
```

### 7.2 Exemplo de DPS Preenchida

```typescript
const exemploD PS: DPS = {
  competencia: "2024-12",
  
  prestador: {
    cnpj: "63552022000184",
    razaoSocial: "PAYCUBED STACK FINANCEIRO LTDA",
  },
  
  tomador: {
    documento: { tipo: "cnpj", numero: "00000000000191" },
    razaoSocial: "EMPRESA CLIENTE LTDA",
    endereco: {
      logradouro: "Avenida Paulista",
      numero: "1000",
      complemento: "Sala 100",
      bairro: "Bela Vista",
      codigoMunicipio: "3550308",  // São Paulo
      uf: "SP",
      cep: "01310100",
    },
    contato: {
      email: "contato@cliente.com.br",
    },
  },
  
  servico: {
    codigoServico: "01.01",
    discriminacao: "Desenvolvimento de software sob encomenda conforme contrato nº 123/2024. Módulo de gestão financeira - Sprint 12.",
    codigoMunicipioPrestacao: "2704302",  // Maceió
    valorServico: 1000000,  // R$ 10.000,00 em centavos
    aliquotaIss: 5,
    issRetido: false,
  },
  
  regimeEspecialTributacao: "simples_nacional",
};
```

---

## 8. Regras de Negócio

| ID | Regra | Validação | Mensagem de Erro |
|----|-------|-----------|------------------|
| RN01 | Competência não pode ser futura | `competencia <= mesAtual` | "Competência não pode ser futura" |
| RN02 | Valor do serviço deve ser positivo | `valorServico > 0` | "Valor do serviço deve ser maior que zero" |
| RN03 | Alíquota ISS entre 2% e 5% | `2 <= aliquotaIss <= 5` | "Alíquota ISS deve estar entre 2% e 5%" |
| RN04 | CNPJ do tomador válido | Dígitos verificadores OK | "CNPJ do tomador inválido" |
| RN05 | CPF do tomador válido | Dígitos verificadores OK | "CPF do tomador inválido" |
| RN06 | CEP do tomador com 8 dígitos | `cep.match(/^\d{8}$/)` | "CEP do tomador inválido" |
| RN07 | Código serviço na lista oficial | Lookup tabela LC 116 | "Código de serviço não reconhecido" |
| RN08 | Certificado válido e não expirado | `validUntil > now()` | "Certificado digital expirado" |
| RN09 | Certificado com folga mínima | `daysUntil(validUntil) > 7` | "Certificado expira em menos de 7 dias" |
| RN10 | CNPJ certificado = CNPJ organização | Match obrigatório | "Certificado não corresponde à organização" |
| RN11 | Cancelamento dentro do prazo | Até 24h ou conforme município | "Prazo para cancelamento expirado" |
| RN12 | Não cancelar NFS-e substituída | Status != 'substituida' | "NFS-e já foi substituída" |
| RN13 | Discriminação mínima | `discriminacao.length >= 10` | "Descrição do serviço muito curta" |
| RN14 | Município aderente ao nacional | Lookup tabela municípios | "Município não suporta emissão automática" |

---

## 9. Dependência de Certificado Digital

### 9.1 Fluxo de Gestão

```
┌─────────────────────────────────────────────────────────────┐
│               GESTÃO DE CERTIFICADO                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [1. Upload]                                                 │
│  Usuário admin faz upload de arquivo .pfx + senha            │
│       │                                                      │
│       ▼                                                      │
│  [2. Validação]                                              │
│  Sistema valida:                                             │
│  ├── Formato correto (.pfx ou .p12)                          │
│  ├── Senha correta (consegue abrir)                          │
│  ├── Cadeia ICP-Brasil válida                                │
│  ├── Dentro da validade temporal                             │
│  └── CNPJ no Subject = CNPJ da organização                   │
│       │                                                      │
│       ▼                                                      │
│  [3. Armazenamento]                                          │
│  ├── Certificado criptografado com AES-256-GCM               │
│  ├── Senha criptografada separadamente                       │
│  ├── Metadados em texto (thumbprint, validade, issuer)       │
│  └── Registro em organization_certificates                   │
│       │                                                      │
│       ▼                                                      │
│  [4. Monitoramento Automático]                               │
│  Job diário (cron) verifica validade:                        │
│  ├── 60 dias restantes → Email informativo                   │
│  ├── 30 dias restantes → Notificação no sistema              │
│  ├── 15 dias restantes → Alerta crítico + Email admin        │
│  └── 7 dias restantes  → Bloqueia novas emissões             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 9.2 Tabela de Alertas

| Dias para Vencimento | Ação | Canal | Bloqueio |
|----------------------|------|-------|----------|
| 60 dias | Email informativo | Email | Não |
| 30 dias | Notificação + Email | Sistema + Email | Não |
| 15 dias | Alerta crítico | Sistema + Email + Badge | Não |
| 7 dias | Bloqueio + Alerta | Sistema + Email | **Sim** |
| 0 dias | Certificado inválido | Sistema | **Sim** |

---

## 10. Validações Obrigatórias (Pré-Emissão)

### 10.1 Função de Validação

```typescript
interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

interface ValidationError {
  code: string;
  field: string;
  message: string;
}

interface ValidationWarning {
  code: string;
  message: string;
}

async function validarEmissaoNfse(
  organizationId: string, 
  dps: DPS
): Promise<ValidationResult> {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  
  // ──────────────────────────────────────────────────────────
  // 1. CERTIFICADO
  // ──────────────────────────────────────────────────────────
  const cert = await getCertificate(organizationId);
  
  if (!cert) {
    errors.push({
      code: "CERT_NOT_FOUND",
      field: "certificado",
      message: "Certificado digital não cadastrado",
    });
  } else {
    if (new Date() > cert.validUntil) {
      errors.push({
        code: "CERT_EXPIRED",
        field: "certificado",
        message: "Certificado digital expirado",
      });
    } else if (daysUntil(cert.validUntil) <= 7) {
      errors.push({
        code: "CERT_EXPIRING",
        field: "certificado",
        message: "Certificado expira em menos de 7 dias. Renove antes de emitir.",
      });
    } else if (daysUntil(cert.validUntil) <= 30) {
      warnings.push({
        code: "CERT_EXPIRING_SOON",
        message: `Certificado expira em ${daysUntil(cert.validUntil)} dias`,
      });
    }
    
    if (cert.cnpj !== getOrganizationCnpj(organizationId)) {
      errors.push({
        code: "CERT_CNPJ_MISMATCH",
        field: "certificado",
        message: "CNPJ do certificado não corresponde à organização",
      });
    }
  }
  
  // ──────────────────────────────────────────────────────────
  // 2. TOMADOR
  // ──────────────────────────────────────────────────────────
  if (!isValidDocument(dps.tomador.documento)) {
    errors.push({
      code: "TOMADOR_DOC_INVALID",
      field: "tomador.documento",
      message: `${dps.tomador.documento.tipo.toUpperCase()} do tomador inválido`,
    });
  }
  
  if (!dps.tomador.razaoSocial || dps.tomador.razaoSocial.length < 3) {
    errors.push({
      code: "TOMADOR_RAZAO_INVALID",
      field: "tomador.razaoSocial",
      message: "Razão social do tomador é obrigatória",
    });
  }
  
  if (!dps.tomador.endereco.cep?.match(/^\d{8}$/)) {
    errors.push({
      code: "TOMADOR_CEP_INVALID",
      field: "tomador.endereco.cep",
      message: "CEP do tomador inválido (deve ter 8 dígitos)",
    });
  }
  
  if (!dps.tomador.endereco.codigoMunicipio?.match(/^\d{7}$/)) {
    errors.push({
      code: "TOMADOR_MUNICIPIO_INVALID",
      field: "tomador.endereco.codigoMunicipio",
      message: "Código do município do tomador inválido",
    });
  }
  
  // ──────────────────────────────────────────────────────────
  // 3. SERVIÇO
  // ──────────────────────────────────────────────────────────
  if (dps.servico.valorServico <= 0) {
    errors.push({
      code: "SERVICO_VALOR_INVALID",
      field: "servico.valorServico",
      message: "Valor do serviço deve ser maior que zero",
    });
  }
  
  if (dps.servico.aliquotaIss < 2 || dps.servico.aliquotaIss > 5) {
    errors.push({
      code: "SERVICO_ALIQUOTA_INVALID",
      field: "servico.aliquotaIss",
      message: "Alíquota ISS deve estar entre 2% e 5%",
    });
  }
  
  if (!isValidServiceCode(dps.servico.codigoServico)) {
    errors.push({
      code: "SERVICO_CODIGO_INVALID",
      field: "servico.codigoServico",
      message: "Código de serviço não reconhecido na LC 116",
    });
  }
  
  if (!dps.servico.discriminacao || dps.servico.discriminacao.length < 10) {
    errors.push({
      code: "SERVICO_DISCRIMINACAO_INVALID",
      field: "servico.discriminacao",
      message: "Descrição do serviço muito curta (mínimo 10 caracteres)",
    });
  }
  
  // ──────────────────────────────────────────────────────────
  // 4. COMPETÊNCIA
  // ──────────────────────────────────────────────────────────
  const [ano, mes] = dps.competencia.split("-").map(Number);
  const competenciaDate = new Date(ano, mes - 1);
  const hoje = new Date();
  
  if (competenciaDate > hoje) {
    errors.push({
      code: "COMPETENCIA_FUTURA",
      field: "competencia",
      message: "Competência não pode ser futura",
    });
  }
  
  // ──────────────────────────────────────────────────────────
  // 5. MUNICÍPIO ADERENTE
  // ──────────────────────────────────────────────────────────
  const municipioAderente = await checkMunicipioAderente(
    dps.servico.codigoMunicipioPrestacao
  );
  
  if (!municipioAderente) {
    errors.push({
      code: "MUNICIPIO_NAO_ADERENTE",
      field: "servico.codigoMunicipioPrestacao",
      message: "Município não aderiu ao padrão NFS-e Nacional",
    });
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
```

---

## 11. Fluxos de Erro

| Cenário | Causa | Comportamento Sistema | Mensagem Usuário | Ação Recomendada |
|---------|-------|----------------------|------------------|------------------|
| **ADN fora do ar** | Indisponibilidade do órgão | Retry 3x com backoff exponencial | "Serviço temporariamente indisponível. Tentaremos novamente." | Aguardar ou tentar em 15min |
| **Timeout** | Lentidão na rede/órgão | Consulta status antes de retry | "Processando... aguarde confirmação" | Aguardar |
| **Certificado expirado** | Validade vencida | Bloqueia emissão imediatamente | "Certificado digital expirado. Faça upload de um novo certificado." | Renovar certificado |
| **Certificado inválido** | Senha errada, formato incorreto | Rejeita upload | "Não foi possível ler o certificado. Verifique o arquivo e a senha." | Verificar arquivo |
| **Dados tomador inválidos** | CNPJ/CPF incorreto, endereço incompleto | Rejeita antes de enviar | Lista específica de erros | Corrigir cadastro do cliente |
| **Código serviço inválido** | Código não existe na LC 116 | Rejeita antes de enviar | "Código de serviço não reconhecido" | Selecionar código válido |
| **Município não aderente** | Prefeitura não usa padrão nacional | Alerta + sugestão | "Este município não suporta emissão automática. Emita manualmente no site da prefeitura." | Emissão manual |
| **Erro de assinatura XML** | Problema no certificado/lib | Log interno + alerta admin | "Erro interno ao processar nota. Nossa equipe foi notificada." | Verificar certificado |
| **Rejeição pelo ADN** | Dados inconsistentes | Exibe código e motivo | "NFS-e rejeitada: [motivo do órgão]" | Corrigir conforme orientação |
| **Nota já cancelada** | Tentativa de cancelar novamente | Bloqueia ação | "Esta NFS-e já foi cancelada" | Nenhuma |
| **Prazo cancelamento expirado** | > 24h ou regra municipal | Bloqueia ação | "Prazo para cancelamento expirado. Entre em contato com a prefeitura." | Contatar prefeitura |

### 11.1 Estratégia de Retry

| Tipo de Erro | Retry Automático | Quantidade | Backoff | Intervalo |
|--------------|------------------|------------|---------|-----------|
| Timeout | ✅ Sim | 3x | Exponencial | 5s → 25s → 125s |
| HTTP 5xx | ✅ Sim | 3x | Exponencial | 5s → 25s → 125s |
| HTTP 4xx | ❌ Não | - | - | - |
| Erro validação | ❌ Não | - | - | - |
| Certificado | ❌ Não | - | - | - |

---

## 12. Configurações

### 12.1 Configuráveis pelo Usuário

| Campo | Tipo | Obrigatório | Local | Descrição |
|-------|------|-------------|-------|-----------|
| Certificado Digital | Arquivo .pfx | ✅ Sim | Configurações > Certificado Digital | Upload do arquivo e senha |
| Código de Serviço Padrão | Select | ❌ Não | Configurações > Fiscal > Serviço Padrão | Pré-seleciona na emissão |
| Alíquota ISS Padrão | Number (2-5) | ❌ Não | Configurações > Fiscal > Alíquota | Pré-preenche na emissão |
| Inscrição Municipal | String | ❌ Não | Configurações > Fiscal > Inscrição Municipal | Se exigido pelo município |
| Emitir nota automático | Toggle global | ❌ Não | Configurações > Fiscal > Automação | Default para novos títulos |
| Ambiente | Select | ✅ Sim | Configurações > Fiscal > Ambiente | Homologação ou Produção |

### 12.2 Automáticos (Sistema)

| Aspecto | Comportamento |
|---------|---------------|
| Assinatura XML | Sistema assina automaticamente usando certificado cadastrado |
| Cálculo ISS | `valorIss = baseCalculo * (aliquotaIss / 100)` |
| Base de Cálculo | `baseCalculo = valorServico - valorDeducoes` |
| Arquivamento XML | Salva automaticamente por 5 anos em `xml_archive` |
| Retentativas | 3x com backoff exponencial em caso de falha de rede |
| Validação CNPJ/CPF | Algoritmo de dígitos verificadores |
| Numeração | Gerada pelo ADN (não controlada localmente) |
| Código de Verificação | Retornado pelo ADN após autorização |

---

## 13. Logs e Auditoria

### 13.1 Eventos Registrados

| Evento | Tabela | Dados Salvos | Retenção |
|--------|--------|--------------|----------|
| `nfse_emit_start` | `fiscal_events` | organizationId, tituloId, dps (sanitizado) | 1 ano |
| `nfse_emit_success` | `fiscal_events` | chaveAcesso, numero, protocolo | 5 anos |
| `nfse_emit_error` | `fiscal_events` | errorCode, errorMessage, requestId | 1 ano |
| `nfse_cancel_start` | `fiscal_events` | chaveAcesso, motivo | 1 ano |
| `nfse_cancel_success` | `fiscal_events` | protocoloCancelamento | 5 anos |
| `nfse_cancel_error` | `fiscal_events` | errorCode, errorMessage | 1 ano |
| `nfse_query` | `fiscal_events` | chaveAcesso | 30 dias |
| `certificate_upload` | `eventoAuditoria` | thumbprint, validUntil, issuer | 5 anos |
| `certificate_expiring` | `eventoAuditoria` | daysRemaining, alertLevel | 1 ano |
| Emissão autorizada | `xml_archive` | XML completo assinado | **5 anos** |
| Cancelamento | `xml_archive` | XML de cancelamento | **5 anos** |

### 13.2 O que NÃO é logado

- Senha do certificado (criptografada, nunca em log)
- Conteúdo do certificado .pfx
- Chaves privadas
- Dados pessoais além do necessário (LGPD)

---

## 14. Tabelas de Banco

### 14.1 Tabelas Existentes Utilizadas

```sql
-- Certificados (Módulo Fiscal - já definida)
organization_certificates

-- Eventos fiscais (Módulo Fiscal - já definida)
fiscal_events

-- Arquivo de XMLs (Módulo Fiscal - já definida)
xml_archive

-- Auditoria geral (Módulo G - Governança)
eventoAuditoria

-- Títulos a pagar/receber (Módulo C)
titulo
```

### 14.2 Tabela Específica: nfse_emitidas

```sql
-- NFS-e emitidas pela organização
CREATE TABLE nfse_emitidas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  titulo_id UUID REFERENCES titulo(id) ON DELETE SET NULL,
  
  -- Identificação da nota
  chave_acesso VARCHAR(100) NOT NULL,
  numero_nfse VARCHAR(50),
  codigo_verificacao VARCHAR(50),
  
  -- Datas
  competencia VARCHAR(7) NOT NULL,           -- "2024-12"
  data_emissao TIMESTAMPTZ NOT NULL,
  
  -- Valores (em centavos para precisão)
  valor_servico BIGINT NOT NULL,
  valor_deducoes BIGINT DEFAULT 0,
  desconto_incondicionado BIGINT DEFAULT 0,
  desconto_condicionado BIGINT DEFAULT 0,
  base_calculo BIGINT NOT NULL,
  aliquota_iss DECIMAL(5,2) NOT NULL,
  valor_iss BIGINT NOT NULL,
  valor_liquido BIGINT NOT NULL,
  iss_retido BOOLEAN DEFAULT false,
  
  -- Serviço
  codigo_servico VARCHAR(10) NOT NULL,
  codigo_cnae VARCHAR(10),
  discriminacao TEXT NOT NULL,
  codigo_municipio_prestacao VARCHAR(7) NOT NULL,
  
  -- Prestador (snapshot no momento da emissão)
  prestador_cnpj VARCHAR(14) NOT NULL,
  prestador_inscricao_municipal VARCHAR(20),
  prestador_razao_social VARCHAR(255) NOT NULL,
  
  -- Tomador (snapshot no momento da emissão)
  tomador_tipo_documento VARCHAR(4) NOT NULL,  -- 'cnpj' ou 'cpf'
  tomador_documento VARCHAR(18) NOT NULL,
  tomador_razao_social VARCHAR(255) NOT NULL,
  tomador_endereco JSONB NOT NULL,
  tomador_email VARCHAR(255),
  tomador_telefone VARCHAR(20),
  
  -- Regime tributário
  regime_especial_tributacao VARCHAR(50),
  
  -- Status da nota
  status VARCHAR(20) NOT NULL DEFAULT 'autorizada'
    CHECK (status IN ('autorizada', 'cancelada', 'substituida')),
  
  -- Cancelamento (se aplicável)
  data_cancelamento TIMESTAMPTZ,
  motivo_cancelamento TEXT,
  protocolo_cancelamento VARCHAR(100),
  
  -- Substituição (se aplicável)
  nfse_substituta_id UUID REFERENCES nfse_emitidas(id),
  nfse_original_id UUID REFERENCES nfse_emitidas(id),
  
  -- Referência ao XML arquivado
  xml_archive_id UUID REFERENCES xml_archive(id),
  xml_cancelamento_archive_id UUID REFERENCES xml_archive(id),
  
  -- Informações adicionais
  informacoes_complementares TEXT,
  ambiente VARCHAR(20) NOT NULL DEFAULT 'producao'
    CHECK (ambiente IN ('homologacao', 'producao')),
  
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Constraints
  CONSTRAINT uk_nfse_chave_acesso UNIQUE (chave_acesso),
  CONSTRAINT ck_valores_positivos CHECK (
    valor_servico > 0 AND 
    base_calculo >= 0 AND 
    valor_iss >= 0
  ),
  CONSTRAINT ck_aliquota_range CHECK (aliquota_iss >= 2 AND aliquota_iss <= 5)
);

-- Índices para performance
CREATE INDEX idx_nfse_organization ON nfse_emitidas(organization_id);
CREATE INDEX idx_nfse_titulo ON nfse_emitidas(titulo_id);
CREATE INDEX idx_nfse_competencia ON nfse_emitidas(competencia);
CREATE INDEX idx_nfse_tomador_doc ON nfse_emitidas(tomador_documento);
CREATE INDEX idx_nfse_status ON nfse_emitidas(status);
CREATE INDEX idx_nfse_data_emissao ON nfse_emitidas(data_emissao DESC);
CREATE INDEX idx_nfse_numero ON nfse_emitidas(numero_nfse);

-- Índice para busca por período
CREATE INDEX idx_nfse_periodo ON nfse_emitidas(organization_id, competencia);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_nfse_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_nfse_updated_at
  BEFORE UPDATE ON nfse_emitidas
  FOR EACH ROW
  EXECUTE FUNCTION update_nfse_updated_at();
```

---

## 15. Visibilidade: Usuário vs Sistema

### 15.1 Visível para o Usuário

| Informação | Onde | Quem pode ver |
|------------|------|---------------|
| Status da integração (ativo/erro) | Dashboard, Configurações | Todos |
| Lista de NFS-e emitidas | Página NFS-e | Todos |
| Detalhes da NFS-e (valores, tomador) | Modal/Página detalhe | Todos |
| PDF da nota para download | Botão na lista | manager+ |
| XML da nota para download | Botão na lista | accountant+ |
| Alertas de certificado expirando | Banner, Notificações | admin |
| Erros de validação (mensagens claras) | Formulário | Todos |
| Histórico de emissões por período | Filtros na lista | Todos |

### 15.2 Apenas Sistema/Auditoria

| Informação | Onde armazenado | Quem pode acessar |
|------------|-----------------|-------------------|
| XML bruto enviado ao ADN | `xml_archive` | Logs técnicos |
| XML de resposta do ADN | `xml_archive` | Logs técnicos |
| Certificado .pfx criptografado | `organization_certificates` | Sistema apenas |
| Senha do certificado (criptografada) | `organization_certificates` | Sistema apenas |
| Logs de request HTTP | `fiscal_events` | admin (via Governança) |
| Timestamps de processamento | `fiscal_events` | admin (via Governança) |
| Filas de retry (BullMQ) | Redis | DevOps |
| Thumbprint e metadados técnicos | `organization_certificates` | admin |
| IP de origem das requisições | `eventoAuditoria` | admin |

---

## 16. UI no Menu de Integrações (Futuro)

### 16.1 Card na Lista de Integrações

```
┌─────────────────────────────────────────────────┐
│  📄  NFS-e Nacional                             │
│                                                 │
│  ● Ativo                          [Configurar] │
│                                                 │
│  Última emissão: 23/12/2024 às 14:30           │
│  Notas este mês: 47                             │
│                                                 │
│  [Ver Histórico]  [Emitir Nova]                │
└─────────────────────────────────────────────────┘
```

### 16.2 Página de Detalhes

**Abas:**
1. **Visão Geral**: Status, estatísticas, alertas
2. **Configuração**: Certificado, alíquota padrão, serviço padrão
3. **Histórico**: Lista de NFS-e emitidas com filtros
4. **Logs**: Eventos de auditoria (admin only)

---

## 17. Testes

### 17.1 Cenários de Teste

| ID | Cenário | Dados de Entrada | Resultado Esperado |
|----|---------|------------------|-------------------|
| T01 | Emissão bem-sucedida | DPS válida completa | NFS-e autorizada, XML salvo |
| T02 | Emissão sem certificado | DPS válida, sem cert | Erro: "Certificado não cadastrado" |
| T03 | Emissão com certificado expirado | DPS válida, cert vencido | Erro: "Certificado expirado" |
| T04 | Emissão com CNPJ tomador inválido | CNPJ com dígitos errados | Erro: "CNPJ do tomador inválido" |
| T05 | Emissão com valor zero | valorServico = 0 | Erro: "Valor deve ser maior que zero" |
| T06 | Emissão com alíquota 1% | aliquotaIss = 1 | Erro: "Alíquota entre 2% e 5%" |
| T07 | Cancelamento dentro do prazo | NFS-e < 24h | Cancelamento autorizado |
| T08 | Cancelamento fora do prazo | NFS-e > 24h | Erro: "Prazo expirado" |
| T09 | Consulta por chave | Chave existente | Dados da NFS-e retornados |
| T10 | Upload certificado válido | .pfx válido + senha correta | Certificado cadastrado |
| T11 | Upload certificado CNPJ errado | .pfx de outro CNPJ | Erro: "CNPJ não corresponde" |

### 17.2 Ambiente de Homologação

- **URL**: https://www.producaorestrita.nfse.gov.br
- **Credenciais**: Certificado e-CNPJ válido (mesmo de produção funciona)
- **CNPJs de Teste**: Usar CNPJ real da empresa em ambiente de homologação
- **Comportamento**: Notas são geradas mas não têm validade fiscal

---

## 18. Checklist de Implementação

### 18.1 Backend

- [ ] Criar módulo `server/integrations/fiscal/nfse/`
- [ ] Implementar `NfseNacionalService` com métodos emitir, consultar, cancelar
- [ ] Implementar `DpsBuilder` para montar XML
- [ ] Implementar `XmlSigner` para assinar com certificado
- [ ] Criar cliente HTTP para API do ADN
- [ ] Configurar fila `fiscal_queue` (BullMQ)
- [ ] Implementar worker de processamento
- [ ] Criar validações de entrada (Zod schemas)
- [ ] Implementar retry com backoff
- [ ] Criar testes unitários
- [ ] Criar testes de integração (homologação)

### 18.2 Banco de Dados

- [ ] Criar migration para `nfse_emitidas`
- [ ] Verificar existência de tabelas fiscais base
- [ ] Adicionar índices de performance
- [ ] Testar em ambiente de dev

### 18.3 Frontend

- [ ] Criar página de configuração de certificado
- [ ] Criar lista de NFS-e emitidas
- [ ] Criar modal de detalhes da NFS-e
- [ ] Criar formulário de emissão manual
- [ ] Adicionar checkbox "Emitir NFS-e" no título
- [ ] Implementar download de PDF/XML
- [ ] Criar componente de status da integração

### 18.4 Documentação

- [x] Esta especificação
- [ ] Atualizar README da pasta integracoes_fiscais
- [ ] Documentar variáveis de ambiente
- [ ] Criar guia de troubleshooting

---

## 19. Referências

- [Portal NFS-e Nacional](https://www.gov.br/nfse)
- [Manual de Integração ADN](https://www.gov.br/nfse/pt-br/assuntos/documentacao-tecnica)
- [Lista de Municípios Aderentes](https://www.gov.br/nfse/pt-br/assuntos/municipios-aderentes)
- [Lei Complementar 116/2003](http://www.planalto.gov.br/ccivil_03/leis/lcp/lcp116.htm)
- [Schemas XML NFS-e](https://www.gov.br/nfse/pt-br/assuntos/documentacao-tecnica/schemas)

---

## Histórico de Alterações

| Data | Versão | Autor | Descrição |
|------|--------|-------|-----------|
| Dez/2024 | 1.0 | CentrOS Team | Versão inicial - Integração piloto |

---

**Arquivo:** `docs/integracoes_fiscais/SPEC-NFSE-NACIONAL.md`  
**Template:** [`TEMPLATE-INTEGRACAO.md`](TEMPLATE-INTEGRACAO.md)  
**Prioridade:** P0 - Crítico

