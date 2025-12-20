import { useState, useMemo } from 'react';
import { Link2, Building2, Calendar, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { ConciliacaoPanel } from '@/components/caixa/ConciliacaoPanel';
import { cn } from '@/lib/utils';
import { trpc } from '@/lib/trpc';

// Types
interface ContaFinanceira {
  id: string;
  nome: string;
  bancoNome?: string;
  saldoAtual: number;
  linhasPendentes: number;
}

interface Extrato {
  id: string;
  contaId: string;
  periodo: string;
  totalLinhas: number;
  linhasConciliadas: number;
}

export default function Conciliacao() {
  const [selectedContaId, setSelectedContaId] = useState<string>('');
  const [selectedExtratoId, setSelectedExtratoId] = useState<string>('');

  const { data: contasData, isLoading: loadingContas } = trpc.contasFinanceiras.list.useQuery();
  const { data: extratosData, isLoading: loadingExtratos } = trpc.extratos.list.useQuery();
  const { data: statsData } = trpc.conciliacao.stats.useQuery({});
  
  const contas: ContaFinanceira[] = useMemo(() => {
    if (!contasData) return [];
    return contasData.map((c: any) => ({
      id: c.id,
      nome: c.nome,
      bancoNome: c.bancoNome,
      saldoAtual: c.saldoAtual || 0,
      linhasPendentes: 0,
    }));
  }, [contasData]);
  
  const extratosPorConta: Record<string, Extrato[]> = useMemo(() => {
    if (!extratosData) return {};
    const map: Record<string, Extrato[]> = {};
    extratosData.forEach((e: any) => {
      const contaId = e.extrato.contaFinanceiraId;
      if (!map[contaId]) map[contaId] = [];
      map[contaId].push({
        id: e.extrato.id,
        contaId,
        periodo: `${e.extrato.dataInicio || ''} - ${e.extrato.dataFim || ''}`,
        totalLinhas: e.extrato.totalLinhas || 0,
        linhasConciliadas: e.extrato.linhasConciliadas || 0,
      });
    });
    return map;
  }, [extratosData]);

  const selectedConta = contas.find(c => c.id === selectedContaId) || contas[0];
  const contaExtratos = selectedConta ? (extratosPorConta[selectedConta.id] || []) : [];
  const selectedExtrato = contaExtratos.find(e => e.id === selectedExtratoId);

  // Total pendentes
  const totalPendentes = statsData?.pendentes || 0;
  
  // Set default selected conta when data loads
  if (!selectedContaId && contas.length > 0) {
    setSelectedContaId(contas[0].id);
  }
  
  if (loadingContas || loadingExtratos) {
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
        title="Conciliação Bancária"
        description="Vincule movimentos do extrato aos títulos do sistema"
        icon={<Link2 className="h-8 w-8 text-primary" />}
      />

      {/* Conta Selector */}
      <div className="flex flex-wrap gap-4 items-start">
        {/* Conta Select */}
        <Card className="flex-1 min-w-[300px]">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-muted-foreground">Conta Bancária</p>
              <Badge variant="secondary" className="text-xs">
                {totalPendentes} pendentes total
              </Badge>
            </div>
            
            <div className="grid gap-2">
              {contas.map((conta) => {
                const isSelected = selectedContaId === conta.id;
                return (
                  <button
                    key={conta.id}
                    onClick={() => {
                      setSelectedContaId(conta.id);
                      setSelectedExtratoId('');
                    }}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg border text-left transition-all',
                      isSelected
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                        : 'hover:bg-muted/50'
                    )}
                  >
                    <div className={cn(
                      'p-2 rounded-lg',
                      isSelected ? 'bg-primary/10' : 'bg-muted'
                    )}>
                      <Building2 className={cn(
                        'h-4 w-4',
                        isSelected ? 'text-primary' : 'text-muted-foreground'
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{conta.nome}</p>
                      {conta.bancoNome && (
                        <p className="text-xs text-muted-foreground">{conta.bancoNome}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      {conta.linhasPendentes > 0 ? (
                        <Badge variant="destructive" className="text-xs">
                          {conta.linhasPendentes}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs bg-emerald-500/10 text-emerald-600">
                          OK
                        </Badge>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Extrato Select */}
        <Card className="w-72">
          <CardContent className="pt-4">
            <p className="text-sm font-medium text-muted-foreground mb-3">Período do Extrato</p>
            
            {contaExtratos.length > 0 ? (
              <div className="space-y-2">
                <button
                  onClick={() => setSelectedExtratoId('')}
                  className={cn(
                    'w-full flex items-center gap-2 p-2 rounded-lg border text-left text-sm transition-all',
                    !selectedExtratoId
                      ? 'border-primary bg-primary/5'
                      : 'hover:bg-muted/50'
                  )}
                >
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Todos os períodos</span>
                </button>
                
                {contaExtratos.map((extrato) => {
                  const isSelected = selectedExtratoId === extrato.id;
                  const progress = Math.round((extrato.linhasConciliadas / extrato.totalLinhas) * 100);
                  const isComplete = progress === 100;
                  
                  return (
                    <button
                      key={extrato.id}
                      onClick={() => setSelectedExtratoId(extrato.id)}
                      className={cn(
                        'w-full flex items-center justify-between p-2 rounded-lg border text-left text-sm transition-all',
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'hover:bg-muted/50'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{extrato.periodo}</span>
                      </div>
                      <Badge 
                        variant="secondary" 
                        className={cn('text-[10px]', isComplete && 'bg-emerald-500/10 text-emerald-600')}
                      >
                        {progress}%
                      </Badge>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground text-sm">
                <p>Nenhum extrato importado</p>
                <Button variant="outline" size="sm" className="mt-2">
                  Importar Extrato
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Selected Info */}
      {selectedConta && (
        <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 border">
          <Building2 className="h-5 w-5 text-primary" />
          <div className="flex-1">
            <p className="font-medium">{selectedConta.nome}</p>
            <p className="text-sm text-muted-foreground">
              {selectedExtrato ? selectedExtrato.periodo : 'Todos os períodos'} • 
              Saldo: R$ {selectedConta.saldoAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          {selectedConta.linhasPendentes > 0 && (
            <Badge variant="outline" className="text-amber-600 bg-amber-500/10">
              {selectedConta.linhasPendentes} linhas pendentes
            </Badge>
          )}
        </div>
      )}

      {/* Conciliação Panel */}
      {selectedConta && contaExtratos.length > 0 ? (
        <ConciliacaoPanel
          contaId={selectedContaId}
          extratoId={selectedExtratoId || undefined}
        />
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Link2 className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="font-medium">Nenhum extrato para conciliar</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Importe um extrato bancário para começar a conciliação
            </p>
            <Button className="mt-4" variant="outline">
              Ir para Extratos
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
