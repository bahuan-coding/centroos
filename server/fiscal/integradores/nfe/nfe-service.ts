/**
 * NF-e Service - Serviço de alto nível para Nota Fiscal Eletrônica
 * 
 * Modelo 55 - Operações B2B e vendas não-presenciais
 */

import { TAmbiente, TProtocoloNFe, TModelo } from './schemas';
import { NFeSoapClient, SoapClientConfig, criarSoapClient } from './soap-client';
import { NFeXmlBuilder, NFeDadosEmissao, criarNFeBuilder } from './xml-builder';
import { ConfiguracaoAssinatura } from './xml-signer';
import { registrarAuditoria } from '../../auditoria';
import { gerarCorrelationId } from '../../idempotencia';

// ============================================================================
// TIPOS
// ============================================================================

export interface NFeServiceConfig {
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
  /** Usar contingência */
  contingencia?: 'SVC-AN' | 'SVC-RS';
}

export interface ResultadoEmissaoNFe {
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
  /** XML autorizado (NF-e + protocolo) */
  xmlAutorizado?: string;
  /** Erro */
  erro?: string;
}

export interface ResultadoConsultaNFe {
  /** Sucesso na consulta */
  sucesso: boolean;
  /** Situação da NF-e */
  situacao?: 'AUTORIZADA' | 'CANCELADA' | 'DENEGADA' | 'NAO_ENCONTRADA' | 'PENDENTE';
  /** Chave de acesso */
  chaveAcesso?: string;
  /** Protocolo */
  protocolo?: string;
  /** Código de status */
  cStat?: string;
  /** Motivo */
  motivo?: string;
  /** Data do evento */
  dataEvento?: Date;
  /** Erro */
  erro?: string;
}

export interface ResultadoCancelamentoNFe {
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

export interface ResultadoInutilizacaoNFe {
  /** Sucesso na inutilização */
  sucesso: boolean;
  /** Protocolo */
  protocolo?: string;
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

export class NFeService {
  private config: NFeServiceConfig;
  private soapClient: NFeSoapClient;
  private correlationId: string;
  private modelo: TModelo = '55'; // NF-e
  
  constructor(config: NFeServiceConfig) {
    this.config = config;
    this.correlationId = gerarCorrelationId();
    
    this.soapClient = criarSoapClient({
      uf: config.uf,
      ambiente: config.ambiente,
      certificado: config.certificado,
      contingencia: config.contingencia,
    });
  }
  
  /**
   * Verifica status do serviço SEFAZ
   */
  async verificarStatus(): Promise<{ disponivel: boolean; tempoMedio?: string; mensagem: string }> {
    console.log(`[${this.correlationId}] nfe_status_inicio`, { uf: this.config.uf });
    
    try {
      const resposta = await this.soapClient.consultarStatus();
      
      if (!resposta.sucesso) {
        return {
          disponivel: false,
          mensagem: resposta.erro || 'Erro na comunicação',
        };
      }
      
      const cStat = resposta.dados?.cStat;
      const disponivel = cStat === '107'; // 107 = Serviço em Operação
      
      console.log(`[${this.correlationId}] nfe_status_fim`, {
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
      console.error(`[${this.correlationId}] nfe_status_erro`, error);
      return {
        disponivel: false,
        mensagem: error.message,
      };
    }
  }
  
  /**
   * Emite NF-e
   */
  async emitir(dados: NFeDadosEmissao): Promise<ResultadoEmissaoNFe> {
    console.log(`[${this.correlationId}] nfe_emissao_inicio`, {
      numero: dados.numero,
      serie: dados.serie,
      modelo: this.modelo,
    });
    
    try {
      // Forçar modelo 55 para NF-e
      dados.modelo = '55';
      
      // Construir XML
      const builder = criarNFeBuilder(dados);
      const chaveAcesso = builder.getChaveAcesso();
      const xmlNFe = builder.toXml();
      
      console.log(`[${this.correlationId}] nfe_xml_gerado`, { chaveAcesso });
      
      // Enviar para SEFAZ
      const resposta = await this.soapClient.enviarNFe(xmlNFe);
      
      // Processar resposta
      if (!resposta.sucesso) {
        console.error(`[${this.correlationId}] nfe_emissao_erro_comunicacao`, { erro: resposta.erro });
        
        await this.registrarAuditoria('emissao', chaveAcesso, false, resposta.erro);
        
        return {
          sucesso: false,
          chaveAcesso,
          erro: resposta.erro,
        };
      }
      
      const cStat = resposta.dados?.cStat;
      const protNFe = resposta.dados?.protNFe;
      
      // Status de sucesso: 100 (Autorizado), 150 (Autorizado fora prazo)
      const autorizado = cStat === '100' || cStat === '150';
      
      if (autorizado && protNFe) {
        console.log(`[${this.correlationId}] nfe_emissao_sucesso`, {
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
          xmlAutorizado: resposta.xmlResposta,
        };
      }
      
      // Rejeição ou erro
      console.warn(`[${this.correlationId}] nfe_emissao_rejeitada`, {
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
      console.error(`[${this.correlationId}] nfe_emissao_excecao`, error);
      
      return {
        sucesso: false,
        erro: error.message,
      };
    }
  }
  
  /**
   * Consulta NF-e por chave de acesso
   */
  async consultar(chaveAcesso: string): Promise<ResultadoConsultaNFe> {
    console.log(`[${this.correlationId}] nfe_consulta_inicio`, { chaveAcesso });
    
    try {
      const resposta = await this.soapClient.consultarChave(chaveAcesso);
      
      if (!resposta.sucesso) {
        return {
          sucesso: false,
          erro: resposta.erro,
        };
      }
      
      const cStat = resposta.dados?.cStat;
      let situacao: ResultadoConsultaNFe['situacao'];
      
      switch (cStat) {
        case '100':
        case '150':
          situacao = 'AUTORIZADA';
          break;
        case '101':
        case '151':
          situacao = 'CANCELADA';
          break;
        case '110':
          situacao = 'DENEGADA';
          break;
        case '217':
        case '562':
          situacao = 'NAO_ENCONTRADA';
          break;
        default:
          situacao = 'PENDENTE';
      }
      
      console.log(`[${this.correlationId}] nfe_consulta_sucesso`, { chaveAcesso, situacao, cStat });
      
      return {
        sucesso: true,
        chaveAcesso,
        situacao,
        cStat,
        motivo: resposta.dados?.xMotivo,
      };
      
    } catch (error: any) {
      console.error(`[${this.correlationId}] nfe_consulta_erro`, error);
      return {
        sucesso: false,
        erro: error.message,
      };
    }
  }
  
  /**
   * Cancela NF-e
   */
  async cancelar(chaveAcesso: string, protocolo: string, justificativa: string): Promise<ResultadoCancelamentoNFe> {
    console.log(`[${this.correlationId}] nfe_cancelamento_inicio`, { chaveAcesso, protocolo });
    
    // Validar justificativa (mínimo 15 caracteres)
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
      const sucesso = cStat === '135' || cStat === '155'; // Evento registrado
      
      if (sucesso) {
        console.log(`[${this.correlationId}] nfe_cancelamento_sucesso`, {
          chaveAcesso,
          protocoloCancelamento: resposta.dados?.infEvento.nProt,
        });
        
        await this.registrarAuditoria('cancelamento', chaveAcesso, true, undefined, resposta.dados?.infEvento.nProt);
      } else {
        console.warn(`[${this.correlationId}] nfe_cancelamento_rejeitado`, { chaveAcesso, cStat });
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
      console.error(`[${this.correlationId}] nfe_cancelamento_erro`, error);
      return {
        sucesso: false,
        erro: error.message,
      };
    }
  }
  
  /**
   * Inutiliza faixa de numeração
   */
  async inutilizar(serie: string, numeroInicial: number, numeroFinal: number, justificativa: string): Promise<ResultadoInutilizacaoNFe> {
    console.log(`[${this.correlationId}] nfe_inutilizacao_inicio`, { serie, numeroInicial, numeroFinal });
    
    // Validar justificativa
    if (justificativa.length < 15) {
      return {
        sucesso: false,
        erro: 'Justificativa deve ter no mínimo 15 caracteres',
      };
    }
    
    try {
      const resposta = await this.soapClient.inutilizar(serie, numeroInicial, numeroFinal, justificativa);
      
      if (!resposta.sucesso) {
        return {
          sucesso: false,
          erro: resposta.erro,
        };
      }
      
      const cStat = resposta.dados?.infInut.cStat;
      const sucesso = cStat === '102'; // Inutilização homologada
      
      console.log(`[${this.correlationId}] nfe_inutilizacao_resultado`, { sucesso, cStat });
      
      return {
        sucesso,
        protocolo: resposta.dados?.infInut.nProt,
        cStat,
        motivo: resposta.dados?.infInut.xMotivo,
        erro: !sucesso ? resposta.dados?.infInut.xMotivo : undefined,
      };
      
    } catch (error: any) {
      console.error(`[${this.correlationId}] nfe_inutilizacao_erro`, error);
      return {
        sucesso: false,
        erro: error.message,
      };
    }
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
      tipoDocumento: 'NFE',
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
 * Cria serviço NF-e
 */
export function criarNFeService(config: NFeServiceConfig): NFeService {
  return new NFeService(config);
}

