# Observabilidade e Auditoria

> Versao: 1.0.0 | Data: 2025-12-24
> Status: SPEC FINAL - Pronto para implementacao

---

## 1. Objetivo

Definir estrategias de **logging**, **metricas**, **tracing** e **auditoria fiscal** para garantir rastreabilidade completa das operacoes do Motor Fiscal por no minimo 5 anos.

---

## 2. Estrutura de Logs

### 2.1 Log Entry Canonico

```typescript
interface LogEntryFiscal {
  // Identificacao
  timestamp: string;          // ISO 8601
  level: 'debug' | 'info' | 'warn' | 'error';
  service: 'motor-fiscal';
  
  // Correlacao
  correlationId: string;      // ID unico da requisicao
  requestId: string;          // ID da chamada HTTP
  userId?: string;            // Usuario que iniciou
  orgId?: string;             // Organizacao
  
  // Operacao
  operacao: OperacaoFiscal;
  tipoDocumento: TipoDocumento;
  ambiente: 'PRODUCAO' | 'HOMOLOGACAO';
  
  // Documento (sem dados sensiveis)
  documentoId?: string;       // ID interno
  chaveAcesso?: string;       // Chave de acesso (parcialmente mascarada)
  numero?: string;
  serie?: string;
  estado?: EstadoDocumentoFiscal;
  
  // Resultado
  status: 'success' | 'error';
  httpStatus?: number;
  
  // Erro (se aplicavel)
  erro?: {
    codigo: string;
    categoria: string;
    mensagem: string;
    codigoAutoridade?: string;
  };
  
  // Performance
  durationMs: number;
}

type OperacaoFiscal = 
  | 'emissao'
  | 'consulta'
  | 'cancelamento'
  | 'substituicao'
  | 'evento'
  | 'inutilizacao'
  | 'conciliacao';
```

### 2.2 Exemplo de Log

```json
{
  "timestamp": "2025-12-24T10:30:45.123-03:00",
  "level": "info",
  "service": "motor-fiscal",
  "correlationId": "fiscal-1735041045-a1b2c3",
  "requestId": "req-789xyz",
  "userId": "usr_123",
  "orgId": "org_456",
  "operacao": "emissao",
  "tipoDocumento": "NFSE_SP",
  "ambiente": "PRODUCAO",
  "documentoId": "doc_abc123",
  "numero": "12345",
  "estado": "AUTORIZADO",
  "status": "success",
  "httpStatus": 200,
  "durationMs": 2345
}
```

---

## 3. Campos Sensiveis (LGPD)

### 3.1 Classificacao de Dados

| Categoria | Campos | Tratamento |
|-----------|--------|------------|
| Identificavel | CPF, CNPJ, email, telefone | Mascarar |
| Sensivel | Valores fiscais, tributos | Logar |
| Fiscal | chaveAcesso, numero, XML | Logar (hash XML) |
| Operacional | timestamps, duracoes | Logar |
| Debug | Stacktraces | Apenas em dev |

### 3.2 Funcoes de Mascaramento

```typescript
const mascararCpf = (cpf: string): string => {
  const limpo = cpf.replace(/\D/g, '');
  return `***.***.*${limpo.slice(-4, -2)}-${limpo.slice(-2)}`;
};
// "12345678901" -> "***.***.*90-01"

const mascararCnpj = (cnpj: string): string => {
  const limpo = cnpj.replace(/\D/g, '');
  return `**.***.***/${limpo.slice(-6, -2)}-${limpo.slice(-2)}`;
};
// "12345678000190" -> "**.***.***/0001-90"

const mascararEmail = (email: string): string => {
  const [local, dominio] = email.split('@');
  if (!dominio) return '***@***';
  return `${local[0]}***@${dominio}`;
};
// "usuario@email.com" -> "u***@email.com"

const mascararChaveAcesso = (chave: string): string => {
  if (chave.length < 44) return '***';
  return `${chave.slice(0, 4)}...${chave.slice(-4)}`;
};
// "35251223456789000190550010000001231234567890" -> "3525...7890"
```

### 3.3 Campos que NAO devem ser logados

| Campo | Motivo |
|-------|--------|
| XML completo | Dados fiscais completos |
| Endereco completo | Dado pessoal |
| Senha web | Credencial |
| Chave privada | Seguranca |
| Buffer do certificado | Seguranca |

---

## 4. Metricas

### 4.1 Metricas Obrigatorias

```typescript
// Contadores
const metricas = {
  // Emissao
  fiscal_emissao_total: Counter({
    name: 'fiscal_emissao_total',
    help: 'Total de emissoes',
    labelNames: ['tipo_documento', 'ambiente', 'status'],
  }),
  
  // Latencia
  fiscal_emissao_duration: Histogram({
    name: 'fiscal_emissao_duration_seconds',
    help: 'Latencia de emissao',
    labelNames: ['tipo_documento'],
    buckets: [0.5, 1, 2, 5, 10, 30, 60],
  }),
  
  // Erros
  fiscal_erro_total: Counter({
    name: 'fiscal_erro_total',
    help: 'Total de erros',
    labelNames: ['tipo_documento', 'categoria', 'codigo'],
  }),
  
  // Estados
  fiscal_documento_estado: Gauge({
    name: 'fiscal_documento_estado',
    help: 'Documentos por estado',
    labelNames: ['tipo_documento', 'estado'],
  }),
  
  // Certificado
  fiscal_certificado_dias_expiracao: Gauge({
    name: 'fiscal_certificado_dias_expiracao',
    help: 'Dias ate expiracao do certificado',
    labelNames: ['org_id'],
  }),
};
```

### 4.2 Instrumentacao

```typescript
const instrumentar = (fn: Function, operacao: string) => {
  return async (...args: any[]) => {
    const inicio = Date.now();
    const labels = { operacao };
    
    try {
      const resultado = await fn(...args);
      
      metricas.fiscal_emissao_total.labels({ ...labels, status: 'success' }).inc();
      metricas.fiscal_emissao_duration.labels(labels).observe((Date.now() - inicio) / 1000);
      
      return resultado;
    } catch (erro: any) {
      metricas.fiscal_emissao_total.labels({ ...labels, status: 'error' }).inc();
      metricas.fiscal_erro_total.labels({
        ...labels,
        categoria: erro.categoria,
        codigo: erro.codigo,
      }).inc();
      
      throw erro;
    }
  };
};
```

---

## 5. Alertas

### 5.1 Alertas Criticos

| Alerta | Condicao | Acao |
|--------|----------|------|
| Certificado expirando | dias_expiracao < 7 | Renovar certificado |
| Taxa de erro alta | erro/total > 20% por 5min | Investigar |
| Servico indisponivel | 5xx por 5min consecutivos | Verificar autoridade |
| Denegacao fiscal | FISCAL-DEN-* ocorreu | Contatar contador |

### 5.2 Alertas Warning

| Alerta | Condicao | Acao |
|--------|----------|------|
| Certificado expirando | dias_expiracao < 30 | Planejar renovacao |
| Taxa de erro elevada | erro/total > 5% por 5min | Monitorar |
| Latencia alta | p95 > 10s | Otimizar |
| Retries frequentes | retry/total > 10% | Verificar conectividade |

---

## 6. Tracing Distribuido

### 6.1 Propagacao de Contexto

```typescript
interface TracingContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  correlationId: string;
}

const criarSpan = (nome: string, parent?: TracingContext): TracingContext => {
  return {
    traceId: parent?.traceId || gerarTraceId(),
    spanId: gerarSpanId(),
    parentSpanId: parent?.spanId,
    correlationId: parent?.correlationId || gerarCorrelationId(),
  };
};

// Headers para propagacao
const injectHeaders = (ctx: TracingContext): Record<string, string> => ({
  'X-Trace-ID': ctx.traceId,
  'X-Span-ID': ctx.spanId,
  'X-Correlation-ID': ctx.correlationId,
});
```

### 6.2 Spans Recomendados

| Operacao | Spans |
|----------|-------|
| Emissao | validar -> assinar -> transmitir -> processar_resposta |
| Consulta | montar_request -> transmitir -> parser_resposta |
| Cancelamento | validar -> assinar -> transmitir -> atualizar_estado |

---

## 7. Auditoria Fiscal

### 7.1 Requisitos Legais

| Requisito | Periodo | Fundamento |
|-----------|---------|------------|
| Retencao de XML | 5 anos | CTN, legislacao fiscal |
| Retencao de eventos | 5 anos | CTN, legislacao fiscal |
| Retencao de logs | 1 ano | Operacional |
| Imutabilidade | Sempre | Integridade fiscal |

### 7.2 Registro de Auditoria

```typescript
interface AuditRecord {
  // Identificacao
  id: string;
  timestamp: Date;
  
  // Operacao
  operacao: OperacaoFiscal;
  tipoDocumento: TipoDocumento;
  
  // Documento
  documentoId: string;
  chaveAcesso?: string;
  numero?: string;
  
  // Autor
  userId: string;
  orgId: string;
  ipOrigem: string;
  userAgent?: string;
  
  // Certificado usado
  certificadoSerial: string;
  certificadoCNPJ: string;
  
  // Resultado
  sucesso: boolean;
  codigoRetorno?: string;
  protocoloAutoridade?: string;
  
  // Integridade
  hashXML?: string;           // SHA256 do XML enviado
  hashResposta?: string;      // SHA256 da resposta
}
```

### 7.3 Armazenamento Imutavel

```typescript
// Estrategia: append-only com hash chain
interface AuditBlock {
  id: string;
  timestamp: Date;
  records: AuditRecord[];
  hashAnterior: string;
  hash: string;  // SHA256(records + hashAnterior)
}

const criarBloco = (records: AuditRecord[], blocoAnterior?: AuditBlock): AuditBlock => {
  const hashAnterior = blocoAnterior?.hash || 'GENESIS';
  const conteudo = JSON.stringify({ records, hashAnterior });
  
  return {
    id: gerarId(),
    timestamp: new Date(),
    records,
    hashAnterior,
    hash: sha256(conteudo),
  };
};
```

---

## 8. Armazenamento de XMLs

### 8.1 Estrutura de Armazenamento

```
storage/
  fiscal/
    {orgId}/
      {ano}/
        {mes}/
          {tipoDocumento}/
            {chaveAcesso}.xml          # XML autorizado
            {chaveAcesso}.xml.sig      # Assinatura
            {chaveAcesso}.meta.json    # Metadados
            eventos/
              {chaveAcesso}_{evento}.xml
```

### 8.2 Metadados do Arquivo

```typescript
interface MetadadosXML {
  chaveAcesso: string;
  tipoDocumento: TipoDocumento;
  estado: EstadoDocumentoFiscal;
  dataEmissao: string;
  dataAutorizacao: string;
  protocoloAutorizacao: string;
  
  // Integridade
  hashSHA256: string;
  tamanhoBytes: number;
  
  // Referencia
  documentoId: string;
  orgId: string;
  
  // Auditoria
  criadoPor: string;
  criadoEm: string;
}
```

### 8.3 Politica de Retencao

```typescript
const POLITICA_RETENCAO = {
  // XMLs fiscais: 5 anos apos emissao
  xmlFiscal: {
    periodo: 5 * 365 * 24 * 60 * 60 * 1000, // 5 anos em ms
    acao: 'arquivar', // Mover para storage frio
  },
  
  // Logs operacionais: 1 ano
  logsOperacionais: {
    periodo: 365 * 24 * 60 * 60 * 1000,
    acao: 'excluir',
  },
  
  // Metricas: 90 dias em alta resolucao
  metricas: {
    periodo: 90 * 24 * 60 * 60 * 1000,
    acao: 'agregar', // Manter apenas agregados
  },
};
```

---

## 9. Consulta de Auditoria

### 9.1 Endpoints de Auditoria

```typescript
// Consultar historico de um documento
GET /audit/documentos/{documentoId}/historico

// Consultar operacoes por periodo
GET /audit/operacoes?inicio=2025-01-01&fim=2025-12-31&tipo=emissao

// Consultar por usuario
GET /audit/usuarios/{userId}/operacoes?periodo=30d

// Verificar integridade
GET /audit/verificar/{documentoId}
```

### 9.2 Campos de Pesquisa

| Campo | Indexado | Pesquisavel |
|-------|----------|-------------|
| documentoId | Sim | Sim |
| chaveAcesso | Sim | Sim |
| userId | Sim | Sim |
| orgId | Sim | Sim |
| operacao | Sim | Sim |
| tipoDocumento | Sim | Sim |
| timestamp | Sim | Range |
| sucesso | Sim | Sim |

---

## 10. Dashboards Recomendados

### 10.1 Dashboard Operacional

| Painel | Metricas |
|--------|----------|
| Emissoes por hora | fiscal_emissao_total |
| Taxa de sucesso | sucesso / total |
| Latencia p50/p95/p99 | fiscal_emissao_duration |
| Erros por categoria | fiscal_erro_total |
| Top 5 erros | fiscal_erro_total ordenado |

### 10.2 Dashboard de Saude

| Painel | Metricas |
|--------|----------|
| Dias ate expiracao certificado | fiscal_certificado_dias_expiracao |
| Documentos por estado | fiscal_documento_estado |
| Uptime das autoridades | health_check_status |
| Fila de pendentes | fiscal_documento_estado{estado="TRANSMITIDO"} |

### 10.3 Dashboard Fiscal

| Painel | Dados |
|--------|-------|
| Valor total emitido | Agregado de totais.valorTotal |
| Documentos por tipo | Contagem por tipoDocumento |
| Cancelamentos | Taxa de cancelamento |
| Denegacoes | Alerta se > 0 |

---

## 11. Compliance Checklist

| Item | Implementado | Evidencia |
|------|--------------|-----------|
| Logs com correlationId | [ ] | Log sample |
| Mascaramento LGPD | [ ] | Teste de logs |
| Retencao 5 anos | [ ] | Policy configurada |
| Hash de XMLs | [ ] | Metadados |
| Auditoria imutavel | [ ] | Schema do banco |
| Alertas configurados | [ ] | Prometheus rules |
| Dashboards | [ ] | Grafana exports |



