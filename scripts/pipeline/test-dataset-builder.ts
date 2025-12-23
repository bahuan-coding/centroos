/**
 * Test script for Dataset Builder
 * 
 * Validates dataset construction and linking with real data.
 * 
 * Run: npx tsx scripts/pipeline/test-dataset-builder.ts
 */

import { DatasetBuilder, buildDataset } from './dataset-builder';
import type { CanonicalPerson, CanonicalTransaction, CanonicalBankEntry } from '../canonical';
import { normalizeName } from './normalizers/name';
import { createProvenance, createProvenanceBuilder } from '../canonical/provenance';

// =============================================================================
// SAMPLE DATA
// =============================================================================

const provBuilder = createProvenanceBuilder('test-data', 'TestBuilder', '1.0.0');

// Sample persons (from associados_doacao.csv)
const PERSONS: CanonicalPerson[] = [
  {
    id: 'p-003',
    name: normalizeName('CELIA COSTA DOS SANTOS'),
    documents: [{ type: 'cpf', digits: '08771901434', valid: true }],
    source: 'doacao_csv',
    provenance: createProvenance(provBuilder, 'CELIA COSTA DOS SANTOS', 5),
  },
  {
    id: 'p-045',
    name: normalizeName('GUSTAVO REIS SARMENTO'),
    documents: [{ type: 'cpf', digits: '03146232480', valid: true }],
    source: 'doacao_csv',
    provenance: createProvenance(provBuilder, 'GUSTAVO REIS SARMENTO', 29),
  },
  {
    id: 'p-062',
    name: normalizeName('NAZIDIR MARIA DOS SANTOS'),
    documents: [{ type: 'cpf', digits: '15168085415', valid: true }],
    source: 'doacao_csv',
    provenance: createProvenance(provBuilder, 'NAZIDIR MARIA DOS SANTOS', 42),
  },
  {
    id: 'p-039',
    name: normalizeName('MAURÍCIO FERREIRA DA SILVA'),
    documents: [{ type: 'cpf', digits: '13351001487', valid: true }],
    source: 'doacao_csv',
    provenance: createProvenance(provBuilder, 'MAURÍCIO FERREIRA DA SILVA', 26),
  },
  {
    id: 'p-030',
    name: normalizeName('SEVERINA CORREIA SILVA'),
    documents: [],
    source: 'doacao_csv',
    provenance: createProvenance(provBuilder, 'SEVERINA CORREIA SILVA', 20),
  },
];

// Sample transactions (from rawdata_novembro.csv)
const TRANSACTIONS: CanonicalTransaction[] = [
  {
    id: 'tx-001',
    date: '2025-11-01',
    amount: { cents: 10000, currency: 'BRL' },
    type: 'receita',
    nature: 'contribuicao',
    description: 'Contribuição Associado',
    personName: 'Celia Costa',
    accountRef: 'bb',
    provenance: createProvenance(provBuilder, 'tx-001', 6),
  },
  {
    id: 'tx-002',
    date: '2025-11-03',
    amount: { cents: 7500, currency: 'BRL' },
    type: 'receita',
    nature: 'contribuicao',
    description: 'Contribuição Associado',
    personName: 'Gustavo Reis',
    accountRef: 'bb',
    provenance: createProvenance(provBuilder, 'tx-002', 7),
  },
  {
    id: 'tx-003',
    date: '2025-11-05',
    amount: { cents: 3000, currency: 'BRL' },
    type: 'receita',
    nature: 'contribuicao',
    description: 'Contribuição Associado',
    personName: 'Nazidir Maria',
    accountRef: 'bb',
    provenance: createProvenance(provBuilder, 'tx-003', 8),
  },
  {
    id: 'tx-004',
    date: '2025-11-05',
    amount: { cents: 5000, currency: 'BRL' },
    type: 'receita',
    nature: 'contribuicao',
    description: 'Contribuição Associado',
    personName: 'Nazidir Maria',
    accountRef: 'bb',
    provenance: createProvenance(provBuilder, 'tx-004', 9),
  },
  {
    id: 'tx-005',
    date: '2025-11-07',
    amount: { cents: 5000, currency: 'BRL' },
    type: 'receita',
    nature: 'contribuicao',
    description: 'Contribuição Associado',
    personName: 'Maurício Ferreira',
    accountRef: 'bb',
    provenance: createProvenance(provBuilder, 'tx-005', 10),
  },
  {
    id: 'tx-006',
    date: '2025-11-10',
    amount: { cents: 2000, currency: 'BRL' },
    type: 'receita',
    nature: 'contribuicao',
    description: 'Contribuição Associado',
    personName: 'Severina Correia',
    accountRef: 'bb',
    provenance: createProvenance(provBuilder, 'tx-006', 13),
  },
  {
    id: 'tx-007',
    date: '2025-11-25',
    amount: { cents: 13920, currency: 'BRL' },
    type: 'despesa',
    nature: 'tarifa',
    description: 'Tarifa Pacote de Serviços',
    accountRef: 'bb',
    provenance: createProvenance(provBuilder, 'tx-007', 18),
  },
];

// Sample bank entries (from BB extrato)
const BANK_ENTRIES: CanonicalBankEntry[] = [
  {
    id: 'bb-001',
    bank: 'bb',
    dateMovement: '2025-11-03',
    amount: { cents: 10000, currency: 'BRL' },
    direction: 'credit',
    description: 'Pix - Recebido',
    counterpartyName: 'CELIA COSTA DO',
    provenance: createProvenance(provBuilder, 'bb-001', 42),
  },
  {
    id: 'bb-002',
    bank: 'bb',
    dateMovement: '2025-11-05',
    amount: { cents: 7500, currency: 'BRL' },
    direction: 'credit',
    description: 'Pix - Recebido',
    counterpartyName: 'GUSTAVO REI',
    provenance: createProvenance(provBuilder, 'bb-002', 86),
  },
  {
    id: 'bb-003',
    bank: 'bb',
    dateMovement: '2025-11-07',
    amount: { cents: 5000, currency: 'BRL' },
    direction: 'credit',
    description: 'Pix - Recebido',
    counterpartyName: 'MAURICIO FE',
    provenance: createProvenance(provBuilder, 'bb-003', 137),
  },
  {
    id: 'bb-004',
    bank: 'bb',
    dateMovement: '2025-11-25',
    amount: { cents: 13920, currency: 'BRL' },
    direction: 'debit',
    description: 'Tarifa Pacote de Serviços',
    provenance: createProvenance(provBuilder, 'bb-004', 307),
  },
];

// =============================================================================
// TESTS
// =============================================================================

function runTests() {
  console.log('=' .repeat(80));
  console.log('DATASET BUILDER TESTS');
  console.log('=' .repeat(80) + '\n');

  // Test 1: Basic construction
  console.log('1. Basic Construction\n');
  
  const builder = new DatasetBuilder();
  builder
    .addPersons(PERSONS)
    .addTransactions(TRANSACTIONS)
    .addBankEntries(BANK_ENTRIES);
  
  const stats = builder.getStats();
  console.log(`   Persons: ${stats.personCount}`);
  console.log(`   Transactions: ${stats.transactionCount}`);
  console.log(`   Bank Entries: ${stats.bankEntryCount}`);
  console.log(`   Linked before linking: ${stats.linkedTransactions}`);
  console.log(`   Date range: ${stats.dateRange?.min} → ${stats.dateRange?.max}\n`);

  // Test 2: Linking
  console.log('2. Person Linking\n');
  
  builder.linkPersonsToTransactions();
  const statsAfter = builder.getStats();
  
  console.log(`   Linked after linking: ${statsAfter.linkedTransactions}`);
  console.log(`   Unlinked: ${statsAfter.unlinkedTransactions}\n`);

  // Test 3: Build and verify indexes
  console.log('3. Build Dataset & Verify Indexes\n');
  
  const dataset = builder.build();
  
  console.log(`   personById size: ${dataset.personById.size}`);
  console.log(`   personByNormalizedName size: ${dataset.personByNormalizedName.size}`);
  console.log(`   personByCpf size: ${dataset.personByCpf.size}`);
  console.log(`   transactionsByDate size: ${dataset.transactionsByDate.size}`);
  console.log(`   transactionsByPerson size: ${dataset.transactionsByPerson.size}`);
  console.log(`   bankEntriesByDate size: ${dataset.bankEntriesByDate.size}`);
  console.log(`   bankEntriesByBank size: ${dataset.bankEntriesByBank.size}\n`);

  // Test 4: Verify linking correctness
  console.log('4. Verify Linking Correctness\n');
  
  let linkingPassed = 0;
  let linkingFailed = 0;
  
  const testCases = [
    { txId: 'tx-001', expectedPersonId: 'p-003', name: 'Celia Costa' },
    { txId: 'tx-002', expectedPersonId: 'p-045', name: 'Gustavo Reis' },
    { txId: 'tx-003', expectedPersonId: 'p-062', name: 'Nazidir Maria' },
    { txId: 'tx-005', expectedPersonId: 'p-039', name: 'Maurício Ferreira' },
    { txId: 'tx-006', expectedPersonId: 'p-030', name: 'Severina Correia' },
  ];
  
  for (const tc of testCases) {
    const tx = dataset.transactions.find(t => t.id === tc.txId);
    if (tx?.personRef === tc.expectedPersonId) {
      linkingPassed++;
      console.log(`   ✓ ${tc.name} → ${tc.expectedPersonId}`);
    } else {
      linkingFailed++;
      console.log(`   ✗ ${tc.name} expected ${tc.expectedPersonId}, got ${tx?.personRef}`);
    }
  }
  
  console.log(`\n   Linking: ${linkingPassed} passed, ${linkingFailed} failed\n`);

  // Test 5: Index queries
  console.log('5. Index Query Tests\n');
  
  // Query by date
  const nov5Txs = dataset.transactionsByDate.get('2025-11-05') || [];
  console.log(`   Transactions on 2025-11-05: ${nov5Txs.length}`);
  for (const tx of nov5Txs) {
    console.log(`     - ${tx.id}: ${tx.personName} (${tx.amount.cents/100})`);
  }
  
  // Query by person
  const nazidirTxs = dataset.transactionsByPerson.get('p-062') || [];
  console.log(`\n   Transactions for Nazidir (p-062): ${nazidirTxs.length}`);
  for (const tx of nazidirTxs) {
    console.log(`     - ${tx.date}: ${tx.amount.cents/100}`);
  }
  
  // Query by CPF
  const gustavoByCpf = dataset.personByCpf.get('03146232480');
  console.log(`\n   Person by CPF 03146232480: ${gustavoByCpf?.name.original || 'NOT FOUND'}`);
  
  // Query by normalized name
  const severinas = dataset.personByNormalizedName.get('SEVERINA CORREIA SILVA') || [];
  console.log(`   Persons named 'SEVERINA CORREIA SILVA': ${severinas.length}`);
  
  // Query bank entries by bank
  const bbEntries = dataset.bankEntriesByBank.get('bb') || [];
  console.log(`\n   BB bank entries: ${bbEntries.length}`);

  // Test 6: Quick build function
  console.log('\n6. Quick Build Function\n');
  
  const quickDataset = buildDataset(PERSONS, TRANSACTIONS, BANK_ENTRIES);
  console.log(`   Quick build persons: ${quickDataset.persons.length}`);
  console.log(`   Quick build linked txs: ${quickDataset.transactions.filter(t => t.personRef).length}`);

  console.log('\n' + '=' .repeat(80));
  console.log('ALL TESTS COMPLETED');
  console.log('=' .repeat(80));
}

runTests();


