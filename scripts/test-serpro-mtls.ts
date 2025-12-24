/**
 * Teste de Integração SERPRO com mTLS (Certificado Digital)
 * 
 * Este script testa a consulta SITFIS usando autenticação mTLS
 * com o certificado PFX da Paycubed armazenado no banco de dados.
 * 
 * Execução: npx tsx scripts/test-serpro-mtls.ts
 */

// Variáveis de ambiente já são carregadas pelo processo pai ou definidas inline

// ============================================================================
// CONFIGURAÇÃO
// ============================================================================

// CNPJ da Paycubed para teste
const PAYCUBED_CNPJ = process.env.PAYCUBED_CNPJ || '63552022000184';

// Cores para output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

function log(message: string, type: 'info' | 'success' | 'error' | 'warn' = 'info') {
  const prefix = {
    info: `${colors.cyan}ℹ${colors.reset}`,
    success: `${colors.green}✅${colors.reset}`,
    error: `${colors.red}❌${colors.reset}`,
    warn: `${colors.yellow}⚠${colors.reset}`,
  };
  console.log(`${prefix[type]} ${message}`);
}

function section(title: string) {
  console.log(`\n${colors.cyan}${'═'.repeat(60)}${colors.reset}`);
  console.log(`${colors.cyan}${title}${colors.reset}`);
  console.log(`${colors.cyan}${'═'.repeat(60)}${colors.reset}\n`);
}

// ============================================================================
// TESTES
// ============================================================================

async function testMtlsConfiguration() {
  section('1. Verificando Configuração mTLS');
  
  const { testMtlsConnection, getMtlsCertificateInfo } = await import('../server/integrations/serpro');
  
  // Verificar certificado
  const certInfo = await getMtlsCertificateInfo();
  
  if (!certInfo.loaded) {
    log(`Certificado não encontrado: ${certInfo.error}`, 'error');
    console.log(`\n${colors.yellow}Dica: Verifique se o certificado PFX da Paycubed está`);
    console.log(`configurado em Configurações > Certificado Digital${colors.reset}\n`);
    return false;
  }
  
  log('Certificado encontrado:', 'success');
  console.log(`   CNPJ: ${certInfo.cnpj}`);
  console.log(`   Razão Social: ${certInfo.razaoSocial}`);
  console.log(`   Válido até: ${certInfo.validoAte}`);
  console.log(`   Dias restantes: ${certInfo.diasRestantes}`);
  console.log(`   Status: ${certInfo.isValid ? 'Válido' : 'EXPIRADO'}`);
  
  if (!certInfo.isValid) {
    log('Certificado expirado!', 'error');
    return false;
  }
  
  if (certInfo.diasRestantes && certInfo.diasRestantes < 30) {
    log(`Atenção: Certificado expira em ${certInfo.diasRestantes} dias`, 'warn');
  }
  
  // Testar conexão mTLS
  log('Testando conexão mTLS...', 'info');
  const connectionTest = await testMtlsConnection();
  
  if (connectionTest.success) {
    log('Conexão mTLS configurada corretamente', 'success');
    return true;
  } else {
    log(`Erro na conexão mTLS: ${connectionTest.error}`, 'error');
    return false;
  }
}

async function testOAuthAuthentication() {
  section('2. Testando Autenticação OAuth');
  
  const { getAccessToken, getTokenInfo } = await import('../server/integrations/serpro');
  
  try {
    log('Obtendo token OAuth...', 'info');
    const token = await getAccessToken();
    
    log('Token obtido com sucesso:', 'success');
    console.log(`   Tipo: ${token.tokenType}`);
    console.log(`   Expira em: ${token.expiresIn}s`);
    console.log(`   Token: ${token.accessToken.substring(0, 20)}...`);
    
    // Verificar cache
    const info = getTokenInfo();
    console.log(`   Em cache: ${info.cached}`);
    if (info.expiresIn) {
      console.log(`   Tempo restante: ${info.expiresIn}s`);
    }
    
    return true;
  } catch (error: any) {
    log(`Erro na autenticação OAuth: ${error.message}`, 'error');
    console.log(`\n${colors.yellow}Verifique as variáveis de ambiente:`);
    console.log(`  - SERPRO_CONSUMER_KEY`);
    console.log(`  - SERPRO_CONSUMER_SECRET${colors.reset}\n`);
    return false;
  }
}

async function testSitfisWithMtls() {
  section('3. Testando SITFIS com mTLS');
  
  const { solicitarSituacaoFiscal } = await import('../server/integrations/serpro');
  
  log(`Consultando situação fiscal do CNPJ: ${PAYCUBED_CNPJ}`, 'info');
  log('Usando mTLS (certificado digital)', 'info');
  
  try {
    const resultado = await solicitarSituacaoFiscal(PAYCUBED_CNPJ, { useMtls: true });
    
    log('Solicitação enviada com sucesso:', 'success');
    console.log(`   Protocolo: ${resultado.protocolo}`);
    console.log(`   Status: ${resultado.status}`);
    if (resultado.mensagem) {
      console.log(`   Mensagem: ${resultado.mensagem}`);
    }
    if (resultado.dataHoraSolicitacao) {
      console.log(`   Data/Hora: ${resultado.dataHoraSolicitacao}`);
    }
    
    return resultado;
  } catch (error: any) {
    log(`Erro na consulta SITFIS: ${error.message}`, 'error');
    
    // Sugestões baseadas no erro
    if (error.message.includes('404') || error.message.includes('não disponível')) {
      console.log(`\n${colors.yellow}Possíveis causas:`);
      console.log(`  1. O serviço SITFIS não está incluído no contrato SERPRO`);
      console.log(`  2. O CNPJ consultado não tem autorização`);
      console.log(`  3. O ambiente (produção/demo) está incorreto${colors.reset}\n`);
    } else if (error.message.includes('403') || error.message.includes('negado')) {
      console.log(`\n${colors.yellow}Possíveis causas:`);
      console.log(`  1. Certificado não corresponde ao CNPJ consultado`);
      console.log(`  2. Procuração não cadastrada no e-CAC`);
      console.log(`  3. Certificado sem permissão para este serviço${colors.reset}\n`);
    } else if (error.message.includes('certificado') || error.message.includes('mTLS')) {
      console.log(`\n${colors.yellow}Possíveis causas:`);
      console.log(`  1. Certificado não carregado ou inválido`);
      console.log(`  2. Erro na conversão PFX para PEM`);
      console.log(`  3. Servidor SERPRO não aceitou o certificado${colors.reset}\n`);
    }
    
    return null;
  }
}

async function testSitfisWithoutMtls() {
  section('4. Testando SITFIS sem mTLS (apenas OAuth)');
  
  const { solicitarSituacaoFiscal } = await import('../server/integrations/serpro');
  
  log(`Consultando situação fiscal do CNPJ: ${PAYCUBED_CNPJ}`, 'info');
  log('Usando apenas OAuth (sem certificado)', 'info');
  
  try {
    const resultado = await solicitarSituacaoFiscal(PAYCUBED_CNPJ, { useMtls: false });
    
    log('Solicitação enviada com sucesso:', 'success');
    console.log(`   Protocolo: ${resultado.protocolo}`);
    console.log(`   Status: ${resultado.status}`);
    
    return resultado;
  } catch (error: any) {
    log(`Erro (esperado sem mTLS): ${error.message}`, 'warn');
    console.log(`${colors.dim}   Isso pode ser normal se o SERPRO exigir certificado${colors.reset}`);
    return null;
  }
}

// ============================================================================
// EXECUÇÃO PRINCIPAL
// ============================================================================

async function main() {
  console.clear();
  console.log(`\n${colors.cyan}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}║     TESTE DE INTEGRAÇÃO SERPRO - mTLS (Certificado Digital) ║${colors.reset}`);
  console.log(`${colors.cyan}╚════════════════════════════════════════════════════════════╝${colors.reset}\n`);
  
  console.log(`Data/Hora: ${new Date().toLocaleString('pt-BR')}`);
  console.log(`CNPJ Teste: ${PAYCUBED_CNPJ}`);
  console.log(`Ambiente: ${process.env.SERPRO_ENVIRONMENT || 'production'}`);
  console.log(`mTLS Habilitado: ${process.env.SERPRO_USE_MTLS !== 'false' ? 'Sim' : 'Não'}`);
  
  // Teste 1: Configuração mTLS
  const mtlsOk = await testMtlsConfiguration();
  if (!mtlsOk) {
    console.log(`\n${colors.red}Configuração mTLS falhou. Abortando testes.${colors.reset}\n`);
    process.exit(1);
  }
  
  // Teste 2: OAuth
  const oauthOk = await testOAuthAuthentication();
  if (!oauthOk) {
    console.log(`\n${colors.red}Autenticação OAuth falhou. Abortando testes.${colors.reset}\n`);
    process.exit(1);
  }
  
  // Teste 3: SITFIS com mTLS
  const sitfisResultMtls = await testSitfisWithMtls();
  
  // Teste 4: SITFIS sem mTLS (para comparação)
  const sitfisResultNoMtls = await testSitfisWithoutMtls();
  
  // Resumo
  section('RESUMO DOS TESTES');
  
  console.log('Resultados:');
  console.log(`   ${mtlsOk ? '✅' : '❌'} Configuração mTLS`);
  console.log(`   ${oauthOk ? '✅' : '❌'} Autenticação OAuth`);
  console.log(`   ${sitfisResultMtls ? '✅' : '❌'} SITFIS com mTLS`);
  console.log(`   ${sitfisResultNoMtls ? '✅' : '⚠️'} SITFIS sem mTLS`);
  
  if (sitfisResultMtls) {
    console.log(`\n${colors.green}Integração SERPRO com mTLS funcionando corretamente!${colors.reset}\n`);
  } else if (sitfisResultNoMtls) {
    console.log(`\n${colors.yellow}SITFIS funcionou sem mTLS. Verifique se certificado é necessário.${colors.reset}\n`);
  } else {
    console.log(`\n${colors.red}SITFIS não funcionou. Verifique contrato SERPRO e configurações.${colors.reset}\n`);
  }
}

main().catch((error) => {
  console.error(`\n${colors.red}Erro fatal:${colors.reset}`, error.message);
  process.exit(1);
});

