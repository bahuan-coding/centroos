# Governança e Auditoria

| Campo | Rota | Arquivo |
|-------|------|---------|
| Governança | `/governanca` | `client/src/pages/Governanca.tsx` |

## Visão Geral

Módulo de controle de acessos, aprovações e trilha de auditoria. Acesso baseado em permissões.

## Seções/Tabs

| Seção | Permissão | Descrição |
|-------|-----------|-----------|
| Visão Geral | - | Dashboard de governança |
| Usuários | `sistema.usuario.gerenciar` | Gerenciamento de usuários |
| Papéis | `sistema.papel.gerenciar` | Configuração de papéis |
| Aprovações | - | Fila de aprovações pendentes |
| Auditoria | `sistema.auditoria.visualizar` | Trilha de auditoria |
| Configurações | `sistema.configuracao.editar` | Configurações do sistema |

## Seção: Usuários

| Label | name/id | Tipo | Obrigatório | Validação |
|-------|---------|------|-------------|-----------|
| Nome | `nome` | text | Sim | min 3 chars |
| Email | `email` | email | Sim | Formato email |
| Papel | `papelId` | select | Não | Papéis disponíveis |
| Ativo | `ativo` | switch | Não | default: true |

## Seção: Papéis

| Label | name/id | Tipo | Obrigatório | Validação |
|-------|---------|------|-------------|-----------|
| Nome do Papel | `nome` | text | Sim | min 3 chars |
| Descrição | `descricao` | text | Não | - |
| Permissões | `permissoes` | checkbox-group | Não | Lista de permissões |

## Seção: Aprovações

| Campo | Descrição |
|-------|-----------|
| Tipo | Tipo da solicitação |
| Solicitante | Quem pediu |
| Data | Quando solicitou |
| Detalhes | Dados da solicitação |
| Ações | Aprovar/Rejeitar |

## Seção: Auditoria

| Label | name/id | Tipo | Obrigatório |
|-------|---------|------|-------------|
| Período | `periodo` | daterange | Não |
| Usuário | `usuarioId` | select | Não |
| Ação | `acao` | select | Não |
| Entidade | `entidade` | select | Não |

## Queries tRPC

| Query/Mutation | Descrição |
|----------------|-----------|
| `usuarios.list` | Lista usuários |
| `usuarios.countAdmins` | Conta administradores |
| `aprovacoes.listPendentes` | Lista aprovações pendentes |
| `auditoria.stats` | Estatísticas de auditoria |
| `auditoria.list` | Lista eventos |

## Observações

- Layout Master-Detail (navegação lateral)
- Badge de contagem em Aprovações
- Componentes modulares por seção
- Responsivo com dropdown mobile








