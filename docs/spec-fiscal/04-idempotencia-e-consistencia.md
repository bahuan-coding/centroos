# Idempotencia e Consistencia

> Versao: 1.0.0 | Data: 2025-12-24
> Status: SPEC FINAL - Pronto para implementacao

---

## 1. Objetivo

Garantir que operacoes fiscais sejam **seguras para retry** e que o sistema mantenha **consistencia** mesmo em cenarios de falha de rede, timeout ou reprocessamento.

---

## 2. Principios

| Principio | Descricao |
|-----------|-----------|
| **Idempotencia** | Mesma operacao executada N vezes = mesmo resultado |
| **At-least-once** | Operacao sera executada pelo menos uma vez |
| **Consistencia eventual** | Sistema converge para estado correto |
| **Autoridade como verdade** | Estado na SEFAZ/Prefeitura sempre prevalece |

---

## 3. Estrategia de Idempotencia por Operacao

### 3.1 Emissao de Documento

```
+----------------+
| Gerar ID Unico |
| (idLocal)      |
+-------+--------+
        |
        v
+-------+--------+
| Verificar se   |
| ja existe      |
+-------+--------+
        |
   +----+----+
   |         |
   v         v
 [SIM]     [NAO]
   |         |
   v         v
+------+  +-------+
|Retorna|  |Emitir |
|exist. |  |novo   |
+------+  +-------+
```

### 3.2 Identificadores Unicos por Tipo

| Tipo | Identificador de Idempotencia | Componentes |
|------|------------------------------|-------------|
| NFS-e SP | `{ccm}_{serie}_{numeroRPS}` | CCM 8 dig + Serie 5 + Numero 12 |
| NFS-e ADN | `{cLocEmi}_{tpInsc}_{inscFed}_{serie}_{nDPS}` | IBGE 7 + Tipo 1 + CNPJ 14 + Serie 5 + Num 15 |
| NF-e | `{cUF}_{CNPJ}_{mod}_{serie}_{nNF}_{tpEmis}_{cNF}` | Chave de acesso 44 dig |
| NFC-e | Idem NF-e | Chave de acesso 44 dig |

### 3.3 Fluxo de Emissao Segura

```typescript
const emitirDocumentoSeguro = async (doc: DocumentoFiscal): Promise<ResultadoEmissao> => {
  const idLocal = gerarIdIdempotencia(doc);
  
  // 1. Verificar no banco local se ja foi processado
  const existenteLocal = await buscarPorIdLocal(idLocal);
  if (existenteLocal?.estado === 'AUTORIZADO') {
    return { sucesso: true, documento: existenteLocal, origem: 'cache' };
  }
  
  // 2. Salvar como TRANSMITIDO antes de enviar
  const registro = await salvarComoTransmitido(doc, idLocal);
  
  try {
    // 3. Transmitir para autoridade
    const resultado = await transmitir(doc);
    
    // 4. Atualizar estado baseado na resposta
    await atualizarEstado(registro.id, resultado);
    
    return { sucesso: true, documento: resultado };
    
  } catch (erro) {
    // 5. Em caso de timeout/erro, verificar na autoridade
    if (isTimeoutOrNetworkError(erro)) {
      return await conciliarComAutoridade(doc, idLocal);
    }
    
    throw erro;
  }
};
```

---

## 4. Verificacao Pre-Emissao

### 4.1 NFS-e SP

SP nao oferece endpoint de verificacao. Estrategia:
- Usar numero RPS unico por emissao
- Em caso de erro, consultar por periodo e verificar se existe

```typescript
const verificarEmissaoSP = async (params: { ccm: string; serie: string; numeroRPS: number }): Promise<boolean> => {
  // Consultar ultimas notas emitidas
  const ultimas = await consultarNFSePeriodo(
    new Date(Date.now() - 24 * 60 * 60 * 1000), // 24h atras
    new Date(),
  );
  
  // Verificar se alguma tem a mesma chave RPS
  return ultimas.notas.some(
    n => n.chaveRPS?.numeroRPS === String(params.numeroRPS) && 
         n.chaveRPS?.serieRPS === params.serie
  );
};
```

### 4.2 NFS-e Nacional (ADN)

```typescript
// HEAD /dps/{idDPS} retorna 200 se existe, 404 se nao
const verificarDPSExiste = async (idDPS: string): Promise<boolean> => {
  const response = await fetch(`${baseUrl}/dps/${idDPS}`, {
    method: 'HEAD',
    // mTLS...
  });
  return response.status === 200;
};

// Se existe, GET /dps/{idDPS} retorna a chaveAcesso
const obterChavePorDPS = async (idDPS: string): Promise<string | null> => {
  const response = await fetch(`${baseUrl}/dps/${idDPS}`);
  if (!response.ok) return null;
  const data = await response.json();
  return data.chaveAcesso;
};
```

### 4.3 NF-e / NFC-e

```typescript
// Consultar situacao da chave na SEFAZ
const consultarSituacaoNFe = async (chaveAcesso: string): Promise<SituacaoNFe> => {
  const xml = montarConsultaSituacao(chaveAcesso);
  const response = await enviarConsulta(xml);
  
  return {
    cStat: response.cStat,
    xMotivo: response.xMotivo,
    cUF: response.cUF,
    chNFe: response.chNFe,
    nProt: response.nProt,
  };
};

// cStat 100 = Autorizada
// cStat 101 = Cancelada
// cStat 135 = Nao existe
```

---

## 5. Estrategia de Retry

### 5.1 Decisao de Retry

```typescript
interface RetryConfig {
  maxTentativas: number;
  backoffBase: number; // ms
  backoffFator: number;
  maxBackoff: number;  // ms
}

const CONFIG_RETRY: RetryConfig = {
  maxTentativas: 3,
  backoffBase: 1000,
  backoffFator: 2,
  maxBackoff: 30000,
};

const calcularBackoff = (tentativa: number): number => {
  const delay = CONFIG_RETRY.backoffBase * Math.pow(CONFIG_RETRY.backoffFator, tentativa);
  return Math.min(delay, CONFIG_RETRY.maxBackoff);
};
```

### 5.2 Erros Retriaveis vs Definitivos

| Categoria | Codigo HTTP | Retry? | Acao |
|-----------|-------------|--------|------|
| Timeout | - | Sim | Verificar + retry |
| Rede | - | Sim | Backoff + retry |
| 5xx (Server Error) | 500-599 | Sim | Backoff + retry |
| 429 (Rate Limit) | 429 | Sim | Respeitar Retry-After |
| 4xx Validacao | 400, 422 | Nao | Corrigir payload |
| 4xx Auth | 401, 403 | Nao | Verificar certificado |
| 404 Not Found | 404 | Nao | Recurso inexistente |
| 409 Conflict | 409 | Nao | Ja processado (idempotente) |

### 5.3 Implementacao

```typescript
const executeWithRetry = async <T>(
  operation: () => Promise<T>,
  config: RetryConfig = CONFIG_RETRY,
): Promise<T> => {
  let ultimoErro: Error;
  
  for (let tentativa = 0; tentativa < config.maxTentativas; tentativa++) {
    try {
      return await operation();
    } catch (erro: any) {
      ultimoErro = erro;
      
      if (!isRetryable(erro)) {
        throw erro;
      }
      
      const delay = calcularBackoff(tentativa);
      console.log(`[Retry] Tentativa ${tentativa + 1}/${config.maxTentativas}, aguardando ${delay}ms`);
      await sleep(delay);
    }
  }
  
  throw ultimoErro!;
};

const isRetryable = (erro: any): boolean => {
  // Timeout ou erro de rede
  if (erro.code === 'ETIMEDOUT' || erro.code === 'ECONNRESET') return true;
  
  // HTTP 5xx
  if (erro.statusCode >= 500 && erro.statusCode < 600) return true;
  
  // Rate limit
  if (erro.statusCode === 429) return true;
  
  return false;
};
```

---

## 6. Conciliacao Pos-Falha

### 6.1 Fluxo de Conciliacao

```
+------------------+
| Operacao falhou  |
| (timeout/erro)   |
+--------+---------+
         |
         v
+--------+---------+
| Verificar na     |
| autoridade       |
+--------+---------+
         |
    +----+----+
    |         |
    v         v
 [EXISTE]  [NAO EXISTE]
    |         |
    v         v
+-------+  +-------+
|Atualizar| |Retry  |
|estado   | |emissao|
|local    | +-------+
+-------+
```

### 6.2 Conciliacao NFS-e ADN

```typescript
const conciliarNFSeADN = async (doc: DocumentoFiscal, idDPS: string): Promise<ResultadoEmissao> => {
  // 1. Verificar se DPS foi processada
  const existe = await verificarDPSExiste(idDPS);
  
  if (existe) {
    // 2. Obter chave e consultar documento
    const chave = await obterChavePorDPS(idDPS);
    if (chave) {
      const nfse = await consultarNFSe(chave);
      
      // 3. Atualizar estado local
      await atualizarDocumentoLocal(doc.id, {
        estado: 'AUTORIZADO',
        chaveAcesso: chave,
        dadosAutorizacao: nfse,
      });
      
      return { sucesso: true, documento: nfse, origem: 'conciliacao' };
    }
  }
  
  // 4. Se nao existe, pode tentar emitir novamente
  return await emitirNovo(doc);
};
```

### 6.3 Conciliacao NF-e/NFC-e

```typescript
const conciliarNFe = async (doc: DocumentoFiscal): Promise<ResultadoEmissao> => {
  const chave = montarChaveAcesso(doc);
  
  // 1. Consultar situacao na SEFAZ
  const situacao = await consultarSituacaoNFe(chave);
  
  switch (situacao.cStat) {
    case '100': // Autorizada
      await atualizarDocumentoLocal(doc.id, {
        estado: 'AUTORIZADO',
        chaveAcesso: chave,
        protocoloAutorizacao: situacao.nProt,
      });
      return { sucesso: true, origem: 'conciliacao' };
    
    case '101': // Cancelada
      await atualizarDocumentoLocal(doc.id, { estado: 'CANCELADO' });
      return { sucesso: false, motivo: 'Documento cancelado' };
    
    case '135': // Nao existe
      return await reemitir(doc);
    
    default:
      throw new Error(`Situacao inesperada: ${situacao.cStat} - ${situacao.xMotivo}`);
  }
};
```

---

## 7. Prevencao de Duplicidade

### 7.1 Lock Otimista

```typescript
interface DocumentoFiscalRecord {
  id: string;
  versao: number;  // Incrementa a cada update
  // ...
}

const atualizarComLock = async (id: string, dados: Partial<DocumentoFiscalRecord>): Promise<void> => {
  const atual = await buscar(id);
  
  const result = await db.update({
    where: { id, versao: atual.versao },
    data: { ...dados, versao: atual.versao + 1 },
  });
  
  if (result.count === 0) {
    throw new Error('Conflito de concorrencia - documento foi modificado');
  }
};
```

### 7.2 Unique Constraints

```sql
-- Garantir unicidade no banco
ALTER TABLE documentos_fiscais 
ADD CONSTRAINT uk_id_idempotencia UNIQUE (id_idempotencia);

-- Indice para consulta rapida
CREATE INDEX idx_df_chave_acesso ON documentos_fiscais(chave_acesso);
```

---

## 8. Cancelamento Seguro

### 8.1 Fluxo de Cancelamento Idempotente

```typescript
const cancelarDocumentoSeguro = async (id: string): Promise<ResultadoCancelamento> => {
  const doc = await buscar(id);
  
  // 1. Verificar se ja esta cancelado
  if (doc.estado === 'CANCELADO') {
    return { sucesso: true, mensagem: 'Documento ja estava cancelado', origem: 'cache' };
  }
  
  // 2. Verificar se pode ser cancelado
  if (!['AUTORIZADO'].includes(doc.estado)) {
    throw new Error(`Documento em estado ${doc.estado} nao pode ser cancelado`);
  }
  
  // 3. Marcar como CANCELAMENTO_PENDENTE
  await atualizarEstado(id, 'CANCELAMENTO_PENDENTE');
  
  try {
    // 4. Enviar cancelamento
    const resultado = await transmitirCancelamento(doc);
    
    // 5. Atualizar estado
    await atualizarEstado(id, 'CANCELADO', {
      dataCancelamento: new Date(),
      protocoloCancelamento: resultado.protocolo,
    });
    
    return { sucesso: true, mensagem: 'Cancelado com sucesso' };
    
  } catch (erro) {
    // 6. Em caso de falha, verificar na autoridade
    const situacao = await consultarSituacaoNaAutoridade(doc);
    
    if (situacao.estado === 'CANCELADO') {
      await atualizarEstado(id, 'CANCELADO');
      return { sucesso: true, origem: 'conciliacao' };
    }
    
    // Reverter para AUTORIZADO se cancelamento falhou
    await atualizarEstado(id, 'AUTORIZADO');
    throw erro;
  }
};
```

---

## 9. Consistencia de Numeracao

### 9.1 NFS-e SP - Numero RPS

```typescript
// Usar sequence do banco para garantir unicidade
const obterProximoNumeroRPS = async (orgId: string, serie: string): Promise<number> => {
  const result = await db.query(`
    SELECT nextval('seq_rps_${orgId}_${serie}')
  `);
  return result.rows[0].nextval;
};
```

### 9.2 NF-e/NFC-e - Numero NF

```typescript
// Controlar faixas de numeracao por serie
interface FaixaNumeracao {
  serie: number;
  ultimoNumero: number;
  bloqueado: boolean;
}

const obterProximoNumeroNF = async (orgId: string, serie: number): Promise<number> => {
  // Transacao para garantir atomicidade
  return await db.transaction(async (tx) => {
    const faixa = await tx.query(`
      SELECT * FROM faixas_numeracao 
      WHERE org_id = $1 AND serie = $2 
      FOR UPDATE
    `, [orgId, serie]);
    
    const proximo = faixa.ultimoNumero + 1;
    
    await tx.query(`
      UPDATE faixas_numeracao 
      SET ultimo_numero = $1 
      WHERE org_id = $2 AND serie = $3
    `, [proximo, orgId, serie]);
    
    return proximo;
  });
};
```

---

## 10. Tabela de Referencia Rapida

### 10.1 Operacoes e Idempotencia

| Operacao | Naturalmente Idempotente? | Estrategia |
|----------|---------------------------|------------|
| Emissao NFS-e SP | Nao | Numero RPS unico + verificacao |
| Emissao NFS-e ADN | Sim (idDPS) | HEAD /dps/{id} antes de retry |
| Emissao NF-e | Sim (chave) | Consulta situacao antes de retry |
| Cancelamento | Sim | Erro 409 se ja cancelado |
| Consulta | Sim | Sempre seguro para retry |

### 10.2 Timeouts Recomendados

| Operacao | Timeout | Retry |
|----------|---------|-------|
| Emissao | 60s | 3x com backoff |
| Consulta | 30s | 3x com backoff |
| Cancelamento | 60s | 3x com backoff |
| Inutilizacao | 60s | 3x com backoff |



