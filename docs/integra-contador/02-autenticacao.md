# Autenticação - Integra Contador

## Visão Geral

As APIs do Integra Contador utilizam o protocolo **OAuth2** para autenticação, com a particularidade de que **todas as requisições exigem certificado digital e-CNPJ** (mTLS).

## Fluxo de Autenticação

```
┌────────────────┐         ┌─────────────────────────────────────┐
│   Cliente      │         │    SERPRO Authentication            │
│   (Paycubed)   │         │    autenticacao.sapi.serpro.gov.br  │
└───────┬────────┘         └─────────────────┬───────────────────┘
        │                                    │
        │  1. POST /authenticate             │
        │     + Certificado e-CNPJ (mTLS)    │
        │     + Basic Auth (key:secret)      │
        │     + Role-Type: TERCEIROS         │
        ├───────────────────────────────────►│
        │                                    │
        │  2. Retorno: access_token +        │
        │     jwt_token + expires_in         │
        │◄───────────────────────────────────┤
        │                                    │
```

## Passo 1: Obtenha Consumer Key e Consumer Secret

As credenciais são obtidas em https://cliente.serpro.gov.br após contratação.

```
Consumer Key:    djaR21PGoYp1iyK2n2ACOH9REdUb
Consumer Secret: ObRsAJWOL4fv2Tp27D1vd8fB3Ote
```

> ⚠️ **IMPORTANTE:** Mantenha essas credenciais protegidas. Elas identificam seu usuário e contrato com o SERPRO.

## Passo 2: Solicite o Bearer Token e JWT Token

### Endpoint de Autenticação

```
POST https://autenticacao.sapi.serpro.gov.br/authenticate
```

### Headers Obrigatórios

| Header | Valor | Descrição |
|--------|-------|-----------|
| `Authorization` | `Basic {base64(key:secret)}` | Credenciais em Base64 |
| `Role-Type` | `TERCEIROS` | Tipo de acesso |
| `Content-Type` | `application/x-www-form-urlencoded` | Formato do body |

### Body

```
grant_type=client_credentials
```

### Certificado Digital

> **OBRIGATÓRIO:** O certificado e-CNPJ ICP-Brasil deve ser enviado na conexão (mTLS).

O certificado deve ser o mesmo utilizado na contratação do produto.

### Gerando o Basic Auth (Base64)

```bash
# Concatenar key:secret e converter para Base64
echo -n "djaR21PGoYp1iyK2n2ACOH9REdUb:ObRsAJWOL4fv2Tp27D1vd8fB3Ote" | base64
# Resultado: ZGphUjIxUEdvWXAxaXlLMm4yQUNPSDlSRWRVYjpPYlJzQUpXT0w0ZnYyVHAyN0QxdmQ4ZkIzT3RlCg
```

### Exemplo cURL Completo

```bash
curl -i -X POST \
  -H "Authorization: Basic ZGphUjIxUEdvWXAxaXlLMm4yQUNPSDlSRWRVYjpPYlJzQUpXT0w0ZnYyVHAyN0QxdmQ4ZkIzT3RlCg" \
  -H "Role-Type: TERCEIROS" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d 'grant_type=client_credentials' \
  --cert-type P12 \
  --cert arquivo_certificado.p12:senha_certificado \
  'https://autenticacao.sapi.serpro.gov.br/authenticate'
```

## Passo 3: Receba o Token

### Resposta de Sucesso

```json
{
  "expires_in": 2008,
  "scope": "default",
  "token_type": "Bearer",
  "access_token": "af012866-daae-3aef-8b40-bd14e8cfac99",
  "jwt_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
}
```

### Campos da Resposta

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `expires_in` | number | Tempo de validade em segundos |
| `scope` | string | Escopo do token |
| `token_type` | string | Tipo do token (Bearer) |
| `access_token` | string | Token de acesso para Authorization header |
| `jwt_token` | string | JWT token para header jwt_token |

## Passo 4: Fazendo uma Requisição

Com os tokens obtidos, faça requisições à API:

```bash
curl -i -X POST \
  -H "Authorization: Bearer af012866-daae-3aef-8b40-bd14e8cfac99" \
  -H "Content-Type: application/json" \
  -H "jwt_token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "contratante": { "numero": "00000000000000", "tipo": 2 },
    "autorPedidoDados": { "numero": "00000000000000", "tipo": 2 },
    "contribuinte": { "numero": "00000000000000", "tipo": 2 },
    "pedidoDados": {
      "idSistema": "PGDASD",
      "idServico": "CONSEXTRATO16",
      "versaoSistema": "1.0",
      "dados": "{ \"numeroDas\": \"99999999999999999\" }"
    }
  }' \
  'https://gateway.apiserpro.serpro.gov.br/integra-contador/v1/Consultar'
```

## Renovação do Token

Quando o token expira, o gateway retorna **HTTP 401 Unauthorized**. Neste caso, repita o Passo 2 para obter novos tokens.

### Estratégia de Cache Recomendada

```typescript
// Renovar token quando restar menos de 5 minutos
const REFRESH_MARGIN_SECONDS = 300;

function isTokenExpired(token: Token): boolean {
  const now = Date.now();
  const expiresAt = token.obtainedAt + (token.expiresIn * 1000);
  return now >= expiresAt - (REFRESH_MARGIN_SECONDS * 1000);
}
```

## Erros Comuns

| Erro | Causa | Solução |
|------|-------|---------|
| 401 Unauthorized | Token expirado ou inválido | Renovar token |
| 415 Unsupported Media Type | Content-Type incorreto | Usar `application/x-www-form-urlencoded` |
| SSL/TLS Error | Certificado não enviado | Verificar configuração mTLS |
| 403 Forbidden | CNPJ do certificado diferente | Usar certificado correto |

## AUTENTICAPROCURADOR

Para software-houses que não possuem procuração do contribuinte, mas atuam em nome de um procurador:

1. O procurador assina um XML de autorização com seu certificado
2. A software-house envia o XML via serviço `ENVIOXMLASSINADO81`
3. Recebe o header `autenticar_procurador_token`
4. Usa esse token nas requisições subsequentes

```
Header: autenticar_procurador_token: {token_retornado}
```

## Referência de Implementação

Veja o código implementado em:
- `server/integrations/serpro/auth.ts` - Cliente OAuth
- `server/integrations/serpro/mtls-client.ts` - Cliente mTLS

