import { useState, useMemo } from 'react';
import { X, Edit2, Save, Trash2, UserCheck, UserX, History, Award, Heart, FileText, Mail, Phone, MapPin, Calendar, AlertTriangle, Briefcase, Shield, RotateCcw, Receipt, CheckCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PessoaForm } from './PessoaForm';
import { AssociadoForm } from './AssociadoForm';
import { PapeisForm } from './PapeisForm';
import { LgpdForm } from './LgpdForm';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PessoaDetailProps {
  pessoaId: string;
  onClose: () => void;
  onUpdated?: () => void;
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(date: string | null): string {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('pt-BR');
}

function detectGender(nome: string): 'male' | 'female' | 'neutral' {
  const firstName = nome.trim().split(' ')[0].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const maleNames = ['jose', 'joao', 'antonio', 'francisco', 'carlos', 'paulo', 'pedro', 'lucas', 'luiz', 'marcos'];
  const femaleNames = ['maria', 'ana', 'francisca', 'antonia', 'adriana', 'juliana', 'marcia', 'fernanda', 'patricia'];
  if (maleNames.includes(firstName)) return 'male';
  if (femaleNames.includes(firstName)) return 'female';
  if (firstName.endsWith('a') && !['luca'].includes(firstName)) return 'female';
  if (firstName.endsWith('o') || firstName.endsWith('son')) return 'male';
  return 'neutral';
}

const DOCUMENTO_LABELS: Record<string, string> = { cpf: 'CPF', cnpj: 'CNPJ', rg: 'RG', ie: 'IE', im: 'IM' };
const CONTATO_ICONS: Record<string, React.ReactNode> = {
  email: <Mail className="h-4 w-4" />,
  telefone: <Phone className="h-4 w-4" />,
  celular: <Phone className="h-4 w-4" />,
  whatsapp: <Phone className="h-4 w-4 text-green-600" />,
};
const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  ativo: { label: 'Ativo', color: 'bg-emerald-100 text-emerald-700' },
  suspenso: { label: 'Suspenso', color: 'bg-amber-100 text-amber-700' },
  desligado: { label: 'Desligado', color: 'bg-slate-100 text-slate-700' },
  falecido: { label: 'Falecido', color: 'bg-slate-200 text-slate-600' },
};
const CATEGORIA_LABELS: Record<string, string> = {
  frequentador: '🙏 Frequentador',
  trabalhador: '⚙️ Trabalhador',
  medium: '✨ Médium',
  passista: '🙌 Passista',
  orientador_estudo: '📖 Orientador',
  evangelizador: '👶 Evangelizador',
  moceiro: '🌟 Moceiro',
  assistido: '💚 Assistido',
  benemerito: '⭐ Benemérito',
  honorario: '🏆 Honorário',
};

export function PessoaDetail({ pessoaId, onClose, onUpdated }: PessoaDetailProps) {
  const utils = trpc.useUtils();
  const [activeTab, setActiveTab] = useState('dados');
  const [isEditing, setIsEditing] = useState(false);
  const [showInativarDialog, setShowInativarDialog] = useState(false);
  const [motivoInativacao, setMotivoInativacao] = useState('');

  const { data: pessoa, isLoading, error } = trpc.pessoas.getFullById.useQuery(pessoaId);
  const { data: historico } = trpc.pessoas.historico.useQuery(pessoaId);
  const { data: assocHistorico } = trpc.pessoas.getAssociadoHistorico.useQuery(pessoaId);

  const inativarMutation = trpc.pessoas.inativar.useMutation({
    onSuccess: () => {
      toast.success('Pessoa inativada');
      utils.pessoas.list.invalidate();
      utils.pessoas.getFullById.invalidate(pessoaId);
      setShowInativarDialog(false);
      onUpdated?.();
    },
    onError: (err) => toast.error(err.message),
  });

  const reativarMutation = trpc.pessoas.reativar.useMutation({
    onSuccess: () => {
      toast.success('Pessoa reativada');
      utils.pessoas.list.invalidate();
      utils.pessoas.getFullById.invalidate(pessoaId);
      onUpdated?.();
    },
    onError: (err) => toast.error(err.message),
  });

  // Check if we're in mobile context (inside fixed overlay) or desktop (inside card)
  const isMobileOverlay = typeof window !== 'undefined' && window.innerWidth < 1024;

  if (isLoading) {
    if (isMobileOverlay) {
      return (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <div className="relative w-full max-w-2xl bg-background shadow-2xl animate-in slide-in-from-right duration-300 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          </div>
        </div>
      );
    }
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (error || !pessoa) {
    if (isMobileOverlay) {
      return (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/60" onClick={onClose} />
          <div className="relative w-full max-w-2xl bg-background shadow-2xl p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="text-lg font-medium">Erro ao carregar pessoa</p>
            <Button onClick={onClose} className="mt-4">Fechar</Button>
          </div>
        </div>
      );
    }
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-lg font-medium">Erro ao carregar pessoa</p>
        <Button onClick={onClose} className="mt-4" variant="outline">Voltar</Button>
      </div>
    );
  }

  const gender = detectGender(pessoa.nome);
  const headerBg = gender === 'female' ? 'from-pink-500 to-rose-600' : gender === 'male' ? 'from-blue-500 to-indigo-600' : 'from-violet-600 to-indigo-700';

  // Calculate status cadastro
  const statusCadastro = useMemo(() => {
    if (!pessoa.nome || pessoa.nome === 'Rascunho' || pessoa.nome.length < 3) return 'rascunho';
    const temCpfCnpj = pessoa.documentos?.some(d => d.tipo === 'cpf' || d.tipo === 'cnpj');
    if (!temCpfCnpj) return 'pendencias';
    return 'completo';
  }, [pessoa]);

  // Check if person has valid CPF for receipts
  const temCpfValido = pessoa.documentos?.some(d => d.tipo === 'cpf' && d.numero.length >= 11);

  const handleFormSuccess = () => {
    setIsEditing(false);
    utils.pessoas.getFullById.invalidate(pessoaId);
    utils.pessoas.list.invalidate();
    onUpdated?.();
  };

  // Wrapper component based on context
  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    if (isMobileOverlay) {
      return (
        <div className="fixed inset-0 z-50 flex justify-end pt-16 lg:pt-0">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          {children}
        </div>
      );
    }
    return <>{children}</>;
  };

  return (
    <Wrapper>
      <div className={cn(
        "bg-background overflow-hidden flex flex-col h-full",
        isMobileOverlay && "relative w-full max-w-2xl shadow-2xl animate-in slide-in-from-right duration-300"
      )}>
        {/* Header */}
        <div className={cn('text-white p-6 shrink-0', `bg-gradient-to-br ${headerBg}`)}>
          <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/20 transition-colors">
            <X className="h-5 w-5" />
          </button>
          
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-3xl shrink-0">
              {gender === 'female' ? '👩' : gender === 'male' ? '👨' : '🧑'}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold truncate">{pessoa.nome}</h2>
              {pessoa.nomeFantasia && <p className="text-sm text-white/80 truncate">"{pessoa.nomeFantasia}"</p>}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge variant="outline" className="border-white/40 text-white text-xs">
                  {pessoa.tipo === 'fisica' ? '👤 Pessoa Física' : '🏢 Pessoa Jurídica'}
                </Badge>
                {statusCadastro === 'rascunho' && (
                  <Badge className="bg-slate-500/80 text-white text-xs">
                    <Clock className="h-3 w-3 mr-1" />Rascunho
                  </Badge>
                )}
                {statusCadastro === 'pendencias' && (
                  <Badge className="bg-amber-500/80 text-white text-xs">
                    <AlertTriangle className="h-3 w-3 mr-1" />Pendências
                  </Badge>
                )}
                {statusCadastro === 'completo' && (
                  <Badge className="bg-emerald-500/80 text-white text-xs">
                    <CheckCircle className="h-3 w-3 mr-1" />Completo
                  </Badge>
                )}
                {!pessoa.ativo && <Badge className="bg-red-500 text-white text-xs">Inativo</Badge>}
                {pessoa.isAssociado && (
                  <Badge className="bg-white/20 text-white text-xs">
                    <UserCheck className="h-3 w-3 mr-1" />
                    {CATEGORIA_LABELS[pessoa.associado?.categoria || ''] || 'Associado'}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          {historico?.stats && (
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="text-center">
                <div className="text-2xl font-bold">{historico.stats.totalDoacoes}</div>
                <div className="text-xs text-white/70">Doações</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{formatCurrency(historico.stats.valorTotal)}</div>
                <div className="text-xs text-white/70">Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{formatCurrency(historico.stats.mediaDoacao)}</div>
                <div className="text-xs text-white/70">Média</div>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
            <div className="px-4 pt-4 border-b sticky top-0 bg-background z-10">
              <TabsList className="w-full grid grid-cols-5">
                <TabsTrigger value="dados" className="text-xs">
                  <FileText className="h-3.5 w-3.5 mr-1.5" />Dados
                </TabsTrigger>
                <TabsTrigger value="associado" className="text-xs">
                  <UserCheck className="h-3.5 w-3.5 mr-1.5" />Associado
                </TabsTrigger>
                <TabsTrigger value="papeis" className="text-xs">
                  <Briefcase className="h-3.5 w-3.5 mr-1.5" />Funções
                </TabsTrigger>
                <TabsTrigger value="lgpd" className="text-xs">
                  <Shield className="h-3.5 w-3.5 mr-1.5" />LGPD
                </TabsTrigger>
                <TabsTrigger value="historico" className="text-xs">
                  <History className="h-3.5 w-3.5 mr-1.5" />Histórico
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-4">
              {/* Tab: Dados */}
              <TabsContent value="dados" className="mt-0 space-y-4">
                {isEditing ? (
                  <PessoaForm pessoaId={pessoaId} mode="edit" onSuccess={handleFormSuccess} onCancel={() => setIsEditing(false)} />
                ) : (
                  <>
                    {/* Documentos */}
                    <Card>
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <FileText className="h-4 w-4" /> Documentos
                          <Badge variant="secondary" className="ml-auto">{pessoa.documentos.length}</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="py-2">
                        {pessoa.documentos.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">Nenhum documento cadastrado</p>
                        ) : (
                          <div className="space-y-2">
                            {pessoa.documentos.map(doc => (
                              <div key={doc.id} className="flex items-center justify-between py-1.5 px-2 rounded bg-muted/50">
                                <span className="text-xs font-medium text-muted-foreground">{DOCUMENTO_LABELS[doc.tipo]}</span>
                                <span className="text-sm font-mono">{doc.numero}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Contatos */}
                    <Card>
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Phone className="h-4 w-4" /> Contatos
                          <Badge variant="secondary" className="ml-auto">{pessoa.contatos.length}</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="py-2">
                        {pessoa.contatos.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">Nenhum contato cadastrado</p>
                        ) : (
                          <div className="space-y-2">
                            {pessoa.contatos.map(cont => (
                              <div key={cont.id} className="flex items-center gap-3 py-1.5 px-2 rounded bg-muted/50">
                                {CONTATO_ICONS[cont.tipo]}
                                <span className="text-sm flex-1">{cont.valor}</span>
                                {cont.principal && <Badge variant="outline" className="text-[10px]">Principal</Badge>}
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Endereços */}
                    <Card>
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <MapPin className="h-4 w-4" /> Endereços
                          <Badge variant="secondary" className="ml-auto">{pessoa.enderecos.length}</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="py-2">
                        {pessoa.enderecos.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">Nenhum endereço cadastrado</p>
                        ) : (
                          <div className="space-y-3">
                            {pessoa.enderecos.map(end => (
                              <div key={end.id} className="p-3 rounded border bg-muted/30">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline" className="text-[10px]">{end.tipo}</Badge>
                                  {end.principal && <Badge className="bg-amber-100 text-amber-700 text-[10px]">Principal</Badge>}
                                </div>
                                <p className="text-sm">
                                  {end.logradouro}{end.numero && `, ${end.numero}`}
                                  {end.complemento && ` - ${end.complemento}`}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {end.bairro && `${end.bairro} - `}{end.cidade}/{end.uf}
                                  {end.cep && ` - CEP: ${end.cep}`}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Observações */}
                    {pessoa.observacoes && (
                      <Card>
                        <CardHeader className="py-3">
                          <CardTitle className="text-sm">Observações</CardTitle>
                        </CardHeader>
                        <CardContent className="py-2">
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{pessoa.observacoes}</p>
                        </CardContent>
                      </Card>
                    )}

                    {/* Contextual Actions */}
                    {temCpfValido && pessoa.ativo && (
                      <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200">
                        <CardContent className="py-3">
                          <div className="flex items-center gap-3">
                            <Receipt className="h-5 w-5 text-emerald-600" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-emerald-800">CPF válido cadastrado</p>
                              <p className="text-xs text-emerald-600">Esta pessoa pode receber recibos de doação</p>
                            </div>
                            <Button size="sm" variant="outline" className="border-emerald-500 text-emerald-600 hover:bg-emerald-50">
                              <Receipt className="h-4 w-4 mr-1.5" />
                              Emitir Recibo
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-4">
                      <Button onClick={() => setIsEditing(true)} variant="outline" className="flex-1">
                        <Edit2 className="h-4 w-4 mr-2" /> Editar Dados
                      </Button>
                      {pessoa.ativo ? (
                        <Button onClick={() => setShowInativarDialog(true)} variant="destructive" size="icon" title="Inativar pessoa">
                          <UserX className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button 
                          onClick={() => reativarMutation.mutate(pessoaId)} 
                          variant="outline" 
                          className="border-emerald-500 text-emerald-600 hover:bg-emerald-50"
                          disabled={reativarMutation.isPending}
                        >
                          <RotateCcw className={cn("h-4 w-4 mr-2", reativarMutation.isPending && "animate-spin")} />
                          {reativarMutation.isPending ? 'Reativando...' : 'Reativar'}
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </TabsContent>

              {/* Tab: Associado */}
              <TabsContent value="associado" className="mt-0">
                <AssociadoForm pessoaId={pessoaId} associado={pessoa.associado} onSuccess={handleFormSuccess} />
              </TabsContent>

              {/* Tab: Papéis/Funções */}
              <TabsContent value="papeis" className="mt-0">
                <PapeisForm pessoaId={pessoaId} onSuccess={handleFormSuccess} />
              </TabsContent>

              {/* Tab: LGPD */}
              <TabsContent value="lgpd" className="mt-0">
                <LgpdForm pessoaId={pessoaId} onSuccess={handleFormSuccess} />
              </TabsContent>

              {/* Tab: Histórico */}
              <TabsContent value="historico" className="mt-0 space-y-4">
                {/* Doações */}
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Heart className="h-4 w-4 text-rose-500" /> Histórico de Doações
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-2">
                    {!historico?.doacoes || historico.doacoes.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <span className="text-4xl">💔</span>
                        <p className="text-sm mt-2">Nenhuma doação registrada</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {historico.doacoes.map((doacao, idx) => (
                          <div key={doacao.id} className="flex items-center gap-3 py-2 px-3 rounded hover:bg-muted/50">
                            <div className={cn('w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                              idx === 0 ? 'bg-rose-100 text-rose-500' : 'bg-slate-100 text-slate-400')}>
                              <Heart className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-semibold text-sm">{formatCurrency(doacao.valor)}</span>
                                <span className="text-xs text-muted-foreground">{formatDate(doacao.dataCompetencia)}</span>
                              </div>
                              <p className="text-xs text-muted-foreground truncate">{doacao.descricao || doacao.natureza}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Histórico do Associado */}
                {assocHistorico && assocHistorico.length > 0 && (
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Calendar className="h-4 w-4" /> Alterações de Status
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="py-2">
                      <div className="space-y-2">
                        {assocHistorico.map(h => (
                          <div key={h.id} className="flex items-start gap-3 py-2 px-3 rounded bg-muted/30">
                            <div className="w-2 h-2 rounded-full bg-violet-500 mt-2 shrink-0" />
                            <div className="flex-1">
                              <p className="text-sm">
                                <span className="font-medium">{h.campoAlterado}</span>: {h.valorAnterior} → {h.valorNovo}
                              </p>
                              {h.motivo && <p className="text-xs text-muted-foreground">{h.motivo}</p>}
                              <p className="text-xs text-muted-foreground mt-1">{formatDate(h.dataAlteracao as any)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Dialog Inativar */}
        <Dialog open={showInativarDialog} onOpenChange={setShowInativarDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Inativar Pessoa
              </DialogTitle>
              <DialogDescription>
                A pessoa será inativada e não aparecerá mais nas buscas. Todos os dados e histórico serão preservados.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-4">
              <Label htmlFor="motivo">Motivo da inativação (opcional)</Label>
              <Textarea id="motivo" value={motivoInativacao} onChange={e => setMotivoInativacao(e.target.value)}
                placeholder="Descreva o motivo..." rows={3} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowInativarDialog(false)}>Cancelar</Button>
              <Button variant="destructive" onClick={() => inativarMutation.mutate({ id: pessoaId, motivo: motivoInativacao })}
                disabled={inativarMutation.isPending}>
                {inativarMutation.isPending ? 'Inativando...' : 'Confirmar Inativação'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Wrapper>
  );
}

