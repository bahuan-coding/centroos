import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TooltipHelp } from '@/components/ui/tooltip-help';
import { Badge } from '@/components/ui/badge';
import { useFundoWizard } from '../FundoWizardProvider';
import { cn } from '@/lib/utils';
import { Lock, Info } from 'lucide-react';

export function StepIdentificacao() {
  const { form, updateField, errors, fieldRefs, isEditMode, tipoLocked, tipoConfig } = useFundoWizard();
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 mb-1">Identificação do Fundo</h2>
        <p className="text-sm text-muted-foreground">
          Defina o código único, nome e tipo do fundo.
        </p>
      </div>
      
      <div className="grid gap-6">
        {/* Código */}
        <div className="space-y-2">
          <Label htmlFor="fundo-codigo" className="flex items-center gap-1.5">
            Código *
            <TooltipHelp 
              content="Código único para identificar o fundo. Use abreviações claras. Exemplos: OBRA (Obras e Reformas), RESERVA (Reserva de Contingência), EDUC (Educação). Será usado em relatórios."
            />
          </Label>
          <Input
            id="fundo-codigo"
            ref={(el) => { fieldRefs.current['codigo'] = el; }}
            value={form.codigo}
            onChange={(e) => updateField('codigo', e.target.value.toUpperCase())}
            placeholder="Ex: OBRA, RESERVA, EDUC"
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
          <Label htmlFor="fundo-nome" className="flex items-center gap-1.5">
            Nome *
            <TooltipHelp 
              content="Nome descritivo do fundo. Seja claro sobre a finalidade. Exemplo: Fundo de Obras e Reformas, Fundo de Reserva de Contingência."
            />
          </Label>
          <Input
            id="fundo-nome"
            ref={(el) => { fieldRefs.current['nome'] = el; }}
            value={form.nome}
            onChange={(e) => updateField('nome', e.target.value)}
            placeholder="Ex: Fundo de Obras e Reformas"
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
        
        {/* Tipo */}
        <div className="space-y-2">
          <Label htmlFor="fundo-tipo" className="flex items-center gap-1.5">
            Tipo *
            <TooltipHelp 
              content={`Conforme NBC TG 26 (Patrimônio Líquido):
• Livre: Sem restrição de uso. A organização decide.
• Designado: Uso definido pela diretoria. Pode ser redesignado com ata.
• Restrito: Uso definido pelo doador. Não pode ser alterado.`}
            />
          </Label>
          
          {tipoLocked ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-3 rounded-lg border bg-zinc-50">
                <Lock className="h-4 w-4 text-zinc-500" />
                <Badge className={cn(tipoConfig[form.tipo].bg, tipoConfig[form.tipo].color, 'border-0')}>
                  {tipoConfig[form.tipo].label}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {tipoConfig[form.tipo].description}
                </span>
              </div>
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                <Info className="h-4 w-4 text-amber-600 mt-0.5" />
                <p className="text-sm text-amber-800">
                  O tipo de fundo restrito foi definido pelo doador e não pode ser alterado. 
                  Para modificar, é necessário autorização formal do doador.
                </p>
              </div>
            </div>
          ) : (
            <Select
              value={form.tipo}
              onValueChange={(v) => updateField('tipo', v as any)}
            >
              <SelectTrigger 
                id="fundo-tipo"
                ref={(el) => { fieldRefs.current['tipo'] = el; }}
                className="max-w-md"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(tipoConfig).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <span className={cn("w-2 h-2 rounded-full", config.bg.replace('100', '500'))} />
                      <span className="font-medium">{config.label}</span>
                      <span className="text-xs text-muted-foreground">— {config.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>
    </div>
  );
}












