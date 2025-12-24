import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TooltipHelp } from '@/components/ui/tooltip-help';
import { useProjetoWizard } from '../ProjetoWizardProvider';
import { DollarSign } from 'lucide-react';

export function StepOrcamento() {
  const { form, updateField, fieldRefs } = useProjetoWizard();
  
  const formatCurrency = (value: string) => {
    const num = parseFloat(value.replace(/[^\d,.-]/g, '').replace(',', '.'));
    if (isNaN(num)) return 'R$ 0,00';
    return `R$ ${num.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };
  
  const orcamentoNum = parseFloat(form.orcamentoPrevisto.replace(/[^\d,.-]/g, '').replace(',', '.')) || 0;
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 mb-1">Orçamento</h2>
        <p className="text-sm text-muted-foreground">
          Defina o orçamento previsto para o projeto.
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="projeto-orcamento" className="flex items-center gap-1.5">
          <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
          Orçamento Previsto (R$)
          <TooltipHelp 
            content="Valor total previsto para execução do projeto. Usado para controle financeiro e comparação com gastos realizados. Pode ser ajustado conforme necessidade."
          />
        </Label>
        <Input
          id="projeto-orcamento"
          ref={(el) => { fieldRefs.current['orcamentoPrevisto'] = el; }}
          value={form.orcamentoPrevisto}
          onChange={(e) => updateField('orcamentoPrevisto', e.target.value)}
          placeholder="0,00"
          className="font-mono max-w-xs"
        />
        {orcamentoNum > 0 && (
          <p className="text-sm text-muted-foreground">
            Valor: <span className="font-medium text-zinc-700">{formatCurrency(form.orcamentoPrevisto)}</span>
          </p>
        )}
      </div>
      
      {/* Info box */}
      <div className="p-4 rounded-xl bg-zinc-50 border">
        <h4 className="font-medium text-sm text-zinc-700 mb-2">💡 Sobre o orçamento</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• O orçamento previsto é uma estimativa inicial</li>
          <li>• Compare com gastos realizados para controle de execução</li>
          <li>• Projetos sem orçamento definido aparecem como "A definir" nos relatórios</li>
          <li>• Você pode vincular despesas ao projeto para acompanhar o realizado</li>
        </ul>
      </div>
    </div>
  );
}










