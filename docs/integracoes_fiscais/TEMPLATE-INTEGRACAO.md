# Template Universal de Integração

> **Versão:** 1.0  
> **Data:** Dezembro 2024  
> **Uso:** Copiar este template para cada nova integração

---

## Instruções de Uso

1. Copie este arquivo para `SPEC-[NOME-INTEGRACAO].md`
2. Preencha todas as seções obrigatórias (marcadas com *)
3. Remova as instruções e exemplos após preencher
4. Submeta para revisão antes de iniciar implementação

---

# [NOME DA INTEGRAÇÃO]*

## 1. Identificação*

| Campo | Valor |
|-------|-------|
| **ID** | `[codigo_snake_case]` |
| **Nome** | [Nome legível] |
| **Categoria** | Fiscal \| Cadastral \| Bancária \| Documental |
| **Órgão** | [ex: RFB, SEFAZ, Prefeitura, Serpro] |
| **Tipo** | A (Oficial) \| B (Restrito) \| C (Comercial) \| D (Portal) |
| **Prioridade** | P0 (Crítico) \| P1 (Importante) \| P2 (Expansão) |
| **Ambiente Homologação** | [URL] |
| **Ambiente Produção** | [URL] |

---

## 2. Objetivo*

[Descrição clara em 2-3 parágrafos do que a integração faz, para que serve, e qual problema resolve. Inclua o contexto de negócio.]

**Exemplo:**
> Emitir Nota Fiscal de Serviços Eletrônica (NFS-e) via Ambiente de Dados Nacional (ADN) da RFB para prestação de serviços sujeitos ao ISS.

---

## 3. Permissões*

| Papel | Configurar | Executar | Cancelar/Reverter | Visualizar |
|-------|------------|----------|-------------------|------------|
| admin | Sim | Sim | Sim | Sim |
| accountant | Não | Sim | Sim | Sim |
| manager | Não | Sim | Não | Sim |
| viewer | Não | Não | Não | Sim |

**Notas:**
- [Adicione notas sobre permissões especiais se necessário]

---

## 4. Pré-requisitos*

### 4.1 Organizacionais
- [ ] [Requisito 1 - ex: CNPJ ativo e regular]
- [ ] [Requisito 2 - ex: Inscrição Municipal]
- [ ] [Requisito 3]

### 4.2 Técnicos
- [ ] [Requisito 1 - ex: Certificado Digital e-CNPJ A1]
- [ ] [Requisito 2 - ex: Certificado cadastrado no sistema]
- [ ] [Requisito 3]

### 4.3 Cadastrais
- [ ] [Requisito 1 - ex: Dados completos do tomador]
- [ ] [Requisito 2]

---

## 5. Estados da Integração*

### 5.1 Diagrama de Estados

```
[nao_configurado] ──(ação)──> [configurado]
        │                          │
        │                          ▼
        │                    [ativo] ←──> [pausado]
        │                          │
        │                          ▼
        └─────────────────────> [erro]
```

### 5.2 Detalhamento

| Estado | Cor Badge | Descrição | Ações Disponíveis |
|--------|-----------|-----------|-------------------|
| `nao_configurado` | Cinza | Pré-requisitos não atendidos | Configurar |
| `configurado` | Amarelo | Pronto para testes | Testar em Homologação |
| `ativo` | Verde | Funcionando em produção | Executar, Pausar |
| `pausado` | Laranja | Temporariamente inativo | Reativar |
| `erro` | Vermelho | Falha que requer atenção | Diagnosticar, Corrigir |

---

## 6. Fluxo Principal*

### 6.1 Diagrama de Sequência

```
Usuário                    Sistema                      API Externa
   │                          │                            │
   │  1. [Ação do usuário]    │                            │
   │─────────────────────────>│                            │
   │                          │                            │
   │                          │  2. [Validações]           │
   │                          │                            │
   │                          │  3. [Processamento]        │
   │                          │                            │
   │                          │  4. [Chamada externa]      │
   │                          │─────────────────────────── >│
   │                          │                            │
   │                          │  5. [Resposta]             │
   │                          │< ───────────────────────────│
   │                          │                            │
   │                          │  6. [Persistência]         │
   │                          │                            │
   │  7. [Feedback]           │                            │
   │< ─────────────────────────│                            │
```

### 6.2 Passos Detalhados

1. **[Passo 1]**: [Descrição]
2. **[Passo 2]**: [Descrição]
3. **[Passo 3]**: [Descrição]
4. ...

---

## 7. Fluxos de Erro*

| Cenário | Causa | Comportamento Sistema | Mensagem Usuário | Ação Recomendada |
|---------|-------|----------------------|------------------|------------------|
| [Erro 1] | [Causa] | [Comportamento] | "[Mensagem]" | [Ação] |
| [Erro 2] | [Causa] | [Comportamento] | "[Mensagem]" | [Ação] |
| [Erro 3] | [Causa] | [Comportamento] | "[Mensagem]" | [Ação] |

### 7.1 Estratégia de Retry

| Tipo de Erro | Retry Automático | Quantidade | Backoff |
|--------------|------------------|------------|---------|
| Timeout | Sim | 3x | Exponencial (5s, 25s, 125s) |
| 5xx | Sim | 3x | Exponencial |
| 4xx | Não | - | - |
| Validação | Não | - | - |

---

## 8. Estruturas de Dados

### 8.1 Request Principal

```typescript
interface [NomeRequest] {
  // Campos obrigatórios
  campo1: string;
  campo2: number;
  
  // Campos opcionais
  campoOpcional?: string;
}
```

### 8.2 Response Principal

```typescript
interface [NomeResponse] {
  // Identificação
  id: string;
  
  // Status
  status: "sucesso" | "erro";
  
  // Dados
  dados: {
    // ...
  };
}
```

---

## 9. Regras de Negócio*

| ID | Regra | Validação | Mensagem de Erro |
|----|-------|-----------|------------------|
| RN01 | [Descrição da regra] | `[expressão]` | "[Mensagem]" |
| RN02 | [Descrição da regra] | `[expressão]` | "[Mensagem]" |
| RN03 | [Descrição da regra] | `[expressão]` | "[Mensagem]" |

---

## 10. Logs e Auditoria*

### 10.1 Eventos Registrados

| Evento | Tabela | Dados Salvos |
|--------|--------|--------------|
| [evento_1] | `eventoAuditoria` | usuarioId, ação, timestamp |
| [evento_2] | `fiscal_events` | request, response, status |
| [evento_3] | `xml_archive` | XML assinado, protocolo |

### 10.2 Retenção

| Tipo de Dado | Período | Base Legal |
|--------------|---------|------------|
| XMLs fiscais | 5 anos | CTN Art. 173 |
| Logs de auditoria | 5 anos | Compliance |
| Dados de request | 1 ano | Operacional |

---

## 11. Configurações*

### 11.1 Configuráveis pelo Usuário

| Campo | Tipo | Obrigatório | Onde | Descrição |
|-------|------|-------------|------|-----------|
| [campo1] | [tipo] | Sim/Não | [local] | [descrição] |
| [campo2] | [tipo] | Sim/Não | [local] | [descrição] |

### 11.2 Automáticos (Sistema)

| Aspecto | Descrição |
|---------|-----------|
| [aspecto1] | [como funciona] |
| [aspecto2] | [como funciona] |

---

## 12. Dependências

### 12.1 Dependências Internas

| Módulo/Serviço | Tipo | Descrição |
|----------------|------|-----------|
| [CertificateManager] | Obrigatório | Gestão de certificados digitais |
| [XmlArchive] | Obrigatório | Armazenamento de XMLs |
| [FiscalQueue] | Obrigatório | Fila de processamento |

### 12.2 Dependências Externas

| Serviço | Tipo | SLA Esperado |
|---------|------|--------------|
| [API Externa] | Obrigatório | 99.5% |

---

## 13. Tabelas de Banco

### 13.1 Tabelas Utilizadas (Existentes)

- `organization_certificates` - Certificados por organização
- `fiscal_events` - Log de eventos fiscais
- `xml_archive` - Arquivo de XMLs
- `eventoAuditoria` - Auditoria geral

### 13.2 Tabelas Específicas (Novas)

```sql
-- Descrição da tabela
CREATE TABLE [nome_tabela] (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  
  -- Campos específicos
  [campo1] [tipo] [constraints],
  [campo2] [tipo] [constraints],
  
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES users(id)
);

-- Índices
CREATE INDEX idx_[nome]_org ON [nome_tabela](organization_id);
```

---

## 14. UI no Menu de Integrações (Futuro)

### 14.1 Card na Lista

```
┌─────────────────────────────────────┐
│  [Ícone]  [Nome da Integração]      │
│                                     │
│  [Badge Status: Ativo/Erro/etc]     │
│                                     │
│  Última execução: [data/hora]       │
│  [Botão: Configurar] [Botão: Ver]   │
└─────────────────────────────────────┘
```

### 14.2 Página de Detalhes

- **Aba Configuração**: Formulário de setup
- **Aba Histórico**: Lista de execuções
- **Aba Logs**: Eventos de auditoria

---

## 15. Testes

### 15.1 Cenários de Teste

| ID | Cenário | Dados de Entrada | Resultado Esperado |
|----|---------|------------------|-------------------|
| T01 | [Cenário feliz] | [dados] | [resultado] |
| T02 | [Cenário de erro] | [dados] | [resultado] |
| T03 | [Cenário de borda] | [dados] | [resultado] |

### 15.2 Ambiente de Homologação

- **URL**: [URL do ambiente de testes]
- **Credenciais**: [Como obter]
- **Dados de Teste**: [CNPJs, valores de teste]

---

## 16. Checklist de Implementação

### 16.1 Backend

- [ ] Criar service em `server/integrations/fiscal/[nome]/`
- [ ] Implementar cliente HTTP/SOAP
- [ ] Criar validações de entrada
- [ ] Implementar assinatura (se necessário)
- [ ] Configurar retry e fallback
- [ ] Criar testes unitários
- [ ] Criar testes de integração

### 16.2 Banco de Dados

- [ ] Criar migration para tabelas específicas
- [ ] Adicionar índices necessários
- [ ] Testar em ambiente de dev

### 16.3 Frontend

- [ ] Criar página de configuração
- [ ] Criar componente de status
- [ ] Implementar formulários
- [ ] Adicionar ao menu (quando habilitado)

### 16.4 Documentação

- [ ] Preencher esta especificação
- [ ] Atualizar README da pasta
- [ ] Documentar variáveis de ambiente

---

## 17. Referências

- [Link para documentação oficial 1]
- [Link para documentação oficial 2]
- [Link para schema/WSDL]

---

## Histórico de Alterações

| Data | Versão | Autor | Descrição |
|------|--------|-------|-----------|
| [data] | 1.0 | [autor] | Versão inicial |

---

**Arquivo criado seguindo o template em:** `docs/integracoes_fiscais/TEMPLATE-INTEGRACAO.md`

