import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TooltipHelp } from '@/components/ui/tooltip-help';
import { useCentroWizard } from '../CentroWizardProvider';
import { cn } from '@/lib/utils';

export function StepIdentificacao() {
  const { form, updateField, errors, fieldRefs, isEditMode } = useCentroWizard();
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 mb-1">Identificação do Centro</h2>
        <p className="text-sm text-muted-foreground">
          Defina o código único e nome do centro de custo.
        </p>
      </div>
      
      <div className="grid gap-6">
        {/* Código */}
        <div className="space-y-2">
          <Label htmlFor="centro-codigo" className="flex items-center gap-1.5">
            Código *
            <TooltipHelp 
              content="Código único para identificar o centro. Deve ser curto e memorável. Exemplos: ADM (Administração), PAST (Pastoral), SOC (Assistência Social), MANUT (Manutenção). Usado em relatórios e alocação de despesas."
            />
          </Label>
          <Input
            id="centro-codigo"
            ref={(el) => { fieldRefs.current['codigo'] = el; }}
            value={form.codigo}
            onChange={(e) => updateField('codigo', e.target.value.toUpperCase())}
            placeholder="Ex: ADM, PAST, SOC"
            disabled={isEditMode}
            className={cn(
              'font-mono uppercase max-w-xs',
              errors.codigo && 'border-destructive focus-visible:ring-destructive'
            )}
            maxLength={20}
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
          <Label htmlFor="centro-nome" className="flex items-center gap-1.5">
            Nome *
            <TooltipHelp 
              content="Nome descritivo do centro de custo. Use nomenclatura padronizada para facilitar identificação. Exemplos: Administração, Pastoral, Assistência Social, Manutenção Predial."
            />
          </Label>
          <Input
            id="centro-nome"
            ref={(el) => { fieldRefs.current['nome'] = el; }}
            value={form.nome}
            onChange={(e) => updateField('nome', e.target.value)}
            placeholder="Ex: Administração, Pastoral, Assistência Social"
            className={cn(
              errors.nome && 'border-destructive focus-visible:ring-destructive'
            )}
            maxLength={100}
            aria-invalid={!!errors.nome}
            aria-describedby={errors.nome ? 'nome-error' : undefined}
          />
          {errors.nome && (
            <p id="nome-error" className="text-xs text-destructive">{errors.nome}</p>
          )}
        </div>
      </div>
    </div>
  );
}









