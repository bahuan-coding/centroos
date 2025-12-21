import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TooltipHelp } from '@/components/ui/tooltip-help';
import { useCentroWizard } from '../CentroWizardProvider';
import { trpc } from '@/lib/trpc';

export function StepDetalhes() {
  const { form, updateField, fieldRefs } = useCentroWizard();
  const { data: pessoasData } = trpc.pessoas.list.useQuery();
  const pessoas = pessoasData?.pessoas ?? [];
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 mb-1">Detalhes e Governança</h2>
        <p className="text-sm text-muted-foreground">
          Informações complementares para gestão e auditoria.
        </p>
      </div>
      
      <div className="grid gap-6">
        {/* Descrição */}
        <div className="space-y-2">
          <Label htmlFor="centro-descricao" className="flex items-center gap-1.5">
            Descrição
            <TooltipHelp 
              content="Descreva o propósito deste centro de custo. O que ele agrupa? Quais atividades ou departamentos fazem parte? Útil para orientar colaboradores na classificação de despesas."
            />
          </Label>
          <Textarea
            id="centro-descricao"
            ref={(el) => { fieldRefs.current['descricao'] = el; }}
            value={form.descricao}
            onChange={(e) => updateField('descricao', e.target.value)}
            placeholder="Descreva as atividades e propósito deste centro de custo..."
            rows={4}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground">
            {form.descricao.length}/500 caracteres
          </p>
        </div>
        
        {/* Responsável */}
        <div className="space-y-2">
          <Label htmlFor="centro-responsavel" className="flex items-center gap-1.5">
            Responsável
            <TooltipHelp 
              content="Pessoa responsável pela gestão deste centro de custo. Importante para governança, aprovações e prestação de contas. Este responsável pode ser notificado sobre despesas e orçamento."
            />
          </Label>
          <Select
            value={form.responsavelId || 'none'}
            onValueChange={(v) => updateField('responsavelId', v === 'none' ? '' : v)}
          >
            <SelectTrigger 
              id="centro-responsavel"
              ref={(el) => { fieldRefs.current['responsavelId'] = el; }}
              className="max-w-md"
            >
              <SelectValue placeholder="Selecionar responsável (opcional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">
                <span className="text-muted-foreground">Nenhum responsável</span>
              </SelectItem>
              {pessoas.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Definir um responsável facilita a governança e auditoria.
          </p>
        </div>
      </div>
    </div>
  );
}

