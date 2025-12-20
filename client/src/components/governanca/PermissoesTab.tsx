import { useState } from 'react';
import { CheckSquare, RefreshCw, Save, Filter, X, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PermissoesTabProps {
  readOnly?: boolean;
}

export function PermissoesTab({ readOnly = false }: PermissoesTabProps) {
  const [filtroModulo, setFiltroModulo] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [changes, setChanges] = useState<Record<string, Record<string, boolean>>>({});
  const [hasChanges, setHasChanges] = useState(false);

  const utils = trpc.useUtils();
  const { data: modulos } = trpc.permissoes.modulos.useQuery();
  const { data: matriz, isLoading, refetch } = trpc.permissoes.matriz.useQuery();
  const updateMutation = trpc.permissoes.updatePapelPermissoes.useMutation({
    onSuccess: () => {
      toast.success('Permissões atualizadas com sucesso');
      utils.permissoes.matriz.invalidate();
      setChanges({});
      setHasChanges(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const papeis = matriz?.papeis || [];
  const permissoes = matriz?.permissoes || [];
  const matrizData = matriz?.matriz || {};

  // Filtrar permissões
  const permissoesFiltradas = permissoes.filter((p: any) => {
    if (filtroModulo !== 'all' && p.modulo !== filtroModulo) return false;
    if (search && !p.nome.toLowerCase().includes(search.toLowerCase()) && !p.codigo.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Agrupar por módulo
  const permissoesPorModulo: Record<string, any[]> = {};
  permissoesFiltradas.forEach((p: any) => {
    if (!permissoesPorModulo[p.modulo]) permissoesPorModulo[p.modulo] = [];
    permissoesPorModulo[p.modulo].push(p);
  });

  const isChecked = (papelId: string, permissaoId: string) => {
    if (changes[papelId]?.[permissaoId] !== undefined) return changes[papelId][permissaoId];
    return matrizData[papelId]?.[permissaoId] || false;
  };

  const handleToggle = (papelId: string, permissaoId: string) => {
    const current = isChecked(papelId, permissaoId);
    setChanges(prev => ({
      ...prev,
      [papelId]: {
        ...(prev[papelId] || {}),
        [permissaoId]: !current,
      },
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    // Para cada papel com alterações, salvar
    Object.keys(changes).forEach(papelId => {
      const permissoesAtuais: string[] = [];
      permissoes.forEach((perm: any) => {
        if (isChecked(papelId, perm.id)) {
          permissoesAtuais.push(perm.id);
        }
      });
      updateMutation.mutate({ papelId, permissoes: permissoesAtuais });
    });
  };

  const handleReset = () => {
    setChanges({});
    setHasChanges(false);
  };

  const moduloLabels: Record<string, string> = {
    pessoas: 'Identidades',
    bancos: 'Caixa/Bancos',
    titulos: 'Pagar/Receber',
    contabilidade: 'Contabilidade',
    projetos: 'Projetos/Fundos',
    patrimonio: 'Patrimônio',
    sistema: 'Sistema',
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <CheckSquare className="h-5 w-5" />
            Matriz de Permissões
          </h2>
          <p className="text-sm text-muted-foreground">Configure as permissões de cada papel</p>
        </div>
        <div className="flex gap-2">
          {hasChanges && (
            <>
              <Button variant="outline" onClick={handleReset}>
                <X className="h-4 w-4 mr-2" />
                Descartar
              </Button>
              <Button onClick={handleSave} disabled={updateMutation.isPending}>
                <Save className="h-4 w-4 mr-2" />
                {updateMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </>
          )}
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar permissão..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filtroModulo} onValueChange={setFiltroModulo}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Módulo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os módulos</SelectItem>
                {modulos?.map((m: string) => (
                  <SelectItem key={m} value={m}>{moduloLabels[m] || m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Matriz */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="text-left p-3 font-medium min-w-[200px]">Permissão</th>
                    {papeis.map((papel: any) => (
                      <th key={papel.id} className="text-center p-3 font-medium min-w-[100px]">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-xs">{papel.nome}</span>
                          <Badge variant="outline" className="text-[10px]">Nv. {papel.nivel}</Badge>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(permissoesPorModulo).map(([modulo, perms]) => (
                    <>
                      <tr key={`header-${modulo}`} className="bg-slate-100">
                        <td colSpan={papeis.length + 1} className="p-2 font-semibold text-slate-700">
                          {moduloLabels[modulo] || modulo}
                        </td>
                      </tr>
                      {perms.map((perm: any) => (
                        <tr key={perm.id} className="border-b hover:bg-muted/30">
                          <td className="p-3">
                            <div>
                              <span className="font-medium">{perm.nome}</span>
                              <code className="text-xs text-muted-foreground ml-2">{perm.codigo}</code>
                            </div>
                          </td>
                          {papeis.map((papel: any) => {
                            const checked = isChecked(papel.id, perm.id);
                            const hasChange = changes[papel.id]?.[perm.id] !== undefined;
                            return (
                              <td key={`${papel.id}-${perm.id}`} className="text-center p-3">
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={() => !readOnly && handleToggle(papel.id, perm.id)}
                                  disabled={readOnly}
                                  className={cn(hasChange && 'ring-2 ring-amber-400')}
                                />
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legenda */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded border-2 border-amber-400" />
          <span>Alteração pendente</span>
        </div>
      </div>
    </div>
  );
}

