# Notas de Versionamento

**Data**: 2025-12-23

## Single Source of Truth

A versão do sistema é definida em um único lugar:

```
package.json → "version": "1.0.0"
```

## Como a Versão é Propagada

```
package.json (fonte)
    ↓
vite.config.ts (injetada via `define`)
    ↓
client/src/lib/version.ts (exportada como constante)
    ↓
DashboardLayout.tsx (exibida no footer da sidebar)
```

## Arquivos Envolvidos

| Arquivo | Responsabilidade |
|---------|------------------|
| `package.json` | **Fonte da verdade** - define a versão |
| `vite.config.ts` | Injeta `__APP_VERSION__` no build |
| `client/src/lib/version.ts` | Exporta `APP_VERSION` para uso em código |
| `client/src/components/DashboardLayout.tsx` | Exibe versão no footer |

## Código Relevante

### vite.config.ts

```typescript
import pkg from './package.json';

export default defineConfig({
  // ...
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
});
```

### client/src/lib/version.ts

```typescript
export const APP_VERSION = __APP_VERSION__;

declare global {
  const __APP_VERSION__: string;
}
```

### DashboardLayout.tsx (footer)

```tsx
import { APP_VERSION } from '@/lib/version';
// ...
<p className="text-[10px] text-muted-foreground text-center mt-2">v{APP_VERSION}</p>
```

## Como Atualizar a Versão

1. Edite `package.json`:
   ```json
   "version": "1.1.0"
   ```

2. Rebuild:
   ```bash
   npm run build
   ```

A versão será automaticamente propagada para o frontend.

## Não Fazer

- ❌ Não criar arquivos de versão separados
- ❌ Não hardcodar versão em múltiplos lugares
- ❌ Não criar fluxos de release automatizados (fora do escopo atual)

## Próximos Passos (Fora do Escopo Atual)

- Integração com CI/CD para bump automático
- Exibição de changelog
- Versionamento semântico automatizado

