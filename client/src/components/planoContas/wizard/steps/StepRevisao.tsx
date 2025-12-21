import { usePlanoContasWizard } from '../PlanoContasWizardProvider';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { PendenciasPanel } from '../PendenciasPanel';
import { Check, AlertTriangle, ChevronRight, Wallet, Building2, PiggyBank, TrendingUp, TrendingDown, Hash, Layers, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

const tipoConfig: Record<string, { label: string; icon: typeof Wallet; color: string }> = {
  ativo: { label: 'Ativo', icon: Wallet, color: 'text-blue-600 bg-blue-100' },
  passivo: { label: 'Passivo', icon: Building2, color: 'text-orange-600 bg-orange-100' },
  patrimonio_social: { label: 'Patrimônio Social', icon: PiggyBank, color: 'text-purple-600 bg-purple-100' },
  receita: { label: 'Receita', icon: TrendingUp, color: 'text-emerald-600 bg-emerald-100' },
  despesa: { label: 'Despesa', icon: TrendingDown, color: 'text-rose-600 bg-rose-100' },
};

export function StepRevisao() {
  const { form, warnings, contaPaiBreadcrumb } = usePlanoContasWizard();
  
  const tipo = tipoConfig[form.tipo];
  const TipoIcon = tipo?.icon || Layers;
  
  const isComplete = form.codigo && form.nome && form.tipo && form.classificacao;
  
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2 mb-1">
          ✅ Revisão e Confirmação
        </h2>
        <p className="text-sm text-muted-foreground">
          Confira todos os dados antes de criar a conta contábil.
        </p>
      </div>
      
      {/* Pendências (se houver) */}
      <PendenciasPanel />
      
      {/* Status geral */}
      <Card className={cn(
        "border-2",
        isComplete ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"
      )}>
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            {isComplete ? (
              <Check className="h-6 w-6 text-emerald-600" />
            ) : (
              <AlertTriangle className="h-6 w-6 text-amber-600" />
            )}
            <div>
              <p className={cn("font-medium", isComplete ? "text-emerald-800" : "text-amber-800")}>
                {isComplete ? 'Pronto para criar' : 'Campos obrigatórios pendentes'}
              </p>
              <p className={cn("text-sm", isComplete ? "text-emerald-600" : "text-amber-600")}>
                {isComplete 
                  ? 'Todos os campos obrigatórios foram preenchidos corretamente.'
                  : 'Volte às etapas anteriores para completar o cadastro.'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Resumo Visual */}
      <div className="space-y-4">
        {/* Identificação */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-2 mb-3">
              <Hash className="h-4 w-4 text-violet-600" />
              <span className="text-sm font-semibold">Identificação</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Código</p>
                <p className="font-mono text-lg font-semibold text-violet-700">{form.codigo || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Nome</p>
                <p className="font-medium">{form.nome || '—'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Classificação */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-2 mb-3">
              <Layers className="h-4 w-4 text-violet-600" />
              <span className="text-sm font-semibold">Classificação</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Tipo</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={tipo?.color}>
                    <TipoIcon className="h-3 w-3 mr-1" />
                    {tipo?.label || form.tipo}
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Natureza</p>
                <Badge className={form.naturezaSaldo === 'devedora' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}>
                  {form.naturezaSaldo === 'devedora' ? 'Devedora' : 'Credora'}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Classificação</p>
                <Badge className={form.classificacao === 'analitica' ? 'bg-emerald-100 text-emerald-700' : 'bg-violet-100 text-violet-700'}>
                  {form.classificacao === 'analitica' ? 'Analítica' : 'Sintética'}
                </Badge>
              </div>
            </div>
            
            {/* Conta Pai / Breadcrumb */}
            {contaPaiBreadcrumb.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs text-muted-foreground mb-2">Hierarquia</p>
                <div className="flex items-center flex-wrap gap-1 text-sm bg-muted/50 p-2 rounded-lg">
                  <span className="text-muted-foreground">{tipo?.label}</span>
                  {contaPaiBreadcrumb.map((item: string, i: number) => (
                    <span key={i} className="flex items-center gap-1">
                      <ChevronRight className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">{item}</span>
                    </span>
                  ))}
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                  <span className="font-medium text-violet-700">{form.codigo} - {form.nome}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Observações */}
        {form.descricao && (
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="h-4 w-4 text-violet-600" />
                <span className="text-sm font-semibold">Observações</span>
              </div>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{form.descricao}</p>
            </CardContent>
          </Card>
        )}
      </div>
      
      {/* Aviso de consistência */}
      {form.classificacao === 'analitica' && (
        <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
          <div className="flex items-start gap-3">
            <span className="text-lg">💡</span>
            <div>
              <p className="text-sm font-medium text-blue-800">Conta Analítica</p>
              <p className="text-xs text-blue-600 mt-1">
                Esta conta poderá receber lançamentos contábeis diretamente. 
                Certifique-se de que o código e a classificação estão corretos antes de criar.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {form.classificacao === 'sintetica' && (
        <div className="p-4 rounded-lg bg-violet-50 border border-violet-200">
          <div className="flex items-start gap-3">
            <span className="text-lg">📁</span>
            <div>
              <p className="text-sm font-medium text-violet-800">Conta Sintética</p>
              <p className="text-xs text-violet-600 mt-1">
                Esta conta servirá para agrupar outras contas. Não receberá lançamentos diretamente, 
                apenas consolidará os saldos das contas filhas.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
