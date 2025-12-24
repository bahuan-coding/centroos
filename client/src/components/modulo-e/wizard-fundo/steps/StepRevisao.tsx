import { Check, Edit2, Wallet, Calendar, Target, DollarSign, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useFundoWizard } from '../FundoWizardProvider';
import { FundoPendenciasPanel } from '../FundoPendenciasPanel';
import { cn } from '@/lib/utils';

export function StepRevisao() {
  const { form, goToStep, isEditMode, tipoConfig, regraConfig } = useFundoWizard();
  
  const tipoInfo = tipoConfig[form.tipo];
  
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
          Confira os dados antes de {isEditMode ? 'salvar as alterações' : 'criar o fundo'}.
        </p>
      </div>
      
      <FundoPendenciasPanel />
      
      {/* Card de Resumo */}
      <Card className="overflow-hidden">
        {/* Header do Card */}
        <div className="flex items-center gap-4 p-4 bg-zinc-50 border-b">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 text-white shadow-lg">
            <Wallet className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <code className="text-sm font-mono font-bold bg-white px-2 py-0.5 rounded border">
                {form.codigo || 'SEM CÓDIGO'}
              </code>
              {tipoInfo && (
                <Badge className={cn(tipoInfo.bg, tipoInfo.color, 'border-0')}>
                  {tipoInfo.label}
                </Badge>
              )}
              {form.regras.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  <Shield className="h-3 w-3 mr-1" />
                  {form.regras.length} regra(s)
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
                <dt className="text-muted-foreground">Tipo</dt>
                <dd>{tipoInfo?.label || '—'}</dd>
              </div>
            </dl>
          </div>
          
          {/* Seção: Finalidade */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-600">
                  <Check className="h-3.5 w-3.5" />
                </span>
                Finalidade
              </h3>
              <Button variant="ghost" size="sm" onClick={() => goToStep(1)} className="text-xs h-7">
                <Edit2 className="h-3 w-3 mr-1" /> Editar
              </Button>
            </div>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-muted-foreground">Descrição</dt>
                <dd className="mt-1">
                  {form.descricao || <span className="text-muted-foreground italic">Não informada</span>}
                </dd>
              </div>
              {form.finalidade && (
                <div>
                  <dt className="text-muted-foreground">Finalidade Específica</dt>
                  <dd className="mt-1 font-medium">{form.finalidade}</dd>
                </div>
              )}
            </dl>
          </div>
          
          {/* Seção: Vigência e Meta */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-600">
                  <Check className="h-3.5 w-3.5" />
                </span>
                Vigência e Meta
              </h3>
              <Button variant="ghost" size="sm" onClick={() => goToStep(2)} className="text-xs h-7">
                <Edit2 className="h-3 w-3 mr-1" /> Editar
              </Button>
            </div>
            <dl className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <dt className="text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" /> Criação
                </dt>
                <dd className="font-medium">{formatDate(form.dataInicio) || '—'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" /> Limite
                </dt>
                <dd className="font-medium">{formatDate(form.dataLimite) || 'Sem prazo'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground flex items-center gap-1">
                  <Target className="h-3.5 w-3.5" /> Meta
                </dt>
                <dd className="font-mono font-medium">{formatCurrency(form.metaValor) || '—'}</dd>
              </div>
            </dl>
          </div>
          
          {/* Seção: Saldo Inicial (apenas no create) */}
          {!isEditMode && (
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-600">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  Saldo Inicial
                </h3>
                <Button variant="ghost" size="sm" onClick={() => goToStep(3)} className="text-xs h-7">
                  <Edit2 className="h-3 w-3 mr-1" /> Editar
                </Button>
              </div>
              <dl className="text-sm">
                <div>
                  <dt className="text-muted-foreground flex items-center gap-1">
                    <DollarSign className="h-3.5 w-3.5" /> Saldo para Migração
                  </dt>
                  <dd className="font-mono font-medium text-emerald-600">
                    {formatCurrency(form.saldoInicial) || 'R$ 0,00'}
                  </dd>
                </div>
              </dl>
            </div>
          )}
          
          {/* Seção: Regras */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-600">
                  <Check className="h-3.5 w-3.5" />
                </span>
                Regras
              </h3>
              <Button variant="ghost" size="sm" onClick={() => goToStep(4)} className="text-xs h-7">
                <Edit2 className="h-3 w-3 mr-1" /> Editar
              </Button>
            </div>
            
            {form.regras.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Nenhuma regra configurada</p>
            ) : (
              <div className="space-y-2">
                {form.regras.map((regra, index) => {
                  const config = regraConfig[regra.tipoRegra];
                  return (
                    <div 
                      key={index} 
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-lg bg-zinc-50 text-sm",
                        !regra.ativo && "opacity-50"
                      )}
                    >
                      <Shield className="h-4 w-4 text-teal-600" />
                      <span className="font-medium">{config?.label}</span>
                      {regra.parametroNumerico && (
                        <span className="font-mono text-xs bg-white px-1.5 py-0.5 rounded border">
                          {regra.tipoRegra === 'percentual_receita' 
                            ? `${regra.parametroNumerico}%`
                            : `R$ ${parseFloat(regra.parametroNumerico).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                          }
                        </span>
                      )}
                      {!regra.ativo && (
                        <Badge variant="outline" className="text-xs ml-auto">Inativa</Badge>
                      )}
                    </div>
                  );
                })}
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
              Clique no botão abaixo para {isEditMode ? 'salvar as alterações' : 'criar o fundo'}.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}










