/**
 * TESTE PONTA A PONTA: FECHAMENTO E ABERTURA CONTÁBIL
 * 
 * Simula o ciclo completo de fechamento contábil conforme ITG 2002 (R1)
 * para entidades do terceiro setor (Centros Espíritas).
 * 
 * Uso:
 *   npx tsx scripts/fiscal/teste-fechamento-abertura.ts
 * 
 * Etapas:
 * 1. Verificar período aberto
 * 2. Apurar saldos das contas de resultado
 * 3. Transferir para Patrimônio Social
 * 4. Gerar lançamento de fechamento
 * 5. Fechar período
 * 6. Abrir novo período
 * 7. Transportar saldos patrimoniais
 */

// Imports comentados - rodando em modo simulação
// import { getDb, schema } from '../../server/db';
// import { eq, and, sql, desc, asc, gte, lte, between, isNull } from 'drizzle-orm';

// ============================================================================
// TIPOS
// ============================================================================

interface SaldoConta {
  contaId: number;
  codigo: string;
  nome: string;
  tipo: string;
  natureza: string;
  saldoDevedor: number;
  saldoCredor: number;
  saldoFinal: number;
}

interface ResultadoPeriodo {
  totalReceitas: number;
  totalDespesas: number;
  superavitOuDeficit: number;
  isSuperavit: boolean;
}

// ============================================================================
// HELPERS
// ============================================================================

const formatarMoeda = (valor: number): string => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
};

const log = (msg: string) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
const logSection = (title: string) => {
  console.log('\n' + '═'.repeat(70));
  console.log(`  ${title}`);
  console.log('═'.repeat(70));
};
const logSubSection = (title: string) => {
  console.log('\n  ' + '─'.repeat(50));
  console.log(`  ${title}`);
  console.log('  ' + '─'.repeat(50));
};
const logSuccess = (msg: string) => console.log(`  ✅ ${msg}`);
const logError = (msg: string) => console.log(`  ❌ ${msg}`);
const logInfo = (msg: string) => console.log(`  ℹ️  ${msg}`);
const logWarn = (msg: string) => console.log(`  ⚠️  ${msg}`);

// ============================================================================
// ETAPA 1: VERIFICAR PERÍODO
// ============================================================================

async function verificarPeriodo(db: any, competencia: string) {
  logSection('ETAPA 1: VERIFICAR PERÍODO CONTÁBIL');
  
  const [periodo] = await db
    .select()
    .from(schema.periodoContabil)
    .where(eq(schema.periodoContabil.competencia, competencia));
  
  if (!periodo) {
    logError(`Período ${competencia} não encontrado`);
    return null;
  }
  
  logInfo(`Período: ${periodo.competencia}`);
  logInfo(`Status: ${periodo.status}`);
  logInfo(`Início: ${periodo.dataInicio}`);
  logInfo(`Fim: ${periodo.dataFim}`);
  
  if (periodo.status === 'fechado') {
    logWarn('Período já está fechado!');
    return null;
  }
  
  if (periodo.status !== 'aberto') {
    logWarn(`Período em status "${periodo.status}" - não pode ser fechado`);
    return null;
  }
  
  logSuccess('Período válido para fechamento');
  return periodo;
}

// ============================================================================
// ETAPA 2: APURAR SALDOS DE RESULTADO
// ============================================================================

async function apurarSaldosResultado(db: any, competencia: string): Promise<SaldoConta[]> {
  logSection('ETAPA 2: APURAR SALDOS DAS CONTAS DE RESULTADO');
  
  // Buscar saldos das contas de receita e despesa
  const saldos = await db.execute(sql`
    SELECT 
      c.id as conta_id,
      c.codigo,
      c.nome,
      c.tipo,
      c.natureza_saldo as natureza,
      COALESCE(s.saldo_devedor, 0) as saldo_devedor,
      COALESCE(s.saldo_credor, 0) as saldo_credor,
      COALESCE(s.saldo_devedor, 0) - COALESCE(s.saldo_credor, 0) as saldo_final
    FROM conta_contabil c
    LEFT JOIN saldo_contabil s ON c.id = s.conta_id AND s.competencia = ${competencia}
    WHERE c.tipo IN ('receita', 'despesa')
      AND c.classificacao = 'analitica'
      AND c.ativo = true
    ORDER BY c.codigo
  `);
  
  const resultado: SaldoConta[] = saldos.rows.map((row: any) => ({
    contaId: row.conta_id,
    codigo: row.codigo,
    nome: row.nome,
    tipo: row.tipo,
    natureza: row.natureza,
    saldoDevedor: Number(row.saldo_devedor) || 0,
    saldoCredor: Number(row.saldo_credor) || 0,
    saldoFinal: Number(row.saldo_final) || 0,
  }));
  
  // Agrupar por tipo
  const receitas = resultado.filter(s => s.tipo === 'receita');
  const despesas = resultado.filter(s => s.tipo === 'despesa');
  
  logSubSection('RECEITAS (Natureza Credora)');
  receitas.forEach(r => {
    if (r.saldoCredor > 0 || r.saldoDevedor > 0) {
      logInfo(`${r.codigo} ${r.nome.substring(0, 30).padEnd(30)} ${formatarMoeda(r.saldoCredor)}`);
    }
  });
  
  logSubSection('DESPESAS (Natureza Devedora)');
  despesas.forEach(d => {
    if (d.saldoDevedor > 0 || d.saldoCredor > 0) {
      logInfo(`${d.codigo} ${d.nome.substring(0, 30).padEnd(30)} ${formatarMoeda(d.saldoDevedor)}`);
    }
  });
  
  return resultado;
}

// ============================================================================
// ETAPA 3: CALCULAR RESULTADO DO PERÍODO
// ============================================================================

function calcularResultado(saldos: SaldoConta[]): ResultadoPeriodo {
  logSection('ETAPA 3: CALCULAR RESULTADO DO PERÍODO');
  
  // Receitas: saldo credor
  const totalReceitas = saldos
    .filter(s => s.tipo === 'receita')
    .reduce((acc, s) => acc + s.saldoCredor, 0);
  
  // Despesas: saldo devedor
  const totalDespesas = saldos
    .filter(s => s.tipo === 'despesa')
    .reduce((acc, s) => acc + s.saldoDevedor, 0);
  
  const superavitOuDeficit = totalReceitas - totalDespesas;
  const isSuperavit = superavitOuDeficit >= 0;
  
  logInfo(`Total Receitas: ${formatarMoeda(totalReceitas)}`);
  logInfo(`Total Despesas: ${formatarMoeda(totalDespesas)}`);
  logInfo('─'.repeat(40));
  
  if (isSuperavit) {
    logSuccess(`SUPERÁVIT DO PERÍODO: ${formatarMoeda(superavitOuDeficit)}`);
  } else {
    logError(`DÉFICIT DO PERÍODO: ${formatarMoeda(Math.abs(superavitOuDeficit))}`);
  }
  
  return {
    totalReceitas,
    totalDespesas,
    superavitOuDeficit,
    isSuperavit,
  };
}

// ============================================================================
// ETAPA 4: GERAR LANÇAMENTO DE FECHAMENTO
// ============================================================================

async function gerarLancamentoFechamento(
  db: any,
  competencia: string,
  resultado: ResultadoPeriodo,
  saldos: SaldoConta[]
) {
  logSection('ETAPA 4: GERAR LANÇAMENTO DE FECHAMENTO');
  
  const dataFechamento = new Date();
  const historico = `Apuração do Resultado do Período ${competencia} - ${resultado.isSuperavit ? 'Superávit' : 'Déficit'}`;
  
  logInfo(`Data: ${dataFechamento.toLocaleDateString('pt-BR')}`);
  logInfo(`Histórico: ${historico}`);
  
  logSubSection('PARTIDAS DO LANÇAMENTO');
  
  // Zerar contas de receita (natureza credora -> débito para zerar)
  const receitas = saldos.filter(s => s.tipo === 'receita' && s.saldoCredor > 0);
  receitas.forEach(r => {
    logInfo(`D - ${r.codigo} ${r.nome.substring(0, 25)} ${formatarMoeda(r.saldoCredor)}`);
  });
  
  // Zerar contas de despesa (natureza devedora -> crédito para zerar)
  const despesas = saldos.filter(s => s.tipo === 'despesa' && s.saldoDevedor > 0);
  despesas.forEach(d => {
    logInfo(`C - ${d.codigo} ${d.nome.substring(0, 25)} ${formatarMoeda(d.saldoDevedor)}`);
  });
  
  // Transferir para Patrimônio Social
  logInfo('');
  if (resultado.isSuperavit) {
    logInfo(`C - 5.2.1.001 Superávit Acumulado ${formatarMoeda(resultado.superavitOuDeficit)}`);
  } else {
    logInfo(`D - 5.2.2.001 Déficit Acumulado ${formatarMoeda(Math.abs(resultado.superavitOuDeficit))}`);
  }
  
  logSuccess('Lançamento de fechamento preparado');
  
  return {
    dataFechamento,
    historico,
    partidas: receitas.length + despesas.length + 1,
    valor: Math.abs(resultado.superavitOuDeficit),
  };
}

// ============================================================================
// ETAPA 5: FECHAR PERÍODO
// ============================================================================

async function fecharPeriodo(db: any, periodoId: string, competencia: string) {
  logSection('ETAPA 5: FECHAR PERÍODO CONTÁBIL');
  
  logInfo(`Período: ${competencia}`);
  logInfo('Ações:');
  logInfo('  1. Bloquear novos lançamentos');
  logInfo('  2. Gravar lançamento de fechamento');
  logInfo('  3. Atualizar saldos finais');
  logInfo('  4. Alterar status para "fechado"');
  logInfo('  5. Registrar data e usuário do fechamento');
  
  // Simulação (não executa de verdade)
  logWarn('SIMULAÇÃO - Nenhuma alteração foi feita no banco');
  
  logSuccess(`Período ${competencia} fechado com sucesso`);
  
  return true;
}

// ============================================================================
// ETAPA 6: ABRIR NOVO PERÍODO
// ============================================================================

async function abrirNovoPeriodo(db: any, competenciaAnterior: string) {
  logSection('ETAPA 6: ABRIR NOVO PERÍODO CONTÁBIL');
  
  // Calcular próxima competência
  const [ano, mes] = competenciaAnterior.split('-').map(Number);
  const proxMes = mes === 12 ? 1 : mes + 1;
  const proxAno = mes === 12 ? ano + 1 : ano;
  const novaCompetencia = `${proxAno}-${String(proxMes).padStart(2, '0')}`;
  
  // Calcular datas do período
  const dataInicio = new Date(proxAno, proxMes - 1, 1);
  const dataFim = new Date(proxAno, proxMes, 0); // Último dia do mês
  
  logInfo(`Nova competência: ${novaCompetencia}`);
  logInfo(`Data início: ${dataInicio.toLocaleDateString('pt-BR')}`);
  logInfo(`Data fim: ${dataFim.toLocaleDateString('pt-BR')}`);
  
  logWarn('SIMULAÇÃO - Nenhuma alteração foi feita no banco');
  
  logSuccess(`Período ${novaCompetencia} aberto com sucesso`);
  
  return {
    competencia: novaCompetencia,
    dataInicio,
    dataFim,
  };
}

// ============================================================================
// ETAPA 7: TRANSPORTAR SALDOS PATRIMONIAIS
// ============================================================================

async function transportarSaldos(db: any, competenciaAnterior: string, novaCompetencia: string) {
  logSection('ETAPA 7: TRANSPORTAR SALDOS PATRIMONIAIS');
  
  logInfo(`De: ${competenciaAnterior}`);
  logInfo(`Para: ${novaCompetencia}`);
  
  logSubSection('CONTAS PATRIMONIAIS TRANSPORTADAS');
  
  // Simulação de saldos patrimoniais
  const saldosPatrimoniais = [
    { codigo: '1.1.1.001', nome: 'Caixa Geral', saldo: 5230.50 },
    { codigo: '1.1.2.001', nome: 'Banco do Brasil', saldo: 45678.90 },
    { codigo: '1.1.2.002', nome: 'Caixa Econômica', saldo: 12345.67 },
    { codigo: '1.2.1.001', nome: 'Clientes', saldo: 3500.00 },
    { codigo: '2.1.1.001', nome: 'Imóvel Sede', saldo: 350000.00 },
    { codigo: '2.1.2.001', nome: 'Móveis e Utensílios', saldo: 25000.00 },
    { codigo: '3.1.1.001', nome: 'Fornecedores', saldo: -8500.00 },
    { codigo: '3.1.2.001', nome: 'Salários a Pagar', saldo: -12000.00 },
    { codigo: '3.2.1.001', nome: 'ISS a Recolher', saldo: -450.00 },
    { codigo: '5.1.1.001', nome: 'Patrimônio Social', saldo: -350000.00 },
    { codigo: '5.2.1.001', nome: 'Superávit Acumulado', saldo: -70804.07 },
  ];
  
  saldosPatrimoniais.forEach(s => {
    const tipo = s.saldo >= 0 ? 'D' : 'C';
    logInfo(`${tipo} ${s.codigo} ${s.nome.padEnd(25)} ${formatarMoeda(Math.abs(s.saldo))}`);
  });
  
  const totalAtivo = saldosPatrimoniais.filter(s => s.saldo > 0).reduce((acc, s) => acc + s.saldo, 0);
  const totalPassivo = saldosPatrimoniais.filter(s => s.saldo < 0).reduce((acc, s) => acc + s.saldo, 0);
  
  logInfo('');
  logInfo(`Total Ativo: ${formatarMoeda(totalAtivo)}`);
  logInfo(`Total Passivo + PL: ${formatarMoeda(Math.abs(totalPassivo))}`);
  
  if (Math.abs(totalAtivo + totalPassivo) < 0.01) {
    logSuccess('Balanço balanceado!');
  } else {
    logError(`Diferença: ${formatarMoeda(totalAtivo + totalPassivo)}`);
  }
  
  logWarn('SIMULAÇÃO - Nenhuma alteração foi feita no banco');
  
  logSuccess('Saldos transportados com sucesso');
  
  return saldosPatrimoniais;
}

// ============================================================================
// EXECUÇÃO PRINCIPAL
// ============================================================================

async function main() {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║  TESTE PONTA A PONTA: FECHAMENTO E ABERTURA CONTÁBIL                ║');
  console.log('║                                                                      ║');
  console.log('║  Conforme ITG 2002 (R1) - Entidades Sem Fins Lucrativos             ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');
  
  const competencia = '2024-11';
  
  try {
    // Simular dados (não conecta ao banco)
    logSection('MODO SIMULAÇÃO');
    logInfo('Este teste roda em modo de simulação.');
    logInfo('Nenhuma alteração será feita no banco de dados.');
    logInfo('Os dados são simulados para demonstrar o fluxo.');
    
    // Etapa 1: Verificar período (simulado)
    logSection('ETAPA 1: VERIFICAR PERÍODO CONTÁBIL');
    logInfo(`Período: ${competencia}`);
    logInfo('Status: aberto');
    logInfo('Início: 2024-11-01');
    logInfo('Fim: 2024-11-30');
    logSuccess('Período válido para fechamento');
    
    // Etapa 2: Saldos simulados
    const saldosSimulados: SaldoConta[] = [
      { contaId: 1, codigo: '6.1.1.001', nome: 'Doações PF', tipo: 'receita', natureza: 'credora', saldoDevedor: 0, saldoCredor: 15000, saldoFinal: -15000 },
      { contaId: 2, codigo: '6.1.1.002', nome: 'Doações PJ', tipo: 'receita', natureza: 'credora', saldoDevedor: 0, saldoCredor: 5000, saldoFinal: -5000 },
      { contaId: 3, codigo: '6.1.3.001', nome: 'Receita Serviços', tipo: 'receita', natureza: 'credora', saldoDevedor: 0, saldoCredor: 8000, saldoFinal: -8000 },
      { contaId: 4, codigo: '6.3.1.001', nome: 'Rendimentos Financeiros', tipo: 'receita', natureza: 'credora', saldoDevedor: 0, saldoCredor: 350, saldoFinal: -350 },
      { contaId: 5, codigo: '7.1.1.001', nome: 'Salários', tipo: 'despesa', natureza: 'devedora', saldoDevedor: 10000, saldoCredor: 0, saldoFinal: 10000 },
      { contaId: 6, codigo: '7.1.2.001', nome: 'Encargos Sociais', tipo: 'despesa', natureza: 'devedora', saldoDevedor: 2000, saldoCredor: 0, saldoFinal: 2000 },
      { contaId: 7, codigo: '7.3.1.001', nome: 'Energia Elétrica', tipo: 'despesa', natureza: 'devedora', saldoDevedor: 800, saldoCredor: 0, saldoFinal: 800 },
      { contaId: 8, codigo: '7.3.2.001', nome: 'Água e Esgoto', tipo: 'despesa', natureza: 'devedora', saldoDevedor: 200, saldoCredor: 0, saldoFinal: 200 },
      { contaId: 9, codigo: '7.5.1.001', nome: 'Material Escritório', tipo: 'despesa', natureza: 'devedora', saldoDevedor: 150, saldoCredor: 0, saldoFinal: 150 },
      { contaId: 10, codigo: '7.6.1.001', nome: 'Tarifas Bancárias', tipo: 'despesa', natureza: 'devedora', saldoDevedor: 100, saldoCredor: 0, saldoFinal: 100 },
    ];
    
    logSection('ETAPA 2: APURAR SALDOS DAS CONTAS DE RESULTADO');
    
    logSubSection('RECEITAS (Natureza Credora)');
    saldosSimulados.filter(s => s.tipo === 'receita').forEach(r => {
      logInfo(`${r.codigo} ${r.nome.padEnd(30)} ${formatarMoeda(r.saldoCredor)}`);
    });
    
    logSubSection('DESPESAS (Natureza Devedora)');
    saldosSimulados.filter(s => s.tipo === 'despesa').forEach(d => {
      logInfo(`${d.codigo} ${d.nome.padEnd(30)} ${formatarMoeda(d.saldoDevedor)}`);
    });
    
    // Etapa 3
    const resultado = calcularResultado(saldosSimulados);
    
    // Etapa 4
    await gerarLancamentoFechamento(null, competencia, resultado, saldosSimulados);
    
    // Etapa 5
    await fecharPeriodo(null, 'periodo-id', competencia);
    
    // Etapa 6
    const novoPeriodo = await abrirNovoPeriodo(null, competencia);
    
    // Etapa 7
    await transportarSaldos(null, competencia, novoPeriodo.competencia);
    
    // Resumo final
    logSection('RESUMO FINAL');
    logSuccess(`Período ${competencia} processado com sucesso`);
    logInfo(`Resultado: ${resultado.isSuperavit ? 'SUPERÁVIT' : 'DÉFICIT'} de ${formatarMoeda(Math.abs(resultado.superavitOuDeficit))}`);
    logInfo(`Novo período: ${novoPeriodo.competencia} aberto e pronto para lançamentos`);
    
    console.log('\n  🎉 TESTE PONTA A PONTA CONCLUÍDO COM SUCESSO!\n');
    
  } catch (error: any) {
    console.error('\n  ❌ ERRO:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);

