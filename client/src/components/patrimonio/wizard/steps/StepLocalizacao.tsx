import { usePatrimonioWizard } from '../PatrimonioWizardProvider';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormSection, FormRow, FormField } from '@/components/ui/form-section';
import { LabelWithHelp } from '@/components/ui/tooltip-help';
import { trpc } from '@/lib/trpc';
import { MapPin, User, Building2 } from 'lucide-react';

export function StepLocalizacao() {
  const { form, updateField, fieldRefs } = usePatrimonioWizard();
  
  // Fetch pessoas para o responsável
  const { data: pessoas } = trpc.pessoas.list.useQuery({ limit: 500 });
  
  const localizacoesSugeridas = [
    'Salão Principal',
    'Secretaria',
    'Garagem',
    'Almoxarifado',
    'Cozinha',
    'Biblioteca',
    'Sala de Reuniões',
    'Recepção',
  ];
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2 mb-1">
          📍 Localização e Responsável
        </h2>
        <p className="text-sm text-muted-foreground">
          Informe onde o bem está localizado e quem é responsável por ele.
        </p>
      </div>
      
      <FormSection title="Localização Física" icon="🏢">
        <FormField>
          <LabelWithHelp
            label="Localização"
            help="Local onde o bem se encontra. Padronize: 'Salão Principal', 'Secretaria', 'Garagem'. Facilita inventário físico."
          />
          <Input
            ref={(el) => { fieldRefs.current.localizacao = el; }}
            value={form.localizacao}
            onChange={(e) => updateField('localizacao', e.target.value)}
            placeholder="Ex: Salão Principal"
            list="localizacoes-sugeridas"
          />
          <datalist id="localizacoes-sugeridas">
            {localizacoesSugeridas.map(loc => (
              <option key={loc} value={loc} />
            ))}
          </datalist>
        </FormField>
        
        {/* Sugestões rápidas */}
        <div className="flex flex-wrap gap-2">
          {localizacoesSugeridas.slice(0, 5).map(loc => (
            <button
              key={loc}
              type="button"
              onClick={() => updateField('localizacao', loc)}
              className="px-3 py-1.5 text-xs rounded-full border hover:bg-muted transition-colors"
            >
              {loc}
            </button>
          ))}
        </div>
      </FormSection>
      
      <FormSection title="Responsável" icon="👤">
        <FormField>
          <LabelWithHelp
            label="Pessoa Responsável"
            help="Pessoa responsável pela guarda e conservação do bem. Importante para controle interno e auditoria."
          />
          <Select 
            value={form.responsavelId || 'none'} 
            onValueChange={(v) => updateField('responsavelId', v === 'none' ? '' : v)}
          >
            <SelectTrigger ref={(el) => { fieldRefs.current.responsavelId = el; }}>
              <SelectValue placeholder="Selecione um responsável..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhum responsável definido</SelectItem>
              {pessoas?.pessoas?.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{p.nome}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      </FormSection>
      
      <FormSection title="Vínculos" icon="🔗" badge={{ text: 'Opcional', variant: 'secondary' }}>
        <FormRow>
          <FormField>
            <LabelWithHelp
              label="Projeto"
              help="Vincule o bem a um projeto específico, se aplicável."
            />
            <Input
              value={form.projetoId}
              onChange={(e) => updateField('projetoId', e.target.value)}
              placeholder="Nome do projeto"
            />
          </FormField>
          
          <FormField>
            <LabelWithHelp
              label="Fundo"
              help="Vincule o bem a um fundo específico, se adquirido com recursos restritos."
            />
            <Input
              value={form.fundoId}
              onChange={(e) => updateField('fundoId', e.target.value)}
              placeholder="Nome do fundo"
            />
          </FormField>
        </FormRow>
      </FormSection>
      
      {/* Preview */}
      {(form.localizacao || form.responsavelId) && (
        <div className="rounded-xl border bg-gradient-to-br from-slate-50 to-zinc-50 p-4">
          <p className="text-xs font-medium text-slate-700 mb-3">Resumo da Localização</p>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-start gap-2">
              <MapPin className="h-5 w-5 text-slate-500 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Local</p>
                <p className="font-medium text-sm">{form.localizacao || 'Não informado'}</p>
              </div>
            </div>
            
            <div className="flex items-start gap-2">
              <User className="h-5 w-5 text-slate-500 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Responsável</p>
                <p className="font-medium text-sm">
                  {form.responsavelId 
                    ? pessoas?.pessoas?.find(p => p.id === form.responsavelId)?.nome || 'Selecionado'
                    : 'Não definido'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}










