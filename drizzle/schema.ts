import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  bigint,
  numeric,
  date,
  timestamp,
  json,
  jsonb,
  serial,
  index,
  uniqueIndex,
  primaryKey,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ============================================================================
// ENUMS - Módulo A: Identidades
// ============================================================================
export const pessoaTipoEnum = pgEnum('pessoa_tipo', ['fisica', 'juridica']);
export const documentoTipoEnum = pgEnum('documento_tipo', ['cpf', 'cnpj', 'rg', 'ie', 'im']);
export const contatoTipoEnum = pgEnum('contato_tipo', ['email', 'telefone', 'celular', 'whatsapp']);
export const enderecoTipoEnum = pgEnum('endereco_tipo', ['residencial', 'comercial', 'correspondencia']);
export const associadoStatusEnum = pgEnum('associado_status', ['ativo', 'suspenso', 'desligado', 'falecido']);
export const associadoCategoriaEnum = pgEnum('associado_categoria', ['trabalhador', 'frequentador', 'benemerito', 'honorario']);
export const periodicidadeEnum = pgEnum('periodicidade', ['mensal', 'trimestral', 'semestral', 'anual']);
export const tratamentoTipoEnum = pgEnum('tratamento_tipo', ['marketing', 'comunicacao', 'compartilhamento', 'dados_sensiveis']);
export const baseLegalEnum = pgEnum('base_legal', ['consentimento', 'legitimo_interesse', 'obrigacao_legal', 'execucao_contrato']);

// ============================================================================
// ENUMS - Módulo B: Dinheiro (Caixa/Bancos)
// ============================================================================
export const contaFinanceiraTipoEnum = pgEnum('conta_financeira_tipo', ['caixa', 'conta_corrente', 'poupanca', 'aplicacao', 'cartao']);
export const pixTipoEnum = pgEnum('pix_tipo', ['cpf', 'cnpj', 'email', 'telefone', 'aleatoria']);
export const arquivoTipoEnum = pgEnum('arquivo_tipo', ['ofx', 'csv', 'txt', 'pdf']);
export const extratoStatusEnum = pgEnum('extrato_status', ['pendente', 'processando', 'processado', 'erro']);
export const linhaExtratoStatusEnum = pgEnum('linha_extrato_status', ['pendente', 'conciliado', 'ignorado', 'duplicado']);
export const movimentoTipoEnum = pgEnum('movimento_tipo', ['credito', 'debito']);
export const vinculoTipoEnum = pgEnum('vinculo_tipo', ['titulo', 'lancamento_manual', 'tarifa', 'rendimento']);
export const conciliacaoMetodoEnum = pgEnum('conciliacao_metodo', ['automatico', 'manual', 'sugerido']);

// ============================================================================
// ENUMS - Módulo C: Contas a Pagar/Receber
// ============================================================================
export const tituloTipoEnum = pgEnum('titulo_tipo', ['pagar', 'receber']);
export const tituloNaturezaEnum = pgEnum('titulo_natureza', ['contribuicao', 'doacao', 'evento', 'convenio', 'servico', 'utilidade', 'taxa', 'imposto', 'material', 'outros']);
export const tituloStatusEnum = pgEnum('titulo_status', ['rascunho', 'pendente_aprovacao', 'aprovado', 'parcial', 'quitado', 'cancelado', 'vencido']);
export const formaPagamentoEnum = pgEnum('forma_pagamento', ['dinheiro', 'pix', 'ted', 'doc', 'boleto', 'debito', 'credito', 'cheque']);
export const anexoEntidadeEnum = pgEnum('anexo_entidade', ['titulo', 'baixa', 'lancamento', 'pessoa', 'bem']);
export const anexoCategoriaEnum = pgEnum('anexo_categoria', ['nota_fiscal', 'recibo', 'comprovante', 'contrato', 'outros']);

// ============================================================================
// ENUMS - Módulo D: Contabilidade
// ============================================================================
export const contaTipoEnum = pgEnum('conta_tipo', ['ativo', 'passivo', 'patrimonio_social', 'receita', 'despesa']);
export const naturezaSaldoEnum = pgEnum('natureza_saldo', ['devedora', 'credora']);
export const classificacaoContaEnum = pgEnum('classificacao_conta', ['sintetica', 'analitica']);
export const periodoStatusEnum = pgEnum('periodo_status', ['aberto', 'em_revisao', 'fechado', 'reaberto']);
export const lancamentoOrigemEnum = pgEnum('lancamento_origem', ['manual', 'baixa', 'extrato', 'depreciacao', 'fechamento', 'ajuste']);
export const lancamentoStatusEnum = pgEnum('lancamento_status', ['rascunho', 'efetivado', 'estornado']);
export const lancamentoLinhaTypeEnum = pgEnum('lancamento_linha_tipo', ['debito', 'credito']);

// ============================================================================
// ENUMS - Módulo E: Projetos, Centros de Custo e Fundos
// ============================================================================
export const projetoStatusEnum = pgEnum('projeto_status', ['planejamento', 'em_andamento', 'suspenso', 'concluido', 'cancelado']);
export const fundoTipoEnum = pgEnum('fundo_tipo', ['restrito', 'designado', 'livre']);
export const regraTipoEnum = pgEnum('regra_tipo', ['percentual_receita', 'categoria_permitida', 'categoria_proibida', 'valor_maximo', 'aprovador_obrigatorio']);

// ============================================================================
// ENUMS - Módulo F: Patrimônio/Imobilizado
// ============================================================================
export const bemCategoriaEnum = pgEnum('bem_categoria', ['imovel', 'veiculo', 'equipamento', 'mobiliario', 'informatica', 'outro']);
export const depreciacaoMetodoEnum = pgEnum('depreciacao_metodo', ['linear', 'nenhum']);
export const bemStatusEnum = pgEnum('bem_status', ['em_uso', 'em_manutencao', 'baixado', 'alienado', 'perdido']);

// ============================================================================
// ENUMS - Módulo G: Governança e Auditoria
// ============================================================================
export const aprovacaoEntidadeEnum = pgEnum('aprovacao_entidade', ['titulo', 'lancamento', 'fundo_consumo']);
export const aprovacaoStatusEnum = pgEnum('aprovacao_status', ['pendente', 'aprovado', 'rejeitado']);
export const auditoriaAcaoEnum = pgEnum('auditoria_acao', ['criar', 'atualizar', 'excluir', 'visualizar', 'exportar', 'fechar', 'reabrir', 'aprovar', 'rejeitar']);

// ============================================================================
// MÓDULO A: Identidades e Cadastro
// ============================================================================

export const pessoa = pgTable(
  'pessoa',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tipo: pessoaTipoEnum('tipo').notNull(),
    nome: varchar('nome', { length: 255 }).notNull(),
    nomeFantasia: varchar('nome_fantasia', { length: 255 }),
    ativo: boolean('ativo').notNull().default(true),
    observacoes: text('observacoes'),
    dadosSensiveisCriptografados: jsonb('dados_sensiveis_criptografados'),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid('created_by'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    updatedBy: uuid('updated_by'),
  },
  (table) => ({
    tipoIdx: index('idx_pessoa_tipo').on(table.tipo),
    ativoIdx: index('idx_pessoa_ativo').on(table.ativo),
    deletedIdx: index('idx_pessoa_deleted').on(table.deletedAt),
  })
);

export const pessoaDocumento = pgTable(
  'pessoa_documento',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    pessoaId: uuid('pessoa_id').notNull().references(() => pessoa.id),
    tipo: documentoTipoEnum('tipo').notNull(),
    numero: varchar('numero', { length: 30 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pessoaTipoUnique: uniqueIndex('idx_pessoa_documento_unique').on(table.pessoaId, table.tipo),
    numeroIdx: index('idx_pessoa_documento_numero').on(table.numero),
  })
);

export const pessoaContato = pgTable(
  'pessoa_contato',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    pessoaId: uuid('pessoa_id').notNull().references(() => pessoa.id),
    tipo: contatoTipoEnum('tipo').notNull(),
    valor: varchar('valor', { length: 320 }).notNull(),
    principal: boolean('principal').notNull().default(false),
    verificado: boolean('verificado').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pessoaIdx: index('idx_pessoa_contato_pessoa').on(table.pessoaId),
  })
);

export const pessoaEndereco = pgTable(
  'pessoa_endereco',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    pessoaId: uuid('pessoa_id').notNull().references(() => pessoa.id),
    tipo: enderecoTipoEnum('tipo').notNull(),
    logradouro: varchar('logradouro', { length: 255 }).notNull(),
    numero: varchar('numero', { length: 20 }),
    complemento: varchar('complemento', { length: 100 }),
    bairro: varchar('bairro', { length: 100 }),
    cidade: varchar('cidade', { length: 100 }).notNull(),
    uf: varchar('uf', { length: 2 }).notNull(),
    cep: varchar('cep', { length: 10 }),
    principal: boolean('principal').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pessoaIdx: index('idx_pessoa_endereco_pessoa').on(table.pessoaId),
  })
);

export const associado = pgTable(
  'associado',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    pessoaId: uuid('pessoa_id').notNull().unique().references(() => pessoa.id),
    numeroRegistro: varchar('numero_registro', { length: 20 }),
    dataAdmissao: date('data_admissao').notNull(),
    dataDesligamento: date('data_desligamento'),
    status: associadoStatusEnum('status').notNull(),
    categoria: associadoCategoriaEnum('categoria').notNull(),
    valorContribuicaoSugerido: numeric('valor_contribuicao_sugerido', { precision: 14, scale: 2 }),
    periodicidade: periodicidadeEnum('periodicidade').notNull(),
    isento: boolean('isento').notNull().default(false),
    motivoIsencao: text('motivo_isencao'),
    diaVencimento: integer('dia_vencimento'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid('created_by'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    updatedBy: uuid('updated_by'),
  },
  (table) => ({
    statusIdx: index('idx_associado_status').on(table.status),
    categoriaIdx: index('idx_associado_categoria').on(table.categoria),
  })
);

export const associadoHistorico = pgTable(
  'associado_historico',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    associadoId: uuid('associado_id').notNull().references(() => associado.id),
    campoAlterado: varchar('campo_alterado', { length: 50 }).notNull(),
    valorAnterior: text('valor_anterior'),
    valorNovo: text('valor_novo'),
    motivo: text('motivo'),
    dataAlteracao: timestamp('data_alteracao', { withTimezone: true }).notNull(),
    alteradoPor: uuid('alterado_por').notNull(),
  },
  (table) => ({
    associadoIdx: index('idx_associado_historico_associado').on(table.associadoId),
    dataIdx: index('idx_associado_historico_data').on(table.dataAlteracao),
  })
);

export const consentimentoLgpd = pgTable(
  'consentimento_lgpd',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    pessoaId: uuid('pessoa_id').notNull().references(() => pessoa.id),
    tipoTratamento: tratamentoTipoEnum('tipo_tratamento').notNull(),
    baseLegal: baseLegalEnum('base_legal').notNull(),
    consentido: boolean('consentido').notNull(),
    dataConsentimento: timestamp('data_consentimento', { withTimezone: true }).notNull(),
    dataRevogacao: timestamp('data_revogacao', { withTimezone: true }),
    ipOrigem: varchar('ip_origem', { length: 45 }),
    evidencia: text('evidencia'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid('created_by'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    updatedBy: uuid('updated_by'),
  },
  (table) => ({
    pessoaIdx: index('idx_consentimento_pessoa').on(table.pessoaId),
    tipoIdx: index('idx_consentimento_tipo').on(table.tipoTratamento),
  })
);

// ============================================================================
// MÓDULO B: Dinheiro (Caixa/Bancos)
// ============================================================================

export const contaFinanceira = pgTable(
  'conta_financeira',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tipo: contaFinanceiraTipoEnum('tipo').notNull(),
    nome: varchar('nome', { length: 100 }).notNull(),
    bancoCodigo: varchar('banco_codigo', { length: 10 }),
    bancoNome: varchar('banco_nome', { length: 100 }),
    agencia: varchar('agencia', { length: 20 }),
    contaNumero: varchar('conta_numero', { length: 30 }),
    contaDigito: varchar('conta_digito', { length: 5 }),
    pixChave: varchar('pix_chave', { length: 100 }),
    pixTipo: pixTipoEnum('pix_tipo'),
    contaContabilId: uuid('conta_contabil_id'),
    ativo: boolean('ativo').notNull().default(true),
    saldoInicial: numeric('saldo_inicial', { precision: 14, scale: 2 }).notNull().default('0'),
    dataSaldoInicial: date('data_saldo_inicial').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid('created_by'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    updatedBy: uuid('updated_by'),
  },
  (table) => ({
    tipoIdx: index('idx_conta_financeira_tipo').on(table.tipo),
    ativoIdx: index('idx_conta_financeira_ativo').on(table.ativo),
  })
);

export const extratoBancario = pgTable(
  'extrato_bancario',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    contaFinanceiraId: uuid('conta_financeira_id').notNull().references(() => contaFinanceira.id),
    arquivoNome: varchar('arquivo_nome', { length: 255 }).notNull(),
    arquivoTipo: arquivoTipoEnum('arquivo_tipo').notNull(),
    arquivoUrl: text('arquivo_url'),
    arquivoHash: varchar('arquivo_hash', { length: 64 }).notNull(),
    dataInicio: date('data_inicio'),
    dataFim: date('data_fim'),
    saldoInicialExtrato: numeric('saldo_inicial_extrato', { precision: 14, scale: 2 }),
    saldoFinalExtrato: numeric('saldo_final_extrato', { precision: 14, scale: 2 }),
    totalLinhas: integer('total_linhas').notNull().default(0),
    linhasConciliadas: integer('linhas_conciliadas').notNull().default(0),
    status: extratoStatusEnum('status').notNull(),
    erroMensagem: text('erro_mensagem'),
    importadoPor: uuid('importado_por').notNull(),
    importadoEm: timestamp('importado_em', { withTimezone: true }).notNull(),
  },
  (table) => ({
    contaIdx: index('idx_extrato_conta').on(table.contaFinanceiraId),
    statusIdx: index('idx_extrato_status').on(table.status),
    datasIdx: index('idx_extrato_datas').on(table.dataInicio, table.dataFim),
    hashUnique: uniqueIndex('idx_extrato_hash_unique').on(table.contaFinanceiraId, table.arquivoHash),
  })
);

export const extratoLinha = pgTable(
  'extrato_linha',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    extratoId: uuid('extrato_id').notNull().references(() => extratoBancario.id),
    dataMovimento: date('data_movimento').notNull(),
    dataBalancete: date('data_balancete'),
    tipo: movimentoTipoEnum('tipo').notNull(),
    valor: numeric('valor', { precision: 14, scale: 2 }).notNull(),
    descricaoOriginal: text('descricao_original').notNull(),
    descricaoNormalizada: text('descricao_normalizada'),
    codigoTransacao: varchar('codigo_transacao', { length: 50 }),
    tipoTransacaoBanco: varchar('tipo_transacao_banco', { length: 50 }),
    documentoReferencia: varchar('documento_referencia', { length: 100 }),
    status: linhaExtratoStatusEnum('status').notNull(),
    motivoIgnorado: text('motivo_ignorado'),
  },
  (table) => ({
    extratoIdx: index('idx_extrato_linha_extrato').on(table.extratoId),
    dataIdx: index('idx_extrato_linha_data').on(table.dataMovimento),
    statusIdx: index('idx_extrato_linha_status').on(table.status),
  })
);

export const conciliacao = pgTable(
  'conciliacao',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    extratoLinhaId: uuid('extrato_linha_id').notNull().unique().references(() => extratoLinha.id),
    tipoVinculo: vinculoTipoEnum('tipo_vinculo').notNull(),
    tituloId: uuid('titulo_id'),
    lancamentoId: uuid('lancamento_id'),
    metodo: conciliacaoMetodoEnum('metodo').notNull(),
    confianca: numeric('confianca', { precision: 5, scale: 2 }),
    conciliadoPor: uuid('conciliado_por').notNull(),
    conciliadoEm: timestamp('conciliado_em', { withTimezone: true }).notNull(),
  },
  (table) => ({
    linhaIdx: index('idx_conciliacao_linha').on(table.extratoLinhaId),
    tituloIdx: index('idx_conciliacao_titulo').on(table.tituloId),
    lancamentoIdx: index('idx_conciliacao_lancamento').on(table.lancamentoId),
  })
);

// ============================================================================
// MÓDULO C: Contas a Pagar/Receber
// ============================================================================

export const titulo = pgTable(
  'titulo',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tipo: tituloTipoEnum('tipo').notNull(),
    natureza: tituloNaturezaEnum('natureza').notNull(),
    pessoaId: uuid('pessoa_id').references(() => pessoa.id),
    descricao: varchar('descricao', { length: 500 }).notNull(),
    valorOriginal: numeric('valor_original', { precision: 14, scale: 2 }).notNull(),
    valorDesconto: numeric('valor_desconto', { precision: 14, scale: 2 }).notNull().default('0'),
    valorAcrescimo: numeric('valor_acrescimo', { precision: 14, scale: 2 }).notNull().default('0'),
    valorLiquido: numeric('valor_liquido', { precision: 14, scale: 2 }).notNull(),
    dataEmissao: date('data_emissao').notNull(),
    dataCompetencia: date('data_competencia').notNull(),
    dataVencimento: date('data_vencimento').notNull(),
    numeroDocumento: varchar('numero_documento', { length: 100 }),
    serieDocumento: varchar('serie_documento', { length: 20 }),
    parcelaNumero: integer('parcela_numero'),
    parcelaTotal: integer('parcela_total'),
    tituloPaiId: uuid('titulo_pai_id'),
    centroCustoId: uuid('centro_custo_id'),
    projetoId: uuid('projeto_id'),
    fundoId: uuid('fundo_id'),
    contaContabilId: uuid('conta_contabil_id'),
    status: tituloStatusEnum('status').notNull(),
    aprovadoPor: uuid('aprovado_por'),
    aprovadoEm: timestamp('aprovado_em', { withTimezone: true }),
    observacoes: text('observacoes'),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid('created_by'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    updatedBy: uuid('updated_by'),
    sourceSystem: varchar('source_system', { length: 50 }),
    importBatchId: uuid('import_batch_id'),
  },
  (table) => ({
    tipoIdx: index('idx_titulo_tipo').on(table.tipo),
    statusIdx: index('idx_titulo_status').on(table.status),
    vencimentoIdx: index('idx_titulo_vencimento').on(table.dataVencimento),
    competenciaIdx: index('idx_titulo_competencia').on(table.dataCompetencia),
    pessoaIdx: index('idx_titulo_pessoa').on(table.pessoaId),
    centroCustoIdx: index('idx_titulo_centro_custo').on(table.centroCustoId),
    projetoIdx: index('idx_titulo_projeto').on(table.projetoId),
    fundoIdx: index('idx_titulo_fundo').on(table.fundoId),
    deletedIdx: index('idx_titulo_deleted').on(table.deletedAt),
  })
);

export const tituloBaixa = pgTable(
  'titulo_baixa',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tituloId: uuid('titulo_id').notNull().references(() => titulo.id),
    contaFinanceiraId: uuid('conta_financeira_id').notNull().references(() => contaFinanceira.id),
    dataPagamento: date('data_pagamento').notNull(),
    valorPago: numeric('valor_pago', { precision: 14, scale: 2 }).notNull(),
    valorJuros: numeric('valor_juros', { precision: 14, scale: 2 }).notNull().default('0'),
    valorMulta: numeric('valor_multa', { precision: 14, scale: 2 }).notNull().default('0'),
    valorDesconto: numeric('valor_desconto', { precision: 14, scale: 2 }).notNull().default('0'),
    formaPagamento: formaPagamentoEnum('forma_pagamento').notNull(),
    documentoReferencia: varchar('documento_referencia', { length: 100 }),
    estorno: boolean('estorno').notNull().default(false),
    estornoMotivo: text('estorno_motivo'),
    estornoDeId: uuid('estorno_de_id'),
    lancamentoId: uuid('lancamento_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid('created_by'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    updatedBy: uuid('updated_by'),
  },
  (table) => ({
    tituloIdx: index('idx_baixa_titulo').on(table.tituloId),
    dataIdx: index('idx_baixa_data').on(table.dataPagamento),
    contaIdx: index('idx_baixa_conta').on(table.contaFinanceiraId),
  })
);

export const anexo = pgTable(
  'anexo',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    entidadeTipo: anexoEntidadeEnum('entidade_tipo').notNull(),
    entidadeId: uuid('entidade_id').notNull(),
    nomeArquivo: varchar('nome_arquivo', { length: 255 }).notNull(),
    tipoArquivo: varchar('tipo_arquivo', { length: 100 }).notNull(),
    tamanhoBytes: integer('tamanho_bytes').notNull(),
    urlStorage: text('url_storage').notNull(),
    hashArquivo: varchar('hash_arquivo', { length: 64 }).notNull(),
    categoria: anexoCategoriaEnum('categoria'),
    descricao: text('descricao'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid('created_by'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    updatedBy: uuid('updated_by'),
  },
  (table) => ({
    entidadeIdx: index('idx_anexo_entidade').on(table.entidadeTipo, table.entidadeId),
    categoriaIdx: index('idx_anexo_categoria').on(table.categoria),
  })
);

// ============================================================================
// MÓDULO D: Contabilidade (Partidas Dobradas)
// ============================================================================

export const planoContas = pgTable(
  'plano_contas',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    codigo: varchar('codigo', { length: 20 }).notNull().unique(),
    nome: varchar('nome', { length: 255 }).notNull(),
    tipo: contaTipoEnum('tipo').notNull(),
    naturezaSaldo: naturezaSaldoEnum('natureza_saldo').notNull(),
    classificacao: classificacaoContaEnum('classificacao').notNull(),
    nivel: integer('nivel').notNull(),
    contaPaiId: uuid('conta_pai_id'),
    aceitaLancamento: boolean('aceita_lancamento').notNull(),
    ativo: boolean('ativo').notNull().default(true),
    descricao: text('descricao'),
    tags: text('tags').array(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid('created_by'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    updatedBy: uuid('updated_by'),
  },
  (table) => ({
    codigoIdx: uniqueIndex('idx_plano_codigo').on(table.codigo),
    tipoIdx: index('idx_plano_tipo').on(table.tipo),
    paiIdx: index('idx_plano_pai').on(table.contaPaiId),
    analiticaIdx: index('idx_plano_analitica').on(table.classificacao),
    deletedIdx: index('idx_plano_deleted').on(table.deletedAt),
  })
);

export const periodoContabil = pgTable(
  'periodo_contabil',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ano: integer('ano').notNull(),
    mes: integer('mes').notNull(),
    dataInicio: date('data_inicio').notNull(),
    dataFim: date('data_fim').notNull(),
    status: periodoStatusEnum('status').notNull(),
    fechadoPor: uuid('fechado_por'),
    fechadoEm: timestamp('fechado_em', { withTimezone: true }),
    reabertoPor: uuid('reaberto_por'),
    reabertoEm: timestamp('reaberto_em', { withTimezone: true }),
    motivoReabertura: text('motivo_reabertura'),
    observacoes: text('observacoes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid('created_by'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    updatedBy: uuid('updated_by'),
  },
  (table) => ({
    anoMesUnique: uniqueIndex('idx_periodo_ano_mes').on(table.ano, table.mes),
    statusIdx: index('idx_periodo_status').on(table.status),
  })
);

export const lancamentoContabil = pgTable(
  'lancamento_contabil',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    numero: serial('numero').notNull(),
    periodoId: uuid('periodo_id').notNull().references(() => periodoContabil.id),
    dataLancamento: date('data_lancamento').notNull(),
    dataCompetencia: date('data_competencia').notNull(),
    historico: text('historico').notNull(),
    origem: lancamentoOrigemEnum('origem').notNull(),
    origemId: uuid('origem_id'),
    status: lancamentoStatusEnum('status').notNull(),
    estornoDeId: uuid('estorno_de_id'),
    totalDebito: numeric('total_debito', { precision: 14, scale: 2 }).notNull(),
    totalCredito: numeric('total_credito', { precision: 14, scale: 2 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid('created_by'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    updatedBy: uuid('updated_by'),
  },
  (table) => ({
    periodoIdx: index('idx_lancamento_periodo').on(table.periodoId),
    dataIdx: index('idx_lancamento_data').on(table.dataLancamento),
    origemIdx: index('idx_lancamento_origem').on(table.origem, table.origemId),
    statusIdx: index('idx_lancamento_status').on(table.status),
    numeroUnique: uniqueIndex('idx_lancamento_numero').on(table.numero),
  })
);

export const lancamentoLinha = pgTable(
  'lancamento_linha',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    lancamentoId: uuid('lancamento_id').notNull().references(() => lancamentoContabil.id),
    ordem: integer('ordem').notNull(),
    contaId: uuid('conta_id').notNull().references(() => planoContas.id),
    tipo: lancamentoLinhaTypeEnum('tipo').notNull(),
    valor: numeric('valor', { precision: 14, scale: 2 }).notNull(),
    historicoComplementar: text('historico_complementar'),
    centroCustoId: uuid('centro_custo_id'),
    projetoId: uuid('projeto_id'),
    fundoId: uuid('fundo_id'),
  },
  (table) => ({
    lancamentoIdx: index('idx_linha_lancamento').on(table.lancamentoId),
    contaIdx: index('idx_linha_conta').on(table.contaId),
    centroCustoIdx: index('idx_linha_centro_custo').on(table.centroCustoId),
    projetoIdx: index('idx_linha_projeto').on(table.projetoId),
    fundoIdx: index('idx_linha_fundo').on(table.fundoId),
    lancamentoOrdemUnique: uniqueIndex('idx_linha_lancamento_ordem').on(table.lancamentoId, table.ordem),
  })
);

export const saldoContaPeriodo = pgTable(
  'saldo_conta_periodo',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    contaId: uuid('conta_id').notNull().references(() => planoContas.id),
    periodoId: uuid('periodo_id').notNull().references(() => periodoContabil.id),
    saldoAnterior: numeric('saldo_anterior', { precision: 14, scale: 2 }).notNull(),
    totalDebitos: numeric('total_debitos', { precision: 14, scale: 2 }).notNull(),
    totalCreditos: numeric('total_creditos', { precision: 14, scale: 2 }).notNull(),
    saldoFinal: numeric('saldo_final', { precision: 14, scale: 2 }).notNull(),
  },
  (table) => ({
    contaPeriodoUnique: uniqueIndex('idx_saldo_conta_periodo').on(table.contaId, table.periodoId),
    periodoIdx: index('idx_saldo_periodo').on(table.periodoId),
  })
);

// ============================================================================
// MÓDULO E: Projetos, Centros de Custo e Fundos
// ============================================================================

export const centroCusto = pgTable(
  'centro_custo',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    codigo: varchar('codigo', { length: 20 }).notNull().unique(),
    nome: varchar('nome', { length: 100 }).notNull(),
    descricao: text('descricao'),
    responsavelId: uuid('responsavel_id'),
    ativo: boolean('ativo').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid('created_by'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    updatedBy: uuid('updated_by'),
  },
  (table) => ({
    codigoUnique: uniqueIndex('idx_centro_custo_codigo').on(table.codigo),
    ativoIdx: index('idx_centro_custo_ativo').on(table.ativo),
  })
);

export const projeto = pgTable(
  'projeto',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    codigo: varchar('codigo', { length: 20 }).notNull().unique(),
    nome: varchar('nome', { length: 200 }).notNull(),
    descricao: text('descricao'),
    dataInicio: date('data_inicio'),
    dataFimPrevista: date('data_fim_prevista'),
    dataFimReal: date('data_fim_real'),
    orcamentoPrevisto: numeric('orcamento_previsto', { precision: 14, scale: 2 }),
    status: projetoStatusEnum('status').notNull(),
    centroCustoId: uuid('centro_custo_id').references(() => centroCusto.id),
    responsavelId: uuid('responsavel_id'),
    parceriaMrosc: boolean('parceria_mrosc').notNull().default(false),
    numeroTermoParceria: varchar('numero_termo_parceria', { length: 50 }),
    orgaoParceiro: varchar('orgao_parceiro', { length: 200 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid('created_by'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    updatedBy: uuid('updated_by'),
  },
  (table) => ({
    codigoUnique: uniqueIndex('idx_projeto_codigo').on(table.codigo),
    statusIdx: index('idx_projeto_status').on(table.status),
    centroCustoIdx: index('idx_projeto_centro_custo').on(table.centroCustoId),
  })
);

export const fundo = pgTable(
  'fundo',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    codigo: varchar('codigo', { length: 20 }).notNull().unique(),
    nome: varchar('nome', { length: 200 }).notNull(),
    descricao: text('descricao'),
    tipo: fundoTipoEnum('tipo').notNull(),
    finalidade: text('finalidade'),
    dataInicio: date('data_inicio'),
    dataLimite: date('data_limite'),
    metaValor: numeric('meta_valor', { precision: 14, scale: 2 }),
    saldoAtual: numeric('saldo_atual', { precision: 14, scale: 2 }).notNull().default('0'),
    ativo: boolean('ativo').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid('created_by'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    updatedBy: uuid('updated_by'),
  },
  (table) => ({
    codigoUnique: uniqueIndex('idx_fundo_codigo').on(table.codigo),
    tipoIdx: index('idx_fundo_tipo').on(table.tipo),
    ativoIdx: index('idx_fundo_ativo').on(table.ativo),
  })
);

export const fundoRegra = pgTable(
  'fundo_regra',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    fundoId: uuid('fundo_id').notNull().references(() => fundo.id),
    tipoRegra: regraTipoEnum('tipo_regra').notNull(),
    parametroTexto: text('parametro_texto'),
    parametroNumerico: numeric('parametro_numerico', { precision: 14, scale: 4 }),
    parametroLista: text('parametro_lista').array(),
    ativo: boolean('ativo').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid('created_by'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    updatedBy: uuid('updated_by'),
  },
  (table) => ({
    fundoIdx: index('idx_fundo_regra_fundo').on(table.fundoId),
  })
);

export const fundoAlocacao = pgTable(
  'fundo_alocacao',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    fundoId: uuid('fundo_id').notNull().references(() => fundo.id),
    lancamentoLinhaId: uuid('lancamento_linha_id').notNull().references(() => lancamentoLinha.id),
    valor: numeric('valor', { precision: 14, scale: 2 }).notNull(),
    dataAlocacao: date('data_alocacao').notNull(),
    origemDescricao: text('origem_descricao'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid('created_by'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    updatedBy: uuid('updated_by'),
  },
  (table) => ({
    fundoIdx: index('idx_fundo_alocacao_fundo').on(table.fundoId),
    linhaIdx: index('idx_fundo_alocacao_linha').on(table.lancamentoLinhaId),
  })
);

export const fundoConsumo = pgTable(
  'fundo_consumo',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    fundoId: uuid('fundo_id').notNull().references(() => fundo.id),
    lancamentoLinhaId: uuid('lancamento_linha_id').notNull().references(() => lancamentoLinha.id),
    tituloId: uuid('titulo_id').references(() => titulo.id),
    valor: numeric('valor', { precision: 14, scale: 2 }).notNull(),
    dataConsumo: date('data_consumo').notNull(),
    justificativa: text('justificativa'),
    aprovadoPor: uuid('aprovado_por'),
    aprovadoEm: timestamp('aprovado_em', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid('created_by'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    updatedBy: uuid('updated_by'),
  },
  (table) => ({
    fundoIdx: index('idx_fundo_consumo_fundo').on(table.fundoId),
    linhaIdx: index('idx_fundo_consumo_linha').on(table.lancamentoLinhaId),
    tituloIdx: index('idx_fundo_consumo_titulo').on(table.tituloId),
  })
);

// ============================================================================
// MÓDULO F: Patrimônio/Imobilizado
// ============================================================================

export const bemPatrimonial = pgTable(
  'bem_patrimonial',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    codigo: varchar('codigo', { length: 30 }).notNull().unique(),
    descricao: varchar('descricao', { length: 500 }).notNull(),
    categoria: bemCategoriaEnum('categoria').notNull(),
    dataAquisicao: date('data_aquisicao').notNull(),
    valorAquisicao: numeric('valor_aquisicao', { precision: 14, scale: 2 }).notNull(),
    valorResidual: numeric('valor_residual', { precision: 14, scale: 2 }).notNull().default('0'),
    vidaUtilMeses: integer('vida_util_meses').notNull(),
    metodoDepreciacao: depreciacaoMetodoEnum('metodo_depreciacao').notNull(),
    contaAtivoId: uuid('conta_ativo_id').notNull().references(() => planoContas.id),
    contaDepreciacaoId: uuid('conta_depreciacao_id').references(() => planoContas.id),
    contaDepreciacaoAcumId: uuid('conta_depreciacao_acum_id').references(() => planoContas.id),
    fornecedorId: uuid('fornecedor_id').references(() => pessoa.id),
    numeroNotaFiscal: varchar('numero_nota_fiscal', { length: 50 }),
    localizacao: varchar('localizacao', { length: 200 }),
    responsavelId: uuid('responsavel_id'),
    projetoId: uuid('projeto_id').references(() => projeto.id),
    fundoId: uuid('fundo_id').references(() => fundo.id),
    status: bemStatusEnum('status').notNull(),
    dataBaixa: date('data_baixa'),
    motivoBaixa: text('motivo_baixa'),
    valorBaixa: numeric('valor_baixa', { precision: 14, scale: 2 }),
    tituloAquisicaoId: uuid('titulo_aquisicao_id').references(() => titulo.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid('created_by'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    updatedBy: uuid('updated_by'),
  },
  (table) => ({
    codigoUnique: uniqueIndex('idx_bem_codigo').on(table.codigo),
    categoriaIdx: index('idx_bem_categoria').on(table.categoria),
    statusIdx: index('idx_bem_status').on(table.status),
    projetoIdx: index('idx_bem_projeto').on(table.projetoId),
    fundoIdx: index('idx_bem_fundo').on(table.fundoId),
  })
);

export const bemDepreciacao = pgTable(
  'bem_depreciacao',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    bemId: uuid('bem_id').notNull().references(() => bemPatrimonial.id),
    periodoId: uuid('periodo_id').notNull().references(() => periodoContabil.id),
    valorDepreciacao: numeric('valor_depreciacao', { precision: 14, scale: 2 }).notNull(),
    depreciacaoAcumulada: numeric('depreciacao_acumulada', { precision: 14, scale: 2 }).notNull(),
    valorContabil: numeric('valor_contabil', { precision: 14, scale: 2 }).notNull(),
    lancamentoId: uuid('lancamento_id').references(() => lancamentoContabil.id),
  },
  (table) => ({
    bemPeriodoUnique: uniqueIndex('idx_depreciacao_bem_periodo').on(table.bemId, table.periodoId),
    bemIdx: index('idx_depreciacao_bem').on(table.bemId),
    periodoIdx: index('idx_depreciacao_periodo').on(table.periodoId),
  })
);

// ============================================================================
// MÓDULO G: Governança e Auditoria
// ============================================================================

export const usuario = pgTable(
  'usuario',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    authProviderId: varchar('auth_provider_id', { length: 100 }).notNull(),
    email: varchar('email', { length: 320 }).notNull().unique(),
    nome: varchar('nome', { length: 255 }).notNull(),
    avatarUrl: text('avatar_url'),
    ativo: boolean('ativo').notNull().default(true),
    ultimoAcesso: timestamp('ultimo_acesso', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid('created_by'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    updatedBy: uuid('updated_by'),
  },
  (table) => ({
    emailUnique: uniqueIndex('idx_usuario_email').on(table.email),
    authProviderIdx: index('idx_usuario_auth_provider').on(table.authProviderId),
    ativoIdx: index('idx_usuario_ativo').on(table.ativo),
  })
);

export const papel = pgTable(
  'papel',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    codigo: varchar('codigo', { length: 50 }).notNull().unique(),
    nome: varchar('nome', { length: 100 }).notNull(),
    descricao: text('descricao'),
    nivel: integer('nivel').notNull(),
  },
  (table) => ({
    codigoUnique: uniqueIndex('idx_papel_codigo').on(table.codigo),
  })
);

export const permissao = pgTable(
  'permissao',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    codigo: varchar('codigo', { length: 100 }).notNull().unique(),
    nome: varchar('nome', { length: 200 }).notNull(),
    modulo: varchar('modulo', { length: 50 }).notNull(),
  },
  (table) => ({
    codigoUnique: uniqueIndex('idx_permissao_codigo').on(table.codigo),
    moduloIdx: index('idx_permissao_modulo').on(table.modulo),
  })
);

export const papelPermissao = pgTable(
  'papel_permissao',
  {
    papelId: uuid('papel_id').notNull().references(() => papel.id),
    permissaoId: uuid('permissao_id').notNull().references(() => permissao.id),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.papelId, table.permissaoId] }),
  })
);

export const usuarioPapel = pgTable(
  'usuario_papel',
  {
    usuarioId: uuid('usuario_id').notNull().references(() => usuario.id),
    papelId: uuid('papel_id').notNull().references(() => papel.id),
    dataInicio: date('data_inicio').notNull(),
    dataFim: date('data_fim'),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.usuarioId, table.papelId] }),
    usuarioIdx: index('idx_usuario_papel_usuario').on(table.usuarioId),
    papelIdx: index('idx_usuario_papel_papel').on(table.papelId),
  })
);

export const aprovacao = pgTable(
  'aprovacao',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    entidadeTipo: aprovacaoEntidadeEnum('entidade_tipo').notNull(),
    entidadeId: uuid('entidade_id').notNull(),
    status: aprovacaoStatusEnum('status').notNull(),
    nivelAprovacao: integer('nivel_aprovacao').notNull(),
    aprovadorId: uuid('aprovador_id').references(() => usuario.id),
    dataDecisao: timestamp('data_decisao', { withTimezone: true }),
    observacao: text('observacao'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid('created_by'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    updatedBy: uuid('updated_by'),
  },
  (table) => ({
    entidadeIdx: index('idx_aprovacao_entidade').on(table.entidadeTipo, table.entidadeId),
    statusIdx: index('idx_aprovacao_status').on(table.status),
    aprovadorIdx: index('idx_aprovacao_aprovador').on(table.aprovadorId),
  })
);

export const eventoAuditoria = pgTable(
  'evento_auditoria',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    usuarioId: uuid('usuario_id').references(() => usuario.id),
    entidadeTipo: varchar('entidade_tipo', { length: 50 }).notNull(),
    entidadeId: uuid('entidade_id').notNull(),
    acao: auditoriaAcaoEnum('acao').notNull(),
    dadosAnteriores: jsonb('dados_anteriores'),
    dadosNovos: jsonb('dados_novos'),
    ipOrigem: varchar('ip_origem', { length: 45 }),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    entidadeIdx: index('idx_auditoria_entidade').on(table.entidadeTipo, table.entidadeId),
    usuarioIdx: index('idx_auditoria_usuario').on(table.usuarioId),
    dataIdx: index('idx_auditoria_data').on(table.createdAt),
    acaoIdx: index('idx_auditoria_acao').on(table.acao),
  })
);

export const configuracaoSistema = pgTable(
  'configuracao_sistema',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    chave: varchar('chave', { length: 100 }).notNull().unique(),
    valor: jsonb('valor').notNull(),
    descricao: text('descricao'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid('created_by'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    updatedBy: uuid('updated_by'),
  },
  (table) => ({
    chaveUnique: uniqueIndex('idx_configuracao_chave').on(table.chave),
  })
);

// ============================================================================
// LEGACY TABLES - Re-exportados do arquivo separado para melhor inferência de tipos
// ============================================================================
export {
  roleEnum,
  accountTypeEnum,
  periodStatusEnum,
  entryTypeEnum,
  originEnum,
  nfcCategoryEnum,
  bankEnum,
  fileTypeEnum,
  importStatusEnum,
  entityTypeEnum,
  actionEnum,
  users,
  organizationSettings,
  accounts,
  periods,
  entries,
  bankImports,
  classificationRules,
  auditLog,
} from './schema-legacy';

// ============================================================================
// TYPE EXPORTS - Novas tabelas
// ============================================================================

// Módulo A
export type Pessoa = typeof pessoa.$inferSelect;
export type InsertPessoa = typeof pessoa.$inferInsert;
export type PessoaDocumento = typeof pessoaDocumento.$inferSelect;
export type InsertPessoaDocumento = typeof pessoaDocumento.$inferInsert;
export type PessoaContato = typeof pessoaContato.$inferSelect;
export type InsertPessoaContato = typeof pessoaContato.$inferInsert;
export type PessoaEndereco = typeof pessoaEndereco.$inferSelect;
export type InsertPessoaEndereco = typeof pessoaEndereco.$inferInsert;
export type Associado = typeof associado.$inferSelect;
export type InsertAssociado = typeof associado.$inferInsert;
export type AssociadoHistorico = typeof associadoHistorico.$inferSelect;
export type InsertAssociadoHistorico = typeof associadoHistorico.$inferInsert;
export type ConsentimentoLgpd = typeof consentimentoLgpd.$inferSelect;
export type InsertConsentimentoLgpd = typeof consentimentoLgpd.$inferInsert;

// Módulo B
export type ContaFinanceira = typeof contaFinanceira.$inferSelect;
export type InsertContaFinanceira = typeof contaFinanceira.$inferInsert;
export type ExtratoBancario = typeof extratoBancario.$inferSelect;
export type InsertExtratoBancario = typeof extratoBancario.$inferInsert;
export type ExtratoLinha = typeof extratoLinha.$inferSelect;
export type InsertExtratoLinha = typeof extratoLinha.$inferInsert;
export type Conciliacao = typeof conciliacao.$inferSelect;
export type InsertConciliacao = typeof conciliacao.$inferInsert;

// Módulo C
export type Titulo = typeof titulo.$inferSelect;
export type InsertTitulo = typeof titulo.$inferInsert;
export type TituloBaixa = typeof tituloBaixa.$inferSelect;
export type InsertTituloBaixa = typeof tituloBaixa.$inferInsert;
export type Anexo = typeof anexo.$inferSelect;
export type InsertAnexo = typeof anexo.$inferInsert;

// Módulo D
export type PlanoContas = typeof planoContas.$inferSelect;
export type InsertPlanoContas = typeof planoContas.$inferInsert;
export type PeriodoContabil = typeof periodoContabil.$inferSelect;
export type InsertPeriodoContabil = typeof periodoContabil.$inferInsert;
export type LancamentoContabil = typeof lancamentoContabil.$inferSelect;
export type InsertLancamentoContabil = typeof lancamentoContabil.$inferInsert;
export type LancamentoLinha = typeof lancamentoLinha.$inferSelect;
export type InsertLancamentoLinha = typeof lancamentoLinha.$inferInsert;
export type SaldoContaPeriodo = typeof saldoContaPeriodo.$inferSelect;
export type InsertSaldoContaPeriodo = typeof saldoContaPeriodo.$inferInsert;

// Módulo E
export type CentroCusto = typeof centroCusto.$inferSelect;
export type InsertCentroCusto = typeof centroCusto.$inferInsert;
export type Projeto = typeof projeto.$inferSelect;
export type InsertProjeto = typeof projeto.$inferInsert;
export type Fundo = typeof fundo.$inferSelect;
export type InsertFundo = typeof fundo.$inferInsert;
export type FundoRegra = typeof fundoRegra.$inferSelect;
export type InsertFundoRegra = typeof fundoRegra.$inferInsert;
export type FundoAlocacao = typeof fundoAlocacao.$inferSelect;
export type InsertFundoAlocacao = typeof fundoAlocacao.$inferInsert;
export type FundoConsumo = typeof fundoConsumo.$inferSelect;
export type InsertFundoConsumo = typeof fundoConsumo.$inferInsert;

// Módulo F
export type BemPatrimonial = typeof bemPatrimonial.$inferSelect;
export type InsertBemPatrimonial = typeof bemPatrimonial.$inferInsert;
export type BemDepreciacao = typeof bemDepreciacao.$inferSelect;
export type InsertBemDepreciacao = typeof bemDepreciacao.$inferInsert;

// Módulo G
export type Usuario = typeof usuario.$inferSelect;
export type InsertUsuario = typeof usuario.$inferInsert;
export type Papel = typeof papel.$inferSelect;
export type InsertPapel = typeof papel.$inferInsert;
export type Permissao = typeof permissao.$inferSelect;
export type InsertPermissao = typeof permissao.$inferInsert;
export type PapelPermissao = typeof papelPermissao.$inferSelect;
export type InsertPapelPermissao = typeof papelPermissao.$inferInsert;
export type UsuarioPapel = typeof usuarioPapel.$inferSelect;
export type InsertUsuarioPapel = typeof usuarioPapel.$inferInsert;
export type Aprovacao = typeof aprovacao.$inferSelect;
export type InsertAprovacao = typeof aprovacao.$inferInsert;
export type EventoAuditoria = typeof eventoAuditoria.$inferSelect;
export type InsertEventoAuditoria = typeof eventoAuditoria.$inferInsert;
export type ConfiguracaoSistema = typeof configuracaoSistema.$inferSelect;
export type InsertConfiguracaoSistema = typeof configuracaoSistema.$inferInsert;

// Legacy types (para compatibilidade) - Re-exportados do arquivo separado
export type {
  User,
  InsertUser,
  OrganizationSettings,
  InsertOrganizationSettings,
  Account,
  InsertAccount,
  Period,
  InsertPeriod,
  Entry,
  InsertEntry,
  BankImport,
  InsertBankImport,
  ClassificationRule,
  InsertClassificationRule,
  AuditLog,
  InsertAuditLog,
} from './schema-legacy';
