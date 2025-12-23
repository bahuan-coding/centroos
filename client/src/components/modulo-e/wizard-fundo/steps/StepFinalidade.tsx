import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TooltipHelp } from '@/components/ui/tooltip-help';
import { useFundoWizard } from '../FundoWizardProvider';

export function StepFinalidade() {
  const { form, updateField, fieldRefs } = useFundoWizard();
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 mb-1">Finalidade e Descrição</h2>
        <p className="text-sm text-muted-foreground">
          Descreva o propósito do fundo e sua finalidade específica.
        </p>
      </div>
      
      <div className="grid gap-6">
        {/* Descrição */}
        <div className="space-y-2">
          <Label htmlFor="fundo-descricao" className="flex items-center gap-1.5">
            Descrição
            <TooltipHelp 
              content="Descreva o propósito geral do fundo. Para que serve? Quando deve ser usado? Importante para orientar gestores e prestação de contas."
            />
          </Label>
          <Textarea
            id="fundo-descricao"
            ref={(el) => { fieldRefs.current['descricao'] = el; }}
            value={form.descricao}
            onChange={(e) => updateField('descricao', e.target.value)}
            placeholder="Descreva o propósito e quando este fundo deve ser usado..."
            rows={4}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground">
            {form.descricao.length}/500 caracteres
          </p>
        </div>
        
        {/* Finalidade Específica */}
        <div className="space-y-2">
          <Label htmlFor="fundo-finalidade" className="flex items-center gap-1.5">
            Finalidade Específica
            <TooltipHelp 
              content="Para fundos restritos ou designados: especifique exatamente para que o recurso deve ser usado. Importante para auditoria, transparência e prestação de contas ao doador (se aplicável)."
            />
          </Label>
          <Input
            id="fundo-finalidade"
            ref={(el) => { fieldRefs.current['finalidade'] = el; }}
            value={form.finalidade}
            onChange={(e) => updateField('finalidade', e.target.value)}
            placeholder="Ex: Construção do novo salão de eventos"
            className="max-w-lg"
          />
          <p className="text-xs text-muted-foreground">
            Especialmente importante para fundos restritos (definidos por doador).
          </p>
        </div>
      </div>
      
      {/* Dicas por tipo */}
      {form.tipo === 'restrito' && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200">
          <h4 className="font-medium text-sm text-rose-800 mb-2">⚠️ Fundo Restrito</h4>
          <p className="text-sm text-rose-700">
            Este fundo tem uso definido pelo doador. A finalidade específica é obrigatória e 
            qualquer desvio requer autorização formal. Mantenha documentação comprobatória.
          </p>
        </div>
      )}
      
      {form.tipo === 'designado' && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
          <h4 className="font-medium text-sm text-amber-800 mb-2">📋 Fundo Designado</h4>
          <p className="text-sm text-amber-700">
            Este fundo tem uso definido pela diretoria. A finalidade pode ser alterada 
            mediante ata de reunião. Documente as decisões de redesignação.
          </p>
        </div>
      )}
    </div>
  );
}






