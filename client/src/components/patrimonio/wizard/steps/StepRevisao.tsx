import { usePatrimonioWizard } from '../PatrimonioWizardProvider';
import { PatrimonioPendenciasPanel } from '../PatrimonioPendenciasPanel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/lib/trpc';
import { 
  Edit2, Check, Boxes, Calendar, TrendingDown, 
  Building2, MapPin, User, DollarSign
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function StepRevisao() {
  const { form, goToStep, warnings, depreciacaoMensalEstimada, categoriaConfig } = usePatrimonioWizard();
  
  const { data: accounts } = trpc.accounts.list.useQuery();
  const { data: pessoas } = trpc.pessoas.list.useQuery({ limit: 500 });
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };
  
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR');
  };
  
  const valorAquisicaoNum = parseFloat(form.valorAquisicao) || 0;
  const valorResidualNum = parseFloat(form.valorResidual) || 0;
  const categoriaLabel = categoriaConfig[form.categoria]?.label || form.categoria;
  const contaSelecionada = accounts?.find(a => String(a.id) === form.contaAtivoId);
  const responsavelSelecionado = pessoas?.pessoas?.find(p => p.id === form.responsavelId);
  
  const vidaUtilAnos = Math.floor(form.vidaUtilMeses / 12);
  const vidaUtilMesesRestantes = form.vidaUtilMeses % 12;
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2 mb-1">
          ✅ Revisão e Confirmação
        </h2>
        <p className="text-sm text-muted-foreground">
          Confira todos os dados antes de cadastrar o bem patrimonial.
        </p>
      </div>
      
      {/* Pendências */}
      {warnings.length > 0 && <PatrimonioPendenciasPanel />}
      
      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card Identificação */}
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <Boxes className="h-5 w-5 text-blue-600" />
              <h3 className="font-medium">Identificação</h3>
              <Check className="h-4 w-4 text-emerald-500" />
            </div>
            <Button variant="ghost" size="sm" onClick={() => goToStep(0)}>
              <Edit2 className="h-3 w-3 mr-1" />
              Editar
            </Button>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Código:</span>
              <span className="font-mono font-medium">{form.codigo || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Categoria:</span>
              <Badge variant="secondary">{categoriaLabel}</Badge>
            </div>
            <div>
              <span className="text-muted-foreground">Descrição:</span>
              <p className="font-medium mt-0.5 line-clamp-2">{form.descricao || '-'}</p>
            </div>
          </div>
        </div>
        
        {/* Card Aquisição */}
        <div className="rounded-xl border bg-gradient-to-br from-emerald-50 to-teal-50 p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-emerald-600" />
              <h3 className="font-medium">Aquisição</h3>
              <Check className="h-4 w-4 text-emerald-500" />
            </div>
            <Button variant="ghost" size="sm" onClick={() => goToStep(1)}>
              <Edit2 className="h-3 w-3 mr-1" />
              Editar
            </Button>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-emerald-700">Data:</span>
              <span className="font-medium">{formatDate(form.dataAquisicao)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-emerald-200">
              <span className="font-medium text-emerald-800">Valor:</span>
              <span className="text-lg font-bold text-emerald-700">
                {formatCurrency(valorAquisicaoNum)}
              </span>
            </div>
          </div>
        </div>
        
        {/* Card Depreciação */}
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-amber-600" />
              <h3 className="font-medium">Depreciação</h3>
              {form.metodoDepreciacao === 'linear' ? (
                <Check className="h-4 w-4 text-emerald-500" />
              ) : (
                <Badge variant="outline" className="text-xs">Não deprecia</Badge>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={() => goToStep(2)}>
              <Edit2 className="h-3 w-3 mr-1" />
              Editar
            </Button>
          </div>
          {form.metodoDepreciacao === 'linear' ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Vida Útil:</span>
                <span className="font-medium">
                  {vidaUtilAnos > 0 && `${vidaUtilAnos} ano${vidaUtilAnos > 1 ? 's' : ''}`}
                  {vidaUtilAnos > 0 && vidaUtilMesesRestantes > 0 && ' e '}
                  {vidaUtilMesesRestantes > 0 && `${vidaUtilMesesRestantes} mes${vidaUtilMesesRestantes > 1 ? 'es' : ''}`}
                  {' '}({form.vidaUtilMeses} meses)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Valor Residual:</span>
                <span>{formatCurrency(valorResidualNum)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="font-medium">Deprec. Mensal:</span>
                <span className="font-bold text-amber-600">
                  {formatCurrency(depreciacaoMensalEstimada)}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Bem configurado para não depreciar (ex: terrenos).
            </p>
          )}
        </div>
        
        {/* Card Contabilização */}
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-violet-600" />
              <h3 className="font-medium">Contabilização</h3>
              {contaSelecionada ? (
                <Check className="h-4 w-4 text-emerald-500" />
              ) : (
                <Badge variant="destructive" className="text-xs">Pendente</Badge>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={() => goToStep(3)}>
              <Edit2 className="h-3 w-3 mr-1" />
              Editar
            </Button>
          </div>
          <div className="text-sm">
            {contaSelecionada ? (
              <div className="space-y-1">
                <span className="font-mono text-blue-600">{contaSelecionada.code}</span>
                <p className="font-medium">{contaSelecionada.name}</p>
              </div>
            ) : (
              <p className="text-muted-foreground">Nenhuma conta selecionada</p>
            )}
          </div>
        </div>
        
        {/* Card Localização (full width) */}
        <div className="rounded-xl border bg-card p-4 md:col-span-2">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-slate-600" />
              <h3 className="font-medium">Localização e Responsável</h3>
              <Badge variant="outline" className="text-xs">Opcional</Badge>
            </div>
            <Button variant="ghost" size="sm" onClick={() => goToStep(4)}>
              <Edit2 className="h-3 w-3 mr-1" />
              Editar
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Local</p>
                <p className="font-medium">{form.localizacao || 'Não informado'}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <User className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Responsável</p>
                <p className="font-medium">{responsavelSelecionado?.nome || 'Não definido'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Confirmação final */}
      <div className={cn(
        "rounded-xl border-2 p-4",
        contaSelecionada 
          ? "bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200"
          : "bg-amber-50 border-amber-200"
      )}>
        <div className="flex items-start gap-3">
          <Check className={cn(
            "h-5 w-5 shrink-0 mt-0.5",
            contaSelecionada ? "text-blue-600" : "text-amber-600"
          )} />
          <div>
            <p className={cn(
              "font-medium",
              contaSelecionada ? "text-blue-800" : "text-amber-800"
            )}>
              {contaSelecionada 
                ? 'Pronto para cadastrar'
                : 'Selecione uma conta do ativo para continuar'}
            </p>
            <p className={cn(
              "text-sm mt-1",
              contaSelecionada ? "text-blue-700" : "text-amber-700"
            )}>
              {contaSelecionada 
                ? 'Clique em "Cadastrar Bem" para finalizar. O bem será registrado no patrimônio e ficará disponível para controle de depreciação.'
                : 'A conta do ativo é obrigatória para classificação contábil do bem.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}












