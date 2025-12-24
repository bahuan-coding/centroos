# APIs NFS-e Nacional - Documentacao Swagger

> Ultima atualizacao: 2025-12-24
> Fonte: https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/apis-prod-restrita-e-producao

## Ambientes Disponiveis

| Ambiente | Base URL |
|----------|----------|
| Producao Restrita (Homologacao) | `https://adn.producaorestrita.nfse.gov.br` |
| Producao | `https://adn.nfse.gov.br` |
| SEFIN Producao Restrita | `https://sefin.producaorestrita.nfse.gov.br` |
| SEFIN Producao | `https://sefin.nfse.gov.br` |

---

## APIs Disponiveis

### 1. CNC - Cadastro Nacional de Contribuintes

API para gestao do Cadastro Nacional de Contribuintes.

| Funcao | Producao Restrita | Producao |
|--------|-------------------|----------|
| CNC Principal | [Swagger](https://adn.producaorestrita.nfse.gov.br/cnc/docs/index.html) | [Swagger](https://adn.nfse.gov.br/cnc/docs/index.html) |
| CNC Municipio | [Swagger](https://adn.producaorestrita.nfse.gov.br/cnc/municipio/docs/index.html) | [Swagger](https://adn.nfse.gov.br/cnc/municipio/docs/index.html) |
| CNC Consulta | [Swagger](https://adn.producaorestrita.nfse.gov.br/cnc/consulta/docs/index.html) | [Swagger](https://adn.nfse.gov.br/cnc/consulta/docs/index.html) |

### 2. ADN - Ambiente de Dados Nacional

API principal para emissao e consulta de NFS-e.

| Funcao | Producao Restrita | Producao |
|--------|-------------------|----------|
| ADN Principal | [Swagger](https://adn.producaorestrita.nfse.gov.br/docs/index.html) | [Swagger](https://adn.nfse.gov.br/docs/index.html) |
| ADN Municipios | [Swagger](https://adn.producaorestrita.nfse.gov.br/municipios/docs/index.html) | [Swagger](https://adn.nfse.gov.br/municipios/docs/index.html) |
| ADN Contribuintes | [Swagger](https://adn.producaorestrita.nfse.gov.br/contribuintes/docs/index.html) | [Swagger](https://adn.nfse.gov.br/contribuintes/docs/index.html) |

### 3. Parametros Municipais

API para consulta de parametros e configuracoes municipais.

| Funcao | Producao Restrita | Producao |
|--------|-------------------|----------|
| Parametrizacao | [Swagger](https://adn.producaorestrita.nfse.gov.br/parametrizacao/docs/index.html) | [Swagger](https://adn.nfse.gov.br/parametrizacao/docs/index.html) |

### 4. DANFSE

API para geracao do Documento Auxiliar da NFS-e.

| Funcao | Producao Restrita | Producao |
|--------|-------------------|----------|
| DANFSE | [Swagger](https://adn.producaorestrita.nfse.gov.br/danfse/docs/index.html) | [Swagger](https://adn.nfse.gov.br/danfse/docs/index.html) |

### 5. SEFIN Nacional

API do Sistema de Escrituracao Fiscal Nacional.

| Funcao | Producao Restrita | Producao |
|--------|-------------------|----------|
| SEFIN Nacional | [Swagger](https://sefin.producaorestrita.nfse.gov.br/API/SefinNacional/docs/index) | [Swagger](https://sefin.nfse.gov.br/SefinNacional/docs/index) |

---

## URLs Completas de Referencia

### Producao Restrita (Homologacao/Testes)

1. https://adn.producaorestrita.nfse.gov.br/cnc/docs/index.html
2. https://adn.producaorestrita.nfse.gov.br/cnc/municipio/docs/index.html
3. https://adn.producaorestrita.nfse.gov.br/cnc/consulta/docs/index.html
4. https://adn.producaorestrita.nfse.gov.br/docs/index.html
5. https://adn.producaorestrita.nfse.gov.br/municipios/docs/index.html
6. https://adn.producaorestrita.nfse.gov.br/contribuintes/docs/index.html
7. https://adn.producaorestrita.nfse.gov.br/parametrizacao/docs/index.html
8. https://adn.producaorestrita.nfse.gov.br/danfse/docs/index.html
9. https://sefin.producaorestrita.nfse.gov.br/API/SefinNacional/docs/index

### Producao

1. https://adn.nfse.gov.br/cnc/docs/index.html
2. https://adn.nfse.gov.br/cnc/municipio/docs/index.html
3. https://adn.nfse.gov.br/cnc/consulta/docs/index.html
4. https://adn.nfse.gov.br/docs/index.html
5. https://adn.nfse.gov.br/municipios/docs/index.html
6. https://adn.nfse.gov.br/contribuintes/docs/index.html
7. https://adn.nfse.gov.br/parametrizacao/docs/index.html
8. https://adn.nfse.gov.br/danfse/docs/index.html
9. https://sefin.nfse.gov.br/SefinNacional/docs/index

---

## Notas

- Todas as APIs utilizam autenticacao via certificado digital ICP-Brasil
- O ambiente de Producao Restrita deve ser usado para testes e homologacao
- A documentacao Swagger interativa permite testar endpoints diretamente
- Para integracao, consulte os manuais em PDF correspondentes

