# Catálogo de Serviços - Integra Contador

## Visão Geral

O Integra Contador oferece acesso a diversos sistemas da Receita Federal via API. Cada serviço possui:
- **idSistema**: Identificador do sistema de origem
- **idServico**: Identificador do serviço específico
- Requisitos de **procuração eletrônica** para acesso em nome de terceiros

## Serviços Disponíveis

### SITFIS - Situação Fiscal

Sistema para consulta da situação fiscal do contribuinte.

| Campo | Valor |
|-------|-------|
| idSistema | `SITFIS` |
| Procuração Obrigatória | Sim (código: 59) |
| Descrição | Relatório de Situação Fiscal |

#### Serviços SITFIS

| idServico | Operação | Descrição |
|-----------|----------|-----------|
| `SOLICITARSITFIS81` | Solicitar | Inicia solicitação do relatório |
| `EMITIRSITFIS81` | Emitir | Recupera o relatório em PDF |

---

### PGDAS-D - Simples Nacional

Sistema de cálculo e geração do DAS (Documento de Arrecadação do Simples Nacional).

| Campo | Valor |
|-------|-------|
| idSistema | `PGDASD` |
| Procuração Obrigatória | Sim (código: 45) |
| Descrição | Programa Gerador do DAS |

#### Serviços PGDAS-D

| idServico | Operação | Descrição |
|-----------|----------|-----------|
| `CONSEXTRATO16` | Consultar | Consulta extrato do DAS |
| `CONSEVENTO23` | Consultar | Consulta eventos |
| `CONSPENDENCIA25` | Consultar | Consulta pendências |
| `CONSPA15` | Consultar | Consulta período de apuração |
| `GERADAS24` | Gerar | Gera novo DAS |
| `REGDAS17` | Registrar | Registra DAS gerado |

---

### DCTFWEB - Declaração de Débitos e Créditos Tributários Federais

Sistema de declaração previdenciária.

| Campo | Valor |
|-------|-------|
| idSistema | `DCTFWEB` |
| Procuração Obrigatória | Sim (código: 91) |
| Descrição | DCTFWeb Previdenciária |

#### Serviços DCTFWEB

| idServico | Operação | Descrição |
|-----------|----------|-----------|
| `CONSULTADECLARACAO95` | Consultar | Consulta declaração existente |
| `CONSULTADARF99` | Consultar | Consulta DARF gerado |
| `TRANSMITIRDECLARACAO97` | Transmitir | Transmite declaração |
| `GERARDARF98` | Gerar | Gera DARF para pagamento |

---

### REGULARIZE - Regularização de Débitos

Sistema de regularização de débitos junto à PGFN.

| Campo | Valor |
|-------|-------|
| idSistema | `REGULARIZE` |
| Procuração Obrigatória | Sim (código: 92) |
| Descrição | Regularização de débitos PGFN |

#### Serviços REGULARIZE

| idServico | Operação | Descrição |
|-----------|----------|-----------|
| `CONSULTADEBITOS` | Consultar | Consulta débitos existentes |
| `NEGOCIARDEBITO` | Negociar | Inicia negociação |
| `CONSULTAPARCELA` | Consultar | Consulta parcelas |

---

### PROCURACOES - Gestão de Procurações

Sistema para consulta de procurações eletrônicas (e-CAC).

| Campo | Valor |
|-------|-------|
| idSistema | `PROCURACOES` |
| Procuração Obrigatória | Não (consulta própria) |
| Descrição | Gestão de procurações |

#### Serviços PROCURACOES

| idServico | Operação | Descrição |
|-----------|----------|-----------|
| `CONSULTARPROCURACOES` | Consultar | Lista procurações recebidas |
| `CONSULTAROTORGANTES` | Consultar | Lista outorgantes |
| `CONSULTARPROCURADOR` | Consultar | Consulta dados do procurador |

---

### CPF - Consulta de CPF

Sistema de consulta de dados do CPF.

| Campo | Valor |
|-------|-------|
| idSistema | `CPF` |
| Procuração Obrigatória | Conforme tipo de consulta |
| Descrição | Cadastro de Pessoas Físicas |

#### Serviços CPF

| idServico | Operação | Descrição |
|-----------|----------|-----------|
| `CONSULTACPF` | Consultar | Consulta situação do CPF |

---

### CNPJ - Consulta de CNPJ

Sistema de consulta de dados do CNPJ.

| Campo | Valor |
|-------|-------|
| idSistema | `CNPJ` |
| Procuração Obrigatória | Conforme tipo de consulta |
| Descrição | Cadastro Nacional de Pessoas Jurídicas |

#### Serviços CNPJ

| idServico | Operação | Descrição |
|-----------|----------|-----------|
| `CONSULTACNPJ` | Consultar | Consulta situação do CNPJ |
| `CONSULTAQSA` | Consultar | Consulta quadro societário |

---

### AUTENTICAPROCURADOR - Autenticação de Procurador

Serviço auxiliar para software-houses que atuam em nome de procuradores.

| Campo | Valor |
|-------|-------|
| idSistema | `AUTENTICAPROCURADOR` |
| Procuração Obrigatória | Não |
| Descrição | Autenticação via XML assinado |

#### Serviços AUTENTICAPROCURADOR

| idServico | Operação | Descrição |
|-----------|----------|-----------|
| `ENVIOXMLASSINADO81` | Enviar | Envia XML assinado pelo procurador |

---

## Estrutura da Requisição

Todas as requisições seguem o padrão:

```json
{
  "contratante": {
    "numero": "00000000000000",
    "tipo": 2
  },
  "autorPedidoDados": {
    "numero": "00000000000000",
    "tipo": 2
  },
  "contribuinte": {
    "numero": "00000000000000",
    "tipo": 2
  },
  "pedidoDados": {
    "idSistema": "SISTEMA",
    "idServico": "SERVICO",
    "versaoSistema": "1.0",
    "dados": "{ ... }"
  }
}
```

### Tipos de Identificador

| Tipo | Descrição |
|------|-----------|
| 1 | CPF (11 dígitos) |
| 2 | CNPJ (14 dígitos) |

## Limites de Requisição

O SERPRO aplica rate limiting para proteger os serviços:

| Tipo | Limite |
|------|--------|
| Por minuto | 60 requisições |
| Por hora | 1000 requisições |
| Por dia | 10000 requisições |

> ⚠️ **IMPORTANTE:** Exceder os limites resulta em bloqueio temporário (HTTP 429).

## Observações

1. **Certificado Digital**: Todas as requisições exigem certificado e-CNPJ ICP-Brasil
2. **Procuração**: Para acessar dados de terceiros, é necessária procuração eletrônica no e-CAC
3. **Ambientes**: Produção e Homologação possuem URLs diferentes
4. **Horário**: Alguns serviços possuem janela de manutenção (consulte disponibilidade)

