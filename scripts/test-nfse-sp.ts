/**
 * Teste de Integração - NFSe Paulistana
 * 
 * Validates the real integration with the São Paulo NFSe API.
 * Uses the new endpoint (nfews.prefeitura.sp.gov.br) and correct SOAP actions.
 * 
 * Per manual NFe_Web_Service-4.md v3.3.4
 * 
 * Execution: npx tsx scripts/test-nfse-sp.ts
 */
import { validarConexaoSP, consultarNFSePeriodo } from '../server/integrations/fiscal/nfse-sp';
import { validateCertificate, loadActiveCertificate } from '../server/integrations/fiscal/certificates';
import { signNFSeXml, validateSignature } from '../server/integrations/fiscal/xmldsig';
import { buildSOAPEnvelope, formatDateForApi, cleanCnpj, soapRequest } from '../server/integrations/fiscal/soap-client';

// Endpoints per manual section 4.1
const ENDPOINTS = {
  production: 'https://nfews.prefeitura.sp.gov.br/lotenfe.asmx',
  legacy: 'https://nfe.prefeitura.sp.gov.br/ws/lotenfe.asmx',
};

function getEndpoint(): string {
  const useLegacy = process.env.NFSE_SP_USE_LEGACY_ENDPOINT === 'true';
  return useLegacy ? ENDPOINTS.legacy : ENDPOINTS.production;
}

async function main() {
  console.log('═'.repeat(70));
  console.log('🏛️  TESTE DE INTEGRAÇÃO - NOTA FISCAL PAULISTANA');
  console.log('═'.repeat(70));
  console.log(`\n📅 Data/Hora: ${new Date().toISOString()}`);
  console.log(`📍 Endpoint: ${getEndpoint()}`);
  console.log('');

  // Step 1: Check environment configuration
  console.log('┌─────────────────────────────────────────────────────────────────┐');
  console.log('│ PASSO 1: Verificando configuração                              │');
  console.log('└─────────────────────────────────────────────────────────────────┘\n');
  
  const config = {
    cnpj: process.env.NFSE_SP_CNPJ || '(não configurado)',
    ccm: process.env.NFSE_SP_CCM || '(não configurado)',
    senhaWeb: process.env.NFSE_SP_SENHA_WEB ? '✓ configurada' : '(não configurado)',
    useLegacy: process.env.NFSE_SP_USE_LEGACY_ENDPOINT === 'true',
  };
  
  console.log(`   CNPJ:           ${config.cnpj}`);
  console.log(`   CCM:            ${config.ccm}`);
  console.log(`   Senha Web:      ${config.senhaWeb}`);
  console.log(`   Endpoint:       ${config.useLegacy ? 'Legacy (deprecated)' : 'Production (new)'}`);
  console.log('');

  // Step 2: Verify digital certificate
  console.log('┌─────────────────────────────────────────────────────────────────┐');
  console.log('│ PASSO 2: Verificando certificado digital                       │');
  console.log('└─────────────────────────────────────────────────────────────────┘\n');
  
  const certValidation = await validateCertificate();
  
  if (!certValidation.valid) {
    console.log(`   ❌ ${certValidation.error}`);
    console.log('\n   Configure um certificado digital para continuar.');
    console.log('   Acesse: Configurações > Certificado Digital no sistema.\n');
    process.exit(1);
  }
  
  const certInfo = certValidation.info!;
  console.log(`   ✅ Certificado válido`);
  console.log(`   📜 Razão Social: ${certInfo.razaoSocial}`);
  console.log(`   🔢 CNPJ: ${certInfo.cnpj}`);
  console.log(`   📅 Validade: ${certInfo.validadeInicio} a ${certInfo.validadeFim}`);
  console.log(`   ⏳ Expira em: ${certInfo.daysUntilExpiry} dias`);
  console.log('');

  // Step 3: Validate API connection config
  console.log('┌─────────────────────────────────────────────────────────────────┐');
  console.log('│ PASSO 3: Validando configuração da API                         │');
  console.log('└─────────────────────────────────────────────────────────────────┘\n');
  
  const conexao = await validarConexaoSP();
  
  if (!conexao.sucesso) {
    console.log(`   ❌ ${conexao.mensagem}`);
    console.log(`   Ambiente: ${conexao.ambiente}\n`);
    process.exit(1);
  }
  
  console.log(`   ✅ ${conexao.mensagem}`);
  console.log(`   🌐 Ambiente: ${conexao.ambiente}`);
  console.log('');

  // Step 4: Test XMLDSig signing
  console.log('┌─────────────────────────────────────────────────────────────────┐');
  console.log('│ PASSO 4: Testando assinatura XMLDSig                           │');
  console.log('└─────────────────────────────────────────────────────────────────┘\n');
  
  const cert = await loadActiveCertificate();
  if (!cert) {
    console.log('   ❌ Erro ao carregar certificado');
    process.exit(1);
  }
  
  const cnpj = cleanCnpj(process.env.NFSE_SP_CNPJ || '');
  const ccm = (process.env.NFSE_SP_CCM || '').padStart(8, '0');
  const hoje = new Date();
  const mesPassado = new Date();
  mesPassado.setDate(hoje.getDate() - 30);
  const dataInicioStr = formatDateForApi(mesPassado);
  const dataFimStr = formatDateForApi(hoje);
  
  // Build XML per PedidoConsultaNFePeriodo_v01.xsd
  const pedido = `<PedidoConsultaNFePeriodo xmlns="http://www.prefeitura.sp.gov.br/nfe">` +
    `<Cabecalho Versao="1">` +
    `<CPFCNPJRemetente><CNPJ>${cnpj}</CNPJ></CPFCNPJRemetente>` +
    `<CPFCNPJ><CNPJ>${cnpj}</CNPJ></CPFCNPJ>` +
    `<Inscricao>${ccm}</Inscricao>` +
    `<dtInicio>${dataInicioStr}</dtInicio>` +
    `<dtFim>${dataFimStr}</dtFim>` +
    `<NumeroPagina>1</NumeroPagina>` +
    `</Cabecalho>` +
    `</PedidoConsultaNFePeriodo>`;
  
  console.log('   📄 XML Original (preview):');
  console.log(`      ${pedido.substring(0, 100)}...`);
  console.log('');
  
  console.log('   ✍️  Assinando XML...');
  const pedidoAssinado = signNFSeXml(pedido, { cert: cert.cert, privateKey: cert.privateKey }, 'PedidoConsultaNFePeriodo');
  
  // Validate signature locally
  const validation = validateSignature(pedidoAssinado);
  if (validation.valid) {
    console.log('   ✅ Assinatura válida localmente');
  } else {
    console.log('   ⚠️  Problemas na assinatura:', validation.errors);
  }
  console.log('');

  // Step 5: Test real API call
  console.log('┌─────────────────────────────────────────────────────────────────┐');
  console.log('│ PASSO 5: Chamada real à API (ConsultaNFeEmitidas)              │');
  console.log('└─────────────────────────────────────────────────────────────────┘\n');
  
  console.log(`   📅 Período: ${dataInicioStr} a ${dataFimStr}`);
  console.log(`   🌐 Endpoint: ${getEndpoint()}`);
  console.log(`   📤 SOAP Action: http://www.prefeitura.sp.gov.br/nfe/ws/consultaNFeEmitidas`);
  console.log('');
  
  try {
    // Build SOAP envelope per manual section 4.3
    const envelope = buildSOAPEnvelope(`
      <ns:ConsultaNFeEmitidasRequest>
        <ns:VersaoSchema>1</ns:VersaoSchema>
        <ns:MensagemXML><![CDATA[${pedidoAssinado}]]></ns:MensagemXML>
      </ns:ConsultaNFeEmitidasRequest>
    `);
    
    console.log('   📤 Enviando requisição SOAP...');
    
    const response = await soapRequest({
      url: getEndpoint(),
      action: 'http://www.prefeitura.sp.gov.br/nfe/ws/consultaNFeEmitidas',
      body: envelope,
      useCertificate: true,
    });
    
    console.log(`   📥 HTTP Status: ${response.httpStatus || 'N/A'}`);
    console.log(`   📥 Success: ${response.success}`);
    
    if (response.rawXml) {
      // Preview of response (first 500 chars)
      const preview = response.rawXml.substring(0, 500);
      console.log('');
      console.log('   📥 Resposta (preview):');
      console.log('   ─'.repeat(35));
      console.log(preview);
      if (response.rawXml.length > 500) {
        console.log('   ...(truncated)');
      }
    }
    
    if (response.error) {
      console.log('');
      console.log(`   ⚠️  Erro: ${response.error}`);
    }
    
    if (response.success && response.data) {
      console.log('');
      console.log('   ✅ Requisição processada com sucesso!');
      
      // Check for business errors in response
      const retorno = response.data?.ConsultaNFeEmitidasResponse?.RetornoXML;
      if (retorno?.Erro) {
        const erros = Array.isArray(retorno.Erro) ? retorno.Erro : [retorno.Erro];
        console.log('   ⚠️  Erros de negócio:');
        erros.forEach((e: any) => {
          console.log(`      - [${e.Codigo}] ${e.Descricao || e.Mensagem || 'Erro desconhecido'}`);
        });
      } else {
        console.log('   📋 Nenhum erro de negócio detectado');
      }
    }
  } catch (error: any) {
    console.log(`   ❌ Erro: ${error.message}`);
    if (error.stack) {
      console.log('   Stack:', error.stack.split('\n').slice(0, 3).join('\n   '));
    }
  }

  // Step 6: Test using the high-level API
  console.log('');
  console.log('┌─────────────────────────────────────────────────────────────────┐');
  console.log('│ PASSO 6: Teste via API de alto nível                           │');
  console.log('└─────────────────────────────────────────────────────────────────┘\n');
  
  try {
    console.log('   📤 Chamando consultarNFSePeriodo()...');
    const resultado = await consultarNFSePeriodo(mesPassado, hoje, 1);
    
    if (resultado.sucesso) {
      console.log(`   ✅ Consulta bem-sucedida`);
      console.log(`   📊 Total de notas encontradas: ${resultado.total}`);
      if (resultado.notas.length > 0) {
        console.log('   📋 Primeiras notas:');
        resultado.notas.slice(0, 3).forEach((nota, i) => {
          console.log(`      ${i + 1}. NF-e ${nota.numeroNFe} - R$ ${nota.valorServicos.toFixed(2)} - ${nota.dataEmissao}`);
        });
      }
    } else {
      console.log(`   ⚠️  Erro na consulta: ${resultado.mensagemErro}`);
    }
  } catch (error: any) {
    console.log(`   ❌ Erro: ${error.message}`);
  }
  
  console.log('');
  console.log('═'.repeat(70));
  console.log('✅ Teste de integração concluído');
  console.log('═'.repeat(70));
  console.log('');
}

main().catch((error) => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});

