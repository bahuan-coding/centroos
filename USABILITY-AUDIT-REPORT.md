# Relatório de Auditoria de Usabilidade

**Data:** 20/12/2025  
**Escopo:** Correções exclusivamente de usabilidade (sem alterações de lógica de negócio)

---

## Matriz de CRUDs Auditados

| Módulo/Entidade | Rotas/Telas | Create | Read | Update | Delete/Inativar | Status |
|-----------------|-------------|--------|------|--------|-----------------|--------|
| **Contas Financeiras** | `/contas` | ✅ Modal | ✅ Cards/Lista | ✅ Modal | ✅ Inativar | Corrigido |
| **Pessoas** | `/pessoas` | ✅ Modal | ✅ Master-Detail | ✅ Detail Panel | ✅ Inativar | Corrigido |
| **Títulos (Pagar/Receber)** | `/titulos` | ✅ Dialog | ✅ Lista com tabs | ✅ Dialog | ✅ Cancelar | Corrigido |
| **Plano de Contas** | `/accounts` | ✅ Dialog | ✅ Tree View | ✅ Dialog | — | Corrigido |
| **Patrimônio** | `/patrimonio` | ✅ Dialog | ✅ Tabela | ✅ Dialog | ✅ Baixa | Corrigido |
| **Centros de Custo** | `/projetos-fundos` | ✅ Dialog | ✅ Tabela | ✅ Dialog | ✅ Inativar | Corrigido |
| **Projetos** | `/projetos-fundos` | ✅ Dialog | ✅ Tabela | ✅ Dialog | ✅ Cancelar | Corrigido |
| **Fundos** | `/projetos-fundos` | ✅ Dialog | ✅ Tabela | ✅ Dialog | ✅ Inativar | Corrigido |
| **Alocações/Consumos** | `/projetos-fundos` | ✅ Formulário | ✅ Histórico | — | — | Corrigido |
| **Períodos Contábeis** | `/periods` | ✅ Dialog | ✅ Timeline | — | ✅ Fechar | Corrigido |
| **Conciliação** | `/conciliacao` | — | ✅ Split View | — | ✅ Ignorar | Corrigido |
| **Usuários** | `/governanca` | — | ✅ Tabela | ✅ Papéis | ✅ Desativar | Corrigido |
| **Papéis** | `/governanca` | ✅ Dialog | ✅ Tabela | ✅ Dialog | ✅ Excluir | Corrigido |
| **Permissões** | `/governanca` | — | ✅ Matriz | ✅ Checkboxes | — | Corrigido |

---

## Correções Aplicadas por Módulo

### 1. Contas Financeiras (`/contas`)

**Problemas encontrados:**
- Botão de inativar sem aria-label
- Ações nos cards invisíveis até hover (ruim para touch/teclado)
- Botão MoreHorizontal sem funcionalidade

**Correções:**
- Adicionado `aria-label` descritivo no botão de inativar
- Ações visíveis por padrão em telas touch (opacity 60% em sm:)
- Removido botão sem funcionalidade
- Tooltip adicionado para melhor feedback

### 2. Formulário de Conta Financeira

**Problemas encontrados:**
- Falta de autoFocus no primeiro campo do formulário
- Mensagem de erro genérica "Corrija os erros"
- Erros de validação sem role="alert"

**Correções:**
- Adicionado `autoFocus` no campo Nome
- Mensagem de erro melhorada: "Verifique os campos destacados e tente novamente"
- `role="alert"` e `aria-live="polite"` adicionados às mensagens de erro
- Foco automático no primeiro campo com erro ao falhar validação

### 3. Pessoas (`/pessoas`)

**Problemas encontrados:**
- Botão de limpar busca sem aria-label
- Ícone X sem aria-hidden
- Mensagem de erro genérica na validação

**Correções:**
- Adicionado `aria-label="Limpar busca"` no botão X
- `aria-hidden="true"` adicionado nos ícones decorativos
- Scroll automático para campo com erro + foco

### 4. Pessoa Detail

**Correções:**
- Botão fechar com `aria-label="Fechar detalhes"`
- Botão inativar pessoa com `aria-label`

### 5. Títulos (Pagar/Receber)

**Problemas encontrados:**
- Uso de `prompt()` nativo para cancelamento (muito ruim para UX)
- Botões de ação sem aria-labels
- Ações invisíveis até hover

**Correções:**
- Substituído `prompt()` por Dialog modal acessível
- Campo de motivo com validação em tempo real
- `aria-label` em todos os botões de ação
- Ações visíveis em touch devices

### 6. Título Form / Baixa Form

**Correções:**
- Focus automático no campo com erro
- Scroll suave até o campo problemático
- Mensagem de erro melhorada

### 7. Plano de Contas (`/accounts`)

**Correções:**
- Botões expand/collapse com `aria-label` descritivo
- Botão editar com `aria-label` dinâmico
- Focus no campo vazio ao falhar validação

### 8. Patrimônio (`/patrimonio`)

**Correções:**
- Ações visíveis por padrão em touch
- `aria-label` em todos os botões de ação
- Focus + scroll no campo com erro

### 9. Módulo E (Projetos, Centros de Custo, Fundos)

**Problemas graves encontrados:**
- Uso de `confirm()` nativo para inativação
- Uso de `prompt()` para cancelamento de projeto

**Correções:**
- Criados Dialogs modais acessíveis para confirmação
- `role="alertdialog"` para diálogos de confirmação
- `aria-label` em todos os botões de ação
- `autoFocus` no primeiro campo dos formulários

### 10. Períodos Contábeis (`/periods`)

**Correções:**
- Validação de mês antes de criar período
- `aria-pressed` nos botões de período selecionado
- `aria-label` descritivo nos botões da timeline
- Botão fechar detalhes com `aria-label`

### 11. Conciliação (`/conciliacao`)

**Correções:**
- `aria-pressed` no seletor de conta
- `aria-label` nos botões de vincular
- `aria-label` no botão de ocultar sugestões

### 12. Governança (Usuários, Papéis, Permissões)

**Problemas encontrados:**
- Uso de `confirm()` nativo para excluir papel
- Botões de atualizar sem aria-label

**Correções:**
- Criado Dialog modal para confirmação de exclusão
- `aria-label` em todos os botões de ação
- Botões de refresh com `aria-label="Atualizar lista"`

---

## Padrão de Usabilidade Consolidado

### Formulários (Create/Update)

1. **AutoFocus:** Primeiro campo editável recebe foco automaticamente
2. **Validação:** Ao falhar, foco vai para primeiro campo com erro
3. **Mensagens:** Específicas (nunca "Corrija os erros"), ex: "Verifique os campos destacados"
4. **Erros:** Com `role="alert"` e `aria-live="polite"`
5. **Campos obrigatórios:** Indicados com `*` e label clara
6. **Botões:** Primário à direita, Secundário (Cancelar) à esquerda
7. **Loading:** Texto descritivo ("Salvando..." vs spinner)

### Tabelas/Listas (Read)

1. **Ações:** Sempre com `aria-label` descritivo
2. **Touch:** Ações visíveis (opacity 60%+) em dispositivos touch
3. **Empty State:** Mensagem explicativa + ação sugerida
4. **Loading:** Skeletons sem "pular" layout
5. **Busca:** Campo com botão de limpar acessível

### Exclusão/Inativação (Delete)

1. **Nunca usar** `confirm()` ou `prompt()` nativos
2. **Dialog modal:** Com `role="alertdialog"`
3. **DialogDescription:** Explica consequências
4. **Botão destrutivo:** Texto claro ("Confirmar Exclusão")
5. **Motivo:** Quando necessário, campo com validação mínima

### Modais/Dialogs

1. **DialogTitle:** Sempre presente
2. **DialogDescription:** Contexto adicional
3. **Foco:** Trapped dentro do modal
4. **Escape:** Fecha modal (comportamento padrão)
5. **Scroll:** Evitar scroll duplo

### Botões com Ícone

1. **Sempre** incluir `aria-label` descritivo
2. **Ícones decorativos:** `aria-hidden="true"`
3. **Tooltips:** Opcionais, mas recomendados para ações menos óbvias

### Feedback ao Usuário

1. **Toast success:** Confirma ação concluída
2. **Toast error:** Explica o problema + próximo passo
3. **Loading states:** Botões desabilitados + texto indicativo

---

## Arquivos Modificados

1. `client/src/pages/ContasFinanceiras.tsx`
2. `client/src/components/caixa/ContaFinanceiraForm.tsx`
3. `client/src/components/ui/form-section.tsx`
4. `client/src/pages/Pessoas.tsx`
5. `client/src/components/pessoas/PessoaForm.tsx`
6. `client/src/components/pessoas/PessoaDetail.tsx`
7. `client/src/pages/TitulosCrud.tsx`
8. `client/src/components/titulos/TituloForm.tsx`
9. `client/src/components/titulos/BaixaForm.tsx`
10. `client/src/pages/Accounts.tsx`
11. `client/src/pages/Patrimonio.tsx`
12. `client/src/pages/ModuloE.tsx`
13. `client/src/components/modulo-e/CentroCusto.tsx`
14. `client/src/components/modulo-e/Fundo.tsx`
15. `client/src/components/modulo-e/Projeto.tsx`
16. `client/src/components/modulo-e/Movimentacoes.tsx`
17. `client/src/pages/Periods.tsx`
18. `client/src/pages/Conciliacao.tsx`
19. `client/src/components/caixa/ConciliacaoPanel.tsx`
20. `client/src/pages/Governanca.tsx`
21. `client/src/components/governanca/UsuariosTab.tsx`
22. `client/src/components/governanca/PapeisTab.tsx`
23. `client/src/components/governanca/PermissoesTab.tsx`

---

## Critérios de Aceite Atendidos

- ✅ Fluxos principais do CRUD executáveis sem dúvida e sem "tentativa e erro"
- ✅ Mensagens de erro orientam ação (não apenas "inválido")
- ✅ Sem uso de `confirm()` ou `prompt()` nativos
- ✅ Navegação por teclado funcional (Tab/Enter/Esc)
- ✅ Consistência visual e textual entre módulos
- ✅ Botões com ícone acessíveis (`aria-label`)
- ✅ Focus automático em campos/erros



