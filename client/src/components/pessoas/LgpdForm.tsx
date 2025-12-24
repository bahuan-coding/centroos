import { useState } from 'react';
import { Shield, Plus, Check, X, AlertTriangle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

interface LgpdFormProps {
  pessoaId: string;
  onSuccess?: () => void;
}

const TRATAMENTO_LABELS: Record<string, { label: string; desc: string; icon: string }> = {
  marketing: { label: 'Marketing e Divulgação', desc: 'Envio de materiais promocionais', icon: '📢' },
  comunicacao: { label: 'Comunicação Institucional', desc: 'Avisos, convites, informativos', icon: '📧' },
  compartilhamento: { label: 'Compartilhamento com Terceiros', desc: 'Envio de dados para outras entidades', icon: '🔗' },
  dados_sensiveis: { label: 'Dados Religiosos', desc: 'Tratamento de informações de crença', icon: '🙏' },
};

const BASE_LEGAL_LABELS: Record<string, { label: string; desc: string }> = {
  consentimento: { label: 'Consentimento Explícito', desc: 'Pessoa autorizou expressamente' },
  legitimo_interesse: { label: 'Legítimo Interesse', desc: 'Necessário para atividade da entidade' },
  obrigacao_legal: { label: 'Obrigação Legal', desc: 'Exigido por lei (ex: fiscal)' },
  execucao_contrato: { label: 'Execução de Contrato', desc: 'Necessário para cumprir acordo' },
};

export function LgpdForm({ pessoaId, onSuccess }: LgpdFormProps) {
  const utils = trpc.useUtils();
  
  const { data: consentimentos, isLoading } = trpc.pessoas.listConsentimentos.useQuery(pessoaId);
  
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    tipoTratamento: 'comunicacao' as 'marketing' | 'comunicacao' | 'compartilhamento' | 'dados_sensiveis',
    baseLegal: 'consentimento' as 'consentimento' | 'legitimo_interesse' | 'obrigacao_legal' | 'execucao_contrato',
    consentido: true,
    evidencia: '',
  });

  const addMutation = trpc.pessoas.addConsentimento.useMutation({
    onSuccess: () => {
      toast.success('Consentimento registrado!');
      utils.pessoas.listConsentimentos.invalidate(pessoaId);
      utils.pessoas.getFullById.invalidate(pessoaId);
      setShowAdd(false);
      setForm({ tipoTratamento: 'comunicacao', baseLegal: 'consentimento', consentido: true, evidencia: '' });
      onSuccess?.();
    },
    onError: (err) => toast.error(err.message),
  });

  const revogarMutation = trpc.pessoas.revogarConsentimento.useMutation({
    onSuccess: () => {
      toast.success('Consentimento revogado!');
      utils.pessoas.listConsentimentos.invalidate(pessoaId);
      utils.pessoas.getFullById.invalidate(pessoaId);
      onSuccess?.();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = () => {
    if (form.baseLegal === 'consentimento' && !form.evidencia.trim()) {
      toast.error('Para base legal "Consentimento", é obrigatório registrar a evidência');
      return;
    }
    addMutation.mutate({ pessoaId, ...form, evidencia: form.evidencia || null });
  };

  const handleRevogar = (id: string) => {
    if (confirm('Revogar este consentimento? O registro será mantido para auditoria.')) {
      revogarMutation.mutate(id);
    }
  };

  if (isLoading) {
    return <div className="p-4 text-center text-muted-foreground">Carregando...</div>;
  }

  const ativosTratamentos = new Set(consentimentos?.filter(c => c.consentido).map(c => c.tipoTratamento) || []);

  return (
    <div className="space-y-4">
      {/* Header com informações */}
      <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
        <Info className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
        <div className="text-sm">
          <p className="font-medium text-blue-900 dark:text-blue-100">Lei Geral de Proteção de Dados (LGPD)</p>
          <p className="text-blue-700 dark:text-blue-300 mt-1">
            Registre aqui os consentimentos obtidos para tratamento de dados pessoais. 
            Instituições religiosas tratam dados sensíveis e devem manter evidências de consentimento.
          </p>
        </div>
      </div>

      {/* Status rápido */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(TRATAMENTO_LABELS).map(([key, { label, icon }]) => (
          <Badge
            key={key}
            variant={ativosTratamentos.has(key) ? 'default' : 'secondary'}
            className="flex items-center gap-1.5"
          >
            <span>{icon}</span>
            <span>{label.split(' ')[0]}</span>
            {ativosTratamentos.has(key) ? <Check className="h-3 w-3" /> : <X className="h-3 w-3 opacity-50" />}
          </Badge>
        ))}
      </div>

      {/* Lista de consentimentos */}
      <div className="space-y-3">
        {(!consentimentos || consentimentos.length === 0) && !showAdd && (
          <div className="text-center py-8 text-muted-foreground">
            <Shield className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhum consentimento registrado</p>
            <p className="text-xs mt-1">Clique em "Registrar Consentimento" para adicionar</p>
          </div>
        )}

        {consentimentos?.map((c) => {
          const tratamento = TRATAMENTO_LABELS[c.tipoTratamento];
          const baseLegal = BASE_LEGAL_LABELS[c.baseLegal];
          
          return (
            <Card key={c.id} className={`p-4 ${!c.consentido ? 'opacity-60 bg-muted/50' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{tratamento?.icon}</span>
                    <span className="font-medium">{tratamento?.label}</span>
                    {c.consentido ? (
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                        <Check className="h-3 w-3 mr-1" />Autorizado
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <X className="h-3 w-3 mr-1" />Revogado
                      </Badge>
                    )}
                  </div>
                  
                  <div className="text-xs text-muted-foreground space-y-1 mt-2">
                    <p><strong>Base Legal:</strong> {baseLegal?.label}</p>
                    <p><strong>Data:</strong> {new Date(c.dataConsentimento).toLocaleDateString('pt-BR')}</p>
                    {c.dataRevogacao && (
                      <p className="text-destructive"><strong>Revogado em:</strong> {new Date(c.dataRevogacao).toLocaleDateString('pt-BR')}</p>
                    )}
                    {c.evidencia && <p><strong>Evidência:</strong> {c.evidencia}</p>}
                  </div>
                </div>
                
                {c.consentido && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleRevogar(c.id)}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Revogar
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Formulário de adição */}
      {showAdd ? (
        <Card className="p-4 border-primary/50">
          <h4 className="font-medium mb-4 flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Registrar Consentimento
          </h4>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Finalidade do Tratamento</label>
              <Select value={form.tipoTratamento} onValueChange={(v: typeof form.tipoTratamento) => setForm(f => ({ ...f, tipoTratamento: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TRATAMENTO_LABELS).map(([k, { label, desc, icon }]) => (
                    <SelectItem key={k} value={k}>
                      <span className="flex items-center gap-2">
                        <span>{icon}</span>
                        <span>{label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {TRATAMENTO_LABELS[form.tipoTratamento]?.desc}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Base Legal</label>
              <Select value={form.baseLegal} onValueChange={(v: typeof form.baseLegal) => setForm(f => ({ ...f, baseLegal: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(BASE_LEGAL_LABELS).map(([k, { label, desc }]) => (
                    <SelectItem key={k} value={k}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {BASE_LEGAL_LABELS[form.baseLegal]?.desc}
              </p>
            </div>

            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={form.consentido} onCheckedChange={(c) => setForm(f => ({ ...f, consentido: !!c }))} />
                <span className="text-sm">Pessoa autorizou o tratamento</span>
              </label>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Evidência {form.baseLegal === 'consentimento' && <span className="text-destructive">*</span>}
              </label>
              <Textarea
                value={form.evidencia}
                onChange={(e) => setForm(f => ({ ...f, evidencia: e.target.value }))}
                placeholder="Ex: Termo de consentimento assinado em 01/01/2024, formulário de cadastro online"
                rows={2}
              />
              {form.baseLegal === 'consentimento' && (
                <div className="flex items-center gap-1.5 text-xs text-amber-600 mt-1">
                  <AlertTriangle className="h-3 w-3" />
                  <span>Obrigatório para base legal "Consentimento Explícito"</span>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSubmit} disabled={addMutation.isPending} size="sm">
                <Check className="h-4 w-4 mr-1" />
                Salvar
              </Button>
              <Button variant="ghost" onClick={() => setShowAdd(false)} size="sm">
                Cancelar
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <Button variant="outline" onClick={() => setShowAdd(true)} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Registrar Consentimento
        </Button>
      )}
    </div>
  );
}













