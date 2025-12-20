import { useState } from 'react';
import { Settings, RefreshCw, Edit2, History, Save, X, Building2, DollarSign, Calculator, Bell } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tooltip } from '@/components/ui/tooltip-help';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const categoriaConfig: Record<string, { label: string; icon: typeof Settings; color: string }> = {
  organizacao: { label: 'Organização', icon: Building2, color: 'text-blue-600' },
  financeiro: { label: 'Financeiro', icon: DollarSign, color: 'text-green-600' },
  contabilidade: { label: 'Contabilidade', icon: Calculator, color: 'text-purple-600' },
  notificacoes: { label: 'Notificações', icon: Bell, color: 'text-amber-600' },
  outros: { label: 'Outros', icon: Settings, color: 'text-slate-600' },
};

const configLabels: Record<string, { label: string; tipo: 'text' | 'number'; descricao: string }> = {
  'organizacao.nome': { label: 'Nome da Entidade', tipo: 'text', descricao: 'Razão social da igreja/entidade' },
  'organizacao.cnpj': { label: 'CNPJ', tipo: 'text', descricao: 'CNPJ da entidade' },
  'financeiro.dia_vencimento_padrao': { label: 'Dia de Vencimento Padrão', tipo: 'number', descricao: 'Dia do mês para contribuições (1-28)' },
  'financeiro.tolerancia_vencimento': { label: 'Dias de Tolerância', tipo: 'number', descricao: 'Dias além do vencimento sem multa' },
  'contabilidade.inicio_exercicio': { label: 'Mês de Início do Exercício', tipo: 'number', descricao: 'Mês de início do exercício contábil (1-12)' },
  'notificacoes.email_financeiro': { label: 'E-mail Financeiro', tipo: 'text', descricao: 'E-mail para alertas de vencimentos' },
  'notificacoes.vencimentos_antecedencia': { label: 'Antecedência de Alerta', tipo: 'number', descricao: 'Dias antes do vencimento para avisar' },
};

interface ConfiguracoesTabProps {
  readOnly?: boolean;
}

export function ConfiguracoesTab({ readOnly = false }: ConfiguracoesTabProps) {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<any>(null);
  const [editValue, setEditValue] = useState<string>('');

  const utils = trpc.useUtils();
  const { data: configs, isLoading, refetch } = trpc.configSistema.list.useQuery();

  const updateMutation = trpc.configSistema.update.useMutation({
    onSuccess: () => {
      toast.success('Configuração atualizada com sucesso');
      setShowEditDialog(false);
      utils.configSistema.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleOpenEdit = (config: any) => {
    setSelectedConfig(config);
    setEditValue(typeof config.valor === 'object' ? JSON.stringify(config.valor) : String(config.valor || ''));
    setShowEditDialog(true);
  };

  const handleSave = () => {
    if (!selectedConfig) return;
    const configInfo = configLabels[selectedConfig.chave];
    let valor: any = editValue;
    if (configInfo?.tipo === 'number') {
      valor = parseInt(editValue) || 0;
    }
    updateMutation.mutate({ chave: selectedConfig.chave, valor });
  };

  const formatValue = (valor: any): string => {
    if (valor === null || valor === undefined || valor === '') return '(não definido)';
    if (typeof valor === 'object') return JSON.stringify(valor);
    return String(valor);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configurações do Sistema
          </h2>
          <p className="text-sm text-muted-foreground">Parâmetros gerais do sistema</p>
        </div>
        <Button variant="outline" size="icon" onClick={() => refetch()}>
          <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
        </Button>
      </div>

      {/* Configurações por categoria */}
      {isLoading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          </CardContent>
        </Card>
      ) : (
        <Accordion type="multiple" defaultValue={Object.keys(categoriaConfig)} className="space-y-2">
          {Object.entries(categoriaConfig).map(([categoria, info]) => {
            const configsCategoria = configs?.[categoria] || [];
            if (configsCategoria.length === 0 && categoria === 'outros') return null;
            
            const CatIcon = info.icon;
            return (
              <AccordionItem key={categoria} value={categoria} className="border rounded-lg overflow-hidden">
                <AccordionTrigger className="px-4 py-3 hover:bg-muted/50">
                  <div className="flex items-center gap-3">
                    <CatIcon className={cn('h-5 w-5', info.color)} />
                    <span className="font-medium">{info.label}</span>
                    <span className="text-xs text-muted-foreground">({configsCategoria.length} itens)</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  {configsCategoria.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4">Nenhuma configuração nesta categoria</p>
                  ) : (
                    <div className="space-y-3">
                      {configsCategoria.map((config: any) => {
                        const configInfo = configLabels[config.chave];
                        return (
                          <div key={config.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                            <div className="flex-1">
                              <div className="font-medium text-sm">
                                {configInfo?.label || config.chave}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {configInfo?.descricao || config.descricao}
                              </div>
                              <div className="mt-1">
                                <code className="text-sm bg-muted px-2 py-0.5 rounded">
                                  {formatValue(config.valor)}
                                </code>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              {!readOnly && (
                                <Tooltip content="Editar">
                                  <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(config)}>
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                </Tooltip>
                              )}
                              <Tooltip content="Ver histórico">
                                <Button variant="ghost" size="icon">
                                  <History className="h-4 w-4" />
                                </Button>
                              </Tooltip>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}

      {/* Dialog: Editar Configuração */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="h-5 w-5" />
              Editar Configuração
            </DialogTitle>
            <DialogDescription>
              {configLabels[selectedConfig?.chave]?.label || selectedConfig?.chave}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <Label>Chave</Label>
              <Input value={selectedConfig?.chave || ''} disabled className="mt-1 bg-muted" />
            </div>
            <div>
              <Label>Valor</Label>
              <Input
                type={configLabels[selectedConfig?.chave]?.tipo === 'number' ? 'number' : 'text'}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {configLabels[selectedConfig?.chave]?.descricao}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

