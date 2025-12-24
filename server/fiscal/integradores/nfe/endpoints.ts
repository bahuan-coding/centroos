/**
 * NF-e / NFC-e - Endpoints SEFAZ por UF e Ambiente
 * 
 * Ref: docs/integracoes_fiscais/06-checklist-homologacao-e-testes.md
 * Ref: docs/nfe-nfce/raw/manuais/Manual-SEFAZ-Virtual-AN.zip
 */

import { TCodUF, TAmbiente, TModelo } from './schemas';

// ============================================================================
// TIPOS
// ============================================================================

export type TServico = 
  | 'NFeAutorizacao'       // Autorização de NF-e
  | 'NFeRetAutorizacao'    // Consulta recibo de lote
  | 'NFeConsultaProtocolo' // Consulta por chave
  | 'NFeStatusServico'     // Status do serviço
  | 'NFeRecepcaoEvento'    // Eventos (cancelamento, CCe)
  | 'NFeInutilizacao'      // Inutilização de numeração
  | 'NfeConsultaCadastro'; // Consulta cadastro contribuinte

export interface TEndpointConfig {
  /** URL base do webservice */
  url: string;
  /** WSDL do serviço */
  wsdl?: string;
  /** Versão do serviço */
  versao: string;
  /** Namespace SOAP */
  namespace: string;
}

export interface TUFConfig {
  /** Nome da UF */
  nome: string;
  /** Código IBGE */
  codigo: TCodUF;
  /** Autorizador (própria UF ou SVRS/SVAN) */
  autorizador: 'PROPRIO' | 'SVRS' | 'SVAN' | 'SVC-AN' | 'SVC-RS';
  /** Endpoints por serviço e ambiente */
  endpoints: {
    producao: Record<TServico, TEndpointConfig>;
    homologacao: Record<TServico, TEndpointConfig>;
  };
}

// ============================================================================
// CONFIGURAÇÃO BASE DE SERVIÇOS
// ============================================================================

const VERSAO_NFE = '4.00';
const VERSAO_EVENTO = '1.00';

const NAMESPACE_NFE = 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4';
const NAMESPACE_RET = 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeRetAutorizacao4';
const NAMESPACE_CONSULTA = 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4';
const NAMESPACE_STATUS = 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeStatusServico4';
const NAMESPACE_EVENTO = 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4';
const NAMESPACE_INUT = 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeInutilizacao4';
const NAMESPACE_CADASTRO = 'http://www.portalfiscal.inf.br/nfe/wsdl/CadConsultaCadastro4';

// ============================================================================
// ENDPOINTS SÃO PAULO (SP)
// ============================================================================

const SP_ENDPOINTS: TUFConfig = {
  nome: 'São Paulo',
  codigo: '35',
  autorizador: 'PROPRIO',
  endpoints: {
    producao: {
      NFeAutorizacao: {
        url: 'https://nfe.fazenda.sp.gov.br/ws/nfeautorizacao4.asmx',
        versao: VERSAO_NFE,
        namespace: NAMESPACE_NFE,
      },
      NFeRetAutorizacao: {
        url: 'https://nfe.fazenda.sp.gov.br/ws/nferetautorizacao4.asmx',
        versao: VERSAO_NFE,
        namespace: NAMESPACE_RET,
      },
      NFeConsultaProtocolo: {
        url: 'https://nfe.fazenda.sp.gov.br/ws/nfeconsultaprotocolo4.asmx',
        versao: VERSAO_NFE,
        namespace: NAMESPACE_CONSULTA,
      },
      NFeStatusServico: {
        url: 'https://nfe.fazenda.sp.gov.br/ws/nfestatusservico4.asmx',
        versao: VERSAO_NFE,
        namespace: NAMESPACE_STATUS,
      },
      NFeRecepcaoEvento: {
        url: 'https://nfe.fazenda.sp.gov.br/ws/nferecepcaoevento4.asmx',
        versao: VERSAO_EVENTO,
        namespace: NAMESPACE_EVENTO,
      },
      NFeInutilizacao: {
        url: 'https://nfe.fazenda.sp.gov.br/ws/nfeinutilizacao4.asmx',
        versao: VERSAO_NFE,
        namespace: NAMESPACE_INUT,
      },
      NfeConsultaCadastro: {
        url: 'https://nfe.fazenda.sp.gov.br/ws/cadconsultacadastro4.asmx',
        versao: VERSAO_NFE,
        namespace: NAMESPACE_CADASTRO,
      },
    },
    homologacao: {
      NFeAutorizacao: {
        url: 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nfeautorizacao4.asmx',
        versao: VERSAO_NFE,
        namespace: NAMESPACE_NFE,
      },
      NFeRetAutorizacao: {
        url: 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nferetautorizacao4.asmx',
        versao: VERSAO_NFE,
        namespace: NAMESPACE_RET,
      },
      NFeConsultaProtocolo: {
        url: 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nfeconsultaprotocolo4.asmx',
        versao: VERSAO_NFE,
        namespace: NAMESPACE_CONSULTA,
      },
      NFeStatusServico: {
        url: 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nfestatusservico4.asmx',
        versao: VERSAO_NFE,
        namespace: NAMESPACE_STATUS,
      },
      NFeRecepcaoEvento: {
        url: 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nferecepcaoevento4.asmx',
        versao: VERSAO_EVENTO,
        namespace: NAMESPACE_EVENTO,
      },
      NFeInutilizacao: {
        url: 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nfeinutilizacao4.asmx',
        versao: VERSAO_NFE,
        namespace: NAMESPACE_INUT,
      },
      NfeConsultaCadastro: {
        url: 'https://homologacao.nfe.fazenda.sp.gov.br/ws/cadconsultacadastro4.asmx',
        versao: VERSAO_NFE,
        namespace: NAMESPACE_CADASTRO,
      },
    },
  },
};

// ============================================================================
// ENDPOINTS SEFAZ VIRTUAL RS (SVRS) - Para AL e outros estados
// ============================================================================

const SVRS_ENDPOINTS = {
  producao: {
    NFeAutorizacao: {
      url: 'https://nfe.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx',
      versao: VERSAO_NFE,
      namespace: NAMESPACE_NFE,
    },
    NFeRetAutorizacao: {
      url: 'https://nfe.svrs.rs.gov.br/ws/NfeRetAutorizacao/NFeRetAutorizacao4.asmx',
      versao: VERSAO_NFE,
      namespace: NAMESPACE_RET,
    },
    NFeConsultaProtocolo: {
      url: 'https://nfe.svrs.rs.gov.br/ws/NfeConsulta/NfeConsulta4.asmx',
      versao: VERSAO_NFE,
      namespace: NAMESPACE_CONSULTA,
    },
    NFeStatusServico: {
      url: 'https://nfe.svrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx',
      versao: VERSAO_NFE,
      namespace: NAMESPACE_STATUS,
    },
    NFeRecepcaoEvento: {
      url: 'https://nfe.svrs.rs.gov.br/ws/recepcaoevento/recepcaoevento4.asmx',
      versao: VERSAO_EVENTO,
      namespace: NAMESPACE_EVENTO,
    },
    NFeInutilizacao: {
      url: 'https://nfe.svrs.rs.gov.br/ws/nfeinutilizacao/nfeinutilizacao4.asmx',
      versao: VERSAO_NFE,
      namespace: NAMESPACE_INUT,
    },
    NfeConsultaCadastro: {
      url: 'https://cad.svrs.rs.gov.br/ws/cadconsultacadastro/cadconsultacadastro4.asmx',
      versao: VERSAO_NFE,
      namespace: NAMESPACE_CADASTRO,
    },
  },
  homologacao: {
    NFeAutorizacao: {
      url: 'https://nfe-homologacao.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx',
      versao: VERSAO_NFE,
      namespace: NAMESPACE_NFE,
    },
    NFeRetAutorizacao: {
      url: 'https://nfe-homologacao.svrs.rs.gov.br/ws/NfeRetAutorizacao/NFeRetAutorizacao4.asmx',
      versao: VERSAO_NFE,
      namespace: NAMESPACE_RET,
    },
    NFeConsultaProtocolo: {
      url: 'https://nfe-homologacao.svrs.rs.gov.br/ws/NfeConsulta/NfeConsulta4.asmx',
      versao: VERSAO_NFE,
      namespace: NAMESPACE_CONSULTA,
    },
    NFeStatusServico: {
      url: 'https://nfe-homologacao.svrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx',
      versao: VERSAO_NFE,
      namespace: NAMESPACE_STATUS,
    },
    NFeRecepcaoEvento: {
      url: 'https://nfe-homologacao.svrs.rs.gov.br/ws/recepcaoevento/recepcaoevento4.asmx',
      versao: VERSAO_EVENTO,
      namespace: NAMESPACE_EVENTO,
    },
    NFeInutilizacao: {
      url: 'https://nfe-homologacao.svrs.rs.gov.br/ws/nfeinutilizacao/nfeinutilizacao4.asmx',
      versao: VERSAO_NFE,
      namespace: NAMESPACE_INUT,
    },
    NfeConsultaCadastro: {
      url: 'https://cad-homologacao.svrs.rs.gov.br/ws/cadconsultacadastro/cadconsultacadastro4.asmx',
      versao: VERSAO_NFE,
      namespace: NAMESPACE_CADASTRO,
    },
  },
};

// ============================================================================
// ENDPOINTS SVC (CONTINGÊNCIA)
// ============================================================================

const SVC_AN_ENDPOINTS = {
  producao: {
    NFeAutorizacao: {
      url: 'https://www.svc.fazenda.gov.br/NFeAutorizacao4/NFeAutorizacao4.asmx',
      versao: VERSAO_NFE,
      namespace: NAMESPACE_NFE,
    },
    NFeRetAutorizacao: {
      url: 'https://www.svc.fazenda.gov.br/NFeRetAutorizacao4/NFeRetAutorizacao4.asmx',
      versao: VERSAO_NFE,
      namespace: NAMESPACE_RET,
    },
    NFeConsultaProtocolo: {
      url: 'https://www.svc.fazenda.gov.br/NFeConsultaProtocolo4/NFeConsultaProtocolo4.asmx',
      versao: VERSAO_NFE,
      namespace: NAMESPACE_CONSULTA,
    },
    NFeStatusServico: {
      url: 'https://www.svc.fazenda.gov.br/NFeStatusServico4/NFeStatusServico4.asmx',
      versao: VERSAO_NFE,
      namespace: NAMESPACE_STATUS,
    },
    NFeRecepcaoEvento: {
      url: 'https://www.svc.fazenda.gov.br/NFeRecepcaoEvento4/NFeRecepcaoEvento4.asmx',
      versao: VERSAO_EVENTO,
      namespace: NAMESPACE_EVENTO,
    },
    NFeInutilizacao: {
      url: '', // SVC não suporta inutilização
      versao: VERSAO_NFE,
      namespace: NAMESPACE_INUT,
    },
    NfeConsultaCadastro: {
      url: '', // SVC não suporta consulta cadastro
      versao: VERSAO_NFE,
      namespace: NAMESPACE_CADASTRO,
    },
  },
  homologacao: {
    NFeAutorizacao: {
      url: 'https://hom.svc.fazenda.gov.br/NFeAutorizacao4/NFeAutorizacao4.asmx',
      versao: VERSAO_NFE,
      namespace: NAMESPACE_NFE,
    },
    NFeRetAutorizacao: {
      url: 'https://hom.svc.fazenda.gov.br/NFeRetAutorizacao4/NFeRetAutorizacao4.asmx',
      versao: VERSAO_NFE,
      namespace: NAMESPACE_RET,
    },
    NFeConsultaProtocolo: {
      url: 'https://hom.svc.fazenda.gov.br/NFeConsultaProtocolo4/NFeConsultaProtocolo4.asmx',
      versao: VERSAO_NFE,
      namespace: NAMESPACE_CONSULTA,
    },
    NFeStatusServico: {
      url: 'https://hom.svc.fazenda.gov.br/NFeStatusServico4/NFeStatusServico4.asmx',
      versao: VERSAO_NFE,
      namespace: NAMESPACE_STATUS,
    },
    NFeRecepcaoEvento: {
      url: 'https://hom.svc.fazenda.gov.br/NFeRecepcaoEvento4/NFeRecepcaoEvento4.asmx',
      versao: VERSAO_EVENTO,
      namespace: NAMESPACE_EVENTO,
    },
    NFeInutilizacao: {
      url: '',
      versao: VERSAO_NFE,
      namespace: NAMESPACE_INUT,
    },
    NfeConsultaCadastro: {
      url: '',
      versao: VERSAO_NFE,
      namespace: NAMESPACE_CADASTRO,
    },
  },
};

const SVC_RS_ENDPOINTS = {
  producao: {
    NFeAutorizacao: {
      url: 'https://nfe.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx',
      versao: VERSAO_NFE,
      namespace: NAMESPACE_NFE,
    },
    NFeRetAutorizacao: {
      url: 'https://nfe.svrs.rs.gov.br/ws/NfeRetAutorizacao/NFeRetAutorizacao4.asmx',
      versao: VERSAO_NFE,
      namespace: NAMESPACE_RET,
    },
    NFeConsultaProtocolo: {
      url: 'https://nfe.svrs.rs.gov.br/ws/NfeConsulta/NfeConsulta4.asmx',
      versao: VERSAO_NFE,
      namespace: NAMESPACE_CONSULTA,
    },
    NFeStatusServico: {
      url: 'https://nfe.svrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx',
      versao: VERSAO_NFE,
      namespace: NAMESPACE_STATUS,
    },
    NFeRecepcaoEvento: {
      url: 'https://nfe.svrs.rs.gov.br/ws/recepcaoevento/recepcaoevento4.asmx',
      versao: VERSAO_EVENTO,
      namespace: NAMESPACE_EVENTO,
    },
    NFeInutilizacao: {
      url: '',
      versao: VERSAO_NFE,
      namespace: NAMESPACE_INUT,
    },
    NfeConsultaCadastro: {
      url: '',
      versao: VERSAO_NFE,
      namespace: NAMESPACE_CADASTRO,
    },
  },
  homologacao: {
    NFeAutorizacao: {
      url: 'https://nfe-homologacao.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx',
      versao: VERSAO_NFE,
      namespace: NAMESPACE_NFE,
    },
    NFeRetAutorizacao: {
      url: 'https://nfe-homologacao.svrs.rs.gov.br/ws/NfeRetAutorizacao/NFeRetAutorizacao4.asmx',
      versao: VERSAO_NFE,
      namespace: NAMESPACE_RET,
    },
    NFeConsultaProtocolo: {
      url: 'https://nfe-homologacao.svrs.rs.gov.br/ws/NfeConsulta/NfeConsulta4.asmx',
      versao: VERSAO_NFE,
      namespace: NAMESPACE_CONSULTA,
    },
    NFeStatusServico: {
      url: 'https://nfe-homologacao.svrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx',
      versao: VERSAO_NFE,
      namespace: NAMESPACE_STATUS,
    },
    NFeRecepcaoEvento: {
      url: 'https://nfe-homologacao.svrs.rs.gov.br/ws/recepcaoevento/recepcaoevento4.asmx',
      versao: VERSAO_EVENTO,
      namespace: NAMESPACE_EVENTO,
    },
    NFeInutilizacao: {
      url: '',
      versao: VERSAO_NFE,
      namespace: NAMESPACE_INUT,
    },
    NfeConsultaCadastro: {
      url: '',
      versao: VERSAO_NFE,
      namespace: NAMESPACE_CADASTRO,
    },
  },
};

// ============================================================================
// ALAGOAS (AL) - Usa SVRS
// ============================================================================

const AL_ENDPOINTS: TUFConfig = {
  nome: 'Alagoas',
  codigo: '27',
  autorizador: 'SVRS',
  endpoints: SVRS_ENDPOINTS,
};

// ============================================================================
// MAPEAMENTO UF -> CONFIG
// ============================================================================

export const UF_CONFIG: Record<string, TUFConfig> = {
  'SP': SP_ENDPOINTS,
  'AL': AL_ENDPOINTS,
  // Adicionar outras UFs conforme necessidade
};

// ============================================================================
// MAPEAMENTO CÓDIGO IBGE -> UF
// ============================================================================

export const CODIGO_UF: Record<TCodUF, string> = {
  '11': 'RO', '12': 'AC', '13': 'AM', '14': 'RR', '15': 'PA', '16': 'AP', '17': 'TO',
  '21': 'MA', '22': 'PI', '23': 'CE', '24': 'RN', '25': 'PB', '26': 'PE', '27': 'AL', '28': 'SE', '29': 'BA',
  '31': 'MG', '32': 'ES', '33': 'RJ', '35': 'SP',
  '41': 'PR', '42': 'SC', '43': 'RS',
  '50': 'MS', '51': 'MT', '52': 'GO', '53': 'DF',
};

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

/**
 * Obtém configuração de endpoint para um serviço, UF e ambiente
 */
export function getEndpoint(
  servico: TServico,
  uf: string,
  ambiente: TAmbiente,
  contingencia?: 'SVC-AN' | 'SVC-RS'
): TEndpointConfig {
  // Se em contingência, usa endpoints SVC
  if (contingencia) {
    const svcEndpoints = contingencia === 'SVC-AN' ? SVC_AN_ENDPOINTS : SVC_RS_ENDPOINTS;
    const ambienteKey = ambiente === '1' ? 'producao' : 'homologacao';
    return svcEndpoints[ambienteKey][servico];
  }
  
  // Busca configuração da UF
  const config = UF_CONFIG[uf.toUpperCase()];
  if (!config) {
    throw new Error(`UF não suportada: ${uf}`);
  }
  
  const ambienteKey = ambiente === '1' ? 'producao' : 'homologacao';
  return config.endpoints[ambienteKey][servico];
}

/**
 * Obtém todos os endpoints para uma UF e ambiente
 */
export function getEndpointsUF(
  uf: string,
  ambiente: TAmbiente
): Record<TServico, TEndpointConfig> {
  const config = UF_CONFIG[uf.toUpperCase()];
  if (!config) {
    throw new Error(`UF não suportada: ${uf}`);
  }
  
  const ambienteKey = ambiente === '1' ? 'producao' : 'homologacao';
  return config.endpoints[ambienteKey];
}

/**
 * Verifica se UF é suportada
 */
export function isUFSuportada(uf: string): boolean {
  return uf.toUpperCase() in UF_CONFIG;
}

/**
 * Lista UFs suportadas
 */
export function getUFsSuportadas(): string[] {
  return Object.keys(UF_CONFIG);
}

/**
 * Obtém código IBGE da UF
 */
export function getCodigoUF(uf: string): TCodUF | null {
  const config = UF_CONFIG[uf.toUpperCase()];
  return config?.codigo || null;
}

/**
 * Obtém autorizador da UF (próprio ou SVRS/SVAN)
 */
export function getAutorizadorUF(uf: string): string | null {
  const config = UF_CONFIG[uf.toUpperCase()];
  return config?.autorizador || null;
}


