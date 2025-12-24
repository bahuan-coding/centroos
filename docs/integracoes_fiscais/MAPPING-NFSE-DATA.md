# Mapeamento de Dados NFS-e Nacional

> **Data**: Dezembro 2024  
> **Status**: Documentação para migração de dados  
> **Certificado Ativo**: Paycubed Stack Financeiro LTDA (e-CNPJ A1)

---

## 1. Dados Disponíveis via API NFS-e Nacional

### 1.1 Campos Retornados na Consulta de NFS-e

| Campo API | Tipo | Descrição |
|-----------|------|-----------|
| `chaveAcesso` | string(44-50) | Chave de acesso única da NFS-e |
| `numero` | string | Número da nota fiscal |
| `serie` | string | Série da nota |
| `dataEmissao` | date | Data de emissão (YYYY-MM-DD) |
| `competencia` | string | Competência (YYYY-MM) |
| `valorServico` | decimal | Valor bruto do serviço |
| `valorLiquido` | decimal | Valor líquido (após retenções) |
| `issRetido` | boolean | Indica se ISS foi retido |
| `valorIss` | decimal | Valor do ISS |
| `aliquotaIss` | decimal | Alíquota do ISS (%) |
| `codigoServico` | string | Código do serviço (LC 116) |
| `descricaoServico` | text | Descrição do serviço prestado |
| `status` | enum | 'normal', 'cancelada', 'substituida' |
| `xmlBase64` | text | XML assinado em base64 |

### 1.2 Dados do Prestador

| Campo API | Tipo | Descrição |
|-----------|------|-----------|
| `prestador.cnpj` | string(14) | CNPJ do prestador |
| `prestador.razaoSocial` | string | Razão social |
| `prestador.inscricaoMunicipal` | string | Inscrição municipal |
| `prestador.endereco` | object | Endereço completo |

### 1.3 Dados do Tomador

| Campo API | Tipo | Descrição |
|-----------|------|-----------|
| `tomador.cpfCnpj` | string | CPF ou CNPJ do tomador |
| `tomador.razaoSocial` | string | Nome/Razão social |
| `tomador.email` | string | E-mail do tomador |
| `tomador.endereco` | object | Endereço completo |

### 1.4 Dados de Retenções

| Campo API | Tipo | Descrição |
|-----------|------|-----------|
| `retencoes.pis` | decimal | PIS retido |
| `retencoes.cofins` | decimal | COFINS retido |
| `retencoes.csll` | decimal | CSLL retido |
| `retencoes.irrf` | decimal | IRRF retido |
| `retencoes.inss` | decimal | INSS retido |

---

## 2. Mapeamento para Tabelas Existentes

### 2.1 Tabela `titulo` (Contas a Receber)

Cada NFS-e gera um título a receber:

| Campo NFS-e | → | Campo titulo |
|-------------|---|--------------|
| `numero` | → | `numero_documento` |
| `dataEmissao` | → | `data_emissao` |
| `dataEmissao` | → | `data_vencimento` (regra de negócio) |
| `valorLiquido` | → | `valor` |
| `tomador.cpfCnpj` | → | `pessoa_id` (lookup) |
| `descricaoServico` | → | `descricao` |
| - | → | `tipo` = 'receita' |
| - | → | `categoria` = 'servico' |
| - | → | `origem` = 'nfse' |

### 2.2 Tabela `lancamento_contabil` (Contabilidade)

Cada NFS-e gera lançamentos:

| Débito | Crédito | Valor |
|--------|---------|-------|
| Clientes (1.1.2.x) | Receita de Serviços (4.1.x) | valorServico |
| ISS a Recolher (2.1.x) | Clientes (1.1.2.x) | valorIss (se retido) |

### 2.3 Nova Tabela: `nota_fiscal` (Sugerida)

Para armazenamento completo dos dados da NFS-e:

```sql
CREATE TABLE nota_fiscal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificação
  chave_acesso VARCHAR(50) NOT NULL UNIQUE,
  numero VARCHAR(20) NOT NULL,
  serie VARCHAR(10),
  tipo VARCHAR(10) NOT NULL DEFAULT 'nfse', -- 'nfse', 'nfe', 'nfce'
  
  -- Datas
  data_emissao DATE NOT NULL,
  competencia VARCHAR(7), -- YYYY-MM
  
  -- Valores
  valor_servico NUMERIC(15,2) NOT NULL,
  valor_liquido NUMERIC(15,2) NOT NULL,
  valor_iss NUMERIC(15,2) DEFAULT 0,
  aliquota_iss NUMERIC(5,2),
  iss_retido BOOLEAN DEFAULT false,
  
  -- Serviço
  codigo_servico VARCHAR(20),
  descricao_servico TEXT,
  
  -- Prestador (self)
  prestador_cnpj VARCHAR(14) NOT NULL,
  prestador_razao_social VARCHAR(255),
  
  -- Tomador
  tomador_cpf_cnpj VARCHAR(14),
  tomador_razao_social VARCHAR(255),
  tomador_email VARCHAR(255),
  tomador_pessoa_id UUID REFERENCES pessoa(id),
  
  -- Retenções
  pis_retido NUMERIC(15,2) DEFAULT 0,
  cofins_retido NUMERIC(15,2) DEFAULT 0,
  csll_retido NUMERIC(15,2) DEFAULT 0,
  irrf_retido NUMERIC(15,2) DEFAULT 0,
  inss_retido NUMERIC(15,2) DEFAULT 0,
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'normal', -- 'normal', 'cancelada', 'substituida'
  nota_substituida_id UUID REFERENCES nota_fiscal(id),
  
  -- XML e metadados
  xml_original TEXT, -- XML assinado
  xml_hash VARCHAR(64), -- SHA256 do XML
  
  -- Relacionamentos
  titulo_id UUID REFERENCES titulo(id), -- Título gerado
  lancamento_contabil_id UUID REFERENCES lancamento_contabil(id),
  
  -- Auditoria
  importado_em TIMESTAMPTZ DEFAULT now(),
  importado_por UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX idx_nota_fiscal_chave ON nota_fiscal(chave_acesso);
CREATE INDEX idx_nota_fiscal_numero ON nota_fiscal(numero, serie);
CREATE INDEX idx_nota_fiscal_prestador ON nota_fiscal(prestador_cnpj);
CREATE INDEX idx_nota_fiscal_tomador ON nota_fiscal(tomador_cpf_cnpj);
CREATE INDEX idx_nota_fiscal_emissao ON nota_fiscal(data_emissao);
CREATE INDEX idx_nota_fiscal_competencia ON nota_fiscal(competencia);
```

---

## 3. Plano de Migração/População

### 3.1 Estratégia de Carga Inicial

1. **Consultar notas por período**: Usar endpoint `/nfse?dataInicio=...&dataFim=...`
2. **Processar em lotes**: 50 notas por requisição (paginação)
3. **Verificar duplicatas**: Usar `chave_acesso` como chave única
4. **Criar registros relacionados**:
   - Lookup/criar `pessoa` para tomador
   - Criar `titulo` a receber
   - Criar `lancamento_contabil` (se período contábil aberto)

### 3.2 Regras de Idempotência

```typescript
// Antes de inserir, verificar se já existe
const existing = await db.select()
  .from(notaFiscal)
  .where(eq(notaFiscal.chaveAcesso, nfse.chaveAcesso))
  .limit(1);

if (existing.length > 0) {
  // Atualizar apenas se status mudou (cancelamento)
  if (existing[0].status !== nfse.status) {
    await db.update(notaFiscal)
      .set({ status: nfse.status, updatedAt: new Date() })
      .where(eq(notaFiscal.id, existing[0].id));
  }
  return; // Não duplicar
}

// Inserir nova nota
await db.insert(notaFiscal).values({ ... });
```

### 3.3 Ordem de Execução

1. **Migration**: Criar tabela `nota_fiscal`
2. **Lookup Tomadores**: Criar/vincular pessoas
3. **Importar Notas**: Carregar do período desejado
4. **Gerar Títulos**: Criar contas a receber
5. **Contabilizar**: Gerar lançamentos (se aplicável)

### 3.4 Períodos de Carga Sugeridos

| Período | Prioridade | Observação |
|---------|------------|------------|
| Último mês | Alta | Dados recentes para validação |
| Ano corrente | Média | Histórico completo 2024 |
| Anos anteriores | Baixa | Conforme necessidade |

---

## 4. Migration SQL

```sql
-- Migration: create_nota_fiscal
-- Description: Tabela para armazenar NFS-e importadas da API

CREATE TABLE IF NOT EXISTS nota_fiscal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chave_acesso VARCHAR(50) NOT NULL UNIQUE,
  numero VARCHAR(20) NOT NULL,
  serie VARCHAR(10),
  tipo VARCHAR(10) NOT NULL DEFAULT 'nfse',
  data_emissao DATE NOT NULL,
  competencia VARCHAR(7),
  valor_servico NUMERIC(15,2) NOT NULL,
  valor_liquido NUMERIC(15,2) NOT NULL,
  valor_iss NUMERIC(15,2) DEFAULT 0,
  aliquota_iss NUMERIC(5,2),
  iss_retido BOOLEAN DEFAULT false,
  codigo_servico VARCHAR(20),
  descricao_servico TEXT,
  prestador_cnpj VARCHAR(14) NOT NULL,
  prestador_razao_social VARCHAR(255),
  tomador_cpf_cnpj VARCHAR(14),
  tomador_razao_social VARCHAR(255),
  tomador_email VARCHAR(255),
  tomador_pessoa_id UUID,
  pis_retido NUMERIC(15,2) DEFAULT 0,
  cofins_retido NUMERIC(15,2) DEFAULT 0,
  csll_retido NUMERIC(15,2) DEFAULT 0,
  irrf_retido NUMERIC(15,2) DEFAULT 0,
  inss_retido NUMERIC(15,2) DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'normal',
  nota_substituida_id UUID,
  xml_original TEXT,
  xml_hash VARCHAR(64),
  titulo_id UUID,
  lancamento_contabil_id UUID,
  importado_em TIMESTAMPTZ DEFAULT now(),
  importado_por UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_nota_fiscal_chave ON nota_fiscal(chave_acesso);
CREATE INDEX idx_nota_fiscal_numero ON nota_fiscal(numero, serie);
CREATE INDEX idx_nota_fiscal_prestador ON nota_fiscal(prestador_cnpj);
CREATE INDEX idx_nota_fiscal_tomador ON nota_fiscal(tomador_cpf_cnpj);
CREATE INDEX idx_nota_fiscal_emissao ON nota_fiscal(data_emissao);
CREATE INDEX idx_nota_fiscal_competencia ON nota_fiscal(competencia);

COMMENT ON TABLE nota_fiscal IS 'Notas fiscais eletrônicas importadas via API (NFS-e, NF-e, NFC-e)';
```

---

## 5. Próximos Passos

1. [ ] Executar migration `create_nota_fiscal` no Neon
2. [ ] Implementar script de importação inicial
3. [ ] Testar com dados de homologação
4. [ ] Validar geração de títulos
5. [ ] Conectar com contabilidade (opcional)

---

**Última atualização:** Dezembro 2024



