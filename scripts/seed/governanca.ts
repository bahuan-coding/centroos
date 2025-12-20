/**
 * Seed de Papéis e Permissões - Módulo G: Governança
 * Conforme especificação 07-MODULO-G-GOVERNANCA.md
 */

import { eq } from 'drizzle-orm';
import { getDb, schema } from '../../server/db';

// Papéis padrão do sistema (8 conforme especificação)
const PAPEIS_PADRAO = [
  { codigo: 'admin', nome: 'Administrador', descricao: 'Acesso total ao sistema', nivel: 100 },
  { codigo: 'diretor', nome: 'Diretor', descricao: 'Gestão estratégica, aprovações altas', nivel: 80 },
  { codigo: 'auditor', nome: 'Auditor', descricao: 'Visualização e relatórios - Conselho Fiscal', nivel: 70 },
  { codigo: 'contador', nome: 'Contador', descricao: 'Contabilidade completa, fechamento de períodos', nivel: 60 },
  { codigo: 'aprovador', nome: 'Aprovador', descricao: 'Aprovação de operações acima da alçada', nivel: 55 },
  { codigo: 'financeiro', nome: 'Financeiro', descricao: 'Contas a pagar/receber - Tesoureiro', nivel: 50 },
  { codigo: 'operador', nome: 'Operador', descricao: 'Lançamentos básicos - Secretário financeiro', nivel: 30 },
  { codigo: 'visualizador', nome: 'Visualizador', descricao: 'Somente leitura - Membros do conselho', nivel: 10 },
];

// Permissões por módulo
const PERMISSOES = [
  // Módulo A - Identidades
  { codigo: 'pessoas.pessoa.criar', nome: 'Criar Pessoa', modulo: 'pessoas' },
  { codigo: 'pessoas.pessoa.editar', nome: 'Editar Pessoa', modulo: 'pessoas' },
  { codigo: 'pessoas.pessoa.excluir', nome: 'Inativar Pessoa', modulo: 'pessoas' },
  { codigo: 'pessoas.pessoa.visualizar', nome: 'Ver Pessoas', modulo: 'pessoas' },
  { codigo: 'pessoas.associado.gerenciar', nome: 'Gerenciar Associados', modulo: 'pessoas' },

  // Módulo B - Caixa/Bancos
  { codigo: 'bancos.conta.criar', nome: 'Criar Conta', modulo: 'bancos' },
  { codigo: 'bancos.conta.editar', nome: 'Editar Conta', modulo: 'bancos' },
  { codigo: 'bancos.extrato.importar', nome: 'Importar Extrato', modulo: 'bancos' },
  { codigo: 'bancos.conciliacao.executar', nome: 'Conciliar', modulo: 'bancos' },

  // Módulo C - Pagar/Receber
  { codigo: 'titulos.titulo.criar', nome: 'Criar Título', modulo: 'titulos' },
  { codigo: 'titulos.titulo.editar', nome: 'Editar Título', modulo: 'titulos' },
  { codigo: 'titulos.titulo.aprovar', nome: 'Aprovar Título', modulo: 'titulos' },
  { codigo: 'titulos.titulo.baixar', nome: 'Baixar Título', modulo: 'titulos' },
  { codigo: 'titulos.titulo.estornar', nome: 'Estornar Baixa', modulo: 'titulos' },

  // Módulo D - Contabilidade
  { codigo: 'contabilidade.lancamento.criar', nome: 'Criar Lançamento', modulo: 'contabilidade' },
  { codigo: 'contabilidade.lancamento.efetivar', nome: 'Efetivar Lançamento', modulo: 'contabilidade' },
  { codigo: 'contabilidade.lancamento.estornar', nome: 'Estornar Lançamento', modulo: 'contabilidade' },
  { codigo: 'contabilidade.periodo.fechar', nome: 'Fechar Período', modulo: 'contabilidade' },
  { codigo: 'contabilidade.periodo.reabrir', nome: 'Reabrir Período', modulo: 'contabilidade' },

  // Módulo E - Projetos/Fundos
  { codigo: 'projetos.projeto.criar', nome: 'Criar Projeto', modulo: 'projetos' },
  { codigo: 'projetos.projeto.gerenciar', nome: 'Gerenciar Projeto', modulo: 'projetos' },
  { codigo: 'projetos.fundo.consumir', nome: 'Consumir Fundo', modulo: 'projetos' },
  { codigo: 'projetos.fundo.aprovar_consumo', nome: 'Aprovar Consumo', modulo: 'projetos' },

  // Módulo F - Patrimônio
  { codigo: 'patrimonio.bem.criar', nome: 'Cadastrar Bem', modulo: 'patrimonio' },
  { codigo: 'patrimonio.bem.baixar', nome: 'Baixar Bem', modulo: 'patrimonio' },
  { codigo: 'patrimonio.depreciacao.executar', nome: 'Calcular Depreciação', modulo: 'patrimonio' },

  // Módulo G - Sistema
  { codigo: 'sistema.usuario.gerenciar', nome: 'Gerenciar Usuários', modulo: 'sistema' },
  { codigo: 'sistema.papel.gerenciar', nome: 'Gerenciar Papéis', modulo: 'sistema' },
  { codigo: 'sistema.configuracao.editar', nome: 'Configurar Sistema', modulo: 'sistema' },
  { codigo: 'sistema.auditoria.visualizar', nome: 'Ver Auditoria', modulo: 'sistema' },
];

// Mapeamento de permissões por papel
const PAPEL_PERMISSOES: Record<string, string[]> = {
  admin: PERMISSOES.map(p => p.codigo), // Admin tem tudo
  diretor: [
    'pessoas.pessoa.visualizar', 'pessoas.associado.gerenciar',
    'bancos.conta.criar', 'bancos.conta.editar', 'bancos.extrato.importar', 'bancos.conciliacao.executar',
    'titulos.titulo.criar', 'titulos.titulo.editar', 'titulos.titulo.aprovar', 'titulos.titulo.baixar', 'titulos.titulo.estornar',
    'contabilidade.lancamento.criar', 'contabilidade.lancamento.efetivar', 'contabilidade.periodo.fechar', 'contabilidade.periodo.reabrir',
    'projetos.projeto.criar', 'projetos.projeto.gerenciar', 'projetos.fundo.consumir', 'projetos.fundo.aprovar_consumo',
    'patrimonio.bem.criar', 'patrimonio.bem.baixar', 'patrimonio.depreciacao.executar',
    'sistema.auditoria.visualizar',
  ],
  auditor: [
    'pessoas.pessoa.visualizar',
    'titulos.titulo.visualizar',
    'contabilidade.lancamento.visualizar',
    'projetos.projeto.visualizar',
    'patrimonio.bem.visualizar',
    'sistema.auditoria.visualizar',
  ],
  contador: [
    'pessoas.pessoa.visualizar', 'pessoas.pessoa.editar',
    'bancos.conta.criar', 'bancos.conta.editar', 'bancos.extrato.importar', 'bancos.conciliacao.executar',
    'titulos.titulo.criar', 'titulos.titulo.editar', 'titulos.titulo.baixar',
    'contabilidade.lancamento.criar', 'contabilidade.lancamento.efetivar', 'contabilidade.lancamento.estornar',
    'contabilidade.periodo.fechar', 'contabilidade.periodo.reabrir',
    'projetos.projeto.criar', 'projetos.projeto.gerenciar',
    'patrimonio.bem.criar', 'patrimonio.depreciacao.executar',
    'sistema.auditoria.visualizar',
  ],
  aprovador: [
    'pessoas.pessoa.visualizar',
    'titulos.titulo.aprovar', 'titulos.titulo.baixar',
    'projetos.fundo.aprovar_consumo',
    'sistema.auditoria.visualizar',
  ],
  financeiro: [
    'pessoas.pessoa.visualizar', 'pessoas.pessoa.criar', 'pessoas.pessoa.editar',
    'bancos.conta.editar', 'bancos.extrato.importar', 'bancos.conciliacao.executar',
    'titulos.titulo.criar', 'titulos.titulo.editar', 'titulos.titulo.baixar',
    'projetos.fundo.consumir',
  ],
  operador: [
    'pessoas.pessoa.visualizar', 'pessoas.pessoa.criar',
    'titulos.titulo.criar', 'titulos.titulo.editar',
  ],
  visualizador: [
    'pessoas.pessoa.visualizar',
  ],
};

// Configurações padrão do sistema
const CONFIGURACOES_PADRAO = [
  // Organização
  { chave: 'organizacao.nome', valor: '', descricao: 'Nome da entidade' },
  { chave: 'organizacao.cnpj', valor: '', descricao: 'CNPJ da entidade' },
  // Financeiro
  { chave: 'financeiro.dia_vencimento_padrao', valor: 10, descricao: 'Dia padrão para vencimento de contribuições' },
  { chave: 'financeiro.tolerancia_vencimento', valor: 5, descricao: 'Dias de tolerância após vencimento' },
  // Alçadas de aprovação (valor mínimo -> nível exigido)
  { chave: 'financeiro.alcada.30', valor: 1000, descricao: 'Valor mínimo para exigir aprovação nível 30 (operador)' },
  { chave: 'financeiro.alcada.50', valor: 5000, descricao: 'Valor mínimo para exigir aprovação nível 50 (financeiro)' },
  { chave: 'financeiro.alcada.60', valor: 10000, descricao: 'Valor mínimo para exigir aprovação nível 60 (contador)' },
  { chave: 'financeiro.alcada.80', valor: 50000, descricao: 'Valor mínimo para exigir aprovação nível 80 (diretor)' },
  // Contabilidade
  { chave: 'contabilidade.inicio_exercicio', valor: 1, descricao: 'Mês de início do exercício contábil' },
  // Notificações
  { chave: 'notificacoes.email_financeiro', valor: '', descricao: 'E-mail para alertas financeiros' },
  { chave: 'notificacoes.vencimentos_antecedencia', valor: 3, descricao: 'Dias de antecedência para alertas de vencimento' },
  // Auditoria
  { chave: 'auditoria.retencao_anos', valor: 5, descricao: 'Anos mínimos de retenção de trilha de auditoria' },
  { chave: 'auditoria.exportar_formato', valor: 'csv', descricao: 'Formato padrão de exportação (csv/json)' },
];

export async function seedGovernanca() {
  const db = await getDb();
  console.log('🔐 Iniciando seed do Módulo G: Governança...\n');

  // 1. Criar permissões
  console.log('📋 Criando permissões...');
  for (const perm of PERMISSOES) {
    const existing = await db.select().from(schema.permissao).where(eq(schema.permissao.codigo, perm.codigo));
    if (existing.length === 0) {
      await db.insert(schema.permissao).values(perm);
      console.log(`   ✅ ${perm.codigo}`);
    } else {
      console.log(`   ⏭️  ${perm.codigo} (já existe)`);
    }
  }

  // 2. Criar papéis
  console.log('\n👤 Criando papéis...');
  const papelIds: Record<string, string> = {};
  for (const papel of PAPEIS_PADRAO) {
    const existing = await db.select().from(schema.papel).where(eq(schema.papel.codigo, papel.codigo));
    if (existing.length === 0) {
      const [created] = await db.insert(schema.papel).values(papel).returning();
      papelIds[papel.codigo] = created.id;
      console.log(`   ✅ ${papel.nome} (nível ${papel.nivel})`);
    } else {
      papelIds[papel.codigo] = existing[0].id;
      console.log(`   ⏭️  ${papel.nome} (já existe)`);
    }
  }

  // 3. Vincular permissões aos papéis
  console.log('\n🔗 Vinculando permissões aos papéis...');
  const allPermissoes = await db.select().from(schema.permissao);
  const permissaoMap: Record<string, string> = {};
  allPermissoes.forEach(p => { permissaoMap[p.codigo] = p.id; });

  for (const [papelCodigo, permissaoCodigos] of Object.entries(PAPEL_PERMISSOES)) {
    const papelId = papelIds[papelCodigo];
    if (!papelId) continue;

    // Limpar vínculos existentes
    await db.delete(schema.papelPermissao).where(eq(schema.papelPermissao.papelId, papelId));

    const vinculos = permissaoCodigos
      .filter(codigo => permissaoMap[codigo])
      .map(codigo => ({ papelId, permissaoId: permissaoMap[codigo] }));

    if (vinculos.length > 0) {
      await db.insert(schema.papelPermissao).values(vinculos);
    }
    console.log(`   ✅ ${papelCodigo}: ${vinculos.length} permissões`);
  }

  // 4. Criar configurações padrão
  console.log('\n⚙️  Criando configurações padrão...');
  for (const config of CONFIGURACOES_PADRAO) {
    const existing = await db.select().from(schema.configuracaoSistema).where(eq(schema.configuracaoSistema.chave, config.chave));
    if (existing.length === 0) {
      await db.insert(schema.configuracaoSistema).values(config);
      console.log(`   ✅ ${config.chave}`);
    } else {
      console.log(`   ⏭️  ${config.chave} (já existe)`);
    }
  }

  console.log('\n✅ Seed de Governança concluído!\n');
}

// Executar diretamente
seedGovernanca().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

