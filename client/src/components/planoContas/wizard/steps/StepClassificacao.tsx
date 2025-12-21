import { usePlanoContasWizard } from '../PlanoContasWizardProvider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormSection, FormRow, FormField } from '@/components/ui/form-section';
import { RichPopover } from '@/components/ui/rich-popover';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, Wallet, Building2, PiggyBank, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const tipoOptions = [
  { 
    value: 'ativo', 
    label: 'Ativo', 
    icon: Wallet,
    color: 'text-blue-600 bg-blue-50 border-blue-200',
    desc: 'Bens e direitos da entidade',
  },
  { 
    value: 'passivo', 
    label: 'Passivo', 
    icon: Building2,
    color: 'text-orange-600 bg-orange-50 border-orange-200',
    desc: 'Obrigações com terceiros',
  },
  { 
    value: 'patrimonio_social', 
    label: 'Patrimônio Social', 
    icon: PiggyBank,
    color: 'text-purple-600 bg-purple-50 border-purple-200',
    desc: 'Recursos próprios da entidade',
  },
  { 
    value: 'receita', 
    label: 'Receita', 
    icon: TrendingUp,
    color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    desc: 'Recursos recebidos (doações, contribuições)',
  },
  { 
    value: 'despesa', 
    label: 'Despesa', 
    icon: TrendingDown,
    color: 'text-rose-600 bg-rose-50 border-rose-200',
    desc: 'Gastos com atividades',
  },
];

export function StepClassificacao() {
  const { form, updateField, errors, fieldRefs, hierarchy, contaPai, contaPaiBreadcrumb } = usePlanoContasWizard();
  
  const tipoSelecionado = tipoOptions.find(t => t.value === form.tipo);
  
  // Filter hierarchy for conta pai selection (only sintéticas of same type)
  const contasPaiDisponiveis = hierarchy.filter(
    (c: any) => c.classificacao === 'sintetica' && c.tipo === form.tipo
  );
  
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2 mb-1">
          📊 Classificação Contábil
        </h2>
        <p className="text-sm text-muted-foreground">
          Defina o tipo, natureza e classificação conforme as normas contábeis.
        </p>
      </div>
      
      {/* Tipo */}
      <FormSection 
        title="Tipo da Conta" 
        description="Grupo principal a que pertence no plano de contas"
      >
        <div className="flex items-center gap-1.5 mb-3">
          <span className="text-sm font-medium">Tipo<span className="text-destructive ml-0.5">*</span></span>
          <RichPopover
            title="Tipos de Conta (ITG 2002)"
            items={[
              'ATIVO: Bens e direitos (caixa, bancos, imóveis, créditos)',
              'PASSIVO: Obrigações com terceiros (contas a pagar, empréstimos)',
              'PATRIMÔNIO SOCIAL: Recursos próprios, supervit/deficit acumulado',
              'RECEITA: Entradas sem contraprestação (doações, contribuições)',
              'DESPESA: Gastos com manutenção das atividades finalísticas',
            ]}
            footer="O tipo determina automaticamente a natureza do saldo (devedora ou credora)."
          />
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {tipoOptions.map((opt) => {
            const Icon = opt.icon;
            const isSelected = form.tipo === opt.value;
            
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => updateField('tipo', opt.value as any)}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left",
                  isSelected 
                    ? opt.color + " border-current ring-2 ring-offset-1 ring-current/30"
                    : "border-zinc-200 hover:border-zinc-300 bg-white"
                )}
              >
                <div className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-lg shrink-0",
                  isSelected ? "bg-white" : "bg-zinc-100"
                )}>
                  <Icon className={cn("h-5 w-5", isSelected ? opt.color.split(' ')[0] : "text-zinc-400")} />
                </div>
                <div className="min-w-0">
                  <p className={cn("font-medium text-sm", isSelected ? opt.color.split(' ')[0] : "text-zinc-700")}>
                    {opt.label}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">{opt.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </FormSection>
      
      {/* Natureza do Saldo */}
      <FormSection 
        title="Natureza do Saldo" 
        description="Determina como o saldo aumenta (automático baseado no tipo)"
      >
        <FormRow>
          <FormField>
            <div className="flex items-center gap-1.5 mb-1.5">
              <label className="text-sm font-medium">Natureza<span className="text-destructive ml-0.5">*</span></label>
              <RichPopover
                title="Natureza Devedora vs Credora"
                items={[
                  'DEVEDORA: Saldo aumenta com débitos (Ativo e Despesa)',
                  'CREDORA: Saldo aumenta com créditos (Passivo, Patrimônio e Receita)',
                  'A natureza é definida automaticamente pelo tipo selecionado',
                ]}
                footer="Isso garante que os lançamentos sigam a lógica das partidas dobradas."
              />
            </div>
            <div className={cn(
              "flex items-center gap-3 p-3 rounded-lg border",
              form.naturezaSaldo === 'devedora' 
                ? "bg-blue-50 border-blue-200" 
                : "bg-emerald-50 border-emerald-200"
            )}>
              <Badge className={form.naturezaSaldo === 'devedora' ? "bg-blue-600" : "bg-emerald-600"}>
                {form.naturezaSaldo === 'devedora' ? 'D' : 'C'}
              </Badge>
              <div>
                <p className="font-medium text-sm capitalize">{form.naturezaSaldo}</p>
                <p className="text-xs text-muted-foreground">
                  {form.naturezaSaldo === 'devedora' 
                    ? 'Saldo aumenta com lançamentos a débito' 
                    : 'Saldo aumenta com lançamentos a crédito'}
                </p>
              </div>
            </div>
          </FormField>
          
          <FormField error={errors.classificacao}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <label className="text-sm font-medium">Classificação<span className="text-destructive ml-0.5">*</span></label>
              <RichPopover
                title="Analítica vs Sintética"
                items={[
                  'ANALÍTICA: Recebe lançamentos contábeis diretamente',
                  'SINTÉTICA: Agrupa outras contas, não recebe lançamentos',
                  'Use sintética para criar grupos (ex: "Receitas Operacionais")',
                  'Use analítica para contas finais (ex: "Dízimo Mensal")',
                ]}
                footer="Contas sintéticas são como pastas; analíticas são como arquivos."
              />
            </div>
            <Select 
              value={form.classificacao} 
              onValueChange={(v) => updateField('classificacao', v as any)}
            >
              <SelectTrigger ref={(el) => { fieldRefs.current['classificacao'] = el; }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="analitica">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-emerald-600 text-[10px]">A</Badge>
                    <span>Analítica</span>
                    <span className="text-xs text-muted-foreground">— recebe lançamentos</span>
                  </div>
                </SelectItem>
                <SelectItem value="sintetica">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-violet-600 text-[10px]">Σ</Badge>
                    <span>Sintética</span>
                    <span className="text-xs text-muted-foreground">— agrupa contas</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </FormField>
        </FormRow>
      </FormSection>
      
      {/* Conta Pai */}
      <FormSection 
        title="Conta Pai (Hierarquia)" 
        description="Vincule a uma conta sintética para organizar a árvore"
      >
        <FormField>
          <div className="flex items-center gap-1.5 mb-1.5">
            <label className="text-sm font-medium">Conta Pai</label>
            <RichPopover
              title="Hierarquia do Plano de Contas"
              items={[
                'A conta pai define onde esta conta aparece na árvore',
                'Só é possível vincular a contas SINTÉTICAS do mesmo tipo',
                'Se não houver pai, a conta ficará na raiz do tipo',
                'A hierarquia ajuda na organização e nos relatórios consolidados',
              ]}
            />
          </div>
          <Select 
            value={form.contaPaiId || 'none'} 
            onValueChange={(v) => updateField('contaPaiId', v === 'none' ? '' : v)}
          >
            <SelectTrigger ref={(el) => { fieldRefs.current['contaPaiId'] = el; }}>
              <SelectValue placeholder="Nenhuma (raiz)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhuma (raiz do tipo)</SelectItem>
              {contasPaiDisponiveis.map((c: any) => (
                <SelectItem key={c.id} value={c.id}>
                  <span className="font-mono text-xs mr-2">{c.codigo}</span>
                  {c.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        
        {/* Breadcrumb da conta pai */}
        {contaPai && contaPaiBreadcrumb.length > 0 && (
          <div className="mt-3 p-3 rounded-lg bg-violet-50 border border-violet-200">
            <p className="text-[10px] font-medium text-violet-600 uppercase tracking-wider mb-2">Caminho na hierarquia</p>
            <div className="flex items-center flex-wrap gap-1 text-sm">
              <span className="text-violet-500">{tipoSelecionado?.label}</span>
              {contaPaiBreadcrumb.map((item: string, i: number) => (
                <span key={i} className="flex items-center gap-1">
                  <ChevronRight className="h-3 w-3 text-violet-400" />
                  <span className={i === contaPaiBreadcrumb.length - 1 ? "font-medium text-violet-700" : "text-violet-600"}>
                    {item}
                  </span>
                </span>
              ))}
              <ChevronRight className="h-3 w-3 text-violet-400" />
              <span className="font-semibold text-violet-800">
                {form.codigo || '?'} - {form.nome || 'Nova Conta'}
              </span>
            </div>
          </div>
        )}
      </FormSection>
    </div>
  );
}
