import { useState, useEffect, useRef } from 'react';
import { UserCheck, UserPlus, Save, Calendar, DollarSign, AlertCircle, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { LabelWithHelp } from '@/components/ui/tooltip-help';
import { FormSection, FormRow, FormField } from '@/components/ui/form-section';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type AssociadoCategoria = 'trabalhador' | 'frequentador' | 'benemerito' | 'honorario' | 'medium' | 'passista' | 'orientador_estudo' | 'evangelizador' | 'moceiro' | 'assistido';

interface AssociadoData {
  id?: string;
  numeroRegistro: string | null;
  dataAdmissao: string;
  dataDesligamento: string | null;
  status: 'ativo' | 'suspenso' | 'desligado' | 'falecido';
  categoria: AssociadoCategoria;
  periodicidade: 'mensal' | 'trimestral' | 'semestral' | 'anual';
  valorContribuicaoSugerido: string | null;
  diaVencimento: number | null;
  isento: boolean;
  motivoIsencao: string | null;
}

interface AssociadoFormProps {
  pessoaId: string;
  associado: AssociadoData | null;
  onSuccess?: () => void;
}

const STATUS_OPTIONS = [
  { value: 'ativo', label: 'Ativo', icon: '✅', description: 'Membro regular em dia. Gera títulos de contribuição.' },
  { value: 'suspenso', label: 'Suspenso', icon: '⏸️', description: 'Temporariamente afastado. Não gera novos títulos.' },
  { value: 'desligado', label: 'Desligado', icon: '🚪', description: 'Saiu da entidade. Mantém histórico.' },
  { value: 'falecido', label: 'Falecido', icon: '🕊️', description: 'Membro faleceu. Encerra vínculos.' },
];

const CATEGORIA_OPTIONS = [
  { value: 'frequentador', label: 'Frequentador', icon: '🙏', description: 'Assiste regularmente às atividades.' },
  { value: 'trabalhador', label: 'Trabalhador', icon: '⚙️', description: 'Trabalhador geral da casa espírita.' },
  { value: 'medium', label: 'Médium', icon: '✨', description: 'Médium em desenvolvimento ou atuante.' },
  { value: 'passista', label: 'Passista', icon: '🙌', description: 'Aplicador de passes magnéticos.' },
  { value: 'orientador_estudo', label: 'Orientador de Estudo', icon: '📖', description: 'Orienta estudos doutrinários.' },
  { value: 'evangelizador', label: 'Evangelizador', icon: '👶', description: 'Evangelização infantojuvenil.' },
  { value: 'moceiro', label: 'Moceiro', icon: '🌟', description: 'Participante da Mocidade Espírita.' },
  { value: 'assistido', label: 'Assistido', icon: '💚', description: 'Recebe atendimento fraterno.' },
  { value: 'benemerito', label: 'Benemérito', icon: '⭐', description: 'Reconhecido por contribuições significativas.' },
  { value: 'honorario', label: 'Honorário', icon: '🏆', description: 'Título honorífico (fundador, ex-presidente).' },
];

const PERIODICIDADE_OPTIONS = [
  { value: 'mensal', label: 'Mensal', description: '12 títulos por ano' },
  { value: 'trimestral', label: 'Trimestral', description: '4 títulos por ano' },
  { value: 'semestral', label: 'Semestral', description: '2 títulos por ano' },
  { value: 'anual', label: 'Anual', description: '1 título por ano' },
];

export function AssociadoForm({ pessoaId, associado, onSuccess }: AssociadoFormProps) {
  const utils = trpc.useUtils();
  const isNew = !associado;
  const [showForm, setShowForm] = useState(false);
  const [showStatusChangeModal, setShowStatusChangeModal] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<AssociadoData['status'] | null>(null);
  const [motivoAlteracao, setMotivoAlteracao] = useState('');
  const [motivoStatusConfirmado, setMotivoStatusConfirmado] = useState<string | null>(null); // Motivo confirmado para enviar
  const previousStatusRef = useRef<AssociadoData['status'] | null>(null);

  const [form, setForm] = useState<AssociadoData>({
    numeroRegistro: associado?.numeroRegistro || '',
    dataAdmissao: associado?.dataAdmissao || new Date().toISOString().split('T')[0],
    dataDesligamento: associado?.dataDesligamento || null,
    status: associado?.status || 'ativo',
    categoria: associado?.categoria || 'frequentador',
    periodicidade: associado?.periodicidade || 'mensal',
    valorContribuicaoSugerido: associado?.valorContribuicaoSugerido || '',
    diaVencimento: associado?.diaVencimento || 10,
    isento: associado?.isento || false,
    motivoIsencao: associado?.motivoIsencao || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Store initial status for comparison
  useEffect(() => {
    if (associado) {
      previousStatusRef.current = associado.status;
    }
  }, [associado]);

  useEffect(() => {
    if (associado) {
      setForm({
        numeroRegistro: associado.numeroRegistro || '',
        dataAdmissao: associado.dataAdmissao,
        dataDesligamento: associado.dataDesligamento,
        status: associado.status,
        categoria: associado.categoria,
        periodicidade: associado.periodicidade,
        valorContribuicaoSugerido: associado.valorContribuicaoSugerido || '',
        diaVencimento: associado.diaVencimento || 10,
        isento: associado.isento,
        motivoIsencao: associado.motivoIsencao || '',
      });
    }
  }, [associado]);

  const updateMutation = trpc.pessoas.updateAssociado.useMutation({
    onSuccess: (data) => {
      toast.success(data.created ? 'Associado cadastrado!' : 'Dados atualizados!');
      utils.pessoas.getFullById.invalidate(pessoaId);
      utils.pessoas.list.invalidate();
      setShowForm(false);
      setMotivoStatusConfirmado(null); // Limpar motivo após salvar
      onSuccess?.();
    },
    onError: (err) => toast.error(err.message),
  });

  const removeMutation = trpc.pessoas.removeAssociado.useMutation({
    onSuccess: () => {
      toast.success('Vínculo de associado removido');
      utils.pessoas.getFullById.invalidate(pessoaId);
      utils.pessoas.list.invalidate();
      onSuccess?.();
    },
    onError: (err) => toast.error(err.message),
  });

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!form.dataAdmissao) newErrors.dataAdmissao = 'Data de admissão é obrigatória';
    if (form.isento && !form.motivoIsencao?.trim()) newErrors.motivoIsencao = 'Informe o motivo da isenção';
    if ((form.status === 'desligado' || form.status === 'falecido') && !form.dataDesligamento) {
      newErrors.dataDesligamento = form.status === 'desligado' ? 'Informe a data de desligamento' : 'Informe a data de falecimento';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle status change with confirmation modal
  const handleStatusChange = (newStatus: AssociadoData['status']) => {
    if (!isNew && associado && newStatus !== associado.status) {
      setPendingStatusChange(newStatus);
      setMotivoAlteracao('');
      setShowStatusChangeModal(true);
    } else {
      setForm(f => ({ ...f, status: newStatus }));
    }
  };

  const confirmStatusChange = () => {
    if (motivoAlteracao.length < 10) {
      toast.error('O motivo deve ter no mínimo 10 caracteres');
      return;
    }
    if (pendingStatusChange) {
      setForm(f => ({ 
        ...f, 
        status: pendingStatusChange,
        dataDesligamento: (pendingStatusChange === 'desligado' || pendingStatusChange === 'falecido') && !f.dataDesligamento 
          ? new Date().toISOString().split('T')[0] 
          : f.dataDesligamento
      }));
      setMotivoStatusConfirmado(motivoAlteracao); // Guardar motivo para enviar na mutation
      setPendingStatusChange(null);
      setShowStatusChangeModal(false);
      setMotivoAlteracao('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast.error('Corrija os erros no formulário');
      return;
    }

    updateMutation.mutate({
      pessoaId,
      numeroRegistro: form.numeroRegistro || null,
      dataAdmissao: form.dataAdmissao,
      dataDesligamento: form.dataDesligamento,
      status: form.status,
      categoria: form.categoria,
      periodicidade: form.periodicidade,
      valorContribuicaoSugerido: form.valorContribuicaoSugerido || null,
      diaVencimento: form.diaVencimento,
      isento: form.isento,
      motivoIsencao: form.isento ? form.motivoIsencao : null,
      motivoStatusChange: motivoStatusConfirmado, // Enviar motivo da mudança de status
    });
  };

  if (isNew && !showForm) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-violet-100 flex items-center justify-center mb-4">
            <UserPlus className="h-8 w-8 text-violet-600" />
          </div>
          <h3 className="font-semibold text-lg mb-2">Esta pessoa não é associada</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
            Associados são membros formais da entidade com direitos estatutários e contribuições regulares.
          </p>
          <Button onClick={() => setShowForm(true)} className="bg-violet-600 hover:bg-violet-700">
            <UserPlus className="h-4 w-4 mr-2" />
            Tornar Associado
          </Button>
        </CardContent>
      </Card>
    );
  }

  const isPending = updateMutation.isPending || removeMutation.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header - diferente para novo vs edição */}
      {isNew ? (
        <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200">
          <div className="flex items-center gap-3">
            <UserPlus className="h-5 w-5 text-emerald-600" />
            <div>
              <p className="font-medium text-sm text-emerald-800">Cadastrar como Associado</p>
              <p className="text-xs text-emerald-600">Preencha os dados abaixo para tornar esta pessoa associada</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200">
          <div className="flex items-center gap-3">
            <UserCheck className="h-5 w-5 text-violet-600" />
            <div>
              <p className="font-medium text-sm">Associado desde {new Date(form.dataAdmissao).toLocaleDateString('pt-BR')}</p>
              <p className="text-xs text-muted-foreground">{CATEGORIA_OPTIONS.find(c => c.value === form.categoria)?.label}</p>
            </div>
          </div>
          <Badge className={cn(
            form.status === 'ativo' && 'bg-emerald-100 text-emerald-700',
            form.status === 'suspenso' && 'bg-amber-100 text-amber-700',
            form.status === 'desligado' && 'bg-slate-100 text-slate-700',
            form.status === 'falecido' && 'bg-slate-200 text-slate-600',
          )}>
            {STATUS_OPTIONS.find(s => s.value === form.status)?.icon} {STATUS_OPTIONS.find(s => s.value === form.status)?.label}
          </Badge>
        </div>
      )}

      {/* Situação e Categoria */}
      <FormSection title="Situação do Associado" icon="📋">
        <FormRow>
          <FormField error={errors.status}>
            <LabelWithHelp label="Situação" help="Status atual do associado na entidade." required />
            <Select value={form.status} onValueChange={handleStatusChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <span className="flex items-center gap-2">
                      <span>{opt.icon}</span>
                      <span>{opt.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              {STATUS_OPTIONS.find(s => s.value === form.status)?.description}
            </p>
          </FormField>

          <FormField error={errors.categoria}>
            <LabelWithHelp label="Categoria" help="Tipo de vínculo com a entidade." required />
            <Select value={form.categoria} onValueChange={(v: AssociadoCategoria) => setForm(f => ({ ...f, categoria: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIA_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <span className="flex items-center gap-2">
                      <span>{opt.icon}</span>
                      <span>{opt.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </FormRow>

        <FormRow>
          <FormField error={errors.dataAdmissao}>
            <LabelWithHelp label="Data de Admissão" help="Quando a pessoa se tornou membro oficial." required />
            <Input type="date" value={form.dataAdmissao} onChange={e => setForm(f => ({ ...f, dataAdmissao: e.target.value }))} />
          </FormField>

          {(form.status === 'desligado' || form.status === 'falecido') && (
            <FormField error={errors.dataDesligamento}>
              <LabelWithHelp label="Data de Desligamento" help="Quando saiu da entidade." required />
              <Input type="date" value={form.dataDesligamento || ''} onChange={e => setForm(f => ({ ...f, dataDesligamento: e.target.value }))} />
            </FormField>
          )}

          <FormField>
            <LabelWithHelp label="Nº Registro" help="Número de matrícula ou registro interno." />
            <Input value={form.numeroRegistro || ''} onChange={e => setForm(f => ({ ...f, numeroRegistro: e.target.value }))}
              placeholder="Ex: 00123" />
          </FormField>
        </FormRow>
      </FormSection>

      {/* Contribuição */}
      <FormSection title="Contribuição" icon="💰">
        <FormRow>
          <FormField>
            <LabelWithHelp label="Periodicidade" help="Com que frequência paga a contribuição." />
            <Select value={form.periodicidade} onValueChange={(v: AssociadoData['periodicidade']) => setForm(f => ({ ...f, periodicidade: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIODICIDADE_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label} - {opt.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField>
            <LabelWithHelp label="Valor Sugerido (R$)" help="Valor de referência para a contribuição." />
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input type="number" step="0.01" min="0" value={form.valorContribuicaoSugerido || ''} 
                onChange={e => setForm(f => ({ ...f, valorContribuicaoSugerido: e.target.value }))}
                placeholder="0,00" className="pl-9" disabled={form.isento} />
            </div>
          </FormField>

          <FormField>
            <LabelWithHelp label="Dia Vencimento" help="Dia do mês para vencimento (1 a 28)." />
            <Input type="number" min="1" max="28" value={form.diaVencimento || ''} 
              onChange={e => setForm(f => ({ ...f, diaVencimento: parseInt(e.target.value) || null }))}
              placeholder="10" disabled={form.isento} />
          </FormField>
        </FormRow>

        <div className={cn('p-4 rounded-lg border transition-colors',
          form.isento ? 'bg-amber-50 border-amber-200' : 'bg-muted/30')}>
          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox checked={form.isento} onCheckedChange={(checked) => setForm(f => ({ ...f, isento: !!checked }))} className="mt-0.5" />
            <div>
              <span className="font-medium text-sm">Isento de Contribuição</span>
              <p className="text-xs text-muted-foreground">Marque se o associado não paga contribuição.</p>
            </div>
          </label>

          {form.isento && (
            <FormField error={errors.motivoIsencao} className="mt-3">
              <LabelWithHelp label="Motivo da Isenção" help="Explique o motivo (ex: idoso, doença)." required />
              <Textarea value={form.motivoIsencao || ''} onChange={e => setForm(f => ({ ...f, motivoIsencao: e.target.value }))}
                placeholder="Descreva o motivo da isenção..." rows={2} 
                className={cn(errors.motivoIsencao && 'border-destructive')} />
            </FormField>
          )}
        </div>
      </FormSection>

      {/* Actions */}
      <div className="flex justify-between gap-3 pt-4 border-t">
        {isNew ? (
          <Button type="button" variant="outline" onClick={() => setShowForm(false)} disabled={isPending}>
            Cancelar
          </Button>
        ) : (
          <Button type="button" variant="outline" size="sm" className="text-destructive hover:bg-destructive/10"
            onClick={() => {
              if (confirm('Remover vínculo de associado? O histórico será mantido.')) {
                removeMutation.mutate({ pessoaId, motivo: 'Removido via formulário' });
              }
            }} disabled={isPending}>
            Remover Vínculo
          </Button>
        )}
        
        <Button type="submit" disabled={isPending} className="bg-violet-600 hover:bg-violet-700">
          {isPending ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              {isNew ? 'Cadastrar Associado' : 'Salvar Alterações'}
            </>
          )}
        </Button>
      </div>

      {/* Modal de Alteração de Status */}
      <Dialog open={showStatusChangeModal} onOpenChange={(open) => {
        if (!open) {
          setPendingStatusChange(null);
          setMotivoAlteracao('');
        }
        setShowStatusChangeModal(open);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Confirmar Alteração de Status
            </DialogTitle>
            <DialogDescription>
              Você está alterando o status de{' '}
              <strong>{STATUS_OPTIONS.find(s => s.value === associado?.status)?.label}</strong>
              {' '}para{' '}
              <strong>{STATUS_OPTIONS.find(s => s.value === pendingStatusChange)?.label}</strong>.
              Esta ação será registrada no histórico.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="motivo-alteracao">
                Motivo da alteração <span className="text-destructive">*</span>
              </Label>
              <Textarea 
                id="motivo-alteracao"
                value={motivoAlteracao}
                onChange={e => setMotivoAlteracao(e.target.value)}
                placeholder="Descreva o motivo da alteração de status (mínimo 10 caracteres)..."
                rows={3}
                className={cn(motivoAlteracao.length > 0 && motivoAlteracao.length < 10 && 'border-amber-500')}
              />
              <p className={cn(
                'text-xs',
                motivoAlteracao.length === 0 ? 'text-muted-foreground' :
                motivoAlteracao.length < 10 ? 'text-amber-600' : 'text-emerald-600'
              )}>
                {motivoAlteracao.length}/10 caracteres mínimos
              </p>
            </div>

            {(pendingStatusChange === 'desligado' || pendingStatusChange === 'falecido') && (
              <div className="p-3 rounded-lg bg-slate-50 border">
                <p className="text-sm text-muted-foreground">
                  ⚠️ Ao confirmar, a data de {pendingStatusChange === 'desligado' ? 'desligamento' : 'falecimento'} será 
                  preenchida automaticamente com a data de hoje, se não estiver informada.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowStatusChangeModal(false);
              setPendingStatusChange(null);
              setMotivoAlteracao('');
            }}>
              Cancelar
            </Button>
            <Button 
              onClick={confirmStatusChange}
              disabled={motivoAlteracao.length < 10}
              className="bg-violet-600 hover:bg-violet-700"
            >
              Confirmar Alteração
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}

