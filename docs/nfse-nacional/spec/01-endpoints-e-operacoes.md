# Endpoints e Operacoes - NFS-e Nacional

> Fonte: `apis/endpoints-swagger.md`, `markdown/manuais/*.md`
> Versao: 1.0 | Data: 2025-12-24

---

## 1. Visao Geral das APIs

O Sistema Nacional NFS-e disponibiliza 9 APIs (18 URLs entre Producao Restrita e Producao):

| API | Dominio | Descricao |
|-----|---------|-----------|
| ADN Principal | Emissao/Consulta | API principal para DPS -> NFS-e |
| ADN Contribuintes | Consulta/Eventos | Operacoes para contribuintes |
| ADN Municipios | Distribuicao | Compartilhamento de DF-e |
| CNC | Cadastro | Cadastro Nacional Contribuintes |
| CNC Municipio | Cadastro | Gestao CNC pelo municipio |
| CNC Consulta | Cadastro | Consultas publicas CNC |
| Parametrizacao | Configuracao | Parametros municipais |
| DANFSE | Documento | Geracao PDF da NFS-e |
| SEFIN Nacional | Emissao | Recepcao DPS |

---

## 2. APIs por Dominio Funcional

### 2.1 Emissao de NFS-e (SEFIN Nacional)

Base: `https://sefin.producaorestrita.nfse.gov.br` (hom) | `https://sefin.nfse.gov.br` (prod)

#### POST /nfse

Geracao sincrona de NFS-e a partir de DPS.

| Campo | Valor |
|-------|-------|
| Metodo | POST |
| Path | `/nfse` |
| Content-Type | `application/json` |
| Auth | Certificado ICP-Brasil |
| Body | JSON com DPS em base64 ou XML |

**Request:**
```json
{
  "dps": "<DPS xmlns='http://www.sped.fazenda.gov.br/nfse'>...</DPS>"
}
```

**Response Sucesso (200):**
```json
{
  "nfse": "<NFSe>...</NFSe>",
  "chaveAcesso": "NFSe35250612345678000195...",
  "numero": "123",
  "dataEmissao": "2025-12-24T10:30:00-03:00"
}
```

**Response Erro (400):**
```json
{
  "codigo": "101",
  "mensagem": "XML nao compativel com Schema",
  "detalhes": ["Campo obrigatorio: prest/CNPJ"]
}
```

---

### 2.2 Consulta de NFS-e (ADN Contribuintes)

Base: `https://adn.producaorestrita.nfse.gov.br/contribuintes` (hom)

#### GET /nfse/{chaveAcesso}

Consulta NFS-e pela chave de acesso.

| Campo | Valor |
|-------|-------|
| Metodo | GET |
| Path | `/nfse/{chaveAcesso}` |
| Auth | Certificado ICP-Brasil |

**Response (200):**
```json
{
  "nfse": "<NFSe>...</NFSe>",
  "eventos": []
}
```

#### GET /dps/{id}

Recupera chave de acesso da NFS-e pelo ID da DPS.

| Campo | Valor |
|-------|-------|
| Metodo | GET |
| Path | `/dps/{id}` |
| Formato ID | `{cMunEmissor(7)}{tpInsc(1)}{inscFed(14)}{serie(5)}{nDPS(15)}` |

**Restricao:** Apenas atores da NFS-e (prestador/tomador/intermediario) podem consultar.

#### HEAD /dps/{id}

Verifica se NFS-e foi gerada para a DPS (sem retornar chave).

| Campo | Valor |
|-------|-------|
| Metodo | HEAD |
| Response 200 | NFS-e existe |
| Response 404 | NFS-e nao existe |

---

### 2.3 Eventos (ADN Contribuintes)

#### POST /nfse/{chaveAcesso}/eventos

Registra evento na NFS-e.

| Campo | Valor |
|-------|-------|
| Metodo | POST |
| Path | `/nfse/{chaveAcesso}/eventos` |
| Body | Pedido de Registro de Evento (XML assinado) |

**Tipos de Evento:**

| Codigo | Nome | Autor |
|--------|------|-------|
| e101101 | Cancelamento de NFS-e | Contribuinte |
| e105102 | Cancelamento por Substituicao | Sistema |
| e101103 | Solicitacao Analise Fiscal | Contribuinte |
| e105104 | Cancelamento Deferido | Municipio |
| e105105 | Cancelamento Indeferido | Municipio |
| e202201 | Confirmacao Prestador | Prestador |
| e203202 | Confirmacao Tomador | Tomador |
| e204203 | Confirmacao Intermediario | Intermediario |
| e205204 | Confirmacao Tacita | Sistema |
| e202205 | Rejeicao Prestador | Prestador |
| e203206 | Rejeicao Tomador | Tomador |
| e204207 | Rejeicao Intermediario | Intermediario |
| e205208 | Anulacao Rejeicao | Municipio |
| e305101 | Cancelamento por Oficio | Municipio |
| e305102 | Bloqueio por Oficio | Municipio |
| e305103 | Desbloqueio por Oficio | Municipio |

#### GET /nfse/{chaveAcesso}/eventos

Lista todos os eventos da NFS-e.

#### GET /nfse/{chaveAcesso}/eventos/{tipoEvento}

Lista eventos de um tipo especifico.

#### GET /nfse/{chaveAcesso}/eventos/{tipoEvento}/{numSeqEvento}

Consulta evento especifico.

---

### 2.4 Parametros Municipais

Base: `https://adn.producaorestrita.nfse.gov.br/parametrizacao`

#### GET /parametros_municipais/{codigoMunicipio}/convenio

Consulta parametros do convenio do municipio.

#### GET /parametros_municipais/{codigoMunicipio}/{codigoServico}

Consulta aliquotas, regimes especiais e deducoes por servico.

#### GET /parametros_municipais/{codigoMunicipio}/{cpfCnpj}

Consulta retencoes e beneficios do contribuinte.

---

### 2.5 DANFSE

Base: `https://adn.producaorestrita.nfse.gov.br/danfse`

#### GET /danfse/{chaveAcesso}

Gera PDF da NFS-e.

| Campo | Valor |
|-------|-------|
| Response | application/pdf |

---

### 2.6 CNC - Cadastro Nacional Contribuintes

Base: `https://adn.producaorestrita.nfse.gov.br/cnc`

#### POST /CNC

Inclui/altera contribuinte no CNC.

| Campo | Valor |
|-------|-------|
| Autor | Municipio |
| Body | Dados cadastrais do contribuinte |

#### GET /cad/CNC/{nsu}

Distribui cadastro a partir do NSU Cadastro.

#### GET /mov/CNC/{nsu}

Distribui movimentacoes a partir do NSU Movimento.

---

### 2.7 Distribuicao DF-e (ADN Municipios)

Base: `https://adn.producaorestrita.nfse.gov.br/municipios`

#### POST /DFe/

Recepciona lote de DF-e do municipio.

| Campo | Valor |
|-------|-------|
| Max DF-e | 50 por lote |
| Max Tamanho | 1 MB |
| Ordem | Cronologica obrigatoria |

#### GET /DFe/{UltimoNSU}

Distribui ate 50 DF-e a partir do NSU.

#### GET /DFe/{NSU}

Consulta DF-e especifico por NSU.

---

## 3. Tabela de Operacoes por Macrofluxo

| Macrofluxo | Endpoint | Metodo | Descricao |
|------------|----------|--------|-----------|
| Emissao | /nfse | POST | Envia DPS, recebe NFS-e |
| Substituicao | /nfse | POST | DPS com chSubstda (gera evento auto) |
| Consulta Chave | /nfse/{ch} | GET | Consulta NFS-e por chave |
| Consulta DPS | /dps/{id} | GET/HEAD | Verifica/recupera chave |
| Cancelamento | /nfse/{ch}/eventos | POST | Evento e101101 |
| Manifestacao | /nfse/{ch}/eventos | POST | Eventos e202201-e205208 |
| DANFSE | /danfse/{ch} | GET | PDF da NFS-e |
| Parametros | /parametros_municipais/* | GET | Aliquotas e regras |
| Cadastro | /CNC | POST/GET | Gestao CNC |
| Distribuicao | /DFe/* | POST/GET | Compartilhamento entre municipios |

---

## 4. Autenticacao

Todas as APIs exigem:

1. **Certificado ICP-Brasil** (e-CPF ou e-CNPJ)
2. **TLS 1.2+** com mTLS
3. **Assinatura XML** nos documentos enviados (DPS, Eventos)

---

## 5. Limites e Restricoes

| Item | Limite |
|------|--------|
| Lote DF-e | 50 documentos |
| Tamanho Lote | 1 MB |
| Intervalo Distribuicao | 1 hora (quando maxNSU = ultNSU) |
| Timeout Recomendado | 30 segundos |

