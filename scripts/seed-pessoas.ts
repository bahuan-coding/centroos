/**
 * Seed de Pessoas e Títulos com dados reais
 * Executar: npx tsx scripts/seed-pessoas.ts
 */

import { neon } from '@netlify/neon';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../drizzle/schema';

const databaseUrl = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('❌ NETLIFY_DATABASE_URL ou DATABASE_URL não configurada');
  process.exit(1);
}

const sql = neon(databaseUrl);
const db = drizzle(sql, { schema });

// ============================================================================
// DADOS DE ASSOCIADOS (extraídos da planilha CONTRIBUIÇÃO ASSOCIADOS)
// ============================================================================
const associados = [
  { nome: 'CELIA COSTA DOS SANTOS', matricula: '3', contribuicao: 100 },
  { nome: 'CÉLIA MARIA BRAGA NETTO COSTA', matricula: '4', contribuicao: 0 },
  { nome: 'DIVA GALVÃO CAVALCANTE', matricula: '5', contribuicao: 0 },
  { nome: 'EDLEUZA MELO VASCONCELOS', matricula: '7', contribuicao: 75 },
  { nome: 'GLEICIANA SANTIAGO SOARES', matricula: '8', contribuicao: 15 },
  { nome: 'JAILTON RODRIGUES DOS SANTOS', matricula: '9', contribuicao: 25 },
  { nome: 'LÍDIA ROBERTA MELO VASCONCELOS', matricula: '12', contribuicao: 75 },
  { nome: 'MARIA JÚLIA TEIXEIRA LEMOS', matricula: '14', contribuicao: 0 },
  { nome: 'LUIZ CARLOS MARINHO SIMÕES', matricula: '15', contribuicao: 20 },
  { nome: 'MARIA CRISTINA ANTUNES DO C.PINHEIRO', matricula: '18', contribuicao: 120 },
  { nome: 'MARIA DE FÁTIMA OLIVEIRA DOS SANTOS', matricula: '19', contribuicao: 25 },
  { nome: 'MARIA DE LOURDES LOPES DOS SANTOS', matricula: '20', contribuicao: 25 },
  { nome: 'ELISABETE FREIRE COSTA BARROS', matricula: '26', contribuicao: 0 },
  { nome: 'ROSILENE MARQUES AGUIAR BORGES', matricula: '28', contribuicao: 100 },
  { nome: 'SAMIRA CAVALCANTE LIMA', matricula: '29', contribuicao: 0 },
  { nome: 'SEVERINA CORREIA SILVA', matricula: '30', contribuicao: 20 },
  { nome: 'SIRLEIDE G. DE ALBUQUERQUE SANTOS', matricula: '31', contribuicao: 10 },
  { nome: 'HELENA DE FÁTIMA OLIVEIRA DA SILVA', matricula: '34', contribuicao: 25 },
  { nome: 'ELIANE FERREIRA DOS SANTOS', matricula: '36', contribuicao: 0 },
  { nome: 'IRACI SILVA MELO', matricula: '37', contribuicao: 0 },
  { nome: 'PATRÍCIA LOPES BRANDÃO', matricula: '38', contribuicao: 25 },
  { nome: 'MAURÍCIO FERREIRA DA SILVA', matricula: '39', contribuicao: 25 },
  { nome: 'CRISTINA RAQUEL LOPES DOS S. TONIAL', matricula: '42', contribuicao: 0 },
  { nome: 'ANA PAULA BORGES MENDONÇA', matricula: '43', contribuicao: 0 },
  { nome: 'GUSTAVO REIS SARMENTO', matricula: '45', contribuicao: 50 },
  { nome: 'MARIA ADRIANA DE MELO SARMENTO', matricula: '46', contribuicao: 0 },
  { nome: 'MARIA DENISE BUARQUE DE CARVALHO', matricula: '47', contribuicao: 25 },
  { nome: 'ALZIRA MARIA PERDIGÃO', matricula: '48', contribuicao: 25 },
  { nome: 'MARCOS ANTÔNIO SANTIAGO SOARES', matricula: '49', contribuicao: 30 },
  { nome: 'CRISTINA FEITOSA SILVA', matricula: '51', contribuicao: 0 },
  { nome: 'ZEJANE CARDOSO DA SILVA CAMINHO', matricula: '52', contribuicao: 0 },
  { nome: 'PAULO GOMES DE MELO JUNIOR', matricula: '53', contribuicao: 20 },
  { nome: 'BIANCA RENATA DE ALMEIDA', matricula: '54', contribuicao: 20 },
  { nome: 'CLAUDIO F. PERRELLI', matricula: '56', contribuicao: 0 },
  { nome: 'LUIZ BEZERRA MENDONÇA', matricula: '58', contribuicao: 0 },
  { nome: 'EDUARDO HENRIQUE NUNES BUARQUE', matricula: '59', contribuicao: 25 },
  { nome: 'PAULO OLIVEIRA DE MORAIS', matricula: '60', contribuicao: 0 },
  { nome: 'NAZIDIR MARIA DOS SANTOS', matricula: '62', contribuicao: 30 },
  { nome: 'EDNILTON LUCENA', matricula: '63', contribuicao: 0 },
  { nome: 'SONIA MARIA ALVES DE LIMA', matricula: '66', contribuicao: 0 },
  { nome: 'ANGELA LÚCIA OLIVEIRA DA SILVA', matricula: '67', contribuicao: 0 },
  { nome: 'JOSE MARIA VIEIRA DA SILVA', matricula: '68', contribuicao: 0 },
  { nome: 'JEFERSON GABRIEL SOARES', matricula: '69', contribuicao: 0 },
  { nome: 'RENATA DE MELO FRANCO', matricula: '80', contribuicao: 10 },
  { nome: 'LAÍS SANTIAGO SOARES', matricula: '87', contribuicao: 0 },
  { nome: 'KILARE TAWYNNE S. MONTEIRO', matricula: '85', contribuicao: 15 },
  { nome: 'JOSEDIR JUSSARA DOS SANTOS', matricula: '104', contribuicao: 15 },
  { nome: 'JORGE MEDEIROS', matricula: '99', contribuicao: 0 },
  { nome: 'LUCIANA DA SILVA CAVALCANTE', matricula: '', contribuicao: 15 },
  { nome: 'ELILDIERLI SOARES FERREIRA', matricula: '', contribuicao: 0 },
  { nome: 'LUCIANO GOMES DA SILVA', matricula: '', contribuicao: 100 },
  { nome: 'SANDRA GABRIELA LOPES DOS SANTOS', matricula: '', contribuicao: 10 },
  { nome: 'ALCIONE SOARES FERREIRA', matricula: '', contribuicao: 0 },
  { nome: 'JANE COSTA DA SILVA', matricula: '', contribuicao: 0 },
  { nome: 'YAGO ALMEIDA', matricula: '', contribuicao: 0 },
  { nome: 'ANDREIA SANTOS SANTANA', matricula: '', contribuicao: 50 },
  { nome: 'DAYSE LIDIANE SILVA', matricula: '', contribuicao: 25 },
];

// ============================================================================
// DADOS DE NÃO ASSOCIADOS (extraídos da planilha CONTRIBUIÇÃO NAO ASSOCIADOS)
// ============================================================================
const naoAssociados = [
  { nome: 'LARISSA MOURA' },
  { nome: 'EDNA S TENORIO' },
  { nome: 'MARIA EDUARDO' },
  { nome: 'ENEIDE ROSSO' },
  { nome: 'THAYZE KEYLLA' },
  { nome: 'JOSE OLINDINO' },
  { nome: 'VICTOR FERREIRA' },
  { nome: 'MICHELINE BATISTA' },
  { nome: 'TATIANE MOREIRA' },
  { nome: 'CLAUDINETE B. TENORIO CAVALCANTE' },
  { nome: 'Rafael Santana' },
  { nome: 'Maria Lopes Milhones' },
  { nome: 'Aline Rose' },
  { nome: 'Rosangela Maria Xaxier' },
  { nome: 'Gabriela Santos' },
  { nome: 'Nadjeson' },
  { nome: 'MARLENE A ALBUQUERQUE' },
  { nome: 'PAULO CESAR' },
  { nome: 'CRISTIANE CASSIANO' },
  { nome: 'SANRA VASCONCELOS' },
  { nome: 'LISYANE PENHA' },
  { nome: 'MICHELINE GOMES' },
];

// ============================================================================
// CONTAS FINANCEIRAS
// ============================================================================
const contasFinanceiras = [
  {
    tipo: 'conta_corrente' as const,
    nome: 'Banco do Brasil - Conta Corrente',
    bancoCodigo: '001',
    bancoNome: 'Banco do Brasil S.A.',
    agencia: '2934-0',
    contaNumero: '16.531-4',
    saldoInicial: '0',
    dataSaldoInicial: '2025-01-01',
  },
  {
    tipo: 'poupanca' as const,
    nome: 'BB Renda Fácil',
    bancoCodigo: '001',
    bancoNome: 'Banco do Brasil S.A.',
    agencia: '2934-0',
    contaNumero: '16.531-4',
    saldoInicial: '0',
    dataSaldoInicial: '2025-01-01',
  },
  {
    tipo: 'conta_corrente' as const,
    nome: 'Caixa Econômica Federal',
    bancoCodigo: '104',
    bancoNome: 'Caixa Econômica Federal',
    agencia: '0049',
    contaNumero: '00000156-6',
    saldoInicial: '0',
    dataSaldoInicial: '2025-01-01',
  },
  {
    tipo: 'caixa' as const,
    nome: 'Caixa Físico',
    saldoInicial: '0',
    dataSaldoInicial: '2025-01-01',
  },
];

// ============================================================================
// TÍTULOS (contribuições reais)
// ============================================================================
const titulosContribuicoes = [
  // Janeiro 2025 - Associados
  { pessoa: 'CELIA COSTA DOS SANTOS', data: '2025-01-02', valor: 100 },
  { pessoa: 'JAILTON RODRIGUES DOS SANTOS', data: '2025-01-28', valor: 15 },
  { pessoa: 'MARIA CRISTINA ANTUNES DO C.PINHEIRO', data: '2025-01-06', valor: 100 },
  { pessoa: 'MARIA DE FÁTIMA OLIVEIRA DOS SANTOS', data: '2025-01-28', valor: 10 },
  { pessoa: 'MARIA DE LOURDES LOPES DOS SANTOS', data: '2025-01-10', valor: 20 },
  { pessoa: 'SEVERINA CORREIA SILVA', data: '2025-01-06', valor: 20 },
  { pessoa: 'HELENA DE FÁTIMA OLIVEIRA DA SILVA', data: '2025-01-10', valor: 25 },
  { pessoa: 'PATRÍCIA LOPES BRANDÃO', data: '2025-01-07', valor: 25 },
  { pessoa: 'MAURÍCIO FERREIRA DA SILVA', data: '2025-01-10', valor: 25 },
  { pessoa: 'GUSTAVO REIS SARMENTO', data: '2025-01-03', valor: 50 },
  { pessoa: 'MARIA DENISE BUARQUE DE CARVALHO', data: '2025-01-13', valor: 25 },
  { pessoa: 'ALZIRA MARIA PERDIGÃO', data: '2025-01-03', valor: 25 },
  { pessoa: 'MARCOS ANTÔNIO SANTIAGO SOARES', data: '2025-01-20', valor: 30 },
  { pessoa: 'PAULO GOMES DE MELO JUNIOR', data: '2025-01-28', valor: 20 },
  { pessoa: 'BIANCA RENATA DE ALMEIDA', data: '2025-01-28', valor: 20 },
  { pessoa: 'EDUARDO HENRIQUE NUNES BUARQUE', data: '2025-01-13', valor: 25 },
  { pessoa: 'NAZIDIR MARIA DOS SANTOS', data: '2025-01-10', valor: 30 },
  { pessoa: 'KILARE TAWYNNE S. MONTEIRO', data: '2025-01-10', valor: 10 },
  { pessoa: 'JOSEDIR JUSSARA DOS SANTOS', data: '2025-01-10', valor: 10 },
  { pessoa: 'SANDRA GABRIELA LOPES DOS SANTOS', data: '2025-01-10', valor: 10 },
  // Não associados janeiro
  { pessoa: 'EDNA S TENORIO', data: '2025-01-03', valor: 150 },
  { pessoa: 'MICHELINE BATISTA', data: '2025-01-23', valor: 50 },
  
  // Fevereiro 2025
  { pessoa: 'CELIA COSTA DOS SANTOS', data: '2025-02-03', valor: 100 },
  { pessoa: 'EDLEUZA MELO VASCONCELOS', data: '2025-02-18', valor: 75 },
  { pessoa: 'LÍDIA ROBERTA MELO VASCONCELOS', data: '2025-02-18', valor: 75 },
  { pessoa: 'MARIA DE LOURDES LOPES DOS SANTOS', data: '2025-02-14', valor: 20 },
  { pessoa: 'SEVERINA CORREIA SILVA', data: '2025-02-18', valor: 20 },
  { pessoa: 'HELENA DE FÁTIMA OLIVEIRA DA SILVA', data: '2025-02-10', valor: 50 },
  { pessoa: 'MAURÍCIO FERREIRA DA SILVA', data: '2025-02-10', valor: 50 },
  { pessoa: 'GUSTAVO REIS SARMENTO', data: '2025-02-03', valor: 50 },
  { pessoa: 'MARIA DENISE BUARQUE DE CARVALHO', data: '2025-02-13', valor: 25 },
  { pessoa: 'ALZIRA MARIA PERDIGÃO', data: '2025-02-03', valor: 25 },
  { pessoa: 'MARCOS ANTÔNIO SANTIAGO SOARES', data: '2025-02-18', valor: 30 },
  { pessoa: 'PAULO GOMES DE MELO JUNIOR', data: '2025-02-03', valor: 20 },
  { pessoa: 'BIANCA RENATA DE ALMEIDA', data: '2025-02-03', valor: 20 },
  { pessoa: 'EDUARDO HENRIQUE NUNES BUARQUE', data: '2025-02-13', valor: 25 },
  { pessoa: 'NAZIDIR MARIA DOS SANTOS', data: '2025-02-14', valor: 30 },
  { pessoa: 'LUCIANO GOMES DA SILVA', data: '2025-02-03', valor: 100 },
  { pessoa: 'SANDRA GABRIELA LOPES DOS SANTOS', data: '2025-02-14', valor: 10 },
  { pessoa: 'EDNA S TENORIO', data: '2025-02-03', valor: 150 },
  { pessoa: 'TATIANE MOREIRA', data: '2025-02-06', valor: 150 },
  { pessoa: 'CLAUDINETE B. TENORIO CAVALCANTE', data: '2025-02-27', valor: 100 },
  { pessoa: 'MICHELINE BATISTA', data: '2025-02-24', valor: 50 },

  // Março 2025
  { pessoa: 'CELIA COSTA DOS SANTOS', data: '2025-03-05', valor: 100 },
  { pessoa: 'JAILTON RODRIGUES DOS SANTOS', data: '2025-03-24', valor: 25 },
  { pessoa: 'MARIA CRISTINA ANTUNES DO C.PINHEIRO', data: '2025-03-05', valor: 100 },
  { pessoa: 'MARIA DE FÁTIMA OLIVEIRA DOS SANTOS', data: '2025-03-24', valor: 25 },
  { pessoa: 'MARIA DE LOURDES LOPES DOS SANTOS', data: '2025-03-07', valor: 20 },
  { pessoa: 'ROSILENE MARQUES AGUIAR BORGES', data: '2025-03-28', valor: 50 },
  { pessoa: 'SEVERINA CORREIA SILVA', data: '2025-03-05', valor: 20 },
  { pessoa: 'HELENA DE FÁTIMA OLIVEIRA DA SILVA', data: '2025-03-10', valor: 25 },
  { pessoa: 'MAURÍCIO FERREIRA DA SILVA', data: '2025-03-10', valor: 25 },
  { pessoa: 'GUSTAVO REIS SARMENTO', data: '2025-03-07', valor: 50 },
  { pessoa: 'MARIA DENISE BUARQUE DE CARVALHO', data: '2025-03-13', valor: 25 },
  { pessoa: 'ALZIRA MARIA PERDIGÃO', data: '2025-03-07', valor: 25 },
  { pessoa: 'MARCOS ANTÔNIO SANTIAGO SOARES', data: '2025-03-18', valor: 30 },
  { pessoa: 'PAULO GOMES DE MELO JUNIOR', data: '2025-03-17', valor: 20 },
  { pessoa: 'BIANCA RENATA DE ALMEIDA', data: '2025-03-17', valor: 20 },
  { pessoa: 'EDUARDO HENRIQUE NUNES BUARQUE', data: '2025-03-13', valor: 25 },
  { pessoa: 'NAZIDIR MARIA DOS SANTOS', data: '2025-03-07', valor: 30 },
  { pessoa: 'LUCIANA DA SILVA CAVALCANTE', data: '2025-03-31', valor: 15 },
  { pessoa: 'SANDRA GABRIELA LOPES DOS SANTOS', data: '2025-03-07', valor: 10 },
  { pessoa: 'EDNA S TENORIO', data: '2025-03-05', valor: 150 },
  { pessoa: 'TATIANE MOREIRA', data: '2025-03-26', valor: 150 },
  { pessoa: 'MICHELINE BATISTA', data: '2025-03-24', valor: 50 },

  // Outubro 2025 (mais recente)
  { pessoa: 'CELIA COSTA DOS SANTOS', data: '2025-10-01', valor: 100 },
  { pessoa: 'JAILTON RODRIGUES DOS SANTOS', data: '2025-10-24', valor: 25 },
  { pessoa: 'MARIA CRISTINA ANTUNES DO C.PINHEIRO', data: '2025-10-01', valor: 120 },
  { pessoa: 'MARIA DE LOURDES LOPES DOS SANTOS', data: '2025-10-24', valor: 25 },
  { pessoa: 'ROSILENE MARQUES AGUIAR BORGES', data: '2025-10-28', valor: 100 },
  { pessoa: 'SEVERINA CORREIA SILVA', data: '2025-10-02', valor: 20 },
  { pessoa: 'HELENA DE FÁTIMA OLIVEIRA DA SILVA', data: '2025-10-07', valor: 25 },
  { pessoa: 'MAURÍCIO FERREIRA DA SILVA', data: '2025-10-07', valor: 25 },
  { pessoa: 'MARIA DENISE BUARQUE DE CARVALHO', data: '2025-10-13', valor: 25 },
  { pessoa: 'MARCOS ANTÔNIO SANTIAGO SOARES', data: '2025-10-20', valor: 30 },
  { pessoa: 'PAULO GOMES DE MELO JUNIOR', data: '2025-10-23', valor: 20 },
  { pessoa: 'BIANCA RENATA DE ALMEIDA', data: '2025-10-23', valor: 20 },
  { pessoa: 'EDUARDO HENRIQUE NUNES BUARQUE', data: '2025-10-13', valor: 25 },
  { pessoa: 'NAZIDIR MARIA DOS SANTOS', data: '2025-10-01', valor: 50 },
  { pessoa: 'RENATA DE MELO FRANCO', data: '2025-10-23', valor: 10 },
  { pessoa: 'KILARE TAWYNNE S. MONTEIRO', data: '2025-10-01', valor: 25 },
  { pessoa: 'JOSEDIR JUSSARA DOS SANTOS', data: '2025-10-01', valor: 25 },
  { pessoa: 'LUCIANA DA SILVA CAVALCANTE', data: '2025-10-06', valor: 15 },
  { pessoa: 'ANDREIA SANTOS SANTANA', data: '2025-10-03', valor: 50 },
  { pessoa: 'DAYSE LIDIANE SILVA', data: '2025-10-09', valor: 25 },
  { pessoa: 'EDNA S TENORIO', data: '2025-10-02', valor: 150 },
  { pessoa: 'TATIANE MOREIRA', data: '2025-10-03', valor: 150 },
  { pessoa: 'CLAUDINETE B. TENORIO CAVALCANTE', data: '2025-10-08', valor: 50 },
  { pessoa: 'MARLENE A ALBUQUERQUE', data: '2025-10-13', valor: 1000 },
  { pessoa: 'Nadjeson', data: '2025-10-02', valor: 50 },
  { pessoa: 'LISYANE PENHA', data: '2025-10-20', valor: 50 },
  { pessoa: 'MICHELINE GOMES', data: '2025-10-23', valor: 50 },
];

// ============================================================================
// FUNÇÃO PRINCIPAL
// ============================================================================

async function seed() {
  console.log('🌱 Iniciando seed de pessoas e títulos com dados reais...\n');
  
  const pessoaIdMap: Record<string, string> = {};
  const contaIdMap: Record<string, string> = {};
  
  // 1. Criar Contas Financeiras
  console.log('🏦 Criando contas financeiras...');
  for (const conta of contasFinanceiras) {
    try {
      const [result] = await db.insert(schema.contaFinanceira).values(conta).returning({ id: schema.contaFinanceira.id });
      contaIdMap[conta.nome] = result.id;
      console.log(`  ✅ ${conta.nome}`);
    } catch (error: any) {
      if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
        console.log(`  ⏭️  ${conta.nome} (já existe)`);
      } else {
        console.error(`  ❌ ${conta.nome}: ${error.message}`);
      }
    }
  }

  // 2. Criar pessoas associadas
  console.log('\n👥 Criando pessoas associadas...');
  for (const assoc of associados) {
    try {
      // Criar pessoa
      const [pessoa] = await db.insert(schema.pessoa).values({
        tipo: 'fisica',
        nome: assoc.nome,
        ativo: true,
      }).returning({ id: schema.pessoa.id });
      
      pessoaIdMap[assoc.nome] = pessoa.id;
      
      // Criar registro de associado
      await db.insert(schema.associado).values({
        pessoaId: pessoa.id,
        numeroRegistro: assoc.matricula || undefined,
        dataAdmissao: '2024-01-01',
        status: assoc.contribuicao > 0 ? 'ativo' : 'suspenso',
        categoria: 'trabalhador',
        valorContribuicaoSugerido: assoc.contribuicao > 0 ? String(assoc.contribuicao) : undefined,
        periodicidade: 'mensal',
        isento: assoc.contribuicao === 0,
        diaVencimento: 10,
      });
      
      console.log(`  ✅ ${assoc.nome} (matrícula: ${assoc.matricula || 'N/A'})`);
    } catch (error: any) {
      if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
        console.log(`  ⏭️  ${assoc.nome} (já existe)`);
      } else {
        console.error(`  ❌ ${assoc.nome}: ${error.message}`);
      }
    }
  }
  
  // 3. Criar pessoas não associadas
  console.log('\n👤 Criando pessoas não associadas...');
  for (const pessoa of naoAssociados) {
    // Pular se já existe como associado
    if (pessoaIdMap[pessoa.nome]) continue;
    
    try {
      const [result] = await db.insert(schema.pessoa).values({
        tipo: 'fisica',
        nome: pessoa.nome,
        ativo: true,
      }).returning({ id: schema.pessoa.id });
      
      pessoaIdMap[pessoa.nome] = result.id;
      console.log(`  ✅ ${pessoa.nome}`);
    } catch (error: any) {
      if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
        console.log(`  ⏭️  ${pessoa.nome} (já existe)`);
      } else {
        console.error(`  ❌ ${pessoa.nome}: ${error.message}`);
      }
    }
  }
  
  // 4. Criar títulos de contribuições
  console.log('\n💰 Criando títulos de contribuições...');
  let titulosCriados = 0;
  for (const contrib of titulosContribuicoes) {
    const pessoaId = pessoaIdMap[contrib.pessoa];
    if (!pessoaId) {
      console.log(`  ⚠️  Pessoa não encontrada: ${contrib.pessoa}`);
      continue;
    }
    
    try {
      await db.insert(schema.titulo).values({
        tipo: 'receber',
        natureza: 'contribuicao',
        pessoaId,
        descricao: `Contribuição ${contrib.data.substring(0, 7)}`,
        valorOriginal: String(contrib.valor),
        valorLiquido: String(contrib.valor),
        dataEmissao: contrib.data,
        dataCompetencia: contrib.data,
        dataVencimento: contrib.data,
        status: 'quitado',
      });
      titulosCriados++;
    } catch (error: any) {
      console.error(`  ❌ Título ${contrib.pessoa} ${contrib.data}: ${error.message}`);
    }
  }
  console.log(`  ✅ ${titulosCriados} títulos criados`);

  // 5. Criar períodos contábeis
  console.log('\n📅 Criando períodos contábeis 2025...');
  const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  for (let mes = 1; mes <= 12; mes++) {
    const ultimoDia = new Date(2025, mes, 0).getDate();
    try {
      await db.insert(schema.periodoContabil).values({
        ano: 2025,
        mes,
        dataInicio: `2025-${String(mes).padStart(2, '0')}-01`,
        dataFim: `2025-${String(mes).padStart(2, '0')}-${ultimoDia}`,
        status: mes <= 10 ? 'fechado' : 'aberto',
      });
      console.log(`  ✅ ${meses[mes - 1]} 2025`);
    } catch (error: any) {
      if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
        console.log(`  ⏭️  ${meses[mes - 1]} 2025 (já existe)`);
      } else {
        console.error(`  ❌ ${meses[mes - 1]} 2025: ${error.message}`);
      }
    }
  }

  console.log('\n✅ Seed finalizado!');
  console.log(`📊 Resumo:`);
  console.log(`   - Associados: ${associados.length}`);
  console.log(`   - Não associados: ${naoAssociados.length}`);
  console.log(`   - Contas financeiras: ${contasFinanceiras.length}`);
  console.log(`   - Títulos: ${titulosCriados}`);
  console.log(`   - Períodos: 12 meses`);
}

seed().catch(console.error);

