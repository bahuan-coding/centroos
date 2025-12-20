# Inputs CRUD Consolidados - Schemas Zod

## Para o Contador

Este documento é uma **referência técnica** que consolida todas as validações de entrada de dados do sistema. Ele é útil para:

- Entender quais campos são obrigatórios em cada tela
- Saber os limites de caracteres e valores aceitos
- Consultar as regras de validação aplicadas
- Identificar erros de preenchimento antes de salvar

**Nota:** Este documento é mais técnico que os outros. Se você precisa de explicações sobre o funcionamento de cada módulo, consulte os documentos específicos (01 a 07).

---

## Glossário de Termos de Validação

| Termo | Significado | Exemplo |
|-------|-------------|---------|
| **Obrigatório** | Campo que deve ser preenchido | Nome da pessoa |
| **Opcional** | Campo que pode ficar vazio | Observações |
| **min(X)** | Mínimo de X caracteres ou valor mínimo X | Nome deve ter pelo menos 3 letras |
| **max(X)** | Máximo de X caracteres ou valor máximo X | Descrição até 500 caracteres |
| **uuid** | Identificador único do sistema | Seleção de pessoa, conta, etc. |
| **regex** | Formato específico exigido | Data no formato AAAA-MM-DD |
| **enum** | Lista de opções válidas | Tipo: "física" ou "jurídica" |
| **positive** | Valor maior que zero | Valor do título |
| **nullable** | Pode ser vazio (null) | Para limpar um campo |
| **default** | Valor padrão se não informado | Status inicial = "rascunho" |

---

## Mensagens de Erro Comuns

| Erro | Significado | O que fazer |
|------|-------------|-------------|
| "Campo obrigatório" | Campo em branco | Preencha o campo |
| "Mínimo X caracteres" | Texto muito curto | Digite mais caracteres |
| "Máximo X caracteres" | Texto muito longo | Resuma o texto |
| "Valor deve ser positivo" | Número zero ou negativo | Digite valor maior que zero |
| "Formato de data inválido" | Data em formato errado | Use AAAA-MM-DD (2025-01-15) |
| "E-mail inválido" | E-mail mal formatado | Verifique o @ e domínio |
| "CPF/CNPJ inválido" | Dígitos verificadores errados | Confira o documento |
| "Este código já está em uso" | Duplicidade | Use outro código |
| "Saldo insuficiente" | Fundo sem recursos | Verifique o saldo disponível |

---

## Resumo de Campos por Módulo

### Módulo A - Identidades

| Entidade | Campos Obrigatórios | Principais Validações |
|----------|--------------------|-----------------------|
| **Pessoa** | tipo, nome | Nome: 3-255 chars; CPF/CNPJ único |
| **Associado** | pessoaId, dataAdmissao, status, categoria, periodicidade | Data: formato AAAA-MM-DD |
| **Consentimento** | pessoaId, tipoTratamento, baseLegal, consentido | - |
| **Papel** | pessoaId, papelTipo, dataInicio | Data: formato AAAA-MM-DD |

### Módulo B - Caixa/Bancos

| Entidade | Campos Obrigatórios | Principais Validações |
|----------|--------------------|-----------------------|
| **Conta Financeira** | tipo, nome, dataSaldoInicial | Nome: 3-100 chars |
| **Extrato** | contaFinanceiraId, arquivoTipo, arquivoBase64, arquivoNome | Tipos: ofx, csv, txt, pdf |
| **Conciliação** | extratoLinhaId, tipoVinculo | - |

### Módulo C - Pagar/Receber

| Entidade | Campos Obrigatórios | Principais Validações |
|----------|--------------------|-----------------------|
| **Título** | tipo, natureza, descricao, valorOriginal, dataEmissao, dataCompetencia, dataVencimento | Valor > 0; Datas: AAAA-MM-DD |
| **Baixa** | tituloId, contaFinanceiraId, dataPagamento, valorPago, formaPagamento | Valor > 0 |
| **Anexo** | entidadeTipo, entidadeId, arquivoBase64, nomeArquivo, tipoArquivo | Nome: até 255 chars |

### Módulo D - Contabilidade

| Entidade | Campos Obrigatórios | Principais Validações |
|----------|--------------------|-----------------------|
| **Plano Contas** | codigo, nome, tipo, naturezaSaldo, classificacao, aceitaLancamento | Nome: 3-255 chars |
| **Período** | ano, mes | Ano: 2000-2100; Mês: 1-12 |
| **Lançamento** | periodoId, dataLancamento, dataCompetencia, historico, origem, linhas (min 2) | Histórico: 10-1000 chars |

### Módulo E - Projetos/Fundos

| Entidade | Campos Obrigatórios | Principais Validações |
|----------|--------------------|-----------------------|
| **Centro Custo** | codigo, nome | Nome: 3-100 chars |
| **Projeto** | codigo, nome | Se MROSC: requer termo e órgão |
| **Fundo** | codigo, nome, tipo | Tipos: restrito, designado, livre |
| **Consumo Fundo** | fundoId, valor, dataConsumo, justificativa | Justificativa: 10-1000 chars |

### Módulo F - Patrimônio

| Entidade | Campos Obrigatórios | Principais Validações |
|----------|--------------------|-----------------------|
| **Bem Patrimonial** | codigo, descricao, categoria, dataAquisicao, valorAquisicao, vidaUtilMeses, contaAtivoId | Vida útil: 1-600 meses |
| **Baixa Bem** | id, dataBaixa, status, motivoBaixa | Motivo: 10-1000 chars |

### Módulo G - Governança

| Entidade | Campos Obrigatórios | Principais Validações |
|----------|--------------------|-----------------------|
| **Usuário** | authProviderId, email, nome | E-mail único; Nome: 2-255 chars |
| **Papel** | codigo, nome, nivel | Código: lowercase + underline; Nível: 1-100 |
| **Aprovação** | entidadeTipo, entidadeId | - |

---

## Checklist de Validação por Operação

### Antes de Criar Pessoa

- [ ] Tipo selecionado (Física ou Jurídica)
- [ ] Nome com pelo menos 3 caracteres
- [ ] CPF/CNPJ não duplicado no sistema
- [ ] Pelo menos um contato marcado como principal (se informado)

### Antes de Criar Título

- [ ] Tipo selecionado (Pagar ou Receber)
- [ ] Natureza selecionada
- [ ] Descrição com pelo menos 3 caracteres
- [ ] Valor original maior que zero
- [ ] Datas no formato correto (AAAA-MM-DD)
- [ ] Data de vencimento >= data de emissão

### Antes de Registrar Baixa

- [ ] Título existe e está aprovado
- [ ] Conta financeira selecionada
- [ ] Data de pagamento no formato correto
- [ ] Valor pago maior que zero
- [ ] Forma de pagamento selecionada

### Antes de Criar Lançamento

- [ ] Período selecionado e aberto
- [ ] Datas no formato correto
- [ ] Histórico com pelo menos 10 caracteres
- [ ] Mínimo 2 linhas (débito e crédito)
- [ ] Total de débitos = total de créditos

### Antes de Consumir Fundo

- [ ] Fundo selecionado e ativo
- [ ] Valor maior que zero
- [ ] Justificativa com pelo menos 10 caracteres
- [ ] Saldo disponível suficiente
- [ ] Categoria da despesa permitida pelo fundo

### Antes de Cadastrar Bem

- [ ] Código único (não duplicado)
- [ ] Descrição com pelo menos 3 caracteres
- [ ] Categoria selecionada
- [ ] Valor de aquisição maior que zero
- [ ] Vida útil entre 1 e 600 meses
- [ ] Se deprecia: contas contábeis configuradas

---

## Dúvidas Frequentes sobre Validação

### "Por que minha data não é aceita?"

O sistema espera datas no formato **AAAA-MM-DD** (ano com 4 dígitos, mês e dia com 2 dígitos). Exemplos:
- Correto: 2025-01-15
- Incorreto: 15/01/2025

### "Qual o tamanho mínimo para campos de texto?"

Varia por campo:
- **Nome de pessoa**: 3 caracteres
- **Descrição de título**: 3 caracteres
- **Histórico de lançamento**: 10 caracteres
- **Justificativa de consumo de fundo**: 10 caracteres
- **Motivo de baixa/inativação**: 10 caracteres

### "O que significa 'uuid' nos campos?"

UUID é o identificador único do sistema. Quando você seleciona uma pessoa, conta, ou outro registro em um dropdown, o sistema usa o UUID internamente. Você não precisa digitar UUIDs.

### "Por que não consigo salvar com valor zero?"

Campos de valor financeiro (títulos, baixas, bens) exigem valores **positivos** (maior que zero). Se precisar registrar algo sem valor, verifique se é o tipo correto de operação.

### "O que é 'nullable'?"

Significa que o campo pode receber valor nulo (vazio). Usado para "limpar" um campo que tinha valor. Diferente de opcional: um campo opcional pode não ser enviado, um campo nullable pode ser explicitamente limpo.

---

## Índice

1. [Módulo A - Identidades](#módulo-a---identidades)
2. [Módulo B - Caixa/Bancos](#módulo-b---caixabancos)
3. [Módulo C - Pagar/Receber](#módulo-c---pagarreceber)
4. [Módulo D - Contabilidade](#módulo-d---contabilidade)
5. [Módulo E - Projetos/Fundos](#módulo-e---projetosfundos)
6. [Módulo F - Patrimônio](#módulo-f---patrimônio)
7. [Módulo G - Governança](#módulo-g---governança)

---

## Módulo A - Identidades

### Pessoa

```typescript
// CREATE
export const createPessoaInput = z.object({
  tipo: z.enum(['fisica', 'juridica']),
  nome: z.string().min(3).max(255),
  nomeFantasia: z.string().max(255).optional(),
  observacoes: z.string().optional(),
  documentos: z.array(z.object({
    tipo: z.enum(['cpf', 'cnpj', 'rg', 'ie', 'im']),
    numero: z.string().min(1).max(30),
  })).optional(),
  contatos: z.array(z.object({
    tipo: z.enum(['email', 'telefone', 'celular', 'whatsapp']),
    valor: z.string().max(320),
    principal: z.boolean().default(false),
  })).optional(),
  enderecos: z.array(z.object({
    tipo: z.enum(['residencial', 'comercial', 'correspondencia']),
    logradouro: z.string().max(255),
    numero: z.string().max(20).optional(),
    complemento: z.string().max(100).optional(),
    bairro: z.string().max(100).optional(),
    cidade: z.string().max(100),
    uf: z.string().length(2),
    cep: z.string().max(10).optional(),
    principal: z.boolean().default(false),
  })).optional(),
  associado: z.object({
    dataAdmissao: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    status: z.enum(['ativo', 'suspenso', 'desligado', 'falecido']),
    categoria: z.enum(['trabalhador', 'frequentador', 'benemerito', 'honorario']),
    periodicidade: z.enum(['mensal', 'trimestral', 'semestral', 'anual']),
    valorContribuicaoSugerido: z.number().positive().optional(),
    diaVencimento: z.number().min(1).max(28).optional(),
    isento: z.boolean().default(false),
    motivoIsencao: z.string().optional(),
    numeroRegistro: z.string().max(20).optional(),
  }).optional(),
});

// UPDATE
export const updatePessoaInput = z.object({
  id: z.string().uuid(),
  nome: z.string().min(3).max(255).optional(),
  nomeFantasia: z.string().max(255).nullable().optional(),
  observacoes: z.string().nullable().optional(),
  ativo: z.boolean().optional(),
});

// DELETE
export const deletePessoaInput = z.object({
  id: z.string().uuid(),
  motivo: z.string().min(10).max(500).optional(),
});
```

### Associado

```typescript
export const upsertAssociadoInput = z.object({
  pessoaId: z.string().uuid(),
  dataAdmissao: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(['ativo', 'suspenso', 'desligado', 'falecido']),
  categoria: z.enum(['trabalhador', 'frequentador', 'benemerito', 'honorario']),
  periodicidade: z.enum(['mensal', 'trimestral', 'semestral', 'anual']),
  numeroRegistro: z.string().max(20).optional(),
  dataDesligamento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  valorContribuicaoSugerido: z.number().positive().optional(),
  diaVencimento: z.number().min(1).max(28).optional(),
  isento: z.boolean().default(false),
  motivoIsencao: z.string().optional(),
});

export const alterarStatusAssociadoInput = z.object({
  id: z.string().uuid(),
  novoStatus: z.enum(['ativo', 'suspenso', 'desligado', 'falecido']),
  motivo: z.string().min(10).max(500),
  dataEfetivacao: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
```

### ConsentimentoLGPD

```typescript
export const registrarConsentimentoInput = z.object({
  pessoaId: z.string().uuid(),
  tipoTratamento: z.enum(['marketing', 'comunicacao', 'compartilhamento', 'dados_sensiveis']),
  baseLegal: z.enum(['consentimento', 'legitimo_interesse', 'obrigacao_legal', 'execucao_contrato']),
  consentido: z.boolean(),
  evidencia: z.string().optional(),
});

export const revogarConsentimentoInput = z.object({
  id: z.string().uuid(),
  motivo: z.string().optional(),
});
```

### PessoaPapel

```typescript
export const createPessoaPapelInput = z.object({
  pessoaId: z.string().uuid(),
  papelTipo: z.enum(['captador_doacao', 'administrador_financeiro', 'diretor', 'conselheiro', 'voluntario']),
  dataInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dataFim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  atoDesignacao: z.string().max(100).optional(),
  observacoes: z.string().optional(),
  dadosCaptador: z.object({
    regiaoAtuacao: z.string().max(100).optional(),
    metaCaptacaoAnual: z.number().positive().optional(),
  }).optional(),
  dadosAdminFinanceiro: z.object({
    responsabilidades: z.string().optional(),
    alcadaValorMaximo: z.number().positive().optional(),
    podeAprovarPagamentos: z.boolean().default(false),
    acessoContasBancarias: z.boolean().default(false),
    cargoEstatutario: z.boolean().default(false),
  }).optional(),
});

export const updatePessoaPapelInput = z.object({
  id: z.string().uuid(),
  dataFim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.enum(['ativo', 'suspenso', 'encerrado']).optional(),
  atoDesignacao: z.string().max(100).optional(),
  observacoes: z.string().optional(),
});
```

---

## Módulo B - Caixa/Bancos

### ContaFinanceira

```typescript
export const createContaFinanceiraInput = z.object({
  tipo: z.enum(['caixa', 'conta_corrente', 'poupanca', 'aplicacao', 'cartao']),
  nome: z.string().min(3).max(100),
  bancoCodigo: z.string().max(10).optional(),
  bancoNome: z.string().max(100).optional(),
  agencia: z.string().max(20).optional(),
  contaNumero: z.string().max(30).optional(),
  contaDigito: z.string().max(5).optional(),
  pixChave: z.string().max(100).optional(),
  pixTipo: z.enum(['cpf', 'cnpj', 'email', 'telefone', 'aleatoria']).optional(),
  saldoInicial: z.number().default(0),
  dataSaldoInicial: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  contaContabilId: z.string().uuid().optional(),
});

export const updateContaFinanceiraInput = z.object({
  id: z.string().uuid(),
  nome: z.string().min(3).max(100).optional(),
  pixChave: z.string().max(100).nullable().optional(),
  pixTipo: z.enum(['cpf', 'cnpj', 'email', 'telefone', 'aleatoria']).nullable().optional(),
  contaContabilId: z.string().uuid().nullable().optional(),
  ativo: z.boolean().optional(),
});

export const deleteContaFinanceiraInput = z.object({
  id: z.string().uuid(),
});
```

### ExtratoBancario

```typescript
export const uploadExtratoInput = z.object({
  contaFinanceiraId: z.string().uuid(),
  arquivoTipo: z.enum(['ofx', 'csv', 'txt', 'pdf']),
  arquivoBase64: z.string(),
  arquivoNome: z.string().max(255),
  configParser: z.object({
    separador: z.string().default(';'),
    colunaData: z.number().default(0),
    colunaDescricao: z.number().default(1),
    colunaValor: z.number().default(2),
    colunaTipo: z.number().optional(),
    formatoData: z.string().default('DD/MM/YYYY'),
    linhasIgnorar: z.number().default(0),
  }).optional(),
});

export const deleteExtratoInput = z.object({
  id: z.string().uuid(),
  forcarExclusao: z.boolean().default(false),
});
```

### Conciliação

```typescript
export const conciliarManualInput = z.object({
  extratoLinhaId: z.string().uuid(),
  tipoVinculo: z.enum(['titulo', 'lancamento_manual', 'tarifa', 'rendimento']),
  tituloId: z.string().uuid().optional(),
  novoTitulo: z.object({
    tipo: z.enum(['pagar', 'receber']),
    natureza: z.enum(['contribuicao', 'doacao', 'evento', 'convenio', 'servico', 'utilidade', 'taxa', 'imposto', 'material', 'outros']),
    descricao: z.string().max(500),
    pessoaId: z.string().uuid().optional(),
    contaContabilId: z.string().uuid().optional(),
    centroCustoId: z.string().uuid().optional(),
  }).optional(),
  lancamentoManual: z.object({
    historico: z.string().max(500),
    contaDebitoId: z.string().uuid(),
    contaCreditoId: z.string().uuid(),
  }).optional(),
});

export const desconciliarInput = z.object({
  conciliacaoId: z.string().uuid(),
  motivo: z.string().min(10).max(500),
});
```

---

## Módulo C - Pagar/Receber

### Titulo

```typescript
export const createTituloInput = z.object({
  tipo: z.enum(['pagar', 'receber']),
  natureza: z.enum(['contribuicao', 'doacao', 'evento', 'convenio', 'servico', 'utilidade', 'taxa', 'imposto', 'material', 'outros']),
  descricao: z.string().min(3).max(500),
  valorOriginal: z.number().positive(),
  valorDesconto: z.number().min(0).default(0),
  valorAcrescimo: z.number().min(0).default(0),
  dataEmissao: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dataCompetencia: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dataVencimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  numeroDocumento: z.string().max(100).optional(),
  serieDocumento: z.string().max(20).optional(),
  pessoaId: z.string().uuid().optional(),
  centroCustoId: z.string().uuid().optional(),
  projetoId: z.string().uuid().optional(),
  fundoId: z.string().uuid().optional(),
  contaContabilId: z.string().uuid().optional(),
  status: z.enum(['rascunho', 'pendente_aprovacao', 'aprovado']).default('rascunho'),
  observacoes: z.string().optional(),
  parcelamento: z.object({
    totalParcelas: z.number().min(2).max(60),
    intervaloMeses: z.number().min(1).default(1),
    valorPrimeiraParcela: z.number().positive().optional(),
  }).optional(),
});

export const updateTituloInput = z.object({
  id: z.string().uuid(),
  descricao: z.string().min(3).max(500).optional(),
  valorDesconto: z.number().min(0).optional(),
  valorAcrescimo: z.number().min(0).optional(),
  dataVencimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  pessoaId: z.string().uuid().nullable().optional(),
  centroCustoId: z.string().uuid().nullable().optional(),
  projetoId: z.string().uuid().nullable().optional(),
  fundoId: z.string().uuid().nullable().optional(),
  contaContabilId: z.string().uuid().nullable().optional(),
  observacoes: z.string().nullable().optional(),
});

export const deleteTituloInput = z.object({
  id: z.string().uuid(),
  acao: z.enum(['cancelar', 'excluir']),
  motivo: z.string().min(10).max(500),
});

export const aprovarTituloInput = z.object({
  id: z.string().uuid(),
  observacao: z.string().max(500).optional(),
});
```

### TituloBaixa

```typescript
export const createBaixaInput = z.object({
  tituloId: z.string().uuid(),
  contaFinanceiraId: z.string().uuid(),
  dataPagamento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  valorPago: z.number().positive(),
  formaPagamento: z.enum(['dinheiro', 'pix', 'ted', 'doc', 'boleto', 'debito', 'credito', 'cheque']),
  valorJuros: z.number().min(0).default(0),
  valorMulta: z.number().min(0).default(0),
  valorDesconto: z.number().min(0).default(0),
  documentoReferencia: z.string().max(100).optional(),
  gerarLancamento: z.boolean().default(true),
});

export const estornarBaixaInput = z.object({
  baixaId: z.string().uuid(),
  motivo: z.string().min(10).max(500),
  dataEstorno: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const baixaLoteInput = z.object({
  contaFinanceiraId: z.string().uuid(),
  dataPagamento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  formaPagamento: z.enum(['dinheiro', 'pix', 'ted', 'doc', 'boleto', 'debito', 'credito', 'cheque']),
  titulos: z.array(z.object({
    tituloId: z.string().uuid(),
    valorPago: z.number().positive(),
    documentoReferencia: z.string().max(100).optional(),
  })).min(1).max(100),
});
```

### Anexo

```typescript
export const uploadAnexoInput = z.object({
  entidadeTipo: z.enum(['titulo', 'baixa', 'lancamento', 'pessoa', 'bem']),
  entidadeId: z.string().uuid(),
  arquivoBase64: z.string(),
  nomeArquivo: z.string().max(255),
  tipoArquivo: z.string().max(100),
  categoria: z.enum(['nota_fiscal', 'recibo', 'comprovante', 'contrato', 'outros']).optional(),
  descricao: z.string().max(500).optional(),
});

export const deleteAnexoInput = z.object({
  id: z.string().uuid(),
});
```

---

## Módulo D - Contabilidade

### PlanoContas

```typescript
export const createPlanoContasInput = z.object({
  codigo: z.string().min(1).max(20),
  nome: z.string().min(3).max(255),
  tipo: z.enum(['ativo', 'passivo', 'patrimonio_social', 'receita', 'despesa']),
  naturezaSaldo: z.enum(['devedora', 'credora']),
  classificacao: z.enum(['sintetica', 'analitica']),
  contaPaiId: z.string().uuid().optional(),
  aceitaLancamento: z.boolean(),
  descricao: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const updatePlanoContasInput = z.object({
  id: z.string().uuid(),
  nome: z.string().min(3).max(255).optional(),
  descricao: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  ativo: z.boolean().optional(),
  codigo: z.string().min(1).max(20).optional(),
});

export const deletePlanoContasInput = z.object({
  id: z.string().uuid(),
});
```

### PeriodoContabil

```typescript
export const createPeriodoContabilInput = z.object({
  ano: z.number().min(2000).max(2100),
  mes: z.number().min(1).max(12),
  observacoes: z.string().optional(),
});

export const fecharPeriodoInput = z.object({
  id: z.string().uuid(),
  observacoes: z.string().optional(),
});

export const reabrirPeriodoInput = z.object({
  id: z.string().uuid(),
  motivoReabertura: z.string().min(20).max(1000),
});
```

### LancamentoContabil

```typescript
export const createLancamentoInput = z.object({
  periodoId: z.string().uuid(),
  dataLancamento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dataCompetencia: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  historico: z.string().min(10).max(1000),
  origem: z.enum(['manual', 'baixa', 'extrato', 'depreciacao', 'fechamento', 'ajuste']),
  origemId: z.string().uuid().optional(),
  linhas: z.array(z.object({
    contaId: z.string().uuid(),
    tipo: z.enum(['debito', 'credito']),
    valor: z.number().positive(),
    historicoComplementar: z.string().max(500).optional(),
    centroCustoId: z.string().uuid().optional(),
    projetoId: z.string().uuid().optional(),
    fundoId: z.string().uuid().optional(),
  })).min(2),
  status: z.enum(['rascunho', 'efetivado']).default('rascunho'),
});

export const lancamentoSimplesInput = z.object({
  periodoId: z.string().uuid(),
  dataLancamento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  historico: z.string().min(10).max(1000),
  contaDebitoId: z.string().uuid(),
  contaCreditoId: z.string().uuid(),
  valor: z.number().positive(),
  centroCustoId: z.string().uuid().optional(),
  projetoId: z.string().uuid().optional(),
  fundoId: z.string().uuid().optional(),
  efetivar: z.boolean().default(true),
});

export const estornarLancamentoInput = z.object({
  id: z.string().uuid(),
  motivo: z.string().min(10).max(500),
  dataEstorno: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
```

---

## Módulo E - Projetos/Fundos

### CentroCusto

```typescript
export const createCentroCustoInput = z.object({
  codigo: z.string().min(1).max(20),
  nome: z.string().min(3).max(100),
  descricao: z.string().optional(),
  responsavelId: z.string().uuid().optional(),
});

export const updateCentroCustoInput = z.object({
  id: z.string().uuid(),
  nome: z.string().min(3).max(100).optional(),
  descricao: z.string().nullable().optional(),
  responsavelId: z.string().uuid().nullable().optional(),
  ativo: z.boolean().optional(),
});
```

### Projeto

```typescript
export const createProjetoInput = z.object({
  codigo: z.string().min(1).max(20),
  nome: z.string().min(3).max(200),
  descricao: z.string().optional(),
  dataInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dataFimPrevista: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  orcamentoPrevisto: z.number().positive().optional(),
  status: z.enum(['planejamento', 'em_andamento', 'suspenso', 'concluido', 'cancelado']).default('planejamento'),
  centroCustoId: z.string().uuid().optional(),
  responsavelId: z.string().uuid().optional(),
  parceriaMrosc: z.boolean().default(false),
  numeroTermoParceria: z.string().max(50).optional(),
  orgaoParceiro: z.string().max(200).optional(),
});

export const updateProjetoInput = z.object({
  id: z.string().uuid(),
  nome: z.string().min(3).max(200).optional(),
  descricao: z.string().nullable().optional(),
  dataFimPrevista: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  orcamentoPrevisto: z.number().positive().optional(),
  responsavelId: z.string().uuid().nullable().optional(),
  status: z.enum(['planejamento', 'em_andamento', 'suspenso', 'concluido', 'cancelado']).optional(),
  dataFimReal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
```

### Fundo

```typescript
export const createFundoInput = z.object({
  codigo: z.string().min(1).max(20),
  nome: z.string().min(3).max(200),
  descricao: z.string().optional(),
  tipo: z.enum(['restrito', 'designado', 'livre']),
  finalidade: z.string().optional(),
  dataInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dataLimite: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  metaValor: z.number().positive().optional(),
  saldoInicial: z.number().min(0).default(0),
  regras: z.array(z.object({
    tipoRegra: z.enum(['percentual_receita', 'categoria_permitida', 'categoria_proibida', 'valor_maximo', 'aprovador_obrigatorio']),
    parametroTexto: z.string().optional(),
    parametroNumerico: z.number().optional(),
    parametroLista: z.array(z.string()).optional(),
  })).optional(),
});

export const consumirFundoInput = z.object({
  fundoId: z.string().uuid(),
  valor: z.number().positive(),
  dataConsumo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  justificativa: z.string().min(10).max(1000),
  tituloId: z.string().uuid().optional(),
  lancamentoLinhaId: z.string().uuid().optional(),
});
```

---

## Módulo F - Patrimônio

### BemPatrimonial

```typescript
export const createBemPatrimonialInput = z.object({
  codigo: z.string().min(1).max(30),
  descricao: z.string().min(3).max(500),
  categoria: z.enum(['imovel', 'veiculo', 'equipamento', 'mobiliario', 'informatica', 'outro']),
  dataAquisicao: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  valorAquisicao: z.number().positive(),
  fornecedorId: z.string().uuid().optional(),
  numeroNotaFiscal: z.string().max(50).optional(),
  tituloAquisicaoId: z.string().uuid().optional(),
  valorResidual: z.number().min(0).default(0),
  vidaUtilMeses: z.number().min(1).max(600),
  metodoDepreciacao: z.enum(['linear', 'nenhum']).default('linear'),
  contaAtivoId: z.string().uuid(),
  contaDepreciacaoId: z.string().uuid().optional(),
  contaDepreciacaoAcumId: z.string().uuid().optional(),
  localizacao: z.string().max(200).optional(),
  responsavelId: z.string().uuid().optional(),
  projetoId: z.string().uuid().optional(),
  fundoId: z.string().uuid().optional(),
});

export const baixarBemInput = z.object({
  id: z.string().uuid(),
  dataBaixa: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(['baixado', 'alienado', 'perdido']),
  motivoBaixa: z.string().min(10).max(1000),
  valorBaixa: z.number().min(0).optional(),
});
```

---

## Módulo G - Governança

### Usuario

```typescript
export const createUsuarioInput = z.object({
  authProviderId: z.string().min(1).max(100),
  email: z.string().email().max(320),
  nome: z.string().min(2).max(255),
  avatarUrl: z.string().url().optional(),
  papeis: z.array(z.object({
    papelId: z.string().uuid(),
    dataInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  })).optional(),
});

export const atribuirPapelUsuarioInput = z.object({
  usuarioId: z.string().uuid(),
  papelId: z.string().uuid(),
  dataInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dataFim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
```

### Papel e Permissao

```typescript
export const createPapelInput = z.object({
  codigo: z.string().min(3).max(50).regex(/^[a-z_]+$/),
  nome: z.string().min(3).max(100),
  descricao: z.string().optional(),
  nivel: z.number().min(1).max(100),
  permissoes: z.array(z.string().uuid()).optional(),
});

export const createPermissaoInput = z.object({
  codigo: z.string().min(5).max(100).regex(/^[a-z]+\.[a-z_]+\.[a-z_]+$/),
  nome: z.string().min(3).max(200),
  modulo: z.string().min(1).max(50),
});
```

### Aprovacao

```typescript
export const criarAprovacaoInput = z.object({
  entidadeTipo: z.enum(['titulo', 'lancamento', 'fundo_consumo']),
  entidadeId: z.string().uuid(),
  nivelAprovacao: z.number().min(1).default(1),
});

export const decidirAprovacaoInput = z.object({
  id: z.string().uuid(),
  decisao: z.enum(['aprovado', 'rejeitado']),
  observacao: z.string().max(1000).optional(),
});
```

### ConfiguracaoSistema

```typescript
export const atualizarConfiguracaoInput = z.object({
  chave: z.string().min(1).max(100),
  valor: z.any(),
  descricao: z.string().optional(),
});
```

---

## Resumo de Inputs por Operação

| Módulo | Create | Update | Delete | Outros |
|--------|--------|--------|--------|--------|
| A - Identidades | 5 | 4 | 2 | 3 |
| B - Caixa/Bancos | 3 | 1 | 2 | 2 |
| C - Pagar/Receber | 4 | 1 | 2 | 4 |
| D - Contabilidade | 4 | 2 | 1 | 3 |
| E - Projetos/Fundos | 3 | 2 | 0 | 1 |
| F - Patrimônio | 1 | 1 | 0 | 1 |
| G - Governança | 4 | 1 | 0 | 2 |
| **TOTAL** | **24** | **12** | **7** | **16** |

---

## Próximos Passos

1. Criar arquivo `server/schemas/` com todos os inputs
2. Implementar routers pendentes
3. Criar testes de validação
4. Implementar UI de formulários
