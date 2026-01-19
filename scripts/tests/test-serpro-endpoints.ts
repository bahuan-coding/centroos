/**
 * Script de Diagnóstico - Endpoints SERPRO
 * 
 * Testa diferentes variações de endpoints para descobrir a URL correta
 * 
 * Uso:
 *   npx tsx scripts/test-serpro-endpoints.ts
 */

import { getAuthHeaders, getSerproConfig } from '../server/integrations/serpro';

const CNPJ_PAYCUBED = '63552022000184';

// Possíveis variações de endpoints
const ENDPOINT_VARIATIONS = [
  // Padrão v1
  'https://gateway.apiserpro.serpro.gov.br/integra-contador/v1/sitfis/solicitar',
  'https://gateway.apiserpro.serpro.gov.br/integra-contador/api/v1/sitfis/solicitar',
  'https://gateway.apiserpro.serpro.gov.br/integra-contador-sitfis/v1/solicitar',
  'https://gateway.apiserpro.serpro.gov.br/integra-contador-sitfis/api/v1/solicitar',
  
  // Com SITFIS no path
  'https://gateway.apiserpro.serpro.gov.br/sitfis/v1/solicitar',
  'https://gateway.apiserpro.serpro.gov.br/sitfis/api/v1/solicitar',
  
  // Gerenciador
  'https://gateway.apiserpro.serpro.gov.br/integra-contador/v1/gerenciador/sitfis/solicitar',
  
  // Trial/Demo
  'https://gateway.apiserpro.serpro.gov.br/integra-contador-trial/v1/sitfis/solicitar',
  'https://gateway.apiserpro.serpro.gov.br/integra-contador-demonstracao/v1/sitfis/solicitar',
];

async function testEndpoint(baseUrl: string, headers: Record<string, string>): Promise<{ url: string; status: number; body: string }> {
  const url = `${baseUrl}/${CNPJ_PAYCUBED}`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
    });
    
    const body = await response.text();
    return { url, status: response.status, body: body.substring(0, 200) };
  } catch (error) {
    return { url, status: -1, body: (error as Error).message };
  }
}

async function main() {
  console.log('='.repeat(70));
  console.log('Diagnóstico de Endpoints - SERPRO Integra Contador');
  console.log('='.repeat(70));
  console.log();

  // Verificar configuração
  try {
    getSerproConfig();
  } catch (error) {
    console.error('❌ Erro na configuração:', (error as Error).message);
    process.exit(1);
  }

  // Obter headers de autenticação
  console.log('Obtendo token de autenticação...');
  const headers = await getAuthHeaders();
  console.log('✅ Token obtido\n');

  console.log('Testando endpoints...\n');

  const results: Array<{ url: string; status: number; body: string }> = [];

  for (const baseUrl of ENDPOINT_VARIATIONS) {
    process.stdout.write(`Testing: ${baseUrl.substring(0, 60)}... `);
    const result = await testEndpoint(baseUrl, headers);
    results.push(result);
    
    if (result.status === 200 || result.status === 201 || result.status === 202) {
      console.log(`✅ ${result.status}`);
    } else if (result.status === 401 || result.status === 403) {
      console.log(`🔒 ${result.status} (auth issue)`);
    } else if (result.status === 404) {
      console.log(`❌ 404`);
    } else {
      console.log(`⚠️  ${result.status}`);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('Resultados detalhados:');
  console.log('='.repeat(70));

  for (const result of results) {
    if (result.status !== 404 && result.status !== -1) {
      console.log(`\n[${result.status}] ${result.url}`);
      console.log(`Response: ${result.body}`);
    }
  }

  // Testar também endpoints GET para verificar disponibilidade
  console.log('\n' + '='.repeat(70));
  console.log('Testando endpoint base (GET)...');
  console.log('='.repeat(70));

  const baseEndpoints = [
    'https://gateway.apiserpro.serpro.gov.br/integra-contador/v1',
    'https://gateway.apiserpro.serpro.gov.br/integra-contador/api/v1',
    'https://gateway.apiserpro.serpro.gov.br/integra-contador-trial/v1',
  ];

  for (const baseUrl of baseEndpoints) {
    try {
      const response = await fetch(baseUrl, {
        method: 'GET',
        headers,
      });
      const body = await response.text();
      console.log(`\n[${response.status}] GET ${baseUrl}`);
      console.log(`Response: ${body.substring(0, 300)}`);
    } catch (error) {
      console.log(`\n[ERR] GET ${baseUrl}: ${(error as Error).message}`);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('Diagnóstico finalizado');
  console.log('='.repeat(70));
}

main().catch(console.error);

