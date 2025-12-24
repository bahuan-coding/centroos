# Códigos de Retorno - Integra Contador

## Códigos HTTP

### Sucesso

| Código | Descrição | Cenário |
|--------|-----------|---------|
| 200 | OK | Requisição processada com sucesso |

### Erros do Cliente

| Código | Descrição | Cenário |
|--------|-----------|---------|
| 400 | Bad Request | Requisição malformada ou parâmetros inválidos |
| 401 | Unauthorized | Token expirado ou inválido |
| 403 | Forbidden | Sem permissão (procuração ausente/inválida) |
| 404 | Not Found | Recurso não encontrado |
| 405 | Method Not Allowed | Método HTTP não suportado |
| 415 | Unsupported Media Type | Content-Type incorreto |
| 422 | Unprocessable Entity | Dados válidos mas não processáveis |
| 429 | Too Many Requests | Rate limit excedido |

### Erros do Servidor

| Código | Descrição | Cenário |
|--------|-----------|---------|
| 500 | Internal Server Error | Erro interno do SERPRO |
| 502 | Bad Gateway | Erro de comunicação com RFB |
| 503 | Service Unavailable | Serviço temporariamente indisponível |
| 504 | Gateway Timeout | Timeout na comunicação com RFB |

---

## Estrutura de Erro

### Resposta de Erro Padrão

```json
{
  "dadosResposta": {
    "idResposta": "123456789",
    "codigoStatus": "99",
    "mensagem": "Erro ao processar requisição"
  },
  "resposta": {
    "codigoErro": "ERR001",
    "mensagemErro": "Descrição detalhada do erro",
    "detalhes": "Informações adicionais quando disponíveis"
  }
}
```

### Campos de Erro

| Campo | Tipo | Descrição |
|-------|------|-----------|
| dadosResposta.codigoStatus | string | Código de status geral |
| dadosResposta.mensagem | string | Mensagem resumida |
| resposta.codigoErro | string | Código específico do erro |
| resposta.mensagemErro | string | Descrição do erro |
| resposta.detalhes | string | Detalhes adicionais (opcional) |

---

## Códigos de Status Geral

| Código | Descrição |
|--------|-----------|
| 00 | Sucesso |
| 01 | Processando (aguarde) |
| 99 | Erro |

---

## Códigos de Erro por Categoria

### Autenticação (AUTH)

| Código | Mensagem | Causa | Solução |
|--------|----------|-------|---------|
| AUTH001 | Token inválido | Bearer token expirado ou malformado | Renovar token OAuth |
| AUTH002 | JWT inválido | jwt_token ausente ou inválido | Incluir jwt_token no header |
| AUTH003 | Certificado inválido | Problema com certificado mTLS | Verificar certificado e-CNPJ |
| AUTH004 | Certificado expirado | Certificado digital vencido | Renovar certificado |
| AUTH005 | CNPJ não autorizado | CNPJ não está no contrato | Verificar contrato SERPRO |

### Procuração (PRO)

| Código | Mensagem | Causa | Solução |
|--------|----------|-------|---------|
| PRO001 | Procuração não encontrada | Não existe procuração cadastrada | Cadastrar no e-CAC |
| PRO002 | Procuração expirada | Validade vencida | Renovar procuração |
| PRO003 | Serviço não autorizado | Código não incluído | Adicionar código à procuração |
| PRO004 | Procurador inválido | CNPJ incorreto | Verificar dados |
| PRO005 | Token procurador expirado | Token AUTENTICAPROCURADOR expirado | Renovar autenticação |

### Validação (VAL)

| Código | Mensagem | Causa | Solução |
|--------|----------|-------|---------|
| VAL001 | CNPJ inválido | Formato incorreto ou dígito errado | Corrigir CNPJ |
| VAL002 | CPF inválido | Formato incorreto ou dígito errado | Corrigir CPF |
| VAL003 | Campo obrigatório | Campo requerido ausente | Incluir campo |
| VAL004 | Formato inválido | Valor fora do padrão esperado | Corrigir formato |
| VAL005 | Sistema não encontrado | idSistema inexistente | Verificar catálogo |
| VAL006 | Serviço não encontrado | idServico inexistente | Verificar catálogo |

### SITFIS (SIT)

| Código | Mensagem | Causa | Solução |
|--------|----------|-------|---------|
| SIT001 | Contribuinte não encontrado | CNPJ não cadastrado na RFB | Verificar CNPJ |
| SIT002 | Serviço indisponível | Manutenção RFB | Aguardar e tentar novamente |
| SIT003 | Protocolo não encontrado | Protocolo inexistente | Solicitar novo relatório |
| SIT004 | Relatório expirado | Prazo para emissão expirou | Solicitar novo relatório |
| SIT005 | Erro ao gerar relatório | Falha interna na geração | Tentar novamente |

### PGDAS-D (PGD)

| Código | Mensagem | Causa | Solução |
|--------|----------|-------|---------|
| PGD001 | Não optante pelo Simples | CNPJ não é do Simples Nacional | Verificar regime |
| PGD002 | Período não encontrado | PA não existe | Verificar período |
| PGD003 | DAS já emitido | Já existe DAS para o período | Consultar DAS existente |
| PGD004 | Valor zerado | Não há débito no período | Verificar apuração |

### DCTFWEB (DCT)

| Código | Mensagem | Causa | Solução |
|--------|----------|-------|---------|
| DCT001 | Declaração não encontrada | Não existe declaração | Criar declaração |
| DCT002 | Declaração já transmitida | Já foi transmitida | Consultar recibo |
| DCT003 | Período encerrado | Fora do prazo | Verificar calendário |
| DCT004 | Pendências impeditivas | Há pendências bloqueantes | Resolver pendências |

### Sistema (SYS)

| Código | Mensagem | Causa | Solução |
|--------|----------|-------|---------|
| SYS001 | Erro interno | Falha no gateway | Tentar novamente |
| SYS002 | Timeout | Tempo de resposta excedido | Tentar novamente |
| SYS003 | Serviço RFB offline | Sistemas RFB indisponíveis | Aguardar |
| SYS004 | Manutenção programada | Janela de manutenção | Verificar horário |

---

## Rate Limiting

Quando o rate limit é excedido, a resposta inclui headers informativos:

```http
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1703412345
Retry-After: 60
```

### Headers de Rate Limit

| Header | Descrição |
|--------|-----------|
| X-RateLimit-Limit | Limite de requisições por janela |
| X-RateLimit-Remaining | Requisições restantes |
| X-RateLimit-Reset | Timestamp Unix do reset |
| Retry-After | Segundos até poder tentar novamente |

### Estratégia de Retry

```typescript
async function requestWithRetry(
  fn: () => Promise<Response>,
  maxRetries = 3
): Promise<Response> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const response = await fn();
    
    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
      console.log(`Rate limited. Aguardando ${retryAfter}s...`);
      await sleep(retryAfter * 1000);
      continue;
    }
    
    if (response.status >= 500 && attempt < maxRetries) {
      const backoff = Math.pow(2, attempt) * 1000; // Exponential backoff
      console.log(`Erro ${response.status}. Retry em ${backoff}ms...`);
      await sleep(backoff);
      continue;
    }
    
    return response;
  }
  
  throw new Error('Máximo de tentativas excedido');
}
```

---

## Tratamento Recomendado

### Por Tipo de Erro

| Tipo | Ação |
|------|------|
| 4xx (exceto 429) | Corrigir requisição, não fazer retry automático |
| 429 | Aguardar Retry-After e tentar novamente |
| 500, 502, 503, 504 | Retry com backoff exponencial |

### Exemplo de Tratamento

```typescript
async function handleSerproResponse(response: Response) {
  if (response.ok) {
    return response.json();
  }
  
  const error = await response.json();
  
  switch (response.status) {
    case 401:
      // Token expirado - renovar e tentar novamente
      await invalidateToken();
      throw new AuthError('Token expirado', error);
      
    case 403:
      // Sem permissão - verificar procuração
      throw new ProcuracaoError('Acesso negado', error);
      
    case 429:
      // Rate limit - aguardar
      const retryAfter = response.headers.get('Retry-After');
      throw new RateLimitError(`Aguarde ${retryAfter}s`, error);
      
    case 500:
    case 502:
    case 503:
    case 504:
      // Erro servidor - retry com backoff
      throw new ServerError('Serviço indisponível', error);
      
    default:
      throw new ApiError('Erro desconhecido', error);
  }
}
```

---

## Logs e Monitoramento

### O que Registrar

1. **Requisições**: URL, método, timestamp
2. **Respostas**: Status, codigoStatus, tempo de resposta
3. **Erros**: codigoErro, mensagemErro, detalhes
4. **Rate Limiting**: Limites, remaining, resets

### Exemplo de Log

```json
{
  "timestamp": "2024-12-24T10:30:00Z",
  "level": "error",
  "service": "serpro-integra-contador",
  "operation": "SITFIS.solicitar",
  "cnpj": "12345678000190",
  "httpStatus": 403,
  "codigoStatus": "99",
  "codigoErro": "PRO001",
  "mensagem": "Procuração não encontrada",
  "latencyMs": 245
}
```

