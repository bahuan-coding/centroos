import { useState, useMemo } from 'react';
import { Upload, FileSpreadsheet, Calendar, CheckCircle2, Clock, AlertCircle, Eye, Trash2, RefreshCw, Loader2, Lock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState, EMPTY_STATES } from '@/components/ui/empty-state';
import { ProgressBar } from '@/components/ui/progress-bar';
import { ExtratoImportForm, FecharExtratoModal } from '@/components/caixa';
import { cn } from '@/lib/utils';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { useLocation } from 'wouter';

// Types
interface ContaFinanceira {
  id: string;
  nome: string;
  tipo: string;
  bancoNome?: string;
  saldoAtual: number;
}

interface Extrato {
  id: string;
  contaId: string;
  contaNome: string;
  arquivoNome: string;
  arquivoTipo: 'ofx' | 'csv' | 'txt';
  dataInicio: string;
  dataFim: string;
  totalLinhas: number;
  linhasConciliadas: number;
  status: 'pendente' | 'processando' | 'processado' | 'erro';
  importadoEm: string;
}


const STATUS_CONFIG = {
  pendente: { label: 'Pendente', icon: Clock, color: 'text-amber-600 bg-amber-500/10' },
  processando: { label: 'Processando', icon: RefreshCw, color: 'text-blue-600 bg-blue-500/10' },
  processado: { label: 'Processado', icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-500/10' },
  erro: { label: 'Erro', icon: AlertCircle, color: 'text-rose-600 bg-rose-500/10' },
};

function ExtratoCard({ extrato, onView, onFechar }: { extrato: Extrato; onView: () => void; onFechar: () => void }) {
  const statusConfig = STATUS_CONFIG[extrato.status];
  const StatusIcon = statusConfig.icon;
  const progress = extrato.totalLinhas > 0 ? Math.round((extrato.linhasConciliadas / extrato.totalLinhas) * 100) : 0;
  const isComplete = progress === 100;
  const pendentes = extrato.totalLinhas - extrato.linhasConciliadas;

  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardContent className="pt-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn('p-2.5 rounded-lg', extrato.arquivoTipo === 'ofx' ? 'bg-blue-500/10' : 'bg-amber-500/10')}>
              <FileSpreadsheet className={cn('h-5 w-5', extrato.arquivoTipo === 'ofx' ? 'text-blue-600' : 'text-amber-600')} />
            </div>
            <div>
              <h3 className="font-medium text-sm">{extrato.contaNome}</h3>
              <p className="text-xs text-muted-foreground truncate max-w-[200px]">{extrato.arquivoNome}</p>
            </div>
          </div>

          <Badge variant="outline" className={cn('text-[10px]', statusConfig.color)}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {statusConfig.label}
          </Badge>
        </div>

        {/* Period */}
        <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" />
          <span>
            {new Date(extrato.dataInicio).toLocaleDateString('pt-BR')} — {new Date(extrato.dataFim).toLocaleDateString('pt-BR')}
          </span>
        </div>

        {/* Progress */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-muted-foreground">Conciliação</span>
            <span className={cn('font-medium', isComplete ? 'text-emerald-600' : 'text-foreground')}>
              {extrato.linhasConciliadas}/{extrato.totalLinhas} ({progress}%)
            </span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all', isComplete ? 'bg-emerald-500' : 'bg-primary')}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t">
          <p className="text-[10px] text-muted-foreground">
            Importado em {new Date(extrato.importadoEm).toLocaleDateString('pt-BR')}
          </p>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onView} title="Conciliar">
              <Eye className="h-3.5 w-3.5" />
            </Button>
            {isComplete && (
              <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-600 hover:bg-emerald-50" onClick={onFechar} title="Fechar extrato">
                <Lock className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button size="icon" variant="ghost" className="h-7 w-7 text-rose-600 hover:bg-rose-50" title="Excluir">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Extratos() {
  const [, navigate] = useLocation();
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [filterConta, setFilterConta] = useState<string>('all');
  const [fecharModalOpen, setFecharModalOpen] = useState(false);
  const [extratoParaFechar, setExtratoParaFechar] = useState<Extrato | null>(null);

  const { data: extratosData, isLoading: loadingExtratos } = trpc.extratos.list.useQuery();
  const { data: contasData, isLoading: loadingContas } = trpc.contasFinanceiras.list.useQuery();
  const { data: statsData } = trpc.extratos.stats.useQuery();
  
  const extratos: Extrato[] = useMemo(() => {
    if (!extratosData) return [];
    return extratosData.map((e: any) => ({
      id: e.extrato.id,
      contaId: e.extrato.contaFinanceiraId,
      contaNome: e.conta?.nome || 'Conta desconhecida',
      arquivoNome: e.extrato.arquivoNome,
      arquivoTipo: e.extrato.arquivoTipo as 'ofx' | 'csv' | 'txt',
      dataInicio: e.extrato.dataInicio || '',
      dataFim: e.extrato.dataFim || '',
      totalLinhas: e.extrato.totalLinhas || 0,
      linhasConciliadas: e.extrato.linhasConciliadas || 0,
      status: e.extrato.status as 'pendente' | 'processando' | 'processado' | 'erro',
      importadoEm: e.extrato.importadoEm,
    }));
  }, [extratosData]);
  
  const contas: ContaFinanceira[] = useMemo(() => {
    if (!contasData) return [];
    return contasData.map((c: any) => ({
      id: c.id,
      nome: c.nome,
      tipo: c.tipo,
      bancoNome: c.bancoNome,
      saldoAtual: c.saldoAtual || 0,
    }));
  }, [contasData]);

  // Filtered extratos
  const filteredExtratos = filterConta === 'all' 
    ? extratos 
    : extratos.filter(e => e.contaId === filterConta);

  // Stats
  const totalLinhas = statsData?.linhas || 0;
  const totalConciliadas = statsData?.conciliados || 0;
  const pendentes = statsData?.pendentes || 0;
  
  if (loadingExtratos || loadingContas) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Extratos Bancários"
        description="Importe e gerencie extratos para conciliação"
        icon={<FileSpreadsheet className="h-8 w-8 text-primary" />}
        actions={
          <Button onClick={() => setImportDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Importar Extrato
          </Button>
        }
      />

      {/* Summary Cards */}
      <div className="grid sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-primary/10">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{extratos.length}</p>
                <p className="text-xs text-muted-foreground">Extratos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-muted">
                <Clock className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalLinhas}</p>
                <p className="text-xs text-muted-foreground">Total Linhas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-500/10">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-600">{totalConciliadas}</p>
                <p className="text-xs text-muted-foreground">Conciliadas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-amber-500/10">
                <AlertCircle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-600">{pendentes}</p>
                <p className="text-xs text-muted-foreground">Com Pendências</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-4">
        <Select value={filterConta} onValueChange={setFilterConta}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Filtrar por conta" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as contas</SelectItem>
            {contas.map((conta) => (
              <SelectItem key={conta.id} value={conta.id}>{conta.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Extratos Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredExtratos.map((extrato) => (
          <ExtratoCard
            key={extrato.id}
            extrato={extrato}
            onView={() => navigate(`/conciliacao?extrato=${extrato.id}`)}
            onFechar={() => {
              setExtratoParaFechar(extrato);
              setFecharModalOpen(true);
            }}
          />
        ))}
      </div>

      {filteredExtratos.length === 0 && (
        <EmptyState
          icon={<FileSpreadsheet className="h-8 w-8" />}
          title={EMPTY_STATES.extratos.title}
          description={EMPTY_STATES.extratos.description}
          action={
            <Button onClick={() => setImportDialogOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Importar Primeiro Extrato
            </Button>
          }
        />
      )}

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Importar Extrato Bancário</DialogTitle>
          </DialogHeader>
          <ExtratoImportForm
            contas={contas}
            onSuccess={() => setImportDialogOpen(false)}
            onCancel={() => setImportDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Fechar Extrato Modal */}
      <FecharExtratoModal
        open={fecharModalOpen}
        onOpenChange={setFecharModalOpen}
        extrato={extratoParaFechar ? {
          id: extratoParaFechar.id,
          contaNome: extratoParaFechar.contaNome,
          periodo: `${new Date(extratoParaFechar.dataInicio).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}`,
          totalLinhas: extratoParaFechar.totalLinhas,
          linhasConciliadas: extratoParaFechar.linhasConciliadas,
          linhasIgnoradas: 0,
          linhasPendentes: extratoParaFechar.totalLinhas - extratoParaFechar.linhasConciliadas,
          saldoSistema: 0,
          saldoExtrato: 0,
        } : null}
        onConfirm={() => {
          toast.success('Extrato fechado com sucesso');
          setFecharModalOpen(false);
        }}
      />
    </div>
  );
}

