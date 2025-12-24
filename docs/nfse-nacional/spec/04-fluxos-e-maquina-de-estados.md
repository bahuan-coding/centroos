# Fluxos e Maquina de Estados - NFS-e Nacional

> Fonte: `markdown/manuais/manual-municipios-adn.md`, `xsd/sefin-adn/tiposEventos_v1.00.xsd`
> Versao: 1.0 | Data: 2025-12-24

---

## 1. Maquina de Estados da NFS-e

```
                    +------------------+
                    |     EMITIDA      |
                    |    (normal)      |
                    +--------+---------+
                             |
        +--------------------+--------------------+
        |                    |                    |
        v                    v                    v
+-------+-------+    +-------+-------+    +-------+-------+
|   CANCELADA   |    |  SUBSTITUIDA  |    |   BLOQUEADA   |
|  (e101101)    |    |  (e105102)    |    |  (e305102)    |
+---------------+    +-------+-------+    +-------+-------+
                             |                    |
                             v                    v
                     +-------+-------+    +-------+-------+
                     |    NOVA       |    |  DESBLOQUEADA |
                     |   NFS-e       |    |  (e305103)    |
                     +---------------+    +---------------+
```

### 1.1 Estados Possiveis

| Estado | Codigo | Descricao |
|--------|--------|-----------|
| EMITIDA | normal | NFS-e valida, sem eventos modificadores |
| CANCELADA | cancelada | NFS-e cancelada por evento |
| SUBSTITUIDA | substituida | NFS-e substituida por outra |
| BLOQUEADA | bloqueada | NFS-e com bloqueio de oficio (municipio) |

### 1.2 Transicoes de Estado

| De | Para | Evento | Autor |
|----|------|--------|-------|
| EMITIDA | CANCELADA | e101101 | Contribuinte |
| EMITIDA | CANCELADA | e105104 | Municipio (analise fiscal) |
| EMITIDA | CANCELADA | e305101 | Municipio (oficio) |
| EMITIDA | SUBSTITUIDA | e105102 | Sistema (DPS substituta) |
| EMITIDA | BLOQUEADA | e305102 | Municipio |
| BLOQUEADA | EMITIDA | e305103 | Municipio |

---

## 2. Eventos do Sistema

### 2.1 Eventos de Cancelamento

| Codigo | Nome | Autor | Descricao |
|--------|------|-------|-----------|
| e101101 | Cancelamento de NFS-e | Contribuinte | Cancelamento normal |
| e105102 | Cancelamento por Substituicao | Sistema | Automatico na substituicao |
| e101103 | Solicitacao Analise Fiscal | Contribuinte | Pede analise ao municipio |
| e105104 | Cancelamento Deferido | Municipio | Aprova analise fiscal |
| e105105 | Cancelamento Indeferido | Municipio | Rejeita analise fiscal |
| e305101 | Cancelamento por Oficio | Municipio | Cancelamento administrativo |

### 2.2 Eventos de Manifestacao

| Codigo | Nome | Autor | Efeito |
|--------|------|-------|--------|
| e202201 | Confirmacao Prestador | Prestador | Confirma prestacao |
| e203202 | Confirmacao Tomador | Tomador | Confirma recebimento |
| e204203 | Confirmacao Intermediario | Intermediario | Confirma intermediacao |
| e205204 | Confirmacao Tacita | Sistema | Automatica apos prazo |
| e202205 | Rejeicao Prestador | Prestador | Contesta NFS-e |
| e203206 | Rejeicao Tomador | Tomador | Contesta NFS-e |
| e204207 | Rejeicao Intermediario | Intermediario | Contesta NFS-e |
| e205208 | Anulacao Rejeicao | Municipio | Anula rejeicao anterior |

### 2.3 Eventos de Bloqueio

| Codigo | Nome | Autor | Efeito |
|--------|------|-------|--------|
| e305102 | Bloqueio por Oficio | Municipio | Bloqueia eventos especificos |
| e305103 | Desbloqueio por Oficio | Municipio | Desbloqueia evento |

---

## 3. Fluxo de Emissao

```
Contribuinte                 API                    SEFIN
     |                        |                       |
     |-- POST /nfse (DPS) --->|                       |
     |                        |-- Valida Schema ----->|
     |                        |<-- OK/Erro -----------|
     |                        |-- Valida Negocio ---->|
     |                        |<-- OK/Erro -----------|
     |                        |-- Gera NFS-e -------->|
     |                        |<-- NFS-e + Chave -----|
     |<-- Response (NFS-e) ---|                       |
     |                        |-- Compartilha ADN --->|
```

### 3.1 Validacoes na Emissao

1. **Validacao Schema**: XML compativel com DPS_v1.00.xsd
2. **Validacao Certificado**: Certificado ICP-Brasil valido
3. **Validacao Municipio**: Municipio conveniado e ativo
4. **Validacao Contribuinte**: Prestador cadastrado (CNC ou RFB)
5. **Validacao Servico**: Codigo tributacao valido
6. **Validacao Valores**: Calculos corretos

---

## 4. Fluxo de Substituicao

```
Contribuinte                 API                    SEFIN
     |                        |                       |
     |-- POST /nfse (DPS     |                       |
     |   com chSubstda) ---->|                       |
     |                        |-- Valida NFS-e       |
     |                        |   original ---------->|
     |                        |<-- OK (existe) ------|
     |                        |-- Gera Evento        |
     |                        |   e105102 ----------->|
     |                        |-- Gera Nova NFS-e -->|
     |<-- Response (Nova     |                       |
     |    NFS-e) ------------|                       |
```

### 4.1 Requisitos para Substituicao

- NFS-e original deve existir e estar EMITIDA
- Mesmo prestador da NFS-e original
- Codigo de motivo (cMotivo) obrigatorio:
  - 01: Desenquadramento Simples Nacional
  - 02: Enquadramento Simples Nacional
  - 03: Inclusao retroativa imunidade/isencao
  - 04: Exclusao retroativa imunidade/isencao
  - 05: Rejeicao pelo tomador/intermediario
  - 99: Outros

---

## 5. Fluxo de Cancelamento

### 5.1 Cancelamento Direto (e101101)

```
Contribuinte                 API                    SEFIN
     |                        |                       |
     |-- POST /eventos       |                       |
     |   (e101101) --------->|                       |
     |                        |-- Valida NFS-e       |
     |                        |   (existe, normal) ->|
     |                        |<-- OK ---------------|
     |                        |-- Valida Prazo ----->|
     |                        |<-- OK/Erro ---------|
     |                        |-- Gera Evento ------>|
     |<-- Response (Evento) -|                       |
```

### 5.2 Cancelamento com Analise Fiscal

```
Contribuinte      Municipio        API           SEFIN
     |               |              |              |
     |-- e101103 --->|              |              |
     |   (Solicita) -+------------->|              |
     |               |              |-- Registra ->|
     |               |              |              |
     |               |-- e105104 -->|              |
     |               |   (Defere)   |-- Cancela -->|
     |               |              |              |
     |<-- Cancelada -+--------------+--------------+
```

---

## 6. Idempotencia

### 6.1 Identificador Unico da DPS

Formato: `{cLocEmi(7)}{tpInsc(1)}{inscFed(14)}{serie(5)}{nDPS(15)}`

| Componente | Tamanho | Descricao |
|------------|---------|-----------|
| cLocEmi | 7 | Codigo IBGE municipio |
| tpInsc | 1 | 1=CNPJ, 2=CPF |
| inscFed | 14 | CNPJ (14) ou CPF (11 + 000) |
| serie | 5 | Serie da DPS |
| nDPS | 15 | Numero da DPS |

### 6.2 Verificacao Pre-Emissao

```typescript
// Antes de emitir, verificar se DPS ja foi processada
const verificarDPS = async (idDPS: string): Promise<boolean> => {
  const response = await fetch(`${baseUrl}/dps/${idDPS}`, {
    method: 'HEAD',
    // certificado...
  });
  return response.status === 200; // true = ja existe
};
```

### 6.3 Estrategia de Retry Seguro

```
1. Tentar emissao
2. Se timeout ou erro 5xx:
   a. Aguardar backoff
   b. Verificar HEAD /dps/{id}
   c. Se 200: consultar GET /dps/{id} para obter chave
   d. Se 404: retry emissao
3. Maximo 3 tentativas
```

---

## 7. Consistencia e Conciliacao

### 7.1 Consulta Pos-Emissao

Apos receber resposta de sucesso, confirmar:

```typescript
const confirmarEmissao = async (chaveAcesso: string): Promise<NFSe> => {
  const response = await fetch(`${baseUrl}/nfse/${chaveAcesso}`);
  return response.json();
};
```

### 7.2 Distribuicao por NSU

Para municipios/contribuintes receberem notas:

```typescript
let ultimoNSU = await getUltimoNSU();

while (true) {
  const response = await fetch(`${baseUrl}/DFe/${ultimoNSU}`);
  const { documentos, maxNSU } = await response.json();
  
  for (const doc of documentos) {
    await processarDocumento(doc);
  }
  
  if (ultimoNSU === maxNSU) {
    // Sem mais documentos, aguardar 1 hora
    await sleep(3600000);
  }
  
  ultimoNSU = maxNSU;
}
```

---

## 8. Regras de Negocio Importantes

### 8.1 Ordem Cronologica no Compartilhamento

O ADN exige ordem cronologica para documentos relacionados:

1. NFS-e original **antes** de evento de cancelamento
2. NFS-e original + evento e105102 **antes** de NFS-e substituta

### 8.2 Bloqueio de Eventos

Municipio pode bloquear eventos especificos:
- Um bloqueio por tipo de evento
- Desbloqueio referencia o bloqueio anterior
- Bloqueio duplicado e rejeitado

### 8.3 Prazo de Cancelamento

**LACUNA**: Prazo maximo nao especificado na documentacao.
Verificar parametros municipais ou assumir regra do municipio.

