/**
 * Gerador de Relatórios de Auditoria
 * Suporta: CSV, Markdown, JSON, Console
 */

import * as fs from 'fs';
import * as path from 'path';
import type {
  RelatorioAuditoria,
  ResultadoValidacao,
  ResumoAuditoria,
  FormatoRelatorio,
  Severidade,
  Categoria,
} from './types';

// ============================================================================
// CORES PARA CONSOLE
// ============================================================================

const cores = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  
  vermelho: '\x1b[31m',
  verde: '\x1b[32m',
  amarelo: '\x1b[33m',
  azul: '\x1b[34m',
  magenta: '\x1b[35m',
  ciano: '\x1b[36m',
  branco: '\x1b[37m',
  
  bgVermelho: '\x1b[41m',
  bgVerde: '\x1b[42m',
  bgAmarelo: '\x1b[43m',
};

function corSeveridade(sev: Severidade): string {
  switch (sev) {
    case 'erro': return cores.vermelho;
    case 'aviso': return cores.amarelo;
    case 'info': return cores.ciano;
    default: return cores.branco;
  }
}

function icone(sev: Severidade): string {
  switch (sev) {
    case 'erro': return '❌';
    case 'aviso': return '⚠️';
    case 'info': return 'ℹ️';
    default: return '•';
  }
}

// ============================================================================
// FORMATADORES
// ============================================================================

function formatarConsole(relatorio: RelatorioAuditoria): string {
  const { resumo, resultados } = relatorio;
  const linhas: string[] = [];
  
  // Cabeçalho
  linhas.push('');
  linhas.push(`${cores.bold}═══════════════════════════════════════════════════════════════${cores.reset}`);
  linhas.push(`${cores.bold}  RELATÓRIO DE AUDITORIA CONTÁBIL${cores.reset}`);
  linhas.push(`${cores.bold}═══════════════════════════════════════════════════════════════${cores.reset}`);
  linhas.push('');
  
  // Resumo
  linhas.push(`${cores.bold}📊 RESUMO${cores.reset}`);
  linhas.push(`${cores.dim}─────────────────────────────────────────${cores.reset}`);
  linhas.push(`  Data: ${resumo.dataExecucao.toLocaleString('pt-BR')}`);
  linhas.push(`  Tempo de execução: ${resumo.tempoExecucaoMs}ms`);
  linhas.push('');
  linhas.push(`  Total de validações: ${resumo.totalValidacoes}`);
  linhas.push(`  ${cores.vermelho}Erros:${cores.reset}  ${resumo.erros}`);
  linhas.push(`  ${cores.amarelo}Avisos:${cores.reset} ${resumo.avisos}`);
  linhas.push(`  ${cores.ciano}Infos:${cores.reset}  ${resumo.infos}`);
  linhas.push('');
  
  // Por categoria
  linhas.push(`${cores.bold}📁 POR CATEGORIA${cores.reset}`);
  linhas.push(`${cores.dim}─────────────────────────────────────────${cores.reset}`);
  for (const [cat, qtd] of Object.entries(resumo.porCategoria)) {
    if (qtd > 0) {
      linhas.push(`  ${cat.padEnd(15)} ${qtd}`);
    }
  }
  linhas.push('');
  
  // Resultados detalhados
  if (resultados.length > 0) {
    linhas.push(`${cores.bold}📋 DETALHAMENTO${cores.reset}`);
    linhas.push(`${cores.dim}─────────────────────────────────────────${cores.reset}`);
    linhas.push('');
    
    // Agrupar por severidade
    const erros = resultados.filter(r => r.severidade === 'erro');
    const avisos = resultados.filter(r => r.severidade === 'aviso');
    const infos = resultados.filter(r => r.severidade === 'info');
    
    if (erros.length > 0) {
      linhas.push(`${cores.vermelho}${cores.bold}ERROS (${erros.length})${cores.reset}`);
      for (const r of erros.slice(0, 50)) {
        linhas.push(`  ${icone('erro')} [${r.regraId}] ${r.mensagem}`);
        if (r.sugestao) {
          linhas.push(`     ${cores.dim}→ ${r.sugestao}${cores.reset}`);
        }
      }
      if (erros.length > 50) {
        linhas.push(`  ${cores.dim}... e mais ${erros.length - 50} erros${cores.reset}`);
      }
      linhas.push('');
    }
    
    if (avisos.length > 0) {
      linhas.push(`${cores.amarelo}${cores.bold}AVISOS (${avisos.length})${cores.reset}`);
      for (const r of avisos.slice(0, 30)) {
        linhas.push(`  ${icone('aviso')} [${r.regraId}] ${r.mensagem}`);
      }
      if (avisos.length > 30) {
        linhas.push(`  ${cores.dim}... e mais ${avisos.length - 30} avisos${cores.reset}`);
      }
      linhas.push('');
    }
    
    if (infos.length > 0) {
      linhas.push(`${cores.ciano}${cores.bold}INFORMAÇÕES (${infos.length})${cores.reset}`);
      for (const r of infos.slice(0, 20)) {
        linhas.push(`  ${icone('info')} [${r.regraId}] ${r.mensagem}`);
      }
      if (infos.length > 20) {
        linhas.push(`  ${cores.dim}... e mais ${infos.length - 20} informações${cores.reset}`);
      }
      linhas.push('');
    }
  }
  
  // Rodapé
  linhas.push(`${cores.bold}═══════════════════════════════════════════════════════════════${cores.reset}`);
  
  if (resumo.erros === 0 && resumo.avisos === 0) {
    linhas.push(`${cores.verde}${cores.bold}  ✅ AUDITORIA CONCLUÍDA SEM PROBLEMAS${cores.reset}`);
  } else if (resumo.erros === 0) {
    linhas.push(`${cores.amarelo}${cores.bold}  ⚠️  AUDITORIA CONCLUÍDA COM ${resumo.avisos} AVISOS${cores.reset}`);
  } else {
    linhas.push(`${cores.vermelho}${cores.bold}  ❌ AUDITORIA CONCLUÍDA COM ${resumo.erros} ERROS${cores.reset}`);
  }
  
  linhas.push(`${cores.bold}═══════════════════════════════════════════════════════════════${cores.reset}`);
  linhas.push('');
  
  return linhas.join('\n');
}

function formatarMarkdown(relatorio: RelatorioAuditoria): string {
  const { resumo, resultados } = relatorio;
  const linhas: string[] = [];
  
  linhas.push('# Relatório de Auditoria Contábil');
  linhas.push('');
  linhas.push(`**Data:** ${resumo.dataExecucao.toLocaleString('pt-BR')}  `);
  linhas.push(`**Tempo de Execução:** ${resumo.tempoExecucaoMs}ms`);
  linhas.push('');
  linhas.push('---');
  linhas.push('');
  
  // Resumo
  linhas.push('## Resumo Executivo');
  linhas.push('');
  linhas.push('| Métrica | Quantidade |');
  linhas.push('|---------|------------|');
  linhas.push(`| Total de Validações | ${resumo.totalValidacoes} |`);
  linhas.push(`| Erros | ${resumo.erros} |`);
  linhas.push(`| Avisos | ${resumo.avisos} |`);
  linhas.push(`| Informações | ${resumo.infos} |`);
  linhas.push('');
  
  // Por categoria
  linhas.push('### Por Categoria');
  linhas.push('');
  linhas.push('| Categoria | Quantidade |');
  linhas.push('|-----------|------------|');
  for (const [cat, qtd] of Object.entries(resumo.porCategoria)) {
    linhas.push(`| ${cat} | ${qtd} |`);
  }
  linhas.push('');
  
  // Detalhamento
  if (resultados.length > 0) {
    linhas.push('---');
    linhas.push('');
    linhas.push('## Detalhamento');
    linhas.push('');
    
    const erros = resultados.filter(r => r.severidade === 'erro');
    const avisos = resultados.filter(r => r.severidade === 'aviso');
    const infos = resultados.filter(r => r.severidade === 'info');
    
    if (erros.length > 0) {
      linhas.push('### Erros');
      linhas.push('');
      linhas.push('| Regra | Mensagem | Sugestão |');
      linhas.push('|-------|----------|----------|');
      for (const r of erros) {
        linhas.push(`| ${r.regraId} | ${r.mensagem} | ${r.sugestao || '-'} |`);
      }
      linhas.push('');
    }
    
    if (avisos.length > 0) {
      linhas.push('### Avisos');
      linhas.push('');
      linhas.push('| Regra | Mensagem |');
      linhas.push('|-------|----------|');
      for (const r of avisos) {
        linhas.push(`| ${r.regraId} | ${r.mensagem} |`);
      }
      linhas.push('');
    }
    
    if (infos.length > 0) {
      linhas.push('### Informações');
      linhas.push('');
      for (const r of infos) {
        linhas.push(`- **[${r.regraId}]** ${r.mensagem}`);
      }
      linhas.push('');
    }
  }
  
  linhas.push('---');
  linhas.push('');
  linhas.push('*Relatório gerado automaticamente pelo Sistema de Auditoria Contábil*');
  
  return linhas.join('\n');
}

function formatarCSV(relatorio: RelatorioAuditoria): string {
  const { resultados } = relatorio;
  const linhas: string[] = [];
  
  // Cabeçalho
  linhas.push('Regra ID,Regra Nome,Severidade,Categoria,Mensagem,Entidade,Entidade ID,Campo,Valor Atual,Valor Esperado,Sugestao');
  
  // Dados
  for (const r of resultados) {
    const campos = [
      r.regraId,
      `"${r.regraNome}"`,
      r.severidade,
      r.categoria,
      `"${r.mensagem.replace(/"/g, '""')}"`,
      r.entidade || '',
      r.entidadeId || '',
      r.campo || '',
      r.valorAtual?.toString() || '',
      r.valorEsperado?.toString() || '',
      `"${(r.sugestao || '').replace(/"/g, '""')}"`,
    ];
    linhas.push(campos.join(','));
  }
  
  return linhas.join('\n');
}

function formatarJSON(relatorio: RelatorioAuditoria): string {
  return JSON.stringify(relatorio, null, 2);
}

// ============================================================================
// CLASSE PRINCIPAL
// ============================================================================

export class Reporter {
  private formato: FormatoRelatorio;
  private outputPath?: string;
  
  constructor(formato: FormatoRelatorio = 'console', outputPath?: string) {
    this.formato = formato;
    this.outputPath = outputPath;
  }
  
  gerar(relatorio: RelatorioAuditoria): string {
    let conteudo: string;
    
    switch (this.formato) {
      case 'csv':
        conteudo = formatarCSV(relatorio);
        break;
      case 'md':
        conteudo = formatarMarkdown(relatorio);
        break;
      case 'json':
        conteudo = formatarJSON(relatorio);
        break;
      case 'console':
      default:
        conteudo = formatarConsole(relatorio);
        break;
    }
    
    if (this.outputPath) {
      this.salvar(conteudo);
    } else if (this.formato === 'console') {
      console.log(conteudo);
    }
    
    return conteudo;
  }
  
  private salvar(conteudo: string): void {
    if (!this.outputPath) return;
    
    const dir = path.dirname(this.outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(this.outputPath, conteudo, 'utf-8');
    console.log(`\n📄 Relatório salvo em: ${this.outputPath}\n`);
  }
  
  static criarResumo(
    resultados: ResultadoValidacao[],
    parametros: any,
    tempoExecucaoMs: number
  ): ResumoAuditoria {
    const porCategoria: Record<Categoria, number> = {
      fiscal: 0,
      contabil: 0,
      cadastro: 0,
      operacional: 0,
      conciliacao: 0,
    };
    
    const porModulo: Record<string, number> = {
      pessoas: 0,
      doacoes: 0,
      contabil: 0,
      fiscal: 0,
      conciliacao: 0,
      todos: 0,
    };
    
    let erros = 0;
    let avisos = 0;
    let infos = 0;
    
    for (const r of resultados) {
      porCategoria[r.categoria]++;
      
      switch (r.severidade) {
        case 'erro': erros++; break;
        case 'aviso': avisos++; break;
        case 'info': infos++; break;
      }
    }
    
    return {
      dataExecucao: new Date(),
      parametros,
      totalValidacoes: resultados.length,
      erros,
      avisos,
      infos,
      porCategoria,
      porModulo,
      tempoExecucaoMs,
    };
  }
}

