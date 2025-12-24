import { useState } from 'react';
import { X, Edit2, FolderTree, TrendingUp, TrendingDown, Scale, Zap, ChevronRight, Save, History, Layers, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ContaDetailProps {
  contaId: string;
  onClose: () => void;
  onUpdated?: () => void;
}

const typeLabels: Record<string, string> = {
  ativo: 'Ativo',
  passivo: 'Passivo',
  patrimonio_social: 'Patrimônio',
  receita: 'Receita',
  despesa: 'Despesa',
};

const typeColors: Record<string, { bg: string; text: string; gradient: string }> = {
  ativo: { bg: 'bg-blue-500/10', text: 'text-blue-600', gradient: 'from-blue-500 to-blue-600' },
  passivo: { bg: 'bg-orange-500/10', text: 'text-orange-600', gradient: 'from-orange-500 to-orange-600' },
  patrimonio_social: { bg: 'bg-purple-500/10', text: 'text-purple-600', gradient: 'from-purple-500 to-purple-600' },
  receita: { bg: 'bg-emerald-500/10', text: 'text-emerald-600', gradient: 'from-emerald-500 to-emerald-600' },
  despesa: { bg: 'bg-rose-500/10', text: 'text-rose-600', gradient: 'from-rose-500 to-rose-600' },
};

const typeIcons: Record<string, typeof TrendingUp> = {
  ativo: TrendingUp,
  passivo: TrendingDown,
  patrimonio_social: Scale,
  receita: TrendingUp,
  despesa: TrendingDown,
};

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function ContaDetail({ contaId, onClose, onUpdated }: ContaDetailProps) {
  const utils = trpc.useUtils();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', description: '' });

  const { data: tree = [] } = trpc.accounts.planoContasTree.useQuery();
  
  const conta = tree.find(c => c.id === contaId);
  const contaPai = conta?.contaPaiId ? tree.find(c => c.id === conta.contaPaiId) : null;
  const contasFilhas = tree.filter(c => c.contaPaiId === contaId);
  
  const updateMutation = trpc.accounts.update.useMutation({
    onSuccess: () => {
      toast.success('Conta atualizada');
      utils.accounts.planoContasTree.invalidate();
      setIsEditing(false);
      onUpdated?.();
    },
    onError: (err) => toast.error(err.message),
  });

  if (!conta) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center">
        <FolderTree className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-lg font-medium">Conta não encontrada</p>
        <Button onClick={onClose} className="mt-4" variant="outline">Voltar</Button>
      </div>
    );
  }

  const colors = typeColors[conta.tipo] || typeColors.ativo;
  const TypeIcon = typeIcons[conta.tipo] || TrendingUp;
  const isSynthetic = conta.classificacao === 'sintetica';

  const handleStartEdit = () => {
    setEditForm({ name: conta.nome, description: '' });
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!editForm.name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    updateMutation.mutate({ id: Number(conta.id), name: editForm.name, description: editForm.description });
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className={cn('text-white p-6 shrink-0 relative', `bg-gradient-to-br ${colors.gradient}`)}>
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/20 transition-colors"
          aria-label="Fechar detalhes"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <TypeIcon className="h-7 w-7" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white/70 font-mono">{conta.codigo}</p>
            <h2 className="text-xl font-bold truncate">{conta.nome}</h2>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge variant="outline" className="border-white/40 text-white text-xs">
                {typeLabels[conta.tipo]}
              </Badge>
              <Badge variant="outline" className="border-white/40 text-white text-xs">
                {isSynthetic ? 'Σ Sintética' : '📊 Analítica'}
              </Badge>
              {!conta.ativo && <Badge className="bg-red-500 text-white text-xs">Inativa</Badge>}
              {conta.qtdTitulos >= 10 && (
                <Badge className="bg-amber-500/80 text-white text-xs">
                  <Zap className="h-3 w-3 mr-1" />Alta Mov.
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="text-center">
            <div className="text-2xl font-bold">{conta.qtdTitulos}</div>
            <div className="text-xs text-white/70">Movimentos</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{formatCurrency(conta.valorTotal)}</div>
            <div className="text-xs text-white/70">Saldo</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{contasFilhas.length}</div>
            <div className="text-xs text-white/70">Subcontas</div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isEditing ? (
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Edit2 className="h-4 w-4" /> Editar Conta
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input 
                  id="name"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="Nome da conta"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrição (opcional)</Label>
                <Textarea 
                  id="description"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="Observações..."
                  rows={3}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setIsEditing(false)} className="flex-1">
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={updateMutation.isPending} className="flex-1">
                  <Save className="h-4 w-4 mr-2" />
                  {updateMutation.isPending ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Informações */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Informações
                </CardTitle>
              </CardHeader>
              <CardContent className="py-2 space-y-2">
                <div className="flex justify-between py-1.5 px-2 rounded bg-muted/50">
                  <span className="text-xs text-muted-foreground">Tipo</span>
                  <span className={cn('text-sm font-medium', colors.text)}>{typeLabels[conta.tipo]}</span>
                </div>
                <div className="flex justify-between py-1.5 px-2 rounded bg-muted/50">
                  <span className="text-xs text-muted-foreground">Natureza do Saldo</span>
                  <span className="text-sm font-medium">{conta.naturezaSaldo === 'devedora' ? 'Devedora' : 'Credora'}</span>
                </div>
                <div className="flex justify-between py-1.5 px-2 rounded bg-muted/50">
                  <span className="text-xs text-muted-foreground">Classificação</span>
                  <span className="text-sm font-medium">{isSynthetic ? 'Sintética (agrupadora)' : 'Analítica (lançamentos)'}</span>
                </div>
                <div className="flex justify-between py-1.5 px-2 rounded bg-muted/50">
                  <span className="text-xs text-muted-foreground">Aceita Lançamento</span>
                  <span className="text-sm font-medium">{conta.aceitaLancamento ? '✓ Sim' : '✗ Não'}</span>
                </div>
                <div className="flex justify-between py-1.5 px-2 rounded bg-muted/50">
                  <span className="text-xs text-muted-foreground">Nível</span>
                  <span className="text-sm font-medium">{conta.nivel + 1}º nível</span>
                </div>
              </CardContent>
            </Card>

            {/* Conta Pai */}
            {contaPai && (
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Layers className="h-4 w-4" /> Conta Pai
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-2">
                  <div className="flex items-center gap-3 p-2 rounded bg-muted/50">
                    <span className="font-mono text-xs text-muted-foreground">{contaPai.codigo}</span>
                    <span className="text-sm font-medium flex-1 truncate">{contaPai.nome}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Contas Filhas */}
            {contasFilhas.length > 0 && (
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FolderTree className="h-4 w-4" /> Subcontas
                    <Badge variant="secondary" className="ml-auto">{contasFilhas.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-2">
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {contasFilhas.map(filha => {
                      const filhaColors = typeColors[filha.tipo] || typeColors.ativo;
                      return (
                        <div key={filha.id} className="flex items-center gap-3 py-1.5 px-2 rounded hover:bg-muted/50">
                          <span className={cn('w-2 h-2 rounded-full', filhaColors.text.replace('text', 'bg'))} />
                          <span className="font-mono text-xs text-muted-foreground">{filha.codigo}</span>
                          <span className="text-sm flex-1 truncate">{filha.nome}</span>
                          {filha.qtdTitulos > 0 && (
                            <Badge variant="secondary" className="text-[10px]">{filha.qtdTitulos}</Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Movimentações Recentes (placeholder) */}
            {!isSynthetic && conta.qtdTitulos > 0 && (
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <History className="h-4 w-4" /> Movimentações
                    <Badge variant="secondary" className="ml-auto">{conta.qtdTitulos}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-2">
                  <div className="text-center py-6 text-muted-foreground">
                    <span className="text-3xl">📊</span>
                    <p className="text-sm mt-2">{conta.qtdTitulos} lançamentos nesta conta</p>
                    <p className="text-xs">Total: {formatCurrency(conta.valorTotal)}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <div className="pt-4">
              <Button onClick={handleStartEdit} variant="outline" className="w-full">
                <Edit2 className="h-4 w-4 mr-2" /> Editar Conta
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}










