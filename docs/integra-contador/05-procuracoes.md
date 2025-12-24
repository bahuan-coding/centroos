# Procurações Eletrônicas - Integra Contador

## Visão Geral

Para acessar dados fiscais de **terceiros** via Integra Contador, é necessária uma **procuração eletrônica** cadastrada no e-CAC (Centro Virtual de Atendimento ao Contribuinte da RFB).

A procuração eletrônica permite que um contador ou empresa de contabilidade acesse os sistemas da RFB em nome de seus clientes.

## Como Funciona

```
┌───────────────────┐      ┌───────────────────┐      ┌───────────────────┐
│   CONTRIBUINTE    │      │      e-CAC        │      │   INTEGRA         │
│   (Outorgante)    │      │                   │      │   CONTADOR        │
└─────────┬─────────┘      └─────────┬─────────┘      └─────────┬─────────┘
          │                          │                          │
          │  1. Cadastra procuração  │                          │
          │  com código do serviço   │                          │
          ├─────────────────────────►│                          │
          │                          │                          │
          │                          │◄─────────────────────────┤
          │                          │  2. Valida procuração    │
          │                          │                          │
          │                          ├─────────────────────────►│
          │                          │  3. Autoriza acesso      │
          │                          │                          │
```

## Códigos de Serviço por Procuração

Cada serviço do Integra Contador possui um código específico que deve ser incluído na procuração:

| Código | Serviço | Descrição |
|--------|---------|-----------|
| **45** | PGDAS-D | Simples Nacional - DAS |
| **59** | SITFIS | Situação Fiscal |
| **91** | DCTFWEB | Declaração Previdenciária |
| **92** | REGULARIZE | Regularização de Débitos PGFN |

## Cenários de Acesso

### Cenário 1: Consulta Própria

O CNPJ do certificado digital é o **mesmo** do contribuinte consultado.

```
Contratante:      63552022000184 (Paycubed)
Autor do Pedido:  63552022000184 (Paycubed)
Contribuinte:     63552022000184 (Paycubed) ← MESMO CNPJ

Procuração: NÃO NECESSÁRIA
```

### Cenário 2: Contador para Cliente

O contador (procurador) consulta dados de seu cliente (outorgante).

```
Contratante:      12345678000199 (Escritório Contábil)
Autor do Pedido:  12345678000199 (Escritório Contábil)
Contribuinte:     98765432000111 (Cliente)

Procuração: OBRIGATÓRIA (cadastrada pelo cliente no e-CAC)
```

### Cenário 3: Software-house em Nome de Contador

A software-house não tem procuração direta, mas atua em nome do contador.

```
Contratante:      63552022000184 (Paycubed - Software-house)
Autor do Pedido:  12345678000199 (Escritório Contábil - Procurador)
Contribuinte:     98765432000111 (Cliente)

Procuração: OBRIGATÓRIA + AUTENTICAPROCURADOR
```

Neste cenário, é necessário usar o serviço `AUTENTICAPROCURADOR` com XML assinado.

## Cadastro de Procuração no e-CAC

### Passo a Passo

1. O **contribuinte** (outorgante) acessa o e-CAC com certificado digital
2. Navega para: Serviços > Procuração Eletrônica
3. Seleciona "Cadastrar/Consultar Procuração"
4. Informa o CNPJ do **procurador** (contador)
5. Seleciona os **códigos de serviço** a autorizar (ex: 45, 59, 91)
6. Define a **validade** da procuração
7. Confirma com assinatura digital

### Prazo de Validade

| Tipo | Prazo Máximo |
|------|--------------|
| Procuração específica | Até 5 anos |
| Procuração geral | Até 5 anos |

## AUTENTICAPROCURADOR

Para software-houses que atuam em nome de procuradores (contadores), o SERPRO oferece o serviço `AUTENTICAPROCURADOR`.

### Fluxo

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  SOFTWARE-HOUSE │     │    CONTADOR     │     │     SERPRO      │
│   (Paycubed)    │     │  (Procurador)   │     │                 │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         │  1. Solicita XML      │                       │
         ├──────────────────────►│                       │
         │                       │                       │
         │  2. Contador assina   │                       │
         │     XML com cert.     │                       │
         │◄──────────────────────┤                       │
         │                       │                       │
         │  3. Envia XML assinado                        │
         ├──────────────────────────────────────────────►│
         │                       │                       │
         │  4. Retorna token de procurador               │
         │◄──────────────────────────────────────────────┤
         │                       │                       │
         │  5. Usa token nas     │                       │
         │     requisições       │                       │
         ├──────────────────────────────────────────────►│
```

### Serviço AUTENTICAPROCURADOR

| Campo | Valor |
|-------|-------|
| idSistema | `AUTENTICAPROCURADOR` |
| idServico | `ENVIOXMLASSINADO81` |

### Request

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
    "numero": "63552022000184",
    "tipo": 2
  },
  "pedidoDados": {
    "idSistema": "AUTENTICAPROCURADOR",
    "idServico": "ENVIOXMLASSINADO81",
    "versaoSistema": "1.0",
    "dados": "{ \"xmlAssinado\": \"<xml>...</xml>\" }"
  }
}
```

### Response

```json
{
  "dadosResposta": {
    "codigoStatus": "00",
    "mensagem": "Autenticação realizada com sucesso"
  },
  "resposta": {
    "autenticar_procurador_token": "eyJhbGciOiJIUzI1NiIsInR5..."
  }
}
```

### Uso do Token

O token retornado deve ser enviado nas requisições subsequentes:

```http
POST /Consultar
Authorization: Bearer {access_token}
jwt_token: {jwt_token}
autenticar_procurador_token: {token_procurador}
```

## Consulta de Procurações

O Integra Contador permite consultar procurações recebidas:

### Request

```json
{
  "contratante": {"numero": "12345678000199", "tipo": 2},
  "autorPedidoDados": {"numero": "12345678000199", "tipo": 2},
  "contribuinte": {"numero": "12345678000199", "tipo": 2},
  "pedidoDados": {
    "idSistema": "PROCURACOES",
    "idServico": "CONSULTARPROCURACOES",
    "versaoSistema": "1.0",
    "dados": "{}"
  }
}
```

### Response

```json
{
  "resposta": {
    "procuracoes": [
      {
        "outorgante": {
          "numero": "98765432000111",
          "nome": "EMPRESA CLIENTE LTDA"
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

## Erros Comuns

| Código | Mensagem | Causa | Solução |
|--------|----------|-------|---------|
| PRO001 | Procuração não encontrada | Não existe procuração cadastrada | Contribuinte deve cadastrar no e-CAC |
| PRO002 | Procuração expirada | Prazo de validade vencido | Renovar procuração |
| PRO003 | Serviço não autorizado | Código do serviço não incluído | Adicionar código na procuração |
| PRO004 | Procurador inválido | CNPJ do procurador incorreto | Verificar dados da procuração |

## Boas Práticas

1. **Verificar procuração antes da operação**
   - Consulte `CONSULTARPROCURACOES` antes de acessar dados de terceiros

2. **Monitorar vencimentos**
   - Implemente alertas para procurações próximas do vencimento

3. **Solicitar códigos necessários**
   - Oriente clientes a incluir todos os códigos de serviço necessários

4. **Documentar autorizações**
   - Mantenha registro das procurações e autorizações

## Links Úteis

- [e-CAC - Centro Virtual de Atendimento](https://cav.receita.fazenda.gov.br/)
- [Manual de Procuração Eletrônica](https://www.gov.br/receitafederal/pt-br/servicos/procuracao-eletronica)

