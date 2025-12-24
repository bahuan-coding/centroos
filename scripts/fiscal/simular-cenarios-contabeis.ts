/**
 * SIMULADOR DE CENÁRIOS CONTÁBEIS - MOTOR FISCAL
 * 
 * Script para testar cenários reais de emissão fiscal e contabilização.
 * Simula o ciclo completo: decisão fiscal → emissão → contabilização.
 * 
 * Uso:
 *   npx tsx scripts/fiscal/simular-cenarios-contabeis.ts
 * 
 * Cenários cobertos:
 * 1. Prestação de serviço para PJ (NFS-e SP)
 * 2. Prestação de serviço para PF (NFS-e SP)
 * 3. Doação recebida (sem documento fiscal)
 * 4. Venda de material para consumidor final presencial (NFC-e)
 * 5. Venda de material para PJ (NF-e)
 * 6. Cancelamento de NFS-e
 * 7. Fechamento contábil mensal
 */

import {
  decidirDocumentoFiscal,
  DecisaoFiscalInput,
  RegimeTributario,
  EstadoDocumentoFiscal,
  MaquinaEstadoFiscal,
  validarCpf,
  validarCnpj,
  validarRPSSP,
  DadosRPSSP,
  gerarIdNFSeSP,
  FiscalLogger,
  gerarCorrelationId,
} from '../../server/fiscal';

// ============================================================================
// CONFIGURAÇÃO DO CENTRO ESPÍRITA (EXEMPLO)
// ============================================================================

const CENTRO_ESPIRITA = {
  cnpj: '12345678000190',
  razaoSocial: 'Centro Espírita Amor e Caridade',
  inscricaoMunicipal: '12345678',
  uf: 'SP',
  codigoMunicipio: '3550308', // São Paulo
  regimeTributario: RegimeTributario.SIMPLES_NACIONAL,
};

// ============================================================================
// HELPERS
// ============================================================================

const formatarMoeda = (valor: number): string => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
};

const log = (msg: string) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
const logSection = (title: string) => {
  console.log('\n' + '='.repeat(70));
  console.log(`  ${title}`);
  console.log('='.repeat(70));
};
const logSuccess = (msg: string) => console.log(`  ✅ ${msg}`);
const logError = (msg: string) => console.log(`  ❌ ${msg}`);
const logInfo = (msg: string) => console.log(`  ℹ️  ${msg}`);

// ============================================================================
// CENÁRIO 1: PRESTAÇÃO DE SERVIÇO PARA PJ
// ============================================================================

async function cenario1_ServicoPJ() {
  logSection('CENÁRIO 1: Prestação de Serviço para Pessoa Jurídica');
  
  const input: DecisaoFiscalInput = {
    tipoOperacao: 'SERVICO',
    emitente: {
      cpfCnpj: CENTRO_ESPIRITA.cnpj,
      uf: CENTRO_ESPIRITA.uf,
      codigoMunicipio: CENTRO_ESPIRITA.codigoMunicipio,
      inscricaoMunicipal: CENTRO_ESPIRITA.inscricaoMunicipal,
      regimeTributario: CENTRO_ESPIRITA.regimeTributario,
    },
    destinatario: {
      tipo: 'PJ',
      cpfCnpj: '98765432000110',
      uf: 'SP',
      codigoMunicipio: '3550308',
      isConsumidorFinal: false,
    },
    localVenda: 'PRESENCIAL',
    valorTotal: 5000,
    servico: {
      codigoLC116: '17.01', // Assessoria ou consultoria
    },
  };
  
  logInfo(`Valor do serviço: ${formatarMoeda(input.valorTotal)}`);
  logInfo(`Tomador: CNPJ ${input.destinatario.cpfCnpj}`);
  
  try {
    const decisao = await decidirDocumentoFiscal(input);
    logSuccess(`Decisão: ${decisao.tipoDocumento}`);
    logInfo(`Motivo: ${decisao.motivo}`);
    logInfo(`Regras aplicadas: ${decisao.regras.join(', ')}`);
    
    // Simular dados do RPS
    const dadosRPS: DadosRPSSP = {
      serieRPS: 'A',
      numeroRPS: 1,
      dataEmissao: new Date(),
      tributacao: 'T', // Tributável
      codigoServico: '17019', // Assessoria
      aliquota: 5, // 5%
      valorServicos: input.valorTotal,
      issRetido: false,
      discriminacao: 'Assessoria administrativa prestada conforme contrato.',
      tomador: {
        cpfCnpj: input.destinatario.cpfCnpj!,
        razaoSocial: 'Empresa Tomadora LTDA',
        email: 'financeiro@empresa.com.br',
      },
    };
    
    const validacao = validarRPSSP(dadosRPS);
    if (validacao.valido) {
      logSuccess('RPS validado com sucesso');
      
      // Simular máquina de estados
      const maquina = new MaquinaEstadoFiscal();
      maquina.transitar(EstadoDocumentoFiscal.VALIDADO, 'RPS validado');
      logInfo(`Estado: ${maquina.estadoAtual}`);
      
      // Contabilização esperada
      logInfo('Contabilização:');
      logInfo('  D - 1.1.2.001 Banco do Brasil ... R$ 5.000,00');
      logInfo('  C - 6.1.3.001 Receita de Serviços R$ 5.000,00');
      logInfo('  D - 7.6.3.001 ISS sobre Serviços . R$ 250,00');
      logInfo('  C - 3.2.1.001 ISS a Recolher ..... R$ 250,00');
    } else {
      logError(`Validação falhou: ${validacao.erros.map(e => e.mensagemUsuario).join('; ')}`);
    }
    
    return { sucesso: true, tipoDocumento: decisao.tipoDocumento };
  } catch (error: any) {
    logError(`Erro: ${error.message}`);
    return { sucesso: false, erro: error.message };
  }
}

// ============================================================================
// CENÁRIO 2: PRESTAÇÃO DE SERVIÇO PARA PF
// ============================================================================

async function cenario2_ServicoPF() {
  logSection('CENÁRIO 2: Prestação de Serviço para Pessoa Física');
  
  const input: DecisaoFiscalInput = {
    tipoOperacao: 'SERVICO',
    emitente: {
      cpfCnpj: CENTRO_ESPIRITA.cnpj,
      uf: CENTRO_ESPIRITA.uf,
      codigoMunicipio: CENTRO_ESPIRITA.codigoMunicipio,
      inscricaoMunicipal: CENTRO_ESPIRITA.inscricaoMunicipal,
      regimeTributario: CENTRO_ESPIRITA.regimeTributario,
    },
    destinatario: {
      tipo: 'PF',
      cpfCnpj: '52998224725',
      uf: 'SP',
      codigoMunicipio: '3550308',
      isConsumidorFinal: true,
    },
    localVenda: 'PRESENCIAL',
    valorTotal: 150,
    servico: {
      codigoLC116: '06.01', // Medicina e biomedicina
    },
  };
  
  logInfo(`Valor do serviço: ${formatarMoeda(input.valorTotal)}`);
  logInfo(`Tomador: CPF ${input.destinatario.cpfCnpj}`);
  
  // Validar CPF
  const cpfValido = validarCpf(input.destinatario.cpfCnpj!);
  if (cpfValido) {
    logSuccess('CPF do tomador válido');
  } else {
    logError('CPF do tomador inválido');
  }
  
  try {
    const decisao = await decidirDocumentoFiscal(input);
    logSuccess(`Decisão: ${decisao.tipoDocumento}`);
    logInfo(`Motivo: ${decisao.motivo}`);
    
    // Contabilização esperada
    logInfo('Contabilização:');
    logInfo('  D - 1.1.1.001 Caixa .............. R$ 150,00');
    logInfo('  C - 6.1.3.002 Receita Atend. PF .. R$ 150,00');
    
    return { sucesso: true, tipoDocumento: decisao.tipoDocumento };
  } catch (error: any) {
    logError(`Erro: ${error.message}`);
    return { sucesso: false, erro: error.message };
  }
}

// ============================================================================
// CENÁRIO 3: DOAÇÃO RECEBIDA (SEM DOCUMENTO FISCAL)
// ============================================================================

async function cenario3_DoacaoRecebida() {
  logSection('CENÁRIO 3: Doação Recebida (Sem Documento Fiscal)');
  
  const doacao = {
    doador: {
      tipo: 'PF',
      cpf: '12345678901',
      nome: 'João da Silva',
    },
    valor: 500,
    formaPagamento: 'PIX',
    finalidade: 'Manutenção da Casa',
    data: new Date(),
  };
  
  logInfo(`Doador: ${doacao.doador.nome}`);
  logInfo(`Valor: ${formatarMoeda(doacao.valor)}`);
  logInfo(`Forma: ${doacao.formaPagamento}`);
  logInfo(`Finalidade: ${doacao.finalidade}`);
  
  // Doações não geram documento fiscal para quem recebe
  // Apenas recibo para o doador (se solicitado)
  
  logInfo('');
  logSuccess('Doação não requer emissão de documento fiscal');
  logInfo('Gerar recibo de doação para o doador (opcional)');
  
  // Contabilização conforme ITG 2002 (R1)
  logInfo('');
  logInfo('Contabilização (ITG 2002 R1 - Terceiro Setor):');
  logInfo('  D - 1.1.2.001 Banco do Brasil ..... R$ 500,00');
  logInfo('  C - 6.1.1.001 Doações de PF ....... R$ 500,00');
  logInfo('');
  logInfo('Centro de Custo: CC-001 Manutenção');
  logInfo('Fundo: Fundo Geral');
  
  return { sucesso: true, tipoDocumento: 'RECIBO_DOACAO' };
}

// ============================================================================
// CENÁRIO 4: VENDA PRESENCIAL CONSUMIDOR FINAL (NFC-e)
// ============================================================================

async function cenario4_VendaPresencialPF() {
  logSection('CENÁRIO 4: Venda Presencial Consumidor Final (Bazar)');
  
  const input: DecisaoFiscalInput = {
    tipoOperacao: 'MERCADORIA',
    emitente: {
      cpfCnpj: CENTRO_ESPIRITA.cnpj,
      uf: CENTRO_ESPIRITA.uf,
      codigoMunicipio: CENTRO_ESPIRITA.codigoMunicipio,
      inscricaoEstadual: '123456789012',
      regimeTributario: CENTRO_ESPIRITA.regimeTributario,
    },
    destinatario: {
      tipo: 'PF',
      isConsumidorFinal: true,
    },
    localVenda: 'PRESENCIAL',
    valorTotal: 75,
    mercadoria: {
      ncm: '49019900', // Livros
      cfop: '5102', // Venda de mercadoria
    },
  };
  
  logInfo(`Operação: Venda de livros no bazar`);
  logInfo(`Valor: ${formatarMoeda(input.valorTotal)}`);
  logInfo(`NCM: ${input.mercadoria?.ncm} (Livros)`);
  logInfo(`Local: Presencial`);
  
  try {
    const decisao = await decidirDocumentoFiscal(input);
    logSuccess(`Decisão: ${decisao.tipoDocumento}`);
    logInfo(`Motivo: ${decisao.motivo}`);
    logInfo(`Modelo: ${decisao.tipoDocumento === 'NFCE' ? '65' : '55'}`);
    
    // Contabilização
    logInfo('');
    logInfo('Contabilização:');
    logInfo('  D - 1.1.1.001 Caixa .............. R$ 75,00');
    logInfo('  C - 6.4.1.001 Venda Bazar ........ R$ 75,00');
    logInfo('  D - 7.4.1.001 CMV Bazar .......... R$ 30,00');
    logInfo('  C - 1.3.1.001 Estoque Bazar ...... R$ 30,00');
    
    return { sucesso: true, tipoDocumento: decisao.tipoDocumento };
  } catch (error: any) {
    logError(`Erro: ${error.message}`);
    return { sucesso: false, erro: error.message };
  }
}

// ============================================================================
// CENÁRIO 5: VENDA PARA PJ (NF-e)
// ============================================================================

async function cenario5_VendaPJ() {
  logSection('CENÁRIO 5: Venda de Mercadoria para PJ');
  
  const input: DecisaoFiscalInput = {
    tipoOperacao: 'MERCADORIA',
    emitente: {
      cpfCnpj: CENTRO_ESPIRITA.cnpj,
      uf: CENTRO_ESPIRITA.uf,
      codigoMunicipio: CENTRO_ESPIRITA.codigoMunicipio,
      inscricaoEstadual: '123456789012',
      regimeTributario: CENTRO_ESPIRITA.regimeTributario,
    },
    destinatario: {
      tipo: 'PJ',
      cpfCnpj: '11222333000181',
      uf: 'SP',
      codigoMunicipio: '3509502', // Campinas
      isConsumidorFinal: false,
    },
    localVenda: 'INTERNET',
    valorTotal: 2500,
    mercadoria: {
      ncm: '84715010', // Equipamentos de processamento de dados
      cfop: '5102',
    },
  };
  
  logInfo(`Operação: Venda de equipamentos`);
  logInfo(`Valor: ${formatarMoeda(input.valorTotal)}`);
  logInfo(`Destinatário: CNPJ ${input.destinatario.cpfCnpj}`);
  logInfo(`Local: Internet (não-presencial)`);
  
  // Validar CNPJ
  const cnpjValido = validarCnpj(input.destinatario.cpfCnpj!);
  if (cnpjValido) {
    logSuccess('CNPJ do destinatário válido');
  } else {
    logError('CNPJ do destinatário inválido');
  }
  
  try {
    const decisao = await decidirDocumentoFiscal(input);
    logSuccess(`Decisão: ${decisao.tipoDocumento}`);
    logInfo(`Motivo: ${decisao.motivo}`);
    
    // Contabilização
    logInfo('');
    logInfo('Contabilização:');
    logInfo('  D - 1.2.1.001 Clientes ........... R$ 2.500,00');
    logInfo('  C - 6.4.2.001 Venda Mercadorias .. R$ 2.500,00');
    logInfo('  D - 7.4.2.001 CMV Mercadorias .... R$ 1.500,00');
    logInfo('  C - 1.3.2.001 Estoque Mercadorias  R$ 1.500,00');
    logInfo('  D - 7.6.4.001 ICMS sobre Vendas .. R$ 450,00');
    logInfo('  C - 3.2.2.001 ICMS a Recolher .... R$ 450,00');
    
    return { sucesso: true, tipoDocumento: decisao.tipoDocumento };
  } catch (error: any) {
    logError(`Erro: ${error.message}`);
    return { sucesso: false, erro: error.message };
  }
}

// ============================================================================
// CENÁRIO 6: CANCELAMENTO DE NFS-e
// ============================================================================

async function cenario6_CancelamentoNFSe() {
  logSection('CENÁRIO 6: Cancelamento de NFS-e');
  
  const nfseOriginal = {
    numero: '12345',
    codigoVerificacao: 'ABC123',
    dataEmissao: new Date('2024-12-01'),
    valor: 1000,
    estado: EstadoDocumentoFiscal.AUTORIZADO,
  };
  
  logInfo(`NFS-e Original: ${nfseOriginal.numero}`);
  logInfo(`Valor: ${formatarMoeda(nfseOriginal.valor)}`);
  logInfo(`Estado atual: ${nfseOriginal.estado}`);
  
  // Simular máquina de estados
  const maquina = new MaquinaEstadoFiscal(EstadoDocumentoFiscal.AUTORIZADO);
  
  // Verificar se pode cancelar
  const podeCanc = maquina.podeTransitar(EstadoDocumentoFiscal.CANCELADO);
  logInfo(`Pode cancelar: ${podeCanc ? 'Sim' : 'Não'}`);
  
  if (podeCanc) {
    maquina.transitar(EstadoDocumentoFiscal.CANCELADO, 'Cancelamento solicitado pelo cliente');
    logSuccess(`Transição executada: ${maquina.estadoAtual}`);
    
    // Contabilização do estorno
    logInfo('');
    logInfo('Contabilização do Estorno:');
    logInfo('  D - 6.1.3.001 Receita de Serviços R$ 1.000,00');
    logInfo('  C - 1.1.2.001 Banco do Brasil ... R$ 1.000,00');
    logInfo('  D - 3.2.1.001 ISS a Recolher ..... R$ 50,00');
    logInfo('  C - 7.6.3.001 ISS sobre Serviços . R$ 50,00');
    
    return { sucesso: true, estadoFinal: maquina.estadoAtual };
  } else {
    logError('Transição de cancelamento não permitida');
    return { sucesso: false, erro: 'Transição não permitida' };
  }
}

// ============================================================================
// CENÁRIO 7: FECHAMENTO CONTÁBIL MENSAL
// ============================================================================

async function cenario7_FechamentoMensal() {
  logSection('CENÁRIO 7: Fechamento Contábil Mensal (Novembro/2024)');
  
  const periodo = {
    competencia: '2024-11',
    dataInicio: new Date('2024-11-01'),
    dataFim: new Date('2024-11-30'),
  };
  
  logInfo(`Período: ${periodo.competencia}`);
  logInfo(`Início: ${periodo.dataInicio.toLocaleDateString('pt-BR')}`);
  logInfo(`Fim: ${periodo.dataFim.toLocaleDateString('pt-BR')}`);
  
  // Simular totais do período
  const totais = {
    // Receitas
    doacoesPF: 15000,
    doacoesPJ: 5000,
    servicosPrestados: 8000,
    vendasBazar: 2500,
    rendimentosFinanceiros: 350,
    
    // Despesas
    pessoal: 12000,
    utilidades: 1800,
    manutencao: 2500,
    materiais: 800,
    tributosRecolhidos: 400,
    tarifasBancarias: 150,
  };
  
  const totalReceitas = totais.doacoesPF + totais.doacoesPJ + totais.servicosPrestados + totais.vendasBazar + totais.rendimentosFinanceiros;
  const totalDespesas = totais.pessoal + totais.utilidades + totais.manutencao + totais.materiais + totais.tributosRecolhidos + totais.tarifasBancarias;
  const resultado = totalReceitas - totalDespesas;
  
  logInfo('');
  logInfo('DEMONSTRAÇÃO DO RESULTADO DO PERÍODO:');
  logInfo('─'.repeat(50));
  logInfo('RECEITAS:');
  logInfo(`  Doações Pessoa Física ............ ${formatarMoeda(totais.doacoesPF)}`);
  logInfo(`  Doações Pessoa Jurídica .......... ${formatarMoeda(totais.doacoesPJ)}`);
  logInfo(`  Serviços Prestados ............... ${formatarMoeda(totais.servicosPrestados)}`);
  logInfo(`  Vendas Bazar ..................... ${formatarMoeda(totais.vendasBazar)}`);
  logInfo(`  Rendimentos Financeiros .......... ${formatarMoeda(totais.rendimentosFinanceiros)}`);
  logInfo(`  TOTAL RECEITAS ................... ${formatarMoeda(totalReceitas)}`);
  logInfo('');
  logInfo('DESPESAS:');
  logInfo(`  Pessoal .......................... ${formatarMoeda(totais.pessoal)}`);
  logInfo(`  Utilidades ....................... ${formatarMoeda(totais.utilidades)}`);
  logInfo(`  Manutenção ....................... ${formatarMoeda(totais.manutencao)}`);
  logInfo(`  Materiais ........................ ${formatarMoeda(totais.materiais)}`);
  logInfo(`  Tributos Recolhidos .............. ${formatarMoeda(totais.tributosRecolhidos)}`);
  logInfo(`  Tarifas Bancárias ................ ${formatarMoeda(totais.tarifasBancarias)}`);
  logInfo(`  TOTAL DESPESAS ................... ${formatarMoeda(totalDespesas)}`);
  logInfo('─'.repeat(50));
  
  if (resultado >= 0) {
    logSuccess(`SUPERÁVIT DO PERÍODO: ${formatarMoeda(resultado)}`);
  } else {
    logError(`DÉFICIT DO PERÍODO: ${formatarMoeda(resultado)}`);
  }
  
  logInfo('');
  logInfo('Lançamento de fechamento (ITG 2002 R1):');
  if (resultado >= 0) {
    logInfo(`  D - 6.9.9.001 Apuração Resultado .. ${formatarMoeda(resultado)}`);
    logInfo(`  C - 5.2.1.001 Superávit Exercício . ${formatarMoeda(resultado)}`);
  } else {
    logInfo(`  D - 5.2.2.001 Déficit Exercício ... ${formatarMoeda(Math.abs(resultado))}`);
    logInfo(`  C - 7.9.9.001 Apuração Resultado .. ${formatarMoeda(Math.abs(resultado))}`);
  }
  
  logSuccess('Período fechado com sucesso');
  
  return { sucesso: true, superavit: resultado };
}

// ============================================================================
// EXECUÇÃO PRINCIPAL
// ============================================================================

async function main() {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║     SIMULADOR DE CENÁRIOS CONTÁBEIS - MOTOR FISCAL CENTROOS         ║');
  console.log('║                                                                      ║');
  console.log('║  Centro Espírita Amor e Caridade - CNPJ: 12.345.678/0001-90          ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');
  
  const resultados: { cenario: string; sucesso: boolean; detalhes: any }[] = [];
  
  // Executar cenários
  resultados.push({ cenario: '1. Serviço PJ', ...await cenario1_ServicoPJ() });
  resultados.push({ cenario: '2. Serviço PF', ...await cenario2_ServicoPF() });
  resultados.push({ cenario: '3. Doação', ...await cenario3_DoacaoRecebida() });
  resultados.push({ cenario: '4. Venda Presencial PF', ...await cenario4_VendaPresencialPF() });
  resultados.push({ cenario: '5. Venda PJ', ...await cenario5_VendaPJ() });
  resultados.push({ cenario: '6. Cancelamento', ...await cenario6_CancelamentoNFSe() });
  resultados.push({ cenario: '7. Fechamento', ...await cenario7_FechamentoMensal() });
  
  // Resumo final
  logSection('RESUMO DA SIMULAÇÃO');
  
  const sucessos = resultados.filter(r => r.sucesso).length;
  const falhas = resultados.filter(r => !r.sucesso).length;
  
  resultados.forEach(r => {
    const status = r.sucesso ? '✅' : '❌';
    console.log(`  ${status} ${r.cenario}`);
  });
  
  console.log('');
  console.log(`  Total: ${resultados.length} cenários`);
  console.log(`  Sucesso: ${sucessos}`);
  console.log(`  Falhas: ${falhas}`);
  console.log('');
  
  if (falhas === 0) {
    console.log('  🎉 TODOS OS CENÁRIOS EXECUTADOS COM SUCESSO!');
  } else {
    console.log(`  ⚠️  ${falhas} cenário(s) com falha. Verificar logs acima.`);
  }
  
  console.log('');
}

main().catch(console.error);


