import { usePatrimonioWizard } from '../PatrimonioWizardProvider';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormSection, FormRow, FormField } from '@/components/ui/form-section';
import { LabelWithHelp } from '@/components/ui/tooltip-help';
import { Building2, Car, Monitor, Armchair, Cpu, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

const categoriaIcons: Record<string, typeof Building2> = {
  imovel: Building2,
  veiculo: Car,
  equipamento: Monitor,
  mobiliario: Armchair,
  informatica: Cpu,
  outro: Package,
};

export function StepIdentificacao() {
  const { form, updateField, errors, fieldRefs, categoriaConfig } = usePatrimonioWizard();
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2 mb-1">
          🏷️ Identificação do Bem
        </h2>
        <p className="text-sm text-muted-foreground">
          Informe o código, categoria e descrição do bem patrimonial.
        </p>
      </div>
      
      <FormSection title="Dados Básicos" icon="📋">
        <FormRow>
          <FormField error={errors.codigo}>
            <LabelWithHelp
              label="Código/Plaqueta"
              help="Identificação única do bem. Padrão sugerido: prefixo da categoria + número sequencial (ex: VEI-001, MOB-015). Não pode ser alterado após cadastro."
              required
            />
            <Input
              ref={(el) => { fieldRefs.current.codigo = el; }}
              value={form.codigo}
              onChange={(e) => updateField('codigo', e.target.value.toUpperCase())}
              placeholder="VEI-001"
              className={cn(errors.codigo && 'border-destructive')}
            />
          </FormField>
          
          <FormField>
            <LabelWithHelp
              label="Categoria"
              help="Define agrupamento em relatórios patrimoniais, taxa de depreciação sugerida e conta contábil padrão."
              required
            />
            <Select value={form.categoria} onValueChange={(v) => updateField('categoria', v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(categoriaConfig).map(([key, cfg]) => {
                  const Icon = categoriaIcons[key] || Package;
                  return (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <span>{cfg.label}</span>
                        <span className="text-xs text-muted-foreground">({cfg.vidaUtilPadrao} meses)</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </FormField>
        </FormRow>
        
        <FormField error={errors.descricao}>
          <LabelWithHelp
            label="Descrição"
            help="Seja detalhista: inclua marca, modelo, número de série se houver. Facilita inventário e auditoria."
            required
          />
          <Textarea
            ref={(el) => { fieldRefs.current.descricao = el; }}
            value={form.descricao}
            onChange={(e) => updateField('descricao', e.target.value)}
            placeholder="Ex: Van Mercedes Sprinter 2020, 15 lugares, placa ABC-1234, chassi XYZ..."
            rows={3}
            className={cn(errors.descricao && 'border-destructive')}
          />
          <p className="text-xs text-muted-foreground mt-1">
            {form.descricao.length} caracteres
          </p>
        </FormField>
      </FormSection>
      
      {/* Preview card */}
      {form.codigo && (
        <div className="rounded-xl border bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
          <p className="text-xs font-medium text-blue-700 mb-2">Preview do Bem</p>
          <div className="flex items-center gap-3">
            {(() => {
              const Icon = categoriaIcons[form.categoria] || Package;
              return (
                <div className="p-2 rounded-lg bg-blue-500">
                  <Icon className="h-5 w-5 text-white" />
                </div>
              );
            })()}
            <div>
              <span className="font-mono text-sm text-muted-foreground">{form.codigo}</span>
              <p className="font-medium text-sm line-clamp-1">
                {form.descricao || 'Sem descrição'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

