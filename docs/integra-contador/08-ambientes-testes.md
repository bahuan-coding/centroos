# Ambientes e Testes - Integra Contador

## Ambientes Disponíveis

### Produção

Ambiente real conectado aos sistemas oficiais da RFB.

| Componente | URL |
|------------|-----|
| Autenticação | `https://autenticacao.sapi.serpro.gov.br` |
| Gateway | `https://gateway.apiserpro.serpro.gov.br` |
| API Integra | `/integra-contador/v1/` |

**Requisitos:**
- Contrato ativo com SERPRO
- Certificado e-CNPJ ICP-Brasil válido
- Consumer Key/Secret de produção
- Procuração eletrônica (para dados de terceiros)

### Homologação

Ambiente de testes com dados fictícios.

| Componente | URL |
|------------|-----|
| Autenticação | `https://autenticacao-hom.sapi.serpro.gov.br` |
| Gateway | `https://gateway-hom.apiserpro.serpro.gov.br` |
| API Integra | `/integra-contador/v1/` |

**Características:**
- Dados simulados (não reais)
- Sem necessidade de procuração real
- Consumer Key/Secret de homologação
- Certificado pode ser de teste

---

## Demonstração (Trial)

O SERPRO oferece um ambiente de **demonstração** para avaliação:

### Como Acessar

1. Acesse [API Center SERPRO](https://apicenter.estaleiro.serpro.gov.br/)
2. Crie uma conta
3. Solicite acesso à API "Integra Contador"
4. Utilize as credenciais de demonstração fornecidas

### Limitações

| Aspecto | Demonstração | Produção |
|---------|--------------|----------|
| Dados | Fictícios | Reais RFB |
| Rate Limit | Reduzido | Contratado |
| Validade | 30 dias | Contrato |
| Suporte | Básico | Completo |

---

## Configuração do Ambiente

### Variáveis de Ambiente

```env
# Credenciais SERPRO
SERPRO_CONSUMER_KEY=hn19_Qt0XfUS5XWnt65MlW_CAjYa
SERPRO_CONSUMER_SECRET=35kFUZN2pISbD8IaXEDxFoGFK8ka

# Ambiente (production | trial)
SERPRO_ENVIRONMENT=production

# Certificado Digital
PAYCUBED_CNPJ=63552022000184
PAYCUBED_CERTIFICATE_ID=paycubed-ecnpj

# mTLS (default: true em produção)
SERPRO_USE_MTLS=true
```

### Configuração TypeScript

```typescript
import { getSerproConfig } from '@/server/integrations/serpro';

const config = getSerproConfig();
// Usa as variáveis de ambiente automaticamente

// Ou configuração manual:
const customConfig = {
  consumerKey: 'sua-key',
  consumerSecret: 'seu-secret',
  environment: 'production' as const,
  certificateId: 'id-do-certificado',
  useMtls: true,
};
```

---

## Testes

### Script de Teste mTLS

```bash
# Executar teste de integração com mTLS
npx tsx scripts/test-serpro-mtls.ts
```

### Teste Manual (cURL)

```bash
# 1. Autenticação
TOKEN_RESPONSE=$(curl -s -X POST \
  'https://autenticacao.sapi.serpro.gov.br/authenticate' \
  -H 'Authorization: Basic aG4xOV9RdDBYZlVTNVhXbnQ2NU1sV19DQWpZYTozNWtGVVpOMnBJU2JEOElhWEVEeEZvR0ZLOGth' \
  -H 'Role-Type: TERCEIROS' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --cert-type P12 \
  --cert certificado.p12:senha \
  -d 'grant_type=client_credentials')

ACCESS_TOKEN=$(echo $TOKEN_RESPONSE | jq -r '.access_token')
JWT_TOKEN=$(echo $TOKEN_RESPONSE | jq -r '.jwt_token')

echo "Access Token: $ACCESS_TOKEN"
echo "JWT Token: $JWT_TOKEN"

# 2. Consulta SITFIS
curl -X POST \
  'https://gateway.apiserpro.serpro.gov.br/integra-contador/v1/Consultar' \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "jwt_token: $JWT_TOKEN" \
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

### Teste Unitário

```typescript
// __tests__/serpro/auth.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { getAccessToken, invalidateToken } from '@/server/integrations/serpro';

describe('SERPRO Auth', () => {
  beforeEach(() => {
    invalidateToken();
  });

  it('deve obter token de acesso', async () => {
    const token = await getAccessToken();
    
    expect(token.accessToken).toBeDefined();
    expect(token.jwtToken).toBeDefined();
    expect(token.expiresIn).toBeGreaterThan(0);
  });

  it('deve usar cache para token válido', async () => {
    const token1 = await getAccessToken();
    const token2 = await getAccessToken();
    
    expect(token1.accessToken).toBe(token2.accessToken);
  });
});
```

---

## Checklist de Integração

### Pré-requisitos

- [ ] Contrato SERPRO ativo
- [ ] Consumer Key e Secret obtidos
- [ ] Certificado e-CNPJ ICP-Brasil válido
- [ ] Certificado cadastrado no banco de dados
- [ ] Variáveis de ambiente configuradas

### Validação

- [ ] Autenticação OAuth funcionando
- [ ] mTLS configurado corretamente
- [ ] Consulta própria (mesmo CNPJ) funcionando
- [ ] Procuração cadastrada no e-CAC (para terceiros)
- [ ] Rate limiting respeitado

### Produção

- [ ] Logs configurados
- [ ] Monitoramento de erros
- [ ] Alertas de procuração vencendo
- [ ] Backup de credenciais
- [ ] Retry automático implementado

---

## Troubleshooting

### Erro: "Token inválido" (401)

**Causas:**
- Token expirado
- Consumer Key/Secret incorretos
- Ambiente incorreto

**Soluções:**
```typescript
// Invalidar e renovar token
import { invalidateToken, getAccessToken } from '@/server/integrations/serpro';

invalidateToken();
const newToken = await getAccessToken();
```

### Erro: "Certificado inválido" (SSL Error)

**Causas:**
- Certificado não enviado na requisição
- Senha do PFX incorreta
- Certificado expirado

**Soluções:**
```bash
# Verificar certificado
openssl pkcs12 -in certificado.p12 -info -nokeys

# Verificar validade
openssl pkcs12 -in certificado.p12 -clcerts -nokeys | openssl x509 -noout -dates
```

### Erro: "Procuração não encontrada" (403)

**Causas:**
- Procuração não cadastrada
- Código de serviço não incluído
- Procuração expirada

**Soluções:**
1. Verificar no e-CAC se procuração existe
2. Confirmar se código 59 (SITFIS) está incluído
3. Verificar data de validade

### Erro: "Rate limit excedido" (429)

**Causas:**
- Muitas requisições em curto período

**Soluções:**
```typescript
// Implementar exponential backoff
const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
```

---

## Suporte

### Canais de Atendimento SERPRO

| Canal | Contato |
|-------|---------|
| Central | 0800 728 2323 |
| E-mail | suporte.api@serpro.gov.br |
| Portal | https://cliente.serpro.gov.br |

### Horário de Atendimento

| Dia | Horário |
|-----|---------|
| Segunda a Sexta | 08h às 19h |
| Sábado | 09h às 13h |

### Documentação Oficial

- [API Center](https://apicenter.estaleiro.serpro.gov.br/)
- [Documentação Integra Contador](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/)
- [Portal do Cliente](https://cliente.serpro.gov.br/)

