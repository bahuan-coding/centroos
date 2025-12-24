# Visão Geral - Integra Contador

## O que é o Integra Contador?

O Integra Contador é uma plataforma que disponibiliza serviços voltados ao mercado contábil e fiscal, incluindo escritórios de contabilidade e demais empresas do ramo contábil, otimizando a prestação de serviços aos contribuintes.

## Como funciona?

O Integra Contador é uma plataforma de serviços (APIs), disponibilizada aos clientes que obtiverem credenciais de acesso, mediante contratação junto à loja SERPRO, utilizando certificado digital e-CNPJ.

### Fluxo Básico

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Contratação    │     │  Autenticação   │     │   Consumo API   │
│  Loja SERPRO    │ ──► │  OAuth + mTLS   │ ──► │   Serviços      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Modelos de Acesso

#### 1. Acesso Direto (Próprio Contribuinte)
O contratante acessa seus próprios dados fiscais usando seu certificado e-CNPJ.

```
Contratante ──[certificado próprio]──► SERPRO
```

#### 2. Acesso com Procuração (Terceiros)
O contratante (escritório de contabilidade) acessa dados de seus clientes mediante procuração eletrônica cadastrada no e-CAC.

```
Escritório ──[procuração e-CAC]──► SERPRO ──► Dados do Cliente
```

#### 3. AUTENTICAPROCURADOR (Software-house)
Software-houses que não possuem procuração do contribuinte, mas atuam em nome de um procurador (escritório), devem enviar um XML assinado digitalmente pelo certificado do procurador.

```
Software-house ──[XML assinado pelo escritório]──► SERPRO ──► Dados do Cliente
```

## Tipos de Serviço

| Tipo | Endpoint | Descrição | Bilhetado |
|------|----------|-----------|-----------|
| **Apoiar** | `/Apoiar` | Serviços auxiliares de suporte | ❌ Não |
| **Consultar** | `/Consultar` | Consultas de dados | ✅ Sim |
| **Declarar** | `/Declarar` | Transmissão de declarações | ✅ Sim |
| **Emitir** | `/Emitir` | Geração de documentos/guias | ✅ Sim |
| **Monitorar** | `/Monitorar` | Monitoração de eventos | ❌ Não |

## Requisitos de Contratação

1. Acesse https://cliente.serpro.gov.br
2. Contrate o produto "Integra Contador"
3. Receba o Consumer Key e Consumer Secret
4. Configure seu certificado e-CNPJ para autenticação mTLS

## Procuração Eletrônica

Para serviços que necessitam de procuração digital do contribuinte:

1. Acesse o Portal e-CAC
2. Cadastre a procuração eletrônica para o serviço específico
3. A permissão deve estar ativa no momento da requisição

Se a procuração não existir, o sistema retornará erro 403 (Forbidden).

### Códigos de Procuração Comuns

| Código | Nome do Serviço |
|--------|-----------------|
| 00002 | Situação Fiscal do Contribuinte |
| 00060 | Simples Nacional - Opção pelo Regime de Apuração de Receitas |
| 00146 | PGDAS-D - a partir de 01/2018 |

## Referências

- **Documentação Oficial:** https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/
- **Portal do Cliente:** https://cliente.serpro.gov.br
- **Cadastrar Procuração:** https://www.gov.br/pt-br/servicos/cadastrar-ou-cancelar-procuracao-para-acesso-ao-e-cac

