import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TooltipHelp } from '@/components/ui/tooltip-help';
import { useProjetoWizard } from '../ProjetoWizardProvider';
import { cn } from '@/lib/utils';

export function StepIdentificacao() {
  const { form, updateField, errors, fieldRefs, isEditMode, statusConfig } = useProjetoWizard();
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 mb-1">Identificação do Projeto</h2>
        <p className="text-sm text-muted-foreground">
          Defina o código único, nome e status do projeto.
        </p>
      </div>
      
      <div className="grid gap-6">
        {/* Código */}
        <div className="space-y-2">
          <Label htmlFor="projeto-codigo" className="flex items-center gap-1.5">
            Código *
            <TooltipHelp 
              content="Código único para identificar o projeto. Use formato que indique o tipo e ano. Exemplos: OBRA-2025, EVENTO-NATAL, CURSO-FORM01. Será usado em relatórios e controles."
            />
          </Label>
          <Input
            id="projeto-codigo"
            ref={(el) => { fieldRefs.current['codigo'] = el; }}
            value={form.codigo}
            onChange={(e) => updateField('codigo', e.target.value.toUpperCase())}
            placeholder="Ex: OBRA-2025, EVENTO-NATAL"
            disabled={isEditMode}
            className={cn(
              'font-mono uppercase max-w-xs',
              errors.codigo && 'border-destructive focus-visible:ring-destructive'
            )}
            maxLength={30}
            autoFocus={!isEditMode}
            aria-invalid={!!errors.codigo}
            aria-describedby={errors.codigo ? 'codigo-error' : undefined}
          />
          {errors.codigo && (
            <p id="codigo-error" className="text-xs text-destructive">{errors.codigo}</p>
          )}
          {isEditMode && (
            <p className="text-xs text-muted-foreground">
              O código não pode ser alterado após a criação.
            </p>
          )}
        </div>
        
        {/* Nome */}
        <div className="space-y-2">
          <Label htmlFor="projeto-nome" className="flex items-center gap-1.5">
            Nome *
            <TooltipHelp 
              content="Nome descritivo do projeto. Seja claro e específico para facilitar identificação. Exemplo: Reforma do Telhado - Sede Principal"
            />
          </Label>
          <Input
            id="projeto-nome"
            ref={(el) => { fieldRefs.current['nome'] = el; }}
            value={form.nome}
            onChange={(e) => updateField('nome', e.target.value)}
            placeholder="Ex: Reforma do Telhado - Sede Principal"
            className={cn(
              errors.nome && 'border-destructive focus-visible:ring-destructive'
            )}
            maxLength={150}
            aria-invalid={!!errors.nome}
            aria-describedby={errors.nome ? 'nome-error' : undefined}
          />
          {errors.nome && (
            <p id="nome-error" className="text-xs text-destructive">{errors.nome}</p>
          )}
        </div>
        
        {/* Status */}
        <div className="space-y-2">
          <Label htmlFor="projeto-status" className="flex items-center gap-1.5">
            Status
            <TooltipHelp 
              content={`Define a situação atual do projeto:
• Planejamento: Em fase de preparação
• Em Andamento: Execução iniciada
• Suspenso: Temporariamente paralisado
• Concluído: Finalizado com sucesso
• Cancelado: Encerrado sem conclusão`}
            />
          </Label>
          <Select
            value={form.status}
            onValueChange={(v) => updateField('status', v as any)}
          >
            <SelectTrigger 
              id="projeto-status"
              ref={(el) => { fieldRefs.current['status'] = el; }}
              className="max-w-xs"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(statusConfig).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  <div className="flex items-center gap-2">
                    <span className={cn("w-2 h-2 rounded-full", config.bg.replace('bg-', 'bg-').replace('100', '500'))} />
                    {config.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}






