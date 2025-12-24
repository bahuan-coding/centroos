import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TooltipHelp } from '@/components/ui/tooltip-help';
import { useFundoWizard } from '../FundoWizardProvider';
import { DollarSign, Info } from 'lucide-react';

export function StepSaldoInicial() {
  const { form, updateField, fieldRefs, isEditMode } = useFundoWizard();
  
  const formatCurrency = (value: string) => {
    const num = parseFloat(value.replace(/[^\d,.-]/g, '').replace(',', '.'));
    if (isNaN(num)) return 'R$ 0,00';
    return `R$ ${num.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };
  
  const saldoNum = parseFloat(form.saldoInicial.replace(/[^\d,.-]/g, '').replace(',', '.')) || 0;
  
  // Em edição, não mostra esta etapa pois saldo inicial só faz sentido na criação
  if (isEditMode) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 mb-1">Saldo Inicial</h2>
          <p className="text-sm text-muted-foreground">
            Esta etapa é apenas para criação de novos fundos.
          </p>
        </div>
        
        <div className="p-4 rounded-xl bg-zinc-50 border">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-zinc-500 mt-0.5" />
            <div>
              <p className="font-medium text-zinc-700">Saldo não editável</p>
              <p className="text-sm text-muted-foreground mt-1">
                O saldo inicial só pode ser definido na criação do fundo. 
                Para ajustar o saldo atual, use as movimentações de alocação ou consumo.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 mb-1">Saldo Inicial (Migração)</h2>
        <p className="text-sm text-muted-foreground">
          Defina o saldo inicial para fundos existentes antes da implantação do sistema.
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="fundo-saldo" className="flex items-center gap-1.5">
          <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
          Saldo Inicial (R$)
          <TooltipHelp 
            content="Use apenas para migração: informe o saldo existente do fundo antes de começar a usar o sistema. Este valor será o saldo inicial e não gera lançamento contábil automático."
          />
        </Label>
        <Input
          id="fundo-saldo"
          ref={(el) => { fieldRefs.current['saldoInicial'] = el; }}
          value={form.saldoInicial}
          onChange={(e) => updateField('saldoInicial', e.target.value)}
          placeholder="0,00"
          className="font-mono max-w-xs"
        />
        {saldoNum > 0 && (
          <p className="text-sm text-muted-foreground">
            Saldo: <span className="font-medium text-emerald-600">{formatCurrency(form.saldoInicial)}</span>
          </p>
        )}
      </div>
      
      {/* Info box */}
      <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
        <h4 className="font-medium text-sm text-blue-800 mb-2">ℹ️ Quando usar o saldo inicial?</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• <strong>Migração:</strong> Quando o fundo já existia antes do sistema e tem saldo acumulado.</li>
          <li>• <strong>Implantação:</strong> Para registrar valores de fundos já constituídos.</li>
          <li>• <strong>Não use:</strong> Para novos fundos sem histórico. Nesses casos, deixe zerado.</li>
        </ul>
      </div>
      
      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
        <h4 className="font-medium text-sm text-amber-800 mb-2">⚠️ Importante</h4>
        <p className="text-sm text-amber-700">
          O saldo inicial não gera lançamento contábil automático. Se necessário, faça o lançamento 
          de ajuste manualmente na contabilidade para manter a conciliação.
        </p>
      </div>
    </div>
  );
}









