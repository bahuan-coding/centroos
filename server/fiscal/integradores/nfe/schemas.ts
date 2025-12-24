/**
 * NF-e / NFC-e - Tipos TypeScript baseados nos XSDs oficiais
 * 
 * Ref: docs/nfe-nfce/xsd/nfe/PL_010b_NT2025_002_v1.30/leiauteNFe_v4.00.xsd
 * Versão: 4.00
 */

// ============================================================================
// ENUMS E TIPOS BÁSICOS
// ============================================================================

/** Modelo do documento fiscal */
export type TModelo = '55' | '65'; // 55 = NF-e, 65 = NFC-e

/** Ambiente */
export type TAmbiente = '1' | '2'; // 1 = Produção, 2 = Homologação

/** Tipo da NF (entrada/saída) */
export type TTipoNF = '0' | '1'; // 0 = Entrada, 1 = Saída

/** Identificador de destino da operação */
export type TIdDestino = '1' | '2' | '3'; // 1 = Interna, 2 = Interestadual, 3 = Exterior

/** Formato de impressão DANFE */
export type TTipoImpressao = '0' | '1' | '2' | '3' | '4' | '5';
// 0 = Sem DANFE, 1 = Retrato, 2 = Paisagem, 3 = Simplificado, 4 = NFC-e, 5 = NFC-e msg eletrônica

/** Tipo de emissão */
export type TTipoEmissao = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '9';
// 1 = Normal, 2 = FS, 3 = NFF, 4 = DPEC, 5 = FSDA, 6 = SVC-AN, 7 = SVC-RS, 9 = Offline NFC-e

/** Finalidade da NF-e */
export type TFinalidadeNFe = '1' | '2' | '3' | '4' | '5' | '6';
// 1 = Normal, 2 = Complementar, 3 = Ajuste, 4 = Devolução, 5 = Crédito, 6 = Débito

/** Indicador de consumidor final */
export type TIndConsumidorFinal = '0' | '1'; // 0 = Não, 1 = Sim

/** Indicador de presença do comprador */
export type TIndPresenca = '0' | '1' | '2' | '3' | '4' | '5' | '9';
// 0 = N/A, 1 = Presencial, 2 = Internet, 3 = Teleatendimento, 4 = Domicílio, 5 = Fora estab., 9 = Outros

/** Processo de emissão */
export type TProcEmissao = '0' | '1' | '2' | '3';
// 0 = Aplicativo contribuinte, 1 = Avulsa Fisco, 2 = Avulsa site, 3 = Aplicativo Fisco

/** Código UF IBGE */
export type TCodUF = 
  | '11' | '12' | '13' | '14' | '15' | '16' | '17' // Norte
  | '21' | '22' | '23' | '24' | '25' | '26' | '27' | '28' | '29' // Nordeste
  | '31' | '32' | '33' | '35' // Sudeste
  | '41' | '42' | '43' // Sul
  | '50' | '51' | '52' | '53'; // Centro-Oeste

/** Mapeamento UF -> Código IBGE */
export const UF_CODIGO: Record<string, TCodUF> = {
  'AC': '12', 'AL': '27', 'AM': '13', 'AP': '16', 'BA': '29',
  'CE': '23', 'DF': '53', 'ES': '32', 'GO': '52', 'MA': '21',
  'MG': '31', 'MS': '50', 'MT': '51', 'PA': '15', 'PB': '25',
  'PE': '26', 'PI': '22', 'PR': '41', 'RJ': '33', 'RN': '24',
  'RO': '11', 'RR': '14', 'RS': '43', 'SC': '42', 'SE': '28',
  'SP': '35', 'TO': '17',
};

/** Códigos de situação tributária ICMS */
export type TCST_ICMS = 
  | '00' | '10' | '20' | '30' | '40' | '41' | '50' | '51' | '60' | '70' | '90';

/** CSOSN - Simples Nacional */
export type TCSOSN = 
  | '101' | '102' | '103' | '201' | '202' | '203' | '300' | '400' | '500' | '900';

/** CST PIS/COFINS */
export type TCST_PISCOFINS = 
  | '01' | '02' | '03' | '04' | '05' | '06' | '07' | '08' | '09' | '49'
  | '50' | '51' | '52' | '53' | '54' | '55' | '56' | '60' | '61' | '62' 
  | '63' | '64' | '65' | '66' | '67' | '70' | '71' | '72' | '73' | '74' 
  | '75' | '98' | '99';

/** Meios de pagamento */
export type TMeioPagamento = 
  | '01' | '02' | '03' | '04' | '05' | '10' | '11' | '12' | '13' 
  | '15' | '16' | '17' | '18' | '19' | '90' | '99';

// ============================================================================
// IDENTIFICAÇÃO DA NF-e (ide)
// ============================================================================

export interface TNFeIde {
  /** Código da UF do emitente (tabela IBGE) */
  cUF: TCodUF;
  /** Código numérico que compõe a chave de acesso (8 dígitos aleatórios) */
  cNF: string;
  /** Descrição da natureza da operação */
  natOp: string;
  /** Modelo do documento fiscal (55=NF-e, 65=NFC-e) */
  mod: TModelo;
  /** Série do documento fiscal */
  serie: string;
  /** Número do documento fiscal */
  nNF: string;
  /** Data e hora de emissão (ISO 8601) */
  dhEmi: string;
  /** Data e hora de saída/entrada (opcional) */
  dhSaiEnt?: string;
  /** Tipo da NF (0=entrada, 1=saída) */
  tpNF: TTipoNF;
  /** Identificador de destino (1=Interna, 2=Interestadual, 3=Exterior) */
  idDest: TIdDestino;
  /** Código do município do fato gerador (IBGE) */
  cMunFG: string;
  /** Formato de impressão do DANFE */
  tpImp: TTipoImpressao;
  /** Tipo de emissão */
  tpEmis: TTipoEmissao;
  /** Dígito verificador da chave de acesso */
  cDV: string;
  /** Ambiente (1=Produção, 2=Homologação) */
  tpAmb: TAmbiente;
  /** Finalidade da emissão */
  finNFe: TFinalidadeNFe;
  /** Indicador de consumidor final */
  indFinal: TIndConsumidorFinal;
  /** Indicador de presença do comprador */
  indPres: TIndPresenca;
  /** Indicador de intermediador (0=sem, 1=com) */
  indIntermed?: '0' | '1';
  /** Processo de emissão */
  procEmi: TProcEmissao;
  /** Versão do aplicativo emissor */
  verProc: string;
  /** Data/hora de entrada em contingência */
  dhCont?: string;
  /** Justificativa da contingência */
  xJust?: string;
}

// ============================================================================
// EMITENTE (emit)
// ============================================================================

export interface TNFeEmitente {
  /** CNPJ do emitente */
  CNPJ?: string;
  /** CPF do emitente (produtor rural) */
  CPF?: string;
  /** Razão social */
  xNome: string;
  /** Nome fantasia */
  xFant?: string;
  /** Endereço do emitente */
  enderEmit: TNFeEndereco;
  /** Inscrição Estadual */
  IE: string;
  /** Inscrição Estadual do Substituto Tributário */
  IEST?: string;
  /** Inscrição Municipal */
  IM?: string;
  /** CNAE fiscal */
  CNAE?: string;
  /** Código de Regime Tributário */
  CRT: '1' | '2' | '3' | '4'; // 1=Simples, 2=Simples excesso, 3=Regime Normal, 4=MEI
}

// ============================================================================
// DESTINATÁRIO (dest)
// ============================================================================

export interface TNFeDestinatario {
  /** CNPJ do destinatário */
  CNPJ?: string;
  /** CPF do destinatário */
  CPF?: string;
  /** Identificação do destinatário estrangeiro */
  idEstrangeiro?: string;
  /** Razão social ou nome */
  xNome?: string;
  /** Endereço do destinatário */
  enderDest?: TNFeEndereco;
  /** Indicador da IE do destinatário */
  indIEDest: '1' | '2' | '9'; // 1=Contribuinte, 2=Isento, 9=Não contribuinte
  /** Inscrição Estadual */
  IE?: string;
  /** Inscrição SUFRAMA */
  ISUF?: string;
  /** Inscrição Municipal */
  IM?: string;
  /** E-mail */
  email?: string;
}

// ============================================================================
// ENDEREÇO
// ============================================================================

export interface TNFeEndereco {
  /** Logradouro */
  xLgr: string;
  /** Número */
  nro: string;
  /** Complemento */
  xCpl?: string;
  /** Bairro */
  xBairro: string;
  /** Código do município (IBGE) */
  cMun: string;
  /** Nome do município */
  xMun: string;
  /** UF */
  UF: string;
  /** CEP */
  CEP?: string;
  /** Código do país (1058=Brasil) */
  cPais?: string;
  /** Nome do país */
  xPais?: string;
  /** Telefone */
  fone?: string;
}

// ============================================================================
// PRODUTO (det/prod)
// ============================================================================

export interface TNFeProduto {
  /** Código do produto */
  cProd: string;
  /** GTIN (EAN) */
  cEAN: string;
  /** GTIN da unidade tributável */
  cEANTrib: string;
  /** Descrição do produto */
  xProd: string;
  /** NCM */
  NCM: string;
  /** NVE (Nomenclatura de Valor Aduaneiro) */
  NVE?: string[];
  /** CEST (Código Especificador da Substituição Tributária) */
  CEST?: string;
  /** Indicador de escala relevante */
  indEscala?: 'S' | 'N';
  /** CNPJ do fabricante */
  CNPJFab?: string;
  /** Código de benefício fiscal */
  cBenef?: string;
  /** Código EX TIPI */
  EXTIPI?: string;
  /** CFOP */
  CFOP: string;
  /** Unidade comercial */
  uCom: string;
  /** Quantidade comercial */
  qCom: string;
  /** Valor unitário de comercialização */
  vUnCom: string;
  /** Valor total bruto */
  vProd: string;
  /** Unidade tributável */
  uTrib: string;
  /** Quantidade tributável */
  qTrib: string;
  /** Valor unitário de tributação */
  vUnTrib: string;
  /** Valor do frete */
  vFrete?: string;
  /** Valor do seguro */
  vSeg?: string;
  /** Valor do desconto */
  vDesc?: string;
  /** Outras despesas acessórias */
  vOutro?: string;
  /** Indica se compõe o total da NF-e */
  indTot: '0' | '1'; // 0=Não, 1=Sim
  /** Informações adicionais do produto */
  infAdProd?: string;
}

// ============================================================================
// IMPOSTOS (det/imposto)
// ============================================================================

export interface TNFeImposto {
  /** Valor aproximado dos tributos */
  vTotTrib?: string;
  /** ICMS */
  ICMS?: TNFeICMS;
  /** IPI */
  IPI?: TNFeIPI;
  /** PIS */
  PIS?: TNFePIS;
  /** COFINS */
  COFINS?: TNFeCOFINS;
}

export interface TNFeICMS {
  /** ICMS Normal */
  ICMS00?: {
    orig: string;
    CST: '00';
    modBC: '0' | '1' | '2' | '3';
    vBC: string;
    pICMS: string;
    vICMS: string;
    pFCP?: string;
    vFCP?: string;
  };
  /** ICMS com redução de base de cálculo */
  ICMS20?: {
    orig: string;
    CST: '20';
    modBC: '0' | '1' | '2' | '3';
    pRedBC: string;
    vBC: string;
    pICMS: string;
    vICMS: string;
    vBCFCP?: string;
    pFCP?: string;
    vFCP?: string;
  };
  /** ICMS isento ou não tributado */
  ICMS40?: {
    orig: string;
    CST: '40' | '41' | '50';
    vICMSDeson?: string;
    motDesICMS?: string;
  };
  /** ICMS Simples Nacional */
  ICMSSN102?: {
    orig: string;
    CSOSN: '102' | '103' | '300' | '400';
  };
  /** ICMS Simples Nacional com crédito */
  ICMSSN101?: {
    orig: string;
    CSOSN: '101';
    pCredSN: string;
    vCredICMSSN: string;
  };
  /** ICMS Simples Nacional tributação normal */
  ICMSSN500?: {
    orig: string;
    CSOSN: '500';
    vBCSTRet?: string;
    pST?: string;
    vICMSSubstituto?: string;
    vICMSSTRet?: string;
  };
  /** ICMS Simples Nacional outros */
  ICMSSN900?: {
    orig: string;
    CSOSN: '900';
    modBC?: string;
    vBC?: string;
    pRedBC?: string;
    pICMS?: string;
    vICMS?: string;
    modBCST?: string;
    pMVAST?: string;
    pRedBCST?: string;
    vBCST?: string;
    pICMSST?: string;
    vICMSST?: string;
    pCredSN?: string;
    vCredICMSSN?: string;
  };
}

export interface TNFeIPI {
  /** Código de enquadramento legal */
  cEnq: string;
  /** IPI tributado */
  IPITrib?: {
    CST: '00' | '49' | '50' | '99';
    vBC?: string;
    pIPI?: string;
    qUnid?: string;
    vUnid?: string;
    vIPI: string;
  };
  /** IPI não tributado */
  IPINT?: {
    CST: '01' | '02' | '03' | '04' | '05' | '51' | '52' | '53' | '54' | '55';
  };
}

export interface TNFePIS {
  /** PIS alíquota */
  PISAliq?: {
    CST: '01' | '02';
    vBC: string;
    pPIS: string;
    vPIS: string;
  };
  /** PIS quantidade */
  PISQtde?: {
    CST: '03';
    qBCProd: string;
    vAliqProd: string;
    vPIS: string;
  };
  /** PIS não tributado */
  PISNT?: {
    CST: '04' | '05' | '06' | '07' | '08' | '09';
  };
  /** PIS outros */
  PISOutr?: {
    CST: TCST_PISCOFINS;
    vBC?: string;
    pPIS?: string;
    qBCProd?: string;
    vAliqProd?: string;
    vPIS?: string;
  };
}

export interface TNFeCOFINS {
  /** COFINS alíquota */
  COFINSAliq?: {
    CST: '01' | '02';
    vBC: string;
    pCOFINS: string;
    vCOFINS: string;
  };
  /** COFINS quantidade */
  COFINSQtde?: {
    CST: '03';
    qBCProd: string;
    vAliqProd: string;
    vCOFINS: string;
  };
  /** COFINS não tributado */
  COFINSNT?: {
    CST: '04' | '05' | '06' | '07' | '08' | '09';
  };
  /** COFINS outros */
  COFINSOutr?: {
    CST: TCST_PISCOFINS;
    vBC?: string;
    pCOFINS?: string;
    qBCProd?: string;
    vAliqProd?: string;
    vCOFINS?: string;
  };
}

// ============================================================================
// ITEM (det)
// ============================================================================

export interface TNFeItem {
  /** Número sequencial do item */
  nItem: string;
  /** Produto */
  prod: TNFeProduto;
  /** Impostos */
  imposto: TNFeImposto;
  /** Informações adicionais */
  infAdProd?: string;
}

// ============================================================================
// TOTAIS (total)
// ============================================================================

export interface TNFeTotal {
  /** ICMS Total */
  ICMSTot: {
    /** Base de cálculo ICMS */
    vBC: string;
    /** Valor total do ICMS */
    vICMS: string;
    /** Valor total do ICMS desonerado */
    vICMSDeson?: string;
    /** Valor do FCP UF destino */
    vFCPUFDest?: string;
    /** Valor do ICMS UF destino */
    vICMSUFDest?: string;
    /** Valor do ICMS UF remetente */
    vICMSUFRemet?: string;
    /** Valor do FCP */
    vFCP?: string;
    /** Base de cálculo ICMS ST */
    vBCST: string;
    /** Valor total do ICMS ST */
    vST: string;
    /** Valor do FCP ST */
    vFCPST?: string;
    /** Valor do FCP ST retido */
    vFCPSTRet?: string;
    /** Valor total dos produtos */
    vProd: string;
    /** Valor total do frete */
    vFrete: string;
    /** Valor total do seguro */
    vSeg: string;
    /** Valor total do desconto */
    vDesc: string;
    /** Valor total do II */
    vII: string;
    /** Valor total do IPI */
    vIPI: string;
    /** Valor total do IPI devolvido */
    vIPIDevol?: string;
    /** Valor total do PIS */
    vPIS: string;
    /** Valor total do COFINS */
    vCOFINS: string;
    /** Outras despesas acessórias */
    vOutro: string;
    /** Valor total da NF-e */
    vNF: string;
    /** Valor aproximado total de tributos */
    vTotTrib?: string;
  };
}

// ============================================================================
// TRANSPORTE (transp)
// ============================================================================

export interface TNFeTransporte {
  /** Modalidade do frete */
  modFrete: '0' | '1' | '2' | '3' | '4' | '9';
  // 0=Emitente, 1=Destinatário, 2=Terceiros, 3=Próprio remetente, 4=Próprio destinatário, 9=Sem frete
  /** Transportadora */
  transporta?: {
    CNPJ?: string;
    CPF?: string;
    xNome?: string;
    IE?: string;
    xEnder?: string;
    xMun?: string;
    UF?: string;
  };
  /** Veículo */
  veicTransp?: {
    placa: string;
    UF?: string;
    RNTC?: string;
  };
  /** Volumes */
  vol?: Array<{
    qVol?: string;
    esp?: string;
    marca?: string;
    nVol?: string;
    pesoL?: string;
    pesoB?: string;
  }>;
}

// ============================================================================
// PAGAMENTO (pag)
// ============================================================================

export interface TNFePagamento {
  /** Detalhamento do pagamento */
  detPag: Array<{
    /** Indicador da forma de pagamento */
    indPag?: '0' | '1'; // 0=à vista, 1=a prazo
    /** Meio de pagamento */
    tPag: TMeioPagamento;
    /** Descrição do meio de pagamento */
    xPag?: string;
    /** Valor do pagamento */
    vPag: string;
    /** Dados do cartão */
    card?: {
      tpIntegra: '1' | '2'; // 1=Integrado, 2=Não integrado
      CNPJ?: string;
      tBand?: string;
      cAut?: string;
    };
  }>;
  /** Valor do troco */
  vTroco?: string;
}

// ============================================================================
// INFORMAÇÕES ADICIONAIS (infAdic)
// ============================================================================

export interface TNFeInfAdicionais {
  /** Informações adicionais de interesse do Fisco */
  infAdFisco?: string;
  /** Informações complementares de interesse do contribuinte */
  infCpl?: string;
  /** Observações do contribuinte */
  obsCont?: Array<{
    xCampo: string;
    xTexto: string;
  }>;
  /** Observações do Fisco */
  obsFisco?: Array<{
    xCampo: string;
    xTexto: string;
  }>;
}

// ============================================================================
// NF-e COMPLETA
// ============================================================================

export interface TNFe {
  /** Informações da NF-e */
  infNFe: {
    /** Versão do leiaute */
    versao: '4.00';
    /** Identificador da tag (Id) */
    Id: string;
    /** Identificação da NF-e */
    ide: TNFeIde;
    /** Emitente */
    emit: TNFeEmitente;
    /** Destinatário */
    dest?: TNFeDestinatario;
    /** Itens */
    det: TNFeItem[];
    /** Totais */
    total: TNFeTotal;
    /** Transporte */
    transp: TNFeTransporte;
    /** Pagamento */
    pag: TNFePagamento;
    /** Informações adicionais */
    infAdic?: TNFeInfAdicionais;
  };
  /** Assinatura digital */
  Signature?: any;
}

// ============================================================================
// ENVELOPE SOAP - AUTORIZAÇÃO
// ============================================================================

export interface TNFeAutorizacao {
  /** Versão do serviço */
  versao: '4.00';
  /** Identificador de controle do lote */
  idLote: string;
  /** Indicador de processamento síncrono (1=síncrono) */
  indSinc: '0' | '1';
  /** NF-e assinadas */
  NFe: TNFe[];
}

// ============================================================================
// RETORNO DA AUTORIZAÇÃO
// ============================================================================

export interface TRetornoAutorizacao {
  /** Versão */
  versao: string;
  /** Ambiente */
  tpAmb: TAmbiente;
  /** Versão do aplicativo */
  verAplic: string;
  /** Código do status */
  cStat: string;
  /** Descrição do status */
  xMotivo: string;
  /** Código da UF */
  cUF: string;
  /** Data/hora do recebimento */
  dhRecbto: string;
  /** Protocolo de autorização */
  protNFe?: TProtocoloNFe;
  /** Informações do recibo (para processamento assíncrono) */
  infRec?: {
    nRec: string;
    tMed: string;
  };
}

export interface TProtocoloNFe {
  /** Versão */
  versao: string;
  /** Informações do protocolo */
  infProt: {
    /** Ambiente */
    tpAmb: TAmbiente;
    /** Versão do aplicativo */
    verAplic: string;
    /** Chave de acesso */
    chNFe: string;
    /** Data/hora do processamento */
    dhRecbto: string;
    /** Número do protocolo */
    nProt?: string;
    /** Digest value da NF-e */
    digVal?: string;
    /** Código do status */
    cStat: string;
    /** Descrição do motivo */
    xMotivo: string;
  };
}

// ============================================================================
// STATUS DO SERVIÇO
// ============================================================================

export interface TConsultaStatus {
  versao: '4.00';
  tpAmb: TAmbiente;
  cUF: TCodUF;
  xServ: 'STATUS';
}

export interface TRetornoStatus {
  versao: string;
  tpAmb: TAmbiente;
  verAplic: string;
  cStat: string;
  xMotivo: string;
  cUF: string;
  dhRecbto: string;
  tMed?: string;
  dhRetorno?: string;
  xObs?: string;
}

// ============================================================================
// CONSULTA POR CHAVE
// ============================================================================

export interface TConsultaProtocolo {
  versao: '4.00';
  tpAmb: TAmbiente;
  xServ: 'CONSULTAR';
  chNFe: string;
}

export interface TRetornoConsulta {
  versao: string;
  tpAmb: TAmbiente;
  verAplic: string;
  cStat: string;
  xMotivo: string;
  cUF: string;
  dhRecbto: string;
  chNFe?: string;
  protNFe?: TProtocoloNFe;
}

// ============================================================================
// CANCELAMENTO (EVENTO)
// ============================================================================

export interface TEventoCancelamento {
  versao: '1.00';
  infEvento: {
    Id: string;
    cOrgao: string;
    tpAmb: TAmbiente;
    CNPJ?: string;
    CPF?: string;
    chNFe: string;
    dhEvento: string;
    tpEvento: '110111'; // Cancelamento
    nSeqEvento: string;
    verEvento: '1.00';
    detEvento: {
      versao: '1.00';
      descEvento: 'Cancelamento';
      nProt: string;
      xJust: string;
    };
  };
}

export interface TRetornoEvento {
  versao: string;
  infEvento: {
    tpAmb: TAmbiente;
    verAplic: string;
    cOrgao: string;
    cStat: string;
    xMotivo: string;
    chNFe?: string;
    tpEvento?: string;
    xEvento?: string;
    nSeqEvento?: string;
    dhRegEvento?: string;
    nProt?: string;
  };
}

// ============================================================================
// INUTILIZAÇÃO
// ============================================================================

export interface TInutilizacao {
  versao: '4.00';
  infInut: {
    Id: string;
    tpAmb: TAmbiente;
    xServ: 'INUTILIZAR';
    cUF: TCodUF;
    ano: string;
    CNPJ: string;
    mod: TModelo;
    serie: string;
    nNFIni: string;
    nNFFin: string;
    xJust: string;
  };
}

export interface TRetornoInutilizacao {
  versao: string;
  infInut: {
    tpAmb: TAmbiente;
    verAplic: string;
    cStat: string;
    xMotivo: string;
    cUF: string;
    ano?: string;
    CNPJ?: string;
    mod?: string;
    serie?: string;
    nNFIni?: string;
    nNFFin?: string;
    dhRecbto?: string;
    nProt?: string;
  };
}

// ============================================================================
// CARTA DE CORREÇÃO (CCe)
// ============================================================================

export interface TEventoCCe {
  versao: '1.00';
  infEvento: {
    Id: string;
    cOrgao: string;
    tpAmb: TAmbiente;
    CNPJ?: string;
    CPF?: string;
    chNFe: string;
    dhEvento: string;
    tpEvento: '110110'; // CCe
    nSeqEvento: string;
    verEvento: '1.00';
    detEvento: {
      versao: '1.00';
      descEvento: 'Carta de Correcao';
      xCorrecao: string;
      xCondUso: string;
    };
  };
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Gera a chave de acesso de 44 dígitos
 */
export function gerarChaveAcesso(params: {
  cUF: TCodUF;
  dataEmissao: Date;
  CNPJ: string;
  mod: TModelo;
  serie: string;
  nNF: string;
  tpEmis: TTipoEmissao;
  cNF: string;
}): { chave: string; cDV: string } {
  const aamm = params.dataEmissao.toISOString().slice(2, 7).replace('-', '');
  const cnpjLimpo = params.CNPJ.replace(/\D/g, '').padStart(14, '0');
  const serie = params.serie.padStart(3, '0');
  const nNF = params.nNF.padStart(9, '0');
  const cNF = params.cNF.padStart(8, '0');
  
  const chave43 = `${params.cUF}${aamm}${cnpjLimpo}${params.mod}${serie}${nNF}${params.tpEmis}${cNF}`;
  
  // Calcula dígito verificador (módulo 11)
  let peso = 2;
  let soma = 0;
  for (let i = chave43.length - 1; i >= 0; i--) {
    soma += parseInt(chave43[i]) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  const resto = soma % 11;
  const cDV = resto < 2 ? '0' : String(11 - resto);
  
  return {
    chave: chave43 + cDV,
    cDV,
  };
}

/**
 * Gera código numérico aleatório (cNF)
 */
export function gerarCodigoNumerico(): string {
  return Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
}

/**
 * Formata valor monetário para XML (2 casas decimais, sem separador de milhar)
 */
export function formatarValorXML(valor: number): string {
  return valor.toFixed(2);
}

/**
 * Formata quantidade para XML (até 4 casas decimais)
 */
export function formatarQuantidadeXML(quantidade: number, casas: number = 4): string {
  return quantidade.toFixed(casas);
}

/**
 * Formata data/hora para XML (ISO 8601 com timezone)
 */
export function formatarDataHoraXML(data: Date): string {
  return data.toISOString().replace('Z', '-03:00');
}


