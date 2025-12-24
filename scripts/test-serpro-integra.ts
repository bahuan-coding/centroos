/**
 * Script de Teste - Integra Contador SERPRO
 * 
 * Testa a autenticação e consulta de situação fiscal (SITFIS)
 * 
 * Uso:
 *   npx tsx scripts/test-serpro-integra.ts
 * 
 * Variáveis de ambiente necessárias:
 *   SERPRO_CONSUMER_KEY
 *   SERPRO_CONSUMER_SECRET
 *   SERPRO_ENVIRONMENT (opcional, default: production)
 */

import {
  getAccessToken,
  getTokenInfo,
  consultarSituacaoFiscal,
  solicitarSituacaoFiscal,
  getSerproConfig,
} from '../server/integrations/serpro';

// CNPJ da Paycubed
const CNPJ_PAYCUBED = '63552022000184';

async function main() {
  console.log('='.repeat(60));
  console.log('Teste de Integração - SERPRO Integra Contador');
  console.log('='.repeat(60));
  console.log();

  // Verificar configuração
  try {
    const config = getSerproConfig();
    console.log('✅ Configuração carregada');
    console.log(`   Consumer Key: ${config.consumerKey.substring(0, 10)}...`);
    console.log(`   Environment: ${config.environment}`);
    console.log();
  } catch (error) {
    console.error('❌ Erro na configuração:', (error as Error).message);
    console.log();
    console.log('Configure as variáveis de ambiente:');
    console.log('  export SERPRO_CONSUMER_KEY=hn19_Qt0XfUS5XWnt65MlW_CAjYa');
    console.log('  export SERPRO_CONSUMER_SECRET=35kFUZN2pISbD8IaXEDxFoGFK8ka');
    process.exit(1);
  }

  // Teste 1: Autenticação
  console.log('-'.repeat(60));
  console.log('Teste 1: Autenticação OAuth');
  console.log('-'.repeat(60));

  try {
    const token = await getAccessToken();
    console.log('✅ Token obtido com sucesso');
    console.log(`   Tipo: ${token.tokenType}`);
    console.log(`   Expira em: ${token.expiresIn} segundos`);
    console.log(`   Access Token: ${token.accessToken.substring(0, 30)}...`);
    console.log();

    // Verificar cache
    const tokenInfo = getTokenInfo();
    console.log(`   Cache ativo: ${tokenInfo.cached}`);
    if (tokenInfo.expiresIn) {
      console.log(`   Tempo restante: ${tokenInfo.expiresIn}s`);
    }
    console.log();
  } catch (error) {
    console.error('❌ Erro na autenticação:', (error as Error).message);
    console.log();
    console.log('Verifique se as credenciais estão corretas.');
    process.exit(1);
  }

  // Teste 2: Consulta SITFIS
  console.log('-'.repeat(60));
  console.log('Teste 2: Consulta Situação Fiscal (SITFIS)');
  console.log('-'.repeat(60));
  console.log(`CNPJ: ${CNPJ_PAYCUBED}`);
  console.log();

  try {
    // Primeiro apenas solicitar (para ver o protocolo)
    console.log('Solicitando relatório...');
    const solicitacao = await solicitarSituacaoFiscal(CNPJ_PAYCUBED);
    console.log(`✅ Solicitação criada`);
    console.log(`   Protocolo: ${solicitacao.protocolo}`);
    console.log(`   Status: ${solicitacao.status}`);
    if (solicitacao.mensagem) {
      console.log(`   Mensagem: ${solicitacao.mensagem}`);
    }
    console.log();

    // Aguardar e obter resultado completo
    console.log('Aguardando processamento...');
    const resultado = await consultarSituacaoFiscal(CNPJ_PAYCUBED);

    console.log();
    console.log(`Status: ${resultado.status}`);
    
    if (resultado.status === 'DISPONIVEL') {
      console.log('✅ Relatório disponível!');
      if (resultado.relatorio) {
        console.log(`   Formato: ${resultado.formato}`);
        console.log(`   Tamanho: ${resultado.relatorio.length} bytes (base64)`);
        console.log(`   Data: ${resultado.dataEmissao}`);
      }
    } else if (resultado.status === 'PROCESSANDO') {
      console.log('⏳ Ainda processando...');
      console.log(`   ${resultado.mensagem}`);
    } else {
      console.log(`⚠️  Status: ${resultado.status}`);
      console.log(`   ${resultado.mensagem}`);
    }
  } catch (error) {
    console.error('❌ Erro na consulta SITFIS:', (error as Error).message);
    console.log();
    console.log('━'.repeat(60));
    console.log('REQUISITOS PARA USAR O SITFIS:');
    console.log('━'.repeat(60));
    console.log();
    console.log('1. PROCURAÇÃO ELETRÔNICA:');
    console.log('   O contribuinte deve cadastrar procuração no e-CAC');
    console.log('   delegando poderes à Paycubed (CNPJ 63.552.022/0001-84)');
    console.log('   para acessar o serviço SITFIS.');
    console.log();
    console.log('2. OU AUTENTICAPROCURADOR:');
    console.log('   Enviar XML assinado digitalmente com certificado e-CNPJ');
    console.log('   através do endpoint /autenticaprocurador');
    console.log();
    console.log('Documentação: https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/');
  }

  console.log();
  console.log('='.repeat(60));
  console.log('Teste finalizado');
  console.log('='.repeat(60));
}

main().catch(console.error);

