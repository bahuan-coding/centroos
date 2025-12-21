import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TooltipHelp } from '@/components/ui/tooltip-help';
import { useProjetoWizard } from '../ProjetoWizardProvider';
import { AlertTriangle, Calendar } from 'lucide-react';

export function StepCronograma() {
  const { form, updateField, fieldRefs, warnings } = useProjetoWizard();
  
  const hasDateWarning = warnings.some(w => w.campo === 'dataFimPrevista' && w.tipo === 'warning');
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 mb-1">Cronograma</h2>
        <p className="text-sm text-muted-foreground">
          Defina as datas de início e término previsto do projeto.
        </p>
      </div>
      
      <div className="grid gap-6 sm:grid-cols-2">
        {/* Data de Início */}
        <div className="space-y-2">
          <Label htmlFor="projeto-data-inicio" className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            Data de Início
            <TooltipHelp 
              content="Data de início das atividades do projeto. Usada para cálculo de duração e acompanhamento de cronograma nos relatórios."
            />
          </Label>
          <Input
            id="projeto-data-inicio"
            type="date"
            ref={(el) => { fieldRefs.current['dataInicio'] = el; }}
            value={form.dataInicio}
            onChange={(e) => updateField('dataInicio', e.target.value)}
            className="max-w-xs"
          />
        </div>
        
        {/* Previsão de Término */}
        <div className="space-y-2">
          <Label htmlFor="projeto-data-fim" className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            Previsão de Término
            <TooltipHelp 
              content="Data prevista para conclusão do projeto. Pode ser ajustada conforme andamento. Usada para monitorar prazos e identificar atrasos."
            />
          </Label>
          <Input
            id="projeto-data-fim"
            type="date"
            ref={(el) => { fieldRefs.current['dataFimPrevista'] = el; }}
            value={form.dataFimPrevista}
            onChange={(e) => updateField('dataFimPrevista', e.target.value)}
            className="max-w-xs"
          />
        </div>
      </div>
      
      {/* Warning sobre datas */}
      {hasDateWarning && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">Data de término anterior ao início</p>
            <p className="text-sm text-amber-700 mt-1">
              A previsão de término está antes da data de início. Verifique se as datas estão corretas.
            </p>
          </div>
        </div>
      )}
      
      {/* Dicas */}
      <div className="p-4 rounded-xl bg-zinc-50 border">
        <h4 className="font-medium text-sm text-zinc-700 mb-2">💡 Dicas sobre cronograma</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Defina datas realistas considerando recursos disponíveis</li>
          <li>• A previsão pode ser ajustada durante a execução</li>
          <li>• Projetos sem data de início aparecem como "A definir" nos relatórios</li>
        </ul>
      </div>
    </div>
  );
}

