# Maquina de Estados Unificada

> Versao: 1.0.0 | Data: 2025-12-24
> Status: SPEC FINAL - Pronto para implementacao

---

## 1. Objetivo

Definir uma **maquina de estados unica** aplicavel a todos os documentos fiscais (NFS-e, NF-e, NFC-e), com mapeamento especifico por tipo.

---

## 2. Estados Canonicos

```typescript
enum EstadoDocumentoFiscal {
  RASCUNHO = 'RASCUNHO',
  VALIDADO = 'VALIDADO',
  TRANSMITIDO = 'TRANSMITIDO',
  AUTORIZADO = 'AUTORIZADO',
  REJEITADO = 'REJEITADO',
  DENEGADO = 'DENEGADO',
  CANCELAMENTO_PENDENTE = 'CANCELAMENTO_PENDENTE',
  CANCELADO = 'CANCELADO',
  SUBSTITUIDO = 'SUBSTITUIDO',
  INUTILIZADO = 'INUTILIZADO',
}
```

### 2.1 Descricao dos Estados

| Estado | Descricao | Final? |
|--------|-----------|--------|
| RASCUNHO | Documento criado mas nao validado | Nao |
| VALIDADO | Passou validacao de schema e negocio local | Nao |
| TRANSMITIDO | Enviado para autoridade, aguardando resposta | Nao |
| AUTORIZADO | Aceito pela autoridade, valido fiscalmente | Nao |
| REJEITADO | Recusado pela autoridade, correcao necessaria | Sim |
| DENEGADO | Recusado definitivamente (irregularidade fiscal) | Sim |
| CANCELAMENTO_PENDENTE | Solicitacao de cancelamento em analise | Nao |
| CANCELADO | Cancelado com sucesso | Sim |
| SUBSTITUIDO | Substituido por outro documento | Sim |
| INUTILIZADO | Faixa de numeracao inutilizada | Sim |

---

## 3. Diagrama de Estados

```
                         +-------------+
                         |  RASCUNHO   |
                         +------+------+
                                |
                                | validar()
                                v
                         +------+------+
                         |  VALIDADO   |
                         +------+------+
                                |
                                | transmitir()
                                v
                         +------+------+
                         | TRANSMITIDO |
                         +------+------+
                                |
              +-----------------+-----------------+
              |                 |                 |
              v                 v                 v
       +------+------+   +------+------+   +------+------+
       | AUTORIZADO  |   | REJEITADO   |   |  DENEGADO   |
       +------+------+   +-------------+   +-------------+
              |                [FINAL]           [FINAL]
              |
   +----------+----------+----------+
   |          |          |          |
   v          v          v          v
+--+---+ +----+----+ +---+----+ +---+----+
|CANCEL| |CANCEL   | | SUBSTI | |EVENTOS |
|PEND  | |ADO      | | TUIDO  | |(outros)|
+--+---+ +---------+ +--------+ +--------+
   |       [FINAL]    [FINAL]
   v
+--+-------+
| CANCELADO|
+----------+
  [FINAL]
```

---

## 4. Transicoes Permitidas

### 4.1 Matriz de Transicoes

| De | Para | Evento | Condicao |
|----|------|--------|----------|
| RASCUNHO | VALIDADO | `validar` | Schema e regras OK |
| VALIDADO | TRANSMITIDO | `transmitir` | Assinatura OK |
| TRANSMITIDO | AUTORIZADO | `receber_autorizacao` | Resposta 100/200 |
| TRANSMITIDO | REJEITADO | `receber_rejeicao` | Resposta 3xx-9xx |
| TRANSMITIDO | DENEGADO | `receber_denegacao` | Resposta 301-302 |
| AUTORIZADO | CANCELAMENTO_PENDENTE | `solicitar_cancelamento` | Prazo valido |
| AUTORIZADO | CANCELADO | `confirmar_cancelamento` | Evento aceito |
| AUTORIZADO | SUBSTITUIDO | `substituir` | Nova nota emitida |
| CANCELAMENTO_PENDENTE | CANCELADO | `confirmar_cancelamento` | Municipio deferiu |
| CANCELAMENTO_PENDENTE | AUTORIZADO | `rejeitar_cancelamento` | Municipio indeferiu |

### 4.2 Estados Finais

| Estado | Significado |
|--------|-------------|
| REJEITADO | Documento invalido, pode ser corrigido e reenviado |
| DENEGADO | Documento permanentemente recusado |
| CANCELADO | Documento sem efeito fiscal |
| SUBSTITUIDO | Documento substituido por outro |
| INUTILIZADO | Numeracao invalida (apenas NF-e/NFC-e) |

---

## 5. Mapeamento por Tipo de Documento

### 5.1 NFS-e SP

| Estado Canonico | Estado SP | Condicao |
|-----------------|-----------|----------|
| RASCUNHO | - | Antes de emitir RPS |
| VALIDADO | - | RPS montado localmente |
| TRANSMITIDO | - | RPS enviado |
| AUTORIZADO | statusNFe = 'N' | NFS-e emitida |
| REJEITADO | Erro retornado | Codigo de erro |
| CANCELADO | statusNFe = 'C' | Apos cancelamento |

**Particularidades SP:**
- Nao possui estado DENEGADO
- Nao possui estado SUBSTITUIDO (usa cancelamento + nova emissao)
- Nao possui inutilizacao

### 5.2 NFS-e Nacional (ADN)

| Estado Canonico | Estado ADN | Evento ADN |
|-----------------|------------|------------|
| RASCUNHO | - | Antes de enviar DPS |
| VALIDADO | - | DPS montada localmente |
| TRANSMITIDO | - | DPS enviada |
| AUTORIZADO | normal | NFS-e gerada |
| REJEITADO | - | Erro de validacao |
| CANCELAMENTO_PENDENTE | - | e101103 enviado |
| CANCELADO | cancelada | e101101, e105104, e305101 |
| SUBSTITUIDO | substituida | e105102 |
| BLOQUEADO* | bloqueada | e305102 |

**Particularidades ADN:**
- Possui estado BLOQUEADO (municipio pode bloquear)
- Substituicao via novo documento com `chSubstda`

### 5.3 NF-e (Modelo 55)

| Estado Canonico | Estado SEFAZ | cStat |
|-----------------|--------------|-------|
| RASCUNHO | - | - |
| VALIDADO | - | - |
| TRANSMITIDO | Em processamento | - |
| AUTORIZADO | Autorizada | 100 |
| REJEITADO | Rejeitada | 2xx, 4xx-9xx |
| DENEGADO | Denegada | 301, 302 |
| CANCELADO | Cancelada | Evento 110111 |
| INUTILIZADO | Inutilizada | nfInut autorizada |

**Particularidades NF-e:**
- Estado DENEGADO para irregularidades do emitente/destinatario
- Inutilizacao de faixas de numeracao
- Eventos adicionais: CCe (110110), Manifestacao (210xxx)

### 5.4 NFC-e (Modelo 65)

| Estado Canonico | Estado SEFAZ | Observacao |
|-----------------|--------------|------------|
| RASCUNHO | - | - |
| VALIDADO | - | - |
| TRANSMITIDO | Em processamento | Incluindo contingencia offline |
| AUTORIZADO | Autorizada | cStat = 100 |
| REJEITADO | Rejeitada | cStat != 100 |
| CANCELADO | Cancelada | Evento 110111 |
| SUBSTITUIDO | Cancelada por substituicao | Evento 110112 |
| INUTILIZADO | Inutilizada | - |

**Particularidades NFC-e:**
- Cancelamento por substituicao (110112) especifico
- Contingencia offline com transmissao posterior
- EPEC em contingencia

---

## 6. Eventos por Estado

### 6.1 AUTORIZADO

| Evento | Tipo | Resultado |
|--------|------|-----------|
| Cancelamento | e110111 / e101101 | CANCELADO |
| Substituicao | e105102 / nova NF | SUBSTITUIDO |
| Carta de Correcao | e110110 | Permanece AUTORIZADO |
| Manifestacao | e210xxx | Permanece AUTORIZADO |
| Comprovante Entrega | e110130 | Permanece AUTORIZADO |

### 6.2 Eventos Informativos (Nao Mudam Estado)

| Documento | Eventos |
|-----------|---------|
| NFS-e ADN | Manifestacao tomador (e203202), Manifestacao prestador (e202201) |
| NF-e | Ciencia da operacao (210210), Confirmacao (210200), Desconhecimento (210220) |

---

## 7. Implementacao

### 7.1 Interface da Maquina de Estados

```typescript
interface MaquinaEstadoFiscal {
  estadoAtual: EstadoDocumentoFiscal;
  historico: TransicaoEstado[];
  
  podeTransitar(para: EstadoDocumentoFiscal): boolean;
  transitar(para: EstadoDocumentoFiscal, motivo: string): void;
  getTransicoesPermitidas(): EstadoDocumentoFiscal[];
}

interface TransicaoEstado {
  de: EstadoDocumentoFiscal;
  para: EstadoDocumentoFiscal;
  timestamp: Date;
  motivo: string;
  autor?: string;
  eventoFiscal?: string; // Codigo do evento (ex: e110111)
}
```

### 7.2 Validacao de Transicao

```typescript
const TRANSICOES_VALIDAS: Map<EstadoDocumentoFiscal, EstadoDocumentoFiscal[]> = new Map([
  [EstadoDocumentoFiscal.RASCUNHO, [EstadoDocumentoFiscal.VALIDADO]],
  [EstadoDocumentoFiscal.VALIDADO, [EstadoDocumentoFiscal.TRANSMITIDO, EstadoDocumentoFiscal.RASCUNHO]],
  [EstadoDocumentoFiscal.TRANSMITIDO, [
    EstadoDocumentoFiscal.AUTORIZADO,
    EstadoDocumentoFiscal.REJEITADO,
    EstadoDocumentoFiscal.DENEGADO,
  ]],
  [EstadoDocumentoFiscal.AUTORIZADO, [
    EstadoDocumentoFiscal.CANCELAMENTO_PENDENTE,
    EstadoDocumentoFiscal.CANCELADO,
    EstadoDocumentoFiscal.SUBSTITUIDO,
  ]],
  [EstadoDocumentoFiscal.CANCELAMENTO_PENDENTE, [
    EstadoDocumentoFiscal.CANCELADO,
    EstadoDocumentoFiscal.AUTORIZADO, // Se indeferido
  ]],
]);

const podeTransitar = (de: EstadoDocumentoFiscal, para: EstadoDocumentoFiscal): boolean => {
  const permitidos = TRANSICOES_VALIDAS.get(de) || [];
  return permitidos.includes(para);
};
```

### 7.3 Persistencia de Estado

```typescript
interface DocumentoFiscalRecord {
  id: string;
  tipoDocumento: 'NFSE_SP' | 'NFSE_NACIONAL' | 'NFE' | 'NFCE';
  estado: EstadoDocumentoFiscal;
  estadoAnterior?: EstadoDocumentoFiscal;
  ultimaTransicao: Date;
  
  // Identificadores externos
  chaveAcesso?: string;
  numeroProtocolo?: string;
  codigoVerificacao?: string;
  
  // Metadados
  criadoEm: Date;
  atualizadoEm: Date;
}
```

---

## 8. Prazos e Restricoes

### 8.1 Prazo de Cancelamento

| Documento | Prazo | Observacao |
|-----------|-------|------------|
| NFS-e SP | Indefinido | Verificar regras do municipio |
| NFS-e ADN | Parametrizado por municipio | Consultar API parametros |
| NF-e | 24 horas (operacao normal) ou 168h (evento) | Legislacao CONFAZ |
| NFC-e | 24 horas ou 30 min (contingencia) | Legislacao CONFAZ |

### 8.2 Restricoes por Estado

| Estado | Restricao |
|--------|-----------|
| REJEITADO | Pode corrigir e reemitir |
| DENEGADO | Nao pode reemitir sem resolver irregularidade |
| CANCELADO | Nao pode ser reativado |
| INUTILIZADO | Numeracao perdida |

---

## 9. Conciliacao de Estados

### 9.1 Estado Local vs Remoto

Em caso de divergencia entre estado local e estado na autoridade:

```typescript
const conciliarEstado = async (doc: DocumentoFiscalRecord): Promise<void> => {
  const estadoRemoto = await consultarEstadoNaAutoridade(doc);
  
  if (estadoRemoto !== doc.estado) {
    // Log divergencia
    log.warn('Divergencia de estado detectada', {
      id: doc.id,
      local: doc.estado,
      remoto: estadoRemoto,
    });
    
    // Autoridade sempre tem precedencia
    doc.estado = estadoRemoto;
    doc.ultimaTransicao = new Date();
    await salvar(doc);
  }
};
```

### 9.2 Frequencia de Conciliacao

| Cenario | Frequencia |
|---------|------------|
| Apos timeout em transmissao | Imediato |
| Documentos transmitidos ha > 5 min | A cada 5 min |
| Conciliacao diaria | 1x ao dia |

---

## 10. Auditoria de Estados

### 10.1 Campos Obrigatorios no Historico

```typescript
interface AuditoriaTransicao {
  documentoId: string;
  de: EstadoDocumentoFiscal;
  para: EstadoDocumentoFiscal;
  timestamp: Date;
  usuarioId?: string;
  ipOrigem?: string;
  motivo: string;
  eventoFiscal?: string;
  protocoloAutoridade?: string;
}
```

### 10.2 Retencao

- **Historico de transicoes**: 5 anos (legislacao fiscal)
- **Logs de auditoria**: 5 anos



