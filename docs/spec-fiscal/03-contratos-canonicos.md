# Contratos Canonicos

> Versao: 1.0.0 | Data: 2025-12-24
> Status: SPEC FINAL - Pronto para implementacao

---

## 1. Objetivo

Definir os **tipos internos canonicos** do Motor Fiscal, mapeando cada campo para os formatos especificos de NFS-e SP, NFS-e Nacional, NF-e e NFC-e.

---

## 2. Estrutura Principal

```typescript
interface DocumentoFiscal {
  // Identificacao
  id: string;                    // UUID interno
  tipoDocumento: TipoDocumento;
  estado: EstadoDocumentoFiscal;
  
  // Identificadores externos (apos autorizacao)
  chaveAcesso?: string;
  numero?: string;
  serie?: string;
  codigoVerificacao?: string;
  protocoloAutorizacao?: string;
  
  // Datas
  dataEmissao: Date;
  competencia: Date;             // Mes/ano de competencia
  dataAutorizacao?: Date;
  
  // Partes
  emitente: Emitente;
  destinatario?: Destinatario;
  intermediario?: Intermediario;
  
  // Itens
  itens: ItemDocumento[];
  
  // Totais
  totais: Totais;
  
  // Tributos
  tributos: Tributos;
  
  // Pagamento (NF-e/NFC-e)
  pagamento?: Pagamento;
  
  // Transporte (NF-e)
  transporte?: Transporte;
  
  // Informacoes adicionais
  informacoesComplementares?: string;
  informacoesFisco?: string;
  
  // Metadados
  ambiente: 'PRODUCAO' | 'HOMOLOGACAO';
  criadoEm: Date;
  atualizadoEm: Date;
}

type TipoDocumento = 'NFSE_SP' | 'NFSE_NACIONAL' | 'NFE' | 'NFCE';
```

---

## 3. Emitente

```typescript
interface Emitente {
  // Identificacao
  cpfCnpj: string;
  inscricaoMunicipal?: string;
  inscricaoEstadual?: string;
  
  // Dados cadastrais
  razaoSocial: string;
  nomeFantasia?: string;
  
  // Endereco
  endereco: Endereco;
  
  // Contato
  email?: string;
  telefone?: string;
  
  // Regime tributario
  regimeTributario: RegimeTributario;
  simplesNacional: OpSimplesNacional;
  regimeEspecial?: RegimeEspecialTributacao;
  
  // NF-e/NFC-e
  crt?: 1 | 2 | 3 | 4; // Codigo Regime Tributario
}

enum RegimeTributario {
  SIMPLES_NACIONAL = 'SIMPLES_NACIONAL',
  LUCRO_PRESUMIDO = 'LUCRO_PRESUMIDO',
  LUCRO_REAL = 'LUCRO_REAL',
  MEI = 'MEI',
}

enum OpSimplesNacional {
  NAO_OPTANTE = 1,
  OPTANTE_MEI = 2,
  OPTANTE_ME_EPP = 3,
}

enum RegimeEspecialTributacao {
  NENHUM = 0,
  ATO_COOPERADO = 1,
  ESTIMATIVA = 2,
  MICROEMPRESA_MUNICIPAL = 3,
  NOTARIO_REGISTRADOR = 4,
  PROFISSIONAL_AUTONOMO = 5,
  SOCIEDADE_PROFISSIONAIS = 6,
}
```

### 3.1 Mapeamento Emitente

| Campo Canonico | NFS-e SP | NFS-e ADN | NF-e/NFC-e |
|----------------|----------|-----------|------------|
| cpfCnpj | CPFCNPJRemetente/CNPJ | prest/CNPJ ou CPF | emit/CNPJ ou CPF |
| inscricaoMunicipal | InscricaoPrestador | prest/IM | emit/IM |
| inscricaoEstadual | - | - | emit/IE |
| razaoSocial | - | prest/xNome | emit/xNome |
| nomeFantasia | - | - | emit/xFant |
| endereco | - | prest/end | emit/enderEmit |
| email | - | prest/email | - |
| telefone | - | prest/fone | - |
| simplesNacional | - | prest/regTrib/opSimpNac | - |
| crt | - | - | emit/CRT |

---

## 4. Destinatario

```typescript
interface Destinatario {
  // Identificacao
  cpfCnpj?: string;
  inscricaoMunicipal?: string;
  inscricaoEstadual?: string;
  idEstrangeiro?: string;
  
  // Dados cadastrais
  razaoSocial?: string;
  
  // Endereco
  endereco?: Endereco;
  
  // Contato
  email?: string;
  telefone?: string;
  
  // NF-e/NFC-e
  indicadorIE?: 1 | 2 | 9; // 1=Contribuinte, 2=Isento, 9=Nao-contribuinte
  isConsumidorFinal: boolean;
}
```

### 4.1 Mapeamento Destinatario

| Campo Canonico | NFS-e SP | NFS-e ADN | NF-e/NFC-e |
|----------------|----------|-----------|------------|
| cpfCnpj | CPFCNPJTomador | toma/CNPJ ou CPF | dest/CNPJ ou CPF |
| inscricaoMunicipal | InscricaoMunicipalTomador | toma/IM | dest/IM |
| inscricaoEstadual | InscricaoEstadualTomador | - | dest/IE |
| razaoSocial | RazaoSocialTomador | toma/xNome | dest/xNome |
| endereco | EnderecoTomador/* | toma/end | dest/enderDest |
| email | EmailTomador | toma/email | dest/email |
| indicadorIE | - | - | dest/indIEDest |
| isConsumidorFinal | - | - | indFinal |

---

## 5. Endereco

```typescript
interface Endereco {
  tipoLogradouro?: string;
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  codigoMunicipio: string;  // IBGE 7 digitos
  nomeMunicipio?: string;
  uf: string;
  cep: string;
  codigoPais?: string;      // ISO 3166 (1058 = Brasil)
  nomePais?: string;
}
```

### 5.1 Mapeamento Endereco

| Campo Canonico | NFS-e SP | NFS-e ADN | NF-e/NFC-e |
|----------------|----------|-----------|------------|
| tipoLogradouro | TipoLogradouro | - | - |
| logradouro | Logradouro | xLgr | xLgr |
| numero | NumeroEndereco | nro | nro |
| complemento | ComplementoEndereco | xCpl | xCpl |
| bairro | Bairro | xBairro | xBairro |
| codigoMunicipio | Cidade | cMun | cMun |
| nomeMunicipio | - | xMun | xMun |
| uf | UF | UF | UF |
| cep | CEP | CEP | CEP |
| codigoPais | - | cPais | cPais |

---

## 6. Item do Documento

```typescript
interface ItemDocumento {
  numero: number;           // Sequencial do item
  
  // Servico (NFS-e)
  servico?: {
    codigoLC116: string;    // Codigo LC 116/2003 (ex: "01.08")
    codigoTribNacional?: string; // cTribNac 6 digitos
    codigoTribMunicipal?: string;
    codigoNBS?: string;     // Nomenclatura Brasileira de Servicos
    descricao: string;
    
    // Local de prestacao
    localPrestacao: string; // cLocPrestacao (IBGE)
    paisPrestacao?: string; // Se exterior
  };
  
  // Produto (NF-e/NFC-e)
  produto?: {
    codigo: string;         // Codigo interno
    codigoBarras?: string;  // GTIN/EAN
    descricao: string;
    ncm: string;            // NCM 8 digitos
    cest?: string;          // CEST 7 digitos
    cfop: string;           // CFOP 4 digitos
    unidade: string;        // Unidade comercial
    quantidade: number;
    valorUnitario: number;
  };
  
  // Valores
  valorBruto: number;
  valorDesconto?: number;
  valorLiquido: number;
  
  // Tributos do item
  tributosItem: TributosItem;
}
```

### 6.1 Mapeamento Item Servico (NFS-e)

| Campo Canonico | NFS-e SP | NFS-e ADN |
|----------------|----------|-----------|
| descricao | Discriminacao | serv/xDescServ |
| codigoLC116 | CodigoServico | serv/cServ/cTribNac |
| codigoTribMunicipal | - | serv/cServ/cTribMun |
| codigoNBS | - | serv/cServ/cNBS |
| localPrestacao | - | serv/locPrest/cLocPrestacao |
| valorBruto | ValorServicos | valores/vServPrest/vServ |
| valorDesconto | ValorDeducoes | valores/vDescCondIncond |

### 6.2 Mapeamento Item Produto (NF-e/NFC-e)

| Campo Canonico | NF-e/NFC-e |
|----------------|------------|
| codigo | prod/cProd |
| codigoBarras | prod/cEAN |
| descricao | prod/xProd |
| ncm | prod/NCM |
| cest | prod/CEST |
| cfop | prod/CFOP |
| unidade | prod/uCom |
| quantidade | prod/qCom |
| valorUnitario | prod/vUnCom |
| valorBruto | prod/vProd |
| valorDesconto | prod/vDesc |

---

## 7. Tributos

### 7.1 Estrutura Geral

```typescript
interface Tributos {
  // ISS (Servicos)
  iss?: {
    tributacao: TribISSQN;
    aliquota: number;
    baseCalculo: number;
    valorISS: number;
    tipoRetencao: TipoRetISSQN;
    valorRetido?: number;
    codigoMunicipioIncidencia?: string;
  };
  
  // ICMS (Mercadorias)
  icms?: {
    cst: string;           // CST ou CSOSN
    baseCalculo: number;
    aliquota: number;
    valorICMS: number;
    // Diferencial aliquota
    vICMSUFDest?: number;
    vICMSUFRemet?: number;
    // FCP
    vFCP?: number;
  };
  
  // IPI
  ipi?: {
    cst: string;
    baseCalculo: number;
    aliquota: number;
    valorIPI: number;
  };
  
  // PIS
  pis?: {
    cst: string;
    baseCalculo: number;
    aliquota: number;
    valorPIS: number;
    valorRetido?: number;
  };
  
  // COFINS
  cofins?: {
    cst: string;
    baseCalculo: number;
    aliquota: number;
    valorCOFINS: number;
    valorRetido?: number;
  };
  
  // Retencoes federais
  retencoes?: {
    irrf?: number;
    csll?: number;
    inss?: number;
    pis?: number;
    cofins?: number;
  };
}

enum TribISSQN {
  TRIBUTAVEL = 1,
  IMUNE = 2,
  EXPORTACAO = 3,
  NAO_INCIDENTE = 4,
}

enum TipoRetISSQN {
  NAO_RETIDO = 1,
  RETIDO_TOMADOR = 2,
  RETIDO_INTERMEDIARIO = 3,
}
```

### 7.2 Mapeamento ISS

| Campo Canonico | NFS-e SP | NFS-e ADN | NF-e |
|----------------|----------|-----------|------|
| aliquota | AliquotaServicos | valores/trib/tribMun/pAliq | ISSQN/vAliq |
| baseCalculo | ValorServicos | valores/vBC | ISSQN/vBC |
| valorISS | ValorISS | valores/vISSQN | ISSQN/vISSQN |
| tipoRetencao | ISSRetido | valores/trib/tribMun/tpRetISSQN | - |

### 7.3 Mapeamento ICMS

| Campo Canonico | NF-e/NFC-e |
|----------------|------------|
| cst | ICMS/CST ou CSOSN |
| baseCalculo | ICMS/vBC |
| aliquota | ICMS/pICMS |
| valorICMS | ICMS/vICMS |
| vICMSUFDest | ICMSUFDest/vICMSUFDest |
| vFCP | ICMSUFDest/vFCPUFDest |

---

## 8. Totais

```typescript
interface Totais {
  valorServicos: number;
  valorProdutos: number;
  valorDesconto: number;
  valorDeducoes: number;
  
  // Base de calculo
  baseCalculoISS: number;
  baseCalculoICMS: number;
  
  // Tributos
  valorISS: number;
  valorICMS: number;
  valorIPI: number;
  valorPIS: number;
  valorCOFINS: number;
  
  // Retencoes
  valorRetencoesTotal: number;
  
  // Liquido
  valorLiquido: number;
  valorTotal: number;
}
```

### 8.1 Mapeamento Totais

| Campo Canonico | NFS-e SP | NFS-e ADN | NF-e/NFC-e |
|----------------|----------|-----------|------------|
| valorServicos | ValorServicos | valores/vServPrest/vServ | - |
| valorProdutos | - | - | total/ICMSTot/vProd |
| valorDesconto | ValorDeducoes | valores/vDescCondIncond | total/ICMSTot/vDesc |
| valorISS | ValorISS | valores/vISSQN | total/ISSQNtot/vISS |
| valorICMS | - | - | total/ICMSTot/vICMS |
| valorLiquido | ValorServicos - deducoes | valores/vLiq | total/ICMSTot/vNF |

---

## 9. Pagamento (NF-e/NFC-e)

```typescript
interface Pagamento {
  formas: FormaPagamento[];
  troco?: number;
}

interface FormaPagamento {
  tipo: TipoPagamento;
  valor: number;
  
  // Cartao
  bandeira?: BandeiraCartao;
  cnpjCredenciadora?: string;
  autorizacao?: string;
}

enum TipoPagamento {
  DINHEIRO = '01',
  CHEQUE = '02',
  CARTAO_CREDITO = '03',
  CARTAO_DEBITO = '04',
  CREDITO_LOJA = '05',
  VALE_ALIMENTACAO = '10',
  VALE_REFEICAO = '11',
  VALE_PRESENTE = '12',
  VALE_COMBUSTIVEL = '13',
  BOLETO = '15',
  DEPOSITO = '16',
  PIX = '17',
  TRANSFERENCIA = '18',
  CASHBACK = '19',
  SEM_PAGAMENTO = '90',
  OUTROS = '99',
}
```

---

## 10. Campos Obrigatorios por Tipo

### 10.1 Campos Obrigatorios

| Campo | NFS-e SP | NFS-e ADN | NF-e | NFC-e |
|-------|----------|-----------|------|-------|
| emitente.cpfCnpj | Sim | Sim | Sim | Sim |
| emitente.inscricaoMunicipal | Sim | Opcional | Opcional | Nao |
| emitente.inscricaoEstadual | Nao | Nao | Sim | Sim |
| destinatario.cpfCnpj | Opcional | Opcional | Condicional | Condicional |
| itens[].servico | Sim | Sim | Nao | Nao |
| itens[].produto | Nao | Nao | Sim | Sim |
| tributos.iss | Sim | Sim | Se servico | Se servico |
| tributos.icms | Nao | Nao | Sim | Sim |
| pagamento | Nao | Nao | Sim | Sim |

### 10.2 Campos Exclusivos

| Campo | Exclusivo de |
|-------|--------------|
| servico.codigoLC116 | NFS-e |
| produto.ncm | NF-e/NFC-e |
| produto.cfop | NF-e/NFC-e |
| tributos.icms | NF-e/NFC-e |
| transporte | NF-e |
| qrCode | NFC-e |

---

## 11. Transformacoes de Dados

### 11.1 CPF/CNPJ

```typescript
// Interno: apenas digitos
const formatarCpfCnpj = (valor: string): string => {
  return valor.replace(/\D/g, '');
};

// NFS-e SP: elemento CNPJ ou CPF separado
const paraElementoSP = (cpfCnpj: string): string => {
  const limpo = formatarCpfCnpj(cpfCnpj);
  return limpo.length === 14 
    ? `<CNPJ>${limpo}</CNPJ>` 
    : `<CPF>${limpo}</CPF>`;
};
```

### 11.2 Valores Monetarios

```typescript
// Interno: number (BigDecimal recomendado)
// XML: Decimal(15,2) sem separador de milhar

const formatarValor = (valor: number): string => {
  return valor.toFixed(2);
};
```

### 11.3 Datas

```typescript
// NFS-e SP: YYYY-MM-DD
// NFS-e ADN: YYYY-MM-DDThh:mm:ssTZD
// NF-e: YYYY-MM-DDThh:mm:ssTZD

const formatarDataSP = (data: Date): string => {
  return data.toISOString().split('T')[0];
};

const formatarDataCompleta = (data: Date): string => {
  return data.toISOString().replace('Z', '-03:00');
};
```

---

## 12. Validacao de Contratos

### 12.1 Validador Generico

```typescript
interface ValidacaoResult {
  valido: boolean;
  erros: ErroValidacao[];
}

interface ErroValidacao {
  campo: string;
  codigo: string;
  mensagem: string;
}

const validarDocumentoFiscal = (doc: DocumentoFiscal): ValidacaoResult => {
  const erros: ErroValidacao[] = [];
  
  // Validacoes comuns
  if (!doc.emitente.cpfCnpj) {
    erros.push({ campo: 'emitente.cpfCnpj', codigo: 'REQ001', mensagem: 'CPF/CNPJ obrigatorio' });
  }
  
  if (!doc.itens.length) {
    erros.push({ campo: 'itens', codigo: 'REQ002', mensagem: 'Pelo menos um item obrigatorio' });
  }
  
  // Validacoes especificas por tipo
  const validadorEspecifico = getValidador(doc.tipoDocumento);
  erros.push(...validadorEspecifico(doc));
  
  return { valido: erros.length === 0, erros };
};
```

### 12.2 Validacoes Especificas

| Tipo | Validacao |
|------|-----------|
| NFSE_SP | inscricaoMunicipal obrigatoria, servico obrigatorio |
| NFSE_NACIONAL | cTribNac obrigatorio, localPrestacao obrigatorio |
| NFE | inscricaoEstadual obrigatoria, ICMS obrigatorio |
| NFCE | pagamento obrigatorio, qrCode obrigatorio |



