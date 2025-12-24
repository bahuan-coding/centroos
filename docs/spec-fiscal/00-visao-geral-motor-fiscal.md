# Motor Fiscal - Visao Geral

> Versao: 1.0.0 | Data: 2025-12-24
> Status: SPEC FINAL - Pronto para implementacao

---

## 1. O que e o Motor Fiscal

O **Motor Fiscal** e o modulo core do CentrOS responsavel por:
- Emissao de documentos fiscais eletronicos (DF-e)
- Consulta e validacao de documentos emitidos
- Gestao de eventos fiscais (cancelamento, substituicao, manifestacao)
- Garantia de consistencia e auditabilidade fiscal

### 1.1 Principios Arquiteturais

| Principio | Descricao |
|-----------|-----------|
| **Unificado** | API unica para todos os tipos de documento fiscal |
| **Deterministico** | Regras de decisao sem ambiguidade |
| **Idempotente** | Operacoes seguras para retry |
| **Auditavel** | 100% rastreavel por 5 anos minimo |
| **Resiliente** | Tratamento padronizado de erros e contingencia |

---

## 2. Documentos Fiscais Suportados

| Modelo | Nome | Sigla | Ambito | Status |
|--------|------|-------|--------|--------|
| - | NFS-e Municipal | NFS-e SP | Municipal (SP) | Producao |
| - | NFS-e Nacional | NFS-e ADN | Nacional (convenio) | Documentado |
| 55 | NF-e | NF-e | Estadual (SEFAZ) | Documentado |
| 65 | NFC-e | NFC-e | Estadual (SEFAZ) | Documentado |

### 2.1 NFS-e Municipal (SP)

- **Escopo**: Servicos prestados em Sao Paulo capital
- **Autoridade**: Prefeitura de SP
- **Protocolo**: SOAP + mTLS
- **Identificador**: Numero + Codigo Verificacao
- **Eventos**: Cancelamento

### 2.2 NFS-e Nacional (ADN)

- **Escopo**: Servicos em municipios conveniados ao SN NFS-e
- **Autoridade**: SEFIN Nacional + ADN
- **Protocolo**: REST + mTLS
- **Identificador**: chaveAcesso (44-50 caracteres)
- **Eventos**: Cancelamento, Substituicao, Manifestacao, Bloqueio

### 2.3 NF-e (Modelo 55)

- **Escopo**: Operacoes com mercadorias (vendas B2B, transferencias, devolucoes)
- **Autoridade**: SEFAZ Estadual + SVRS/SVAN
- **Protocolo**: SOAP + mTLS
- **Identificador**: chaveAcesso (44 digitos)
- **Eventos**: Cancelamento, CCe, Manifestacao Destinatario, EPEC, Comprovante Entrega

### 2.4 NFC-e (Modelo 65)

- **Escopo**: Vendas ao consumidor final (varejo)
- **Autoridade**: SEFAZ Estadual
- **Protocolo**: SOAP + mTLS
- **Identificador**: chaveAcesso (44 digitos)
- **Eventos**: Cancelamento, Cancelamento por Substituicao, EPEC (offline)

---

## 3. Responsabilidades do Motor Fiscal

### 3.1 DENTRO do Escopo

| Responsabilidade | Descricao |
|------------------|-----------|
| Decisao de roteamento | Determinar qual documento emitir |
| Montagem de payload | Construir XML/JSON canonico |
| Assinatura digital | Assinar com certificado ICP-Brasil |
| Transmissao | Enviar para autoridade competente |
| Validacao de resposta | Interpretar retorno e atualizar estado |
| Gestao de eventos | Cancelamento, substituicao, etc |
| Idempotencia | Garantir nao-duplicidade |
| Auditoria | Registrar todas as operacoes |
| Retry seguro | Reprocessar com verificacao |

### 3.2 FORA do Escopo

| Funcionalidade | Responsavel |
|----------------|-------------|
| Gestao de certificados | Modulo `certificates.ts` |
| Regras de negocio (precos, estoque) | Camada de aplicacao |
| Interface do usuario | Frontend |
| Geracao de relatorios | Modulo de relatorios |
| Armazenamento de XMLs | Camada de persistencia |
| Integracao contabil | Modulo contabil |
| Envio de emails | Modulo de notificacao |

---

## 4. Arquitetura de Alto Nivel

```
+------------------+
|   Aplicacao      |
+--------+---------+
         |
         v
+--------+---------+
|  MOTOR FISCAL    |
|                  |
|  +------------+  |
|  | Decisor    |  |  <- Qual documento emitir?
|  +-----+------+  |
|        |         |
|  +-----v------+  |
|  | Emissao    |  |  <- Monta, assina, transmite
|  +-----+------+  |
|        |         |
|  +-----v------+  |
|  | Eventos    |  |  <- Cancelamento, etc
|  +-----+------+  |
|        |         |
|  +-----v------+  |
|  | Consulta   |  |  <- Situacao, XML, DANFE
|  +------------+  |
+--------+---------+
         |
         v
+--------+---------+     +------------------+
| Integradores     |     | Autoridades      |
|                  |     |                  |
| - nfse-sp.ts     | --> | Prefeitura SP    |
| - nfse-nacional  | --> | SEFIN/ADN        |
| - nfe.ts         | --> | SEFAZ Estadual   |
| - nfce.ts        | --> | SEFAZ Estadual   |
+------------------+     +------------------+
```

---

## 5. Fluxo de Vida de um Documento

```
                    +---------------+
                    |   RASCUNHO    |
                    | (dados locais)|
                    +-------+-------+
                            |
                            v
                    +-------+-------+
                    |   VALIDADO    |
                    | (schema OK)   |
                    +-------+-------+
                            |
                            v
                    +-------+-------+
                    |  TRANSMITIDO  |
                    | (enviado)     |
                    +-------+-------+
                            |
           +----------------+----------------+
           |                                 |
           v                                 v
   +-------+-------+                 +-------+-------+
   |  AUTORIZADO   |                 |   REJEITADO   |
   | (valido)      |                 | (corrigir)    |
   +-------+-------+                 +---------------+
           |
           +------------+------------+
           |            |            |
           v            v            v
   +-------+----+ +-----+------+ +---+--------+
   |  CANCELADO | | SUBSTITUIDO| | (eventos)  |
   +------------+ +------------+ +------------+
```

---

## 6. Mapeamento de Campos entre Modelos

### 6.1 Identificadores

| Campo Interno | NFS-e SP | NFS-e Nacional | NF-e | NFC-e |
|---------------|----------|----------------|------|-------|
| `id` | NumeroNFe + CodigoVerificacao | chaveAcesso | chaveAcesso | chaveAcesso |
| `numero` | NumeroNFe | nNFSe | nNF | nNF |
| `serie` | - | serie | serie | serie |
| `modelo` | - | - | 55 | 65 |

### 6.2 Partes

| Campo Interno | NFS-e SP | NFS-e Nacional | NF-e/NFC-e |
|---------------|----------|----------------|------------|
| `emitente.cpfCnpj` | CPFCNPJRemetente | prest/CNPJ | emit/CNPJ |
| `emitente.inscricaoMunicipal` | InscricaoPrestador | prest/IM | emit/IM |
| `destinatario.cpfCnpj` | CPFCNPJTomador | toma/CNPJ | dest/CNPJ |
| `destinatario.razaoSocial` | RazaoSocialTomador | toma/xNome | dest/xNome |

---

## 7. Dependencias Tecnicas

### 7.1 Obrigatorias

| Dependencia | Uso | Status |
|-------------|-----|--------|
| Certificado ICP-Brasil (A1/A3) | Assinatura digital | Obrigatorio |
| node-forge | Manipulacao de certificados | Instalado |
| xml2js | Parse/build XML | Instalado |
| node-fetch / https | Requisicoes HTTP | Nativo |

### 7.2 Por Tipo de Documento

| Documento | Protocolo | Dependencia Adicional |
|-----------|-----------|----------------------|
| NFS-e SP | SOAP | XMLDSig proprio |
| NFS-e ADN | REST+JSON | - |
| NF-e | SOAP | XMLDSig, C14N |
| NFC-e | SOAP | XMLDSig, C14N, QRCode |

---

## 8. Ambientes

| Ambiente | NFS-e SP | NFS-e ADN | NF-e/NFC-e |
|----------|----------|-----------|------------|
| Producao | nfews.prefeitura.sp.gov.br | adn.nfse.gov.br | Varia por UF |
| Homologacao | - (nao existe) | adn.producaorestrita.nfse.gov.br | Varia por UF |

---

## 9. Referencias Internas

| Documento | Conteudo |
|-----------|----------|
| `01-decisor-fiscal.md` | Logica de roteamento |
| `02-maquina-de-estados-unificada.md` | Estados e transicoes |
| `03-contratos-canonicos.md` | Tipos e mapeamentos |
| `04-idempotencia-e-consistencia.md` | Estrategias de retry |
| `05-erros-e-tratamento.md` | Catalogo de erros |
| `06-observabilidade-e-auditoria.md` | Logs e metricas |
| `07-plano-implementacao.md` | Ordem de execucao |

---

## 10. Glossario Unificado

| Termo | Significado |
|-------|-------------|
| **DF-e** | Documento Fiscal Eletronico (generico) |
| **DPS** | Declaracao de Prestacao de Servico (NFS-e ADN) |
| **RPS** | Recibo Provisorio de Servico (NFS-e SP) |
| **chaveAcesso** | Identificador unico de 44+ digitos |
| **mTLS** | Mutual TLS (autenticacao bidirecional) |
| **DANFE** | Documento Auxiliar da NF-e (PDF) |
| **DANFSe** | Documento Auxiliar da NFS-e (PDF) |
| **SEFAZ** | Secretaria da Fazenda Estadual |
| **SEFIN** | Secretaria de Financas Nacional (NFS-e) |
| **ADN** | Ambiente de Dados Nacional |
| **C14N** | Canonicalizacao XML (W3C) |
| **XMLDSig** | XML Digital Signature |



