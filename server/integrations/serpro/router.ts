/**
 * Integra Contador SERPRO - Router tRPC
 * 
 * Expõe endpoints do Integra Contador para o frontend.
 * Protegido por autenticação e feature flag.
 * 
 * Feature Flag: INTEGRA_CONTADOR_ENABLED
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure, accountantProcedure } from '../../trpc';

// Serviços SERPRO
import {
  // Auth
  getSerproConfig,
  testConnection,
  getTokenInfo,
  invalidateAll,
  getMtlsCertificateInfo,
  
  // Consultar
  consultar,
  consultarRaw,
  buildPedidoDados,
  buildSelfRequest,
  buildThirdPartyRequest,
  cnpj,
  
  // SITFIS
  solicitarSitfis,
  emitirSitfis,
  consultarSitfis,
  verificarStatusSitfis,
  pdfBase64ToBuffer,
  generatePdfFilename,
  
  // Procurações
  consultarProcuracoes,
  verificarProcuracao,
  listarProcuracoesExpirando,
  listarCodigosProcuracao,
  
  // Tipos
  SISTEMAS,
  CODIGOS_PROCURACAO,
  SerproIntegrationError,
  type ModoAcesso,
  type SerproConfigStatus,
} from './index';

// ============================================================================
// FEATURE FLAG
// ============================================================================

function isIntegraContadorEnabled(): boolean {
  return process.env.INTEGRA_CONTADOR_ENABLED === 'true';
}

function checkFeatureFlag(): void {
  if (!isIntegraContadorEnabled()) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Integra Contador está desabilitado. Habilite INTEGRA_CONTADOR_ENABLED=true.',
    });
  }
}

// ============================================================================
// SCHEMAS ZOD
// ============================================================================

const CnpjSchema = z.string()
  .min(11)
  .max(18)
  .transform(val => val.replace(/\D/g, ''))
  .refine(val => val.length === 14, { message: 'CNPJ deve ter 14 dígitos' });

const ModoAcessoSchema = z.enum(['proprio', 'terceiros', 'softwarehouse']).default('proprio');

const SitfisInputSchema = z.object({
  cnpjContribuinte: CnpjSchema,
  modo: ModoAcessoSchema,
  cnpjProcurador: z.string().optional(),
  autenticarProcuradorToken: z.string().optional(),
});

const EmitirInputSchema = z.object({
  protocolo: z.string().min(1),
  cnpjContribuinte: CnpjSchema,
  modo: ModoAcessoSchema,
  cnpjProcurador: z.string().optional(),
  autenticarProcuradorToken: z.string().optional(),
});

const ConsoleInputSchema = z.object({
  idSistema: z.string().min(1),
  idServico: z.string().min(1),
  dados: z.record(z.unknown()).default({}),
  cnpjContribuinte: CnpjSchema,
  modo: ModoAcessoSchema.optional(),
});

const VerificarProcuracaoSchema = z.object({
  cnpjContribuinte: CnpjSchema,
  codigoServico: z.number().int().positive(),
});

// ============================================================================
// HELPER PARA ERROS
// ============================================================================

function handleSerproError(error: unknown): never {
  if (error instanceof SerproIntegrationError) {
    throw new TRPCError({
      code: error.httpStatus === 401 ? 'UNAUTHORIZED'
        : error.httpStatus === 403 ? 'FORBIDDEN'
        : error.httpStatus === 429 ? 'TOO_MANY_REQUESTS'
        : error.httpStatus >= 500 ? 'INTERNAL_SERVER_ERROR'
        : 'BAD_REQUEST',
      message: error.mensagem,
      cause: {
        codigo: error.codigo,
        categoria: error.categoria,
        descricao: error.descricao,
        acaoSugerida: error.acaoSugerida,
        retryable: error.retryable,
        retryAfter: error.retryAfter,
      },
    });
  }

  if (error instanceof Error) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: error.message,
    });
  }

  throw new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Erro desconhecido',
  });
}

// ============================================================================
// ROUTER
// ============================================================================

export const serproRouter = router({
  // ==========================================================================
  // CONFIGURAÇÃO E STATUS
  // ==========================================================================

  /**
   * Verifica se o Integra Contador está habilitado
   */
  isEnabled: protectedProcedure.query((): boolean => {
    return isIntegraContadorEnabled();
  }),

  /**
   * Obtém status completo da configuração
   */
  getConfigStatus: accountantProcedure.query(async (): Promise<SerproConfigStatus> => {
    checkFeatureFlag();

    try {
      const config = getSerproConfig();
      const certInfo = await getMtlsCertificateInfo();
      const tokenInfo = getTokenInfo();

      return {
        enabled: true,
        environment: config.environment,
        credentialsConfigured: !!config.consumerKey && !!config.consumerSecret,
        certificateValid: certInfo.loaded && (certInfo.isValid ?? false),
        certificateDaysRemaining: certInfo.diasRestantes,
        certificateCnpj: certInfo.cnpj,
        certificateRazaoSocial: certInfo.razaoSocial,
        mtlsEnabled: process.env.SERPRO_USE_MTLS !== 'false',
        lastConnectionTest: tokenInfo.obtainedAt,
        lastConnectionSuccess: tokenInfo.cached,
      };
    } catch (error) {
      return {
        enabled: false,
        environment: 'production',
        credentialsConfigured: false,
        certificateValid: false,
        mtlsEnabled: false,
      };
    }
  }),

  /**
   * Testa conexão com o SERPRO
   */
  testConnection: accountantProcedure.mutation(async () => {
    checkFeatureFlag();

    try {
      const result = await testConnection();
      return {
        success: result.success,
        environment: result.environment,
        tokenExpiresIn: result.tokenInfo?.expiresIn,
        hasJwtToken: result.tokenInfo?.hasJwtToken,
        certificateLoaded: result.certificateInfo?.loaded,
        certificateValid: result.certificateInfo?.isValid,
        certificateCnpj: result.certificateInfo?.cnpj,
        certificateDaysRemaining: result.certificateInfo?.diasRestantes,
        error: result.error,
      };
    } catch (error) {
      handleSerproError(error);
    }
  }),

  /**
   * Invalida todos os caches (força renovação de tokens)
   */
  invalidateCache: accountantProcedure.mutation(() => {
    checkFeatureFlag();
    invalidateAll();
    return { success: true };
  }),

  // ==========================================================================
  // SITFIS - SITUAÇÃO FISCAL
  // ==========================================================================

  sitfis: router({
    /**
     * Solicita relatório de situação fiscal
     */
    solicitar: accountantProcedure
      .input(SitfisInputSchema)
      .mutation(async ({ input }) => {
        checkFeatureFlag();

        try {
          const result = await solicitarSitfis(input.cnpjContribuinte, {
            modo: input.modo as ModoAcesso,
            cnpjProcurador: input.cnpjProcurador,
            autenticarProcuradorToken: input.autenticarProcuradorToken,
          });

          if (!result.success) {
            throw result.error || new Error(result.mensagem);
          }

          return {
            protocolo: result.protocolo,
            status: result.status,
            dataHoraSolicitacao: result.dataHoraSolicitacao,
            mensagem: result.mensagem,
          };
        } catch (error) {
          handleSerproError(error);
        }
      }),

    /**
     * Emite (obtém) relatório por protocolo
     */
    emitir: accountantProcedure
      .input(EmitirInputSchema)
      .mutation(async ({ input }) => {
        checkFeatureFlag();

        try {
          const result = await emitirSitfis(
            input.protocolo,
            input.cnpjContribuinte,
            {
              modo: input.modo as ModoAcesso,
              cnpjProcurador: input.cnpjProcurador,
              autenticarProcuradorToken: input.autenticarProcuradorToken,
            }
          );

          return {
            protocolo: result.protocolo,
            status: result.status,
            dataHoraSolicitacao: result.dataHoraSolicitacao,
            dataHoraConclusao: result.dataHoraConclusao,
            tempoEstimado: result.tempoEstimado,
            temPdf: !!result.relatorioBase64,
            mensagem: result.mensagem,
          };
        } catch (error) {
          handleSerproError(error);
        }
      }),

    /**
     * Consulta completa (solicitar + polling + emitir)
     */
    consultar: accountantProcedure
      .input(SitfisInputSchema)
      .mutation(async ({ input }) => {
        checkFeatureFlag();

        try {
          const result = await consultarSitfis(input.cnpjContribuinte, {
            modo: input.modo as ModoAcesso,
            cnpjProcurador: input.cnpjProcurador,
            autenticarProcuradorToken: input.autenticarProcuradorToken,
          });

          return {
            success: result.success,
            protocolo: result.protocolo,
            status: result.status,
            dataHoraSolicitacao: result.dataHoraSolicitacao,
            dataHoraConclusao: result.dataHoraConclusao,
            temPdf: !!result.relatorioBase64,
            mensagem: result.mensagem,
          };
        } catch (error) {
          handleSerproError(error);
        }
      }),

    /**
     * Verifica status de protocolo existente
     */
    verificarStatus: accountantProcedure
      .input(EmitirInputSchema)
      .query(async ({ input }) => {
        checkFeatureFlag();

        try {
          const result = await verificarStatusSitfis(
            input.protocolo,
            input.cnpjContribuinte,
            {
              modo: input.modo as ModoAcesso,
              cnpjProcurador: input.cnpjProcurador,
            }
          );

          return {
            protocolo: result.protocolo,
            status: result.status,
            temPdf: !!result.relatorioBase64,
            mensagem: result.mensagem,
          };
        } catch (error) {
          handleSerproError(error);
        }
      }),

    /**
     * Download do PDF (retorna base64)
     * Em produção, usar endpoint HTTP dedicado para streaming
     */
    downloadPdf: accountantProcedure
      .input(EmitirInputSchema)
      .mutation(async ({ input }) => {
        checkFeatureFlag();

        try {
          const result = await emitirSitfis(
            input.protocolo,
            input.cnpjContribuinte,
            {
              modo: input.modo as ModoAcesso,
              cnpjProcurador: input.cnpjProcurador,
            }
          );

          if (result.status !== 'CONCLUIDO' || !result.relatorioBase64) {
            throw new Error(
              result.status === 'PROCESSANDO'
                ? 'Relatório ainda em processamento'
                : 'Relatório não disponível'
            );
          }

          return {
            filename: generatePdfFilename(input.cnpjContribuinte, input.protocolo),
            base64: result.relatorioBase64,
            contentType: 'application/pdf',
          };
        } catch (error) {
          handleSerproError(error);
        }
      }),
  }),

  // ==========================================================================
  // PROCURAÇÕES
  // ==========================================================================

  procuracoes: router({
    /**
     * Lista todas as procurações recebidas
     */
    listar: accountantProcedure.query(async () => {
      checkFeatureFlag();

      try {
        const result = await consultarProcuracoes();

        if (!result.success) {
          throw result.error || new Error(result.mensagem);
        }

        return {
          procuracoes: result.procuracoes.map(p => ({
            outorgante: p.outorgante,
            servicos: p.servicos,
            servicosNomes: p.servicos.map(s => {
              const entry = Object.entries(CODIGOS_PROCURACAO).find(([_, c]) => c === s);
              return entry ? entry[0] : `Serviço ${s}`;
            }),
            dataInicio: p.dataInicio,
            dataFim: p.dataFim,
            status: p.status,
            diasRestantes: p.diasRestantes,
            proximaExpiracao: p.proximaExpiracao,
            expirada: p.expirada,
          })),
          mensagem: result.mensagem,
        };
      } catch (error) {
        handleSerproError(error);
      }
    }),

    /**
     * Lista procurações próximas de expirar
     */
    expirando: accountantProcedure
      .input(z.object({ diasAlerta: z.number().default(30) }).optional())
      .query(async ({ input }) => {
        checkFeatureFlag();

        try {
          const result = await listarProcuracoesExpirando(input?.diasAlerta);

          if (!result.success) {
            throw result.error;
          }

          return {
            procuracoes: result.procuracoes,
            total: result.procuracoes.length,
          };
        } catch (error) {
          handleSerproError(error);
        }
      }),

    /**
     * Verifica procuração para um contribuinte/serviço
     */
    verificar: accountantProcedure
      .input(VerificarProcuracaoSchema)
      .query(async ({ input }) => {
        checkFeatureFlag();

        try {
          const result = await verificarProcuracao(
            input.cnpjContribuinte,
            input.codigoServico
          );

          return {
            temProcuracao: result.temProcuracao,
            servicoAutorizado: result.servicoAutorizado,
            mensagem: result.mensagem,
            procuracao: result.procuracao ? {
              outorgante: result.procuracao.outorgante,
              dataFim: result.procuracao.dataFim,
              diasRestantes: result.procuracao.diasRestantes,
              proximaExpiracao: result.procuracao.proximaExpiracao,
            } : undefined,
          };
        } catch (error) {
          handleSerproError(error);
        }
      }),

    /**
     * Lista códigos de procuração disponíveis
     */
    codigos: protectedProcedure.query(() => {
      return listarCodigosProcuracao();
    }),
  }),

  // ==========================================================================
  // CONSOLE (DESENVOLVIMENTO/DEBUG)
  // ==========================================================================

  console: router({
    /**
     * Executa chamada raw ao /Consultar
     * APENAS para desenvolvimento e debug
     */
    executar: accountantProcedure
      .input(ConsoleInputSchema)
      .mutation(async ({ input }) => {
        checkFeatureFlag();

        try {
          const pedidoDados = buildPedidoDados(
            input.idSistema,
            input.idServico,
            input.dados
          );

          // Usar modo próprio por padrão no console
          const request = buildSelfRequest(input.cnpjContribuinte, pedidoDados);

          const result = await consultarRaw(request, {
            modo: input.modo as ModoAcesso,
          });

          return {
            httpStatus: result.httpStatus,
            headers: result.headers,
            body: result.body,
            rateLimit: result.rateLimit,
          };
        } catch (error) {
          handleSerproError(error);
        }
      }),

    /**
     * Lista sistemas disponíveis
     */
    sistemas: protectedProcedure.query(() => {
      return Object.entries(SISTEMAS).map(([key, sistema]) => ({
        id: sistema.id,
        nome: sistema.nome,
        codigoProcuracao: sistema.codigoProcuracao,
        servicos: Object.entries(sistema.servicos).map(([nome, id]) => ({
          nome,
          id,
        })),
      }));
    }),
  }),
});

// Tipo exportado para uso no frontend
export type SerproRouter = typeof serproRouter;

