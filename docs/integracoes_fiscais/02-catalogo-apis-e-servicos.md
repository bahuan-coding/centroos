# Catálogo de APIs e Serviços Fiscais

## Matriz Completa de Integrações

### Legenda de Tipos

| Tipo | Descrição |
|------|-----------|
| **A** | Oficial e acessível a empresas privadas |
| **B** | Oficial porém restrito (governo-para-governo / convênios) |
| **C** | Comercial (ex: Serpro, parceiros autorizados) |
| **D** | Não-API (portal/GUI apenas) |

---

## 1. Documentos Fiscais Eletrônicos

### 1.1 NF-e - Nota Fiscal Eletrônica (Produtos)

| Atributo | Valor |
|----------|-------|
| **Órgão** | SEFAZ Estadual / Portal NF-e |
| **Tipo** | A - Oficial |
| **O que faz** | Emissão, consulta, cancelamento, CCe de NF-e para produtos |
| **Autenticação** | Certificado ICP-Brasil (e-CNPJ A1/A3) |
| **Protocolo** | SOAP / Web Services |
| **Formato** | XML (schema definido pelo ENCAT) |
| **Ambientes** | Homologação e Produção (por UF) |
| **Pré-requisitos** | Credenciamento na SEFAZ do estado, Inscrição Estadual |
| **Custos** | Gratuito (apenas certificado digital) |
| **Limites** | Rate limiting por SEFAZ (geralmente 20 req/min) |
| **Documentação** | https://www.nfe.fazenda.gov.br/portal/principal.aspx |

**Operações Disponíveis:**

| Operação | Web Service | Descrição |
|----------|-------------|-----------|
| Autorização | NFeAutorizacao4 | Enviar NF-e para autorização |
| Consulta Protocolo | NFeConsultaProtocolo4 | Consultar status de NF-e |
| Cancelamento | NFeRecepcaoEvento4 | Cancelar NF-e autorizada (até 24h) |
| Inutilização | NFeInutilizacao4 | Inutilizar faixa de numeração |
| CCe | NFeRecepcaoEvento4 | Carta de Correção Eletrônica |
| Consulta Cadastro | NfeConsultaCadastro4 | Consultar contribuinte na SEFAZ |
| Status Serviço | NFeStatusServico4 | Verificar disponibilidade |

**Endpoints por UF (Exemplos):**

```
Homologação:
- SP: https://homologacao.nfe.fazenda.sp.gov.br/ws/
- RS: https://nfe-homologacao.sefazrs.rs.gov.br/ws/

Produção:
- SP: https://nfe.fazenda.sp.gov.br/ws/
- RS: https://nfe.sefazrs.rs.gov.br/ws/
```

---

### 1.2 NFC-e - Nota Fiscal de Consumidor Eletrônica

| Atributo | Valor |
|----------|-------|
| **Órgão** | SEFAZ Estadual |
| **Tipo** | A - Oficial |
| **O que faz** | Emissão de cupom fiscal eletrônico (varejo B2C) |
| **Autenticação** | Certificado ICP-Brasil + CSC (Código de Segurança do Contribuinte) |
| **Protocolo** | SOAP / Web Services |
| **Formato** | XML (similar NF-e, modelo 65) |
| **Documentação** | https://www.nfe.fazenda.gov.br/portal/principal.aspx |

**Observação:** Mesmo fluxo da NF-e, mas para operações com consumidor final.

---

### 1.3 NFS-e Nacional (Ambiente de Dados Nacional)

| Atributo | Valor |
|----------|-------|
| **Órgão** | RFB / Comitê Gestor NFS-e |
| **Tipo** | A - Oficial |
| **O que faz** | Emissão padronizada de NFS-e em municípios aderentes |
| **Autenticação** | Certificado ICP-Brasil (e-CNPJ) |
| **Protocolo** | REST + SOAP |
| **Formato** | XML/JSON |
| **Ambientes** | Homologação e Produção |
| **Pré-requisitos** | Município aderente ao padrão nacional |
| **Custos** | Gratuito |
| **Documentação** | https://www.gov.br/nfse |

**Operações Disponíveis:**

| Operação | Endpoint | Descrição |
|----------|----------|-----------|
| Geração DPS | /dps | Gerar Declaração de Prestação de Serviços |
| Emissão NFS-e | /nfse | Emitir nota fiscal de serviço |
| Consulta | /nfse/{chave} | Consultar NFS-e por chave |
| Cancelamento | /nfse/{chave}/cancelar | Cancelar NFS-e emitida |
| Substituição | /nfse/{chave}/substituir | Substituir NFS-e |

**Municípios Aderentes:** +2.000 (verificar lista atualizada no portal)

---

### 1.4 NFS-e Paulistana (São Paulo)

| Atributo | Valor |
|----------|-------|
| **Órgão** | Prefeitura de São Paulo |
| **Tipo** | A - Oficial |
| **O que faz** | Emissão de NFS-e para prestadores em São Paulo/SP |
| **Autenticação** | Certificado ICP-Brasil ou Senha Web |
| **Protocolo** | SOAP |
| **Formato** | XML |
| **Ambientes** | Homologação e Produção |
| **Pré-requisitos** | CCM (Cadastro de Contribuintes Mobiliários) |
| **Documentação** | https://nfe.prefeitura.sp.gov.br/ws/lotenfe.asmx |

**Operações:**

| Operação | Método SOAP |
|----------|-------------|
| Envio de RPS | EnvioRPS |
| Envio de Lote RPS | EnvioLoteRPS |
| Consulta NFS-e | ConsultaNFe |
| Consulta Lote | ConsultaLote |
| Cancelamento | CancelamentoNFe |
| Consulta CNPJ | ConsultaCNPJ |

---

### 1.5 CT-e - Conhecimento de Transporte Eletrônico

| Atributo | Valor |
|----------|-------|
| **Órgão** | SEFAZ Estadual |
| **Tipo** | A - Oficial |
| **O que faz** | Documento fiscal para transporte de cargas |
| **Autenticação** | Certificado ICP-Brasil |
| **Aplicabilidade Paycubed** | Baixa (empresa de TI) |
| **Documentação** | https://www.cte.fazenda.gov.br |

---

## 2. Consultas Cadastrais

### 2.1 Consulta CNPJ (Serpro)

| Atributo | Valor |
|----------|-------|
| **Órgão** | Serpro |
| **Tipo** | C - Comercial |
| **O que faz** | Consulta dados cadastrais de empresas (CNPJ) |
| **Autenticação** | API Key / OAuth 2.0 |
| **Protocolo** | REST |
| **Formato** | JSON |
| **Pré-requisitos** | Contrato com Serpro |
| **Custos** | R$ 0,02 a R$ 0,10 por consulta (volume) |
| **Documentação** | https://servicos.serpro.gov.br/api-cnpj |

**Dados Retornados:**

```json
{
  "ni": "63552022000184",
  "nome_empresarial": "PAYCUBED STACK FINANCEIRO LTDA",
  "situacao_cadastral": {
    "codigo": 2,
    "data": "2024-01-15",
    "motivo": ""
  },
  "natureza_juridica": {
    "codigo": "2062",
    "descricao": "Sociedade Empresária Limitada"
  },
  "porte": "MICRO EMPRESA",
  "endereco": {
    "logradouro": "RUA EXEMPLO",
    "numero": "123",
    "bairro": "CENTRO",
    "municipio": "MACEIO",
    "uf": "AL",
    "cep": "57000000"
  },
  "cnae_principal": {
    "codigo": "6201501",
    "descricao": "Desenvolvimento de programas de computador sob encomenda"
  },
  "cnaes_secundarios": [...]
}
```

---

### 2.2 Consulta CPF (Serpro)

| Atributo | Valor |
|----------|-------|
| **Órgão** | Serpro |
| **Tipo** | C - Comercial |
| **O que faz** | Consulta situação cadastral de CPF |
| **Autenticação** | API Key / OAuth 2.0 |
| **Protocolo** | REST |
| **Pré-requisitos** | Contrato com Serpro + Justificativa de uso |
| **Custos** | Similar ao CNPJ |
| **LGPD** | Requer base legal para consulta |
| **Documentação** | https://servicos.serpro.gov.br/api-cpf |

**Dados Retornados:**

```json
{
  "ni": "12345678901",
  "nome": "JOAO DA SILVA",
  "situacao": {
    "codigo": 0,
    "descricao": "Regular"
  },
  "nascimento": "1990-05-15"
}
```

---

### 2.3 Consulta CNPJ (Conecta gov.br) - Gratuita

| Atributo | Valor |
|----------|-------|
| **Órgão** | Conecta gov.br (RFB) |
| **Tipo** | A - Oficial (com restrições) |
| **O que faz** | Consulta básica de CNPJ |
| **Autenticação** | Conta gov.br + OAuth 2.0 |
| **Protocolo** | REST |
| **Pré-requisitos** | Cadastro no Conecta gov.br |
| **Custos** | Gratuito (limites de requisição) |
| **Limites** | 3 req/segundo, 100 req/dia (perfil básico) |
| **Documentação** | https://www.gov.br/conecta |

**Observação:** Dados mais limitados que a API Serpro paga.

---

### 2.4 Datavalid (Serpro)

| Atributo | Valor |
|----------|-------|
| **Órgão** | Serpro |
| **Tipo** | C - Comercial |
| **O que faz** | Validação biométrica e documental |
| **Uso** | KYC, onboarding, prevenção a fraudes |
| **Custos** | R$ 0,50+ por validação |
| **Documentação** | https://servicos.serpro.gov.br/datavalid |

---

## 3. Situação Fiscal e Certidões

### 3.1 e-CAC (Centro Virtual de Atendimento)

| Atributo | Valor |
|----------|-------|
| **Órgão** | Receita Federal |
| **Tipo** | D - Não-API |
| **O que faz** | Portal de serviços fiscais (consultas, declarações, certidões) |
| **Autenticação** | Certificado ICP-Brasil ou gov.br |
| **Protocolo** | Web (HTTPS) |
| **Automação** | **NÃO RECOMENDADO** (sem API oficial) |
| **URL** | https://cav.receita.fazenda.gov.br |

**Serviços Disponíveis (manual):**
- Consulta de situação fiscal
- Emissão de certidões (CND, CPEND, etc.)
- Parcelamentos
- Consulta de processos
- Retificação de declarações

**Alternativas para automação:**
- Serpro (alguns serviços via API comercial)
- Parceiros autorizados
- Fluxo manual com upload de certidão

---

### 3.2 Certidão Negativa de Débitos (CND)

| Atributo | Valor |
|----------|-------|
| **Órgão** | Receita Federal / PGFN |
| **Tipo** | D - Não-API |
| **O que faz** | Comprova regularidade fiscal |
| **Automação** | Não disponível via API pública |
| **Alternativa** | Emitir manualmente e fazer upload no sistema |

---

### 3.3 Conformidade Fácil (API)

| Atributo | Valor |
|----------|-------|
| **Órgão** | Receita Federal |
| **Tipo** | A - Oficial (nova) |
| **O que faz** | Consulta de conformidade fiscal simplificada |
| **Autenticação** | Certificado ICP-Brasil |
| **Status** | Em expansão (verificar disponibilidade) |
| **Documentação** | Portal RFB |

**Observação:** API recente, verificar escopo e disponibilidade atual.

---

## 4. Obrigações Acessórias

### 4.1 SPED (Sistema Público de Escrituração Digital)

| Módulo | Tipo | Descrição | Transmissão |
|--------|------|-----------|-------------|
| ECD | B - Restrito | Escrituração Contábil Digital | Arquivo + Assinatura |
| ECF | B - Restrito | Escrituração Contábil Fiscal | Arquivo + Assinatura |
| EFD ICMS/IPI | B - Restrito | Escrituração Fiscal ICMS/IPI | Arquivo + Assinatura |
| EFD Contribuições | B - Restrito | PIS/COFINS | Arquivo + Assinatura |
| EFD-Reinf | A - Oficial | Retenções e informações | API REST |

**Observação:** A maioria dos módulos SPED não tem API para transmissão automática. Os arquivos são gerados pelo sistema contábil e transmitidos via programa validador (PVA) da RFB.

### 4.2 eSocial

| Atributo | Valor |
|----------|-------|
| **Órgão** | RFB / INSS / Caixa / MTE |
| **Tipo** | A - Oficial |
| **O que faz** | Obrigações trabalhistas unificadas |
| **Autenticação** | Certificado ICP-Brasil |
| **Protocolo** | Web Services (REST/SOAP) |
| **Documentação** | https://www.gov.br/esocial |

---

## 5. Relatório de Viabilidade (P0/P1)

### 5.1 NFS-e Nacional - Viabilidade: ALTA

| Critério | Status |
|----------|--------|
| Documentação oficial | ✅ Disponível |
| Ambiente homologação | ✅ Disponível |
| Requer convênio | ❌ Não |
| Certificado ICP-Brasil | ✅ Obrigatório |
| Endpoints principais | ✅ Documentados |
| Bibliotecas Node.js | ⚠️ Parciais (implementar) |

**Próximos passos:**
1. Verificar se Maceió/AL está no padrão nacional
2. Obter certificado e-CNPJ A1 para testes
3. Cadastrar no ambiente de homologação
4. Implementar cliente REST

---

### 5.2 Consulta CNPJ Serpro - Viabilidade: ALTA

| Critério | Status |
|----------|--------|
| Documentação oficial | ✅ Disponível |
| Ambiente sandbox | ✅ Disponível |
| Requer contrato | ✅ Sim (Serpro) |
| Autenticação | ✅ API Key simples |
| Endpoints principais | ✅ Bem documentados |
| Bibliotecas Node.js | ✅ fetch/axios |

**Próximos passos:**
1. Solicitar acesso sandbox no Serpro
2. Assinar contrato comercial
3. Implementar cliente REST
4. Cachear resultados (reduzir custos)

---

### 5.3 NF-e SEFAZ - Viabilidade: MÉDIA

| Critério | Status |
|----------|--------|
| Documentação oficial | ✅ Disponível |
| Ambiente homologação | ✅ Disponível |
| Requer credenciamento | ✅ Sim (SEFAZ do estado) |
| Certificado ICP-Brasil | ✅ Obrigatório |
| Complexidade | ⚠️ Alta (SOAP, XML signing) |
| Bibliotecas Node.js | ⚠️ Existem, mas complexas |

**Próximos passos:**
1. Definir se Paycubed precisa emitir NF-e (produtos)
2. Se sim, credenciar na SEFAZ-AL
3. Avaliar uso de biblioteca existente vs implementação própria

---

### 5.4 NFS-e Paulistana - Viabilidade: MÉDIA

| Critério | Status |
|----------|--------|
| Documentação oficial | ✅ Disponível |
| Ambiente homologação | ✅ Disponível |
| Requer CCM | ✅ Sim (Prefeitura SP) |
| Aplicabilidade | ⚠️ Apenas se operar em SP |

---

### 5.5 e-CAC / CND - Viabilidade: BAIXA

| Critério | Status |
|----------|--------|
| API disponível | ❌ Não |
| Automação | ❌ Não recomendada (scraping proibido) |
| Alternativa | ✅ Fluxo manual + upload |

---

## 6. Resumo de Priorização

| Prioridade | Integração | Tipo | Viabilidade | Esforço |
|------------|------------|------|-------------|---------|
| **P0** | NFS-e Nacional | A | Alta | Médio |
| **P0** | Consulta CNPJ (Serpro) | C | Alta | Baixo |
| **P1** | NF-e SEFAZ | A | Média | Alto |
| **P1** | Consulta CPF (Serpro) | C | Alta | Baixo |
| **P1** | NFS-e Paulistana | A | Média | Médio |
| **P2** | eSocial | A | Alta | Alto |
| **P2** | EFD-Reinf | A | Média | Médio |
| **--** | e-CAC/CND | D | Baixa | N/A |

---

**Próximo:** [03-emissao-notas-rfb-vs-sefaz-vs-municipio.md](03-emissao-notas-rfb-vs-sefaz-vs-municipio.md) - Entendendo responsabilidades de cada órgão





