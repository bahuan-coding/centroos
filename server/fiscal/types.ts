/**
 * Motor Fiscal - Tipos Canônicos
 * 
 * Ref: docs/spec-fiscal/03-contratos-canonicos.md
 * 
 * Tipos unificados para NFS-e SP, NFS-e Nacional, NF-e e NFC-e
 */

// ============================================================================
// ENUMS
// ============================================================================

export type TipoDocumento = 'NFSE_SP' | 'NFSE_NACIONAL' | 'NFE' | 'NFCE';

export enum EstadoDocumentoFiscal {
  RASCUNHO = 'RASCUNHO',
  VALIDADO = 'VALIDADO',
  TRANSMITIDO = 'TRANSMITIDO',
  AUTORIZADO = 'AUTORIZADO',
  REJEITADO = 'REJEITADO',
  DENEGADO = 'DENEGADO',
  CANCELAMENTO_PENDENTE = 'CANCELAMENTO_PENDENTE',
  CANCELADO = 'CANCELADO',
  SUBSTITUIDO = 'SUBSTITUIDO',
  INUTILIZADO = 'INUTILIZADO',
}

export enum RegimeTributario {
  SIMPLES_NACIONAL = 'SIMPLES_NACIONAL',
  LUCRO_PRESUMIDO = 'LUCRO_PRESUMIDO',
  LUCRO_REAL = 'LUCRO_REAL',
  MEI = 'MEI',
}

export enum OpSimplesNacional {
  NAO_OPTANTE = 1,
  OPTANTE_MEI = 2,
  OPTANTE_ME_EPP = 3,
}

export enum RegimeEspecialTributacao {
  NENHUM = 0,
  ATO_COOPERADO = 1,
  ESTIMATIVA = 2,
  MICROEMPRESA_MUNICIPAL = 3,
  NOTARIO_REGISTRADOR = 4,
  PROFISSIONAL_AUTONOMO = 5,
  SOCIEDADE_PROFISSIONAIS = 6,
}

export enum TribISSQN {
  TRIBUTAVEL = 1,
  IMUNE = 2,
  EXPORTACAO = 3,
  NAO_INCIDENTE = 4,
}

export enum TipoRetISSQN {
  NAO_RETIDO = 1,
  RETIDO_TOMADOR = 2,
  RETIDO_INTERMEDIARIO = 3,
}

export enum TipoPagamento {
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

// ============================================================================
// ENDERECO
// ============================================================================

export interface Endereco {
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

// ============================================================================
// PARTES (EMITENTE, DESTINATARIO, INTERMEDIARIO)
// ============================================================================

export interface Emitente {
  cpfCnpj: string;
  inscricaoMunicipal?: string;
  inscricaoEstadual?: string;
  razaoSocial: string;
  nomeFantasia?: string;
  endereco: Endereco;
  email?: string;
  telefone?: string;
  regimeTributario: RegimeTributario;
  simplesNacional: OpSimplesNacional;
  regimeEspecial?: RegimeEspecialTributacao;
  crt?: 1 | 2 | 3 | 4; // NF-e/NFC-e
}

export interface Destinatario {
  cpfCnpj?: string;
  inscricaoMunicipal?: string;
  inscricaoEstadual?: string;
  idEstrangeiro?: string;
  razaoSocial?: string;
  endereco?: Endereco;
  email?: string;
  telefone?: string;
  indicadorIE?: 1 | 2 | 9;
  isConsumidorFinal: boolean;
}

export interface Intermediario {
  cpfCnpj: string;
  razaoSocial?: string;
  inscricaoMunicipal?: string;
}

// ============================================================================
// SERVICO (NFS-e)
// ============================================================================

export interface Servico {
  codigoLC116: string;           // Ex: "01.08"
  codigoTribNacional?: string;   // cTribNac 6 digitos
  codigoTribMunicipal?: string;
  codigoNBS?: string;
  descricao: string;
  localPrestacao: string;        // IBGE
  paisPrestacao?: string;
}

// ============================================================================
// PRODUTO (NF-e/NFC-e)
// ============================================================================

export interface Produto {
  codigo: string;
  codigoBarras?: string;
  descricao: string;
  ncm: string;
  cest?: string;
  cfop: string;
  unidade: string;
  quantidade: number;
  valorUnitario: number;
}

// ============================================================================
// TRIBUTOS
// ============================================================================

export interface TributosISS {
  tributacao: TribISSQN;
  aliquota: number;
  baseCalculo: number;
  valorISS: number;
  tipoRetencao: TipoRetISSQN;
  valorRetido?: number;
  codigoMunicipioIncidencia?: string;
}

export interface TributosICMS {
  cst: string;
  baseCalculo: number;
  aliquota: number;
  valorICMS: number;
  vICMSUFDest?: number;
  vICMSUFRemet?: number;
  vFCP?: number;
}

export interface TributosIPI {
  cst: string;
  baseCalculo: number;
  aliquota: number;
  valorIPI: number;
}

export interface TributosPIS {
  cst: string;
  baseCalculo: number;
  aliquota: number;
  valorPIS: number;
  valorRetido?: number;
}

export interface TributosCOFINS {
  cst: string;
  baseCalculo: number;
  aliquota: number;
  valorCOFINS: number;
  valorRetido?: number;
}

export interface Retencoes {
  irrf?: number;
  csll?: number;
  inss?: number;
  pis?: number;
  cofins?: number;
}

export interface Tributos {
  iss?: TributosISS;
  icms?: TributosICMS;
  ipi?: TributosIPI;
  pis?: TributosPIS;
  cofins?: TributosCOFINS;
  retencoes?: Retencoes;
}

export interface TributosItem {
  iss?: TributosISS;
  icms?: TributosICMS;
  ipi?: TributosIPI;
  pis?: TributosPIS;
  cofins?: TributosCOFINS;
}

// ============================================================================
// ITEM DO DOCUMENTO
// ============================================================================

export interface ItemDocumento {
  numero: number;
  servico?: Servico;
  produto?: Produto;
  valorBruto: number;
  valorDesconto?: number;
  valorLiquido: number;
  tributosItem: TributosItem;
}

// ============================================================================
// TOTAIS
// ============================================================================

export interface Totais {
  valorServicos: number;
  valorProdutos: number;
  valorDesconto: number;
  valorDeducoes: number;
  baseCalculoISS: number;
  baseCalculoICMS: number;
  valorISS: number;
  valorICMS: number;
  valorIPI: number;
  valorPIS: number;
  valorCOFINS: number;
  valorRetencoesTotal: number;
  valorLiquido: number;
  valorTotal: number;
}

// ============================================================================
// PAGAMENTO (NF-e/NFC-e)
// ============================================================================

export interface FormaPagamento {
  tipo: TipoPagamento;
  valor: number;
  bandeira?: string;
  cnpjCredenciadora?: string;
  autorizacao?: string;
}

export interface Pagamento {
  formas: FormaPagamento[];
  troco?: number;
}

// ============================================================================
// TRANSPORTE (NF-e)
// ============================================================================

export interface Transporte {
  modalidade: 0 | 1 | 2 | 3 | 4 | 9;
  transportadora?: {
    cpfCnpj?: string;
    razaoSocial?: string;
    inscricaoEstadual?: string;
    endereco?: Endereco;
  };
  volumes?: {
    quantidade: number;
    especie?: string;
    marca?: string;
    numeracao?: string;
    pesoLiquido?: number;
    pesoBruto?: number;
  }[];
}

// ============================================================================
// DOCUMENTO FISCAL (PRINCIPAL)
// ============================================================================

export interface DocumentoFiscal {
  // Identificacao interna
  id: string;
  idIdempotencia: string;
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
  competencia: Date;
  dataAutorizacao?: Date;
  
  // Partes
  emitente: Emitente;
  destinatario?: Destinatario;
  intermediario?: Intermediario;
  
  // Itens
  itens: ItemDocumento[];
  
  // Totais e tributos
  totais: Totais;
  tributos: Tributos;
  
  // Pagamento (NF-e/NFC-e)
  pagamento?: Pagamento;
  
  // Transporte (NF-e)
  transporte?: Transporte;
  
  // Informacoes adicionais
  informacoesComplementares?: string;
  informacoesFisco?: string;
  
  // Ambiente
  ambiente: 'PRODUCAO' | 'HOMOLOGACAO';
  
  // Metadados
  orgId: string;
  criadoEm: Date;
  atualizadoEm: Date;
  versao: number;
}

// ============================================================================
// TRANSICAO DE ESTADO
// ============================================================================

export interface TransicaoEstado {
  de: EstadoDocumentoFiscal;
  para: EstadoDocumentoFiscal;
  timestamp: Date;
  motivo: string;
  autor?: string;
  eventoFiscal?: string;
  protocoloAutoridade?: string;
}

// ============================================================================
// RESULTADO DE OPERACOES
// ============================================================================

export interface ResultadoEmissao {
  sucesso: boolean;
  documento?: DocumentoFiscal;
  chaveAcesso?: string;
  protocoloAutorizacao?: string;
  erro?: ErroFiscal;
  origem: 'emissao' | 'cache' | 'conciliacao';
}

export interface ResultadoCancelamento {
  sucesso: boolean;
  protocolo?: string;
  dataCancelamento?: Date;
  erro?: ErroFiscal;
  origem: 'cancelamento' | 'cache' | 'conciliacao';
}

// ============================================================================
// ERROS
// ============================================================================

export enum CategoriaErro {
  VALIDACAO = 'VALIDACAO',
  SCHEMA = 'SCHEMA',
  AUTENTICACAO = 'AUTENTICACAO',
  AUTORIZACAO = 'AUTORIZACAO',
  REJEICAO = 'REJEICAO',
  DENEGACAO = 'DENEGACAO',
  AMBIENTE = 'AMBIENTE',
  TIMEOUT = 'TIMEOUT',
  INTERNO = 'INTERNO',
}

export interface ErroFiscal {
  codigo: string;
  categoria: CategoriaErro;
  mensagem: string;
  mensagemUsuario: string;
  tipoDocumento?: TipoDocumento;
  campo?: string;
  valorRecebido?: string;
  valorEsperado?: string;
  codigoAutoridade?: string;
  mensagemAutoridade?: string;
  recuperavel: boolean;
  acaoSugerida: string;
}

// ============================================================================
// DECISOR FISCAL
// ============================================================================

export interface DecisaoFiscalInput {
  tipoOperacao: 'SERVICO' | 'MERCADORIA' | 'MISTO';
  emitente: {
    cpfCnpj: string;
    uf: string;
    codigoMunicipio: string;
    inscricaoEstadual?: string;
    inscricaoMunicipal?: string;
    regimeTributario: RegimeTributario;
  };
  destinatario: {
    tipo: 'PJ' | 'PF' | 'ESTRANGEIRO';
    cpfCnpj?: string;
    uf?: string;
    codigoMunicipio?: string;
    isConsumidorFinal: boolean;
  };
  localVenda: 'PRESENCIAL' | 'INTERNET' | 'TELEFONE' | 'DOMICILIO';
  valorTotal: number;
  servico?: {
    codigoLC116: string;
    codigoTribNacional?: string;
  };
  mercadoria?: {
    ncm: string;
    cfop: string;
  };
}

export interface DecisaoFiscalOutput {
  tipoDocumento: TipoDocumento;
  motivo: string;
  regras: string[];
}

// ============================================================================
// AUDITORIA
// ============================================================================

export interface AuditRecord {
  id: string;
  timestamp: Date;
  operacao: 'emissao' | 'consulta' | 'cancelamento' | 'substituicao' | 'evento' | 'conciliacao';
  tipoDocumento: TipoDocumento;
  documentoId: string;
  chaveAcesso?: string;
  numero?: string;
  userId: string;
  orgId: string;
  ipOrigem: string;
  userAgent?: string;
  certificadoSerial?: string;
  certificadoCNPJ?: string;
  sucesso: boolean;
  codigoRetorno?: string;
  protocoloAutoridade?: string;
  hashXML?: string;
  hashResposta?: string;
  durationMs: number;
}


