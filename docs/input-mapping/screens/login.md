# Login

| Campo | Rota | Arquivo |
|-------|------|---------|
| Login | `/login` | `client/src/pages/Login.tsx` |

## Inputs

| Label | name/id | Tipo | Obrigatório | Validação | Source | Destination | Notas |
|-------|---------|------|-------------|-----------|--------|-------------|-------|
| Email | `email` | email | Sim | type="email" | Usuário | localStorage: `user_email` | Mock auth |
| Senha | `password` | password | Sim | - | Usuário | - | Não persistida |

## Eventos

| Evento | Tipo | Descrição |
|--------|------|-----------|
| handleLogin | form submit | Autentica usuário, salva token em localStorage, redireciona para `/` |

## Storage

- `auth_token`: Token mock gerado com timestamp
- `user_email`: Email do usuário
- `user_role`: Role fixo como 'admin' (mock)

## Observações

- Autenticação é mock (sem backend real)
- Aceita qualquer email/senha não vazios






