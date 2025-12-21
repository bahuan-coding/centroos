import { usePlanoContasWizard } from '../PlanoContasWizardProvider';
import { Input } from '@/components/ui/input';
import { FormSection, FormField } from '@/components/ui/form-section';
import { RichPopover } from '@/components/ui/rich-popover';
import { cn } from '@/lib/utils';

export function StepIdentificacao() {
  const { form, updateField, errors, fieldRefs } = usePlanoContasWizard();
  
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2 mb-1">
          🔢 Identificação
        </h2>
        <p className="text-sm text-muted-foreground">
          Defina o código hierárquico e o nome descritivo da conta contábil.
        </p>
      </div>
      
      {/* Código */}
      <FormSection 
        title="Código da Conta" 
        description="Código numérico que define a posição na hierarquia do plano"
      >
        <FormField error={errors.codigo}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <label htmlFor="codigo" className="text-sm font-medium">
              Código<span className="text-destructive ml-0.5">*</span>
            </label>
            <RichPopover
              title="Como formar o código"
              items={[
                'Use o padrão hierárquico: X.Y.Z.NN (ex: 1.1.1.01)',
                'Primeiro dígito indica o grupo: 1=Ativo, 2=Passivo, 3=Patrimônio, 4=Receita, 5=Despesa',
                'Cada nível de ponto indica um subgrupo mais específico',
                'Os últimos dígitos (01, 02...) são as contas analíticas',
              ]}
              footer="ITG 2002 recomenda estrutura mínima de 4 níveis para entidades do terceiro setor."
            />
          </div>
          <Input
            id="codigo"
            ref={(el) => { fieldRefs.current['codigo'] = el; }}
            value={form.codigo}
            onChange={(e) => updateField('codigo', e.target.value)}
            placeholder="Ex: 4.1.1.01"
            className={cn(
              "font-mono text-lg tracking-wide",
              errors.codigo && 'border-destructive'
            )}
          />
        </FormField>
        
        {/* Exemplos visuais */}
        <div className="mt-4 p-4 rounded-lg bg-muted/50 border">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Exemplos de estrutura</p>
          <div className="space-y-2 text-sm font-mono">
            <div className="flex items-center gap-3">
              <span className="w-20 text-violet-600 font-semibold">4</span>
              <span className="text-muted-foreground">→ Receitas (grupo raiz)</span>
            </div>
            <div className="flex items-center gap-3 pl-4">
              <span className="w-16 text-violet-600 font-semibold">4.1</span>
              <span className="text-muted-foreground">→ Receitas Operacionais</span>
            </div>
            <div className="flex items-center gap-3 pl-8">
              <span className="w-12 text-violet-600 font-semibold">4.1.1</span>
              <span className="text-muted-foreground">→ Contribuições de Associados</span>
            </div>
            <div className="flex items-center gap-3 pl-12">
              <span className="w-16 text-emerald-600 font-semibold">4.1.1.01</span>
              <span className="text-emerald-700">→ Dízimo Mensal (analítica)</span>
            </div>
          </div>
        </div>
      </FormSection>
      
      {/* Nome */}
      <FormSection 
        title="Nome da Conta" 
        description="Descrição clara e padronizada que identifica a conta"
      >
        <FormField error={errors.nome}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <label htmlFor="nome" className="text-sm font-medium">
              Nome<span className="text-destructive ml-0.5">*</span>
            </label>
            <RichPopover
              title="Boas práticas de nomenclatura"
              items={[
                'Use nomes descritivos e padronizados',
                'Evite abreviações não convencionais',
                'Mantenha consistência com o plano existente',
                'Para contas analíticas, seja específico (ex: "Energia Elétrica - Sede")',
              ]}
              footer="Um bom nome facilita a busca e evita lançamentos na conta errada."
            />
          </div>
          <Input
            id="nome"
            ref={(el) => { fieldRefs.current['nome'] = el; }}
            value={form.nome}
            onChange={(e) => updateField('nome', e.target.value)}
            placeholder="Ex: Doações de Pessoas Físicas"
            className={cn(errors.nome && 'border-destructive')}
          />
        </FormField>
        
        {/* Contador */}
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>Mínimo 3 caracteres</span>
          <span className={cn(form.nome.length < 3 && form.nome.length > 0 && "text-amber-600")}>
            {form.nome.length} caracteres
          </span>
        </div>
      </FormSection>
      
      {/* Dica ITG 2002 */}
      <div className="p-4 rounded-lg bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200">
        <div className="flex items-start gap-3">
          <span className="text-xl">📚</span>
          <div>
            <p className="text-sm font-medium text-violet-800">ITG 2002 (R1)</p>
            <p className="text-xs text-violet-600 mt-1">
              O plano de contas deve ser adequado às necessidades da entidade e permitir a 
              elaboração das demonstrações contábeis exigidas. A estrutura mínima contempla 
              Ativo, Passivo, Patrimônio Social, Receitas e Despesas.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
