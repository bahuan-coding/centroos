#!/usr/bin/env npx tsx
/**
 * Audit Runner Unificado
 * Substitui os scripts avulsos de auditoria por um único ponto de entrada
 * 
 * Uso:
 *   npx tsx scripts/audit-runner.ts --ano 2025 --modulos todos --formato md
 *   npx tsx scripts/audit-runner.ts --ano 2025 --mes janeiro --modulos doacoes
 *   npx tsx scripts/audit-runner.ts --help
 * 
 * Este script substitui:
 *   - audit-all-months.ts
 *   - audit-db-vs-rawdata.ts
 *   - audit-rawdata.ts
 *   - audit-pessoas.ts
 */

import { AuditEngine } from './audit/engine';
import type { ModuloAuditoria, FormatoRelatorio, NomeMes, ParametrosAuditoria } from './audit/types';

// ============================================================================
// CONFIGURAÇÃO CLI
// ============================================================================

interface CliArgs {
  ano: number;
  mes?: NomeMes;
  todos: boolean;
  modulos: ModuloAuditoria[];
  formato: FormatoRelatorio;
  output?: string;
  dryRun: boolean;
  verbose: boolean;
  help: boolean;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  
  const config: CliArgs = {
    ano: new Date().getFullYear(),
    todos: false,
    modulos: ['todos'],
    formato: 'console',
    dryRun: false,
    verbose: false,
    help: false,
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];
    
    switch (arg) {
      case '--help':
      case '-h':
        config.help = true;
        break;
        
      case '--ano':
      case '-a':
        config.ano = parseInt(next) || config.ano;
        i++;
        break;
        
      case '--mes':
      case '-m':
        config.mes = next as NomeMes;
        i++;
        break;
        
      case '--todos':
      case '-t':
        config.todos = true;
        break;
        
      case '--modulos':
        const mods = next?.split(',') as ModuloAuditoria[];
        if (mods?.length) config.modulos = mods;
        i++;
        break;
        
      case '--formato':
      case '-f':
        config.formato = next as FormatoRelatorio;
        i++;
        break;
        
      case '--output':
      case '-o':
        config.output = next;
        i++;
        break;
        
      case '--dry-run':
        config.dryRun = true;
        break;
        
      case '--verbose':
      case '-v':
        config.verbose = true;
        break;
    }
  }
  
  // Se não especificou mês, assume todos os meses
  if (!config.mes) {
    config.todos = true;
  }
  
  return config;
}

function showHelp(): void {
  console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                     AUDIT RUNNER - Sistema de Auditoria                       ║
║                     Framework Unificado de Validação Contábil                 ║
╚══════════════════════════════════════════════════════════════════════════════╝

DESCRIÇÃO:
  Executa auditoria contábil completa, validando dados do banco contra rawdata.
  Este script unifica todas as funcionalidades de auditoria em um único comando.

USO:
  npx tsx scripts/audit-runner.ts [opções]

OPÇÕES:
  --ano, -a <ano>        Ano fiscal para auditoria (padrão: ano atual)
  --mes, -m <mes>        Mês específico: janeiro, fevereiro, ..., dezembro
  --todos, -t            Auditar todos os meses do ano
  --modulos <lista>      Módulos a executar (separados por vírgula):
                           - pessoas: Valida cadastros, duplicatas, documentos
                           - doacoes: Valida contribuições, rawdata, duplicatas
                           - contabil: Valida partidas dobradas, períodos
                           - fiscal: Valida ITG 2002, NFC, SEFAZ
                           - conciliacao: Valida extratos vs títulos
                           - todos: Executa todos os módulos (padrão)
  --formato, -f <fmt>    Formato de saída: console, csv, md, json (padrão: console)
  --output, -o <path>    Arquivo de saída (se não especificado, exibe no console)
  --dry-run              Apenas mostra o que seria feito, sem executar
  --verbose, -v          Modo verbose com mais detalhes
  --help, -h             Exibe esta ajuda

EXEMPLOS:
  # Auditoria completa de 2025
  npx tsx scripts/audit-runner.ts --ano 2025 --todos

  # Auditoria apenas de janeiro com saída em Markdown
  npx tsx scripts/audit-runner.ts --ano 2025 --mes janeiro --formato md

  # Validar apenas doações e gerar CSV
  npx tsx scripts/audit-runner.ts --ano 2025 --todos --modulos doacoes --formato csv --output audit.csv

  # Verificar pessoas e contabilidade
  npx tsx scripts/audit-runner.ts --modulos pessoas,contabil

MÓDULOS DISPONÍVEIS:
  ┌─────────────┬────────────────────────────────────────────────────────────┐
  │ pessoas     │ CAD-001 a CAD-006: Duplicatas, CPF/CNPJ, contatos         │
  │ doacoes     │ DOA-001 a DOA-005 + RAW-001 a RAW-005: Rawdata, títulos   │
  │ contabil    │ CTB-001 a CTB-006: Partidas dobradas, períodos, histórico │
  │ fiscal      │ FIS-001 a FIS-005: ITG 2002, NFC 70/30, SEFAZ            │
  │ conciliacao │ CON-001 a CON-004: Extratos, valores, datas              │
  └─────────────┴────────────────────────────────────────────────────────────┘

SEVERIDADES:
  ❌ erro  - Problema crítico que precisa ser corrigido
  ⚠️  aviso - Situação que merece atenção
  ℹ️  info  - Informação para conhecimento

NOTAS:
  - O rawdata deve estar em ./rawdata/rawdata_<mes>.csv
  - A conexão com banco usa DATABASE_URL ou NETLIFY_DATABASE_URL
  - Para mais detalhes sobre regras, veja scripts/audit/rules/config.ts
`);
}

// ============================================================================
// EXECUÇÃO PRINCIPAL
// ============================================================================

async function main(): Promise<void> {
  const args = parseArgs();
  
  if (args.help) {
    showHelp();
    process.exit(0);
  }
  
  if (args.dryRun) {
    console.log('\n🔍 [DRY RUN] Configuração que seria usada:\n');
    console.log('  Ano:', args.ano);
    console.log('  Mês:', args.mes || '(todos)');
    console.log('  Módulos:', args.modulos.join(', '));
    console.log('  Formato:', args.formato);
    console.log('  Output:', args.output || '(console)');
    console.log('\n  Para executar de verdade, remova --dry-run\n');
    process.exit(0);
  }
  
  // Construir parâmetros
  const parametros: ParametrosAuditoria = {
    ano: args.ano,
    mes: args.mes,
    todos: args.todos,
    modulos: args.modulos,
    dryRun: args.dryRun,
    formato: args.formato,
    output: args.output,
    verbose: args.verbose,
  };
  
  if (args.verbose) {
    console.log('\n📋 Parâmetros de execução:', JSON.stringify(parametros, null, 2));
  }
  
  try {
    const engine = new AuditEngine(parametros);
    const relatorio = await engine.executar();
    
    // Código de saída baseado em erros
    if (relatorio.resumo.erros > 0) {
      process.exit(1);
    }
  } catch (error: any) {
    console.error('\n❌ Erro na auditoria:', error.message);
    if (args.verbose) {
      console.error(error.stack);
    }
    process.exit(2);
  }
}

main();


