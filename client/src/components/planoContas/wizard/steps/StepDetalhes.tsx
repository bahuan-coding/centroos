import { usePlanoContasWizard } from '../PlanoContasWizardProvider';
import { Textarea } from '@/components/ui/textarea';
import { FormSection, FormField } from '@/components/ui/form-section';
import { RichPopover } from '@/components/ui/rich-popover';

const exemplosObservacoes = [
  {
    tipo: 'analitica',
    exemplo: 'Utilizar para registro de doações em dinheiro de pessoas físicas não identificadas. Para doações identificadas, vincular à pessoa no lançamento.',
  },
  {
    tipo: 'sintetica',
    exemplo: 'Agrupa todas as receitas provenientes de contribuições regulares dos associados, incluindo dízimos, mensalidades e anuidades.',
  },
];

export function StepDetalhes() {
  const { form, updateField, fieldRefs } = usePlanoContasWizard();
  
  const exemploAtual = exemplosObservacoes.find(e => e.tipo === form.classificacao);
  
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2 mb-1">
          📝 Detalhes e Uso
        </h2>
        <p className="text-sm text-muted-foreground">
          Adicione observações para padronizar o uso da conta pelo time contábil.
        </p>
      </div>
      
      {/* Observações */}
      <FormSection 
        title="Observações" 
        description="Instruções de uso, critérios de lançamento ou informações complementares"
      >
        <FormField>
          <div className="flex items-center gap-1.5 mb-1.5">
            <label htmlFor="descricao" className="text-sm font-medium">Observações</label>
            <RichPopover
              title="Como usar o campo de observações"
              items={[
                'Descreva QUANDO usar esta conta (critérios)',
                'Indique documentos de suporte esperados',
                'Mencione contas relacionadas se aplicável',
                'Para sintéticas, explique o agrupamento',
              ]}
              footer="Boas observações reduzem erros de classificação e facilitam auditorias."
            />
          </div>
          <Textarea
            id="descricao"
            ref={(el) => { fieldRefs.current['descricao'] = el; }}
            value={form.descricao}
            onChange={(e) => updateField('descricao', e.target.value)}
            placeholder="Descreva quando e como usar esta conta..."
            rows={4}
            className="resize-none"
          />
        </FormField>
        
        {/* Contador */}
        <div className="flex justify-end text-xs text-muted-foreground mt-1">
          {form.descricao.length} caracteres
        </div>
      </FormSection>
      
      {/* Exemplo */}
      {exemploAtual && (
        <div className="p-4 rounded-lg bg-muted/50 border">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Exemplo para conta {form.classificacao}
          </p>
          <p className="text-sm text-muted-foreground italic">
            "{exemploAtual.exemplo}"
          </p>
        </div>
      )}
      
      {/* Dicas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200">
          <p className="text-sm font-medium text-emerald-800 mb-1">✓ Boas práticas</p>
          <ul className="text-xs text-emerald-700 space-y-1">
            <li>• Seja claro e objetivo</li>
            <li>• Use termos padronizados</li>
            <li>• Inclua exemplos quando útil</li>
          </ul>
        </div>
        <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
          <p className="text-sm font-medium text-amber-800 mb-1">⚠ Evite</p>
          <ul className="text-xs text-amber-700 space-y-1">
            <li>• Informações redundantes com o nome</li>
            <li>• Textos muito longos</li>
            <li>• Referências a pessoas específicas</li>
          </ul>
        </div>
      </div>
      
      {/* Info etapa opcional */}
      <div className="p-4 rounded-lg bg-zinc-50 border border-zinc-200 text-center">
        <p className="text-sm text-muted-foreground">
          Esta etapa é <strong>opcional</strong>. Você pode prosseguir para a revisão mesmo sem preencher observações.
        </p>
      </div>
    </div>
  );
}
