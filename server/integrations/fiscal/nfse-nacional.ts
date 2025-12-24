/**
 * NFS-e Nacional (ADN) Integration
 * 
 * API REST do Ambiente de Dados Nacional para:
 * - Emitir NFS-e via DPS (Declaração de Prestação de Serviços)
 * - Consultar NFS-e por chave de acesso
 * - Consultar NFS-e por identificador DPS
 * - Registrar eventos (cancelamento, manifestação)
 * - Consultar parâmetros municipais
 * - Baixar DANFSE (PDF)
 * 
 * Documentação: https://www.gov.br/nfse/
 * Spec interna: docs/nfse-nacional/spec/
 * 
 * Autenticação: Certificado ICP-Brasil (mTLS)
 */

import https from 'https';
import forge from 'node-forge';
import { loadActiveCertificate, type LoadedCertificate } from './certificates';
import { signXml, type CertificateData } from './xmldsig';

// =============================================================================
// CONFIGURAÇÃO E ENDPOINTS
// =============================================================================

const NFSE_NACIONAL_ENDPOINTS = {
  producaoRestrita: {
    sefin: 'https://sefin.producaorestrita.nfse.gov.br',
    adn: 'https://adn.producaorestrita.nfse.gov.br',
  },
  producao: {
    sefin: 'https://sefin.nfse.gov.br',
    adn: 'https://adn.nfse.gov.br',
  },
};

const getBaseUrl = () => {
  const ambiente = process.env.NFSE_NACIONAL_AMBIENTE || 'producaoRestrita';
  const endpoints = NFSE_NACIONAL_ENDPOINTS[ambiente as keyof typeof NFSE_NACIONAL_ENDPOINTS];
  return endpoints || NFSE_NACIONAL_ENDPOINTS.producaoRestrita;
};

// =============================================================================
// TIPOS - DPS (Declaração de Prestação de Serviços)
// =============================================================================

export type TipoAmbiente = 1 | 2; // 1=Produção, 2=Homologação
export type TipoEmitente = 1 | 2 | 3; // 1=Prestador, 2=Tomador, 3=Intermediário
export type TipoSimplesNacional = 1 | 2 | 3; // 1=Não Optante, 2=MEI, 3=ME/EPP
export type TipoRegimeEspecial = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type TipoTributacaoISSQN = 1 | 2 | 3 | 4; // 1=Tributável, 2=Imune, 3=Exportação, 4=Não Incidência
export type TipoRetencaoISSQN = 1 | 2 | 3; // 1=Não Retido, 2=Tomador, 3=Intermediário

export interface EnderecoNacional {
  cMun: string;        // Código IBGE 7 dígitos
  CEP: string;         // CEP 8 dígitos
  xLgr: string;        // Logradouro
  nro: string;         // Número
  xCpl?: string;       // Complemento
  xBairro: string;     // Bairro
}

export interface PrestadorDPS {
  CNPJ?: string;       // CNPJ 14 dígitos
  CPF?: string;        // CPF 11 dígitos
  IM?: string;         // Inscrição Municipal
  xNome?: string;      // Nome/Razão Social
  email?: string;
  fone?: string;
  end?: {
    endNac?: EnderecoNacional;
  };
  regTrib: {
    opSimpNac: TipoSimplesNacional;
    regApTribSN?: 1 | 2 | 3;
    regEspTrib: TipoRegimeEspecial;
  };
}

export interface TomadorDPS {
  CNPJ?: string;
  CPF?: string;
  NIF?: string;        // Número Identificação Fiscal (exterior)
  cNaoNIF?: 0 | 1 | 2; // Motivo não informar NIF
  IM?: string;
  xNome: string;
  email?: string;
  fone?: string;
  end?: {
    endNac?: EnderecoNacional;
    endExt?: {
      cPais: string;
      cEndPost: string;
      xCidade: string;
      xEstProvReg: string;
    };
  };
}

export interface ServicoDPS {
  locPrest: {
    cLocPrestacao?: string;  // Código IBGE município
    cPaisPrestacao?: string; // Código ISO país (se exterior)
  };
  cServ: {
    cTribNac: string;        // Código LC 116 (6 dígitos)
    cTribMun?: string;       // Código tributação municipal
    xDescServ: string;       // Descrição do serviço (max 2000)
    cNBS?: string;           // Código NBS
  };
}

export interface ValoresDPS {
  vServPrest: {
    vReceb?: number;  // Valor recebido intermediário
    vServ: number;    // Valor serviço
  };
  vDescCondIncond?: {
    vDescIncond?: number;
    vDescCond?: number;
  };
  trib: {
    tribMun: {
      tribISSQN: TipoTributacaoISSQN;
      cPaisResult?: string;    // Se exportação
      tpImunidade?: number;    // Se imune
      tpRetISSQN: TipoRetencaoISSQN;
      pAliq?: number;          // Alíquota ISS
    };
    tribFed?: {
      piscofins?: {
        CST: string;
        vBCPisCofins?: number;
        pAliqPis?: number;
        pAliqCofins?: number;
        vPis?: number;
        vCofins?: number;
      };
      vRetCP?: number;
      vRetIRRF?: number;
      vRetCSLL?: number;
    };
    totTrib: {
      indTotTrib?: 0;
      vTotTrib?: {
        vTotTribFed: number;
        vTotTribEst: number;
        vTotTribMun: number;
      };
      pTotTrib?: {
        pTotTribFed: number;
        pTotTribEst: number;
        pTotTribMun: number;
      };
      pTotTribSN?: number;
    };
  };
}

export interface DPSData {
  tpAmb: TipoAmbiente;
  dhEmi: string;         // DateTime UTC: AAAA-MM-DDThh:mm:ssTZD
  verAplic: string;      // Versão aplicativo
  serie: string;         // Série DPS (5 chars)
  nDPS: string;          // Número DPS (15 chars)
  dCompet: string;       // Data competência: AAAA-MM-DD
  tpEmit: TipoEmitente;
  cLocEmi: string;       // Código IBGE município emissor
  subst?: {              // Se substituição
    chSubstda: string;   // Chave NFS-e substituída
    cMotivo: string;     // Código motivo
    xMotivo?: string;    // Descrição motivo
  };
  prest: PrestadorDPS;
  toma?: TomadorDPS;
  interm?: TomadorDPS;
  serv: ServicoDPS;
  valores: ValoresDPS;
}

// =============================================================================
// TIPOS - NFS-e (Resposta)
// =============================================================================

export interface NFSeNacional {
  chaveAcesso: string;
  numero: string;
  serie: string;
  dataEmissao: string;
  competencia: string;
  municipioEmissor: string;
  municipioPrestacao: string;
  codigoServico: string;
  descricaoServico: string;
  valorServico: number;
  valorDeducoes: number;
  baseCalculo: number;
  aliquotaISS: number;
  valorISS: number;
  valorLiquido: number;
  issRetido: boolean;
  status: 'normal' | 'cancelada' | 'substituida';
  prestador: {
    cpfCnpj: string;
    razaoSocial: string;
    inscricaoMunicipal?: string;
  };
  tomador?: {
    cpfCnpj: string;
    razaoSocial: string;
    email?: string;
  };
  xmlOriginal?: string;
}

export interface NFSeNacionalResult {
  sucesso: boolean;
  mensagem: string;
  nfse?: NFSeNacional;
  erros?: Array<{ codigo: string; descricao: string }>;
}

export interface NFSeListResultNacional {
  sucesso: boolean;
  mensagem: string;
  notas: NFSeNacional[];
  total: number;
  ultimoNSU?: string;
}

// =============================================================================
// TIPOS - EVENTOS
// =============================================================================

export type TipoEvento =
  | 'e101101'  // Cancelamento
  | 'e105102'  // Cancelamento por Substituição
  | 'e101103'  // Solicitação Análise Fiscal
  | 'e105104'  // Cancelamento Deferido
  | 'e105105'  // Cancelamento Indeferido
  | 'e202201'  // Confirmação Prestador
  | 'e203202'  // Confirmação Tomador
  | 'e204203'  // Confirmação Intermediário
  | 'e203206'  // Rejeição Tomador
  | 'e305101'; // Cancelamento por Ofício

export interface EventoNFSe {
  tipoEvento: TipoEvento;
  chaveAcesso: string;
  dataEvento: string;
  sequencial: number;
  descricao: string;
  codigoMotivo?: string;
  motivoDescricao?: string;
}

export interface EventoResult {
  sucesso: boolean;
  mensagem: string;
  evento?: EventoNFSe;
  erros?: Array<{ codigo: string; descricao: string }>;
}

// =============================================================================
// TIPOS - PARÂMETROS MUNICIPAIS
// =============================================================================

export interface ParametrosMunicipais {
  codigoMunicipio: string;
  nomeNunicipio: string;
  conveniado: boolean;
  ativo: boolean;
  usaEmissorPublico: boolean;
  prazoCancelamento?: number; // dias
}

export interface AliquotaServico {
  codigoServico: string;
  descricao: string;
  aliquotaMinima: number;
  aliquotaMaxima: number;
  aliquotaPadrao: number;
  permiteDeducao: boolean;
}

// =============================================================================
// CLIENTE HTTP COM mTLS
// =============================================================================

interface RequestOptions {
  method: 'GET' | 'POST' | 'HEAD';
  path: string;
  body?: object;
  certificate: LoadedCertificate;
}

async function apiRequest<T>(options: RequestOptions): Promise<T> {
  const baseUrl = getBaseUrl();
  const isContribuintes = options.path.startsWith('/nfse') || 
                          options.path.startsWith('/dps') || 
                          options.path.startsWith('/danfse');
  
  const host = isContribuintes ? baseUrl.sefin : baseUrl.adn;
  const basePath = isContribuintes ? '/contribuintes' : '';
  
  const url = new URL(`${host}${basePath}${options.path}`);
  
  return new Promise((resolve, reject) => {
    const requestOptions: https.RequestOptions = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: options.method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      // mTLS com certificado
      cert: options.certificate.cert,
      key: options.certificate.key,
      passphrase: options.certificate.passphrase,
      rejectUnauthorized: true,
    };
    
    const req = https.request(requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (options.method === 'HEAD') {
          resolve({ exists: res.statusCode === 200 } as T);
          return;
        }
        
        if (res.statusCode && res.statusCode >= 400) {
          try {
            const errorBody = JSON.parse(data);
            reject(new Error(errorBody.mensagem || `HTTP ${res.statusCode}`));
          } catch {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
          return;
        }
        
        try {
          const result = JSON.parse(data);
          resolve(result as T);
        } catch {
          // Para DANFSE que retorna PDF
          resolve(data as unknown as T);
        }
      });
    });
    
    req.on('error', (error) => {
      reject(new Error(`Erro de conexão: ${error.message}`));
    });
    
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Timeout na requisição'));
    });
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

// =============================================================================
// FUNÇÕES PÚBLICAS - EMISSÃO
// =============================================================================

/**
 * Emite NFS-e a partir de DPS
 */
export async function emitirNFSeNacional(
  dps: DPSData,
  orgCode?: string
): Promise<NFSeNacionalResult> {
  try {
    const certificate = await loadActiveCertificate();
    if (!certificate) {
      return {
        sucesso: false,
        mensagem: 'Certificado digital não configurado',
      };
    }
    
    // TODO: Assinar XML da DPS
    const dpsAssinada = await assinarDPS(dps, certificate);
    
    const response = await apiRequest<any>({
      method: 'POST',
      path: '/nfse',
      body: { dps: dpsAssinada },
      certificate,
    });
    
    if (response.nfse) {
      return {
        sucesso: true,
        mensagem: 'NFS-e emitida com sucesso',
        nfse: parseNFSeResponse(response.nfse),
      };
    }
    
    return {
      sucesso: false,
      mensagem: response.mensagem || 'Erro na emissão',
      erros: response.erros,
    };
  } catch (error) {
    return {
      sucesso: false,
      mensagem: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}

/**
 * Verifica se DPS já foi processada (idempotência)
 */
export async function verificarDPSExiste(
  idDPS: string
): Promise<{ existe: boolean; chaveAcesso?: string }> {
  try {
    const certificate = await loadActiveCertificate();
    if (!certificate) {
      throw new Error('Certificado não configurado');
    }
    
    // HEAD retorna apenas status
    const response = await apiRequest<{ exists: boolean }>({
      method: 'HEAD',
      path: `/dps/${idDPS}`,
      certificate,
    });
    
    if (!response.exists) {
      return { existe: false };
    }
    
    // GET para obter chave
    const dpsResponse = await apiRequest<{ chaveAcesso: string }>({
      method: 'GET',
      path: `/dps/${idDPS}`,
      certificate,
    });
    
    return {
      existe: true,
      chaveAcesso: dpsResponse.chaveAcesso,
    };
  } catch {
    return { existe: false };
  }
}

/**
 * Monta identificador único da DPS para idempotência
 * Formato: cLocEmi(7) + tpInsc(1) + inscFed(14) + serie(5) + nDPS(15)
 */
export function montarIdDPS(dps: DPSData): string {
  const cLocEmi = dps.cLocEmi.padStart(7, '0');
  const tpInsc = dps.prest.CNPJ ? '1' : '2';
  const inscFed = (dps.prest.CNPJ || dps.prest.CPF || '').padStart(14, '0');
  const serie = dps.serie.padStart(5, '0');
  const nDPS = dps.nDPS.padStart(15, '0');
  
  return `${cLocEmi}${tpInsc}${inscFed}${serie}${nDPS}`;
}

// =============================================================================
// FUNÇÕES PÚBLICAS - CONSULTA
// =============================================================================

/**
 * Consulta NFS-e por chave de acesso
 */
export async function consultarNFSeNacional(
  chaveAcesso: string
): Promise<NFSeNacionalResult> {
  try {
    const certificate = await loadActiveCertificate();
    if (!certificate) {
      return {
        sucesso: false,
        mensagem: 'Certificado digital não configurado',
      };
    }
    
    const response = await apiRequest<any>({
      method: 'GET',
      path: `/nfse/${chaveAcesso}`,
      certificate,
    });
    
    return {
      sucesso: true,
      mensagem: 'Consulta realizada com sucesso',
      nfse: parseNFSeResponse(response),
    };
  } catch (error) {
    return {
      sucesso: false,
      mensagem: error instanceof Error ? error.message : 'Erro na consulta',
    };
  }
}

/**
 * Consulta parâmetros do município
 */
export async function consultarParametrosMunicipio(
  codigoMunicipio: string
): Promise<ParametrosMunicipais | null> {
  try {
    const certificate = await loadActiveCertificate();
    if (!certificate) return null;
    
    const response = await apiRequest<any>({
      method: 'GET',
      path: `/parametrizacao/parametros_municipais/${codigoMunicipio}/convenio`,
      certificate,
    });
    
    return {
      codigoMunicipio: response.cMun,
      nomeNunicipio: response.xMun,
      conveniado: response.conveniado === true,
      ativo: response.ativo === true,
      usaEmissorPublico: response.usaEmissorPublico === true,
      prazoCancelamento: response.prazoCancelamento,
    };
  } catch {
    return null;
  }
}

/**
 * Consulta alíquotas de serviço do município
 */
export async function consultarAliquotaServico(
  codigoMunicipio: string,
  codigoServico: string
): Promise<AliquotaServico | null> {
  try {
    const certificate = await loadActiveCertificate();
    if (!certificate) return null;
    
    const response = await apiRequest<any>({
      method: 'GET',
      path: `/parametrizacao/parametros_municipais/${codigoMunicipio}/${codigoServico}`,
      certificate,
    });
    
    return {
      codigoServico: response.cServ,
      descricao: response.xDescServ,
      aliquotaMinima: response.aliqMin,
      aliquotaMaxima: response.aliqMax,
      aliquotaPadrao: response.aliqPadrao,
      permiteDeducao: response.permiteDeducao === true,
    };
  } catch {
    return null;
  }
}

// =============================================================================
// FUNÇÕES PÚBLICAS - EVENTOS
// =============================================================================

/**
 * Registra evento de cancelamento
 */
export async function cancelarNFSeNacional(
  chaveAcesso: string,
  codigoMotivo: string,
  descricaoMotivo: string
): Promise<EventoResult> {
  try {
    const certificate = await loadActiveCertificate();
    if (!certificate) {
      return {
        sucesso: false,
        mensagem: 'Certificado digital não configurado',
      };
    }
    
    const evento = {
      tipoEvento: 'e101101',
      chNFSe: chaveAcesso,
      nPedRegEvento: 1,
      e101101: {
        xDesc: 'Cancelamento de NFS-e',
        cMotivo: codigoMotivo,
        xMotivo: descricaoMotivo,
      },
    };
    
    // TODO: Assinar XML do evento
    const eventoAssinado = await assinarEvento(evento, certificate);
    
    const response = await apiRequest<any>({
      method: 'POST',
      path: `/nfse/${chaveAcesso}/eventos`,
      body: { pedRegEvento: eventoAssinado },
      certificate,
    });
    
    if (response.sucesso || response.evento) {
      return {
        sucesso: true,
        mensagem: 'NFS-e cancelada com sucesso',
        evento: {
          tipoEvento: 'e101101',
          chaveAcesso,
          dataEvento: new Date().toISOString(),
          sequencial: 1,
          descricao: 'Cancelamento de NFS-e',
          codigoMotivo,
          motivoDescricao: descricaoMotivo,
        },
      };
    }
    
    return {
      sucesso: false,
      mensagem: response.mensagem || 'Erro no cancelamento',
      erros: response.erros,
    };
  } catch (error) {
    return {
      sucesso: false,
      mensagem: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}

/**
 * Consulta eventos de uma NFS-e
 */
export async function consultarEventosNFSe(
  chaveAcesso: string
): Promise<EventoNFSe[]> {
  try {
    const certificate = await loadActiveCertificate();
    if (!certificate) return [];
    
    const response = await apiRequest<any[]>({
      method: 'GET',
      path: `/nfse/${chaveAcesso}/eventos`,
      certificate,
    });
    
    return (response || []).map(parseEventoResponse);
  } catch {
    return [];
  }
}

// =============================================================================
// FUNÇÕES PÚBLICAS - DANFSE
// =============================================================================

/**
 * Baixa PDF da NFS-e (DANFSE)
 */
export async function baixarDANFSE(
  chaveAcesso: string
): Promise<Buffer | null> {
  try {
    const certificate = await loadActiveCertificate();
    if (!certificate) return null;
    
    const response = await apiRequest<string>({
      method: 'GET',
      path: `/danfse/${chaveAcesso}`,
      certificate,
    });
    
    // Resposta é base64 ou binário
    return Buffer.from(response, 'base64');
  } catch {
    return null;
  }
}

// =============================================================================
// FUNÇÕES AUXILIARES
// =============================================================================

function parseNFSeResponse(data: any): NFSeNacional {
  return {
    chaveAcesso: data.chaveAcesso || data.infNFSe?.Id || '',
    numero: data.nNFSe || data.numero || '',
    serie: data.serie || '',
    dataEmissao: data.dhProc || data.dataEmissao || '',
    competencia: data.dCompet || data.competencia || '',
    municipioEmissor: data.xLocEmi || '',
    municipioPrestacao: data.xLocPrestacao || '',
    codigoServico: data.cTribNac || '',
    descricaoServico: data.xTribNac || '',
    valorServico: parseFloat(data.vServ || data.valorServico || 0),
    valorDeducoes: parseFloat(data.vDR || 0),
    baseCalculo: parseFloat(data.vBC || 0),
    aliquotaISS: parseFloat(data.pAliqAplic || 0),
    valorISS: parseFloat(data.vISSQN || 0),
    valorLiquido: parseFloat(data.vLiq || 0),
    issRetido: data.tpRetISSQN === 2 || data.tpRetISSQN === 3,
    status: determinarStatus(data),
    prestador: {
      cpfCnpj: data.emit?.CNPJ || data.emit?.CPF || '',
      razaoSocial: data.emit?.xNome || '',
      inscricaoMunicipal: data.emit?.IM,
    },
    tomador: data.toma ? {
      cpfCnpj: data.toma.CNPJ || data.toma.CPF || '',
      razaoSocial: data.toma.xNome || '',
      email: data.toma.email,
    } : undefined,
    xmlOriginal: data.xmlOriginal,
  };
}

function determinarStatus(data: any): 'normal' | 'cancelada' | 'substituida' {
  // Verificar eventos vinculados
  if (data.eventos) {
    const hasCancelamento = data.eventos.some(
      (e: any) => e.tipoEvento === 'e101101' || 
                  e.tipoEvento === 'e105104' || 
                  e.tipoEvento === 'e305101'
    );
    if (hasCancelamento) return 'cancelada';
    
    const hasSubstituicao = data.eventos.some(
      (e: any) => e.tipoEvento === 'e105102'
    );
    if (hasSubstituicao) return 'substituida';
  }
  
  return 'normal';
}

function parseEventoResponse(data: any): EventoNFSe {
  return {
    tipoEvento: data.tipoEvento || data.tpEvento,
    chaveAcesso: data.chNFSe || data.chaveAcesso,
    dataEvento: data.dhEvento || data.dataEvento,
    sequencial: data.nSeqEvento || 1,
    descricao: data.xDesc || data.descricao || '',
    codigoMotivo: data.cMotivo,
    motivoDescricao: data.xMotivo,
  };
}

// =============================================================================
// ASSINATURA XML - IMPLEMENTAÇÃO REAL
// =============================================================================

const NFSE_NAMESPACE = 'http://www.sped.fazenda.gov.br/nfse';

/**
 * Converte LoadedCertificate para CertificateData (node-forge)
 */
function toCertificateData(loaded: LoadedCertificate): CertificateData {
  const cert = forge.pki.certificateFromPem(loaded.cert);
  const privateKey = forge.pki.privateKeyFromPem(loaded.key);
  return { cert, privateKey };
}

/**
 * Formata valor monetário para XML (2 casas decimais)
 */
function formatValor(valor?: number): string {
  return valor !== undefined ? valor.toFixed(2) : '0.00';
}

/**
 * Gera ID único para a DPS
 * Formato: DPS + cLocEmi(7) + tpInsc(1) + inscFed(14) + serie(5) + nDPS(15)
 */
function gerarIdDPS(dps: DPSData): string {
  const cLocEmi = dps.cLocEmi.padStart(7, '0');
  const tpInsc = dps.prest.CNPJ ? '1' : '2';
  const inscFed = (dps.prest.CNPJ || dps.prest.CPF || '').padStart(14, '0');
  const serie = dps.serie.padStart(5, '0');
  const nDPS = dps.nDPS.padStart(15, '0');
  return `DPS${cLocEmi}${tpInsc}${inscFed}${serie}${nDPS}`;
}

/**
 * Converte DPS para XML
 */
function dpsToXml(dps: DPSData): string {
  const idDPS = gerarIdDPS(dps);
  
  // Prestador
  let prestXml = '';
  if (dps.prest.CNPJ) prestXml += `<CNPJ>${dps.prest.CNPJ}</CNPJ>`;
  if (dps.prest.CPF) prestXml += `<CPF>${dps.prest.CPF}</CPF>`;
  if (dps.prest.IM) prestXml += `<IM>${dps.prest.IM}</IM>`;
  if (dps.prest.xNome) prestXml += `<xNome>${escapeXml(dps.prest.xNome)}</xNome>`;
  if (dps.prest.email) prestXml += `<email>${escapeXml(dps.prest.email)}</email>`;
  prestXml += `<regTrib>`;
  prestXml += `<opSimpNac>${dps.prest.regTrib.opSimpNac}</opSimpNac>`;
  prestXml += `<regEspTrib>${dps.prest.regTrib.regEspTrib}</regEspTrib>`;
  prestXml += `</regTrib>`;
  
  // Tomador (opcional)
  let tomaXml = '';
  if (dps.toma) {
    tomaXml = '<toma>';
    if (dps.toma.CNPJ) tomaXml += `<CNPJ>${dps.toma.CNPJ}</CNPJ>`;
    if (dps.toma.CPF) tomaXml += `<CPF>${dps.toma.CPF}</CPF>`;
    tomaXml += `<xNome>${escapeXml(dps.toma.xNome)}</xNome>`;
    if (dps.toma.email) tomaXml += `<email>${escapeXml(dps.toma.email)}</email>`;
    if (dps.toma.end?.endNac) {
      tomaXml += `<end><endNac>`;
      tomaXml += `<cMun>${dps.toma.end.endNac.cMun}</cMun>`;
      tomaXml += `<CEP>${dps.toma.end.endNac.CEP}</CEP>`;
      tomaXml += `<xLgr>${escapeXml(dps.toma.end.endNac.xLgr)}</xLgr>`;
      tomaXml += `<nro>${escapeXml(dps.toma.end.endNac.nro)}</nro>`;
      if (dps.toma.end.endNac.xCpl) tomaXml += `<xCpl>${escapeXml(dps.toma.end.endNac.xCpl)}</xCpl>`;
      tomaXml += `<xBairro>${escapeXml(dps.toma.end.endNac.xBairro)}</xBairro>`;
      tomaXml += `</endNac></end>`;
    }
    tomaXml += '</toma>';
  }
  
  // Serviço
  let servXml = '<serv>';
  servXml += '<locPrest>';
  if (dps.serv.locPrest.cLocPrestacao) {
    servXml += `<cLocPrestacao>${dps.serv.locPrest.cLocPrestacao}</cLocPrestacao>`;
  }
  if (dps.serv.locPrest.cPaisPrestacao) {
    servXml += `<cPaisPrestacao>${dps.serv.locPrest.cPaisPrestacao}</cPaisPrestacao>`;
  }
  servXml += '</locPrest>';
  servXml += '<cServ>';
  servXml += `<cTribNac>${dps.serv.cServ.cTribNac}</cTribNac>`;
  if (dps.serv.cServ.cTribMun) servXml += `<cTribMun>${dps.serv.cServ.cTribMun}</cTribMun>`;
  servXml += `<xDescServ>${escapeXml(dps.serv.cServ.xDescServ)}</xDescServ>`;
  if (dps.serv.cServ.cNBS) servXml += `<cNBS>${dps.serv.cServ.cNBS}</cNBS>`;
  servXml += '</cServ>';
  servXml += '</serv>';
  
  // Valores
  let valoresXml = '<valores>';
  valoresXml += '<vServPrest>';
  valoresXml += `<vServ>${formatValor(dps.valores.vServPrest.vServ)}</vServ>`;
  if (dps.valores.vServPrest.vReceb !== undefined) {
    valoresXml += `<vReceb>${formatValor(dps.valores.vServPrest.vReceb)}</vReceb>`;
  }
  valoresXml += '</vServPrest>';
  
  if (dps.valores.vDescCondIncond) {
    valoresXml += '<vDescCondIncond>';
    if (dps.valores.vDescCondIncond.vDescIncond !== undefined) {
      valoresXml += `<vDescIncond>${formatValor(dps.valores.vDescCondIncond.vDescIncond)}</vDescIncond>`;
    }
    if (dps.valores.vDescCondIncond.vDescCond !== undefined) {
      valoresXml += `<vDescCond>${formatValor(dps.valores.vDescCondIncond.vDescCond)}</vDescCond>`;
    }
    valoresXml += '</vDescCondIncond>';
  }
  
  valoresXml += '<trib>';
  valoresXml += '<tribMun>';
  valoresXml += `<tribISSQN>${dps.valores.trib.tribMun.tribISSQN}</tribISSQN>`;
  valoresXml += `<tpRetISSQN>${dps.valores.trib.tribMun.tpRetISSQN}</tpRetISSQN>`;
  if (dps.valores.trib.tribMun.pAliq !== undefined) {
    valoresXml += `<pAliq>${formatValor(dps.valores.trib.tribMun.pAliq * 100)}</pAliq>`;
  }
  valoresXml += '</tribMun>';
  valoresXml += '<totTrib>';
  valoresXml += `<indTotTrib>${dps.valores.trib.totTrib.indTotTrib || 0}</indTotTrib>`;
  valoresXml += '</totTrib>';
  valoresXml += '</trib>';
  valoresXml += '</valores>';
  
  // Substituição (opcional)
  let substXml = '';
  if (dps.subst) {
    substXml = '<subst>';
    substXml += `<chSubstda>${dps.subst.chSubstda}</chSubstda>`;
    substXml += `<cMotivo>${dps.subst.cMotivo}</cMotivo>`;
    if (dps.subst.xMotivo) substXml += `<xMotivo>${escapeXml(dps.subst.xMotivo)}</xMotivo>`;
    substXml += '</subst>';
  }
  
  // Monta XML completo
  const xml = `<DPS versao="1.00" xmlns="${NFSE_NAMESPACE}">` +
    `<infDPS Id="${idDPS}">` +
    `<tpAmb>${dps.tpAmb}</tpAmb>` +
    `<dhEmi>${dps.dhEmi}</dhEmi>` +
    `<verAplic>${dps.verAplic}</verAplic>` +
    `<serie>${dps.serie}</serie>` +
    `<nDPS>${dps.nDPS}</nDPS>` +
    `<dCompet>${dps.dCompet}</dCompet>` +
    `<tpEmit>${dps.tpEmit}</tpEmit>` +
    `<cLocEmi>${dps.cLocEmi}</cLocEmi>` +
    substXml +
    `<prest>${prestXml}</prest>` +
    tomaXml +
    servXml +
    valoresXml +
    `</infDPS>` +
    `</DPS>`;
  
  return xml;
}

/**
 * Escape caracteres especiais para XML
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Assina DPS usando XMLDSig
 */
async function assinarDPS(
  dps: DPSData,
  certificate: LoadedCertificate
): Promise<string> {
  const xml = dpsToXml(dps);
  const certData = toCertificateData(certificate);
  
  return signXml(xml, certData, {
    referenceUri: `#${gerarIdDPS(dps)}`,
    insertBeforeTag: 'infDPS',
  });
}

/**
 * Gera XML do pedido de registro de evento
 */
function eventoToXml(
  chaveAcesso: string,
  tipoEvento: string,
  sequencial: number,
  codigoMotivo: string,
  descricaoMotivo: string
): string {
  const idPedido = `PED${Date.now()}`;
  const dataEvento = new Date().toISOString();
  
  const xml = `<pedRegEvento versao="1.00" xmlns="${NFSE_NAMESPACE}">` +
    `<infPedReg Id="${idPedido}">` +
    `<tpAmb>${process.env.NFSE_NACIONAL_AMBIENTE === 'producao' ? 1 : 2}</tpAmb>` +
    `<verAplic>1.0.0</verAplic>` +
    `<dhEvento>${dataEvento}</dhEvento>` +
    `<chNFSe>${chaveAcesso}</chNFSe>` +
    `<nPedRegEvento>${sequencial}</nPedRegEvento>` +
    `<${tipoEvento}>` +
    `<xDesc>Cancelamento de NFS-e</xDesc>` +
    `<cMotivo>${codigoMotivo}</cMotivo>` +
    `<xMotivo>${escapeXml(descricaoMotivo)}</xMotivo>` +
    `</${tipoEvento}>` +
    `</infPedReg>` +
    `</pedRegEvento>`;
  
  return xml;
}

/**
 * Assina evento usando XMLDSig
 */
async function assinarEvento(
  evento: {
    tipoEvento: string;
    chNFSe: string;
    nPedRegEvento: number;
    e101101: { xDesc: string; cMotivo: string; xMotivo: string };
  },
  certificate: LoadedCertificate
): Promise<string> {
  const xml = eventoToXml(
    evento.chNFSe,
    evento.tipoEvento,
    evento.nPedRegEvento,
    evento.e101101.cMotivo,
    evento.e101101.xMotivo
  );
  
  const certData = toCertificateData(certificate);
  
  return signXml(xml, certData, {
    insertBeforeTag: 'infPedReg',
  });
}

// =============================================================================
// VALIDAÇÃO DE CONECTIVIDADE
// =============================================================================

/**
 * Testa conexão com a API
 */
export async function validarConexaoNacional(): Promise<{
  sucesso: boolean;
  mensagem: string;
  ambiente: string;
}> {
  const ambiente = process.env.NFSE_NACIONAL_AMBIENTE || 'producaoRestrita';
  
  try {
    const certificate = await loadActiveCertificate();
    if (!certificate) {
      return {
        sucesso: false,
        mensagem: 'Certificado digital não configurado',
        ambiente,
      };
    }
    
    // Tenta consultar parâmetros de São Paulo como health check
    const params = await consultarParametrosMunicipio('3550308');
    
    if (params) {
      return {
        sucesso: true,
        mensagem: `Conexão estabelecida com ${ambiente}`,
        ambiente,
      };
    }
    
    return {
      sucesso: false,
      mensagem: 'Falha na validação de conectividade',
      ambiente,
    };
  } catch (error) {
    return {
      sucesso: false,
      mensagem: error instanceof Error ? error.message : 'Erro de conexão',
      ambiente,
    };
  }
}

