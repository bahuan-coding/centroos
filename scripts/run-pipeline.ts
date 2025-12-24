#!/usr/bin/env npx tsx
/**
 * Pipeline CLI - Command-Line Interface for Full Pipeline Orchestrator
 * 
 * Usage:
 *   npx tsx scripts/run-pipeline.ts [options] [directory]
 * 
 * Examples:
 *   npx tsx scripts/run-pipeline.ts ./rawdata
 *   npx tsx scripts/run-pipeline.ts --json ./rawdata
 *   npx tsx scripts/run-pipeline.ts --verbose --year 2025 ./rawdata
 * 
 * @module scripts/run-pipeline
 */

import { runPipeline, type PipelineResult } from './pipeline/orchestrator';

// =============================================================================
// CLI ARGUMENTS
// =============================================================================

interface CliArgs {
  directory: string;
  verbose: boolean;
  json: boolean;
  year: number;
  help: boolean;
}

function parseArgs(args: string[]): CliArgs {
  const result: CliArgs = {
    directory: './rawdata',
    verbose: false,
    json: false,
    year: new Date().getFullYear(),
    help: false,
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--help' || arg === '-h') {
      result.help = true;
    } else if (arg === '--verbose' || arg === '-v') {
      result.verbose = true;
    } else if (arg === '--json' || arg === '-j') {
      result.json = true;
    } else if (arg === '--year' || arg === '-y') {
      result.year = parseInt(args[++i], 10);
    } else if (!arg.startsWith('-')) {
      result.directory = arg;
    }
  }
  
  return result;
}

function printHelp(): void {
  console.log(`
Pipeline CLI - Full Data Processing Pipeline

USAGE:
  npx tsx scripts/run-pipeline.ts [OPTIONS] [DIRECTORY]

ARGUMENTS:
  DIRECTORY         Directory containing raw data files (default: ./rawdata)

OPTIONS:
  -h, --help        Show this help message
  -v, --verbose     Enable verbose output during processing
  -j, --json        Output results as JSON
  -y, --year NUM    Default year for date parsing (default: current year)

EXAMPLES:
  npx tsx scripts/run-pipeline.ts
  npx tsx scripts/run-pipeline.ts ./rawdata
  npx tsx scripts/run-pipeline.ts --verbose ./rawdata
  npx tsx scripts/run-pipeline.ts --json ./rawdata > result.json

OUTPUT:
  - Files processed and their parsers
  - Transaction and bank entry counts
  - Reconciliation summary (matched/unmatched/suspects)
  - Processing duration
`);
}

// =============================================================================
// OUTPUT FORMATTING
// =============================================================================

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function printResults(result: PipelineResult, verbose: boolean): void {
  const { stats, warnings } = result;
  
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║                    PIPELINE RESULTS                           ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
  
  // Files
  console.log('📁 FILES');
  console.log(`   Processed:    ${stats.filesProcessed}`);
  console.log(`   Unrecognized: ${stats.filesUnrecognized}`);
  
  // Data
  console.log('\n📊 DATA');
  console.log(`   Transactions: ${stats.transactions}`);
  console.log(`   Bank Entries: ${stats.bankEntries}`);
  
  // Linking
  console.log('\n🔗 PERSON LINKING');
  console.log(`   Linked:   ${stats.personsLinked}`);
  console.log(`   Unlinked: ${stats.personsUnlinked}`);
  
  // Reconciliation
  console.log('\n✅ RECONCILIATION');
  console.log(`   Matched:  ${stats.reconciled.matched}`);
  console.log(`   Unmatched: ${stats.reconciled.unmatched}`);
  console.log(`   Suspects: ${stats.reconciled.suspect}`);
  
  // Timing
  console.log('\n⏱️  DURATION');
  console.log(`   Parse:     ${formatDuration(stats.duration.parse)}`);
  console.log(`   Link:      ${formatDuration(stats.duration.link)}`);
  console.log(`   Reconcile: ${formatDuration(stats.duration.reconcile)}`);
  console.log(`   Total:     ${formatDuration(stats.duration.total)}`);
  
  // Warnings
  if (warnings.length > 0) {
    console.log('\n⚠️  WARNINGS');
    warnings.forEach(w => console.log(`   - ${w}`));
  }
  
  console.log('');
}

function printJson(result: PipelineResult): void {
  const output = {
    stats: result.stats,
    reconciliation: result.reconciliation ? {
      matched: result.reconciliation.matched.length,
      unmatched: result.reconciliation.unmatched.length,
      suspects: result.reconciliation.duplicateSuspects.length,
    } : null,
    dataset: {
      transactions: result.dataset.transactions.length,
      bankEntries: result.dataset.bankEntries.length,
      persons: result.dataset.persons.length,
    },
    warnings: result.warnings,
  };
  
  console.log(JSON.stringify(output, null, 2));
}

// =============================================================================
// MAIN
// =============================================================================

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  
  if (args.help) {
    printHelp();
    process.exit(0);
  }
  
  if (!args.json) {
    console.log('🚀 Starting Pipeline...\n');
    console.log(`   Directory: ${args.directory}`);
    console.log(`   Year:      ${args.year}`);
    console.log('');
  }
  
  try {
    const result = await runPipeline(args.directory, {
      year: args.year,
      verbose: args.verbose && !args.json,
    });
    
    if (args.json) {
      printJson(result);
    } else {
      printResults(result, args.verbose);
    }
    
    process.exit(0);
  } catch (error) {
    if (args.json) {
      console.error(JSON.stringify({ error: (error as Error).message }));
    } else {
      console.error(`\n❌ Error: ${(error as Error).message}`);
    }
    process.exit(1);
  }
}

main();






