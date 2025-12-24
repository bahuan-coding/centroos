import { Check, AlertTriangle, User, FileText, Calculator, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useNfseWizard } from '../NfseWizardProvider';

const TRIBUTACAO_LABELS: Record<string, string> = {
  'T': 'Tributado em SP',
  'F': 'Fora de SP',
  'A': 'Isento',
  'B': 'Imune',
  'M': 'Suspenso',
  'N': 'Não Incidente',
  'X': 'Exportação',
};

export function StepRevisao() {
  const { form, warnings, submitResult } = useNfseWizard();
  
  const cpfCnpj = form.tomador.cpfCnpj.replace(/\D/g, '');
  const isCNPJ = cpfCnpj.length === 14;
  const valorServicos = parseFloat(form.valorServicos) || 0;
  const valorDeducoes = parseFloat(form.valorDeducoes) || 0;
  const baseCalculo = valorServicos - valorDeducoes;
  const aliquota = parseFloat(form.aliquota) || 0;
  const valorISS = baseCalculo * aliquota;
  
  const formatCpfCnpj = (doc: string) => {
    if (doc.length === 11) {
      return doc.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return doc.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  };
  
  // Show success result
  if (submitResult?.sucesso) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-6">
          <CheckCircle className="h-10 w-10 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">NFS-e Emitida com Sucesso!</h2>
        <p className="text-muted-foreground mb-6">A nota fiscal foi processada pela prefeitura</p>
        
        <div className="bg-slate-50 rounded-xl p-6 w-full max-w-md">
          <div className="grid grid-cols-2 gap-4 text-left">
            <div>
              <p className="text-xs text-muted-foreground">Número NFS-e</p>
              <p className="text-2xl font-bold text-indigo-600">{submitResult.numeroNFe}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Código de Verificação</p>
              <p className="text-lg font-mono font-bold">{submitResult.codigoVerificacao}</p>
            </div>
          </div>
        </div>
        
        <p className="text-sm text-muted-foreground mt-6">
          Guarde o código de verificação para consulta posterior
        </p>
      </div>
    );
  }
  
  // Show error result
  if (submitResult && !submitResult.sucesso) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mb-6">
          <XCircle className="h-10 w-10 text-red-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Erro na Emissão</h2>
        <p className="text-muted-foreground mb-6">A prefeitura retornou um erro</p>
        
        <div className="bg-red-50 rounded-xl p-4 w-full max-w-md border border-red-200">
          <p className="text-sm text-red-800">{submitResult.mensagem}</p>
        </div>
        
        <p className="text-sm text-muted-foreground mt-6">
          Corrija os dados e tente novamente
        </p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="text-center pb-4 border-b">
        <h2 className="text-xl font-semibold text-slate-900">Revisão Final</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Confira todos os dados antes de emitir a NFS-e
        </p>
      </div>
      
      {warnings.length > 0 && (
        <div className="space-y-2">
          {warnings.map((w, i) => (
            <div
              key={i}
              className={cn(
                'flex items-start gap-2 p-3 rounded-lg',
                w.tipo === 'bloqueio' && 'bg-red-50 border border-red-200',
                w.tipo === 'warning' && 'bg-amber-50 border border-amber-200',
                w.tipo === 'info' && 'bg-blue-50 border border-blue-200'
              )}
            >
              <AlertTriangle className={cn(
                'h-4 w-4 shrink-0 mt-0.5',
                w.tipo === 'bloqueio' && 'text-red-600',
                w.tipo === 'warning' && 'text-amber-600',
                w.tipo === 'info' && 'text-blue-600'
              )} />
              <p className={cn(
                'text-sm',
                w.tipo === 'bloqueio' && 'text-red-800',
                w.tipo === 'warning' && 'text-amber-800',
                w.tipo === 'info' && 'text-blue-800'
              )}>
                {w.mensagem}
              </p>
            </div>
          ))}
        </div>
      )}
      
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4" />
              Tomador
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{isCNPJ ? 'CNPJ' : 'CPF'}</span>
              <span className="font-mono">{formatCpfCnpj(cpfCnpj)}</span>
            </div>
            {form.tomador.razaoSocial && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Nome/Razão Social</span>
                <span className="text-right max-w-[200px] truncate">{form.tomador.razaoSocial}</span>
              </div>
            )}
            {form.tomador.email && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">E-mail</span>
                <span>{form.tomador.email}</span>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" />
              RPS
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Série/Número</span>
              <span className="font-mono">{form.serieRPS}/{form.numeroRPS}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Data de Emissão</span>
              <span>{new Date(form.dataEmissao + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Código Serviço</span>
              <span className="font-mono">{form.codigoServico}</span>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calculator className="h-4 w-4" />
            Valores e Tributação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-muted-foreground">Valor Serviços</p>
              <p className="text-lg font-bold">
                {valorServicos.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            </div>
            <div className="text-center p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-muted-foreground">Deduções</p>
              <p className="text-lg font-bold">
                {valorDeducoes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            </div>
            <div className="text-center p-3 bg-indigo-50 rounded-lg">
              <p className="text-xs text-indigo-600">Base de Cálculo</p>
              <p className="text-lg font-bold text-indigo-700">
                {baseCalculo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            </div>
            <div className="text-center p-3 bg-emerald-50 rounded-lg">
              <p className="text-xs text-emerald-600">Valor ISS</p>
              <p className="text-lg font-bold text-emerald-700">
                {valorISS.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">
              {TRIBUTACAO_LABELS[form.tributacao]} ({form.tributacao})
            </Badge>
            <Badge variant="outline">
              Alíquota: {(aliquota * 100).toFixed(2)}%
            </Badge>
            {form.issRetido && (
              <Badge variant="secondary">ISS Retido</Badge>
            )}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Discriminação dos Serviços</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600 whitespace-pre-wrap bg-slate-50 p-3 rounded-lg">
            {form.discriminacao}
          </p>
        </CardContent>
      </Card>
      
      <div className="flex items-center gap-2 p-4 rounded-lg bg-emerald-50 border border-emerald-200">
        <Check className="h-5 w-5 text-emerald-600" />
        <p className="text-sm text-emerald-800">
          Todos os dados foram preenchidos. Clique em "Emitir NFS-e" para finalizar.
        </p>
      </div>
    </div>
  );
}

