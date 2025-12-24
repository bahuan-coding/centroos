# Integra Contador - Deploy Checklist

## Variáveis de Ambiente (Netlify)

```env
# SERPRO - Integra Contador
SERPRO_CONSUMER_KEY=hn19_Qt0XfUS5XWnt65MlW_CAjYa
SERPRO_CONSUMER_SECRET=35kFUZN2pISbD8IaXEDxFoGFK8ka
SERPRO_ENVIRONMENT=production  # ou homologacao
SERPRO_USE_MTLS=true

# Feature Flag
INTEGRA_CONTADOR_ENABLED=false  # Iniciar desabilitado, habilitar após validação

# Paycubed
PAYCUBED_CNPJ=63552022000184
```

## Arquivos da Implementação

### Backend

| Arquivo | Descrição |
|---------|-----------|
| `server/integrations/serpro/auth.ts` | Cliente OAuth 2.0 com jwt_token |
| `server/integrations/serpro/mtls-client.ts` | Cliente mTLS com certificado |
| `server/integrations/serpro/consultar-client.ts` | Cliente unificado /Consultar |
| `server/integrations/serpro/error-normalizer.ts` | Normalização de erros |
| `server/integrations/serpro/sitfis-service.ts` | Serviço SITFIS com polling |
| `server/integrations/serpro/procuracoes-service.ts` | Serviço de procurações |
| `server/integrations/serpro/router.ts` | Router tRPC |
| `server/integrations/serpro/types.ts` | Tipos TypeScript |

### Frontend

| Arquivo | Descrição |
|---------|-----------|
| `client/src/pages/IntegraContador.tsx` | Página principal |
| `client/src/components/integra-contador/ConfigTab.tsx` | Configuração |
| `client/src/components/integra-contador/ProcuracoesTab.tsx` | Procurações |
| `client/src/components/integra-contador/SitfisTab.tsx` | SITFIS |
| `client/src/components/integra-contador/ConsoleTab.tsx` | Console dev |

### Testes

| Arquivo | Descrição |
|---------|-----------|
| `server/integrations/serpro/__tests__/error-normalizer.test.ts` | Testes unitários |
| `server/integrations/serpro/__tests__/consultar-client.test.ts` | Testes cliente |
| `server/integrations/serpro/__tests__/integration.test.ts` | Testes integração |

## Pré-requisitos para Ativação

- [ ] Variáveis de ambiente configuradas no Netlify
- [ ] Certificado digital e-CNPJ configurado (Configurações > Certificado)
- [ ] Contrato ativo com SERPRO (validar via Portal do Cliente)
- [ ] Teste de conexão bem-sucedido na aba Configuração
- [ ] `INTEGRA_CONTADOR_ENABLED=true`

## Rollout Gradual

1. **Fase 1**: Deploy com `INTEGRA_CONTADOR_ENABLED=false`
2. **Fase 2**: Habilitar e testar com admin
3. **Fase 3**: `INTEGRA_CONTADOR_ENABLED=true` para todos

## Comandos de Teste

```bash
# Unit tests
npm run test -- server/integrations/serpro

# Integration tests
npm run test -- --grep "serpro"
```

## Troubleshooting

### Erro 401 - Token inválido
- Verificar Consumer Key e Secret
- Verificar se certificado está carregado
- Limpar cache na aba Configuração

### Erro 403 - Procuração não encontrada
- Verificar se existe procuração no e-CAC
- Verificar código do serviço na procuração (59 para SITFIS)
- Verificar validade da procuração

### Erro 429 - Rate limit
- Aguardar tempo do Retry-After
- Reduzir frequência de requisições

### Certificado não carregado
- Verificar configuração em Configurações > Certificado Digital
- Verificar se certificado está válido (não expirado)
- Verificar formato PFX e senha

