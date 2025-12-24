/**
 * Motor Fiscal - Catálogo de Erros Unificado
 * 
 * Ref: docs/spec-fiscal/05-erros-e-tratamento.md
 */

import { CategoriaErro, ErroFiscal, TipoDocumento } from './types';

// Re-export CategoriaErro para uso externo
export { CategoriaErro } from './types';

// ============================================================================
// CLASSE DE ERRO FISCAL
// ============================================================================

export class FiscalError extends Error implements ErroFiscal {
  codigo: string;
  categoria: CategoriaErro;
  mensagemUsuario: string;
  tipoDocumento?: TipoDocumento;
  campo?: string;
  valorRecebido?: string;
  valorEsperado?: string;
  codigoAutoridade?: string;
  mensagemAutoridade?: string;
  recuperavel: boolean;
  acaoSugerida: string;

  constructor(erro: ErroFiscal) {
    super(erro.mensagem);
    this.name = 'FiscalError';
    this.codigo = erro.codigo;
    this.categoria = erro.categoria;
    this.mensagemUsuario = erro.mensagemUsuario;
    this.tipoDocumento = erro.tipoDocumento;
    this.campo = erro.campo;
    this.valorRecebido = erro.valorRecebido;
    this.valorEsperado = erro.valorEsperado;
    this.codigoAutoridade = erro.codigoAutoridade;
    this.mensagemAutoridade = erro.mensagemAutoridade;
    this.recuperavel = erro.recuperavel;
    this.acaoSugerida = erro.acaoSugerida;
  }

  // Implementa a propriedade 'mensagem' requerida pela interface ErroFiscal
  get mensagem(): string {
    return this.message;
  }

  toJSON(): ErroFiscal {
    return {
      codigo: this.codigo,
      categoria: this.categoria,
      mensagem: this.message,
      mensagemUsuario: this.mensagemUsuario,
      tipoDocumento: this.tipoDocumento,
      campo: this.campo,
      valorRecebido: this.valorRecebido,
      valorEsperado: this.valorEsperado,
      codigoAutoridade: this.codigoAutoridade,
      mensagemAutoridade: this.mensagemAutoridade,
      recuperavel: this.recuperavel,
      acaoSugerida: this.acaoSugerida,
    };
  }
}

// ============================================================================
// CATÁLOGO DE ERROS
// ============================================================================

export const ERROS = {
  // Validação
  VAL_001: (campo: string) => new FiscalError({
    codigo: 'FISCAL-VAL-001',
    categoria: CategoriaErro.VALIDACAO,
    mensagem: `Campo obrigatório ausente: ${campo}`,
    mensagemUsuario: `O campo ${campo} é obrigatório.`,
    campo,
    recuperavel: true,
    acaoSugerida: 'Adicionar o campo obrigatório',
  }),

  VAL_002: (campo: string, valorRecebido: string) => new FiscalError({
    codigo: 'FISCAL-VAL-002',
    categoria: CategoriaErro.VALIDACAO,
    mensagem: `Formato de campo inválido: ${campo}`,
    mensagemUsuario: `O formato do campo ${campo} está incorreto.`,
    campo,
    valorRecebido,
    recuperavel: true,
    acaoSugerida: 'Corrigir o formato do campo',
  }),

  VAL_003: (campo: string, valorRecebido: string, valorEsperado: string) => new FiscalError({
    codigo: 'FISCAL-VAL-003',
    categoria: CategoriaErro.VALIDACAO,
    mensagem: `Valor fora do range: ${campo}`,
    mensagemUsuario: `O valor de ${campo} está fora do permitido.`,
    campo,
    valorRecebido,
    valorEsperado,
    recuperavel: true,
    acaoSugerida: 'Ajustar o valor para o range permitido',
  }),

  VAL_004: (cpfCnpj: string) => new FiscalError({
    codigo: 'FISCAL-VAL-004',
    categoria: CategoriaErro.VALIDACAO,
    mensagem: `CPF/CNPJ inválido: ${cpfCnpj}`,
    mensagemUsuario: 'O CPF/CNPJ informado é inválido.',
    campo: 'cpfCnpj',
    valorRecebido: cpfCnpj,
    recuperavel: true,
    acaoSugerida: 'Verificar e corrigir o documento',
  }),

  VAL_005: (campo: string, data: string) => new FiscalError({
    codigo: 'FISCAL-VAL-005',
    categoria: CategoriaErro.VALIDACAO,
    mensagem: `Data inválida: ${campo}`,
    mensagemUsuario: `A data informada em ${campo} é inválida.`,
    campo,
    valorRecebido: data,
    recuperavel: true,
    acaoSugerida: 'Corrigir a data',
  }),

  VAL_006: (codigo: string) => new FiscalError({
    codigo: 'FISCAL-VAL-006',
    categoria: CategoriaErro.VALIDACAO,
    mensagem: `Código de serviço inválido: ${codigo}`,
    mensagemUsuario: 'O código de serviço não foi encontrado na LC 116/2003.',
    campo: 'codigoServico',
    valorRecebido: codigo,
    recuperavel: true,
    acaoSugerida: 'Verificar tabela LC 116/2003',
  }),

  // Schema
  SCH_001: (detalhe: string) => new FiscalError({
    codigo: 'FISCAL-SCH-001',
    categoria: CategoriaErro.SCHEMA,
    mensagem: `XML mal formado: ${detalhe}`,
    mensagemUsuario: 'Erro na estrutura do documento.',
    recuperavel: true,
    acaoSugerida: 'Corrigir a estrutura do XML',
  }),

  // Autenticação
  AUT_001: () => new FiscalError({
    codigo: 'FISCAL-AUT-001',
    categoria: CategoriaErro.AUTENTICACAO,
    mensagem: 'Certificado digital não apresentado',
    mensagemUsuario: 'Certificado digital não configurado.',
    recuperavel: false,
    acaoSugerida: 'Configurar certificado em Configurações',
  }),

  AUT_002: (dataExpiracao: string) => new FiscalError({
    codigo: 'FISCAL-AUT-002',
    categoria: CategoriaErro.AUTENTICACAO,
    mensagem: `Certificado expirado em ${dataExpiracao}`,
    mensagemUsuario: 'Seu certificado digital expirou.',
    recuperavel: false,
    acaoSugerida: 'Renovar o certificado digital',
  }),

  AUT_005: (cnpjCert: string, cnpjConfig: string) => new FiscalError({
    codigo: 'FISCAL-AUT-005',
    categoria: CategoriaErro.AUTENTICACAO,
    mensagem: `CNPJ do certificado (${cnpjCert}) diverge do configurado (${cnpjConfig})`,
    mensagemUsuario: 'O certificado não corresponde à empresa.',
    recuperavel: false,
    acaoSugerida: 'Usar o certificado correto',
  }),

  AUT_006: () => new FiscalError({
    codigo: 'FISCAL-AUT-006',
    categoria: CategoriaErro.AUTENTICACAO,
    mensagem: 'Assinatura digital inválida',
    mensagemUsuario: 'Erro na assinatura do documento.',
    recuperavel: true,
    acaoSugerida: 'Verificar certificado e reassinar',
  }),

  // Autorização
  AZN_001: () => new FiscalError({
    codigo: 'FISCAL-AZN-001',
    categoria: CategoriaErro.AUTORIZACAO,
    mensagem: 'Contribuinte não cadastrado',
    mensagemUsuario: 'Sua empresa não está cadastrada no sistema fiscal.',
    recuperavel: false,
    acaoSugerida: 'Cadastrar no CNC ou SEFAZ',
  }),

  AZN_003: (municipio: string) => new FiscalError({
    codigo: 'FISCAL-AZN-003',
    categoria: CategoriaErro.AUTORIZACAO,
    mensagem: `Município ${municipio} não conveniado ao SN NFS-e`,
    mensagemUsuario: 'O município não participa do sistema nacional de NFS-e.',
    recuperavel: false,
    acaoSugerida: 'Usar API municipal própria',
  }),

  // Rejeição
  REJ_001: (chave: string) => new FiscalError({
    codigo: 'FISCAL-REJ-001',
    categoria: CategoriaErro.REJEICAO,
    mensagem: `Documento já autorizado: ${chave}`,
    mensagemUsuario: 'Este documento já foi emitido anteriormente.',
    recuperavel: false,
    acaoSugerida: 'Usar o documento existente',
  }),

  REJ_002: () => new FiscalError({
    codigo: 'FISCAL-REJ-002',
    categoria: CategoriaErro.REJEICAO,
    mensagem: 'Documento já cancelado',
    mensagemUsuario: 'Este documento já está cancelado.',
    recuperavel: false,
    acaoSugerida: 'Nenhuma ação necessária',
  }),

  REJ_003: () => new FiscalError({
    codigo: 'FISCAL-REJ-003',
    categoria: CategoriaErro.REJEICAO,
    mensagem: 'Prazo de cancelamento expirado',
    mensagemUsuario: 'O prazo para cancelamento expirou.',
    recuperavel: false,
    acaoSugerida: 'Solicitar análise fiscal ao município',
  }),

  REJ_004: () => new FiscalError({
    codigo: 'FISCAL-REJ-004',
    categoria: CategoriaErro.REJEICAO,
    mensagem: 'Evento duplicado',
    mensagemUsuario: 'Esta operação já foi realizada.',
    recuperavel: false,
    acaoSugerida: 'Nenhuma ação necessária (operação idempotente)',
  }),

  // Denegação
  DEN_001: () => new FiscalError({
    codigo: 'FISCAL-DEN-001',
    categoria: CategoriaErro.DENEGACAO,
    mensagem: 'Emitente irregular',
    mensagemUsuario: 'A empresa emitente possui irregularidade fiscal.',
    recuperavel: false,
    acaoSugerida: 'Regularizar situação cadastral',
  }),

  // Ambiente
  AMB_001: () => new FiscalError({
    codigo: 'FISCAL-AMB-001',
    categoria: CategoriaErro.AMBIENTE,
    mensagem: 'Serviço indisponível',
    mensagemUsuario: 'O serviço fiscal está temporariamente indisponível.',
    recuperavel: true,
    acaoSugerida: 'Aguardar e tentar novamente',
  }),

  AMB_002: () => new FiscalError({
    codigo: 'FISCAL-AMB-002',
    categoria: CategoriaErro.AMBIENTE,
    mensagem: 'Timeout na comunicação',
    mensagemUsuario: 'A requisição demorou muito para responder.',
    recuperavel: true,
    acaoSugerida: 'Verificar situação e tentar novamente',
  }),

  // Interno
  INT_001: (detalhe: string) => new FiscalError({
    codigo: 'FISCAL-INT-001',
    categoria: CategoriaErro.INTERNO,
    mensagem: `Erro de configuração: ${detalhe}`,
    mensagemUsuario: 'Erro interno de configuração.',
    recuperavel: false,
    acaoSugerida: 'Verificar configuração do sistema',
  }),

  INT_004: (estadoLocal: string, estadoRemoto: string) => new FiscalError({
    codigo: 'FISCAL-INT-004',
    categoria: CategoriaErro.INTERNO,
    mensagem: `Estado inconsistente: local=${estadoLocal}, remoto=${estadoRemoto}`,
    mensagemUsuario: 'Houve uma inconsistência de dados.',
    recuperavel: true,
    acaoSugerida: 'Sincronizar com a autoridade fiscal',
  }),
};

// ============================================================================
// MAPEADORES
// ============================================================================

/**
 * Mapeia erro da NFS-e SP para ErroFiscal
 */
export const mapearErroSP = (codigoSP: string, descricao: string): FiscalError => {
  const mapa: Record<string, () => FiscalError> = {
    '100': () => ERROS.AUT_006(),
    '1000': () => ERROS.REJ_001('RPS já convertido'),
    '1100': () => ERROS.REJ_002(),
    '1200': () => ERROS.REJ_003(),
  };

  const criar = mapa[codigoSP];
  if (criar) {
    const erro = criar();
    erro.codigoAutoridade = codigoSP;
    erro.mensagemAutoridade = descricao;
    erro.tipoDocumento = 'NFSE_SP';
    return erro;
  }

  // Erro genérico
  return new FiscalError({
    codigo: 'FISCAL-REJ-999',
    categoria: CategoriaErro.REJEICAO,
    mensagem: descricao,
    mensagemUsuario: descricao,
    codigoAutoridade: codigoSP,
    mensagemAutoridade: descricao,
    tipoDocumento: 'NFSE_SP',
    recuperavel: false,
    acaoSugerida: 'Verificar detalhes do erro',
  });
};

/**
 * Mapeia erro da SEFAZ (cStat) para ErroFiscal
 */
export const mapearErroSEFAZ = (cStat: number, xMotivo: string, tipo: 'NFE' | 'NFCE'): FiscalError => {
  // Denegações
  if (cStat >= 301 && cStat <= 302) {
    const erro = ERROS.DEN_001();
    erro.codigoAutoridade = String(cStat);
    erro.mensagemAutoridade = xMotivo;
    erro.tipoDocumento = tipo;
    return erro;
  }

  // Duplicidade
  if (cStat === 204) {
    return new FiscalError({
      codigo: 'FISCAL-REJ-001',
      categoria: CategoriaErro.REJEICAO,
      mensagem: xMotivo,
      mensagemUsuario: 'Este documento já foi autorizado.',
      codigoAutoridade: String(cStat),
      mensagemAutoridade: xMotivo,
      tipoDocumento: tipo,
      recuperavel: false,
      acaoSugerida: 'Consultar documento existente',
    });
  }

  // Cancelado
  if (cStat === 206) {
    const erro = ERROS.REJ_002();
    erro.codigoAutoridade = String(cStat);
    erro.mensagemAutoridade = xMotivo;
    erro.tipoDocumento = tipo;
    return erro;
  }

  // Prazo expirado
  if (cStat === 501) {
    const erro = ERROS.REJ_003();
    erro.codigoAutoridade = String(cStat);
    erro.mensagemAutoridade = xMotivo;
    erro.tipoDocumento = tipo;
    return erro;
  }

  // Evento duplicado
  if (cStat === 539) {
    const erro = ERROS.REJ_004();
    erro.codigoAutoridade = String(cStat);
    erro.mensagemAutoridade = xMotivo;
    erro.tipoDocumento = tipo;
    return erro;
  }

  // Genérico
  return new FiscalError({
    codigo: `FISCAL-REJ-${cStat}`,
    categoria: CategoriaErro.REJEICAO,
    mensagem: xMotivo,
    mensagemUsuario: 'Documento rejeitado pela SEFAZ.',
    codigoAutoridade: String(cStat),
    mensagemAutoridade: xMotivo,
    tipoDocumento: tipo,
    recuperavel: cStat >= 200 && cStat < 300,
    acaoSugerida: 'Verificar detalhes da rejeição',
  });
};

// ============================================================================
// VERIFICADORES
// ============================================================================

/**
 * Verifica se erro é recuperável (pode fazer retry)
 */
export const isRecuperavel = (erro: Error): boolean => {
  if (erro instanceof FiscalError) {
    return erro.recuperavel;
  }

  // Erros de rede são recuperáveis
  const code = (erro as any).code;
  if (code === 'ETIMEDOUT' || code === 'ECONNRESET' || code === 'ECONNREFUSED') {
    return true;
  }

  // HTTP 5xx são recuperáveis
  const statusCode = (erro as any).statusCode;
  if (statusCode >= 500 && statusCode < 600) {
    return true;
  }

  // 429 (rate limit) é recuperável
  if (statusCode === 429) {
    return true;
  }

  return false;
};

