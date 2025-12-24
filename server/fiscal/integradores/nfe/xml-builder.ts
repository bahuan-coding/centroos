/**
 * NF-e / NFC-e - Construtor de XML
 * 
 * Gera XML válido conforme schema v4.00 para transmissão à SEFAZ
 */

import {
  TNFe,
  TNFeIde,
  TNFeEmitente,
  TNFeDestinatario,
  TNFeItem,
  TNFeTotal,
  TNFeTransporte,
  TNFePagamento,
  TNFeInfAdicionais,
  TModelo,
  TAmbiente,
  gerarChaveAcesso,
  gerarCodigoNumerico,
  formatarValorXML,
  formatarDataHoraXML,
  UF_CODIGO,
  TCodUF,
} from './schemas';

// ============================================================================
// TIPOS DE ENTRADA (SIMPLIFICADOS)
// ============================================================================

export interface NFeDadosEmissao {
  /** UF do emitente */
  uf: string;
  /** Ambiente (1=Produção, 2=Homologação) */
  ambiente: TAmbiente;
  /** Modelo (55=NF-e, 65=NFC-e) */
  modelo: TModelo;
  /** Série */
  serie: number;
  /** Número da nota */
  numero: number;
  /** Natureza da operação */
  naturezaOperacao: string;
  /** Tipo (0=entrada, 1=saída) */
  tipoOperacao: '0' | '1';
  /** Destino (1=Interna, 2=Interestadual, 3=Exterior) */
  destino: '1' | '2' | '3';
  /** Finalidade (1=Normal, 2=Complementar, 3=Ajuste, 4=Devolução) */
  finalidade: '1' | '2' | '3' | '4';
  /** Consumidor final */
  consumidorFinal: boolean;
  /** Presença do comprador */
  presenca: '0' | '1' | '2' | '3' | '4' | '5' | '9';
  /** Emitente */
  emitente: DadosEmitente;
  /** Destinatário */
  destinatario?: DadosDestinatario;
  /** Itens */
  itens: DadosItem[];
  /** Transporte */
  transporte?: DadosTransporte;
  /** Pagamentos */
  pagamentos: DadosPagamento[];
  /** Informações adicionais */
  informacoesAdicionais?: string;
  /** Contingência */
  contingencia?: {
    tipo: '1' | '2' | '5' | '6' | '7' | '9';
    dataHora: Date;
    justificativa: string;
  };
}

export interface DadosEmitente {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia?: string;
  inscricaoEstadual: string;
  inscricaoMunicipal?: string;
  crt: '1' | '2' | '3' | '4';
  endereco: DadosEndereco;
}

export interface DadosDestinatario {
  tipo: 'PJ' | 'PF' | 'ESTRANGEIRO';
  cpfCnpj?: string;
  idEstrangeiro?: string;
  nome?: string;
  email?: string;
  indicadorIE: '1' | '2' | '9';
  inscricaoEstadual?: string;
  endereco?: DadosEndereco;
}

export interface DadosEndereco {
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  codigoMunicipio: string;
  nomeMunicipio: string;
  uf: string;
  cep: string;
  telefone?: string;
}

export interface DadosItem {
  numero: number;
  codigo: string;
  descricao: string;
  ncm: string;
  cfop: string;
  unidade: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  valorDesconto?: number;
  valorFrete?: number;
  /** Origem da mercadoria (0=Nacional, 1=Estrangeira importação direta, etc) */
  origem: string;
  /** Tributação ICMS */
  tributacao: {
    /** Regime: 'normal' ou 'simples' */
    regime: 'normal' | 'simples';
    /** CST (regime normal) ou CSOSN (simples) */
    cst?: string;
    csosn?: string;
    /** Base de cálculo ICMS */
    baseCalculoICMS?: number;
    /** Alíquota ICMS */
    aliquotaICMS?: number;
    /** Valor ICMS */
    valorICMS?: number;
    /** Alíquota crédito SN */
    aliquotaCreditoSN?: number;
    /** Valor crédito SN */
    valorCreditoSN?: number;
    /** CST PIS */
    cstPIS: string;
    /** Base PIS */
    basePIS?: number;
    /** Alíquota PIS */
    aliquotaPIS?: number;
    /** Valor PIS */
    valorPIS?: number;
    /** CST COFINS */
    cstCOFINS: string;
    /** Base COFINS */
    baseCOFINS?: number;
    /** Alíquota COFINS */
    aliquotaCOFINS?: number;
    /** Valor COFINS */
    valorCOFINS?: number;
  };
}

export interface DadosTransporte {
  modalidade: '0' | '1' | '2' | '3' | '4' | '9';
  transportadora?: {
    cnpj?: string;
    cpf?: string;
    nome?: string;
    inscricaoEstadual?: string;
    endereco?: string;
    municipio?: string;
    uf?: string;
  };
  veiculo?: {
    placa: string;
    uf?: string;
    rntc?: string;
  };
  volumes?: Array<{
    quantidade?: number;
    especie?: string;
    marca?: string;
    numeracao?: string;
    pesoLiquido?: number;
    pesoBruto?: number;
  }>;
}

export interface DadosPagamento {
  forma: string;
  valor: number;
  descricao?: string;
  /** Dados do cartão */
  cartao?: {
    tipo: '1' | '2';
    cnpj?: string;
    bandeira?: string;
    autorizacao?: string;
  };
}

// ============================================================================
// BUILDER
// ============================================================================

export class NFeXmlBuilder {
  private dados: NFeDadosEmissao;
  private chaveAcesso: string = '';
  private cDV: string = '';
  private cNF: string = '';
  
  constructor(dados: NFeDadosEmissao) {
    this.dados = dados;
    this.cNF = gerarCodigoNumerico();
    this.calcularChaveAcesso();
  }
  
  /**
   * Calcula a chave de acesso de 44 dígitos
   */
  private calcularChaveAcesso(): void {
    const cUF = UF_CODIGO[this.dados.uf.toUpperCase()] as TCodUF;
    if (!cUF) {
      throw new Error(`UF inválida: ${this.dados.uf}`);
    }
    
    const resultado = gerarChaveAcesso({
      cUF,
      dataEmissao: new Date(),
      CNPJ: this.dados.emitente.cnpj,
      mod: this.dados.modelo,
      serie: this.dados.serie.toString(),
      nNF: this.dados.numero.toString(),
      tpEmis: this.dados.contingencia?.tipo || '1',
      cNF: this.cNF,
    });
    
    this.chaveAcesso = resultado.chave;
    this.cDV = resultado.cDV;
  }
  
  /**
   * Obtém a chave de acesso calculada
   */
  getChaveAcesso(): string {
    return this.chaveAcesso;
  }
  
  /**
   * Constrói o objeto TNFe completo
   */
  build(): TNFe {
    const cUF = UF_CODIGO[this.dados.uf.toUpperCase()] as TCodUF;
    
    const ide = this.buildIde(cUF);
    const emit = this.buildEmitente();
    const dest = this.dados.destinatario ? this.buildDestinatario() : undefined;
    const det = this.buildItens();
    const total = this.buildTotal();
    const transp = this.buildTransporte();
    const pag = this.buildPagamento();
    const infAdic = this.buildInformacoesAdicionais();
    
    const nfe: TNFe = {
      infNFe: {
        versao: '4.00',
        Id: `NFe${this.chaveAcesso}`,
        ide,
        emit,
        ...(dest && { dest }),
        det,
        total,
        transp,
        pag,
        ...(infAdic && { infAdic }),
      },
    };
    
    return nfe;
  }
  
  /**
   * Constrói bloco de identificação (ide)
   */
  private buildIde(cUF: TCodUF): TNFeIde {
    const agora = new Date();
    
    const ide: TNFeIde = {
      cUF,
      cNF: this.cNF,
      natOp: this.dados.naturezaOperacao,
      mod: this.dados.modelo,
      serie: this.dados.serie.toString().padStart(3, '0'),
      nNF: this.dados.numero.toString().padStart(9, '0'),
      dhEmi: formatarDataHoraXML(agora),
      tpNF: this.dados.tipoOperacao,
      idDest: this.dados.destino,
      cMunFG: this.dados.emitente.endereco.codigoMunicipio,
      tpImp: this.dados.modelo === '65' ? '4' : '1',
      tpEmis: this.dados.contingencia?.tipo || '1',
      cDV: this.cDV,
      tpAmb: this.dados.ambiente,
      finNFe: this.dados.finalidade,
      indFinal: this.dados.consumidorFinal ? '1' : '0',
      indPres: this.dados.presenca,
      procEmi: '0',
      verProc: 'CentrOS 1.0',
    };
    
    // Contingência
    if (this.dados.contingencia) {
      ide.dhCont = formatarDataHoraXML(this.dados.contingencia.dataHora);
      ide.xJust = this.dados.contingencia.justificativa;
    }
    
    return ide;
  }
  
  /**
   * Constrói bloco do emitente (emit)
   */
  private buildEmitente(): TNFeEmitente {
    const e = this.dados.emitente;
    
    return {
      CNPJ: e.cnpj.replace(/\D/g, ''),
      xNome: e.razaoSocial,
      xFant: e.nomeFantasia,
      enderEmit: {
        xLgr: e.endereco.logradouro,
        nro: e.endereco.numero,
        xCpl: e.endereco.complemento,
        xBairro: e.endereco.bairro,
        cMun: e.endereco.codigoMunicipio,
        xMun: e.endereco.nomeMunicipio,
        UF: e.endereco.uf,
        CEP: e.endereco.cep.replace(/\D/g, ''),
        cPais: '1058',
        xPais: 'BRASIL',
        fone: e.endereco.telefone?.replace(/\D/g, ''),
      },
      IE: e.inscricaoEstadual.replace(/\D/g, ''),
      IM: e.inscricaoMunicipal?.replace(/\D/g, ''),
      CRT: e.crt,
    };
  }
  
  /**
   * Constrói bloco do destinatário (dest)
   */
  private buildDestinatario(): TNFeDestinatario | undefined {
    const d = this.dados.destinatario;
    if (!d) return undefined;
    
    const dest: TNFeDestinatario = {
      indIEDest: d.indicadorIE,
    };
    
    if (d.tipo === 'PJ' && d.cpfCnpj) {
      dest.CNPJ = d.cpfCnpj.replace(/\D/g, '');
    } else if (d.tipo === 'PF' && d.cpfCnpj) {
      dest.CPF = d.cpfCnpj.replace(/\D/g, '');
    } else if (d.tipo === 'ESTRANGEIRO' && d.idEstrangeiro) {
      dest.idEstrangeiro = d.idEstrangeiro;
    }
    
    if (d.nome) {
      dest.xNome = d.nome;
    }
    
    if (d.endereco) {
      dest.enderDest = {
        xLgr: d.endereco.logradouro,
        nro: d.endereco.numero,
        xCpl: d.endereco.complemento,
        xBairro: d.endereco.bairro,
        cMun: d.endereco.codigoMunicipio,
        xMun: d.endereco.nomeMunicipio,
        UF: d.endereco.uf,
        CEP: d.endereco.cep?.replace(/\D/g, ''),
        cPais: '1058',
        xPais: 'BRASIL',
        fone: d.endereco.telefone?.replace(/\D/g, ''),
      };
    }
    
    if (d.indicadorIE === '1' && d.inscricaoEstadual) {
      dest.IE = d.inscricaoEstadual.replace(/\D/g, '');
    }
    
    if (d.email) {
      dest.email = d.email;
    }
    
    return dest;
  }
  
  /**
   * Constrói itens (det)
   */
  private buildItens(): TNFeItem[] {
    return this.dados.itens.map((item, index) => this.buildItem(item, index + 1));
  }
  
  /**
   * Constrói um item (det)
   */
  private buildItem(item: DadosItem, nItem: number): TNFeItem {
    const det: TNFeItem = {
      nItem: nItem.toString(),
      prod: {
        cProd: item.codigo,
        cEAN: 'SEM GTIN',
        cEANTrib: 'SEM GTIN',
        xProd: item.descricao,
        NCM: item.ncm.replace(/\D/g, ''),
        CFOP: item.cfop,
        uCom: item.unidade,
        qCom: formatarValorXML(item.quantidade),
        vUnCom: formatarValorXML(item.valorUnitario),
        vProd: formatarValorXML(item.valorTotal),
        uTrib: item.unidade,
        qTrib: formatarValorXML(item.quantidade),
        vUnTrib: formatarValorXML(item.valorUnitario),
        indTot: '1',
        vDesc: item.valorDesconto ? formatarValorXML(item.valorDesconto) : undefined,
        vFrete: item.valorFrete ? formatarValorXML(item.valorFrete) : undefined,
      },
      imposto: this.buildImpostoItem(item),
    };
    
    return det;
  }
  
  /**
   * Constrói impostos de um item
   */
  private buildImpostoItem(item: DadosItem): TNFeItem['imposto'] {
    const trib = item.tributacao;
    const imposto: TNFeItem['imposto'] = {};
    
    // ICMS
    if (trib.regime === 'normal') {
      if (trib.cst === '00' && trib.baseCalculoICMS && trib.aliquotaICMS) {
        imposto.ICMS = {
          ICMS00: {
            orig: item.origem,
            CST: '00',
            modBC: '3',
            vBC: formatarValorXML(trib.baseCalculoICMS),
            pICMS: formatarValorXML(trib.aliquotaICMS),
            vICMS: formatarValorXML(trib.valorICMS || 0),
          },
        };
      } else if (trib.cst === '40' || trib.cst === '41' || trib.cst === '50') {
        imposto.ICMS = {
          ICMS40: {
            orig: item.origem,
            CST: trib.cst as '40' | '41' | '50',
          },
        };
      }
    } else {
      // Simples Nacional
      if (trib.csosn === '101' && trib.aliquotaCreditoSN) {
        imposto.ICMS = {
          ICMSSN101: {
            orig: item.origem,
            CSOSN: '101',
            pCredSN: formatarValorXML(trib.aliquotaCreditoSN),
            vCredICMSSN: formatarValorXML(trib.valorCreditoSN || 0),
          },
        };
      } else if (trib.csosn === '102' || trib.csosn === '103' || trib.csosn === '300' || trib.csosn === '400') {
        imposto.ICMS = {
          ICMSSN102: {
            orig: item.origem,
            CSOSN: trib.csosn as '102' | '103' | '300' | '400',
          },
        };
      } else if (trib.csosn === '500') {
        imposto.ICMS = {
          ICMSSN500: {
            orig: item.origem,
            CSOSN: '500',
          },
        };
      }
    }
    
    // PIS
    if (trib.cstPIS === '01' || trib.cstPIS === '02') {
      imposto.PIS = {
        PISAliq: {
          CST: trib.cstPIS as '01' | '02',
          vBC: formatarValorXML(trib.basePIS || 0),
          pPIS: formatarValorXML(trib.aliquotaPIS || 0),
          vPIS: formatarValorXML(trib.valorPIS || 0),
        },
      };
    } else if (['04', '05', '06', '07', '08', '09'].includes(trib.cstPIS)) {
      imposto.PIS = {
        PISNT: {
          CST: trib.cstPIS as '04' | '05' | '06' | '07' | '08' | '09',
        },
      };
    }
    
    // COFINS
    if (trib.cstCOFINS === '01' || trib.cstCOFINS === '02') {
      imposto.COFINS = {
        COFINSAliq: {
          CST: trib.cstCOFINS as '01' | '02',
          vBC: formatarValorXML(trib.baseCOFINS || 0),
          pCOFINS: formatarValorXML(trib.aliquotaCOFINS || 0),
          vCOFINS: formatarValorXML(trib.valorCOFINS || 0),
        },
      };
    } else if (['04', '05', '06', '07', '08', '09'].includes(trib.cstCOFINS)) {
      imposto.COFINS = {
        COFINSNT: {
          CST: trib.cstCOFINS as '04' | '05' | '06' | '07' | '08' | '09',
        },
      };
    }
    
    return imposto;
  }
  
  /**
   * Constrói totais (total)
   */
  private buildTotal(): TNFeTotal {
    let vProd = 0;
    let vDesc = 0;
    let vFrete = 0;
    let vBC = 0;
    let vICMS = 0;
    let vPIS = 0;
    let vCOFINS = 0;
    
    for (const item of this.dados.itens) {
      vProd += item.valorTotal;
      vDesc += item.valorDesconto || 0;
      vFrete += item.valorFrete || 0;
      
      if (item.tributacao.baseCalculoICMS) {
        vBC += item.tributacao.baseCalculoICMS;
      }
      if (item.tributacao.valorICMS) {
        vICMS += item.tributacao.valorICMS;
      }
      if (item.tributacao.valorPIS) {
        vPIS += item.tributacao.valorPIS;
      }
      if (item.tributacao.valorCOFINS) {
        vCOFINS += item.tributacao.valorCOFINS;
      }
    }
    
    const vNF = vProd - vDesc + vFrete;
    
    return {
      ICMSTot: {
        vBC: formatarValorXML(vBC),
        vICMS: formatarValorXML(vICMS),
        vICMSDeson: '0.00',
        vBCST: '0.00',
        vST: '0.00',
        vProd: formatarValorXML(vProd),
        vFrete: formatarValorXML(vFrete),
        vSeg: '0.00',
        vDesc: formatarValorXML(vDesc),
        vII: '0.00',
        vIPI: '0.00',
        vPIS: formatarValorXML(vPIS),
        vCOFINS: formatarValorXML(vCOFINS),
        vOutro: '0.00',
        vNF: formatarValorXML(vNF),
      },
    };
  }
  
  /**
   * Constrói transporte (transp)
   */
  private buildTransporte(): TNFeTransporte {
    const t = this.dados.transporte;
    
    if (!t) {
      return { modFrete: '9' }; // Sem frete
    }
    
    const transp: TNFeTransporte = {
      modFrete: t.modalidade,
    };
    
    if (t.transportadora) {
      transp.transporta = {
        CNPJ: t.transportadora.cnpj?.replace(/\D/g, ''),
        CPF: t.transportadora.cpf?.replace(/\D/g, ''),
        xNome: t.transportadora.nome,
        IE: t.transportadora.inscricaoEstadual?.replace(/\D/g, ''),
        xEnder: t.transportadora.endereco,
        xMun: t.transportadora.municipio,
        UF: t.transportadora.uf,
      };
    }
    
    if (t.veiculo) {
      transp.veicTransp = {
        placa: t.veiculo.placa,
        UF: t.veiculo.uf,
        RNTC: t.veiculo.rntc,
      };
    }
    
    if (t.volumes && t.volumes.length > 0) {
      transp.vol = t.volumes.map(v => ({
        qVol: v.quantidade?.toString(),
        esp: v.especie,
        marca: v.marca,
        nVol: v.numeracao,
        pesoL: v.pesoLiquido ? formatarValorXML(v.pesoLiquido) : undefined,
        pesoB: v.pesoBruto ? formatarValorXML(v.pesoBruto) : undefined,
      }));
    }
    
    return transp;
  }
  
  /**
   * Constrói pagamento (pag)
   */
  private buildPagamento(): TNFePagamento {
    const vTotal = this.dados.pagamentos.reduce((sum, p) => sum + p.valor, 0);
    const vNF = this.dados.itens.reduce((sum, i) => 
      sum + i.valorTotal - (i.valorDesconto || 0) + (i.valorFrete || 0), 0);
    
    return {
      detPag: this.dados.pagamentos.map(p => ({
        tPag: p.forma as any,
        xPag: p.descricao,
        vPag: formatarValorXML(p.valor),
        card: p.cartao ? {
          tpIntegra: p.cartao.tipo,
          CNPJ: p.cartao.cnpj?.replace(/\D/g, ''),
          tBand: p.cartao.bandeira,
          cAut: p.cartao.autorizacao,
        } : undefined,
      })),
      vTroco: vTotal > vNF ? formatarValorXML(vTotal - vNF) : undefined,
    };
  }
  
  /**
   * Constrói informações adicionais (infAdic)
   */
  private buildInformacoesAdicionais(): TNFeInfAdicionais | undefined {
    if (!this.dados.informacoesAdicionais) {
      return undefined;
    }
    
    return {
      infCpl: this.dados.informacoesAdicionais,
    };
  }
  
  /**
   * Converte TNFe para string XML
   */
  toXml(): string {
    const nfe = this.build();
    return this.objectToXml(nfe, 'NFe');
  }
  
  /**
   * Converte objeto para XML (simplificado)
   */
  private objectToXml(obj: any, rootName: string, indent: number = 0): string {
    const spaces = '  '.repeat(indent);
    
    if (obj === null || obj === undefined) {
      return '';
    }
    
    if (typeof obj !== 'object') {
      return `${spaces}<${rootName}>${this.escapeXml(String(obj))}</${rootName}>\n`;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.objectToXml(item, rootName, indent)).join('');
    }
    
    let xml = `${spaces}<${rootName}`;
    
    // Atributos especiais
    if (rootName === 'infNFe') {
      xml += ` versao="${obj.versao}" Id="${obj.Id}"`;
    }
    
    xml += '>\n';
    
    for (const [key, value] of Object.entries(obj)) {
      if (key === 'versao' || key === 'Id') continue; // Já adicionado como atributo
      if (value === undefined || value === null) continue;
      xml += this.objectToXml(value, key, indent + 1);
    }
    
    xml += `${spaces}</${rootName}>\n`;
    return xml;
  }
  
  /**
   * Escapa caracteres especiais XML
   */
  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

/**
 * Cria builder de NF-e
 */
export function criarNFeBuilder(dados: NFeDadosEmissao): NFeXmlBuilder {
  return new NFeXmlBuilder(dados);
}

/**
 * Gera envelope SOAP para autorização
 */
export function gerarEnvelopeAutorizacao(xmlNFe: string, versao: string = '4.00'): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Body>
    <nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4">
      <enviNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="${versao}">
        <idLote>${Date.now()}</idLote>
        <indSinc>1</indSinc>
        ${xmlNFe}
      </enviNFe>
    </nfeDadosMsg>
  </soap12:Body>
</soap12:Envelope>`;
}

/**
 * Gera envelope SOAP para consulta de status
 */
export function gerarEnvelopeStatusServico(cUF: TCodUF, tpAmb: TAmbiente): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Body>
    <nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeStatusServico4">
      <consStatServ xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
        <tpAmb>${tpAmb}</tpAmb>
        <cUF>${cUF}</cUF>
        <xServ>STATUS</xServ>
      </consStatServ>
    </nfeDadosMsg>
  </soap12:Body>
</soap12:Envelope>`;
}

/**
 * Gera envelope SOAP para consulta por chave
 */
export function gerarEnvelopeConsultaChave(chNFe: string, tpAmb: TAmbiente): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Body>
    <nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4">
      <consSitNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
        <tpAmb>${tpAmb}</tpAmb>
        <xServ>CONSULTAR</xServ>
        <chNFe>${chNFe}</chNFe>
      </consSitNFe>
    </nfeDadosMsg>
  </soap12:Body>
</soap12:Envelope>`;
}


