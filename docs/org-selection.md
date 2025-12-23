# Seleção de Organização

Sistema de seleção de empresa/ambiente que permite gerenciar múltiplos tipos de negócio no CentrOS.

## Arquivos

| Arquivo | Descrição |
|---------|-----------|
| `client/src/lib/org.ts` | Hook com tipos e funções de persistência |
| `client/src/pages/OrgSelect.tsx` | Splash screen de seleção |
| `client/src/App.tsx` | Rota `/org-select` + `OrgGuard` |
| `client/src/components/DashboardLayout.tsx` | Botão "Trocar Empresa" |

## Fluxo

1. Usuário abre o app
2. `OrgGuard` verifica se existe `selected_org` no localStorage
3. Se não existe → redireciona para `/org-select`
4. Usuário escolhe Centro Espírita ou Fintech
5. `setOrg(type)` salva no localStorage e redireciona para `/`
6. Em qualquer momento, usuário pode clicar "Trocar Empresa" no sidebar

## Persistência

- Key: `selected_org`
- Formato JSON:

```json
{
  "id": "spiritist_center_1703347200000",
  "type": "spiritist_center",
  "displayName": "Centro Espírita",
  "createdAt": "2024-12-23T12:00:00.000Z"
}
```

## API

```typescript
import { getOrg, setOrg, clearOrg, hasOrg, Org, OrgType } from '@/lib/org';

getOrg(): Org | null      // Retorna org atual ou null
setOrg(type: OrgType): Org // Salva e retorna nova org
clearOrg(): void           // Remove org do localStorage
hasOrg(): boolean          // Verifica se existe org selecionada
```

## Adicionar Novo Tipo de Organização

1. Adicionar novo valor em `OrgType`:

```typescript
export type OrgType = 'spiritist_center' | 'fintech' | 'novo_tipo';
```

2. Adicionar configuração em `ORG_CONFIGS`:

```typescript
const ORG_CONFIGS: Record<OrgType, Omit<Org, 'id' | 'createdAt'>> = {
  // ...existentes
  novo_tipo: {
    type: 'novo_tipo',
    displayName: 'Novo Tipo',
  },
};
```

3. Adicionar card na splash (`OrgSelect.tsx`):

```typescript
const orgs = [
  // ...existentes
  { type: 'novo_tipo', label: 'Novo Tipo', icon: SomeIcon, desc: 'Descrição' },
];
```

