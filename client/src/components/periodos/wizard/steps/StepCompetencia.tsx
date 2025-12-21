import { usePeriodoWizard } from '../PeriodoWizardProvider';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormSection, FormField, FormRow } from '@/components/ui/form-section';
import { RichPopover } from '@/components/ui/rich-popover';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Calendar, ExternalLink, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocation } from 'wouter';

const MESES = [
  { value: 1, label: 'Janeiro' },
  { value: 2, label: 'Fevereiro' },
  { value: 3, label: 'Março' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Maio' },
  { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Setembro' },
  { value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro' },
  { value: 12, label: 'Dezembro' },
];

export function StepCompetencia() {
  const { form, updateField, errors, fieldRefs, warnings, duplicateInfo, checkingDuplicate, existingPeriods, closeWizard } = usePeriodoWizard();
  const [, navigate] = useLocation();
  
  // Find previous period info
  const prevMonth = form.mes ? (form.mes === 1 ? 12 : form.mes - 1) : null;
  const prevYear = form.mes ? (form.mes === 1 ? form.ano - 1 : form.ano) : null;
  const prevPeriodExists = prevMonth && prevYear ? existingPeriods.some(p => p.month === prevMonth && p.year === prevYear) : null;
  
  const handleOpenExistingPeriod = () => {
    if (duplicateInfo?.periodId) {
      closeWizard();
      // Small delay to allow wizard to close before navigating
      setTimeout(() => {
        navigate(`/periods?selected=${duplicateInfo.periodId}`);
      }, 100);
    }
  };
  
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2 mb-1">
          <Calendar className="h-5 w-5 text-emerald-600" />
          Competência do Período
        </h2>
        <p className="text-sm text-muted-foreground">
          Defina o mês e ano de competência para o novo período contábil.
        </p>
      </div>
      
      {/* Seleção de Mês/Ano */}
      <FormSection 
        title="Período de Competência" 
        description="O período define quando os fatos contábeis serão registrados"
      >
        <FormRow>
          <FormField error={errors.mes}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <label htmlFor="mes" className="text-sm font-medium">
                Mês<span className="text-destructive ml-0.5">*</span>
              </label>
              <RichPopover
                title="Mês de Competência"
                items={[
                  'O mês indica quando o fato contábil efetivamente ocorreu.',
                  'Receitas e despesas serão lançadas neste período.',
                  'O regime de competência reconhece receitas quando auferidas e despesas quando incorridas.',
                  'Diferente do regime de caixa, não importa quando o dinheiro entra ou sai.',
                ]}
                footer="NBC TG 1000 (R1) — Contabilidade para Pequenas e Médias Empresas"
              />
            </div>
            <Select 
              value={form.mes?.toString() || ''} 
              onValueChange={(v) => updateField('mes', parseInt(v))}
            >
              <SelectTrigger 
                id="mes"
                ref={(el) => { fieldRefs.current['mes'] = el; }}
                className={cn(errors.mes && 'border-destructive')}
              >
                <SelectValue placeholder="Selecione o mês" />
              </SelectTrigger>
              <SelectContent>
                {MESES.map((m) => (
                  <SelectItem key={m.value} value={m.value.toString()}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          
          <FormField error={errors.ano}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <label htmlFor="ano" className="text-sm font-medium">
                Ano<span className="text-destructive ml-0.5">*</span>
              </label>
              <RichPopover
                title="Ano do Exercício"
                items={[
                  'O ano fiscal normalmente coincide com o ano civil (Jan-Dez).',
                  'O exercício social é o período de apuração das demonstrações contábeis.',
                  'Ao final do exercício, são gerados: Balanço Patrimonial, DRE, etc.',
                ]}
                footer="O exercício típico para entidades sem fins lucrativos é de 12 meses."
              />
            </div>
            <Input
              id="ano"
              type="number"
              ref={(el) => { fieldRefs.current['ano'] = el; }}
              value={form.ano}
              onChange={(e) => updateField('ano', parseInt(e.target.value) || new Date().getFullYear())}
              min={2000}
              max={2100}
              className={cn("font-mono", errors.ano && 'border-destructive')}
            />
          </FormField>
        </FormRow>
        
        {/* Duplicate Warning */}
        {checkingDuplicate && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-3">
            <Loader2 className="h-4 w-4 animate-spin" />
            Verificando disponibilidade...
          </div>
        )}
        
        {duplicateInfo?.exists && (
          <div className="mt-4 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-destructive">Período já existe</p>
                <p className="text-sm text-destructive/80 mt-1">
                  O período {MESES.find(m => m.value === form.mes)?.label}/{form.ano} já está cadastrado no sistema.
                  Cada competência (mês/ano) deve ser única.
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleOpenExistingPeriod}
                  className="mt-3 border-destructive/30 text-destructive hover:bg-destructive/10"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Abrir período existente
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {/* Previous period warning */}
        {prevPeriodExists === false && existingPeriods.length > 0 && !duplicateInfo?.exists && (
          <div className="mt-4 p-4 rounded-lg bg-amber-50 border border-amber-200">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800">Período anterior não existe</p>
                <p className="text-sm text-amber-700 mt-1">
                  O período {MESES.find(m => m.value === prevMonth)?.label}/{prevYear} não está cadastrado.
                  Criar períodos em sequência garante continuidade contábil e facilita o transporte de saldos.
                </p>
              </div>
            </div>
          </div>
        )}
      </FormSection>
      
      {/* Período selecionado - resumo visual */}
      {form.mes && !duplicateInfo?.exists && (
        <div className="p-4 rounded-lg bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-white shadow-sm border border-emerald-100">
              <Calendar className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-emerald-700">Você está criando:</p>
              <p className="text-lg font-bold text-emerald-900">
                {MESES.find(m => m.value === form.mes)?.label} de {form.ano}
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Dica técnica */}
      <div className="p-4 rounded-lg bg-muted/50 border">
        <div className="flex items-start gap-3">
          <span className="text-xl">📋</span>
          <div>
            <p className="text-sm font-medium text-foreground">Regras de competência</p>
            <ul className="text-xs text-muted-foreground mt-2 space-y-1">
              <li>• Apenas um período por competência (mês/ano)</li>
              <li>• Lançamentos serão vinculados a este período</li>
              <li>• O período ficará com status "Aberto" após criação</li>
              <li>• Fechar o período impede novos lançamentos</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

