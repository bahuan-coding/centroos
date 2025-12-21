import { useState } from 'react';
import { ChevronLeft, ChevronRight, FileText, Settings, Eye, Check, Calendar, Loader2, Download } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { formatPeriod } from '@/lib/utils';

export interface ReportOptions {
  periodId: number;
  isDraft: boolean;
  includeDetails: boolean;
  includeInstitutionalFooter: boolean;
}

interface ReportWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  periods: { id: number; month: number; year: number }[];
  onGenerate: (options: ReportOptions) => Promise<void>;
  isPending: boolean;
  reportTitle?: string;
}

const steps = [
  { id: 1, title: 'Período', icon: Calendar, description: 'Selecione o período do relatório' },
  { id: 2, title: 'Opções', icon: Settings, description: 'Configure as opções do relatório' },
  { id: 3, title: 'Revisar', icon: Eye, description: 'Revise e gere o relatório' },
];

export function ReportWizard({
  open,
  onOpenChange,
  periods,
  onGenerate,
  isPending,
  reportTitle = 'Relatório Financeiro Mensal',
}: ReportWizardProps) {
  const [step, setStep] = useState(1);
  const [options, setOptions] = useState<ReportOptions>({
    periodId: periods[0]?.id || 0,
    isDraft: false,
    includeDetails: true,
    includeInstitutionalFooter: true,
  });

  const selectedPeriod = periods.find(p => p.id === options.periodId);

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleGenerate = async () => {
    await onGenerate(options);
    onOpenChange(false);
    setStep(1);
  };

  const handleClose = () => {
    onOpenChange(false);
    setStep(1);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        {/* Header com gradiente */}
        <div className="bg-gradient-to-br from-blue-500 to-cyan-600 p-5 text-white">
          <DialogHeader>
            <DialogTitle className="text-white text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {reportTitle}
            </DialogTitle>
          </DialogHeader>
          
          {/* Stepper */}
          <div className="flex items-center justify-between mt-4">
            {steps.map((s, idx) => {
              const Icon = s.icon;
              const isActive = step === s.id;
              const isCompleted = step > s.id;
              
              return (
                <div key={s.id} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center transition-all',
                      isActive && 'bg-white text-blue-600',
                      isCompleted && 'bg-white/30 text-white',
                      !isActive && !isCompleted && 'bg-white/10 text-white/60'
                    )}>
                      {isCompleted ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        <Icon className="h-5 w-5" />
                      )}
                    </div>
                    <span className={cn(
                      'text-xs mt-1 font-medium',
                      isActive && 'text-white',
                      !isActive && 'text-white/60'
                    )}>
                      {s.title}
                    </span>
                  </div>
                  
                  {idx < steps.length - 1 && (
                    <div className={cn(
                      'w-12 h-0.5 mx-2',
                      isCompleted ? 'bg-white/50' : 'bg-white/20'
                    )} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Conteúdo */}
        <div className="p-5">
          {/* Step 1: Período */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">
                  Período do Relatório
                </Label>
                <Select
                  value={options.periodId.toString()}
                  onValueChange={(v) => setOptions({ ...options, periodId: parseInt(v) })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione o período" />
                  </SelectTrigger>
                  <SelectContent>
                    {periods.map((p) => (
                      <SelectItem key={p.id} value={p.id.toString()}>
                        {formatPeriod(p.month, p.year)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="bg-slate-50 rounded-lg p-4 text-sm text-muted-foreground">
                <p>
                  O relatório será gerado com todos os lançamentos financeiros 
                  registrados no período selecionado.
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Opções */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-slate-50 transition-colors">
                  <Checkbox
                    id="details"
                    checked={options.includeDetails}
                    onCheckedChange={(checked) => 
                      setOptions({ ...options, includeDetails: checked === true })
                    }
                  />
                  <div className="space-y-1">
                    <Label htmlFor="details" className="font-medium cursor-pointer">
                      Detalhamento por categoria
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Inclui tabelas detalhadas de receitas e despesas por categoria
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-slate-50 transition-colors">
                  <Checkbox
                    id="footer"
                    checked={options.includeInstitutionalFooter}
                    onCheckedChange={(checked) => 
                      setOptions({ ...options, includeInstitutionalFooter: checked === true })
                    }
                  />
                  <div className="space-y-1">
                    <Label htmlFor="footer" className="font-medium cursor-pointer">
                      Rodapé institucional
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Inclui informações de contato da instituição no final do relatório
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 transition-colors">
                  <Checkbox
                    id="draft"
                    checked={options.isDraft}
                    onCheckedChange={(checked) => 
                      setOptions({ ...options, isDraft: checked === true })
                    }
                  />
                  <div className="space-y-1">
                    <Label htmlFor="draft" className="font-medium cursor-pointer">
                      Marcar como Rascunho
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Adiciona marca d'água "RASCUNHO" em todas as páginas
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Revisão */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                <h4 className="font-semibold text-sm">Resumo do Relatório</h4>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tipo:</span>
                    <span className="font-medium">{reportTitle}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Período:</span>
                    <span className="font-medium">
                      {selectedPeriod ? formatPeriod(selectedPeriod.month, selectedPeriod.year) : '—'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <span className={cn(
                      'font-medium px-2 py-0.5 rounded text-xs',
                      options.isDraft 
                        ? 'bg-amber-100 text-amber-700' 
                        : 'bg-green-100 text-green-700'
                    )}>
                      {options.isDraft ? 'Rascunho' : 'Oficial'}
                    </span>
                  </div>
                </div>

                <div className="border-t pt-3 mt-3">
                  <h5 className="text-xs font-medium text-muted-foreground mb-2">
                    Seções incluídas:
                  </h5>
                  <ul className="text-sm space-y-1">
                    <li className="flex items-center gap-2">
                      <Check className="h-3 w-3 text-green-500" />
                      Capa e Sumário
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3 w-3 text-green-500" />
                      Visão Geral (KPIs)
                    </li>
                    {options.includeDetails && (
                      <>
                        <li className="flex items-center gap-2">
                          <Check className="h-3 w-3 text-green-500" />
                          Demonstrativo de Receitas
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-3 w-3 text-green-500" />
                          Demonstrativo de Despesas
                        </li>
                      </>
                    )}
                    <li className="flex items-center gap-2">
                      <Check className="h-3 w-3 text-green-500" />
                      Resultado e Observações
                    </li>
                  </ul>
                </div>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                O PDF será baixado automaticamente após a geração.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-4 flex items-center justify-between bg-slate-50/50">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={step === 1 || isPending}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Voltar
          </Button>

          {step < 3 ? (
            <Button onClick={handleNext} className="gap-1">
              Próximo
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleGenerate}
              disabled={isPending || !options.periodId}
              className="gap-2 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Gerar PDF
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

