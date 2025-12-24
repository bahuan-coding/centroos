import { Check, Edit2, Building2, User, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCentroWizard } from '../CentroWizardProvider';
import { CentroPendenciasPanel } from '../CentroPendenciasPanel';
import { trpc } from '@/lib/trpc';

export function StepRevisao() {
  const { form, goToStep, isEditMode } = useCentroWizard();
  const { data: pessoasData } = trpc.pessoas.list.useQuery();
  const pessoas = pessoasData?.pessoas ?? [];
  
  const responsavel = pessoas.find(p => p.id === form.responsavelId);
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 mb-1">Revisão Final</h2>
        <p className="text-sm text-muted-foreground">
          Confira os dados antes de {isEditMode ? 'salvar as alterações' : 'criar o centro de custo'}.
        </p>
      </div>
      
      <CentroPendenciasPanel />
      
      {/* Card de Resumo */}
      <Card className="overflow-hidden">
        {/* Header do Card */}
        <div className="flex items-center gap-4 p-4 bg-zinc-50 border-b">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-slate-600 to-slate-700 text-white shadow-lg">
            <Building2 className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <code className="text-sm font-mono font-bold bg-white px-2 py-0.5 rounded border">
                {form.codigo || 'SEM CÓDIGO'}
              </code>
              <Badge variant="outline" className="text-xs">
                Centro de Custo
              </Badge>
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
              <Button
                variant="ghost"
                size="sm"
                onClick={() => goToStep(0)}
                className="text-xs h-7"
              >
                <Edit2 className="h-3 w-3 mr-1" />
                Editar
              </Button>
            </div>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-muted-foreground">Código</dt>
                <dd className="font-mono font-medium">{form.codigo || '—'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Nome</dt>
                <dd className="font-medium">{form.nome || '—'}</dd>
              </div>
            </dl>
          </div>
          
          {/* Seção: Detalhes */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-600">
                  <Check className="h-3.5 w-3.5" />
                </span>
                Detalhes
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => goToStep(1)}
                className="text-xs h-7"
              >
                <Edit2 className="h-3 w-3 mr-1" />
                Editar
              </Button>
            </div>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-muted-foreground flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  Descrição
                </dt>
                <dd className="mt-1">
                  {form.descricao ? (
                    <p className="text-zinc-700">{form.descricao}</p>
                  ) : (
                    <span className="text-muted-foreground italic">Não informada</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  Responsável
                </dt>
                <dd className="mt-1 font-medium">
                  {responsavel ? responsavel.nome : (
                    <span className="text-muted-foreground italic">Não definido</span>
                  )}
                </dd>
              </div>
            </dl>
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
              Clique no botão abaixo para {isEditMode ? 'salvar as alterações' : 'criar o centro de custo'}.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}












