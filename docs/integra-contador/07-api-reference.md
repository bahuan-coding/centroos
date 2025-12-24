# API Reference - Integra Contador

## URLs Base

### Autenticação

| Ambiente | URL |
|----------|-----|
| Produção | `https://autenticacao.sapi.serpro.gov.br` |
| Homologação | `https://autenticacao-hom.sapi.serpro.gov.br` |

### Gateway de APIs

| Ambiente | URL |
|----------|-----|
| Produção | `https://gateway.apiserpro.serpro.gov.br` |
| Homologação | `https://gateway-hom.apiserpro.serpro.gov.br` |

---

## Endpoints

### Autenticação OAuth

#### POST /authenticate

Obtém tokens de acesso.

**URL Completa:** `https://autenticacao.sapi.serpro.gov.br/authenticate`

**Headers:**

| Header | Valor | Obrigatório |
|--------|-------|-------------|
| Authorization | Basic {base64(key:secret)} | Sim |
| Role-Type | TERCEIROS | Sim |
| Content-Type | application/x-www-form-urlencoded | Sim |

**Body:**
```
grant_type=client_credentials
```

**mTLS:** Obrigatório (certificado e-CNPJ)

**Response 200:**
```json
{
  "expires_in": 2008,
  "scope": "default",
  "token_type": "Bearer",
  "access_token": "af012866-daae-3aef-8b40-bd14e8cfac99",
  "jwt_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### Integra Contador - Consultar

#### POST /integra-contador/v1/Consultar

Endpoint unificado para todas as operações do Integra Contador.

**URL Completa:** `https://gateway.apiserpro.serpro.gov.br/integra-contador/v1/Consultar`

**Headers:**

| Header | Valor | Obrigatório |
|--------|-------|-------------|
| Authorization | Bearer {access_token} | Sim |
| jwt_token | {jwt_token} | Sim |
| Content-Type | application/json | Sim |
| autenticar_procurador_token | {token} | Condicional |

**mTLS:** Obrigatório (certificado e-CNPJ)

**Request Body (Schema):**
```json
{
  "contratante": {
    "numero": "string (CNPJ 14 dígitos)",
    "tipo": 2
  },
  "autorPedidoDados": {
    "numero": "string (CNPJ 14 dígitos)",
    "tipo": 2
  },
  "contribuinte": {
    "numero": "string (CNPJ 14 dígitos ou CPF 11 dígitos)",
    "tipo": 1 | 2
  },
  "pedidoDados": {
    "idSistema": "string",
    "idServico": "string",
    "versaoSistema": "string",
    "dados": "string (JSON stringificado)"
  }
}
```

**Campos:**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| contratante.numero | string | CNPJ de quem contratou o produto |
| contratante.tipo | number | 2 = CNPJ |
| autorPedidoDados.numero | string | CNPJ/CPF de quem faz a requisição |
| autorPedidoDados.tipo | number | 1 = CPF, 2 = CNPJ |
| contribuinte.numero | string | CNPJ/CPF do contribuinte consultado |
| contribuinte.tipo | number | 1 = CPF, 2 = CNPJ |
| pedidoDados.idSistema | string | Identificador do sistema RFB |
| pedidoDados.idServico | string | Identificador do serviço |
| pedidoDados.versaoSistema | string | Versão (geralmente "1.0") |
| pedidoDados.dados | string | JSON com parâmetros específicos do serviço |

---

## Operações por Sistema

### SITFIS - Situação Fiscal

#### Solicitar Relatório

```json
{
  "pedidoDados": {
    "idSistema": "SITFIS",
    "idServico": "SOLICITARSITFIS81",
    "versaoSistema": "1.0",
    "dados": "{}"
  }
}
```

**Response:**
```json
{
  "resposta": {
    "protocolo": "SITFIS202412240001",
    "status": "SOLICITADO"
  }
}
```

#### Emitir Relatório

```json
{
  "pedidoDados": {
    "idSistema": "SITFIS",
    "idServico": "EMITIRSITFIS81",
    "versaoSistema": "1.0",
    "dados": "{ \"protocolo\": \"SITFIS202412240001\" }"
  }
}
```

**Response (Concluído):**
```json
{
  "resposta": {
    "protocolo": "SITFIS202412240001",
    "status": "CONCLUIDO",
    "relatorioBase64": "JVBERi0xLjQK..."
  }
}
```

---

### PGDAS-D - Simples Nacional

#### Consultar Extrato

```json
{
  "pedidoDados": {
    "idSistema": "PGDASD",
    "idServico": "CONSEXTRATO16",
    "versaoSistema": "1.0",
    "dados": "{ \"periodoApuracao\": \"202401\" }"
  }
}
```

#### Consultar Período de Apuração

```json
{
  "pedidoDados": {
    "idSistema": "PGDASD",
    "idServico": "CONSPA15",
    "versaoSistema": "1.0",
    "dados": "{ \"periodoApuracao\": \"202401\" }"
  }
}
```

#### Gerar DAS

```json
{
  "pedidoDados": {
    "idSistema": "PGDASD",
    "idServico": "GERADAS24",
    "versaoSistema": "1.0",
    "dados": "{ \"periodoApuracao\": \"202401\", \"dataVencimento\": \"2024-02-20\" }"
  }
}
```

---

### DCTFWEB - Declaração Previdenciária

#### Consultar Declaração

```json
{
  "pedidoDados": {
    "idSistema": "DCTFWEB",
    "idServico": "CONSULTADECLARACAO95",
    "versaoSistema": "1.0",
    "dados": "{ \"periodoApuracao\": \"202401\" }"
  }
}
```

#### Consultar DARF

```json
{
  "pedidoDados": {
    "idSistema": "DCTFWEB",
    "idServico": "CONSULTADARF99",
    "versaoSistema": "1.0",
    "dados": "{ \"numeroDeclaracao\": \"123456\" }"
  }
}
```

#### Gerar DARF

```json
{
  "pedidoDados": {
    "idSistema": "DCTFWEB",
    "idServico": "GERARDARF98",
    "versaoSistema": "1.0",
    "dados": "{ \"numeroDeclaracao\": \"123456\", \"dataVencimento\": \"2024-02-20\" }"
  }
}
```

---

### PROCURACOES - Gestão de Procurações

#### Consultar Procurações Recebidas

```json
{
  "pedidoDados": {
    "idSistema": "PROCURACOES",
    "idServico": "CONSULTARPROCURACOES",
    "versaoSistema": "1.0",
    "dados": "{}"
  }
}
```

**Response:**
```json
{
  "resposta": {
    "procuracoes": [
      {
        "outorgante": {
          "numero": "12345678000190",
          "nome": "EMPRESA XYZ LTDA"
        },
        "servicos": [45, 59, 91],
        "dataInicio": "2024-01-01",
        "dataFim": "2029-01-01",
        "status": "ATIVA"
      }
    ]
  }
}
```

---

### AUTENTICAPROCURADOR

#### Enviar XML Assinado

```json
{
  "pedidoDados": {
    "idSistema": "AUTENTICAPROCURADOR",
    "idServico": "ENVIOXMLASSINADO81",
    "versaoSistema": "1.0",
    "dados": "{ \"xmlAssinado\": \"<AutenticaProcurador>...</AutenticaProcurador>\" }"
  }
}
```

**Response:**
```json
{
  "resposta": {
    "autenticar_procurador_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

## OpenAPI Specification

```yaml
openapi: 3.0.3
info:
  title: SERPRO Integra Contador API
  version: 1.0.0
  description: API para integração com serviços fiscais da RFB
  
servers:
  - url: https://gateway.apiserpro.serpro.gov.br
    description: Produção
  - url: https://gateway-hom.apiserpro.serpro.gov.br
    description: Homologação

paths:
  /integra-contador/v1/Consultar:
    post:
      summary: Executa operação no Integra Contador
      security:
        - bearerAuth: []
        - jwtToken: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ConsultarRequest'
      responses:
        '200':
          description: Sucesso
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ConsultarResponse'
        '401':
          description: Não autorizado
        '403':
          description: Acesso negado
        '429':
          description: Rate limit excedido

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
    jwtToken:
      type: apiKey
      in: header
      name: jwt_token
      
  schemas:
    ConsultarRequest:
      type: object
      required:
        - contratante
        - autorPedidoDados
        - contribuinte
        - pedidoDados
      properties:
        contratante:
          $ref: '#/components/schemas/Identificador'
        autorPedidoDados:
          $ref: '#/components/schemas/Identificador'
        contribuinte:
          $ref: '#/components/schemas/Identificador'
        pedidoDados:
          $ref: '#/components/schemas/PedidoDados'
          
    Identificador:
      type: object
      required:
        - numero
        - tipo
      properties:
        numero:
          type: string
          description: CPF (11 dígitos) ou CNPJ (14 dígitos)
        tipo:
          type: integer
          enum: [1, 2]
          description: 1 = CPF, 2 = CNPJ
          
    PedidoDados:
      type: object
      required:
        - idSistema
        - idServico
        - versaoSistema
        - dados
      properties:
        idSistema:
          type: string
        idServico:
          type: string
        versaoSistema:
          type: string
        dados:
          type: string
          description: JSON stringificado com parâmetros
          
    ConsultarResponse:
      type: object
      properties:
        dadosResposta:
          type: object
          properties:
            idResposta:
              type: string
            codigoStatus:
              type: string
            mensagem:
              type: string
        resposta:
          type: object
          additionalProperties: true
```

---

## cURL Examples

### Autenticação

```bash
curl -X POST \
  'https://autenticacao.sapi.serpro.gov.br/authenticate' \
  -H 'Authorization: Basic dG9rZW4tc2VjcmV0' \
  -H 'Role-Type: TERCEIROS' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --cert-type P12 \
  --cert certificado.p12:senha \
  -d 'grant_type=client_credentials'
```

### Consulta SITFIS

```bash
curl -X POST \
  'https://gateway.apiserpro.serpro.gov.br/integra-contador/v1/Consultar' \
  -H 'Authorization: Bearer {token}' \
  -H 'jwt_token: {jwt}' \
  -H 'Content-Type: application/json' \
  --cert-type P12 \
  --cert certificado.p12:senha \
  -d '{
    "contratante": {"numero": "63552022000184", "tipo": 2},
    "autorPedidoDados": {"numero": "63552022000184", "tipo": 2},
    "contribuinte": {"numero": "63552022000184", "tipo": 2},
    "pedidoDados": {
      "idSistema": "SITFIS",
      "idServico": "SOLICITARSITFIS81",
      "versaoSistema": "1.0",
      "dados": "{}"
    }
  }'
```

