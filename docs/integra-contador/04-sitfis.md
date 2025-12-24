# SITFIS - Situação Fiscal

## Visão Geral

O serviço SITFIS permite solicitar e emitir o **Relatório de Situação Fiscal** do contribuinte. Este relatório contém informações sobre:
- Débitos fiscais
- Parcelamentos ativos
- Ações fiscais em andamento
- Situação cadastral

## Fluxo de Operação

O SITFIS opera em **duas etapas**:

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   SOLICITAR │ ───► │ PROCESSAR   │ ───► │   EMITIR    │
│             │      │ (Assíncrono)│      │             │
└─────────────┘      └─────────────┘      └─────────────┘
     ▲                                          │
     │                                          │
     └──────── Aguardar processamento ──────────┘
```

1. **Solicitar**: Inicia o pedido do relatório
2. **Aguardar**: O SERPRO processa a solicitação (pode levar segundos a minutos)
3. **Emitir**: Recupera o relatório em PDF

## Endpoint Base

```
https://gateway.apiserpro.serpro.gov.br/integra-contador/v1/
```

---

## Solicitar Situação Fiscal

### Operação

```
POST /Consultar
```

### Headers

| Header | Valor |
|--------|-------|
| Authorization | Bearer {access_token} |
| jwt_token | {jwt_token} |
| Content-Type | application/json |

### Request Body

```json
{
  "contratante": {
    "numero": "63552022000184",
    "tipo": 2
  },
  "autorPedidoDados": {
    "numero": "63552022000184",
    "tipo": 2
  },
  "contribuinte": {
    "numero": "12345678000190",
    "tipo": 2
  },
  "pedidoDados": {
    "idSistema": "SITFIS",
    "idServico": "SOLICITARSITFIS81",
    "versaoSistema": "1.0",
    "dados": "{}"
  }
}
```

### Campos

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| contratante.numero | string | Sim | CNPJ do contratante (quem contratou o serviço) |
| contratante.tipo | number | Sim | 2 = CNPJ |
| autorPedidoDados.numero | string | Sim | CNPJ do autor (quem está requisitando) |
| autorPedidoDados.tipo | number | Sim | 2 = CNPJ |
| contribuinte.numero | string | Sim | CNPJ do contribuinte consultado |
| contribuinte.tipo | number | Sim | 2 = CNPJ |
| pedidoDados.idSistema | string | Sim | "SITFIS" |
| pedidoDados.idServico | string | Sim | "SOLICITARSITFIS81" |
| pedidoDados.versaoSistema | string | Sim | "1.0" |
| pedidoDados.dados | string | Sim | JSON com parâmetros (pode ser "{}") |

### Response (Sucesso)

```json
{
  "dadosResposta": {
    "idResposta": "123456789",
    "codigoStatus": "00",
    "mensagem": "Solicitação recebida com sucesso"
  },
  "resposta": {
    "protocolo": "SITFIS202412240001",
    "dataHoraSolicitacao": "2024-12-24T10:30:00-03:00",
    "status": "SOLICITADO"
  }
}
```

### Response (Erro)

```json
{
  "dadosResposta": {
    "idResposta": "123456789",
    "codigoStatus": "99",
    "mensagem": "Erro ao processar solicitação"
  },
  "resposta": {
    "codigoErro": "SIT001",
    "mensagemErro": "Contribuinte não possui procuração válida"
  }
}
```

---

## Emitir Situação Fiscal

### Operação

```
POST /Consultar
```

### Request Body

```json
{
  "contratante": {
    "numero": "63552022000184",
    "tipo": 2
  },
  "autorPedidoDados": {
    "numero": "63552022000184",
    "tipo": 2
  },
  "contribuinte": {
    "numero": "12345678000190",
    "tipo": 2
  },
  "pedidoDados": {
    "idSistema": "SITFIS",
    "idServico": "EMITIRSITFIS81",
    "versaoSistema": "1.0",
    "dados": "{ \"protocolo\": \"SITFIS202412240001\" }"
  }
}
```

### Campos Específicos

| Campo | Descrição |
|-------|-----------|
| dados.protocolo | Protocolo retornado na solicitação |

### Response (Sucesso - Processando)

```json
{
  "dadosResposta": {
    "idResposta": "123456790",
    "codigoStatus": "01",
    "mensagem": "Solicitação em processamento"
  },
  "resposta": {
    "protocolo": "SITFIS202412240001",
    "status": "PROCESSANDO",
    "tempoEstimado": 30
  }
}
```

### Response (Sucesso - Concluído)

```json
{
  "dadosResposta": {
    "idResposta": "123456791",
    "codigoStatus": "00",
    "mensagem": "Relatório emitido com sucesso"
  },
  "resposta": {
    "protocolo": "SITFIS202412240001",
    "dataHoraSolicitacao": "2024-12-24T10:30:00-03:00",
    "dataHoraConclusao": "2024-12-24T10:30:45-03:00",
    "status": "CONCLUIDO",
    "relatorioBase64": "JVBERi0xLjQKJ..."
  }
}
```

---

## Status Possíveis

| Status | Descrição | Ação |
|--------|-----------|------|
| SOLICITADO | Pedido recebido | Aguardar e consultar emitir |
| PROCESSANDO | Em processamento | Aguardar alguns segundos e tentar novamente |
| CONCLUIDO | Relatório pronto | Relatório disponível em relatorioBase64 |
| ERRO | Erro no processamento | Verificar mensagem de erro |

---

## Tempo de Espera

O tempo de processamento varia conforme:
- Carga do sistema RFB
- Complexidade do contribuinte
- Horário da solicitação

### Recomendação de Polling

```typescript
const POLLING_INTERVALS = [
  2000,   // 2 segundos
  5000,   // 5 segundos
  10000,  // 10 segundos
  30000,  // 30 segundos
];

async function aguardarRelatorio(protocolo: string): Promise<Relatorio> {
  for (const interval of POLLING_INTERVALS) {
    await sleep(interval);
    const result = await emitirSituacaoFiscal(protocolo);
    
    if (result.status === 'CONCLUIDO') {
      return result;
    }
    
    if (result.status === 'ERRO') {
      throw new Error(result.mensagem);
    }
  }
  throw new Error('Timeout aguardando relatório');
}
```

---

## Procuração Eletrônica

Para consultar SITFIS de terceiros, é necessária **procuração eletrônica** com:

| Campo | Valor |
|-------|-------|
| Código do Serviço | 59 |
| Descrição | Situação Fiscal |
| Cadastrada em | e-CAC (Portal RFB) |

### Cenários de Acesso

| Cenário | Procuração Necessária |
|---------|----------------------|
| Consulta própria (CNPJ do certificado = contribuinte) | Não |
| Consulta de terceiro (contador para cliente) | Sim (código 59) |
| Software-house em nome de contador | AUTENTICAPROCURADOR |

---

## Cache

O SERPRO pode aplicar cache em algumas respostas:

| Tipo | TTL |
|------|-----|
| Relatório SITFIS | 24 horas |
| Erro de validação | Sem cache |

> **Nota:** Se precisar de dados atualizados, pode ser necessário aguardar o TTL ou utilizar parâmetros específicos de refresh (quando disponíveis).

---

## Códigos de Erro SITFIS

| Código | Mensagem | Causa |
|--------|----------|-------|
| SIT001 | Contribuinte não possui procuração válida | Falta procuração código 59 |
| SIT002 | CNPJ não encontrado | CNPJ inexistente na RFB |
| SIT003 | Serviço temporariamente indisponível | Manutenção RFB |
| SIT004 | Limite de requisições excedido | Rate limiting |
| SIT005 | Certificado inválido | Problema com mTLS |

---

## Exemplo Completo (cURL)

### Solicitar

```bash
curl -X POST \
  'https://gateway.apiserpro.serpro.gov.br/integra-contador/v1/Consultar' \
  -H 'Authorization: Bearer {access_token}' \
  -H 'jwt_token: {jwt_token}' \
  -H 'Content-Type: application/json' \
  --cert-type P12 \
  --cert certificado.p12:senha \
  -d '{
    "contratante": {"numero": "63552022000184", "tipo": 2},
    "autorPedidoDados": {"numero": "63552022000184", "tipo": 2},
    "contribuinte": {"numero": "12345678000190", "tipo": 2},
    "pedidoDados": {
      "idSistema": "SITFIS",
      "idServico": "SOLICITARSITFIS81",
      "versaoSistema": "1.0",
      "dados": "{}"
    }
  }'
```

### Emitir

```bash
curl -X POST \
  'https://gateway.apiserpro.serpro.gov.br/integra-contador/v1/Consultar' \
  -H 'Authorization: Bearer {access_token}' \
  -H 'jwt_token: {jwt_token}' \
  -H 'Content-Type: application/json' \
  --cert-type P12 \
  --cert certificado.p12:senha \
  -d '{
    "contratante": {"numero": "63552022000184", "tipo": 2},
    "autorPedidoDados": {"numero": "63552022000184", "tipo": 2},
    "contribuinte": {"numero": "12345678000190", "tipo": 2},
    "pedidoDados": {
      "idSistema": "SITFIS",
      "idServico": "EMITIRSITFIS81",
      "versaoSistema": "1.0",
      "dados": "{ \"protocolo\": \"SITFIS202412240001\" }"
    }
  }'
```

---

## Referência de Implementação

Código implementado em:
- `server/integrations/serpro/sitfis-client.ts`

