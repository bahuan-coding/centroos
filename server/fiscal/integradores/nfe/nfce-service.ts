/**
 * NFC-e Service - Serviço de alto nível para Nota Fiscal do Consumidor Eletrônica
 * 
 * Modelo 65 - Vendas presenciais B2C
 */

import { TAmbiente, TModelo } from './schemas';
import { NFeSoapClient, criarSoapClient } from './soap-client';
import { criarNFeBuilder, NFeDadosEmissao } from './xml-builder';
import { ConfiguracaoAssinatura } from './xml-signer';
import { registrarAuditoria } from '../../auditoria';
import { gerarCorrelationId } from '../../idempotencia';

// ============================================================================
// TIPOS
// ============================================================================

export interface NFCeServiceConfig {
  /** UF do emitente */
  uf: string;
  /** Ambiente (1=Produção, 2=Homologação) */
  ambiente: TAmbiente;
  /** Configuração do certificado */
  certificado: ConfiguracaoAssinatura;
  /** ID da organização */
  orgId: string;
  /** ID do usuário */
  userId?: string;
  /** Código de Segurança do Contribuinte (obrigatório para NFC-e) */
  csc: string;
  /** ID do CSC */
  idCSC: string;
}

export interface ResultadoEmissaoNFCe {
  /** Sucesso na emissão */
  sucesso: boolean;
  /** Chave de acesso (44 dígitos) */
  chaveAcesso?: string;
  /** Número do protocolo de autorização */
  protocolo?: string;
  /** Data/hora da autorização */
  dataAutorizacao?: Date;
  /** Código de status */
  cStat?: string;
  /** Motivo */
  motivo?: string;
  /** QR Code para impressão */
  qrCode?: string;
  /** URL de consulta da NFC-e */
  urlConsulta?: string;
  /** XML autorizado */
  xmlAutorizado?: string;
  /** Erro */
  erro?: string;
}

export interface ResultadoCancelamentoNFCe {
  /** Sucesso no cancelamento */
  sucesso: boolean;
  /** Protocolo do cancelamento */
  protocoloCancelamento?: string;
  /** Data do cancelamento */
  dataCancelamento?: Date;
  /** Código de status */
  cStat?: string;
  /** Motivo */
  motivo?: string;
  /** Erro */
  erro?: string;
}

// ============================================================================
// CLASSE PRINCIPAL
// ============================================================================

export class NFCeService {
  private config: NFCeServiceConfig;
  private soapClient: NFeSoapClient;
  private correlationId: string;
  private modelo: TModelo = '65'; // NFC-e
  
  constructor(config: NFCeServiceConfig) {
    this.config = config;
    this.correlationId = gerarCorrelationId();
    
    this.soapClient = criarSoapClient({
      uf: config.uf,
      ambiente: config.ambiente,
      certificado: config.certificado,
    });
  }
  
  /**
   * Verifica status do serviço SEFAZ
   */
  async verificarStatus(): Promise<{ disponivel: boolean; tempoMedio?: string; mensagem: string }> {
    console.log(`[${this.correlationId}] nfce_status_inicio`, { uf: this.config.uf });
    
    try {
      const resposta = await this.soapClient.consultarStatus();
      
      if (!resposta.sucesso) {
        return {
          disponivel: false,
          mensagem: resposta.erro || 'Erro na comunicação',
        };
      }
      
      const cStat = resposta.dados?.cStat;
      const disponivel = cStat === '107';
      
      console.log(`[${this.correlationId}] nfce_status_fim`, {
        disponivel,
        cStat,
        tempoResposta: resposta.tempoResposta,
      });
      
      return {
        disponivel,
        tempoMedio: resposta.dados?.tMed,
        mensagem: resposta.dados?.xMotivo || 'OK',
      };
    } catch (error: any) {
      console.error(`[${this.correlationId}] nfce_status_erro`, error);
      return {
        disponivel: false,
        mensagem: error.message,
      };
    }
  }
  
  /**
   * Emite NFC-e
   */
  async emitir(dados: NFeDadosEmissao): Promise<ResultadoEmissaoNFCe> {
    console.log(`[${this.correlationId}] nfce_emissao_inicio`, {
      numero: dados.numero,
      serie: dados.serie,
      modelo: this.modelo,
    });
    
    try {
      // Forçar configurações NFC-e
      dados.modelo = '65';
      dados.consumidorFinal = true; // NFC-e sempre consumidor final
      dados.presenca = dados.presenca || '1'; // Presencial por padrão
      
      // Construir XML
      const builder = criarNFeBuilder(dados);
      const chaveAcesso = builder.getChaveAcesso();
      let xmlNFCe = builder.toXml();
      
      // Adicionar QR Code (obrigatório para NFC-e)
      xmlNFCe = this.adicionarQRCode(xmlNFCe, chaveAcesso);
      
      console.log(`[${this.correlationId}] nfce_xml_gerado`, { chaveAcesso });
      
      // Enviar para SEFAZ
      const resposta = await this.soapClient.enviarNFe(xmlNFCe);
      
      if (!resposta.sucesso) {
        console.error(`[${this.correlationId}] nfce_emissao_erro_comunicacao`, { erro: resposta.erro });
        
        await this.registrarAuditoria('emissao', chaveAcesso, false, resposta.erro);
        
        return {
          sucesso: false,
          chaveAcesso,
          erro: resposta.erro,
        };
      }
      
      const cStat = resposta.dados?.cStat;
      const protNFe = resposta.dados?.protNFe;
      
      const autorizado = cStat === '100' || cStat === '150';
      
      if (autorizado && protNFe) {
        const qrCode = this.gerarQRCode(chaveAcesso);
        const urlConsulta = this.gerarURLConsulta(chaveAcesso);
        
        console.log(`[${this.correlationId}] nfce_emissao_sucesso`, {
          chaveAcesso,
          protocolo: protNFe.infProt.nProt,
          cStat,
        });
        
        await this.registrarAuditoria('emissao', chaveAcesso, true, undefined, protNFe.infProt.nProt);
        
        return {
          sucesso: true,
          chaveAcesso,
          protocolo: protNFe.infProt.nProt,
          dataAutorizacao: protNFe.infProt.dhRecbto ? new Date(protNFe.infProt.dhRecbto) : undefined,
          cStat,
          motivo: protNFe.infProt.xMotivo,
          qrCode,
          urlConsulta,
          xmlAutorizado: resposta.xmlResposta,
        };
      }
      
      console.warn(`[${this.correlationId}] nfce_emissao_rejeitada`, {
        chaveAcesso,
        cStat,
        motivo: resposta.dados?.xMotivo,
      });
      
      await this.registrarAuditoria('emissao', chaveAcesso, false, resposta.dados?.xMotivo);
      
      return {
        sucesso: false,
        chaveAcesso,
        cStat,
        motivo: resposta.dados?.xMotivo,
        erro: `Rejeição ${cStat}: ${resposta.dados?.xMotivo}`,
      };
      
    } catch (error: any) {
      console.error(`[${this.correlationId}] nfce_emissao_excecao`, error);
      
      return {
        sucesso: false,
        erro: error.message,
      };
    }
  }
  
  /**
   * Cancela NFC-e (prazo: 30 minutos em SP, pode variar por UF)
   */
  async cancelar(chaveAcesso: string, protocolo: string, justificativa: string): Promise<ResultadoCancelamentoNFCe> {
    console.log(`[${this.correlationId}] nfce_cancelamento_inicio`, { chaveAcesso, protocolo });
    
    if (justificativa.length < 15) {
      return {
        sucesso: false,
        erro: 'Justificativa deve ter no mínimo 15 caracteres',
      };
    }
    
    try {
      const resposta = await this.soapClient.cancelar(chaveAcesso, protocolo, justificativa);
      
      if (!resposta.sucesso) {
        return {
          sucesso: false,
          erro: resposta.erro,
        };
      }
      
      const cStat = resposta.dados?.infEvento.cStat;
      const sucesso = cStat === '135' || cStat === '155';
      
      if (sucesso) {
        console.log(`[${this.correlationId}] nfce_cancelamento_sucesso`, {
          chaveAcesso,
          protocoloCancelamento: resposta.dados?.infEvento.nProt,
        });
        
        await this.registrarAuditoria('cancelamento', chaveAcesso, true, undefined, resposta.dados?.infEvento.nProt);
      } else {
        console.warn(`[${this.correlationId}] nfce_cancelamento_rejeitado`, { chaveAcesso, cStat });
        await this.registrarAuditoria('cancelamento', chaveAcesso, false, resposta.dados?.infEvento.xMotivo);
      }
      
      return {
        sucesso,
        protocoloCancelamento: resposta.dados?.infEvento.nProt,
        dataCancelamento: resposta.dados?.infEvento.dhRegEvento 
          ? new Date(resposta.dados.infEvento.dhRegEvento) 
          : undefined,
        cStat,
        motivo: resposta.dados?.infEvento.xMotivo,
        erro: !sucesso ? resposta.dados?.infEvento.xMotivo : undefined,
      };
      
    } catch (error: any) {
      console.error(`[${this.correlationId}] nfce_cancelamento_erro`, error);
      return {
        sucesso: false,
        erro: error.message,
      };
    }
  }
  
  // ============================================================================
  // MÉTODOS PRIVADOS
  // ============================================================================
  
  /**
   * Adiciona QR Code ao XML da NFC-e
   */
  private adicionarQRCode(xml: string, chaveAcesso: string): string {
    const qrCodeData = this.gerarQRCode(chaveAcesso);
    const urlConsulta = this.gerarURLConsulta(chaveAcesso);
    
    const infNFeSupl = `<infNFeSupl>
  <qrCode><![CDATA[${qrCodeData}]]></qrCode>
  <urlChave>${urlConsulta}</urlChave>
</infNFeSupl>`;
    
    // Inserir antes do fechamento de infNFe
    return xml.replace('</infNFe>', `</infNFe>${infNFeSupl}`);
  }
  
  /**
   * Gera URL do QR Code
   */
  private gerarQRCode(chaveAcesso: string): string {
    const tpAmb = this.config.ambiente;
    const csc = this.config.csc;
    const idCSC = this.config.idCSC;
    
    // Gerar hash SHA-1 da concatenação
    const crypto = require('crypto');
    const concat = `${chaveAcesso}|${tpAmb}|${csc}`;
    const hash = crypto.createHash('sha1').update(concat).digest('hex').toUpperCase();
    
    // URL base por UF
    const urlBase = this.getURLQRCode();
    
    return `${urlBase}?p=${chaveAcesso}|${tpAmb}|${idCSC}|${hash}`;
  }
  
  /**
   * Gera URL de consulta da NFC-e
   */
  private gerarURLConsulta(chaveAcesso: string): string {
    const urls: Record<string, Record<TAmbiente, string>> = {
      'SP': {
        '1': 'https://www.nfce.fazenda.sp.gov.br/consulta',
        '2': 'https://www.homologacao.nfce.fazenda.sp.gov.br/consulta',
      },
      'AL': {
        '1': 'https://www.sefaz.al.gov.br/nfce/consulta',
        '2': 'https://homologacao.sefaz.al.gov.br/nfce/consulta',
      },
    };
    
    return urls[this.config.uf.toUpperCase()]?.[this.config.ambiente] || 
           'https://www.nfce.fazenda.sp.gov.br/consulta';
  }
  
  /**
   * Obtém URL base do QR Code por UF
   */
  private getURLQRCode(): string {
    const urls: Record<string, Record<TAmbiente, string>> = {
      'SP': {
        '1': 'https://www.nfce.fazenda.sp.gov.br/qrcode',
        '2': 'https://www.homologacao.nfce.fazenda.sp.gov.br/qrcode',
      },
      'AL': {
        '1': 'https://www.sefaz.al.gov.br/nfce/qrcode',
        '2': 'https://homologacao.sefaz.al.gov.br/nfce/qrcode',
      },
    };
    
    return urls[this.config.uf.toUpperCase()]?.[this.config.ambiente] || 
           'https://www.nfce.fazenda.sp.gov.br/qrcode';
  }
  
  /**
   * Registra auditoria
   */
  private async registrarAuditoria(
    operacao: 'emissao' | 'consulta' | 'cancelamento' | 'substituicao' | 'evento' | 'conciliacao',
    chaveAcesso: string,
    sucesso: boolean,
    erro?: string,
    protocolo?: string
  ): Promise<void> {
    await registrarAuditoria({
      operacao,
      tipoDocumento: 'NFCE',
      documentoId: chaveAcesso,
      chaveAcesso,
      numero: protocolo,
      userId: this.config.userId || 'sistema',
      orgId: this.config.orgId,
      ipOrigem: '0.0.0.0',
      sucesso,
      codigoRetorno: erro,
      durationMs: 0,
    });
  }
}

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

/**
 * Cria serviço NFC-e
 */
export function criarNFCeService(config: NFCeServiceConfig): NFCeService {
  return new NFCeService(config);
}

