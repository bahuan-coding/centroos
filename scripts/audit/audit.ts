#!/usr/bin/env npx tsx
/**
 * CLI de Auditoria Contábil
 * Sistema de Gestão Financeira para Centro Espírita
 * 
 * Uso:
 *   npx tsx scripts/audit/audit.ts --mes novembro --ano 2025
 *   npx tsx scripts/audit/audit.ts --todos --ano 2025
 *   npx tsx scripts/audit/audit.ts --modulo pessoas
 *   npx tsx scripts/audit/audit.ts --todos --formato md --output relatorio.md
 * 
 * Parâmetros:
 *   --mes, -m       Mês a auditar (1-12 ou janeiro-dezembro)
 *   --ano, -a       Ano a auditar (default: ano atual)
 *   --todos, -t     Processar todos os meses do ano
 *   --modulo        Módulo específico: pessoas, doacoes, contabil, fiscal, conciliacao, todos
 *   --formato, -f   Formato de saída: console, csv, md, json
 *   --output, -o    Arquivo de saída (se não especificado, exibe no console)
 *   --dry-run       Modo simulação, não grava no banco
 *   --verbose, -v   Exibir informações detalhadas
 *   --help, -h      Exibir ajuda
 */

import type { ParametrosAuditoria, ModuloAuditoria, NomeMes, FormatoRelatorio } from './types';
import { MESES, getMesNumero } from './types';
import { AuditEngine } from './engine';

// ============================================================================
// PARSER DE ARGUMENTOS
// ============================================================================

function parseArgs(): ParametrosAuditoria {
  const args = process.argv.slice(2);
  
  const params: ParametrosAuditoria = {
    ano: new Date().getFullYear(),
    todos: false,
    modulos: ['todos'],
    dryRun: false,
    formato: 'console',
    verbose: false,
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];
    
    switch (arg) {
      case '--mes':
      case '-m':
        if (nextArg) {
          const mesNum = parseInt(nextArg);
          if (!isNaN(mesNum) && mesNum >= 1 && mesNum <= 12) {
            params.mes = mesNum;
          } else {
            const mesNome = nextArg.toLowerCase() as NomeMes;
            if (MESES.includes(mesNome)) {
              params.mes = mesNome;
            } else {
              console.error(`❌ Mês inválido: ${nextArg}`);
              console.error('   Use 1-12 ou janeiro-dezembro');
              process.exit(1);
            }
          }
          i++;
        }
        break;
        
      case '--ano':
      case '-a':
        if (nextArg) {
          const ano = parseInt(nextArg);
          if (!isNaN(ano) && ano >= 2000 && ano <= 2100) {
            params.ano = ano;
          } else {
            console.error(`❌ Ano inválido: ${nextArg}`);
            process.exit(1);
          }
          i++;
        }
        break;
        
      case '--todos':
      case '-t':
        params.todos = true;
        break;
        
      case '--modulo':
        if (nextArg) {
          const modulos = nextArg.split(',').map(m => m.trim().toLowerCase()) as ModuloAuditoria[];
          const modulosValidos: ModuloAuditoria[] = ['pessoas', 'doacoes', 'contabil', 'fiscal', 'conciliacao', 'todos'];
          
          for (const mod of modulos) {
            if (!modulosValidos.includes(mod)) {
              console.error(`❌ Módulo inválido: ${mod}`);
              console.error(`   Módulos válidos: ${modulosValidos.join(', ')}`);
              process.exit(1);
            }
          }
          
          params.modulos = modulos;
          i++;
        }
        break;
        
      case '--formato':
      case '-f':
        if (nextArg) {
          const formatos: FormatoRelatorio[] = ['console', 'csv', 'md', 'json'];
          if (formatos.includes(nextArg as FormatoRelatorio)) {
            params.formato = nextArg as FormatoRelatorio;
          } else {
            console.error(`❌ Formato inválido: ${nextArg}`);
            console.error(`   Formatos válidos: ${formatos.join(', ')}`);
            process.exit(1);
          }
          i++;
        }
        break;
        
      case '--output':
      case '-o':
        if (nextArg) {
          params.output = nextArg;
          i++;
        }
        break;
        
      case '--dry-run':
        params.dryRun = true;
        break;
        
      case '--verbose':
      case '-v':
        params.verbose = true;
        break;
        
      case '--help':
      case '-h':
        exibirAjuda();
        process.exit(0);
        break;
        
      default:
        if (arg.startsWith('-')) {
          console.error(`❌ Argumento desconhecido: ${arg}`);
          console.error('   Use --help para ver os comandos disponíveis');
          process.exit(1);
        }
    }
  }
  
  // Validação
  if (!params.todos && !params.mes) {
    console.error('❌ Especifique --mes ou --todos');
    console.error('   Use --help para ver os comandos disponíveis');
    process.exit(1);
  }
  
  return params;
}

function exibirAjuda(): void {
  console.log(`
╔════════════════════════════════════════════════════════════════════╗
║        AUDITORIA CONTÁBIL - CENTRO ESPÍRITA                        ║
║        Sistema de Gestão Financeira                                ║
╚════════════════════════════════════════════════════════════════════╝

USO:
  npx tsx scripts/audit/audit.ts [opções]

OPÇÕES:
  --mes, -m <mês>       Mês a auditar (1-12 ou janeiro-dezembro)
  --ano, -a <ano>       Ano a auditar (default: ${new Date().getFullYear()})
  --todos, -t           Processar todos os meses do ano
  --modulo <módulo>     Módulo específico (pode ser múltiplos separados por vírgula)
                        Valores: pessoas, doacoes, contabil, fiscal, conciliacao, todos
  --formato, -f <fmt>   Formato de saída: console, csv, md, json
  --output, -o <arq>    Arquivo de saída (se não especificado, exibe no console)
  --dry-run             Modo simulação, não grava no banco
  --verbose, -v         Exibir informações detalhadas
  --help, -h            Exibir esta ajuda

EXEMPLOS:
  # Auditar novembro de 2025
  npx tsx scripts/audit/audit.ts --mes novembro --ano 2025

  # Auditar todos os meses de 2025
  npx tsx scripts/audit/audit.ts --todos --ano 2025

  # Auditar apenas cadastros de pessoas
  npx tsx scripts/audit/audit.ts --todos --modulo pessoas

  # Auditar múltiplos módulos
  npx tsx scripts/audit/audit.ts --todos --modulo pessoas,doacoes,fiscal

  # Gerar relatório em Markdown
  npx tsx scripts/audit/audit.ts --todos --formato md --output relatorio-2025.md

  # Gerar CSV para importar em planilha
  npx tsx scripts/audit/audit.ts --mes novembro --formato csv --output auditoria.csv

MÓDULOS DE AUDITORIA:
  pessoas       Duplicatas por nome, CPF/CNPJ inválidos, documentos duplicados
  doacoes       Cruzamento com rawdata, títulos duplicados, baixas faltando
  contabil      Partidas dobradas, períodos, históricos, saldos
  fiscal        NFC Cidadã 70/30, ITG 2002, documentação fiscal
  conciliacao   Extratos x títulos, valores e datas divergentes

REGRAS APLICADAS:
  - ITG 2002 (R1) - Entidades sem fins lucrativos
  - NBC T-10.19 - Regime de competência
  - Nota Fiscal Cidadã - Distribuição 70% projeto / 30% custeio
  - Validação de CPF/CNPJ
  - Detecção de duplicatas por similaridade

SAÍDA:
  O relatório inclui resumo executivo e detalhamento por severidade:
  - ERRO:  Problema grave que deve ser corrigido
  - AVISO: Situação que merece atenção
  - INFO:  Informação relevante para auditoria
`);
}

// ============================================================================
// MAIN
// ============================================================================

async function main(): Promise<void> {
  try {
    const params = parseArgs();
    
    if (params.verbose) {
      console.log('📋 Parâmetros:');
      console.log(`   Ano: ${params.ano}`);
      console.log(`   Mês: ${params.mes || 'todos'}`);
      console.log(`   Todos: ${params.todos}`);
      console.log(`   Módulos: ${params.modulos.join(', ')}`);
      console.log(`   Formato: ${params.formato}`);
      console.log(`   Output: ${params.output || 'console'}`);
      console.log(`   Dry-run: ${params.dryRun}`);
      console.log('');
    }
    
    const engine = new AuditEngine(params);
    const relatorio = await engine.executar();
    
    // Código de saída baseado nos erros
    if (relatorio.resumo.erros > 0) {
      process.exit(1);
    }
    
  } catch (error: any) {
    console.error(`\n❌ Erro fatal: ${error.message}\n`);
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
    process.exit(2);
  }
}

main();

