/**
 * NF-e / NFC-e - Cliente SOAP para SEFAZ
 * 
 * Comunicação com web services SEFAZ via SOAP 1.2
 */

import * as https from 'https';
import * as tls from 'tls';
import { TAmbiente, TCodUF, TRetornoAutorizacao, TRetornoStatus, TRetornoConsulta, TRetornoEvento, TRetornoInutilizacao } from './schemas';
import { getEndpoint, TServico } from './endpoints';
import { NFeXmlSigner, ConfiguracaoAssinatura } from './xml-signer';

// ============================================================================
// TIPOS
// ============================================================================

export interface SoapClientConfig {
  /** UF do emitente */
  uf: string;
  /** Ambiente (1=Produção, 2=Homologação) */
  ambiente: TAmbiente;
  /** Configuração do certificado */
  certificado: ConfiguracaoAssinatura;
  /** Timeout em ms (padrão: 60000) */
  timeout?: number;
  /** Usar contingência */
  contingencia?: 'SVC-AN' | 'SVC-RS';
}

export interface SoapResponse<T> {
  /** Sucesso na comunicação */
  sucesso: boolean;
  /** Dados da resposta */
  dados?: T;
  /** HTTP status */
  httpStatus?: number;
  /** Erro de comunicação */
  erro?: string;
  /** XML da resposta */
  xmlResposta?: string;
  /** Tempo de resposta em ms */
  tempoResposta?: number;
}

// ============================================================================
// CLASSE PRINCIPAL
// ============================================================================

export class NFeSoapClient {
  private config: SoapClientConfig;
  private signer: NFeXmlSigner;
  private certificadoCarregado: boolean = false;
  
  constructor(config: SoapClientConfig) {
    this.config = {
      timeout: 60000,
      ...config,
    };
    this.signer = new NFeXmlSigner();
  }
  
  /**
   * Inicializa cliente carregando certificado
   */
  async inicializar(): Promise<void> {
    await this.signer.carregarCertificado(this.config.certificado);
    const validacao = this.signer.validarCertificado();
    
    if (!validacao.valido) {
      throw new Error(`Certificado inválido: ${validacao.erros.join(', ')}`);
    }
    
    this.certificadoCarregado = true;
  }
  
  /**
   * Consulta status do serviço SEFAZ
   */
  async consultarStatus(): Promise<SoapResponse<TRetornoStatus>> {
    const endpoint = getEndpoint('NFeStatusServico', this.config.uf, this.config.ambiente, this.config.contingencia);
    
    if (!endpoint.url) {
      return { sucesso: false, erro: 'Serviço não disponível para esta UF' };
    }
    
    const cUF = this.getCodigoUF();
    const xmlEnvio = this.criarEnvelopeStatus(cUF);
    
    const resposta = await this.enviarRequisicao(endpoint.url, xmlEnvio, 'NFeStatusServico4');
    
    if (!resposta.sucesso || !resposta.xmlResposta) {
      return resposta as SoapResponse<TRetornoStatus>;
    }
    
    const dados = this.parseRetornoStatus(resposta.xmlResposta);
    
    return {
      ...resposta,
      dados,
    };
  }
  
  /**
   * Envia NF-e para autorização
   */
  async enviarNFe(xmlNFe: string): Promise<SoapResponse<TRetornoAutorizacao>> {
    if (!this.certificadoCarregado) {
      await this.inicializar();
    }
    
    const endpoint = getEndpoint('NFeAutorizacao', this.config.uf, this.config.ambiente, this.config.contingencia);
    
    if (!endpoint.url) {
      return { sucesso: false, erro: 'Serviço não disponível para esta UF' };
    }
    
    // Assinar XML
    const xmlAssinado = await this.signer.assinarXml(xmlNFe, 'infNFe');
    
    // Criar envelope SOAP
    const xmlEnvio = this.criarEnvelopeAutorizacao(xmlAssinado);
    
    const resposta = await this.enviarRequisicao(endpoint.url, xmlEnvio, 'NFeAutorizacao4');
    
    if (!resposta.sucesso || !resposta.xmlResposta) {
      return resposta as SoapResponse<TRetornoAutorizacao>;
    }
    
    const dados = this.parseRetornoAutorizacao(resposta.xmlResposta);
    
    return {
      ...resposta,
      dados,
    };
  }
  
  /**
   * Consulta NF-e por chave de acesso
   */
  async consultarChave(chaveAcesso: string): Promise<SoapResponse<TRetornoConsulta>> {
    if (!this.certificadoCarregado) {
      await this.inicializar();
    }
    
    const endpoint = getEndpoint('NFeConsultaProtocolo', this.config.uf, this.config.ambiente, this.config.contingencia);
    
    if (!endpoint.url) {
      return { sucesso: false, erro: 'Serviço não disponível para esta UF' };
    }
    
    const xmlEnvio = this.criarEnvelopeConsulta(chaveAcesso);
    
    const resposta = await this.enviarRequisicao(endpoint.url, xmlEnvio, 'NFeConsultaProtocolo4');
    
    if (!resposta.sucesso || !resposta.xmlResposta) {
      return resposta as SoapResponse<TRetornoConsulta>;
    }
    
    const dados = this.parseRetornoConsulta(resposta.xmlResposta);
    
    return {
      ...resposta,
      dados,
    };
  }
  
  /**
   * Cancela NF-e
   */
  async cancelar(chaveAcesso: string, protocolo: string, justificativa: string): Promise<SoapResponse<TRetornoEvento>> {
    if (!this.certificadoCarregado) {
      await this.inicializar();
    }
    
    const endpoint = getEndpoint('NFeRecepcaoEvento', this.config.uf, this.config.ambiente, this.config.contingencia);
    
    if (!endpoint.url) {
      return { sucesso: false, erro: 'Serviço não disponível para esta UF' };
    }
    
    // Criar XML do evento de cancelamento
    const xmlEvento = this.criarEventoCancelamento(chaveAcesso, protocolo, justificativa);
    
    // Assinar evento
    const xmlAssinado = await this.signer.assinarXml(xmlEvento, 'infEvento');
    
    // Criar envelope SOAP
    const xmlEnvio = this.criarEnvelopeEvento(xmlAssinado);
    
    const resposta = await this.enviarRequisicao(endpoint.url, xmlEnvio, 'NFeRecepcaoEvento4');
    
    if (!resposta.sucesso || !resposta.xmlResposta) {
      return resposta as SoapResponse<TRetornoEvento>;
    }
    
    const dados = this.parseRetornoEvento(resposta.xmlResposta);
    
    return {
      ...resposta,
      dados,
    };
  }
  
  /**
   * Inutiliza faixa de numeração
   */
  async inutilizar(serie: string, numeroInicial: number, numeroFinal: number, justificativa: string): Promise<SoapResponse<TRetornoInutilizacao>> {
    if (!this.certificadoCarregado) {
      await this.inicializar();
    }
    
    const endpoint = getEndpoint('NFeInutilizacao', this.config.uf, this.config.ambiente, this.config.contingencia);
    
    if (!endpoint.url) {
      return { sucesso: false, erro: 'Serviço não disponível para esta UF' };
    }
    
    // Criar XML de inutilização
    const xmlInut = this.criarInutilizacao(serie, numeroInicial, numeroFinal, justificativa);
    
    // Assinar
    const xmlAssinado = await this.signer.assinarXml(xmlInut, 'infInut');
    
    // Criar envelope SOAP
    const xmlEnvio = this.criarEnvelopeInutilizacao(xmlAssinado);
    
    const resposta = await this.enviarRequisicao(endpoint.url, xmlEnvio, 'NFeInutilizacao4');
    
    if (!resposta.sucesso || !resposta.xmlResposta) {
      return resposta as SoapResponse<TRetornoInutilizacao>;
    }
    
    const dados = this.parseRetornoInutilizacao(resposta.xmlResposta);
    
    return {
      ...resposta,
      dados,
    };
  }
  
  // ============================================================================
  // MÉTODOS PRIVADOS - ENVELOPES SOAP
  // ============================================================================
  
  private criarEnvelopeStatus(cUF: TCodUF): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Body>
    <nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeStatusServico4">
      <consStatServ xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
        <tpAmb>${this.config.ambiente}</tpAmb>
        <cUF>${cUF}</cUF>
        <xServ>STATUS</xServ>
      </consStatServ>
    </nfeDadosMsg>
  </soap12:Body>
</soap12:Envelope>`;
  }
  
  private criarEnvelopeAutorizacao(xmlNFeAssinado: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Body>
    <nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4">
      <enviNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
        <idLote>${Date.now()}</idLote>
        <indSinc>1</indSinc>
        ${xmlNFeAssinado}
      </enviNFe>
    </nfeDadosMsg>
  </soap12:Body>
</soap12:Envelope>`;
  }
  
  private criarEnvelopeConsulta(chaveAcesso: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Body>
    <nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4">
      <consSitNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
        <tpAmb>${this.config.ambiente}</tpAmb>
        <xServ>CONSULTAR</xServ>
        <chNFe>${chaveAcesso}</chNFe>
      </consSitNFe>
    </nfeDadosMsg>
  </soap12:Body>
</soap12:Envelope>`;
  }
  
  private criarEnvelopeEvento(xmlEventoAssinado: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Body>
    <nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4">
      <envEvento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00">
        <idLote>${Date.now()}</idLote>
        ${xmlEventoAssinado}
      </envEvento>
    </nfeDadosMsg>
  </soap12:Body>
</soap12:Envelope>`;
  }
  
  private criarEnvelopeInutilizacao(xmlInutAssinado: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Body>
    <nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeInutilizacao4">
      ${xmlInutAssinado}
    </nfeDadosMsg>
  </soap12:Body>
</soap12:Envelope>`;
  }
  
  private criarEventoCancelamento(chaveAcesso: string, protocolo: string, justificativa: string): string {
    const cOrgao = chaveAcesso.substring(0, 2);
    const cnpj = this.signer.getInfo()?.cnpj || '';
    const agora = new Date().toISOString().replace('Z', '-03:00');
    const id = `ID110111${chaveAcesso}01`;
    
    return `<evento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00">
  <infEvento Id="${id}">
    <cOrgao>${cOrgao}</cOrgao>
    <tpAmb>${this.config.ambiente}</tpAmb>
    <CNPJ>${cnpj}</CNPJ>
    <chNFe>${chaveAcesso}</chNFe>
    <dhEvento>${agora}</dhEvento>
    <tpEvento>110111</tpEvento>
    <nSeqEvento>1</nSeqEvento>
    <verEvento>1.00</verEvento>
    <detEvento versao="1.00">
      <descEvento>Cancelamento</descEvento>
      <nProt>${protocolo}</nProt>
      <xJust>${justificativa}</xJust>
    </detEvento>
  </infEvento>
</evento>`;
  }
  
  private criarInutilizacao(serie: string, nInicial: number, nFinal: number, justificativa: string): string {
    const cUF = this.getCodigoUF();
    const ano = new Date().getFullYear().toString().slice(2);
    const cnpj = this.signer.getInfo()?.cnpj || '';
    const serieStr = serie.padStart(3, '0');
    const nIniStr = nInicial.toString().padStart(9, '0');
    const nFinStr = nFinal.toString().padStart(9, '0');
    const id = `ID${cUF}${ano}${cnpj}55${serieStr}${nIniStr}${nFinStr}`;
    
    return `<inutNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <infInut Id="${id}">
    <tpAmb>${this.config.ambiente}</tpAmb>
    <xServ>INUTILIZAR</xServ>
    <cUF>${cUF}</cUF>
    <ano>${ano}</ano>
    <CNPJ>${cnpj}</CNPJ>
    <mod>55</mod>
    <serie>${serie}</serie>
    <nNFIni>${nInicial}</nNFIni>
    <nNFFin>${nFinal}</nNFFin>
    <xJust>${justificativa}</xJust>
  </infInut>
</inutNFe>`;
  }
  
  // ============================================================================
  // MÉTODOS PRIVADOS - COMUNICAÇÃO
  // ============================================================================
  
  private async enviarRequisicao(url: string, xml: string, soapAction: string): Promise<SoapResponse<any>> {
    const inicio = Date.now();
    
    return new Promise((resolve) => {
      const urlObj = new URL(url);
      
      const options: https.RequestOptions = {
        hostname: urlObj.hostname,
        port: 443,
        path: urlObj.pathname + urlObj.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/soap+xml; charset=utf-8',
          'Content-Length': Buffer.byteLength(xml, 'utf8'),
          'SOAPAction': soapAction,
        },
        timeout: this.config.timeout,
        // Certificado para mTLS
        // Em produção, configurar cert e key do certificado
      };
      
      const req = https.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          resolve({
            sucesso: res.statusCode === 200,
            httpStatus: res.statusCode,
            xmlResposta: data,
            tempoResposta: Date.now() - inicio,
          });
        });
      });
      
      req.on('error', (error) => {
        resolve({
          sucesso: false,
          erro: `Erro de comunicação: ${error.message}`,
          tempoResposta: Date.now() - inicio,
        });
      });
      
      req.on('timeout', () => {
        req.destroy();
        resolve({
          sucesso: false,
          erro: `Timeout após ${this.config.timeout}ms`,
          tempoResposta: Date.now() - inicio,
        });
      });
      
      req.write(xml);
      req.end();
    });
  }
  
  // ============================================================================
  // MÉTODOS PRIVADOS - PARSING
  // ============================================================================
  
  private parseRetornoStatus(xml: string): TRetornoStatus {
    return {
      versao: this.extrairValor(xml, 'versao') || '4.00',
      tpAmb: (this.extrairValor(xml, 'tpAmb') || '2') as TAmbiente,
      verAplic: this.extrairValor(xml, 'verAplic') || '',
      cStat: this.extrairValor(xml, 'cStat') || '',
      xMotivo: this.extrairValor(xml, 'xMotivo') || '',
      cUF: this.extrairValor(xml, 'cUF') || '',
      dhRecbto: this.extrairValor(xml, 'dhRecbto') || '',
      tMed: this.extrairValor(xml, 'tMed'),
    };
  }
  
  private parseRetornoAutorizacao(xml: string): TRetornoAutorizacao {
    return {
      versao: this.extrairValor(xml, 'versao') || '4.00',
      tpAmb: (this.extrairValor(xml, 'tpAmb') || '2') as TAmbiente,
      verAplic: this.extrairValor(xml, 'verAplic') || '',
      cStat: this.extrairValor(xml, 'cStat') || '',
      xMotivo: this.extrairValor(xml, 'xMotivo') || '',
      cUF: this.extrairValor(xml, 'cUF') || '',
      dhRecbto: this.extrairValor(xml, 'dhRecbto') || '',
      protNFe: xml.includes('<protNFe') ? {
        versao: '4.00',
        infProt: {
          tpAmb: (this.extrairValor(xml, 'tpAmb', 'infProt') || '2') as TAmbiente,
          verAplic: this.extrairValor(xml, 'verAplic', 'infProt') || '',
          chNFe: this.extrairValor(xml, 'chNFe') || '',
          dhRecbto: this.extrairValor(xml, 'dhRecbto', 'infProt') || '',
          nProt: this.extrairValor(xml, 'nProt'),
          digVal: this.extrairValor(xml, 'digVal'),
          cStat: this.extrairValor(xml, 'cStat', 'infProt') || '',
          xMotivo: this.extrairValor(xml, 'xMotivo', 'infProt') || '',
        },
      } : undefined,
    };
  }
  
  private parseRetornoConsulta(xml: string): TRetornoConsulta {
    return {
      versao: this.extrairValor(xml, 'versao') || '4.00',
      tpAmb: (this.extrairValor(xml, 'tpAmb') || '2') as TAmbiente,
      verAplic: this.extrairValor(xml, 'verAplic') || '',
      cStat: this.extrairValor(xml, 'cStat') || '',
      xMotivo: this.extrairValor(xml, 'xMotivo') || '',
      cUF: this.extrairValor(xml, 'cUF') || '',
      dhRecbto: this.extrairValor(xml, 'dhRecbto') || '',
      chNFe: this.extrairValor(xml, 'chNFe'),
    };
  }
  
  private parseRetornoEvento(xml: string): TRetornoEvento {
    return {
      versao: this.extrairValor(xml, 'versao') || '1.00',
      infEvento: {
        tpAmb: (this.extrairValor(xml, 'tpAmb') || '2') as TAmbiente,
        verAplic: this.extrairValor(xml, 'verAplic') || '',
        cOrgao: this.extrairValor(xml, 'cOrgao') || '',
        cStat: this.extrairValor(xml, 'cStat') || '',
        xMotivo: this.extrairValor(xml, 'xMotivo') || '',
        chNFe: this.extrairValor(xml, 'chNFe'),
        tpEvento: this.extrairValor(xml, 'tpEvento'),
        xEvento: this.extrairValor(xml, 'xEvento'),
        nSeqEvento: this.extrairValor(xml, 'nSeqEvento'),
        dhRegEvento: this.extrairValor(xml, 'dhRegEvento'),
        nProt: this.extrairValor(xml, 'nProt'),
      },
    };
  }
  
  private parseRetornoInutilizacao(xml: string): TRetornoInutilizacao {
    return {
      versao: this.extrairValor(xml, 'versao') || '4.00',
      infInut: {
        tpAmb: (this.extrairValor(xml, 'tpAmb') || '2') as TAmbiente,
        verAplic: this.extrairValor(xml, 'verAplic') || '',
        cStat: this.extrairValor(xml, 'cStat') || '',
        xMotivo: this.extrairValor(xml, 'xMotivo') || '',
        cUF: this.extrairValor(xml, 'cUF') || '',
        ano: this.extrairValor(xml, 'ano'),
        CNPJ: this.extrairValor(xml, 'CNPJ'),
        mod: this.extrairValor(xml, 'mod'),
        serie: this.extrairValor(xml, 'serie'),
        nNFIni: this.extrairValor(xml, 'nNFIni'),
        nNFFin: this.extrairValor(xml, 'nNFFin'),
        dhRecbto: this.extrairValor(xml, 'dhRecbto'),
        nProt: this.extrairValor(xml, 'nProt'),
      },
    };
  }
  
  private extrairValor(xml: string, tag: string, parent?: string): string | undefined {
    const pattern = parent 
      ? new RegExp(`<${parent}[^>]*>[\\s\\S]*?<${tag}>([^<]*)</${tag}>`)
      : new RegExp(`<${tag}>([^<]*)</${tag}>`);
    const match = xml.match(pattern);
    return match ? match[1] : undefined;
  }
  
  private getCodigoUF(): TCodUF {
    const mapa: Record<string, TCodUF> = {
      'AC': '12', 'AL': '27', 'AM': '13', 'AP': '16', 'BA': '29',
      'CE': '23', 'DF': '53', 'ES': '32', 'GO': '52', 'MA': '21',
      'MG': '31', 'MS': '50', 'MT': '51', 'PA': '15', 'PB': '25',
      'PE': '26', 'PI': '22', 'PR': '41', 'RJ': '33', 'RN': '24',
      'RO': '11', 'RR': '14', 'RS': '43', 'SC': '42', 'SE': '28',
      'SP': '35', 'TO': '17',
    };
    return mapa[this.config.uf.toUpperCase()] || '35';
  }
}

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

/**
 * Cria cliente SOAP
 */
export function criarSoapClient(config: SoapClientConfig): NFeSoapClient {
  return new NFeSoapClient(config);
}


