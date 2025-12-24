import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { TooltipHelp } from '@/components/ui/tooltip-help';
import { useFundoWizard, RegraFundo } from './FundoWizardProvider';
import { X, Check, Info, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RegraWizardProps {
  regra?: RegraFundo;
  onSave: (regra: RegraFundo) => void;
  onClose: () => void;
}

export function RegraWizard({ regra, onSave, onClose }: RegraWizardProps) {
  const { regraConfig, addRegra } = useFundoWizard();
  const isEditing = !!regra;
  
  const [form, setForm] = useState<RegraFundo>(() => regra || {
    tipoRegra: 'aprovador_obrigatorio',
    parametroNumerico: '',
    parametroTexto: '',
    ativo: true,
  });
  
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const currentConfig = regraConfig[form.tipoRegra];
  
  const getImpactPreview = () => {
    switch (form.tipoRegra) {
      case 'valor_maximo':
        const val = parseFloat(form.parametroNumerico || '0');
        return val > 0 
          ? `Consumos acima de R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} irão para aprovação`
          : 'Defina um valor limite';
      case 'aprovador_obrigatorio':
        return 'Todo consumo deste fundo requer aprovação prévia';
      case 'percentual_receita':
        return form.parametroNumerico 
          ? `${form.parametroNumerico}% das receitas serão automaticamente destinados a este fundo`
          : 'Defina o percentual';
      case 'categoria_permitida':
        return form.parametroTexto 
          ? `Consumo permitido apenas para: ${form.parametroTexto}`
          : 'Defina as categorias permitidas';
      case 'categoria_proibida':
        return form.parametroTexto 
          ? `Consumo proibido para: ${form.parametroTexto}`
          : 'Defina as categorias proibidas';
      default:
        return currentConfig?.description || '';
    }
  };
  
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (currentConfig?.needsNumeric && !form.parametroNumerico) {
      newErrors.parametroNumerico = 'Valor é obrigatório para este tipo de regra';
    }
    
    if (currentConfig?.needsText && form.tipoRegra !== 'aprovador_obrigatorio' && !form.parametroTexto) {
      newErrors.parametroTexto = 'Descrição é obrigatória para este tipo de regra';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleNext = () => {
    if (step === 0) {
      setStep(1);
    } else if (step === 1) {
      if (validate()) {
        setStep(2);
      }
    }
  };
  
  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };
  
  const handleSave = () => {
    if (!validate()) return;
    
    if (isEditing) {
      onSave(form);
    } else {
      addRegra(form);
      onSave(form);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full flex flex-col animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-teal-600" />
            <h3 className="font-semibold text-lg">
              {isEditing ? 'Editar Regra' : 'Adicionar Regra'}
            </h3>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        {/* Content */}
        <div className="p-6 space-y-6">
          {step === 0 && (
            <>
              <div>
                <h4 className="font-medium mb-1">Tipo de Regra</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Selecione o tipo de controle que deseja aplicar.
                </p>
              </div>
              
              <div className="space-y-2">
                {Object.entries(regraConfig).map(([key, config]) => (
                  <button
                    key={key}
                    onClick={() => setForm({ ...form, tipoRegra: key })}
                    className={cn(
                      "w-full p-4 rounded-lg border text-left transition-all",
                      form.tipoRegra === key 
                        ? "border-teal-500 bg-teal-50" 
                        : "border-zinc-200 hover:border-zinc-300"
                    )}
                  >
                    <p className="font-medium text-sm">{config.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">{config.description}</p>
                  </button>
                ))}
              </div>
            </>
          )}
          
          {step === 1 && (
            <>
              <div>
                <h4 className="font-medium mb-1">Parâmetros</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Configure os valores para a regra "{currentConfig?.label}".
                </p>
              </div>
              
              <div className="space-y-4">
                {currentConfig?.needsNumeric && (
                  <div className="space-y-2">
                    <Label htmlFor="regra-valor" className="flex items-center gap-1.5">
                      {form.tipoRegra === 'percentual_receita' ? 'Percentual (%)' : 'Valor (R$)'}
                      <TooltipHelp 
                        content={
                          form.tipoRegra === 'percentual_receita' 
                            ? 'Percentual das receitas a destinar automaticamente'
                            : 'Valor limite para disparo da regra'
                        }
                      />
                    </Label>
                    <Input
                      id="regra-valor"
                      value={form.parametroNumerico}
                      onChange={(e) => setForm({ ...form, parametroNumerico: e.target.value })}
                      placeholder={form.tipoRegra === 'percentual_receita' ? '10' : '5000'}
                      className={cn('font-mono', errors.parametroNumerico && 'border-destructive')}
                    />
                    {errors.parametroNumerico && (
                      <p className="text-xs text-destructive">{errors.parametroNumerico}</p>
                    )}
                  </div>
                )}
                
                {currentConfig?.needsText && form.tipoRegra !== 'aprovador_obrigatorio' && (
                  <div className="space-y-2">
                    <Label htmlFor="regra-texto" className="flex items-center gap-1.5">
                      {form.tipoRegra.includes('categoria') ? 'Categorias' : 'Descrição'}
                      <TooltipHelp content="Separe múltiplos valores por vírgula" />
                    </Label>
                    <Input
                      id="regra-texto"
                      value={form.parametroTexto}
                      onChange={(e) => setForm({ ...form, parametroTexto: e.target.value })}
                      placeholder="Ex: Material de construção, Manutenção"
                      className={errors.parametroTexto && 'border-destructive'}
                    />
                    {errors.parametroTexto && (
                      <p className="text-xs text-destructive">{errors.parametroTexto}</p>
                    )}
                  </div>
                )}
                
                {form.tipoRegra === 'aprovador_obrigatorio' && (
                  <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                    <div className="flex items-start gap-2">
                      <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                      <p className="text-sm text-blue-700">
                        Esta regra não requer parâmetros adicionais. 
                        Todo consumo do fundo passará por aprovação.
                      </p>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center gap-3 p-3 rounded-lg border">
                  <Checkbox
                    id="regra-ativo"
                    checked={form.ativo}
                    onCheckedChange={(checked) => setForm({ ...form, ativo: !!checked })}
                  />
                  <Label htmlFor="regra-ativo" className="cursor-pointer">
                    Regra ativa
                  </Label>
                </div>
              </div>
            </>
          )}
          
          {step === 2 && (
            <>
              <div>
                <h4 className="font-medium mb-1">Revisão</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Confira a regra antes de salvar.
                </p>
              </div>
              
              <div className="p-4 rounded-lg bg-zinc-50 border space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Tipo</p>
                  <p className="font-medium">{currentConfig?.label}</p>
                </div>
                
                {form.parametroNumerico && (
                  <div>
                    <p className="text-xs text-muted-foreground">Valor</p>
                    <p className="font-mono">
                      {form.tipoRegra === 'percentual_receita' 
                        ? `${form.parametroNumerico}%`
                        : `R$ ${parseFloat(form.parametroNumerico).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                      }
                    </p>
                  </div>
                )}
                
                {form.parametroTexto && (
                  <div>
                    <p className="text-xs text-muted-foreground">Parâmetro</p>
                    <p>{form.parametroTexto}</p>
                  </div>
                )}
                
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <p className={form.ativo ? 'text-emerald-600' : 'text-muted-foreground'}>
                    {form.ativo ? 'Ativa' : 'Inativa'}
                  </p>
                </div>
              </div>
              
              {/* Impact preview */}
              <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-blue-800 mb-1">Impacto da regra:</p>
                    <p className="text-sm text-blue-700">{getImpactPreview()}</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t bg-zinc-50">
          <Button
            variant="ghost"
            onClick={step === 0 ? onClose : handleBack}
          >
            {step === 0 ? 'Cancelar' : 'Voltar'}
          </Button>
          
          {step < 2 ? (
            <Button onClick={handleNext}>
              Próximo
            </Button>
          ) : (
            <Button onClick={handleSave} className="bg-teal-600 hover:bg-teal-700">
              <Check className="h-4 w-4 mr-2" />
              {isEditing ? 'Salvar' : 'Adicionar Regra'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}












