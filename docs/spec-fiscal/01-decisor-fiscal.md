# Decisor Fiscal - Logica de Roteamento

> Versao: 1.0.0 | Data: 2025-12-24
> Status: SPEC FINAL - Pronto para implementacao

---

## 1. Objetivo

O **Decisor Fiscal** determina, de forma **deterministica**, qual documento fiscal deve ser emitido para uma operacao. Nao ha heuristica: todas as decisoes sao baseadas em regras explicitas.

---

## 2. Entrada do Decisor

```typescript
interface DecisaoFiscalInput {
  // Tipo de operacao
  tipoOperacao: 'SERVICO' | 'MERCADORIA' | 'MISTO';
  
  // Partes envolvidas
  emitente: {
    cpfCnpj: string;
    uf: string;           // UF do emitente
    codigoMunicipio: string; // IBGE 7 digitos
    inscricaoEstadual?: string;
    inscricaoMunicipal?: string;
    regimeTributario: 'SIMPLES' | 'LUCRO_PRESUMIDO' | 'LUCRO_REAL' | 'MEI';
  };
  
  destinatario: {
    tipo: 'PJ' | 'PF' | 'ESTRANGEIRO';
    cpfCnpj?: string;
    uf?: string;
    codigoMunicipio?: string;
    isConsumidorFinal: boolean;
  };
  
  // Contexto da operacao
  localVenda: 'PRESENCIAL' | 'INTERNET' | 'TELEFONE' | 'DOMICILIO';
  valorTotal: number;
  
  // Servico (se aplicavel)
  servico?: {
    codigoLC116: string;      // Ex: "01.08" (LC 116/2003)
    codigoTribNacional?: string; // cTribNac 6 digitos
  };
  
  // Mercadoria (se aplicavel)
  mercadoria?: {
    ncm: string;
    cfop: string;
  };
}
```

---

## 3. Saida do Decisor

```typescript
interface DecisaoFiscalOutput {
  tipoDocumento: 'NFSE_SP' | 'NFSE_NACIONAL' | 'NFE' | 'NFCE';
  motivo: string;
  regras: string[]; // IDs das regras aplicadas
}
```

---

## 4. Arvore de Decisao

```
                          +------------------+
                          |  tipoOperacao?   |
                          +--------+---------+
                                   |
              +--------------------+--------------------+
              |                    |                    |
              v                    v                    v
        +-----+-----+        +-----+-----+        +-----+-----+
        |  SERVICO  |        | MERCADORIA|        |   MISTO   |
        +-----+-----+        +-----+-----+        +-----+-----+
              |                    |                    |
              v                    v                    v
        Fluxo NFS-e          Fluxo NF-e/NFC-e      Emitir NFe
                                                  (item misto)
```

---

## 5. Regras de Decisao - Servicos (NFS-e)

### 5.1 Fluxograma

```
+------------------+
|    SERVICO       |
+--------+---------+
         |
         v
+--------+---------+
| emitente.mun =   |
| Sao Paulo (SP)?  |
+--------+---------+
         |
    +----+----+
    |         |
    v         v
  [SIM]     [NAO]
    |         |
    v         v
+---------+ +------------------+
| NFSE_SP | | municipio        |
+---------+ | conveniado ADN?  |
            +--------+---------+
                     |
                +----+----+
                |         |
                v         v
              [SIM]     [NAO]
                |         |
                v         v
         +----------+ +----------+
         | NFSE_ADN | | NFSE_SP  |
         +----------+ | (fallback|
                      | municipal)|
                      +----------+
```

### 5.2 Regras Detalhadas

| ID | Condicao | Documento | Prioridade |
|----|----------|-----------|------------|
| R-SVC-01 | emitente.codigoMunicipio = 3550308 (Sao Paulo) | NFSE_SP | 1 |
| R-SVC-02 | municipio conveniado ao SN NFS-e | NFSE_NACIONAL | 2 |
| R-SVC-03 | Fallback: usar API municipal propria | ERRO (nao suportado) | 3 |

### 5.3 Verificacao de Convenio

```typescript
// Consultar se municipio esta conveniado ao SN NFS-e
const isMunicipioConveniado = async (codigoMunicipio: string): Promise<boolean> => {
  // Cache local (atualizado periodicamente)
  const convenio = await getMunicipioConvenio(codigoMunicipio);
  return convenio?.ativo === true;
};
```

---

## 6. Regras de Decisao - Mercadorias (NF-e/NFC-e)

### 6.1 Fluxograma

```
+------------------+
|   MERCADORIA     |
+--------+---------+
         |
         v
+--------+---------+
| destinatario     |
| consumidorFinal? |
+--------+---------+
         |
    +----+----+
    |         |
    v         v
  [SIM]     [NAO]
    |         |
    v         v
+--------+  +--------+
|localVenda| |  NFE   |
|PRESENCIAL|  +--------+
|ou valor  |
|<= limite?|
+----+-----+
     |
+----+----+
|         |
v         v
[SIM]   [NAO]
|         |
v         v
+------+ +------+
| NFCE | | NFE  |
+------+ +------+
```

### 6.2 Regras Detalhadas

| ID | Condicao | Documento | Prioridade |
|----|----------|-----------|------------|
| R-MER-01 | destinatario.isConsumidorFinal = false | NFE | 1 |
| R-MER-02 | destinatario.tipo = 'PJ' AND !consumidorFinal | NFE | 1 |
| R-MER-03 | destinatario.tipo = 'ESTRANGEIRO' | NFE (exportacao) | 1 |
| R-MER-04 | localVenda = 'PRESENCIAL' AND consumidorFinal | NFCE | 2 |
| R-MER-05 | localVenda != 'PRESENCIAL' AND consumidorFinal | NFE | 2 |
| R-MER-06 | valorTotal > limite_estadual_nfce | NFE | 2 |

### 6.3 Limites Estaduais NFC-e

| UF | Limite Valor NFC-e | Observacao |
|----|-------------------|------------|
| SP | Sem limite | - |
| RJ | Sem limite | - |
| MG | Sem limite | - |
| PR | Sem limite | - |
| RS | Sem limite | - |
| ... | Verificar legislacao | Atualizar conforme UF |

---

## 7. Regras de Decisao - Operacoes Mistas

### 7.1 Definicao

Operacao mista: venda de mercadoria COM prestacao de servico vinculada.

### 7.2 Regra Unica

| ID | Condicao | Acao |
|----|----------|------|
| R-MIX-01 | tipoOperacao = 'MISTO' | Emitir NFE com item de servico |

**Justificativa**: NF-e modelo 55 permite itens de servico (CFOP 5.933, 6.933) com ISSQN calculado. Evita emissao de dois documentos.

---

## 8. Matriz de Decisao Consolidada

| tipoOperacao | destinatario | consumidorFinal | localVenda | municipio | Documento |
|--------------|--------------|-----------------|------------|-----------|-----------|
| SERVICO | qualquer | - | - | SP capital | NFSE_SP |
| SERVICO | qualquer | - | - | conveniado | NFSE_NACIONAL |
| SERVICO | qualquer | - | - | nao conveniado | ERRO |
| MERCADORIA | PJ | false | - | - | NFE |
| MERCADORIA | PF/PJ | true | PRESENCIAL | - | NFCE |
| MERCADORIA | PF/PJ | true | INTERNET | - | NFE |
| MERCADORIA | ESTRANGEIRO | - | - | - | NFE |
| MISTO | qualquer | qualquer | qualquer | - | NFE |

---

## 9. Implementacao

```typescript
const decidirDocumentoFiscal = async (input: DecisaoFiscalInput): Promise<DecisaoFiscalOutput> => {
  const regrasAplicadas: string[] = [];
  
  // 1. Servico puro
  if (input.tipoOperacao === 'SERVICO') {
    // Sao Paulo capital
    if (input.emitente.codigoMunicipio === '3550308') {
      regrasAplicadas.push('R-SVC-01');
      return {
        tipoDocumento: 'NFSE_SP',
        motivo: 'Servico prestado em Sao Paulo capital',
        regras: regrasAplicadas,
      };
    }
    
    // Municipio conveniado ao SN NFS-e
    const conveniado = await isMunicipioConveniado(input.emitente.codigoMunicipio);
    if (conveniado) {
      regrasAplicadas.push('R-SVC-02');
      return {
        tipoDocumento: 'NFSE_NACIONAL',
        motivo: 'Servico em municipio conveniado ao SN NFS-e',
        regras: regrasAplicadas,
      };
    }
    
    // Nao suportado
    regrasAplicadas.push('R-SVC-03');
    throw new Error(`Municipio ${input.emitente.codigoMunicipio} nao suportado. Nao conveniado ao SN NFS-e.`);
  }
  
  // 2. Mercadoria
  if (input.tipoOperacao === 'MERCADORIA') {
    // Exportacao
    if (input.destinatario.tipo === 'ESTRANGEIRO') {
      regrasAplicadas.push('R-MER-03');
      return {
        tipoDocumento: 'NFE',
        motivo: 'Exportacao para destinatario estrangeiro',
        regras: regrasAplicadas,
      };
    }
    
    // B2B (nao consumidor final)
    if (!input.destinatario.isConsumidorFinal) {
      regrasAplicadas.push('R-MER-01');
      return {
        tipoDocumento: 'NFE',
        motivo: 'Venda para nao-consumidor final (B2B)',
        regras: regrasAplicadas,
      };
    }
    
    // Consumidor final
    if (input.destinatario.isConsumidorFinal) {
      // Venda presencial = NFC-e
      if (input.localVenda === 'PRESENCIAL') {
        regrasAplicadas.push('R-MER-04');
        return {
          tipoDocumento: 'NFCE',
          motivo: 'Venda presencial ao consumidor final',
          regras: regrasAplicadas,
        };
      }
      
      // Venda nao-presencial = NF-e
      regrasAplicadas.push('R-MER-05');
      return {
        tipoDocumento: 'NFE',
        motivo: 'Venda nao-presencial ao consumidor final',
        regras: regrasAplicadas,
      };
    }
  }
  
  // 3. Misto
  if (input.tipoOperacao === 'MISTO') {
    regrasAplicadas.push('R-MIX-01');
    return {
      tipoDocumento: 'NFE',
      motivo: 'Operacao mista (mercadoria + servico)',
      regras: regrasAplicadas,
    };
  }
  
  throw new Error('Nao foi possivel determinar o documento fiscal');
};
```

---

## 10. Cache de Municipios Conveniados

### 10.1 Estrutura

```typescript
interface MunicipioConvenio {
  codigoIBGE: string;
  nome: string;
  uf: string;
  ativo: boolean;
  dataAdesao: string;
}
```

### 10.2 Atualizacao

- Fonte: API de Parametrizacao do SN NFS-e
- Frequencia: Diaria ou sob demanda
- Fallback: Usar cache local se API indisponivel

---

## 11. Casos Especiais

### 11.1 MEI (Microempreendedor Individual)

| Cenario | Documento | Observacao |
|---------|-----------|------------|
| Venda de servico | NFSE_* | Normal |
| Venda de mercadoria B2C | NFCE | CRT=4 (NT 2024.001) |
| Venda de mercadoria B2B | NFE | CRT=4 |

### 11.2 Produtor Rural PF

| Cenario | Documento | Observacao |
|---------|-----------|------------|
| Venda de producao B2C | NFCE | NT 2023.002 |
| Venda de producao B2B | NFE | Nota de Produtor |

### 11.3 Simples Nacional

| Cenario | Documento | Observacao |
|---------|-----------|------------|
| Servico | NFSE_* | opSimpNac = 3 |
| Mercadoria | NFE/NFCE | CSOSN ao inves de CST |

---

## 12. Testes de Validacao do Decisor

| ID | Input | Output Esperado |
|----|-------|-----------------|
| D01 | SERVICO, SP capital | NFSE_SP |
| D02 | SERVICO, Belo Horizonte (conveniado) | NFSE_NACIONAL |
| D03 | MERCADORIA, B2B | NFE |
| D04 | MERCADORIA, consumidor final, presencial | NFCE |
| D05 | MERCADORIA, consumidor final, internet | NFE |
| D06 | MERCADORIA, exportacao | NFE |
| D07 | MISTO | NFE |

---

## 13. Extensibilidade

### 13.1 Novos Municipios Conveniados

Atualizacao automatica via cache de parametros.

### 13.2 Novos Tipos de Documento

Para adicionar CT-e, NF3-e, etc:
1. Adicionar tipo em `tipoDocumento`
2. Adicionar regras R-XXX-NN
3. Implementar integrador especifico



