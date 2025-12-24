# Integrações Fiscais - RFB e Ecosistemas Correlatos

## Visão Geral

Este documento descreve as integrações fiscais disponíveis para empresas privadas brasileiras, focando em:

1. **Receita Federal do Brasil (RFB)** - Consultas cadastrais e obrigações
2. **SEFAZ/Portal NF-e** - Emissão de Nota Fiscal Eletrônica (produtos)
3. **NFS-e Nacional/Municipal** - Emissão de Nota Fiscal de Serviços

O objetivo é mapear todas as APIs e serviços oficiais que permitem automação fiscal/contábil para o sistema CentrOS/Paycubed.

---

## Público-Alvo

- **Desenvolvedores** implementando integrações fiscais
- **Arquitetos** definindo a estrutura do módulo fiscal
- **Gestores** entendendo o escopo e complexidade das integrações

---

## Estrutura da Documentação

### Documentos Base

| Arquivo | Conteúdo |
|---------|----------|
| [01-panorama-rfb-e-autenticacao-icp.md](01-panorama-rfb-e-autenticacao-icp.md) | ICP-Brasil, certificados digitais, e-CNPJ, procurações e-CAC |
| [02-catalogo-apis-e-servicos.md](02-catalogo-apis-e-servicos.md) | Matriz completa de integrações com links oficiais |
| [03-emissao-notas-rfb-vs-sefaz-vs-municipio.md](03-emissao-notas-rfb-vs-sefaz-vs-municipio.md) | Responsabilidades e fluxos de NF-e, NFS-e e NFC-e |
| [04-plano-implementacao-por-ondas.md](04-plano-implementacao-por-ondas.md) | Roadmap P0/P1/P2 com critérios de aceite |
| [05-riscos-conformidade-lgpd-sigilo.md](05-riscos-conformidade-lgpd-sigilo.md) | LGPD, sigilo fiscal, auditoria e retenção de dados |
| [06-checklist-homologacao-e-testes.md](06-checklist-homologacao-e-testes.md) | Como testar integrações sem produção |

### Templates e Especificações

| Arquivo | Conteúdo |
|---------|----------|
| [TEMPLATE-INTEGRACAO.md](TEMPLATE-INTEGRACAO.md) | **Template universal** para documentar novas integrações |
| [SPEC-NFSE-NACIONAL.md](SPEC-NFSE-NACIONAL.md) | **Especificação completa** da integração piloto NFS-e Nacional |

### Documentos Relacionados

| Arquivo | Conteúdo |
|---------|----------|
| [../architecture/menu-structure.md](../architecture/menu-structure.md) | Nova estrutura do menu com seção Integrações (futuro) |

---

## Resumo das Integrações por Prioridade

### CONCLUÍDAS ✅

| Integração | Órgão | Status | Observação |
|------------|-------|--------|------------|
| **NFS-e Paulistana (SP)** | Prefeitura SP | ✅ Produção | Emissão, consulta, cancelamento funcionando |

### P0 - Próximas

| Integração | Órgão | Tipo | Aplicabilidade |
|------------|-------|------|----------------|
| **Consulta CNPJ** | Serpro | Comercial | Validação de clientes/fornecedores |

### P1 - Importantes

| Integração | Órgão | Tipo | Aplicabilidade |
|------------|-------|------|----------------|
| **NF-e (SEFAZ)** | Portal NF-e | Oficial | Venda de produtos (se aplicável) |
| **Consulta CPF** | Serpro | Comercial | Validação de pessoas físicas |

### ADIADAS 🔄

| Integração | Órgão | Motivo | Backend |
|------------|-------|--------|---------|
| **NFS-e Nacional** | RFB/Prefeituras | SP não aderiu ao sistema nacional | ✅ Pronto (server/integrations/fiscal/nfse-nacional.ts) |

### P2 - Expansão

| Integração | Órgão | Tipo | Aplicabilidade |
|------------|-------|------|----------------|
| **SPED** | RFB | Oficial/Restrito | Escrituração fiscal digital |
| **e-Social** | RFB | Oficial | Obrigações trabalhistas |
| **Reforma Tributária** | RFB | Futuro (2026+) | CBS/IBS |

---

## Classificação das Integrações

### Tipo A - Oficial e Acessível
APIs/Web Services fornecidos por órgãos governamentais, acessíveis diretamente por empresas privadas mediante credenciamento e certificado digital.

### Tipo B - Oficial porém Restrito
Integrações governamentais que requerem convênios específicos, credenciamento especial ou são limitadas a determinados perfis (governo-para-governo).

### Tipo C - Comercial
Serviços oferecidos por empresas públicas ou privadas (ex: Serpro) mediante contrato comercial e pagamento por uso.

### Tipo D - Não-API
Sistemas que não possuem API disponível para automação, exigindo acesso manual via portal web.

---

## Regras de Ouro

1. **Sem Scraping** - Nunca automatizar portais sem API oficial (risco legal)
2. **Secrets Seguros** - Certificados e senhas nunca no repositório
3. **Homologação Primeiro** - Testar em ambiente de homologação antes de produção
4. **Auditoria Completa** - Registrar todas as operações fiscais
5. **XML Arquivado** - Armazenar XMLs assinados por 5 anos mínimo

---

## Pré-requisitos Gerais

### Certificado Digital ICP-Brasil

Para qualquer integração fiscal, é necessário:

- **Certificado e-CNPJ A1** (arquivo .pfx) - Recomendado para automação
- **Certificado e-CNPJ A3** (token/smartcard) - Requer driver específico

### Credenciamento

Dependendo da integração:

- **Portal NF-e**: Credenciamento na SEFAZ do estado
- **NFS-e Nacional**: Cadastro no Ambiente de Dados Nacional
- **Serpro**: Contrato comercial

---

## Arquitetura de Referência

```
server/
└── integrations/
    └── fiscal/
        ├── certificates/        # Gestão de certificados
        ├── nfe/                 # Módulo NF-e (SEFAZ)
        ├── nfse/                # Módulo NFS-e (Nacional/SP)
        ├── serpro/              # Consultas via Serpro
        ├── storage/             # Armazenamento de XMLs
        └── queue/               # Fila de eventos fiscais
```

---

## Links Oficiais

| Recurso | URL |
|---------|-----|
| Portal NF-e | https://www.nfe.fazenda.gov.br |
| NFS-e Nacional | https://www.gov.br/nfse |
| Serpro APIs | https://servicos.serpro.gov.br |
| Receita Federal | https://www.gov.br/receitafederal |
| ITI (Certificação) | https://www.gov.br/iti |

---

## Próximos Passos

### Para Entender o Contexto
1. Ler [01-panorama-rfb-e-autenticacao-icp.md](01-panorama-rfb-e-autenticacao-icp.md) para entender certificação digital
2. Consultar [02-catalogo-apis-e-servicos.md](02-catalogo-apis-e-servicos.md) para detalhes técnicos
3. Seguir [04-plano-implementacao-por-ondas.md](04-plano-implementacao-por-ondas.md) para roadmap

### Para Implementar uma Nova Integração
1. Copiar [TEMPLATE-INTEGRACAO.md](TEMPLATE-INTEGRACAO.md) para `SPEC-[NOME].md`
2. Preencher todas as seções obrigatórias
3. Usar [SPEC-NFSE-NACIONAL.md](SPEC-NFSE-NACIONAL.md) como referência

### Para a Primeira Integração (NFS-e Nacional)
1. Revisar [SPEC-NFSE-NACIONAL.md](SPEC-NFSE-NACIONAL.md) - especificação completa
2. Verificar [06-checklist-homologacao-e-testes.md](06-checklist-homologacao-e-testes.md) antes de produção

---

## Status das Integrações

| Integração | Status | Especificação |
|------------|--------|---------------|
| **NFS-e Paulistana (SP)** | ✅ Produção | [../nfse-sp/](../nfse-sp/) |
| **NFS-e Nacional** | 🔄 Adiada | [SPEC-NFSE-NACIONAL.md](SPEC-NFSE-NACIONAL.md) - Backend pronto |
| Consulta CNPJ (Serpro) | ⏳ Próximo | - |
| NF-e SEFAZ | ⏳ Aguardando | - |

---

**Última atualização:** Dezembro 2024  
**Autor:** Arquiteto de Integrações Fiscais

