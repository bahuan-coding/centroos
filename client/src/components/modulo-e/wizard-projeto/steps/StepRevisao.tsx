import { Check, Edit2, Layers, Calendar, DollarSign, Building2, User, FileCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useProjetoWizard } from '../ProjetoWizardProvider';
import { ProjetoPendenciasPanel } from '../ProjetoPendenciasPanel';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';

export function StepRevisao() {
  const { form, goToStep, isEditMode, statusConfig } = useProjetoWizard();
  
  const { data: centrosCusto = [] } = trpc.centroCusto.list.useQuery({ ativo: true });
  const { data: pessoasData } = trpc.pessoas.list.useQuery();
  const pessoas = pessoasData?.pessoas ?? [];
  
  const centroCusto = centrosCusto.find(cc => cc.id === form.centroCustoId);
  const responsavel = pessoas.find(p => p.id === form.responsavelId);
  const statusInfo = statusConfig[form.status];
  
  const formatCurrency = (value: string) => {
    const num = parseFloat(value.replace(/[^\d,.-]/g, '').replace(',', '.'));
    if (isNaN(num) || num === 0) return null;
    return `R$ ${num.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };
  
  const formatDate = (date: string) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('pt-BR');
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 mb-1">Revisão Final</h2>
        <p className="text-sm text-muted-foreground">
          Confira os dados antes de {isEditMode ? 'salvar as alterações' : 'criar o projeto'}.
        </p>
      </div>
      
      <ProjetoPendenciasPanel />
      
      {/* Card de Resumo */}
      <Card className="overflow-hidden">
        {/* Header do Card */}
        <div className="flex items-center gap-4 p-4 bg-zinc-50 border-b">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-lg">
            <Layers className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <code className="text-sm font-mono font-bold bg-white px-2 py-0.5 rounded border">
                {form.codigo || 'SEM CÓDIGO'}
              </code>
              {statusInfo && (
                <Badge className={cn(statusInfo.bg, statusInfo.color, 'border-0')}>
                  {statusInfo.label}
                </Badge>
              )}
              {form.parceriaMrosc && (
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                  MROSC
                </Badge>
              )}
            </div>
            <p className="text-lg font-semibold text-zinc-900 mt-1">
              {form.nome || 'Sem nome'}
            </p>
          </div>
        </div>
        
        {/* Seções */}
        <div className="divide-y">
          {/* Seção: Identificação */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-600">
                  <Check className="h-3.5 w-3.5" />
                </span>
                Identificação
              </h3>
              <Button variant="ghost" size="sm" onClick={() => goToStep(0)} className="text-xs h-7">
                <Edit2 className="h-3 w-3 mr-1" /> Editar
              </Button>
            </div>
            <dl className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <dt className="text-muted-foreground">Código</dt>
                <dd className="font-mono font-medium">{form.codigo || '—'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Nome</dt>
                <dd className="font-medium">{form.nome || '—'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Status</dt>
                <dd>{statusInfo?.label || '—'}</dd>
              </div>
            </dl>
          </div>
          
          {/* Seção: Escopo */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-600">
                  <Check className="h-3.5 w-3.5" />
                </span>
                Escopo
              </h3>
              <Button variant="ghost" size="sm" onClick={() => goToStep(1)} className="text-xs h-7">
                <Edit2 className="h-3 w-3 mr-1" /> Editar
              </Button>
            </div>
            <p className="text-sm text-zinc-700">
              {form.descricao || <span className="text-muted-foreground italic">Não informada</span>}
            </p>
          </div>
          
          {/* Seção: Cronograma e Orçamento */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-600">
                  <Check className="h-3.5 w-3.5" />
                </span>
                Cronograma e Orçamento
              </h3>
              <Button variant="ghost" size="sm" onClick={() => goToStep(2)} className="text-xs h-7">
                <Edit2 className="h-3 w-3 mr-1" /> Editar
              </Button>
            </div>
            <dl className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <dt className="text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" /> Início
                </dt>
                <dd className="font-medium">{formatDate(form.dataInicio) || '—'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" /> Término Previsto
                </dt>
                <dd className="font-medium">{formatDate(form.dataFimPrevista) || '—'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground flex items-center gap-1">
                  <DollarSign className="h-3.5 w-3.5" /> Orçamento
                </dt>
                <dd className="font-mono font-medium">{formatCurrency(form.orcamentoPrevisto) || '—'}</dd>
              </div>
            </dl>
          </div>
          
          {/* Seção: Vínculos */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-600">
                  <Check className="h-3.5 w-3.5" />
                </span>
                Vínculos
              </h3>
              <Button variant="ghost" size="sm" onClick={() => goToStep(4)} className="text-xs h-7">
                <Edit2 className="h-3 w-3 mr-1" /> Editar
              </Button>
            </div>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-muted-foreground flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" /> Centro de Custo
                </dt>
                <dd className="font-medium">
                  {centroCusto ? (
                    <span><code className="text-xs bg-muted px-1 rounded">{centroCusto.codigo}</code> {centroCusto.nome}</span>
                  ) : (
                    <span className="text-muted-foreground italic">Não vinculado</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground flex items-center gap-1">
                  <User className="h-3.5 w-3.5" /> Responsável
                </dt>
                <dd className="font-medium">
                  {responsavel ? responsavel.nome : (
                    <span className="text-muted-foreground italic">Não definido</span>
                  )}
                </dd>
              </div>
            </dl>
            
            {form.parceriaMrosc && (
              <div className="mt-4 p-3 rounded-lg bg-purple-50 border border-purple-200">
                <div className="flex items-center gap-2 text-purple-800">
                  <FileCheck className="h-4 w-4" />
                  <span className="font-medium text-sm">Parceria MROSC</span>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                  <div>
                    <span className="text-purple-600">Termo:</span>{' '}
                    <span className="text-purple-800">{form.numeroTermoParceria || '—'}</span>
                  </div>
                  <div>
                    <span className="text-purple-600">Órgão:</span>{' '}
                    <span className="text-purple-800">{form.orgaoParceiro || '—'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
      
      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100">
            <Check className="h-4 w-4 text-emerald-600" />
          </div>
          <div>
            <p className="font-medium text-emerald-800">
              Pronto para {isEditMode ? 'salvar' : 'criar'}!
            </p>
            <p className="text-sm text-emerald-700 mt-0.5">
              Clique no botão abaixo para {isEditMode ? 'salvar as alterações' : 'criar o projeto'}.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}





