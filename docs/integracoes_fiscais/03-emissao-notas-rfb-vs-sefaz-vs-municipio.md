# Emissão de Notas: RFB vs SEFAZ vs Município

## Entendendo as Responsabilidades

Um dos pontos mais confusos no ecossistema fiscal brasileiro é entender qual órgão é responsável por cada tipo de documento fiscal. Este documento esclarece as responsabilidades e fluxos.

---

## 1. Visão Geral dos Documentos Fiscais

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    DOCUMENTOS FISCAIS ELETRÔNICOS                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  PRODUTOS (ICMS)              SERVIÇOS (ISS)           TRANSPORTE        │
│  ┌─────────────┐             ┌─────────────┐          ┌─────────────┐   │
│  │   NF-e      │             │   NFS-e     │          │   CT-e      │   │
│  │  (modelo 55)│             │             │          │             │   │
│  └──────┬──────┘             └──────┬──────┘          └──────┬──────┘   │
│         │                           │                        │          │
│         ▼                           ▼                        ▼          │
│    ┌─────────┐               ┌─────────────┐           ┌─────────┐     │
│    │  SEFAZ  │               │  Prefeitura │           │  SEFAZ  │     │
│    │Estadual │               │  Municipal  │           │Estadual │     │
│    └─────────┘               └─────────────┘           └─────────┘     │
│                                     │                                   │
│                                     ▼                                   │
│                              ┌─────────────┐                            │
│                              │ NFS-e       │                            │
│                              │ Nacional    │                            │
│                              │ (padrão RFB)│                            │
│                              └─────────────┘                            │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Matriz de Responsabilidades

| Documento | Imposto | Competência | Órgão Receptor | Web Service |
|-----------|---------|-------------|----------------|-------------|
| **NF-e** | ICMS | Estadual | SEFAZ | Portal NF-e |
| **NFC-e** | ICMS | Estadual | SEFAZ | Portal NF-e |
| **NFS-e** | ISS | Municipal | Prefeitura | Próprio ou Nacional |
| **CT-e** | ICMS | Estadual | SEFAZ | Portal CT-e |
| **MDF-e** | -- | Estadual | SEFAZ | Portal MDF-e |

---

## 3. NF-e - Nota Fiscal Eletrônica (Produtos)

### 3.1 Quando Usar

A NF-e é utilizada para:
- Venda de **produtos/mercadorias**
- Operações que envolvem **ICMS** (Imposto sobre Circulação de Mercadorias)
- Operações interestaduais
- Industrialização

### 3.2 Não Aplicável Para

- Prestação de serviços puros (usar NFS-e)
- Empresas sem Inscrição Estadual
- Microempreendedor Individual - MEI (em alguns casos)

### 3.3 Órgão Responsável

**SEFAZ Estadual** - Cada estado tem sua Secretaria da Fazenda

```
Fluxo de Autorização NF-e:

  Empresa                   SEFAZ                    Destinatário
     │                        │                           │
     │  1. Gera XML NF-e      │                           │
     │  2. Assina com cert.   │                           │
     │─────────────────────▶  │                           │
     │                        │  3. Valida                │
     │                        │  4. Autoriza              │
     │  5. Protocolo         │                           │
     │◀─────────────────────  │                           │
     │                        │                           │
     │  6. DANFE + XML ───────────────────────────────▶   │
     │                        │                           │
```

### 3.4 Credenciamento

Para emitir NF-e, a empresa precisa:

1. **Inscrição Estadual** ativa na SEFAZ do estado
2. **Credenciamento** como emissor de NF-e
3. **Certificado Digital** e-CNPJ (ICP-Brasil)
4. **Software emissor** homologado

### 3.5 Aplicabilidade para Paycubed

| Critério | Análise |
|----------|---------|
| Tipo de empresa | Prestadora de serviços de TI |
| Vende produtos físicos? | Não (apenas software/serviços) |
| Tem Inscrição Estadual? | Verificar |
| **Necessita NF-e?** | **Provavelmente NÃO** |

---

## 4. NFS-e - Nota Fiscal de Serviços Eletrônica

### 4.1 Quando Usar

A NFS-e é utilizada para:
- Prestação de **serviços**
- Operações sujeitas ao **ISS** (Imposto Sobre Serviços)
- Consultorias, desenvolvimento de software, manutenção, etc.

### 4.2 Órgão Responsável

**Prefeitura Municipal** - O ISS é um imposto municipal

```
Fluxo de Autorização NFS-e:

  Empresa                  Prefeitura               Tomador
     │                        │                        │
     │  1. Gera RPS*          │                        │
     │  2. Converte para NFS-e│                        │
     │  3. Assina (opcional)  │                        │
     │─────────────────────▶  │                        │
     │                        │  4. Valida             │
     │                        │  5. Gera número/código │
     │  6. NFS-e autorizada   │                        │
     │◀─────────────────────  │                        │
     │                        │                        │
     │  7. PDF/XML ────────────────────────────────▶   │
     │                        │                        │

* RPS = Recibo Provisório de Serviços
```

### 4.3 O Problema: Cada Município tem seu Próprio Sistema

Antes do padrão nacional, cada prefeitura tinha:
- Seu próprio layout de XML
- Seus próprios endpoints
- Suas próprias regras

Exemplos de sistemas diferentes:
- São Paulo: Nota Fiscal Paulistana
- Rio de Janeiro: Nota Carioca
- Belo Horizonte: BHISS Digital
- Curitiba: ISS Curitiba

### 4.4 A Solução: NFS-e Nacional

Em 2022, a RFB em conjunto com prefeituras criou o **Ambiente de Dados Nacional (ADN)**:

- **Padrão único** de layout XML
- **API unificada** para todos os municípios aderentes
- **Gradual**: Municípios aderem voluntariamente

**Status atual (2024):** +2.000 municípios aderentes

```
NFS-e Nacional - Arquitetura:

  Empresa              ADN (RFB)           Município          Tomador
     │                    │                    │                 │
     │  1. Envia DPS      │                    │                 │
     │───────────────────▶│                    │                 │
     │                    │  2. Valida         │                 │
     │                    │  3. Gera NFS-e     │                 │
     │                    │  4. Notifica ─────▶│                 │
     │  5. Retorna NFS-e  │                    │                 │
     │◀───────────────────│                    │                 │
     │                    │                    │                 │
     │  6. PDF/XML ────────────────────────────────────────────▶ │
     │                    │                    │                 │

DPS = Declaração de Prestação de Serviços
```

### 4.5 Aplicabilidade para Paycubed

| Critério | Análise |
|----------|---------|
| Tipo de empresa | Prestadora de serviços de TI |
| Presta serviços? | Sim |
| Município sede | Maceió/AL (verificar se aderiu ao nacional) |
| **Necessita NFS-e?** | **SIM** |
| Prioridade | **P0 - Crítica** |

---

## 5. Comparativo NF-e vs NFS-e

| Aspecto | NF-e | NFS-e |
|---------|------|-------|
| **Imposto** | ICMS (estadual) | ISS (municipal) |
| **Competência** | Estado | Município |
| **Órgão** | SEFAZ | Prefeitura |
| **Padronização** | Alta (nacional) | Variável (nacional em expansão) |
| **Autenticação** | Certificado ICP-Brasil | Certificado ou senha web |
| **Protocolo** | SOAP | SOAP ou REST |
| **Uso para serviços de TI** | Não | Sim |

---

## 6. Fluxo Completo: Empresa de TI Emitindo Nota

Para a Paycubed (empresa de TI), o fluxo típico seria:

```
1. Prestação do Serviço
   └─▶ Contrato de desenvolvimento de software

2. Faturamento
   └─▶ Sistema gera título a receber

3. Emissão de NFS-e
   └─▶ Integração com NFS-e Nacional ou Prefeitura

4. Registro Contábil
   └─▶ Receita + ISS a recolher

5. Recolhimento ISS
   └─▶ Guia de recolhimento municipal

6. Obrigações Acessórias
   └─▶ EFD-Contribuições (PIS/COFINS sobre serviços)
```

---

## 7. Alíquotas de ISS

O ISS varia de **2% a 5%** dependendo do serviço e município.

Para serviços de TI (CNAE 62.01-5):

| Município | Alíquota ISS |
|-----------|--------------|
| São Paulo | 2,9% a 5% |
| Rio de Janeiro | 5% |
| Belo Horizonte | 2% a 5% |
| Maceió | Verificar legislação local |

**Observação:** Alguns serviços de TI podem ter ISS retido pelo tomador.

---

## 8. Decisão de Integração para Paycubed

### 8.1 Cenário Atual

```
Paycubed Stack Financeiro LTDA
├── CNPJ: 63.552.022/0001-84
├── Tipo: Empresa de TI
├── Atividade: Desenvolvimento de software / Serviços financeiros
├── Município: Maceió/AL (presumido)
└── Documento fiscal necessário: NFS-e
```

### 8.2 Opções de Integração

| Opção | Descrição | Prós | Contras |
|-------|-----------|------|---------|
| **A. NFS-e Nacional** | API unificada | Padrão, futuro | Verificar se Maceió aderiu |
| **B. Prefeitura Maceió** | API específica | Garantido para AL | Implementação dedicada |
| **C. Híbrido** | Nacional + fallback | Cobertura total | Complexidade |

### 8.3 Recomendação

1. **Verificar** se Maceió/AL está no padrão NFS-e Nacional
2. **Se sim:** Implementar NFS-e Nacional (P0)
3. **Se não:** Implementar integração com Prefeitura de Maceió
4. **Futuro:** NFS-e Nacional tende a ser universal

---

## 9. E a Receita Federal?

### O que a RFB NÃO faz:
- Não autoriza NF-e (responsabilidade da SEFAZ)
- Não autoriza NFS-e (responsabilidade do Município)
- Não emite documentos fiscais

### O que a RFB faz:
- Define padrões (SPED, layout XML)
- Coordena o NFS-e Nacional (com municípios)
- Recebe informações consolidadas (SPED)
- Fiscaliza tributos federais (IR, PIS, COFINS)

---

## 10. Resumo para Implementação

```
┌─────────────────────────────────────────────────────────────────┐
│                    PAYCUBED - Prioridades                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  P0 - CRÍTICO                                                    │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ NFS-e (Nacional ou Maceió)                                  ││
│  │ - Obrigatório para faturar serviços                         ││
│  │ - Verificar adesão de Maceió ao nacional                    ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  P1 - IMPORTANTE (se aplicável)                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ NFS-e São Paulo (se operar em SP)                           ││
│  │ NFS-e Rio de Janeiro (se operar em RJ)                      ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  P2 - FUTURO (provavelmente não necessário)                      │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ NF-e (apenas se vender produtos físicos)                    ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 11. Referências

- [Portal NF-e - ENCAT](https://www.nfe.fazenda.gov.br)
- [NFS-e Nacional](https://www.gov.br/nfse)
- [Nota Fiscal Paulistana](https://nfe.prefeitura.sp.gov.br)
- [Lei Complementar 116/2003 - ISS](http://www.planalto.gov.br/ccivil_03/leis/lcp/lcp116.htm)

---

**Próximo:** [04-plano-implementacao-por-ondas.md](04-plano-implementacao-por-ondas.md) - Roadmap detalhado de implementação







