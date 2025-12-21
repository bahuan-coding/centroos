import { useTituloWizard } from '../TituloWizardProvider';
import { Input } from '@/components/ui/input';
import { FormSection, FormRow, FormField } from '@/components/ui/form-section';
import { LabelWithHelp } from '@/components/ui/tooltip-help';
import { Calendar, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function StepDatas() {
  const { form, updateField, errors, fieldRefs } = useTituloWizard();
  
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };
  
  // Verificar se vencimento é antes da emissão
  const vencimentoAnterior = form.dataVencimento && form.dataEmissao && form.dataVencimento < form.dataEmissao;
  
  // Verificar se está vencido
  const hoje = new Date().toISOString().split('T')[0];
  const estaVencido = form.dataVencimento && form.dataVencimento < hoje;
  
  // Calcular dias até vencimento
  const diasAteVencimento = form.dataVencimento 
    ? Math.ceil((new Date(form.dataVencimento).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2 mb-1">
          📅 Datas
        </h2>
        <p className="text-sm text-muted-foreground">
          Configure as datas importantes para controle financeiro e contábil.
        </p>
      </div>
      
      {/* Data de Emissão */}
      <FormSection 
        title="Data de Emissão" 
        description="Quando o documento foi gerado ou a obrigação surgiu"
      >
        <FormField>
          <LabelWithHelp 
            label="Data de Emissão" 
            help="É a data em que o documento foi emitido ou a obrigação foi criada. Exemplo: data da nota fiscal, data do contrato, data da reunião onde foi aprovada a despesa."
            required 
          />
          <Input
            type="date"
            value={form.dataEmissao}
            onChange={(e) => updateField('dataEmissao', e.target.value)}
          />
        </FormField>
        
        {form.dataEmissao && (
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5" />
            {formatDate(form.dataEmissao)}
          </p>
        )}
      </FormSection>
      
      {/* Data de Competência */}
      <FormSection 
        title="Data de Competência" 
        description="Mês contábil a que pertence a receita ou despesa"
      >
        <FormField>
          <LabelWithHelp 
            label="Data de Competência" 
            help={`
              É o mês/ano a que pertence a receita ou despesa, independente de quando foi pago.
              
              Exemplo prático: Uma conta de luz CONSUMIDA em janeiro, mas RECEBIDA em fevereiro, 
              tem COMPETÊNCIA de janeiro (mês do consumo).
              
              Isso é fundamental para o regime de competência contábil.
            `}
            required 
          />
          <Input
            type="date"
            value={form.dataCompetencia}
            onChange={(e) => updateField('dataCompetencia', e.target.value)}
          />
        </FormField>
        
        {/* Card explicativo */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-3">
          <p className="text-sm font-medium text-blue-800 mb-2">
            📚 O que é regime de competência?
          </p>
          <p className="text-xs text-blue-700">
            No regime de competência, receitas e despesas são registradas no mês em que 
            <strong> ocorreram</strong>, não quando foram pagas. Isso dá uma visão mais 
            precisa da saúde financeira.
          </p>
          <div className="mt-3 p-2 bg-white rounded border border-blue-100 text-xs">
            <p className="font-medium text-blue-800">Exemplo:</p>
            <p className="text-blue-700 mt-1">
              Conta de energia <strong>consumida em Jan</strong>, <strong>fatura chegou em Fev</strong>, 
              <strong> paga em Mar</strong> → Competência: <strong>Janeiro</strong>
            </p>
          </div>
        </div>
      </FormSection>
      
      {/* Data de Vencimento */}
      <FormSection 
        title="Data de Vencimento" 
        description="Prazo limite para pagamento ou recebimento"
      >
        <FormField error={errors.dataVencimento}>
          <LabelWithHelp 
            label="Data de Vencimento" 
            help={`
              Prazo final para ${form.tipo === 'receber' ? 'receber o valor' : 'efetuar o pagamento'}.
              
              • Após esta data, o título é considerado VENCIDO
              • Títulos vencidos aparecem em destaque nos relatórios
              • Pode gerar multa/juros se houver atraso
            `}
            required 
          />
          <Input
            ref={(el) => { fieldRefs.current['dataVencimento'] = el; }}
            type="date"
            value={form.dataVencimento}
            onChange={(e) => updateField('dataVencimento', e.target.value)}
            className={cn(errors.dataVencimento && 'border-destructive')}
          />
        </FormField>
        
        {/* Status do vencimento */}
        {form.dataVencimento && (
          <div className={cn(
            "mt-3 p-3 rounded-lg border flex items-start gap-3",
            estaVencido 
              ? "bg-rose-50 border-rose-200"
              : diasAteVencimento !== null && diasAteVencimento <= 7
                ? "bg-amber-50 border-amber-200"
                : "bg-emerald-50 border-emerald-200"
          )}>
            {estaVencido ? (
              <>
                <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
                <div>
                  <p className="font-medium text-rose-800">Vencido há {Math.abs(diasAteVencimento!)} dias</p>
                  <p className="text-xs text-rose-700 mt-0.5">
                    Este título será criado como vencido. Verifique se a data está correta.
                  </p>
                </div>
              </>
            ) : diasAteVencimento !== null && diasAteVencimento <= 7 ? (
              <>
                <Calendar className="h-5 w-5 text-amber-600 shrink-0" />
                <div>
                  <p className="font-medium text-amber-800">
                    Vence em {diasAteVencimento === 0 ? 'hoje' : diasAteVencimento === 1 ? '1 dia' : `${diasAteVencimento} dias`}
                  </p>
                  <p className="text-xs text-amber-700 mt-0.5">{formatDate(form.dataVencimento)}</p>
                </div>
              </>
            ) : (
              <>
                <Calendar className="h-5 w-5 text-emerald-600 shrink-0" />
                <div>
                  <p className="font-medium text-emerald-800">
                    Vence em {diasAteVencimento} dias
                  </p>
                  <p className="text-xs text-emerald-700 mt-0.5">{formatDate(form.dataVencimento)}</p>
                </div>
              </>
            )}
          </div>
        )}
        
        {/* Aviso de inconsistência */}
        {vencimentoAnterior && (
          <div className="mt-3 p-3 rounded-lg bg-destructive/10 border border-destructive/30 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
            <div>
              <p className="font-medium text-destructive">Inconsistência detectada</p>
              <p className="text-xs text-destructive/80 mt-0.5">
                A data de vencimento não pode ser anterior à data de emissão. 
                Verifique as datas informadas.
              </p>
            </div>
          </div>
        )}
      </FormSection>
      
      {/* Resumo das datas */}
      {form.dataEmissao && form.dataCompetencia && form.dataVencimento && !vencimentoAnterior && (
        <div className="p-4 rounded-lg border bg-muted/30">
          <p className="text-sm font-medium mb-3">📋 Resumo das datas</p>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground">Emissão</p>
              <p className="font-medium text-sm">{new Date(form.dataEmissao + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Competência</p>
              <p className="font-medium text-sm">{new Date(form.dataCompetencia + 'T00:00:00').toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Vencimento</p>
              <p className={cn(
                "font-medium text-sm",
                estaVencido && "text-rose-600"
              )}>
                {new Date(form.dataVencimento + 'T00:00:00').toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

