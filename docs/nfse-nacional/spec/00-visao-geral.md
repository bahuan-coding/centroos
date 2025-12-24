# Visao Geral - NFS-e Nacional (ADN)

> Fonte: `markdown/manuais/manual-contribuintes-emissor-publico.md`, `markdown/guias/guia-emissor-publico-nacional-web.md`
> Versao: 1.0 | Data: 2025-12-24

---

## 1. O que e o Sistema Nacional NFS-e

O **Sistema Nacional NFS-e** e uma plataforma unificada para emissao, consulta e gestao de Notas Fiscais de Servico Eletronicas em ambito nacional. Ele foi criado para padronizar o processo de emissao de NFS-e entre todos os municipios brasileiros que aderirem ao convenio.

### 1.1 Ambiente de Dados Nacional (ADN)

O **ADN** e o modulo central do Sistema Nacional NFS-e que funciona como:
- Repositorio nacional de documentos fiscais eletronicos (DF-e)
- Hub de compartilhamento entre municipios conveniados
- Ponto unico de distribuicao de NFS-e e Eventos

### 1.2 Sefin Nacional

A **Sefin Nacional NFS-e** e a Secretaria de Financas Nacional que:
- Recepciona e valida as DPS (Declaracoes de Prestacao de Servico)
- Gera as NFS-e a partir das DPS validas
- Processa eventos (cancelamento, substituicao, manifestacao)

---

## 2. Atores do Sistema

| Ator | Descricao | Acesso |
|------|-----------|--------|
| **Contribuinte** | CPF ou CNPJ prestador/tomador de servicos | API ou Emissor Web/App |
| **Municipio Conveniado** | Prefeitura que aderiu ao SN NFS-e | API ADN Municipios |
| **Sefin Nacional** | Ambiente autorizador da NFS-e | Interno ao sistema |
| **CNC** | Cadastro Nacional de Contribuintes | API CNC |
| **Painel Municipal** | Interface de gestao do municipio | Web |

### 2.1 Tipos de Emitente da DPS

- `1` - Prestador do servico
- `2` - Tomador do servico
- `3` - Intermediario do servico

---

## 3. Ambientes

| Ambiente | Base URL | Uso |
|----------|----------|-----|
| **Producao Restrita** | `https://adn.producaorestrita.nfse.gov.br` | Homologacao e testes |
| **Producao** | `https://adn.nfse.gov.br` | Ambiente real |
| **SEFIN Producao Restrita** | `https://sefin.producaorestrita.nfse.gov.br` | Testes SEFIN |
| **SEFIN Producao** | `https://sefin.nfse.gov.br` | SEFIN real |

### 3.1 URLs Swagger (Documentacao Interativa)

- Contribuintes: `/contribuintes/docs/index.html`
- Municipios: `/municipios/docs/index.html`
- CNC: `/cnc/docs/index.html`
- Parametrizacao: `/parametrizacao/docs/index.html`
- DANFSE: `/danfse/docs/index.html`

---

## 4. Autenticacao

### 4.1 Certificado Digital ICP-Brasil

Todas as APIs exigem autenticacao via **certificado digital ICP-Brasil**:

| Tipo | Uso |
|------|-----|
| e-CPF A1/A3 | Pessoa Fisica |
| e-CNPJ A1/A3 | Pessoa Juridica |

### 4.2 Requisitos

- Certificado valido e nao expirado
- Cadeia de certificacao completa
- Conexao SSL/TLS mutua (mTLS)

### 4.3 Alternativas de Acesso (Emissor Web)

Para o Emissor Publico Nacional Web:
- Usuario/Senha (cadastro previo)
- Certificado Digital
- GOV.BR (autenticacao federada)

---

## 5. Glossario

| Termo | Significado |
|-------|-------------|
| **DPS** | Declaracao de Prestacao de Servicos - documento enviado pelo contribuinte para geracao da NFS-e |
| **NFS-e** | Nota Fiscal de Servico Eletronica - documento fiscal gerado apos validacao da DPS |
| **DF-e** | Documento Fiscal Eletronico - termo generico para NFS-e e Eventos |
| **Evento** | Registro de fato relacionado a NFS-e (cancelamento, manifestacao, etc) |
| **NSU** | Numero Sequencial Unico - identificador para controle de distribuicao |
| **chaveAcesso** | Identificador unico da NFS-e (44-50 caracteres) |
| **DANFSe** | Documento Auxiliar da NFS-e - versao PDF para impressao |
| **CNC** | Cadastro Nacional de Contribuintes |
| **ADN** | Ambiente de Dados Nacional |
| **cTribNac** | Codigo de Tributacao Nacional (LC 116/2003) |
| **cMun** | Codigo do Municipio (IBGE 7 digitos) |
| **tpAmb** | Tipo de Ambiente (1=Producao, 2=Homologacao) |

---

## 6. Fluxo Basico de Emissao

```
Contribuinte              Sefin Nacional              ADN
    |                           |                      |
    |-- DPS (XML assinado) ---->|                      |
    |                           |-- Valida DPS         |
    |                           |-- Gera NFS-e         |
    |<-- NFS-e (XML assinado) --|                      |
    |                           |-- Compartilha ------>|
    |                           |                      |
```

---

## 7. Pre-requisitos para Integracao

1. **Municipio Conveniado**: O municipio do prestador deve ter convenio ativo com o SN NFS-e
2. **Certificado Digital**: e-CPF ou e-CNPJ ICP-Brasil valido
3. **Cadastro CNC** (opcional): Contribuinte cadastrado no CNC do municipio
4. **Parametros Municipais**: Conhecer aliquotas e regras do municipio via API Parametrizacao

---

## 8. Referencias Internas

- Manual Contribuintes: `markdown/manuais/manual-contribuintes-emissor-publico.md`
- Manual ADN: `markdown/manuais/manual-municipios-adn.md`
- Manual CNC: `markdown/manuais/manual-municipios-cnc.md`
- Guia Emissor Web: `markdown/guias/guia-emissor-publico-nacional-web.md`
- XSDs: `xsd/sefin-adn/`, `xsd/cnc/`, `xsd/painel-municipal/`

