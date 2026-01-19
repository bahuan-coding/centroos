/**
 * Teste de Emissão de NFS-e - Nota Fiscal Paulistana
 * 
 * Emite uma NFS-e de teste de R$ 10,00 para o CNPJ 53.854.987/0001-78
 * 
 * Execution: npx tsx scripts/emitir-nfse-teste.ts
 */
import { emitirRPS, validarConexaoSP, type EmissaoRPSParams } from '../server/integrations/fiscal/nfse-sp';
import { validateCertificate } from '../server/integrations/fiscal/certificates';

// Dados da nota de teste
// Nota: Usar data de ontem para evitar erro de data futura (timezone)
const ontem = new Date();
ontem.setDate(ontem.getDate() - 1);

const DADOS_TESTE: EmissaoRPSParams = {
  serieRPS: 'NF',
  numeroRPS: 2, // Número sequencial - incrementado (RPS 1 já foi usado)
  dataEmissao: ontem, // Usar ontem para evitar erro de timezone
  tributacao: 'T', // T = Tributado em SP (usar T ao invés de A para evitar erro de GBF)
  valorServicos: 10.00,
  valorDeducoes: 0,
  codigoServico: '02496', // Serviços de coleta e entrega (código válido em SP)
  aliquota: 5.0, // 5% alíquota padrão ISS SP
  issRetido: false,
  discriminacao: 'Prestacao de servicos conforme contrato',
  tomador: {
    cpfCnpj: '53854987000178',
    razaoSocial: 'EMPRESA TOMADORA LTDA',
    // Para CNPJ fora de SP, é necessário informar endereço completo
    endereco: {
      tipoLogradouro: 'RUA',
      logradouro: 'Exemplo',
      numeroEndereco: '123',
      bairro: 'Centro',
      cidade: 3550308, // São Paulo
      uf: 'SP',
      cep: 1310100,
    },
  },
};

async function main() {
  console.log('═'.repeat(70));
  console.log('🧾 TESTE DE EMISSÃO - NOTA FISCAL PAULISTANA');
  console.log('═'.repeat(70));
  console.log(`\n📅 Data/Hora: ${new Date().toISOString()}`);
  console.log('');

  // Step 1: Verify configuration
  console.log('┌─────────────────────────────────────────────────────────────────┐');
  console.log('│ PASSO 1: Verificando configuração                              │');
  console.log('└─────────────────────────────────────────────────────────────────┘\n');
  
  const conexao = await validarConexaoSP();
  if (!conexao.sucesso) {
    console.log(`   ❌ ${conexao.mensagem}`);
    process.exit(1);
  }
  console.log(`   ✅ ${conexao.mensagem}`);
  console.log('');

  // Step 2: Verify certificate
  console.log('┌─────────────────────────────────────────────────────────────────┐');
  console.log('│ PASSO 2: Verificando certificado digital                       │');
  console.log('└─────────────────────────────────────────────────────────────────┘\n');
  
  const certValidation = await validateCertificate();
  if (!certValidation.valid) {
    console.log(`   ❌ ${certValidation.error}`);
    process.exit(1);
  }
  console.log(`   ✅ Certificado válido`);
  console.log(`   📜 ${certValidation.info?.razaoSocial}`);
  console.log(`   ⏳ Expira em: ${certValidation.info?.daysUntilExpiry} dias`);
  console.log('');

  // Step 3: Show invoice data
  console.log('┌─────────────────────────────────────────────────────────────────┐');
  console.log('│ PASSO 3: Dados da NFS-e a emitir                               │');
  console.log('└─────────────────────────────────────────────────────────────────┘\n');
  
  console.log(`   📋 Série/Número RPS: ${DADOS_TESTE.serieRPS}/${DADOS_TESTE.numeroRPS}`);
  console.log(`   📅 Data Emissão: ${DADOS_TESTE.dataEmissao.toISOString().split('T')[0]}`);
  console.log(`   💰 Valor: R$ ${DADOS_TESTE.valorServicos.toFixed(2)}`);
  console.log(`   📊 Tributação: ${DADOS_TESTE.tributacao} (${DADOS_TESTE.tributacao === 'T' ? 'Tributado em SP' : DADOS_TESTE.tributacao === 'A' ? 'Isento' : DADOS_TESTE.tributacao})`);
  console.log(`   🔢 Código Serviço: ${DADOS_TESTE.codigoServico}`);
  console.log(`   📝 Descrição: ${DADOS_TESTE.discriminacao}`);
  console.log(`   🏢 CNPJ Tomador: ${formatCnpj(DADOS_TESTE.tomador.cpfCnpj)}`);
  console.log('');

  // Step 4: Confirm before emission
  console.log('┌─────────────────────────────────────────────────────────────────┐');
  console.log('│ PASSO 4: Emitindo NFS-e                                        │');
  console.log('└─────────────────────────────────────────────────────────────────┘\n');
  
  console.log('   ⚠️  ATENÇÃO: Esta é uma operação REAL em produção!');
  console.log('   📤 Enviando RPS para conversão em NFS-e...');
  console.log('');
  
  try {
    const resultado = await emitirRPS(DADOS_TESTE);
    
    if (resultado.sucesso) {
      console.log('   ╔═══════════════════════════════════════════════════════════╗');
      console.log('   ║              ✅ NFS-e EMITIDA COM SUCESSO!                ║');
      console.log('   ╚═══════════════════════════════════════════════════════════╝');
      console.log('');
      console.log(`   📋 Número NFS-e: ${resultado.numeroNFe}`);
      console.log(`   🔐 Código Verificação: ${resultado.codigoVerificacao}`);
      console.log(`   📅 Data Emissão: ${resultado.dataEmissaoNFe}`);
      console.log('');
      console.log(`   🔗 Link para consulta:`);
      console.log(`      https://nfe.prefeitura.sp.gov.br/verificacao.aspx`);
      console.log(`      Código: ${resultado.codigoVerificacao}`);
    } else {
      console.log('   ╔═══════════════════════════════════════════════════════════╗');
      console.log('   ║              ❌ ERRO NA EMISSÃO                           ║');
      console.log('   ╚═══════════════════════════════════════════════════════════╝');
      console.log('');
      console.log(`   Mensagem: ${resultado.mensagem}`);
      if (resultado.chaveRPS) {
        console.log(`   Chave RPS: ${resultado.chaveRPS.inscricaoPrestador}/${resultado.chaveRPS.serieRPS}/${resultado.chaveRPS.numeroRPS}`);
      }
    }
  } catch (error: any) {
    console.log(`   ❌ Erro: ${error.message}`);
    if (error.stack) {
      console.log('');
      console.log('   Stack trace:');
      console.log(error.stack.split('\n').slice(0, 5).map((l: string) => '   ' + l).join('\n'));
    }
  }
  
  console.log('');
  console.log('═'.repeat(70));
  console.log('✅ Teste de emissão concluído');
  console.log('═'.repeat(70));
  console.log('');
}

function formatCnpj(cnpj: string): string {
  const clean = cnpj.replace(/\D/g, '');
  return clean.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

main().catch((error) => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});

