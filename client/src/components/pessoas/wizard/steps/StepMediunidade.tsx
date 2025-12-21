import { Shield, Info, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LabelWithHelp } from '@/components/ui/tooltip-help';
import { useWizard } from '../WizardProvider';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';

const MEDIUNIDADE_TIPOS = [
  { value: 'passista', label: '🙌 Passista', desc: 'Aplicador de passes' },
  { value: 'psicofonia', label: '🗣️ Psicofonia', desc: 'Comunicação verbal' },
  { value: 'psicografia', label: '✍️ Psicografia', desc: 'Escrita mediúnica' },
  { value: 'videncia', label: '👁️ Vidência', desc: 'Visão de espíritos' },
  { value: 'audiencia', label: '👂 Audiência', desc: 'Audição de espíritos' },
  { value: 'intuicao', label: '💡 Intuição', desc: 'Intuição mediúnica' },
  { value: 'cura', label: '💚 Cura', desc: 'Mediunidade de cura' },
  { value: 'desdobramento', label: '🌀 Desdobramento', desc: 'Desdobramento espiritual' },
  { value: 'incorporacao', label: '✨ Incorporação', desc: 'Incorporação' },
];

export function StepMediunidade() {
  const { form, updateField, setForm, fieldRefs } = useWizard();
  const { data: gruposEstudo, isLoading: isLoadingGrupos } = trpc.gruposEstudo.list.useQuery();
  
  const toggleMediunidade = (value: string) => {
    setForm(f => ({
      ...f,
      tiposMediunidade: f.tiposMediunidade.includes(value)
        ? f.tiposMediunidade.filter(t => t !== value)
        : [...f.tiposMediunidade, value],
    }));
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2 mb-1">
          ✨ Mediunidade
        </h2>
        <p className="text-sm text-muted-foreground">
          Informações sobre o desenvolvimento mediúnico (opcional).
        </p>
      </div>
      
      {/* LGPD Notice */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div className="flex gap-3">
          <Shield className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-sm text-blue-800">Dados Sensíveis - LGPD</p>
            <p className="text-xs text-blue-700 mt-1">
              Estas informações são consideradas dados sensíveis conforme a Lei Geral de Proteção de Dados (LGPD). 
              São tratadas com sigilo e acessíveis apenas por dirigentes autorizados.
            </p>
          </div>
        </div>
      </div>
      
      {/* Data de Início */}
      <div className="space-y-2">
        <LabelWithHelp 
          htmlFor="dataInicioDesenvolvimento" 
          label="Início do Desenvolvimento" 
          help="Data que iniciou o desenvolvimento mediúnico na casa." 
        />
        <Input
          id="dataInicioDesenvolvimento"
          type="date"
          value={form.dataInicioDesenvolvimento}
          onChange={e => updateField('dataInicioDesenvolvimento', e.target.value)}
          className="h-11 w-48"
        />
      </div>
      
      {/* Tipos de Mediunidade */}
      <div className="space-y-3">
        <LabelWithHelp 
          label="Tipos de Mediunidade" 
          help="Selecione os tipos de mediunidade identificados." 
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {MEDIUNIDADE_TIPOS.map(tipo => (
            <label
              key={tipo.value}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                form.tiposMediunidade.includes(tipo.value)
                  ? "bg-violet-100 border-violet-300 text-violet-800"
                  : "hover:bg-muted/50 border-muted"
              )}
            >
              <Checkbox
                checked={form.tiposMediunidade.includes(tipo.value)}
                onCheckedChange={() => toggleMediunidade(tipo.value)}
              />
              <div>
                <div className="text-sm font-medium">{tipo.label}</div>
                <div className="text-[10px] text-muted-foreground">{tipo.desc}</div>
              </div>
            </label>
          ))}
        </div>
        {form.tiposMediunidade.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {form.tiposMediunidade.length} tipo(s) selecionado(s)
          </p>
        )}
      </div>
      
      {/* Grupo de Estudo */}
      <div className="space-y-2">
        <LabelWithHelp 
          label="Grupo de Estudo" 
          help="Grupo de estudo doutrinário que a pessoa participa." 
        />
        <Select 
          value={form.grupoEstudoId || 'none'} 
          onValueChange={v => updateField('grupoEstudoId', v === 'none' ? '' : v)}
          disabled={isLoadingGrupos}
        >
          <SelectTrigger className="h-11">
            {isLoadingGrupos ? (
              <span className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando grupos...
              </span>
            ) : (
              <SelectValue placeholder="Selecione um grupo..." />
            )}
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Nenhum grupo</SelectItem>
            {gruposEstudo?.map(g => (
              <SelectItem key={g.id} value={g.id}>
                📖 {g.nome} {g.obraEstudo ? `(${g.obraEstudo})` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {/* Observações */}
      <div className="space-y-2">
        <LabelWithHelp 
          htmlFor="observacoesMediunidade" 
          label="Observações sobre Mediunidade" 
          help="Anotações do dirigente sobre o desenvolvimento mediúnico. Acesso restrito." 
        />
        <Textarea
          id="observacoesMediunidade"
          ref={el => { fieldRefs.current['observacoesMediunidade'] = el; }}
          value={form.observacoesMediunidade}
          onChange={e => updateField('observacoesMediunidade', e.target.value)}
          placeholder="Observações reservadas sobre o desenvolvimento..."
          rows={3}
          className="resize-none"
        />
      </div>
      
      {/* Info */}
      <div className="flex gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
        <Info className="h-4 w-4 shrink-0 mt-0.5" />
        <p>
          Você pode pular esta etapa e adicionar estas informações posteriormente na ficha da pessoa.
        </p>
      </div>
    </div>
  );
}

