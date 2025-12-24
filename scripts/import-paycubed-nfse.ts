/**
 * Script para importar NFSe da Paycubed
 * 
 * Usa o certificado cadastrado para buscar notas fiscais da API Nacional
 * e popula o banco de dados com dados apenas da Paycubed.
 * 
 * Uso: npx tsx scripts/import-paycubed-nfse.ts [dataInicio] [dataFim]
 */

import { importNfseForOrganization, validateCertificate } from '../server/integrations/fiscal';

const PAYCUBED_ORG_ID = '4408ed21-65d4-44b9-95fa-b537851e9b99';
const PAYCUBED_CNPJ = '63552022000184';

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  Importação de NFSe - Paycubed Stack Financeiro');
  console.log('═══════════════════════════════════════════════════\n');

  // Validar certificado
  console.log('[1/3] Validando certificado digital...');
  const certValidation = await validateCertificate();
  
  if (!certValidation.valid) {
    console.error(`❌ Erro: ${certValidation.error}`);
    process.exit(1);
  }
  
  console.log(`✓ Certificado válido`);
  console.log(`  CNPJ: ${certValidation.info?.cnpj}`);
  console.log(`  Razão Social: ${certValidation.info?.razaoSocial}`);
  console.log(`  Validade: ${certValidation.info?.validadeFim} (${certValidation.info?.daysUntilExpiry} dias)\n`);

  // Determinar período de importação
  const args = process.argv.slice(2);
  let dataInicio: string;
  let dataFim: string;
  
  if (args.length >= 2) {
    dataInicio = args[0];
    dataFim = args[1];
  } else {
    // Padrão: últimos 12 meses
    const hoje = new Date();
    const umAnoAtras = new Date(hoje);
    umAnoAtras.setFullYear(umAnoAtras.getFullYear() - 1);
    
    dataInicio = umAnoAtras.toISOString().split('T')[0];
    dataFim = hoje.toISOString().split('T')[0];
  }
  
  console.log(`[2/3] Período de importação: ${dataInicio} a ${dataFim}\n`);

  // Executar importação
  console.log('[3/3] Iniciando importação de NFSe...');
  console.log(`  Organização: Paycubed (${PAYCUBED_ORG_ID})`);
  console.log(`  CNPJ Prestador: ${PAYCUBED_CNPJ}\n`);
  
  try {
    const result = await importNfseForOrganization(
      PAYCUBED_ORG_ID,
      PAYCUBED_CNPJ,
      dataInicio,
      dataFim
    );
    
    console.log('\n═══════════════════════════════════════════════════');
    console.log('  RESULTADO DA IMPORTAÇÃO');
    console.log('═══════════════════════════════════════════════════');
    console.log(`  ✓ Notas importadas: ${result.imported}`);
    console.log(`  ↺ Notas atualizadas: ${result.updated}`);
    console.log(`  ─ Notas ignoradas (sem alteração): ${result.skipped}`);
    
    if (result.errors.length > 0) {
      console.log(`\n  ⚠ Erros (${result.errors.length}):`);
      result.errors.slice(0, 10).forEach(e => console.log(`    - ${e}`));
      if (result.errors.length > 10) {
        console.log(`    ... e mais ${result.errors.length - 10} erros`);
      }
    }
    
    console.log('═══════════════════════════════════════════════════\n');
    
    if (result.success) {
      console.log('✓ Importação concluída com sucesso!');
    } else {
      console.log('⚠ Importação concluída com erros.');
      process.exit(1);
    }
  } catch (error: any) {
    console.error(`\n❌ Erro fatal: ${error.message}`);
    console.error('\nNota: A API NFSe Nacional pode não estar disponível em ambiente de homologação.');
    console.error('Verifique a variável NFSE_ENVIRONMENT (production/homologation).\n');
    process.exit(1);
  }
}

main().catch(console.error);


