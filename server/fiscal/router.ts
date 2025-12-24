/**
 * Motor Fiscal - Router tRPC
 * 
 * Expõe endpoints do Motor Fiscal para o frontend e API.
 * Integra com sistema existente mantendo compatibilidade.
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure, accountantProcedure, withPermission, type Context } from '../trpc';
import { getDb, schema } from '../db';
import { eq, and, desc, between, sql } from 'drizzle-orm';

// Core Fiscal
import {
  decidirDocumentoFiscal,
  isNFSe,
  isNFe,
  getModeloFiscal,
  DecisaoFiscalInput,
  RegimeTributario,
  TipoDocumento,
  EstadoDocumentoFiscal,
} from './index';

import {
  validarCpf,
  validarCnpj,
  validarCpfCnpj,
  validarCodigoMunicipio,
  validarUF,
  validarNCM,
  validarCFOP,
} from './validators';

import { validarRPSSP, DadosRPSSP } from './validators/nfse-sp';

import {
  FiscalError,
  ERROS,
  CategoriaErro,
} from './errors';

import {
  MaquinaEstadoFiscal,
  podeTransitar,
  isEstadoFinal,
} from './estado-machine';

import {
  gerarCorrelationId,
  gerarIdNFSeSP,
} from './idempotencia';

import {
  FiscalLogger,
  registrarAuditoria,
  mascararDocumento,
  obterMetricas,
} from './auditoria';

import {
  NFSeSPAdapter,
  criarNFSeSPAdapter,
  setFeatureFlags,
  getFeatureFlags,
  EmissaoRPSParamsLegado,
} from './integradores/nfse-sp-adapter';

// NF-e / NFC-e
import {
  NFeService,
  criarNFeService,
  NFCeService,
  criarNFCeService,
  getEndpointsUF,
  getUFsSuportadas,
  isUFSuportada,
} from './integradores/nfe';

// ============================================================================
// SCHEMAS ZOD
// ============================================================================

const DecisaoFiscalInputSchema = z.object({
  tipoOperacao: z.enum(['SERVICO', 'MERCADORIA', 'MISTO']),
  emitente: z.object({
    cpfCnpj: z.string().min(11).max(18),
    uf: z.string().length(2),
    codigoMunicipio: z.string().length(7),
    inscricaoEstadual: z.string().optional(),
    inscricaoMunicipal: z.string().optional(),
    regimeTributario: z.enum(['SIMPLES_NACIONAL', 'LUCRO_PRESUMIDO', 'LUCRO_REAL', 'MEI']),
  }),
  destinatario: z.object({
    tipo: z.enum(['PJ', 'PF', 'ESTRANGEIRO']),
    cpfCnpj: z.string().optional(),
    uf: z.string().optional(),
    codigoMunicipio: z.string().optional(),
    isConsumidorFinal: z.boolean(),
  }),
  localVenda: z.enum(['PRESENCIAL', 'INTERNET', 'TELEFONE', 'DOMICILIO']),
  valorTotal: z.number().positive(),
  servico: z.object({
    codigoLC116: z.string(),
    codigoTribNacional: z.string().optional(),
  }).optional(),
  mercadoria: z.object({
    ncm: z.string(),
    cfop: z.string(),
  }).optional(),
});

const ValidarDocumentoSchema = z.object({
  tipo: z.enum(['cpf', 'cnpj', 'municipio', 'uf', 'ncm', 'cfop']),
  valor: z.string(),
});

const EmitirRPSSPSchema = z.object({
  serieRPS: z.string().max(5),
  numeroRPS: z.number().positive(),
  dataEmissao: z.string(),
  tipoTributacao: z.enum(['T', 'F', 'A', 'B', 'M', 'N', 'X']),
  codigoServico: z.string(),
  aliquota: z.number().min(0).max(100),
  valorServicos: z.number().positive(),
  valorDeducoes: z.number().optional(),
  issRetido: z.boolean(),
  discriminacao: z.string().max(2000),
  tomador: z.object({
    cpfCnpj: z.string(),
    razaoSocial: z.string().optional(),
    email: z.string().email().optional(),
    endereco: z.object({
      logradouro: z.string().optional(),
      numero: z.string().optional(),
      bairro: z.string().optional(),
      cidade: z.string().optional(),
      uf: z.string().optional(),
      cep: z.string().optional(),
    }).optional(),
  }),
});

const FeatureFlagsSchema = z.object({
  usarNovoCore: z.boolean().optional(),
  shadowMode: z.boolean().optional(),
  logComparacao: z.boolean().optional(),
});

// ============================================================================
// ROUTER FISCAL
// ============================================================================

export const fiscalRouter = router({
  // --------------------------------------------------------------------------
  // DECISOR FISCAL
  // --------------------------------------------------------------------------
  
  /**
   * Decide qual documento fiscal emitir baseado nos dados da operação
   */
  decidir: protectedProcedure
    .input(DecisaoFiscalInputSchema)
    .query(async ({ input, ctx }) => {
      const logger = new FiscalLogger(gerarCorrelationId());
      logger.setContext({
        userId: ctx.user?.id?.toString(),
        orgId: (ctx as any).organization?.id,
      });
      
      try {
        const decisaoInput: DecisaoFiscalInput = {
          ...input,
          emitente: {
            ...input.emitente,
            regimeTributario: input.emitente.regimeTributario as RegimeTributario,
          },
        };
        
        const decisao = await decidirDocumentoFiscal(decisaoInput);
        
        logger.info('decisao_fiscal', {
          tipoDocumento: decisao.tipoDocumento,
        });
        
        return {
          tipoDocumento: decisao.tipoDocumento,
          motivo: decisao.motivo,
          regras: decisao.regras,
          modelo: getModeloFiscal(decisao.tipoDocumento),
          isNFSe: isNFSe(decisao.tipoDocumento),
          isNFe: isNFe(decisao.tipoDocumento),
        };
      } catch (error: any) {
        logger.error('decisao_fiscal_erro', error);
        
        if (error instanceof FiscalError) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: error.mensagemUsuario,
            cause: error.toJSON(),
          });
        }
        throw error;
      }
    }),

  // --------------------------------------------------------------------------
  // VALIDADORES
  // --------------------------------------------------------------------------
  
  /**
   * Valida documento (CPF, CNPJ, códigos fiscais)
   */
  validar: protectedProcedure
    .input(ValidarDocumentoSchema)
    .query(({ input }) => {
      const { tipo, valor } = input;
      
      switch (tipo) {
        case 'cpf':
          return { valido: validarCpf(valor), tipo, valor: mascararDocumento(valor) };
        case 'cnpj':
          return { valido: validarCnpj(valor), tipo, valor: mascararDocumento(valor) };
        case 'municipio':
          return { valido: validarCodigoMunicipio(valor), tipo, valor };
        case 'uf':
          return { valido: validarUF(valor), tipo, valor };
        case 'ncm':
          return { valido: validarNCM(valor), tipo, valor };
        case 'cfop':
          return { valido: validarCFOP(valor), tipo, valor };
        default:
          return { valido: false, tipo, valor, erro: 'Tipo não suportado' };
      }
    }),

  /**
   * Valida RPS para NFS-e SP
   */
  validarRPS: protectedProcedure
    .input(z.object({
      serieRPS: z.string(),
      numeroRPS: z.number(),
      dataEmissao: z.coerce.date(),
      tributacao: z.enum(['T', 'F', 'A', 'B', 'M', 'N', 'X']),
      codigoServico: z.string(),
      aliquota: z.number(),
      valorServicos: z.number(),
      valorDeducoes: z.number().optional(),
      issRetido: z.boolean(),
      discriminacao: z.string(),
      tomador: z.object({
        cpfCnpj: z.string(),
        razaoSocial: z.string().optional(),
        email: z.string().optional(),
      }),
    }))
    .query(({ input }) => {
      const dados: DadosRPSSP = {
        serieRPS: input.serieRPS,
        numeroRPS: input.numeroRPS,
        dataEmissao: input.dataEmissao,
        tributacao: input.tributacao,
        codigoServico: input.codigoServico,
        aliquota: input.aliquota,
        valorServicos: input.valorServicos,
        valorDeducoes: input.valorDeducoes,
        issRetido: input.issRetido,
        discriminacao: input.discriminacao,
        tomador: input.tomador,
      };
      
      const resultado = validarRPSSP(dados);
      
      return {
        valido: resultado.valido,
        erros: resultado.erros.map(e => ({
          codigo: e.codigo,
          campo: e.campo,
          mensagem: e.mensagemUsuario,
        })),
      };
    }),

  // --------------------------------------------------------------------------
  // MÁQUINA DE ESTADOS
  // --------------------------------------------------------------------------
  
  /**
   * Retorna transições permitidas para um estado
   */
  transicoesPermitidas: protectedProcedure
    .input(z.object({
      estadoAtual: z.nativeEnum(EstadoDocumentoFiscal),
    }))
    .query(({ input }) => {
      const maquina = new MaquinaEstadoFiscal(input.estadoAtual);
      
      return {
        estadoAtual: input.estadoAtual,
        transicoesPermitidas: maquina.getTransicoesPermitidas(),
        isEstadoFinal: maquina.isEstadoFinal(),
      };
    }),

  /**
   * Verifica se transição é válida
   */
  podeTransitar: protectedProcedure
    .input(z.object({
      de: z.nativeEnum(EstadoDocumentoFiscal),
      para: z.nativeEnum(EstadoDocumentoFiscal),
    }))
    .query(({ input }) => {
      return {
        permitido: podeTransitar(input.de, input.para),
        de: input.de,
        para: input.para,
      };
    }),

  // --------------------------------------------------------------------------
  // EMISSÃO NFS-e SP (via adaptador)
  // --------------------------------------------------------------------------
  
  /**
   * Emite RPS para NFS-e SP usando adaptador (suporta feature flags)
   */
  emitirRPSSP: accountantProcedure
    .input(EmitirRPSSPSchema)
    .mutation(async ({ input, ctx }) => {
      const org = (ctx as any).organization;
      if (!org?.id || !org?.ccm) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Organização não selecionada ou sem CCM configurado',
        });
      }
      
      const adapter = criarNFSeSPAdapter(org.ccm, org.id);
      
      const params: EmissaoRPSParamsLegado = {
        serieRPS: input.serieRPS,
        numeroRPS: input.numeroRPS,
        dataEmissao: input.dataEmissao,
        tipoTributacao: input.tipoTributacao,
        codigoServico: input.codigoServico,
        aliquota: input.aliquota,
        valorServicos: input.valorServicos,
        valorDeducoes: input.valorDeducoes,
        issRetido: input.issRetido,
        discriminacao: input.discriminacao,
        tomador: input.tomador,
      };
      
      const resultado = await adapter.emitirRPS(params);
      
      // Registrar auditoria
      await registrarAuditoria({
        operacao: 'emissao',
        tipoDocumento: 'NFSE_SP',
        documentoId: resultado.numeroNFe || gerarIdNFSeSP(org.ccm, input.serieRPS, input.numeroRPS),
        numero: resultado.numeroNFe,
        userId: ctx.user.id.toString(),
        orgId: org.id,
        ipOrigem: ctx.ipAddress || '0.0.0.0',
        sucesso: resultado.sucesso,
        codigoRetorno: resultado.codigoErro,
        durationMs: 0, // TODO: medir
      });
      
      if (!resultado.sucesso) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: resultado.erro || 'Erro na emissão',
        });
      }
      
      return resultado;
    }),

  // --------------------------------------------------------------------------
  // FEATURE FLAGS (admin only)
  // --------------------------------------------------------------------------
  
  /**
   * Obtém feature flags atuais
   */
  getFeatureFlags: withPermission('fiscal.config.visualizar')
    .query(() => {
      return getFeatureFlags();
    }),

  /**
   * Atualiza feature flags
   */
  setFeatureFlags: withPermission('fiscal.config.gerenciar')
    .input(FeatureFlagsSchema)
    .mutation(({ input }) => {
      setFeatureFlags(input);
      return getFeatureFlags();
    }),

  // --------------------------------------------------------------------------
  // MÉTRICAS E AUDITORIA
  // --------------------------------------------------------------------------
  
  /**
   * Obtém métricas do motor fiscal
   */
  metricas: withPermission('fiscal.metricas.visualizar')
    .query(() => {
      return obterMetricas();
    }),

  /**
   * Consulta histórico de auditoria fiscal
   */
  auditoria: withPermission('fiscal.auditoria.visualizar')
    .input(z.object({
      documentoId: z.string().optional(),
      chaveAcesso: z.string().optional(),
      operacao: z.string().optional(),
      dataInicio: z.coerce.date().optional(),
      dataFim: z.coerce.date().optional(),
      limite: z.number().default(100),
    }))
    .query(async ({ input }) => {
      const { consultarAuditoria } = await import('./auditoria');
      return consultarAuditoria(input);
    }),

  // --------------------------------------------------------------------------
  // CATÁLOGO DE ERROS
  // --------------------------------------------------------------------------
  
  /**
   * Lista categorias de erro disponíveis
   */
  categoriasErro: protectedProcedure.query(() => {
    return Object.values(CategoriaErro);
  }),

  /**
   * Retorna informações sobre um erro pelo código
   */
  infoErro: protectedProcedure
    .input(z.string())
    .query(({ input }) => {
      // Mapeia códigos conhecidos
      const errosConhecidos: Record<string, { descricao: string; acao: string }> = {
        'FISCAL-VAL-001': { descricao: 'Campo obrigatório ausente', acao: 'Preencher o campo indicado' },
        'FISCAL-VAL-004': { descricao: 'CPF/CNPJ inválido', acao: 'Verificar documento' },
        'FISCAL-AUT-001': { descricao: 'Certificado não configurado', acao: 'Configurar certificado digital' },
        'FISCAL-AUT-002': { descricao: 'Certificado expirado', acao: 'Renovar certificado' },
        'FISCAL-REJ-001': { descricao: 'Documento já autorizado', acao: 'Usar documento existente' },
        'FISCAL-REJ-003': { descricao: 'Prazo de cancelamento expirado', acao: 'Contatar autoridade fiscal' },
        'FISCAL-AMB-001': { descricao: 'Serviço indisponível', acao: 'Aguardar e tentar novamente' },
      };
      
      return errosConhecidos[input] || { descricao: 'Erro desconhecido', acao: 'Verificar detalhes' };
    }),

  // --------------------------------------------------------------------------
  // NF-e / NFC-e (SEFAZ)
  // --------------------------------------------------------------------------
  
  /**
   * Lista UFs suportadas para NF-e/NFC-e
   */
  nfeUFsSuportadas: protectedProcedure.query(() => {
    return {
      ufs: getUFsSuportadas(),
      descricao: 'UFs com endpoints SEFAZ configurados',
    };
  }),

  /**
   * Verifica se UF é suportada
   */
  nfeIsUFSuportada: protectedProcedure
    .input(z.object({ uf: z.string() }))
    .query(({ input }) => {
      return {
        uf: input.uf,
        suportada: isUFSuportada(input.uf),
      };
    }),

  /**
   * Obtém endpoints SEFAZ para uma UF
   */
  nfeEndpoints: protectedProcedure
    .input(z.object({
      uf: z.string(),
      ambiente: z.enum(['1', '2']),
    }))
    .query(({ input }) => {
      try {
        const endpoints = getEndpointsUF(input.uf, input.ambiente);
        return {
          sucesso: true,
          uf: input.uf,
          ambiente: input.ambiente === '1' ? 'producao' : 'homologacao',
          endpoints: Object.entries(endpoints).map(([servico, config]) => ({
            servico,
            url: config.url,
            versao: config.versao,
          })),
        };
      } catch (error: any) {
        return {
          sucesso: false,
          erro: error.message,
        };
      }
    }),

  /**
   * Verifica status do serviço SEFAZ
   * Nota: Requer certificado configurado
   */
  nfeStatus: accountantProcedure
    .input(z.object({
      uf: z.string(),
      ambiente: z.enum(['1', '2']),
    }))
    .query(async ({ input, ctx }) => {
      // Em ambiente real, precisaria do certificado
      // Por enquanto, retorna mock para homologação
      if (input.ambiente === '2') {
        return {
          disponivel: true,
          uf: input.uf,
          ambiente: 'homologacao',
          mensagem: 'Serviço em Operação (mock - certificado não configurado)',
          tempoMedio: '1s',
          nota: 'Para testar em homologação real, configure o certificado digital',
        };
      }
      
      return {
        disponivel: false,
        uf: input.uf,
        ambiente: 'producao',
        mensagem: 'Certificado digital não configurado',
        nota: 'Configure o certificado A1 (PFX) para consultar status em produção',
      };
    }),

  /**
   * Simula emissão de NF-e (sem certificado = apenas validação)
   */
  nfeSimular: protectedProcedure
    .input(z.object({
      uf: z.string(),
      ambiente: z.enum(['1', '2']),
      modelo: z.enum(['55', '65']),
      serie: z.number().positive(),
      numero: z.number().positive(),
      naturezaOperacao: z.string(),
      emitente: z.object({
        cnpj: z.string(),
        razaoSocial: z.string(),
        inscricaoEstadual: z.string(),
        crt: z.enum(['1', '2', '3', '4']),
        endereco: z.object({
          logradouro: z.string(),
          numero: z.string(),
          bairro: z.string(),
          codigoMunicipio: z.string(),
          nomeMunicipio: z.string(),
          uf: z.string(),
          cep: z.string(),
        }),
      }),
      destinatario: z.object({
        tipo: z.enum(['PJ', 'PF', 'ESTRANGEIRO']),
        cpfCnpj: z.string().optional(),
        nome: z.string().optional(),
        indicadorIE: z.enum(['1', '2', '9']),
        endereco: z.object({
          logradouro: z.string(),
          numero: z.string(),
          bairro: z.string(),
          codigoMunicipio: z.string(),
          nomeMunicipio: z.string(),
          uf: z.string(),
          cep: z.string(),
        }).optional(),
      }).optional(),
      itens: z.array(z.object({
        codigo: z.string(),
        descricao: z.string(),
        ncm: z.string(),
        cfop: z.string(),
        unidade: z.string(),
        quantidade: z.number().positive(),
        valorUnitario: z.number().positive(),
        valorTotal: z.number().positive(),
        origem: z.string(),
        tributacao: z.object({
          regime: z.enum(['normal', 'simples']),
          cst: z.string().optional(),
          csosn: z.string().optional(),
          cstPIS: z.string(),
          cstCOFINS: z.string(),
        }),
      })),
      pagamentos: z.array(z.object({
        forma: z.string(),
        valor: z.number().positive(),
      })),
    }))
    .mutation(async ({ input }) => {
      // Validações
      const erros: string[] = [];
      
      if (!isUFSuportada(input.uf)) {
        erros.push(`UF ${input.uf} não suportada`);
      }
      
      if (!validarCnpj(input.emitente.cnpj)) {
        erros.push('CNPJ do emitente inválido');
      }
      
      if (input.destinatario?.cpfCnpj) {
        if (!validarCpfCnpj(input.destinatario.cpfCnpj)) {
          erros.push('CPF/CNPJ do destinatário inválido');
        }
      }
      
      for (const item of input.itens) {
        if (!validarNCM(item.ncm)) {
          erros.push(`NCM inválido: ${item.ncm}`);
        }
        if (!validarCFOP(item.cfop)) {
          erros.push(`CFOP inválido: ${item.cfop}`);
        }
      }
      
      if (erros.length > 0) {
        return {
          sucesso: false,
          erros,
          chaveAcesso: null,
          xml: null,
        };
      }
      
      // Gerar chave de acesso simulada
      const { gerarChaveAcesso, gerarCodigoNumerico } = await import('./integradores/nfe/schemas');
      const { UF_CODIGO } = await import('./integradores/nfe/schemas');
      
      const cUF = UF_CODIGO[input.uf.toUpperCase()];
      if (!cUF) {
        return {
          sucesso: false,
          erros: ['UF não encontrada no mapa de códigos'],
          chaveAcesso: null,
          xml: null,
        };
      }
      
      const cNF = gerarCodigoNumerico();
      const resultado = gerarChaveAcesso({
        cUF: cUF as any,
        dataEmissao: new Date(),
        CNPJ: input.emitente.cnpj,
        mod: input.modelo,
        serie: input.serie.toString(),
        nNF: input.numero.toString(),
        tpEmis: '1',
        cNF,
      });
      
      return {
        sucesso: true,
        erros: [],
        chaveAcesso: resultado.chave,
        modelo: input.modelo === '55' ? 'NF-e' : 'NFC-e',
        mensagem: 'Simulação validada. Para emitir de verdade, configure certificado digital.',
        xml: null, // Seria gerado com o builder
      };
    }),
});

export type FiscalRouter = typeof fiscalRouter;

