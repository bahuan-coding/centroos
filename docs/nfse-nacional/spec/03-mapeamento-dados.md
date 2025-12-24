# Mapeamento de Dados - NFS-e Nacional

> Fonte: `xsd/sefin-adn/tiposComplexos_v1.00.xsd`, `docs/integracoes_fiscais/MAPPING-NFSE-DATA.md`
> Versao: 1.0 | Data: 2025-12-24

---

## 1. Mapeamento Canonico Sistema ↔ ADN

### 1.1 Identificadores

| Campo Sistema | Campo ADN (XSD) | Tipo | Obrigatorio |
|---------------|-----------------|------|-------------|
| `chaveAcesso` | `infNFSe/@Id` | string(44-50) | Sim |
| `numero` | `nNFSe` | string(15) | Sim |
| `serie` | `infDPS/serie` | string(5) | Sim |
| `numeroDPS` | `infDPS/nDPS` | string(15) | Sim |
| `codigoVerificacao` | derivado de chaveAcesso | string | Sim |

### 1.2 Datas

| Campo Sistema | Campo ADN | Formato | Observacao |
|---------------|-----------|---------|------------|
| `dataEmissao` | `infDPS/dhEmi` | DateTime UTC | AAAA-MM-DDThh:mm:ssTZD |
| `competencia` | `infDPS/dCompet` | Date | AAAA-MM-DD |
| `dataProcessamento` | `infNFSe/dhProc` | DateTime UTC | Gerado pelo sistema |
| `dataCancelamento` | `infEvento/dhProc` | DateTime UTC | Se evento cancelamento |

### 1.3 Prestador

| Campo Sistema | Campo ADN | XSD Path |
|---------------|-----------|----------|
| `prestador.cpfCnpj` | `CNPJ` ou `CPF` | `infDPS/prest/CNPJ` ou `infDPS/prest/CPF` |
| `prestador.inscricaoMunicipal` | `IM` | `infDPS/prest/IM` |
| `prestador.razaoSocial` | `xNome` | `infDPS/prest/xNome` |
| `prestador.email` | `email` | `infDPS/prest/email` |
| `prestador.telefone` | `fone` | `infDPS/prest/fone` |
| `prestador.codigoMunicipio` | `cLocEmi` | `infDPS/cLocEmi` |
| `prestador.simplesNacional` | `opSimpNac` | `infDPS/prest/regTrib/opSimpNac` |
| `prestador.regimeEspecial` | `regEspTrib` | `infDPS/prest/regTrib/regEspTrib` |

### 1.4 Tomador

| Campo Sistema | Campo ADN | XSD Path |
|---------------|-----------|----------|
| `tomador.cpfCnpj` | `CNPJ` ou `CPF` | `infDPS/toma/CNPJ` ou `infDPS/toma/CPF` |
| `tomador.inscricaoMunicipal` | `IM` | `infDPS/toma/IM` |
| `tomador.razaoSocial` | `xNome` | `infDPS/toma/xNome` |
| `tomador.email` | `email` | `infDPS/toma/email` |
| `tomador.telefone` | `fone` | `infDPS/toma/fone` |

### 1.5 Endereco (Prestador/Tomador)

| Campo Sistema | Campo ADN | XSD Path |
|---------------|-----------|----------|
| `endereco.logradouro` | `xLgr` | `end/xLgr` |
| `endereco.numero` | `nro` | `end/nro` |
| `endereco.complemento` | `xCpl` | `end/xCpl` |
| `endereco.bairro` | `xBairro` | `end/xBairro` |
| `endereco.codigoMunicipio` | `cMun` | `end/endNac/cMun` |
| `endereco.cep` | `CEP` | `end/endNac/CEP` |
| `endereco.codigoPais` | `cPais` | `end/endExt/cPais` |

### 1.6 Servico

| Campo Sistema | Campo ADN | XSD Path |
|---------------|-----------|----------|
| `servico.codigoTributacaoNacional` | `cTribNac` | `serv/cServ/cTribNac` |
| `servico.codigoTributacaoMunicipal` | `cTribMun` | `serv/cServ/cTribMun` |
| `servico.descricao` | `xDescServ` | `serv/cServ/xDescServ` |
| `servico.codigoNBS` | `cNBS` | `serv/cServ/cNBS` |
| `servico.localPrestacao` | `cLocPrestacao` | `serv/locPrest/cLocPrestacao` |
| `servico.paisPrestacao` | `cPaisPrestacao` | `serv/locPrest/cPaisPrestacao` |

### 1.7 Valores

| Campo Sistema | Campo ADN | XSD Path |
|---------------|-----------|----------|
| `valores.valorServico` | `vServ` | `valores/vServPrest/vServ` |
| `valores.valorRecebidoIntermediario` | `vReceb` | `valores/vServPrest/vReceb` |
| `valores.descontoIncondicionado` | `vDescIncond` | `valores/vDescCondIncond/vDescIncond` |
| `valores.descontoCondicionado` | `vDescCond` | `valores/vDescCondIncond/vDescCond` |
| `valores.baseCalculo` | `vBC` | `infNFSe/valores/vBC` |
| `valores.aliquotaISS` | `pAliq` | `valores/trib/tribMun/pAliq` |
| `valores.valorISS` | `vISSQN` | `infNFSe/valores/vISSQN` |
| `valores.valorLiquido` | `vLiq` | `infNFSe/valores/vLiq` |

### 1.8 Retencoes

| Campo Sistema | Campo ADN | XSD Path |
|---------------|-----------|----------|
| `retencoes.issRetido` | `tpRetISSQN` | `valores/trib/tribMun/tpRetISSQN` |
| `retencoes.pis` | `vPis` | `valores/trib/tribFed/piscofins/vPis` |
| `retencoes.cofins` | `vCofins` | `valores/trib/tribFed/piscofins/vCofins` |
| `retencoes.irrf` | `vRetIRRF` | `valores/trib/tribFed/vRetIRRF` |
| `retencoes.csll` | `vRetCSLL` | `valores/trib/tribFed/vRetCSLL` |
| `retencoes.inss` | `vRetCP` | `valores/trib/tribFed/vRetCP` |

### 1.9 Status

| Status Sistema | Origem ADN | Condicao |
|----------------|------------|----------|
| `normal` | NFS-e sem eventos cancelamento | - |
| `cancelada` | Evento e101101, e105104, e305101 | Evento vinculado |
| `substituida` | Evento e105102 + chSubstituta | DPS com chSubstda |

---

## 2. Codigos de Dominio

### 2.1 Tipo Ambiente (tpAmb)

| Codigo | Descricao |
|--------|-----------|
| 1 | Producao |
| 2 | Homologacao |

### 2.2 Tipo Emitente (tpEmit)

| Codigo | Descricao |
|--------|-----------|
| 1 | Prestador |
| 2 | Tomador |
| 3 | Intermediario |

### 2.3 Simples Nacional (opSimpNac)

| Codigo | Descricao |
|--------|-----------|
| 1 | Nao Optante |
| 2 | Optante - MEI |
| 3 | Optante - ME/EPP |

### 2.4 Regime Especial Tributacao (regEspTrib)

| Codigo | Descricao |
|--------|-----------|
| 0 | Nenhum |
| 1 | Ato Cooperado |
| 2 | Estimativa |
| 3 | Microempresa Municipal |
| 4 | Notario/Registrador |
| 5 | Profissional Autonomo |
| 6 | Sociedade de Profissionais |

### 2.5 Tributacao ISSQN (tribISSQN)

| Codigo | Descricao |
|--------|-----------|
| 1 | Operacao tributavel |
| 2 | Imunidade |
| 3 | Exportacao de servico |
| 4 | Nao Incidencia |

### 2.6 Tipo Retencao ISSQN (tpRetISSQN)

| Codigo | Descricao |
|--------|-----------|
| 1 | Nao Retido |
| 2 | Retido pelo Tomador |
| 3 | Retido pelo Intermediario |

---

## 3. Anexos de Dominio

### 3.1 Municipios (IBGE)

Fonte: `raw/anexos-dominio/anexo_a-municipio_ibge-paises_iso2-v1-00-snnfse-20251210.xlsx`

Usar codigo IBGE de 7 digitos para:
- `cLocEmi` (municipio emissor)
- `cLocPrestacao` (local prestacao)
- `cLocIncid` (municipio incidencia)
- `cMun` (endereco)

### 3.2 Paises (ISO 2)

Fonte: mesma planilha acima

Usar codigo ISO 2 caracteres para:
- `cPais` (endereco exterior)
- `cPaisPrestacao` (local prestacao exterior)
- `cPaisResult` (resultado exportacao)

### 3.3 Lista de Servicos (LC 116/2003 + NBS)

Fonte: `raw/anexos-dominio/anexo_b-nbs2-lista_servico_nacional-snnfse.xlsx`

Formato cTribNac: 6 digitos = Item(2) + Subitem(2) + Desdobro(2)
Exemplo: `010801` = Item 01, Subitem 08, Desdobro 01

---

## 4. Campos Opcionais vs Obrigatorios

### 4.1 Sempre Obrigatorios

- Identificacao DPS (serie, numero, data)
- Prestador (CNPJ/CPF, regTrib)
- Servico (cTribNac, descricao, local)
- Valores (vServ, tribMun)

### 4.2 Condicionalmente Obrigatorios

| Campo | Condicao |
|-------|----------|
| `toma` | Se servico para tomador identificado |
| `interm` | Se houver intermediario |
| `cPaisResult` | Se tribISSQN = 3 (exportacao) |
| `tpImunidade` | Se tribISSQN = 2 (imunidade) |
| `pAliq` | Se municipio nao conveniado |
| `comExt` | Se operacao comercio exterior |
| `obra` | Se servico construcao civil |

### 4.3 Campos Nacionais vs Municipais

| Campo | Nacional | Municipal |
|-------|----------|-----------|
| `cTribNac` | Obrigatorio | - |
| `cTribMun` | Opcional | Pode ser exigido |
| `pAliq` | Se mun nao conveniado | Parametrizado |
| `nBM` (beneficio) | - | Cadastrado pelo municipio |

---

## 5. Transformacoes de Dados

### 5.1 CPF/CNPJ

```typescript
// ADN exige apenas digitos
const formatarCpfCnpj = (valor: string) => valor.replace(/\D/g, '');

// ADN: CNPJ = 14 digitos, CPF = 11 digitos
const isCnpj = (valor: string) => formatarCpfCnpj(valor).length === 14;
```

### 5.2 Data/Hora UTC

```typescript
// ADN: AAAA-MM-DDThh:mm:ssTZD
const formatarDataHora = (data: Date): string => {
  return data.toISOString().replace('Z', '-03:00'); // Ajustar TZ
};

// Competencia: AAAA-MM-DD
const formatarCompetencia = (data: Date): string => {
  return data.toISOString().split('T')[0];
};
```

### 5.3 Valores Monetarios

```typescript
// ADN: Decimal(15,2) sem separador de milhar
const formatarValor = (valor: number): string => {
  return valor.toFixed(2);
};
```

