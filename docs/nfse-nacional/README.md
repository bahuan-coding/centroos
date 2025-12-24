# Documentacao Oficial NFS-e Nacional

Base documental consolidada do Sistema Nacional de NFS-e (gov.br/nfse).

> **Snapshot:** 2025-12-24
> **Fonte:** https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/documentacao-atual

---

## Indice Rapido

- [Guias](#guias)
- [Manuais de API](#manuais-de-api)
- [Esquemas XSD](#esquemas-xsd)
- [Anexos de Dominio](#anexos-de-dominio)
- [Anexos de Layout](#anexos-de-layout)
- [APIs Swagger](#apis-swagger)

---

## Guias

Documentacao para usuarios do sistema.

| Documento | PDF Original | Markdown |
|-----------|--------------|----------|
| Emissor Publico Nacional Web | [PDF](raw/guias/guia-emissorpubliconacionalweb_snnfse-ern-v12.pdf) | [MD](markdown/guias/guia-emissor-publico-nacional-web.md) |
| Painel Administrativo Municipal | [PDF](raw/guias/guia-do-painel-administrativo-municipal-nfs-e-v1-2-out2025.pdf) | [MD](markdown/guias/guia-painel-administrativo-municipal.md) |

---

## Manuais de API

Documentacao tecnica para integracao via API.

| Manual | PDF Original | Markdown |
|--------|--------------|----------|
| Contribuintes - Emissor Publico | [PDF](raw/manuais/manual-contribuintes-emissor-publico-api-sistema-nacional-nfs-e-v1-2-out2025.pdf) | [MD](markdown/manuais/manual-contribuintes-emissor-publico.md) |
| Municipios - ADN (Compartilhamento) | [PDF](raw/manuais/manual-municipios-apis-adn-sistema-nacional-nfs-e-v1-2-out21025.pdf) | [MD](markdown/manuais/manual-municipios-adn.md) |
| Municipios - CNC (Cadastro Contribuintes) | [PDF](raw/manuais/manual-municipios-cnc-api-sistema-nacional-nfs-e-v1-2-out21025.pdf) | [MD](markdown/manuais/manual-municipios-cnc.md) |
| Municipios - Emissor Publico | [PDF](raw/manuais/manual-municipios-emissor-publico-api-sistema-nacional-nfs-e-v1-2-out21025.pdf) | [MD](markdown/manuais/manual-municipios-emissor-publico.md) |

---

## Esquemas XSD

Schemas XML para validacao de mensagens.

### SEFIN/ADN (Anexos I, II, IV)

Localizacao: `xsd/sefin-adn/`

| Arquivo | Descricao |
|---------|-----------|
| DPS_v1.00.xsd | Declaracao Prestacao Servico |
| NFSe_v1.00.xsd | Nota Fiscal de Servico Eletronica |
| evento_v1.00.xsd | Eventos da NFS-e |
| pedRegEvento_v1.00.xsd | Pedido de Registro de Evento |
| tiposComplexos_v1.00.xsd | Tipos complexos compartilhados |
| tiposEventos_v1.00.xsd | Tipos de eventos |
| tiposSimples_v1.00.xsd | Tipos simples compartilhados |
| xmldsig-core-schema.xsd | Schema de assinatura XML |

### CNC (Anexo III)

Localizacao: `xsd/cnc/`

| Arquivo | Descricao |
|---------|-----------|
| CNC_v1.00.xsd | Cadastro Nacional de Contribuintes |
| tiposCnc_v1.00.xsd | Tipos especificos do CNC |
| tiposComplexos_v1.00.xsd | Tipos complexos |
| tiposSimples_v1.00.xsd | Tipos simples |
| xmldsig-core-schema_v1.00.xsd | Schema de assinatura XML |

### Painel Municipal (Anexo V)

Localizacao: `xsd/painel-municipal/`

| Arquivo | Descricao |
|---------|-----------|
| PARAM_v1.00.xsd | Parametros municipais |
| tiposComplexos_v1.00.xsd | Tipos complexos |
| tiposSimples_v1.00.xsd | Tipos simples |
| xmldsig-core-schema_v1.00.xsd | Schema de assinatura XML |

---

## Anexos de Dominio

Tabelas de referencia e codigos.

| Anexo | XLSX Original | Markdown | Descricao |
|-------|---------------|----------|-----------|
| A - Municipios/Paises | [XLSX](raw/anexos-dominio/anexo_a-municipio_ibge-paises_iso2-v1-00-snnfse-20251210.xlsx) | [MD](markdown/anexos-dominio/municipios-ibge-paises.md) | Codigos IBGE e ISO2 |
| B - Lista Servicos NBS | [XLSX](raw/anexos-dominio/anexo_b-nbs2-lista_servico_nacional-snnfse.xlsx) | [MD](markdown/anexos-dominio/lista-servicos-nbs.md) | Nomenclatura Brasileira de Servicos |

---

## Anexos de Layout

Especificacao de campos e estruturas XML.

| Anexo | XLSX Original | Markdown | Descricao |
|-------|---------------|----------|-----------|
| I - DPS/NFS-e | [XLSX](raw/anexos-layout/anexo_i-sefin_adn-dps_nfse-snnfse-v1-00-20251216.xlsx) | [MD](markdown/anexos-layout/layout-dps-nfse.md) | Layout da DPS e NFS-e |
| II - Eventos | [XLSX](raw/anexos-layout/anexo_ii-sefin_adn-pedregevt_evt-snnfse-v1-00-20251216.xlsx) | [MD](markdown/anexos-layout/layout-eventos.md) | Layout de eventos (cancelamento, etc) |
| III - CNC | [XLSX](raw/anexos-layout/anexo_iii-cnc-snnfse-v1-00-20251216.xlsx) | [MD](markdown/anexos-layout/layout-cnc.md) | Layout do Cadastro Nacional |
| IV - ADN | [XLSX](raw/anexos-layout/anexo_iv-adn-snnfse-v1-00-20251216.xlsx) | [MD](markdown/anexos-layout/layout-adn.md) | Layout do Ambiente de Dados |
| V - Painel Municipal | [XLSX](raw/anexos-layout/anexo_v-painel_adm_municipal-snnfse-v1-00-20251216.xlsx) | [MD](markdown/anexos-layout/layout-painel-municipal.md) | Layout do Painel Administrativo |

---

## APIs Swagger

Documentacao interativa das APIs.

Ver: [apis/endpoints-swagger.md](apis/endpoints-swagger.md)

### Ambientes

| Ambiente | URL Base |
|----------|----------|
| Producao Restrita (Homologacao) | `adn.producaorestrita.nfse.gov.br` |
| Producao | `adn.nfse.gov.br` |

### APIs Principais

- **CNC**: Cadastro Nacional de Contribuintes
- **ADN**: Ambiente de Dados Nacional (emissao/consulta NFS-e)
- **Parametrizacao**: Configuracoes municipais
- **DANFSE**: Geracao do documento auxiliar
- **SEFIN Nacional**: Escrituracao fiscal

---

## Estrutura de Pastas

```
docs/nfse-nacional/
├── README.md              <- Voce esta aqui
├── MANIFESTO.md           <- Rastreabilidade completa
├── raw/                   <- Arquivos originais
│   ├── guias/             <- PDFs de guias
│   ├── manuais/           <- PDFs de manuais
│   ├── esquemas-xsd/      <- ZIPs originais
│   ├── anexos-dominio/    <- XLSX de codigos
│   └── anexos-layout/     <- XLSX de layouts
├── markdown/              <- Conversoes para leitura
│   ├── guias/
│   ├── manuais/
│   ├── anexos-dominio/
│   └── anexos-layout/
├── xsd/                   <- Schemas XSD extraidos
│   ├── sefin-adn/
│   ├── cnc/
│   └── painel-municipal/
└── apis/                  <- Referencias Swagger
    └── endpoints-swagger.md
```

---

## Proximos Passos

1. Consultar manuais de API para entender endpoints disponiveis
2. Analisar schemas XSD para definir modelos de dados
3. Verificar anexos de layout para mapeamento de campos
4. Testar APIs no ambiente de Producao Restrita

---

## Licenca

Conteudo oficial sob licenca [CC BY-ND 3.0](https://creativecommons.org/licenses/by-nd/3.0/deed.pt_BR).

