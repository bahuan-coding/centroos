import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TooltipHelp } from '@/components/ui/tooltip-help';
import { useFundoWizard } from '../FundoWizardProvider';
import { AlertTriangle, Calendar, Target } from 'lucide-react';

export function StepVigencia() {
  const { form, updateField, fieldRefs, warnings, isEditMode } = useFundoWizard();
  
  const hasDateWarning = warnings.some(w => w.campo === 'dataLimite' && w.tipo === 'warning');
  
  const formatCurrency = (value: string) => {
    const num = parseFloat(value.replace(/[^\d,.-]/g, '').replace(',', '.'));
    if (isNaN(num)) return 'R$ 0,00';
    return `R$ ${num.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };
  
  const metaNum = parseFloat(form.metaValor.replace(/[^\d,.-]/g, '').replace(',', '.')) || 0;
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 mb-1">Vigência e Meta</h2>
        <p className="text-sm text-muted-foreground">
          Defina o período de vigência e meta de captação do fundo.
        </p>
      </div>
      
      <div className="grid gap-6 sm:grid-cols-2">
        {/* Data de Criação */}
        <div className="space-y-2">
          <Label htmlFor="fundo-data-inicio" className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            Data de Criação
            <TooltipHelp 
              content="Data de criação do fundo. Usada para relatórios e histórico. Em edição, esta data não pode ser alterada."
            />
          </Label>
          <Input
            id="fundo-data-inicio"
            type="date"
            ref={(el) => { fieldRefs.current['dataInicio'] = el; }}
            value={form.dataInicio}
            onChange={(e) => updateField('dataInicio', e.target.value)}
            disabled={isEditMode}
            className="max-w-xs"
          />
        </div>
        
        {/* Data Limite */}
        <div className="space-y-2">
          <Label htmlFor="fundo-data-limite" className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            Data Limite
            <TooltipHelp 
              content="Data limite para uso do fundo. Após esta data, o fundo pode ser bloqueado para novas movimentações. Deixe em branco se não houver prazo definido."
            />
          </Label>
          <Input
            id="fundo-data-limite"
            type="date"
            ref={(el) => { fieldRefs.current['dataLimite'] = el; }}
            value={form.dataLimite}
            onChange={(e) => updateField('dataLimite', e.target.value)}
            className="max-w-xs"
          />
        </div>
      </div>
      
      {/* Warning sobre datas */}
      {hasDateWarning && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">Data limite anterior à criação</p>
            <p className="text-sm text-amber-700 mt-1">
              A data limite está antes da data de criação. Verifique se as datas estão corretas.
            </p>
          </div>
        </div>
      )}
      
      {/* Meta */}
      <div className="space-y-2">
        <Label htmlFor="fundo-meta" className="flex items-center gap-1.5">
          <Target className="h-3.5 w-3.5 text-muted-foreground" />
          Meta de Captação (R$)
          <TooltipHelp 
            content="Objetivo de captação para este fundo. Usado para acompanhamento de progresso em relatórios. Exemplo: Meta de R$ 50.000 para reforma do telhado."
          />
        </Label>
        <Input
          id="fundo-meta"
          ref={(el) => { fieldRefs.current['metaValor'] = el; }}
          value={form.metaValor}
          onChange={(e) => updateField('metaValor', e.target.value)}
          placeholder="0,00"
          className="font-mono max-w-xs"
        />
        {metaNum > 0 && (
          <p className="text-sm text-muted-foreground">
            Meta: <span className="font-medium text-zinc-700">{formatCurrency(form.metaValor)}</span>
          </p>
        )}
      </div>
      
      {/* Info box */}
      <div className="p-4 rounded-xl bg-zinc-50 border">
        <h4 className="font-medium text-sm text-zinc-700 mb-2">💡 Sobre vigência e meta</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• A data limite é opcional. Use quando houver prazo definido para captação/uso.</li>
          <li>• A meta ajuda a acompanhar o progresso da captação.</li>
          <li>• Fundos sem data limite permanecem ativos indefinidamente.</li>
        </ul>
      </div>
    </div>
  );
}













