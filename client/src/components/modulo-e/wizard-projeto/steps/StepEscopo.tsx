import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { TooltipHelp } from '@/components/ui/tooltip-help';
import { useProjetoWizard } from '../ProjetoWizardProvider';

export function StepEscopo() {
  const { form, updateField, fieldRefs } = useProjetoWizard();
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 mb-1">Escopo e Contexto</h2>
        <p className="text-sm text-muted-foreground">
          Descreva os objetivos e entregáveis do projeto.
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="projeto-descricao" className="flex items-center gap-1.5">
          Descrição
          <TooltipHelp 
            content="Descreva detalhadamente o projeto: objetivos, escopo, entregáveis esperados e contexto. Uma boa descrição facilita o acompanhamento e a prestação de contas."
          />
        </Label>
        <Textarea
          id="projeto-descricao"
          ref={(el) => { fieldRefs.current['descricao'] = el; }}
          value={form.descricao}
          onChange={(e) => updateField('descricao', e.target.value)}
          placeholder="Descreva os objetivos, escopo e entregáveis do projeto...&#10;&#10;Exemplo: Este projeto visa reformar o telhado da sede principal, incluindo troca de telhas, impermeabilização e instalação de calhas novas. O objetivo é eliminar infiltrações e garantir a conservação do imóvel."
          rows={8}
          className="resize-none"
        />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{form.descricao.length}/1000 caracteres</span>
          {form.descricao.length < 20 && form.descricao.length > 0 && (
            <span className="text-amber-600">Descrição muito curta</span>
          )}
        </div>
      </div>
    </div>
  );
}










