import { useState } from 'react';
import { Award, Plus, Calendar, DollarSign, Check, X, Briefcase, Shield, Heart, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { LabelWithHelp } from '@/components/ui/tooltip-help';
import { FormSection, FormRow, FormField } from '@/components/ui/form-section';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PapeisFormProps {
  pessoaId: string;
  onSuccess?: () => void;
}

const PAPEL_TIPOS = [
  { value: 'captador_doacao', label: 'Captador de Doações', icon: <Heart className="h-4 w-4" />, description: 'Angaria recursos para a entidade.' },
  { value: 'administrador_financeiro', label: 'Administrador Financeiro', icon: <DollarSign className="h-4 w-4" />, description: 'Gerencia finanças da entidade.' },
  { value: 'diretor', label: 'Diretor/Presidente', icon: <Shield className="h-4 w-4" />, description: 'Cargo estatutário de direção.' },
  { value: 'conselheiro', label: 'Conselheiro', icon: <Users className="h-4 w-4" />, description: 'Membro de conselho.' },
  { value: 'voluntario', label: 'Voluntário', icon: <Briefcase className="h-4 w-4" />, description: 'Presta serviços sem remuneração.' },
] as const;

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  ativo: { label: 'Ativo', color: 'bg-emerald-100 text-emerald-700' },
  suspenso: { label: 'Suspenso', color: 'bg-amber-100 text-amber-700' },
  encerrado: { label: 'Encerrado', color: 'bg-slate-100 text-slate-700' },
};

type PapelTipo = typeof PAPEL_TIPOS[number]['value'];

interface NovoPapelForm {
  papelTipo: PapelTipo;
  dataInicio: string;
  dataFim: string;
  atoDesignacao: string;
  observacoes: string;
  // Captador específico
  regiaoAtuacao: string;
  metaCaptacaoAnual: string;
  // Admin Financeiro específico
  responsabilidades: string;
  alcadaValorMaximo: string;
  podeAprovarPagamentos: boolean;
  acessoContasBancarias: boolean;
  cargoEstatutario: boolean;
}

export function PapeisForm({ pessoaId, onSuccess }: PapeisFormProps) {
  const utils = trpc.useUtils();
  const [showNovoModal, setShowNovoModal] = useState(false);
  const [form, setForm] = useState<NovoPapelForm>({
    papelTipo: 'voluntario',
    dataInicio: new Date().toISOString().split('T')[0],
    dataFim: '',
    atoDesignacao: '',
    observacoes: '',
    regiaoAtuacao: '',
    metaCaptacaoAnual: '',
    responsabilidades: '',
    alcadaValorMaximo: '',
    podeAprovarPagamentos: false,
    acessoContasBancarias: false,
    cargoEstatutario: false,
  });

  const { data: papeis, isLoading } = trpc.pessoaPapel.list.useQuery({ pessoaId });

  const createMutation = trpc.pessoaPapel.create.useMutation({
    onSuccess: () => {
      toast.success('Função atribuída com sucesso!');
      utils.pessoaPapel.list.invalidate({ pessoaId });
      setShowNovoModal(false);
      resetForm();
      onSuccess?.();
    },
    onError: (err) => toast.error(err.message),
  });

  const encerrarMutation = trpc.pessoaPapel.encerrar.useMutation({
    onSuccess: () => {
      toast.success('Função encerrada!');
      utils.pessoaPapel.list.invalidate({ pessoaId });
    },
    onError: (err) => toast.error(err.message),
  });

  const resetForm = () => {
    setForm({
      papelTipo: 'voluntario',
      dataInicio: new Date().toISOString().split('T')[0],
      dataFim: '',
      atoDesignacao: '',
      observacoes: '',
      regiaoAtuacao: '',
      metaCaptacaoAnual: '',
      responsabilidades: '',
      alcadaValorMaximo: '',
      podeAprovarPagamentos: false,
      acessoContasBancarias: false,
      cargoEstatutario: false,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    createMutation.mutate({
      pessoaId,
      papelTipo: form.papelTipo,
      dataInicio: form.dataInicio,
      atoDesignacao: form.atoDesignacao || undefined,
      observacoes: form.observacoes || undefined,
      // Campos específicos
      regiaoAtuacao: form.papelTipo === 'captador_doacao' ? form.regiaoAtuacao || undefined : undefined,
      metaCaptacaoAnual: form.papelTipo === 'captador_doacao' && form.metaCaptacaoAnual ? parseFloat(form.metaCaptacaoAnual) : undefined,
      responsabilidades: form.papelTipo === 'administrador_financeiro' ? form.responsabilidades || undefined : undefined,
      alcadaValorMaximo: form.papelTipo === 'administrador_financeiro' && form.alcadaValorMaximo ? parseFloat(form.alcadaValorMaximo) : undefined,
      podeAprovarPagamentos: form.papelTipo === 'administrador_financeiro' ? form.podeAprovarPagamentos : undefined,
      acessoContasBancarias: form.papelTipo === 'administrador_financeiro' ? form.acessoContasBancarias : undefined,
      cargoEstatutario: form.papelTipo === 'administrador_financeiro' ? form.cargoEstatutario : undefined,
    });
  };

  const handleEncerrar = (papelId: string) => {
    if (confirm('Encerrar esta função?')) {
      encerrarMutation.mutate({ id: papelId, dataFim: new Date().toISOString().split('T')[0] });
    }
  };

  const selectedPapelInfo = PAPEL_TIPOS.find(p => p.value === form.papelTipo);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header com botão de adicionar */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm">Funções e Papéis</h3>
          <p className="text-xs text-muted-foreground">Atribuições formais da pessoa na entidade</p>
        </div>
        <Button onClick={() => setShowNovoModal(true)} size="sm" className="bg-violet-600 hover:bg-violet-700">
          <Plus className="h-4 w-4 mr-1" /> Atribuir Função
        </Button>
      </div>

      {/* Lista de papéis */}
      {!papeis || papeis.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <Award className="h-8 w-8 text-slate-400" />
            </div>
            <p className="text-sm text-muted-foreground">
              Esta pessoa não possui funções atribuídas.
            </p>
            <Button onClick={() => setShowNovoModal(true)} variant="link" className="mt-2 text-violet-600">
              Atribuir primeira função
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {papeis.map((papel: any) => {
            const tipoInfo = PAPEL_TIPOS.find(p => p.value === papel.papelTipo);
            const statusInfo = STATUS_LABELS[papel.status];
            
            return (
              <Card key={papel.id} className={cn(papel.status !== 'ativo' && 'opacity-60')}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
                        papel.status === 'ativo' ? 'bg-violet-100 text-violet-600' : 'bg-slate-100 text-slate-400'
                      )}>
                        {tipoInfo?.icon || <Award className="h-5 w-5" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-sm">{tipoInfo?.label || papel.papelTipo}</h4>
                          <Badge className={statusInfo?.color || 'bg-slate-100'}>{statusInfo?.label}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Desde {new Date(papel.dataInicio).toLocaleDateString('pt-BR')}
                          {papel.dataFim && ` até ${new Date(papel.dataFim).toLocaleDateString('pt-BR')}`}
                        </p>
                        {papel.atoDesignacao && (
                          <p className="text-xs text-muted-foreground">Ato: {papel.atoDesignacao}</p>
                        )}
                        
                        {/* Dados específicos do captador */}
                        {papel.captadorDoacao && (
                          <div className="mt-2 text-xs space-y-1">
                            {papel.captadorDoacao.regiaoAtuacao && (
                              <p>📍 Região: {papel.captadorDoacao.regiaoAtuacao}</p>
                            )}
                            {papel.captadorDoacao.metaCaptacaoAnual && (
                              <p>🎯 Meta anual: R$ {parseFloat(papel.captadorDoacao.metaCaptacaoAnual).toLocaleString('pt-BR')}</p>
                            )}
                            <p>💰 Captado: R$ {parseFloat(papel.captadorDoacao.totalCaptadoAcumulado || 0).toLocaleString('pt-BR')} ({papel.captadorDoacao.quantidadeDoacoes || 0} doações)</p>
                          </div>
                        )}

                        {/* Dados específicos do admin financeiro */}
                        {papel.adminFinanceiro && (
                          <div className="mt-2 text-xs space-y-1">
                            {papel.adminFinanceiro.alcadaValorMaximo && (
                              <p>💵 Alçada: até R$ {parseFloat(papel.adminFinanceiro.alcadaValorMaximo).toLocaleString('pt-BR')}</p>
                            )}
                            <div className="flex gap-2 flex-wrap">
                              {papel.adminFinanceiro.podeAprovarPagamentos && <Badge variant="outline" className="text-[10px]">Aprova Pagamentos</Badge>}
                              {papel.adminFinanceiro.acessoContasBancarias && <Badge variant="outline" className="text-[10px]">Acesso Bancos</Badge>}
                              {papel.adminFinanceiro.cargoEstatutario && <Badge variant="outline" className="text-[10px]">Estatutário</Badge>}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {papel.status === 'ativo' && (
                      <Button variant="ghost" size="sm" onClick={() => handleEncerrar(papel.id)}
                        className="text-slate-500 hover:text-destructive shrink-0">
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal Novo Papel */}
      <Dialog open={showNovoModal} onOpenChange={setShowNovoModal}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-violet-600" />
              Atribuir Função
            </DialogTitle>
            <DialogDescription>
              Defina a função que esta pessoa exercerá na entidade.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField>
              <LabelWithHelp label="Tipo de Função" help="Qual função a pessoa exercerá na entidade." required />
              <Select value={form.papelTipo} onValueChange={(v: PapelTipo) => setForm(f => ({ ...f, papelTipo: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAPEL_TIPOS.map(tipo => (
                    <SelectItem key={tipo.value} value={tipo.value}>
                      <span className="flex items-center gap-2">
                        {tipo.icon}
                        <span>{tipo.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedPapelInfo && (
                <p className="text-xs text-muted-foreground mt-1">{selectedPapelInfo.description}</p>
              )}
            </FormField>

            <FormRow>
              <FormField>
                <LabelWithHelp label="Data de Início" help="Quando começa a exercer a função." required />
                <Input type="date" value={form.dataInicio} onChange={e => setForm(f => ({ ...f, dataInicio: e.target.value }))} />
              </FormField>
              <FormField>
                <LabelWithHelp label="Data de Término" help="Quando termina (deixe vazio se indefinido)." />
                <Input type="date" value={form.dataFim} onChange={e => setForm(f => ({ ...f, dataFim: e.target.value }))} />
              </FormField>
            </FormRow>

            <FormField>
              <LabelWithHelp label="Ato de Designação" help="Documento que formalizou a nomeação." />
              <Input value={form.atoDesignacao} onChange={e => setForm(f => ({ ...f, atoDesignacao: e.target.value }))}
                placeholder="Ex: Ata da Assembleia de 01/01/2024" />
            </FormField>

            {/* Campos específicos: Captador de Doações */}
            {form.papelTipo === 'captador_doacao' && (
              <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 space-y-3">
                <p className="text-xs font-medium text-rose-700">Dados do Captador</p>
                <FormRow>
                  <FormField>
                    <LabelWithHelp label="Região de Atuação" help="Área geográfica onde atua (bairro, cidade)." />
                    <Input value={form.regiaoAtuacao} onChange={e => setForm(f => ({ ...f, regiaoAtuacao: e.target.value }))}
                      placeholder="Ex: Centro, Zona Sul" />
                  </FormField>
                  <FormField>
                    <LabelWithHelp label="Meta Anual (R$)" help="Valor esperado de captação por ano." />
                    <Input type="number" step="0.01" min="0" value={form.metaCaptacaoAnual}
                      onChange={e => setForm(f => ({ ...f, metaCaptacaoAnual: e.target.value }))}
                      placeholder="0,00" />
                  </FormField>
                </FormRow>
              </div>
            )}

            {/* Campos específicos: Administrador Financeiro */}
            {form.papelTipo === 'administrador_financeiro' && (
              <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 space-y-3">
                <p className="text-xs font-medium text-blue-700">Dados do Administrador Financeiro</p>
                
                <FormField>
                  <LabelWithHelp label="Responsabilidades" help="Descreva as atribuições específicas." />
                  <Textarea value={form.responsabilidades} onChange={e => setForm(f => ({ ...f, responsabilidades: e.target.value }))}
                    placeholder="Descreva as responsabilidades..." rows={2} />
                </FormField>

                <FormField>
                  <LabelWithHelp label="Alçada Máxima (R$)" help="Valor máximo que pode aprovar sozinho." />
                  <Input type="number" step="0.01" min="0" value={form.alcadaValorMaximo}
                    onChange={e => setForm(f => ({ ...f, alcadaValorMaximo: e.target.value }))}
                    placeholder="0,00" />
                </FormField>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={form.podeAprovarPagamentos} 
                      onCheckedChange={c => setForm(f => ({ ...f, podeAprovarPagamentos: !!c }))} />
                    <span className="text-sm">Pode aprovar pagamentos</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={form.acessoContasBancarias}
                      onCheckedChange={c => setForm(f => ({ ...f, acessoContasBancarias: !!c }))} />
                    <span className="text-sm">Acesso às contas bancárias</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={form.cargoEstatutario}
                      onCheckedChange={c => setForm(f => ({ ...f, cargoEstatutario: !!c }))} />
                    <span className="text-sm">Cargo previsto no estatuto social</span>
                  </label>
                </div>
              </div>
            )}

            <FormField>
              <LabelWithHelp label="Observações" help="Informações adicionais sobre a função." />
              <Textarea value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
                placeholder="Observações..." rows={2} />
            </FormField>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setShowNovoModal(false)}>Cancelar</Button>
              <Button type="submit" disabled={createMutation.isPending} className="bg-violet-600 hover:bg-violet-700">
                {createMutation.isPending ? 'Salvando...' : 'Atribuir Função'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

