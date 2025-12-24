# Erros, Retry e Observabilidade - NFS-e Nacional

> Fonte: Manuais de API, boas praticas de integracao
> Versao: 1.0 | Data: 2025-12-24

---

## 1. Categorias de Erro

### 1.1 Erros de Autenticacao (4xx)

| HTTP | Codigo | Descricao | Acao |
|------|--------|-----------|------|
| 401 | AUTH001 | Certificado nao apresentado | Verificar configuracao mTLS |
| 401 | AUTH002 | Certificado expirado | Renovar certificado |
| 401 | AUTH003 | Certificado revogado | Obter novo certificado |
| 403 | AUTH004 | Certificado nao autorizado | Verificar permissoes |
| 403 | AUTH005 | CNPJ/CPF nao corresponde | Usar certificado correto |

### 1.2 Erros de Validacao (400)

| Codigo | Descricao | Acao |
|--------|-----------|------|
| VAL001 | XML nao compativel com Schema | Validar XML contra XSD |
| VAL002 | Assinatura digital invalida | Verificar assinatura |
| VAL003 | Campo obrigatorio ausente | Adicionar campo |
| VAL004 | Formato de campo invalido | Corrigir formato |
| VAL005 | Valor fora do range permitido | Ajustar valor |

### 1.3 Erros de Negocio (400/422)

| Codigo | Descricao | Acao |
|--------|-----------|------|
| NEG001 | Municipio nao conveniado | Usar API municipal |
| NEG002 | Contribuinte nao cadastrado | Cadastrar no CNC |
| NEG003 | Contribuinte bloqueado | Contatar municipio |
| NEG004 | NFS-e ja cancelada | Nao processar |
| NEG005 | NFS-e nao existe | Verificar chave |
| NEG006 | Evento ja registrado | Idempotente |
| NEG007 | Prazo de cancelamento expirado | Solicitar analise fiscal |
| NEG008 | Codigo servico invalido | Verificar LC 116 |
| NEG009 | Aliquota nao parametrizada | Verificar municipio |

### 1.4 Erros de Infraestrutura (5xx)

| HTTP | Codigo | Descricao | Acao |
|------|--------|-----------|------|
| 500 | SYS001 | Erro interno do servidor | Retry com backoff |
| 502 | SYS002 | Bad Gateway | Retry com backoff |
| 503 | SYS003 | Servico indisponivel | Retry com backoff |
| 504 | SYS004 | Gateway Timeout | Verificar HEAD + retry |

---

## 2. Matriz de Retry

### 2.1 Decisao de Retry

| Tipo Erro | Retry? | Motivo |
|-----------|--------|--------|
| 400 Validacao | Nao | Erro no payload, corrigir antes |
| 401/403 Auth | Nao | Erro de certificado |
| 404 Not Found | Nao | Recurso nao existe |
| 409 Conflict | Nao | Operacao ja realizada |
| 422 Unprocessable | Nao | Erro de negocio |
| 429 Too Many Requests | Sim | Rate limit, aguardar |
| 500 Internal | Sim | Erro transiente |
| 502 Bad Gateway | Sim | Erro de rede |
| 503 Unavailable | Sim | Servico temporariamente fora |
| 504 Timeout | Sim | Verificar antes |

### 2.2 Estrategia de Backoff

```typescript
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

const backoffDelay = (attempt: number): number => {
  // Exponential backoff: 1s, 2s, 4s
  return BASE_DELAY_MS * Math.pow(2, attempt);
};

const executeWithRetry = async <T>(
  operation: () => Promise<T>,
  isRetryable: (error: any) => boolean
): Promise<T> => {
  let lastError: any;
  
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (!isRetryable(error)) {
        throw error;
      }
      
      await sleep(backoffDelay(attempt));
    }
  }
  
  throw lastError;
};
```

### 2.3 Retry Seguro para Emissao

```typescript
const emitirNFSeSeguro = async (dps: DPS): Promise<NFSe> => {
  const idDPS = montarIdDPS(dps);
  
  try {
    return await emitirNFSe(dps);
  } catch (error) {
    if (isTimeoutOrServerError(error)) {
      // Verificar se ja foi processada
      const existe = await verificarDPS(idDPS);
      
      if (existe) {
        const chave = await obterChavePorDPS(idDPS);
        return await consultarNFSe(chave);
      }
      
      // Retry se nao existe
      return await emitirNFSe(dps);
    }
    
    throw error;
  }
};
```

---

## 3. Observabilidade

### 3.1 Logs Estruturados

```typescript
interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  operation: string;
  correlationId: string;
  
  // Identificadores (nao sensíveis)
  chaveAcesso?: string;
  numeroDPS?: string;
  tipoEvento?: string;
  
  // Resultado
  status: 'success' | 'error';
  httpStatus?: number;
  errorCode?: string;
  errorMessage?: string;
  
  // Performance
  durationMs: number;
}
```

### 3.2 Campos para Logar

| Campo | Logar | Motivo |
|-------|-------|--------|
| chaveAcesso | Sim | Identificador principal |
| numeroDPS | Sim | Correlacao |
| codigoMunicipio | Sim | Rastreamento |
| valorServico | Sim | Auditoria |
| status | Sim | Monitoramento |
| erros | Sim | Debug |
| CNPJ prestador | Parcial | Ultimos 4 digitos |
| CPF/CNPJ tomador | Mascarado | LGPD |
| email | Nao | LGPD |
| telefone | Nao | LGPD |
| XML completo | Hash | Sigilo fiscal |

### 3.3 Mascaramento LGPD

```typescript
const mascararCpf = (cpf: string): string => {
  return `***.***.${cpf.slice(-5, -2)}-${cpf.slice(-2)}`;
};

const mascararCnpj = (cnpj: string): string => {
  return `**.***.***/****-${cnpj.slice(-2)}`;
};

const mascararEmail = (email: string): string => {
  const [local, domain] = email.split('@');
  return `${local[0]}***@${domain}`;
};
```

---

## 4. Metricas

### 4.1 Metricas Recomendadas

| Metrica | Tipo | Descricao |
|---------|------|-----------|
| `nfse_emissao_total` | Counter | Total de emissoes |
| `nfse_emissao_sucesso` | Counter | Emissoes com sucesso |
| `nfse_emissao_erro` | Counter | Emissoes com erro |
| `nfse_emissao_latency` | Histogram | Latencia de emissao |
| `nfse_consulta_total` | Counter | Total de consultas |
| `nfse_evento_total` | Counter | Total de eventos |
| `nfse_retry_total` | Counter | Total de retries |

### 4.2 Alertas Sugeridos

| Alerta | Condicao | Severidade |
|--------|----------|------------|
| Taxa de erro alta | erro/total > 5% em 5min | Warning |
| Taxa de erro critica | erro/total > 20% em 5min | Critical |
| Latencia alta | p95 > 10s | Warning |
| Servico indisponivel | 5xx por 5min | Critical |
| Certificado expirando | < 30 dias | Warning |
| Certificado expirando | < 7 dias | Critical |

---

## 5. Auditoria

### 5.1 Requisitos de Retencao

| Tipo | Periodo | Fundamento |
|------|---------|------------|
| NFS-e (XML) | 5 anos | Legislacao fiscal |
| Eventos | 5 anos | Legislacao fiscal |
| Logs operacionais | 90 dias | Operacional |
| Logs de erro | 1 ano | Debug |

### 5.2 Campos de Auditoria

```typescript
interface AuditRecord {
  // Identificacao
  id: string;
  chaveAcesso: string;
  
  // Operacao
  operacao: 'emissao' | 'consulta' | 'cancelamento' | 'evento';
  dataHora: Date;
  
  // Autor
  cpfCnpjAutor: string;  // Mascarado no log, completo no banco
  certificadoSerial: string;
  ipOrigem: string;
  
  // Resultado
  sucesso: boolean;
  codigoRetorno?: string;
  
  // Hash para integridade
  hashXML?: string;  // SHA256
}
```

---

## 6. Correlacao de Requisicoes

### 6.1 Correlation ID

```typescript
const gerarCorrelationId = (): string => {
  return `nfse-${Date.now()}-${randomUUID().slice(0, 8)}`;
};

// Propagar em headers
const headers = {
  'X-Correlation-ID': correlationId,
  'X-Request-ID': requestId,
};
```

### 6.2 Rastreamento End-to-End

```
[Frontend] --correlationId--> [Backend] --correlationId--> [API NFSe]
     |                             |                            |
     +-------- Log correlationId --+-------- Log correlationId -+
```

---

## 7. Health Check

### 7.1 Verificacao de Conectividade

```typescript
const healthCheck = async (): Promise<HealthStatus> => {
  const checks = {
    certificado: await verificarCertificado(),
    conectividade: await verificarConectividade(),
    parametros: await verificarParametros(),
  };
  
  return {
    status: Object.values(checks).every(c => c.ok) ? 'healthy' : 'unhealthy',
    checks,
    timestamp: new Date().toISOString(),
  };
};

const verificarConectividade = async (): Promise<CheckResult> => {
  try {
    // Usar endpoint leve (parametros ou HEAD)
    const response = await fetch(`${baseUrl}/parametros_municipais/3550308/convenio`);
    return { ok: response.ok, latencyMs: elapsed };
  } catch (error) {
    return { ok: false, error: error.message };
  }
};
```

