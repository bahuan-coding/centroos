/**
 * Test script for Identity Resolver
 * 
 * Validates matching against real data from rawdata and bank extracts.
 * 
 * Run: npx tsx scripts/matching/test-identity-resolver.ts
 */

import { buildIndex, findMatches, findBestMatch, resolveIdentities } from './identity-resolver';

// Sample data from associados_doacao.csv (the "ground truth" registry)
const REGISTRY = [
  { id: '3', name: 'CELIA COSTA DOS SANTOS', matricula: 3 },
  { id: '7', name: 'EDLEUZA MELO VASCONCELOS', matricula: 7 },
  { id: '9', name: 'JAILTON RODRIGUES DOS SANTOS', matricula: 9 },
  { id: '18', name: 'MARIA CRISTINA ANTUNES DO C.PINHEIRO', matricula: 18 },
  { id: '19', name: 'MARIA DE FÁTIMA OLIVEIRA DOS SANTOS', matricula: 19 },
  { id: '20', name: 'MARIA DE LOURDES LOPES DOS SANTOS', matricula: 20 },
  { id: '30', name: 'SEVERINA CORREIA SILVA', matricula: 30 },
  { id: '38', name: 'PATRÍCIA LOPES BRANDÃO', matricula: 38 },
  { id: '39', name: 'MAURÍCIO FERREIRA DA SILVA', matricula: 39 },
  { id: '45', name: 'GUSTAVO REIS SARMENTO', matricula: 45 },
  { id: '48', name: 'ALZIRA MARIA PERDIGÃO', matricula: 48 },
  { id: '49', name: 'MARCOS ANTÔNIO SANTIAGO SOARES', matricula: 49 },
  { id: '59', name: 'EDUARDO HENRIQUE NUNES BUARQUE', matricula: 59 },
  { id: '62', name: 'NAZIDIR MARIA DOS SANTOS', matricula: 62 },
  { id: '53', name: 'LUCIANA DA SILVA CAVALCANTE' },
];

// Test cases: name from bank extract → expected match
const TEST_CASES = [
  // From BB extract (truncated names) - realistic thresholds
  { input: 'GUSTAVO REI', expectedId: '45', expectedMinScore: 60 },
  { input: 'NAZIDIR MAR', expectedId: '62', expectedMinScore: 60 },
  { input: 'PATRICIA LOPES', expectedId: '38', expectedMinScore: 60 },
  { input: 'MAURICIO FE', expectedId: '39', expectedMinScore: 40 },  // Very short truncation
  { input: 'EDUARDO HENRIQ', expectedId: '59', expectedMinScore: 60 },
  { input: 'SEVERINA CORRE', expectedId: '30', expectedMinScore: 60 },
  { input: 'MARCOS ANTONIO', expectedId: '49', expectedMinScore: 60 },
  
  // From rawdata (with parentheses/aliases)
  { input: 'Gustavon Reis (Alzira)', expectedId: '45', expectedMinScore: 30 },  // Typo in name
  { input: 'Maria C Cunha', expectedId: '18', expectedMinScore: 30 },  // Uses initial
  { input: 'Celia Costa', expectedId: '3', expectedMinScore: 60 },
  
  // Exact matches
  { input: 'NAZIDIR MARIA DOS SANTOS', expectedId: '62', expectedMinScore: 95 },
  { input: 'GUSTAVO REIS SARMENTO', expectedId: '45', expectedMinScore: 95 },
  
  // Partial matches
  { input: 'LUCIANA SILVA', expectedId: '53', expectedMinScore: 55 },
];

function runTests() {
  console.log('Building index from registry...\n');
  const index = buildIndex(REGISTRY);
  console.log(`Index built: ${index.all.length} persons`);
  console.log(`First tokens: ${index.byFirstToken.size}`);
  console.log(`Last tokens: ${index.byLastToken.size}\n`);
  
  console.log('=' .repeat(80));
  console.log('RUNNING TEST CASES');
  console.log('=' .repeat(80) + '\n');
  
  let passed = 0;
  let failed = 0;
  
  for (const tc of TEST_CASES) {
    const best = findBestMatch(tc.input, index);
    
    const matchedCorrect = best?.candidateId === tc.expectedId;
    const scoreOk = best ? best.score >= tc.expectedMinScore : false;
    const success = matchedCorrect && scoreOk;
    
    if (success) {
      passed++;
      console.log(`✓ "${tc.input}"`);
      console.log(`  → ${best!.candidateName} (score: ${best!.score}, confidence: ${best!.confidence})`);
    } else {
      failed++;
      console.log(`✗ "${tc.input}"`);
      if (best) {
        console.log(`  Expected: id=${tc.expectedId}, minScore=${tc.expectedMinScore}`);
        console.log(`  Got: id=${best.candidateId} ("${best.candidateName}"), score=${best.score}`);
        if (best.evidence.length > 0) {
          console.log(`  Evidence:`);
          for (const e of best.evidence.slice(0, 3)) {
            console.log(`    - ${e.feature}: +${e.contribution} (${e.detail})`);
          }
        }
      } else {
        console.log(`  No match found (expected id=${tc.expectedId})`);
      }
    }
    console.log();
  }
  
  console.log('=' .repeat(80));
  console.log(`RESULTS: ${passed} passed, ${failed} failed`);
  console.log('=' .repeat(80) + '\n');
  
  // Demo: show alternatives for ambiguous case
  console.log('DETAILED EXAMPLE: "Maria C Cunha"\n');
  const matches = findMatches('Maria C Cunha', index, { topK: 5 });
  for (const m of matches) {
    console.log(`${m.score}% [${m.confidence}] ${m.candidateName}`);
    for (const e of m.evidence) {
      console.log(`  └─ ${e.feature}: +${e.contribution}`);
    }
  }
  
  console.log('\n\nDETAILED EXAMPLE: "GUSTAVO REI" (truncated)\n');
  const gustavo = findMatches('GUSTAVO REI', index, { topK: 3 });
  for (const m of gustavo) {
    console.log(`${m.score}% [${m.confidence}] ${m.candidateName}`);
    for (const e of m.evidence) {
      console.log(`  └─ ${e.feature}: +${e.contribution} — ${e.detail}`);
    }
  }
  
  // Batch resolution demo
  console.log('\n\nBATCH RESOLUTION DEMO\n');
  const bankNames = [
    { name: 'NAZIDIR MAR' },
    { name: 'ROSILENE MA' },
    { name: 'MICHELINE G' },
    { name: 'DAYSE LIDIA' },
  ];
  
  const results = resolveIdentities(bankNames, index);
  for (const r of results) {
    if (r.match) {
      console.log(`"${r.input}" → ${r.match.candidateName} (${r.match.score}%)`);
    } else {
      console.log(`"${r.input}" → NO MATCH`);
    }
  }
}

runTests();

