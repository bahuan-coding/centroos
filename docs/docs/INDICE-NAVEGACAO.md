# 📑 Índice de Navegação Rápida

## 🎯 Por Perfil

### 👨‍💻 Desenvolvedor Backend

**Leitura Obrigatória:**
1. ✅ `CURSOR-QUICK-START.md` - Começar aqui! (5 min)
2. ✅ `02-ARQUITETURA-SISTEMA.md` - Stack e banco de dados (20 min)
3. ✅ `04-REGRAS-NEGOCIO-FLUXOS.md` - Regras de negócio (20 min)

**Leitura por Funcionalidade:**
- Importação de extratos → `05-IMPORTACAO-CLASSIFICACAO.md`
- Geração de relatórios → `06-RELATORIOS-COMPLIANCE.md`
- Contexto contábil → `01-PESQUISA-CONTABIL-FISCAL.md`

---

### 🎨 Desenvolvedor Frontend

**Leitura Obrigatória:**
1. ✅ `CURSOR-QUICK-START.md` - Começar aqui! (5 min)
2. ✅ `03-UX-DESIGN-GUIDE.md` - Design system completo (30 min)
3. ✅ `04-REGRAS-NEGOCIO-FLUXOS.md` - Fluxos de trabalho (20 min)

**Leitura Complementar:**
- APIs disponíveis → `02-ARQUITETURA-SISTEMA.md` (Seção 4)
- Componentes e padrões → `03-UX-DESIGN-GUIDE.md` (Seção 5)

---

### 🎯 Full Stack

**Leitura Completa (Ordem):**
1. `CURSOR-QUICK-START.md` (5 min)
2. `README.md` (10 min)
3. `02-ARQUITETURA-SISTEMA.md` (20 min)
4. `03-UX-DESIGN-GUIDE.md` (30 min)
5. `04-REGRAS-NEGOCIO-FLUXOS.md` (20 min)
6. `05-IMPORTACAO-CLASSIFICACAO.md` (30 min)
7. `06-RELATORIOS-COMPLIANCE.md` (30 min)

**Tempo Total:** ~2h30min

---

### 📊 Product Owner / Gestor

**Leitura Recomendada:**
1. `README.md` - Visão geral e funcionalidades (10 min)
2. `04-REGRAS-NEGOCIO-FLUXOS.md` - Regras e fluxos (20 min)
3. `01-PESQUISA-CONTABIL-FISCAL.md` - Contexto legal (15 min)

**Tempo Total:** ~45min

---

## 🔍 Por Funcionalidade

### Plano de Contas
- **Documento:** `04-REGRAS-NEGOCIO-FLUXOS.md`
- **Seção:** 2. Plano de Contas
- **Tópicos:** Estrutura hierárquica, tipos de conta, validações

### Períodos Contábeis
- **Documento:** `04-REGRAS-NEGOCIO-FLUXOS.md`
- **Seção:** 3. Gestão de Períodos
- **Tópicos:** Criação, fechamento, reabertura, validações

### Lançamentos Contábeis
- **Documento:** `04-REGRAS-NEGOCIO-FLUXOS.md`
- **Seção:** 4. Lançamentos Contábeis
- **Tópicos:** Partida dobrada, validações, edição, exclusão

### Importação de Extratos
- **Documento:** `05-IMPORTACAO-CLASSIFICACAO.md`
- **Seções:** 2. Formatos de Arquivo, 3. Detecção de Duplicatas, 5. Interface
- **Tópicos:** PDF (BB, Caixa), CSV, OFX, duplicatas, wizard

### Classificação Automática
- **Documento:** `05-IMPORTACAO-CLASSIFICACAO.md`
- **Seção:** 4. Classificação Automática
- **Tópicos:** Regras, algoritmo, confiança, aprendizado

### Relatórios
- **Documento:** `06-RELATORIOS-COMPLIANCE.md`
- **Seções:** 2. Relatório Mensal, 3. Relatório NFC, 4. Balancete
- **Tópicos:** Geração de PDF, estrutura, dados, interface

### Dashboard
- **Documento:** `03-UX-DESIGN-GUIDE.md`
- **Seção:** 4. Páginas Principais
- **Tópicos:** Indicadores, gráficos, cards

### Auditoria
- **Documento:** `04-REGRAS-NEGOCIO-FLUXOS.md`
- **Seção:** 7. Auditoria e Rastreabilidade
- **Tópicos:** Logs, histórico, rastreamento

### Compliance NFC
- **Documento:** `06-RELATORIOS-COMPLIANCE.md`
- **Seção:** 3. Relatório Nota Fiscal Cidadã
- **Tópicos:** Validação 70/30, análise, relatório

---

## 🛠️ Por Tecnologia

### React / Frontend
- **Design System:** `03-UX-DESIGN-GUIDE.md` (Seção 2)
- **Componentes:** `03-UX-DESIGN-GUIDE.md` (Seção 5)
- **Padrões de Código:** `03-UX-DESIGN-GUIDE.md` (Seção 6)
- **Fluxos de Tela:** `03-UX-DESIGN-GUIDE.md` (Seção 4)

### tRPC / APIs
- **Estrutura de Routers:** `02-ARQUITETURA-SISTEMA.md` (Seção 4)
- **Validação com Zod:** `CURSOR-QUICK-START.md` (Seção Padrões)
- **Exemplos de Uso:** Todos os documentos de fluxos

### Banco de Dados / Drizzle
- **Schema Completo:** `02-ARQUITETURA-SISTEMA.md` (Seção 3.2)
- **Relacionamentos:** `02-ARQUITETURA-SISTEMA.md` (Seção 3.3)
- **Helpers de DB:** `02-ARQUITETURA-SISTEMA.md` (Seção 3.4)

### Parsers / Importação
- **PDF (pdf-parse):** `05-IMPORTACAO-CLASSIFICACAO.md` (Seção 2.1)
- **CSV (csv-parse):** `05-IMPORTACAO-CLASSIFICACAO.md` (Seção 2.2)
- **OFX (xml2js):** `05-IMPORTACAO-CLASSIFICACAO.md` (Seção 2.3)

### PDF / Relatórios
- **jsPDF:** `06-RELATORIOS-COMPLIANCE.md` (Seção 2.2, 3.3, 4.2)
- **Chart.js:** `06-RELATORIOS-COMPLIANCE.md` (Seção 2.2)
- **Estruturas:** `06-RELATORIOS-COMPLIANCE.md` (Todas as seções)

---

## 📋 Por Tipo de Informação

### Regras de Negócio
- **Documento Principal:** `04-REGRAS-NEGOCIO-FLUXOS.md`
- **Seções:** Todas
- **Conteúdo:** Validações, fluxos, restrições, permissões

### Especificações Técnicas
- **Documento Principal:** `02-ARQUITETURA-SISTEMA.md`
- **Conteúdo:** Stack, banco de dados, APIs, deployment

### Guias de UX
- **Documento Principal:** `03-UX-DESIGN-GUIDE.md`
- **Conteúdo:** Design system, componentes, padrões, acessibilidade

### Contexto Legal/Contábil
- **Documento Principal:** `01-PESQUISA-CONTABIL-FISCAL.md`
- **Conteúdo:** ITG 2002, NBC T, Nota Fiscal Cidadã, obrigações

### Implementação Detalhada
- **Documentos:** `05-IMPORTACAO-CLASSIFICACAO.md`, `06-RELATORIOS-COMPLIANCE.md`
- **Conteúdo:** Código de exemplo, algoritmos, fluxos completos

---

## 🚀 Fluxo de Desenvolvimento Sugerido

### Semana 1-2: Fundação
**Ler:**
- `CURSOR-QUICK-START.md`
- `02-ARQUITETURA-SISTEMA.md`
- `04-REGRAS-NEGOCIO-FLUXOS.md` (Seções 2, 3, 4)

**Implementar:**
- Lançamentos contábeis (CRUD)
- Cálculo de saldos
- Balancete básico

---

### Semana 3-4: Importação
**Ler:**
- `05-IMPORTACAO-CLASSIFICACAO.md` (Completo)

**Implementar:**
- Parser PDF Banco do Brasil
- Parser CSV genérico
- Detecção de duplicatas
- Interface de importação

---

### Semana 5-6: Classificação e Relatórios
**Ler:**
- `05-IMPORTACAO-CLASSIFICACAO.md` (Seção 4)
- `06-RELATORIOS-COMPLIANCE.md` (Seções 2, 3, 4)

**Implementar:**
- Sistema de regras
- Classificação automática
- Relatório financeiro mensal
- Relatório NFC

---

### Semana 7-8: Refinamentos
**Ler:**
- `03-UX-DESIGN-GUIDE.md` (Seção 7 - Acessibilidade)
- `04-REGRAS-NEGOCIO-FLUXOS.md` (Seção 7 - Auditoria)

**Implementar:**
- Melhorias de UX
- Otimizações de performance
- Testes automatizados
- Documentação de API

---

## 📊 Estatísticas da Documentação

- **Total de Documentos:** 8 arquivos Markdown
- **Total de Linhas:** 6.733 linhas
- **Total de Palavras:** 20.057 palavras
- **Tempo de Leitura Estimado:** 3-4 horas (leitura completa)
- **Código de Exemplo:** ~2.000 linhas
- **Diagramas e Tabelas:** 50+

---

## 🎯 Checklist de Leitura

### Essencial (Antes de Começar)
- [ ] `CURSOR-QUICK-START.md`
- [ ] `README.md`
- [ ] `02-ARQUITETURA-SISTEMA.md`
- [ ] `04-REGRAS-NEGOCIO-FLUXOS.md`

### Por Demanda (Durante Desenvolvimento)
- [ ] `03-UX-DESIGN-GUIDE.md` (ao implementar frontend)
- [ ] `05-IMPORTACAO-CLASSIFICACAO.md` (ao implementar importação)
- [ ] `06-RELATORIOS-COMPLIANCE.md` (ao implementar relatórios)
- [ ] `01-PESQUISA-CONTABIL-FISCAL.md` (quando precisar de contexto)

---

## 💡 Dicas de Navegação

### Busca Rápida por Palavra-Chave

**No Terminal:**
```bash
grep -r "palavra-chave" /home/ubuntu/docs/*.md
```

**No Cursor:**
- Use `Ctrl+Shift+F` para buscar em todos os arquivos
- Use `Ctrl+P` para abrir arquivo por nome

### Marcadores Úteis

Todos os documentos usam marcadores consistentes:

- `## SEÇÃO PRINCIPAL` - Seções principais
- `### Subseção` - Subseções
- `**Negrito**` - Conceitos importantes
- `> Blockquote` - Citações e definições
- `` `código` `` - Código inline
- ` ```typescript ` - Blocos de código

### Tabelas de Referência Rápida

Todos os documentos contêm tabelas de referência rápida no início de cada seção. Procure por:

- "Tabela de..."
- "Resumo de..."
- "Principais..."

---

## 📞 Suporte

**Dúvida sobre funcionalidade?**
→ Consultar `04-REGRAS-NEGOCIO-FLUXOS.md`

**Dúvida sobre implementação?**
→ Consultar `05-IMPORTACAO-CLASSIFICACAO.md` ou `06-RELATORIOS-COMPLIANCE.md`

**Dúvida sobre design?**
→ Consultar `03-UX-DESIGN-GUIDE.md`

**Dúvida sobre banco de dados?**
→ Consultar `02-ARQUITETURA-SISTEMA.md`

**Dúvida sobre contexto contábil?**
→ Consultar `01-PESQUISA-CONTABIL-FISCAL.md`

---

**Última Atualização:** Dezembro 2024  
**Versão:** 1.0
