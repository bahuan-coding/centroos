import { useTituloWizard } from '../TituloWizardProvider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { FormSection, FormRow, FormField } from '@/components/ui/form-section';
import { LabelWithHelp } from '@/components/ui/tooltip-help';
import { Badge } from '@/components/ui/badge';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// CONSTANTES COM TOOLTIPS CONTÁBEIS RICOS
// ============================================================================

const tipoOptions = [
  { 
    value: 'receber', 
    label: 'A Receber', 
    icon: ArrowUpRight,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50 border-emerald-200',
    help: `
      **Título a Receber** representa um DIREITO da entidade.
      
      • Gera entrada de caixa quando quitado
      • Exemplos: dízimos, doações, eventos, convênios
      • Impacto: aumenta o saldo disponível
    `
  },
  { 
    value: 'pagar', 
    label: 'A Pagar', 
    icon: ArrowDownRight,
    color: 'text-rose-600',
    bgColor: 'bg-rose-50 border-rose-200',
    help: `
      **Título a Pagar** representa uma OBRIGAÇÃO da entidade.
      
      • Gera saída de caixa quando quitado
      • Exemplos: contas, fornecedores, impostos
      • Impacto: diminui o saldo disponível
    `
  },
];

const naturezasReceber = [
  { 
    value: 'contribuicao', 
    label: 'Contribuição/Mensalidade', 
    conta: '4.1.1',
    help: `Pagamento regular de associados como dízimo ou mensalidade. 
           Geralmente tem periodicidade mensal e pessoa vinculada.`
  },
  { 
    value: 'doacao', 
    label: 'Doação', 
    conta: '4.1.2',
    help: `Valores recebidos sem contrapartida. Para que o doador 
           possa deduzir no IR, é OBRIGATÓRIO vincular a pessoa.`
  },
  { 
    value: 'evento', 
    label: 'Evento', 
    conta: '4.2.1',
    help: `Receita de bazares, festas, encontros, cursos ou 
           outras atividades pontuais da entidade.`
  },
  { 
    value: 'convenio', 
    label: 'Convênio/Subvenção', 
    conta: '4.3.1',
    help: `Recursos de parceria com governo (MROSC) ou outras 
           entidades. Geralmente exige prestação de contas específica.`
  },
];

const naturezasPagar = [
  { 
    value: 'servico', 
    label: 'Serviço', 
    conta: '5.1.1',
    help: `Prestadores de serviço, manutenção, limpeza, 
           consultoria, honorários profissionais.`
  },
  { 
    value: 'utilidade', 
    label: 'Utilidade', 
    conta: '5.1.2',
    help: `Contas de consumo: água, luz, telefone, internet, 
           gás e similares.`
  },
  { 
    value: 'taxa', 
    label: 'Taxa/Tarifa', 
    conta: '5.1.3',
    help: `Tarifas bancárias, cartório, anuidades, 
           taxas de licenciamento e similares.`
  },
  { 
    value: 'imposto', 
    label: 'Imposto', 
    conta: '5.1.4',
    help: `IPTU, ISS, taxas municipais/estaduais, 
           contribuições obrigatórias.`
  },
  { 
    value: 'material', 
    label: 'Material', 
    conta: '5.2.1',
    help: `Material de escritório, limpeza, consumo, 
           suprimentos diversos.`
  },
  { 
    value: 'outros', 
    label: 'Outros', 
    conta: '5.9.1',
    help: `Demais despesas não classificadas nas 
           categorias anteriores.`
  },
];

export function StepIdentificacao() {
  const { form, updateField, errors, fieldRefs } = useTituloWizard();
  
  const naturezasDisponiveis = form.tipo === 'receber' ? naturezasReceber : naturezasPagar;
  const naturezaSelecionada = naturezasDisponiveis.find(n => n.value === form.natureza);
  
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2 mb-1">
          📋 Identificação
        </h2>
        <p className="text-sm text-muted-foreground">
          Defina o tipo e a natureza do título para classificação contábil correta.
        </p>
      </div>
      
      {/* Tipo - Cards visuais */}
      <FormSection title="Tipo do Título" description="Selecione se é uma receita ou despesa">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {tipoOptions.map((opt) => {
            const Icon = opt.icon;
            const isSelected = form.tipo === opt.value;
            
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => updateField('tipo', opt.value as 'pagar' | 'receber')}
                className={cn(
                  "relative flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left",
                  isSelected 
                    ? opt.bgColor + " border-current " + opt.color
                    : "border-zinc-200 hover:border-zinc-300 bg-white"
                )}
              >
                <div className={cn(
                  "flex items-center justify-center w-12 h-12 rounded-xl",
                  isSelected ? opt.color + " bg-white" : "bg-zinc-100 text-zinc-400"
                )}>
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <p className={cn("font-semibold", isSelected ? opt.color : "text-zinc-700")}>
                    {opt.label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {opt.value === 'receber' ? 'Entrada de recursos' : 'Saída de recursos'}
                  </p>
                </div>
                {isSelected && (
                  <div className={cn("absolute top-2 right-2 w-2 h-2 rounded-full", opt.color.replace('text-', 'bg-'))} />
                )}
              </button>
            );
          })}
        </div>
        
        {/* Dica sobre tipo */}
        <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg mt-4">
          💡 <strong>Dica:</strong> {form.tipo === 'receber' 
            ? 'Títulos a receber aumentam seu saldo quando quitados.' 
            : 'Títulos a pagar diminuem seu saldo quando quitados.'}
        </div>
      </FormSection>
      
      {/* Natureza */}
      <FormSection 
        title="Natureza" 
        description="Classifica o tipo de receita ou despesa para a contabilidade"
      >
        <FormField error={errors.natureza}>
          <LabelWithHelp 
            label="Natureza do Título" 
            help="A natureza define a conta contábil sugerida automaticamente. Escolha a que melhor representa a operação."
            required 
          />
          <Select 
            value={form.natureza} 
            onValueChange={(v) => updateField('natureza', v)}
          >
            <SelectTrigger 
              ref={(el) => { fieldRefs.current['natureza'] = el; }}
              className={cn(errors.natureza && 'border-destructive')}
            >
              <SelectValue placeholder="Selecione a natureza..." />
            </SelectTrigger>
            <SelectContent>
              {naturezasDisponiveis.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  <div className="flex items-center gap-2">
                    <span>{opt.label}</span>
                    <Badge variant="outline" className="text-[10px] font-mono">{opt.conta}</Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        
        {/* Info da natureza selecionada */}
        {naturezaSelecionada && (
          <div className={cn(
            "p-4 rounded-lg border mt-3",
            form.tipo === 'receber' ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200"
          )}>
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="shrink-0 font-mono">{naturezaSelecionada.conta}</Badge>
              <div>
                <p className="font-medium text-sm">{naturezaSelecionada.label}</p>
                <p className="text-xs text-muted-foreground mt-1">{naturezaSelecionada.help}</p>
              </div>
            </div>
          </div>
        )}
      </FormSection>
      
      {/* Descrição */}
      <FormSection 
        title="Descrição" 
        description="Identifique o título de forma clara para consultas futuras"
      >
        <FormField error={errors.descricao}>
          <LabelWithHelp 
            label="Descrição do Título" 
            help="Descreva de forma clara o que representa este título. Ex: 'Conta de energia elétrica - Janeiro/2025' ou 'Doação de Maria Silva - Campanha Natal'"
            required 
          />
          <Textarea
            ref={(el) => { fieldRefs.current['descricao'] = el; }}
            value={form.descricao}
            onChange={(e) => updateField('descricao', e.target.value)}
            placeholder="Ex: Conta de energia elétrica - Janeiro/2025"
            rows={2}
            className={cn(errors.descricao && 'border-destructive')}
          />
        </FormField>
        
        {/* Contador de caracteres */}
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>Mínimo 3 caracteres</span>
          <span className={cn(form.descricao.length < 3 && "text-amber-600")}>
            {form.descricao.length} caracteres
          </span>
        </div>
      </FormSection>
    </div>
  );
}

