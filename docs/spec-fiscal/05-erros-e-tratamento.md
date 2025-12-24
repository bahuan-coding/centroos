# Erros e Tratamento

> Versao: 1.0.0 | Data: 2025-12-24
> Status: SPEC FINAL - Pronto para implementacao

---

## 1. Objetivo

Criar um **catalogo unificado de erros** do Motor Fiscal, com codigos internos padronizados, mapeamento para erros de cada autoridade, e definicao clara de acao esperada.

---

## 2. Estrutura de Erro

```typescript
interface ErroFiscal {
  // Identificacao
  codigo: string;           // Codigo interno (ex: "FISCAL-VAL-001")
  categoria: CategoriaErro;
  
  // Mensagens
  mensagem: string;         // Mensagem tecnica
  mensagemUsuario: string;  // Mensagem amigavel
  
  // Contexto
  tipoDocumento?: TipoDocumento;
  campo?: string;
  valorRecebido?: string;
  valorEsperado?: string;
  
  // Origem
  codigoAutoridade?: string; // Codigo original da SEFAZ/Prefeitura
  mensagemAutoridade?: string;
  
  // Acao
  recuperavel: boolean;
  acaoSugerida: string;
}

enum CategoriaErro {
  VALIDACAO = 'VALIDACAO',         // Erro no payload
  SCHEMA = 'SCHEMA',               // Erro de estrutura XML
  AUTENTICACAO = 'AUTENTICACAO',   // Certificado/credenciais
  AUTORIZACAO = 'AUTORIZACAO',     // Permissao negada
  REJEICAO = 'REJEICAO',           // Autoridade rejeitou
  DENEGACAO = 'DENEGACAO',         // Irregularidade fiscal
  AMBIENTE = 'AMBIENTE',           // Servico indisponivel
  TIMEOUT = 'TIMEOUT',             // Tempo excedido
  INTERNO = 'INTERNO',             // Erro do sistema
}
```

---

## 3. Catalogo de Erros Unificados

### 3.1 Erros de Validacao (FISCAL-VAL-xxx)

| Codigo | Mensagem | Recuperavel | Acao |
|--------|----------|-------------|------|
| FISCAL-VAL-001 | Campo obrigatorio ausente | Sim | Adicionar campo |
| FISCAL-VAL-002 | Formato de campo invalido | Sim | Corrigir formato |
| FISCAL-VAL-003 | Valor fora do range permitido | Sim | Ajustar valor |
| FISCAL-VAL-004 | CPF/CNPJ invalido | Sim | Corrigir documento |
| FISCAL-VAL-005 | Data invalida | Sim | Corrigir data |
| FISCAL-VAL-006 | Codigo de servico invalido | Sim | Usar codigo LC 116 |
| FISCAL-VAL-007 | Codigo NCM invalido | Sim | Verificar tabela NCM |
| FISCAL-VAL-008 | CFOP invalido | Sim | Verificar tabela CFOP |
| FISCAL-VAL-009 | Aliquota nao parametrizada | Sim | Consultar municipio |
| FISCAL-VAL-010 | Valores nao batem | Sim | Recalcular totais |

### 3.2 Erros de Schema (FISCAL-SCH-xxx)

| Codigo | Mensagem | Recuperavel | Acao |
|--------|----------|-------------|------|
| FISCAL-SCH-001 | XML mal formado | Sim | Corrigir estrutura |
| FISCAL-SCH-002 | Elemento desconhecido | Sim | Remover elemento |
| FISCAL-SCH-003 | Atributo obrigatorio ausente | Sim | Adicionar atributo |
| FISCAL-SCH-004 | Namespace incorreto | Sim | Corrigir namespace |
| FISCAL-SCH-005 | Ordem de elementos incorreta | Sim | Reordenar |

### 3.3 Erros de Autenticacao (FISCAL-AUT-xxx)

| Codigo | Mensagem | Recuperavel | Acao |
|--------|----------|-------------|------|
| FISCAL-AUT-001 | Certificado nao apresentado | Nao | Configurar certificado |
| FISCAL-AUT-002 | Certificado expirado | Nao | Renovar certificado |
| FISCAL-AUT-003 | Certificado revogado | Nao | Obter novo certificado |
| FISCAL-AUT-004 | Cadeia de certificacao invalida | Nao | Verificar cadeia ICP |
| FISCAL-AUT-005 | CNPJ do certificado diverge | Nao | Usar certificado correto |
| FISCAL-AUT-006 | Assinatura digital invalida | Sim | Reassinar XML |
| FISCAL-AUT-007 | Senha web invalida | Nao | Verificar credenciais |

### 3.4 Erros de Autorizacao (FISCAL-AZN-xxx)

| Codigo | Mensagem | Recuperavel | Acao |
|--------|----------|-------------|------|
| FISCAL-AZN-001 | Contribuinte nao cadastrado | Nao | Cadastrar no CNC/SEFAZ |
| FISCAL-AZN-002 | Contribuinte bloqueado | Nao | Contatar fiscalizacao |
| FISCAL-AZN-003 | Municipio nao conveniado | Nao | Usar API municipal |
| FISCAL-AZN-004 | Operacao nao permitida | Nao | Verificar permissoes |
| FISCAL-AZN-005 | Limite de emissao atingido | Nao | Aguardar periodo |

### 3.5 Erros de Rejeicao (FISCAL-REJ-xxx)

| Codigo | Mensagem | Recuperavel | Acao |
|--------|----------|-------------|------|
| FISCAL-REJ-001 | Documento ja autorizado | Nao | Usar documento existente |
| FISCAL-REJ-002 | Documento ja cancelado | Nao | Nao reprocessar |
| FISCAL-REJ-003 | Prazo de cancelamento expirado | Nao | Solicitar analise fiscal |
| FISCAL-REJ-004 | Evento duplicado | Nao | Idempotente, ignorar |
| FISCAL-REJ-005 | Chave de acesso invalida | Sim | Corrigir chave |
| FISCAL-REJ-006 | Numero de documento duplicado | Sim | Usar proximo numero |

### 3.6 Erros de Denegacao (FISCAL-DEN-xxx)

| Codigo | Mensagem | Recuperavel | Acao |
|--------|----------|-------------|------|
| FISCAL-DEN-001 | Emitente irregular | Nao | Regularizar situacao |
| FISCAL-DEN-002 | Destinatario irregular | Nao | Verificar cadastro |
| FISCAL-DEN-003 | IE do destinatario invalida | Nao | Corrigir IE |

### 3.7 Erros de Ambiente (FISCAL-AMB-xxx)

| Codigo | Mensagem | Recuperavel | Acao |
|--------|----------|-------------|------|
| FISCAL-AMB-001 | Servico indisponivel | Sim | Aguardar e retry |
| FISCAL-AMB-002 | Timeout na comunicacao | Sim | Verificar e retry |
| FISCAL-AMB-003 | Erro interno do servidor | Sim | Retry com backoff |
| FISCAL-AMB-004 | Manutencao programada | Sim | Aguardar janela |
| FISCAL-AMB-005 | Rate limit excedido | Sim | Respeitar Retry-After |

### 3.8 Erros Internos (FISCAL-INT-xxx)

| Codigo | Mensagem | Recuperavel | Acao |
|--------|----------|-------------|------|
| FISCAL-INT-001 | Erro de configuracao | Nao | Verificar config |
| FISCAL-INT-002 | Erro de banco de dados | Sim | Retry |
| FISCAL-INT-003 | Erro de parsing | Nao | Verificar resposta |
| FISCAL-INT-004 | Estado inconsistente | Nao | Conciliar com autoridade |

---

## 4. Mapeamento de Erros por Autoridade

### 4.1 NFS-e SP - Codigos de Erro

| Codigo SP | Mensagem SP | Codigo Interno |
|-----------|-------------|----------------|
| 1 | Erro na estrutura do arquivo | FISCAL-SCH-001 |
| 2 | Erro na estrutura do cabecalho | FISCAL-SCH-001 |
| 100 | Assinatura invalida | FISCAL-AUT-006 |
| 200 | CNPJ invalido | FISCAL-VAL-004 |
| 300 | Inscricao municipal invalida | FISCAL-VAL-001 |
| 400 | Serie RPS invalida | FISCAL-VAL-001 |
| 500 | Numero RPS invalido | FISCAL-VAL-001 |
| 600 | Data de emissao invalida | FISCAL-VAL-005 |
| 700 | Codigo de servico invalido | FISCAL-VAL-006 |
| 800 | Aliquota invalida | FISCAL-VAL-003 |
| 900 | Valor de servicos invalido | FISCAL-VAL-003 |
| 1000 | RPS ja convertido | FISCAL-REJ-001 |
| 1100 | NFS-e ja cancelada | FISCAL-REJ-002 |
| 1200 | Prazo de cancelamento expirado | FISCAL-REJ-003 |

### 4.2 NFS-e Nacional - Codigos HTTP

| HTTP | Categoria | Codigo Interno |
|------|-----------|----------------|
| 400 | Validacao | FISCAL-VAL-xxx |
| 401 | Autenticacao | FISCAL-AUT-xxx |
| 403 | Autorizacao | FISCAL-AZN-xxx |
| 404 | Recurso nao existe | FISCAL-REJ-005 |
| 409 | Conflito (duplicado) | FISCAL-REJ-004 |
| 422 | Regra de negocio | FISCAL-REJ-xxx |
| 429 | Rate limit | FISCAL-AMB-005 |
| 500 | Erro servidor | FISCAL-AMB-003 |
| 502 | Bad Gateway | FISCAL-AMB-001 |
| 503 | Indisponivel | FISCAL-AMB-001 |
| 504 | Gateway Timeout | FISCAL-AMB-002 |

### 4.3 NF-e/NFC-e - Codigos cStat

| cStat | Mensagem | Codigo Interno |
|-------|----------|----------------|
| 100 | Autorizado | - (sucesso) |
| 101 | Cancelamento homologado | - (sucesso) |
| 102 | Inutilizacao homologada | - (sucesso) |
| 135 | Evento registrado | - (sucesso) |
| 204 | Duplicidade de NF-e | FISCAL-REJ-001 |
| 206 | NF-e ja cancelada | FISCAL-REJ-002 |
| 218 | Rejeicao - chave invalida | FISCAL-REJ-005 |
| 301 | Uso denegado - IE emitente | FISCAL-DEN-001 |
| 302 | Uso denegado - IE destinatario | FISCAL-DEN-003 |
| 501 | Prazo de cancelamento expirado | FISCAL-REJ-003 |
| 539 | Duplicidade de evento | FISCAL-REJ-004 |
| 999 | Erro nao catalogado | FISCAL-INT-003 |

---

## 5. Tratamento de Erros

### 5.1 Handler Centralizado

```typescript
const tratarErroFiscal = (erro: any, contexto: ContextoOperacao): ErroFiscal => {
  // 1. Se ja e ErroFiscal, retornar
  if (erro instanceof ErroFiscal) {
    return erro;
  }
  
  // 2. Mapear erro da autoridade
  if (contexto.tipoDocumento === 'NFSE_SP') {
    return mapearErroSP(erro, contexto);
  }
  
  if (contexto.tipoDocumento === 'NFSE_NACIONAL') {
    return mapearErroADN(erro, contexto);
  }
  
  if (['NFE', 'NFCE'].includes(contexto.tipoDocumento)) {
    return mapearErroSEFAZ(erro, contexto);
  }
  
  // 3. Erro generico
  return {
    codigo: 'FISCAL-INT-001',
    categoria: CategoriaErro.INTERNO,
    mensagem: erro.message || 'Erro desconhecido',
    mensagemUsuario: 'Ocorreu um erro inesperado. Tente novamente.',
    recuperavel: false,
    acaoSugerida: 'Contatar suporte tecnico',
  };
};
```

### 5.2 Mapeador NFS-e SP

```typescript
const mapearErroSP = (erro: any, contexto: ContextoOperacao): ErroFiscal => {
  const codigoSP = extrairCodigoSP(erro);
  
  const mapa: Record<string, Partial<ErroFiscal>> = {
    '100': {
      codigo: 'FISCAL-AUT-006',
      categoria: CategoriaErro.AUTENTICACAO,
      mensagemUsuario: 'Assinatura digital invalida. Verifique o certificado.',
      recuperavel: true,
      acaoSugerida: 'Verificar certificado e reassinar',
    },
    '1000': {
      codigo: 'FISCAL-REJ-001',
      categoria: CategoriaErro.REJEICAO,
      mensagemUsuario: 'Este RPS ja foi convertido em NFS-e.',
      recuperavel: false,
      acaoSugerida: 'Consultar NFS-e existente',
    },
    // ... demais mapeamentos
  };
  
  const base = mapa[codigoSP] || {
    codigo: 'FISCAL-INT-003',
    categoria: CategoriaErro.INTERNO,
    recuperavel: false,
  };
  
  return {
    ...base,
    mensagem: erro.Descricao || erro.message,
    codigoAutoridade: codigoSP,
    mensagemAutoridade: erro.Descricao,
    tipoDocumento: 'NFSE_SP',
  } as ErroFiscal;
};
```

### 5.3 Mapeador NF-e/NFC-e

```typescript
const mapearErroSEFAZ = (erro: any, contexto: ContextoOperacao): ErroFiscal => {
  const cStat = erro.cStat || extrairCStat(erro);
  const xMotivo = erro.xMotivo || erro.message;
  
  // Denegacoes (301, 302)
  if (cStat >= 301 && cStat <= 302) {
    return {
      codigo: 'FISCAL-DEN-001',
      categoria: CategoriaErro.DENEGACAO,
      mensagem: xMotivo,
      mensagemUsuario: 'Documento denegado por irregularidade fiscal.',
      codigoAutoridade: String(cStat),
      mensagemAutoridade: xMotivo,
      recuperavel: false,
      acaoSugerida: 'Regularizar situacao cadastral',
    };
  }
  
  // Rejeicoes (200-599)
  if (cStat >= 200 && cStat < 600) {
    return {
      codigo: `FISCAL-REJ-${mapearCodigo(cStat)}`,
      categoria: CategoriaErro.REJEICAO,
      mensagem: xMotivo,
      mensagemUsuario: traduzirParaUsuario(xMotivo),
      codigoAutoridade: String(cStat),
      mensagemAutoridade: xMotivo,
      recuperavel: isRecuperavel(cStat),
      acaoSugerida: sugerirAcao(cStat),
    };
  }
  
  // Erro generico
  return {
    codigo: 'FISCAL-INT-003',
    categoria: CategoriaErro.INTERNO,
    mensagem: xMotivo,
    mensagemUsuario: 'Erro na comunicacao com a SEFAZ.',
    codigoAutoridade: String(cStat),
    mensagemAutoridade: xMotivo,
    recuperavel: true,
    acaoSugerida: 'Verificar e tentar novamente',
  };
};
```

---

## 6. Resposta Padronizada

### 6.1 Formato de Resposta de Erro

```typescript
interface RespostaErro {
  sucesso: false;
  erro: {
    codigo: string;
    categoria: string;
    mensagem: string;
    mensagemUsuario: string;
    detalhes?: {
      campo?: string;
      valorRecebido?: string;
      valorEsperado?: string;
      codigoAutoridade?: string;
      mensagemAutoridade?: string;
    };
    recuperavel: boolean;
    acaoSugerida: string;
  };
  correlationId: string;
  timestamp: string;
}
```

### 6.2 Exemplo de Resposta

```json
{
  "sucesso": false,
  "erro": {
    "codigo": "FISCAL-VAL-006",
    "categoria": "VALIDACAO",
    "mensagem": "Codigo de servico '99999' nao encontrado na LC 116/2003",
    "mensagemUsuario": "O codigo de servico informado nao e valido. Verifique a lista de servicos permitidos.",
    "detalhes": {
      "campo": "itens[0].servico.codigoLC116",
      "valorRecebido": "99999",
      "valorEsperado": "Codigo LC 116 valido (ex: 01.08)"
    },
    "recuperavel": true,
    "acaoSugerida": "Consultar tabela LC 116/2003 e corrigir o codigo"
  },
  "correlationId": "fiscal-1735012345-abc123",
  "timestamp": "2025-12-24T10:30:00-03:00"
}
```

---

## 7. Logs de Erro

### 7.1 Estrutura de Log

```typescript
interface LogErro {
  timestamp: string;
  level: 'error' | 'warn';
  correlationId: string;
  operacao: string;
  tipoDocumento: string;
  
  erro: {
    codigo: string;
    categoria: string;
    mensagem: string;
    codigoAutoridade?: string;
    stack?: string;
  };
  
  contexto: {
    documentoId?: string;
    chaveAcesso?: string;
    ambiente: string;
  };
}
```

### 7.2 Niveis de Log por Categoria

| Categoria | Nivel | Motivo |
|-----------|-------|--------|
| VALIDACAO | warn | Erro do usuario, corrigivel |
| SCHEMA | warn | Erro de desenvolvimento |
| AUTENTICACAO | error | Problema de configuracao |
| AUTORIZACAO | error | Problema de cadastro |
| REJEICAO | warn | Regra de negocio |
| DENEGACAO | error | Irregularidade fiscal |
| AMBIENTE | error | Servico externo |
| TIMEOUT | warn | Transiente |
| INTERNO | error | Bug do sistema |

---

## 8. Metricas de Erro

### 8.1 Contadores

```typescript
const metricas = {
  'fiscal_erro_total': Counter,           // Total de erros
  'fiscal_erro_categoria': Counter,       // Por categoria
  'fiscal_erro_tipo_documento': Counter,  // Por tipo de documento
  'fiscal_erro_recuperavel': Counter,     // Recuperaveis vs definitivos
};
```

### 8.2 Alertas

| Alerta | Condicao | Severidade |
|--------|----------|------------|
| Taxa de erro alta | erro/total > 5% em 5min | Warning |
| Erros de autenticacao | FISCAL-AUT-* > 0 | Critical |
| Denegacoes | FISCAL-DEN-* > 0 | Critical |
| Servico indisponivel | FISCAL-AMB-001 por 5min | Critical |



