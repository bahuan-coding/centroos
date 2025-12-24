# SERPRO Integra Contador - Documentação Oficial

> **Última atualização da documentação:** Dezembro 2024  
> **Fonte:** https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/

## 📋 Índice

1. [Visão Geral](./01-visao-geral.md) - Introdução à API e conceitos
2. [Autenticação](./02-autenticacao.md) - OAuth 2.0, mTLS e certificado digital
3. [Catálogo de Serviços](./03-catalogo-servicos.md) - Lista completa de serviços
4. [SITFIS - Situação Fiscal](./04-sitfis.md) - Consulta de situação fiscal
5. [Procurações Eletrônicas](./05-procuracoes.md) - Gestão de procurações e AUTENTICAPROCURADOR
6. [Códigos de Retorno](./06-codigos-retorno.md) - HTTP status e códigos de erro
7. [API Reference](./07-api-reference.md) - Endpoints, schemas e exemplos
8. [Ambientes e Testes](./08-ambientes-testes.md) - Configuração e troubleshooting

## 🎯 O que é o Integra Contador?

O Integra Contador é uma plataforma de serviços (APIs) do SERPRO voltada ao mercado contábil e fiscal, incluindo:

- Escritórios de contabilidade
- Empresas do ramo contábil
- Software-houses que prestam serviços a contribuintes

## 🔑 Pré-requisitos

1. **Contratação junto à loja SERPRO** (https://cliente.serpro.gov.br)
2. **Certificado digital e-CNPJ** (ICP-Brasil) - obrigatório para todas as requisições
3. **Consumer Key e Consumer Secret** - fornecidos após contratação
4. **Procuração eletrônica no e-CAC** - quando acessar dados de terceiros

## 🌐 URLs Principais

| Ambiente | URL |
|----------|-----|
| Autenticação | `https://autenticacao.sapi.serpro.gov.br/authenticate` |
| API Gateway (Produção) | `https://gateway.apiserpro.serpro.gov.br/integra-contador/v1` |
| Documentação | https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/ |
| Portal do Cliente | https://cliente.serpro.gov.br |

## 📊 Soluções Disponíveis

| Solução | Descrição | Código Procuração |
|---------|-----------|-------------------|
| **SITFIS** | Situação Fiscal do Contribuinte | 59 |
| **PGDASD** | Simples Nacional (DAS) | 45 |
| **DCTFWEB** | Declaração de Débitos e Créditos | 91 |
| **REGULARIZE** | Regularização de débitos PGFN | 92 |
| **PROCURACOES** | Gestão de procurações eletrônicas | - |
| **CPF** | Consulta de CPF | - |
| **CNPJ** | Consulta de CNPJ | - |
| **AUTENTICAPROCURADOR** | Autenticação via XML assinado | - |

## 🔄 Fluxo de Requisição

```
┌────────────────────┐
│ 1. AUTENTICAÇÃO    │
│ POST /authenticate │
│ + mTLS + Basic Auth│
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│ Recebe:            │
│ - access_token     │
│ - jwt_token        │
│ - expires_in       │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│ 2. REQUISIÇÃO API  │
│ POST /Consultar    │
│ + Bearer token     │
│ + jwt_token header │
│ + mTLS             │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│ Resposta com       │
│ dados fiscais      │
└────────────────────┘
```

## 📁 Implementação no Centroos

O código de integração está em:

| Arquivo | Descrição |
|---------|-----------|
| `server/integrations/serpro/auth.ts` | Cliente OAuth 2.0 |
| `server/integrations/serpro/mtls-client.ts` | Cliente mTLS com certificado |
| `server/integrations/serpro/sitfis-client.ts` | Cliente SITFIS |
| `server/integrations/serpro/types.ts` | Tipos TypeScript |
| `server/integrations/serpro/index.ts` | Exports públicos |
| `scripts/test-serpro-mtls.ts` | Script de teste |

## ⚠️ Avisos Importantes

1. **Certificado Digital Obrigatório**: Toda requisição à API requer certificado e-CNPJ ICP-Brasil
2. **Procuração Eletrônica**: Para acessar dados de terceiros, é necessário procuração cadastrada no e-CAC
3. **Rate Limiting**: Respeite os limites de requisição do SERPRO (60/min, 1000/hora, 10000/dia)
4. **Bilhetagem**: Requisições em `/Consultar`, `/Declarar`, `/Emitir` são bilhetadas (cobradas)
5. **Não Bilhetados**: `/Apoiar` e `/Monitorar` não são bilhetados

## 🔗 Links Úteis

- [API Center SERPRO](https://apicenter.estaleiro.serpro.gov.br/)
- [Documentação Integra Contador](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/)
- [Portal do Cliente SERPRO](https://cliente.serpro.gov.br/)
- [e-CAC - Procurações](https://cav.receita.fazenda.gov.br/)

---

**Importante:** Esta documentação foi extraída diretamente do portal oficial do SERPRO. Sempre verifique a documentação oficial para atualizações.
