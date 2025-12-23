/**
 * Test script for Financial Matcher
 * 
 * Validates reconciliation against real data from rawdata and bank extracts.
 * 
 * Run: npx tsx scripts/matching/test-financial-matcher.ts
 */

import {
  buildTransactionIndex,
  findFinancialMatches,
  findBestFinancialMatch,
  reconcileBatch,
  type Transaction,
  type BankEntry,
} from './financial-matcher';

// Sample transactions from rawdata_novembro.csv
const TRANSACTIONS: Transaction[] = [
  // Contribuições recebidas em novembro
  { id: 'tx-001', date: '2025-11-01', amountCents: 15000, type: 'receita', personName: 'Edna S Tenório', accountRef: 'bb' },
  { id: 'tx-002', date: '2025-11-01', amountCents: 10000, type: 'receita', personName: 'Celia Costa', accountRef: 'bb' },
  { id: 'tx-003', date: '2025-11-02', amountCents: 15000, type: 'receita', personName: 'Tatiara Moreira', accountRef: 'bb' },
  { id: 'tx-004', date: '2025-11-02', amountCents: 10000, type: 'receita', personName: 'Nazidir Maria', accountRef: 'bb' },
  { id: 'tx-005', date: '2025-11-02', amountCents: 10000, type: 'receita', personName: 'Nazidir Maria', accountRef: 'bb' },
  { id: 'tx-006', date: '2025-11-03', amountCents: 12000, type: 'receita', personName: 'Maria C Cunha', accountRef: 'bb' },
  { id: 'tx-007', date: '2025-11-05', amountCents: 7500, type: 'receita', personName: 'Gustavo Reis', accountRef: 'bb' },
  { id: 'tx-008', date: '2025-11-05', amountCents: 3000, type: 'receita', personName: 'Nazidir Maria', accountRef: 'bb' },
  { id: 'tx-009', date: '2025-11-05', amountCents: 5000, type: 'receita', personName: 'Nazidir Maria', accountRef: 'bb' },
  { id: 'tx-010', date: '2025-11-05', amountCents: 2500, type: 'receita', personName: 'Patricia Lopes Brandão', accountRef: 'bb' },
  { id: 'tx-011', date: '2025-11-06', amountCents: 5000, type: 'receita', personName: 'Claudinete Batista', accountRef: 'bb' },
  { id: 'tx-012', date: '2025-11-07', amountCents: 5000, type: 'receita', personName: 'Maurício Ferreira', accountRef: 'bb' },
  { id: 'tx-013', date: '2025-11-10', amountCents: 2000, type: 'receita', personName: 'Severina Correia', accountRef: 'bb' },
  { id: 'tx-014', date: '2025-11-10', amountCents: 2500, type: 'receita', personName: 'Dayse Lidia', accountRef: 'bb' },
  { id: 'tx-015', date: '2025-11-10', amountCents: 3000, type: 'receita', personName: 'Paulo Cesar', accountRef: 'bb' },
  { id: 'tx-016', date: '2025-11-10', amountCents: 5000, type: 'receita', personName: 'Nazidir Maria', accountRef: 'bb' },
  { id: 'tx-017', date: '2025-11-13', amountCents: 5000, type: 'receita', personName: 'Eduardo Henrique', accountRef: 'bb' },
  { id: 'tx-018', date: '2025-11-25', amountCents: 13920, type: 'despesa', personName: 'Banco do Brasil', accountRef: 'bb', description: 'Tarifa Pacote de Serviços' },
  { id: 'tx-019', date: '2025-11-26', amountCents: 5000, type: 'receita', personName: 'Jailton Rodrigues', accountRef: 'bb' },
  { id: 'tx-020', date: '2025-11-27', amountCents: 1500, type: 'receita', personName: 'Luciana Silva', accountRef: 'bb' },
  { id: 'tx-021', date: '2025-11-27', amountCents: 4000, type: 'receita', personName: 'Nazidir Maria', accountRef: 'bb' },
  { id: 'tx-022', date: '2025-11-27', amountCents: 13000, type: 'receita', personName: 'Nazidir Maria', accountRef: 'bb' },
  { id: 'tx-023', date: '2025-11-28', amountCents: 10000, type: 'receita', personName: 'Rosilene Marques', accountRef: 'bb' },
];

// Sample bank entries from banco_do_brasil_extrato_novembro_2025
const BANK_ENTRIES: BankEntry[] = [
  // From BB extract page 1
  { id: 'bb-001', date: '2025-11-03', amountCents: 15000, direction: 'credit', bank: 'bb', counterpartyName: 'EDNA S TENO' },
  { id: 'bb-002', date: '2025-11-03', amountCents: 10000, direction: 'credit', bank: 'bb', counterpartyName: 'CELIA COSTA DO' },
  { id: 'bb-003', date: '2025-11-03', amountCents: 15000, direction: 'credit', bank: 'bb', counterpartyName: 'TATIARA MOREIR' },
  { id: 'bb-004', date: '2025-11-03', amountCents: 10000, direction: 'credit', bank: 'bb', counterpartyName: 'Nazidir Maria' },
  { id: 'bb-005', date: '2025-11-03', amountCents: 10000, direction: 'credit', bank: 'bb', counterpartyName: 'NAZIDIR MAR' },
  { id: 'bb-006', date: '2025-11-03', amountCents: 12000, direction: 'credit', bank: 'bb', counterpartyName: 'MARIA C CUNHA' },
  { id: 'bb-007', date: '2025-11-05', amountCents: 7500, direction: 'credit', bank: 'bb', counterpartyName: 'GUSTAVO REI' },
  { id: 'bb-008', date: '2025-11-05', amountCents: 3000, direction: 'credit', bank: 'bb', counterpartyName: 'Nazidir Maria' },
  { id: 'bb-009', date: '2025-11-05', amountCents: 5000, direction: 'credit', bank: 'bb', counterpartyName: 'Nazidir Maria' },
  { id: 'bb-010', date: '2025-11-05', amountCents: 2500, direction: 'credit', bank: 'bb', counterpartyName: 'PATRICIA LOPES' },
  { id: 'bb-011', date: '2025-11-06', amountCents: 5000, direction: 'credit', bank: 'bb', counterpartyName: 'Claudinete Bat' },
  { id: 'bb-012', date: '2025-11-07', amountCents: 5000, direction: 'credit', bank: 'bb', counterpartyName: 'MAURICIO FE' },
  { id: 'bb-013', date: '2025-11-10', amountCents: 2000, direction: 'credit', bank: 'bb', counterpartyName: 'SEVERINA CORRE' },
  { id: 'bb-014', date: '2025-11-10', amountCents: 2500, direction: 'credit', bank: 'bb', counterpartyName: 'DAYSE LIDIA' },
  { id: 'bb-015', date: '2025-11-10', amountCents: 3000, direction: 'credit', bank: 'bb', counterpartyName: 'PAULO CESAR RO' },
  { id: 'bb-016', date: '2025-11-10', amountCents: 5000, direction: 'credit', bank: 'bb', counterpartyName: 'NAZIDIR MAR' },
  { id: 'bb-017', date: '2025-11-13', amountCents: 5000, direction: 'credit', bank: 'bb', counterpartyName: 'EDUARDO HENRIQ' },
  { id: 'bb-018', date: '2025-11-25', amountCents: 13920, direction: 'debit', bank: 'bb', description: 'Tarifa Pacote de Serviços' },
  { id: 'bb-019', date: '2025-11-26', amountCents: 5000, direction: 'credit', bank: 'bb', counterpartyName: 'JAILTON RODRIG' },
  { id: 'bb-020', date: '2025-11-27', amountCents: 1500, direction: 'credit', bank: 'bb', counterpartyName: 'LUCIANA SILVA' },
  { id: 'bb-021', date: '2025-11-27', amountCents: 4000, direction: 'credit', bank: 'bb', counterpartyName: 'NAZIDIR MAR' },
  { id: 'bb-022', date: '2025-11-27', amountCents: 13000, direction: 'credit', bank: 'bb', counterpartyName: 'NAZIDIR MAR' },
  { id: 'bb-023', date: '2025-11-28', amountCents: 10000, direction: 'credit', bank: 'bb', counterpartyName: 'ROSILENE MA' },
];

// Person registry for name matching
const PERSONS = [
  { id: 'p-001', name: 'Edna S Tenório' },
  { id: 'p-002', name: 'Celia Costa dos Santos' },
  { id: 'p-003', name: 'Tatiara Moreira' },
  { id: 'p-004', name: 'Nazidir Maria dos Santos' },
  { id: 'p-005', name: 'Maria Cristina Antunes do C. Pinheiro' },
  { id: 'p-006', name: 'Gustavo Reis Sarmento' },
  { id: 'p-007', name: 'Patricia Lopes Brandão' },
  { id: 'p-008', name: 'Claudinete Batista Tenório Cavalcante' },
  { id: 'p-009', name: 'Maurício Ferreira da Silva' },
  { id: 'p-010', name: 'Severina Correia Silva' },
  { id: 'p-011', name: 'Dayse Lidia Silva' },
  { id: 'p-012', name: 'Paulo Cesar Rodrigues' },
  { id: 'p-013', name: 'Eduardo Henrique Nunes Buarque' },
  { id: 'p-014', name: 'Jailton Rodrigues dos Santos' },
  { id: 'p-015', name: 'Luciana da Silva Cavalcante' },
  { id: 'p-016', name: 'Rosilene Marques Aguiar Borges' },
];

// Test cases
const TEST_CASES = [
  { bankEntryId: 'bb-001', expectedTxId: 'tx-001', expectedMinScore: 70, desc: 'EDNA S TENO → Edna S Tenório' },
  { bankEntryId: 'bb-007', expectedTxId: 'tx-007', expectedMinScore: 70, desc: 'GUSTAVO REI → Gustavo Reis' },
  { bankEntryId: 'bb-012', expectedTxId: 'tx-012', expectedMinScore: 70, desc: 'MAURICIO FE → Maurício Ferreira' },
  { bankEntryId: 'bb-017', expectedTxId: 'tx-017', expectedMinScore: 70, desc: 'EDUARDO HENRIQ → Eduardo Henrique' },
  { bankEntryId: 'bb-018', expectedTxId: 'tx-018', expectedMinScore: 80, desc: 'Tarifa 139.20 same day' },
  { bankEntryId: 'bb-023', expectedTxId: 'tx-023', expectedMinScore: 70, desc: 'ROSILENE MA → Rosilene Marques' },
];

function runTests() {
  console.log('Building transaction index...\n');
  const index = buildTransactionIndex(TRANSACTIONS, PERSONS);
  console.log(`Index built: ${index.all.length} transactions`);
  console.log(`Date+Amount keys: ${index.byDateAmount.size}`);
  console.log(`Amount keys: ${index.byAmount.size}`);
  console.log(`Person index: ${index.personIndex ? 'yes' : 'no'}\n`);
  
  console.log('=' .repeat(80));
  console.log('INDIVIDUAL MATCH TESTS');
  console.log('=' .repeat(80) + '\n');
  
  let passed = 0;
  let failed = 0;
  
  for (const tc of TEST_CASES) {
    const bankEntry = BANK_ENTRIES.find(e => e.id === tc.bankEntryId)!;
    const best = findBestFinancialMatch(bankEntry, index);
    
    const matchedCorrect = best?.transactionId === tc.expectedTxId;
    const scoreOk = best ? best.score >= tc.expectedMinScore : false;
    const success = matchedCorrect && scoreOk;
    
    if (success) {
      passed++;
      console.log(`✓ ${tc.desc}`);
      console.log(`  Bank: ${bankEntry.date} | ${bankEntry.amountCents/100} | ${bankEntry.counterpartyName || bankEntry.description}`);
      console.log(`  Match: ${best!.transactionId} | score=${best!.score} | status=${best!.status}`);
    } else {
      failed++;
      console.log(`✗ ${tc.desc}`);
      console.log(`  Bank: ${bankEntry.date} | ${bankEntry.amountCents/100} | ${bankEntry.counterpartyName || bankEntry.description}`);
      if (best) {
        console.log(`  Expected: ${tc.expectedTxId}, minScore=${tc.expectedMinScore}`);
        console.log(`  Got: ${best.transactionId}, score=${best.score}`);
        if (best.evidence.length > 0) {
          console.log(`  Evidence:`);
          for (const e of best.evidence.slice(0, 3)) {
            console.log(`    - ${e.feature}: +${e.contribution} (${e.detail})`);
          }
        }
      } else {
        console.log(`  No match found`);
      }
    }
    console.log();
  }
  
  console.log('=' .repeat(80));
  console.log(`RESULTS: ${passed} passed, ${failed} failed`);
  console.log('=' .repeat(80) + '\n');
  
  // Batch reconciliation
  console.log('BATCH RECONCILIATION\n');
  const result = reconcileBatch(BANK_ENTRIES, TRANSACTIONS, PERSONS);
  
  console.log(`Total bank entries: ${result.summary.totalBankEntries}`);
  console.log(`Matched: ${result.summary.matched}`);
  console.log(`Unmatched: ${result.summary.unmatched}`);
  console.log(`Duplicate suspects: ${result.summary.duplicateSuspects}\n`);
  
  if (result.unmatched.length > 0) {
    console.log('Unmatched entries:');
    for (const e of result.unmatched.slice(0, 5)) {
      console.log(`  - ${e.date} | ${e.amountCents/100} | ${e.counterpartyName || e.description}`);
    }
  }
  
  if (result.duplicateSuspects.length > 0) {
    console.log('\nDuplicate suspects:');
    for (const m of result.duplicateSuspects.slice(0, 5)) {
      console.log(`  - ${m.bankEntryId} → ${m.transactionId} (score ${m.score})`);
    }
  }
  
  // Detailed example
  console.log('\n\nDETAILED EXAMPLE: bb-007 (GUSTAVO REI)\n');
  const gustavo = BANK_ENTRIES.find(e => e.id === 'bb-007')!;
  const gustavoMatches = findFinancialMatches(gustavo, index, { topK: 3 });
  for (const m of gustavoMatches) {
    const tx = TRANSACTIONS.find(t => t.id === m.transactionId)!;
    console.log(`${m.score}% [${m.status}] ${tx.date} | ${tx.amountCents/100} | ${tx.personName}`);
    for (const e of m.evidence) {
      console.log(`  └─ ${e.feature}: +${e.contribution} — ${e.detail}`);
    }
  }
}

runTests();



