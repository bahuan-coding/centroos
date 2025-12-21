import { useState, useEffect, useRef, useCallback } from 'react';
import { User, Building2, FileText, Mail, Phone, MapPin, Plus, Trash2, Star, Check, Save, Clock, AlertTriangle, ExternalLink, RotateCcw, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { LabelWithHelp } from '@/components/ui/tooltip-help';
import { FormSection, FormRow, FormField, DynamicList } from '@/components/ui/form-section';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatDocument, validateDocument, formatContact, validateContact } from '@/lib/validators';

interface Documento {
  id?: string;
  tipo: 'cpf' | 'cnpj' | 'rg' | 'ie' | 'im';
  numero: string;
}

interface Contato {
  id?: string;
  tipo: 'email' | 'telefone' | 'celular' | 'whatsapp';
  valor: string;
  principal: boolean;
}

interface Endereco {
  id?: string;
  tipo: 'residencial' | 'comercial' | 'correspondencia';
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  principal: boolean;
}

interface PessoaFormData {
  id?: string;
  tipo: 'fisica' | 'juridica';
  nome: string;
  nomeFantasia: string;
  observacoes: string;
  documentos: Documento[];
  contatos: Contato[];
  enderecos: Endereco[];
  dataInicioDesenvolvimento: string;
  tiposMediunidade: string[];
  observacoesMediunidade: string;
  grupoEstudoId: string;
}

interface Warning {
  campo: string;
  mensagem: string;
  tipo: 'info' | 'warning' | 'bloqueio';
}

interface DuplicidadeInfo {
  encontrado: boolean;
  pessoaId?: string;
  nome?: string;
  ativo?: boolean;
  inativo?: boolean;
  documentoMascarado?: string;
}

interface DuplicidadeNomeInfo {
  possiveis: { id: string; nome: string; ativo: boolean }[];
}

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

interface PessoaFormProps {
  pessoaId?: string;
  initialData?: Partial<PessoaFormData>;
  onSuccess?: (pessoaId: string) => void;
  onCancel?: () => void;
  mode?: 'create' | 'edit';
}

const DOCUMENTO_LABELS: Record<string, string> = {
  cpf: 'CPF',
  cnpj: 'CNPJ',
  rg: 'RG',
  ie: 'Inscrição Estadual',
  im: 'Inscrição Municipal',
};

const CONTATO_LABELS: Record<string, string> = {
  email: '📧 E-mail',
  telefone: '📞 Telefone Fixo',
  celular: '📱 Celular',
  whatsapp: '💬 WhatsApp',
};

const ENDERECO_LABELS: Record<string, string> = {
  residencial: '🏠 Residencial',
  comercial: '🏢 Comercial',
  correspondencia: '📬 Correspondência',
};

const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];

export function PessoaForm({ pessoaId, initialData, onSuccess, onCancel, mode = 'create' }: PessoaFormProps) {
  const utils = trpc.useUtils();
  
  const [form, setForm] = useState<PessoaFormData>({
    tipo: initialData?.tipo || 'fisica',
    nome: initialData?.nome || '',
    nomeFantasia: initialData?.nomeFantasia || '',
    observacoes: initialData?.observacoes || '',
    documentos: initialData?.documentos || [],
    contatos: initialData?.contatos || [],
    enderecos: initialData?.enderecos || [],
    dataInicioDesenvolvimento: initialData?.dataInicioDesenvolvimento || '',
    tiposMediunidade: initialData?.tiposMediunidade || [],
    observacoesMediunidade: initialData?.observacoesMediunidade || '',
    grupoEstudoId: initialData?.grupoEstudoId || '',
  });

  // Track initial form state for dirty checking
  const initialFormRef = useRef<string>(JSON.stringify(form));
  const [isDirty, setIsDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [exitAction, setExitAction] = useState<(() => void) | null>(null);

  // Duplicity detection
  const [duplicidade, setDuplicidade] = useState<DuplicidadeInfo | null>(null);
  const [ignorarDuplicidade, setIgnorarDuplicidade] = useState(false);
  const [duplicidadeNome, setDuplicidadeNome] = useState<DuplicidadeNomeInfo | null>(null);
  const [ignorarDuplicidadeNome, setIgnorarDuplicidadeNome] = useState(false);

  // Warnings (non-blocking)
  const [warnings, setWarnings] = useState<Warning[]>([]);

  // Errors (blocking)
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: gruposEstudo } = trpc.gruposEstudo.list.useQuery();
  const [openSections, setOpenSections] = useState<string[]>(['dados-basicos']);

  // Load existing data when editing
  const { data: pessoaData, isLoading } = trpc.pessoas.getFullById.useQuery(pessoaId!, {
    enabled: !!pessoaId && mode === 'edit',
  });

  // Check duplicity mutation
  const checkDuplicidadeMutation = trpc.pessoas.checkDuplicidade.useQuery(
    {
      documento: form.documentos.find(d => d.tipo === 'cpf' || d.tipo === 'cnpj')?.numero || '',
      tipo: form.documentos.find(d => d.tipo === 'cpf')?.numero ? 'cpf' : 'cnpj',
      excluirPessoaId: pessoaId,
    },
    {
      enabled: false, // Manual trigger
    }
  );

  useEffect(() => {
    if (pessoaData) {
      const newForm = {
        tipo: pessoaData.tipo,
        nome: pessoaData.nome,
        nomeFantasia: pessoaData.nomeFantasia || '',
        observacoes: pessoaData.observacoes || '',
        documentos: pessoaData.documentos.map(d => ({ id: d.id, tipo: d.tipo, numero: d.numero })),
        contatos: pessoaData.contatos.map(c => ({ id: c.id, tipo: c.tipo, valor: c.valor, principal: c.principal })),
        enderecos: pessoaData.enderecos.map(e => ({
          id: e.id, tipo: e.tipo, logradouro: e.logradouro, numero: e.numero || '',
          complemento: e.complemento || '', bairro: e.bairro || '', cidade: e.cidade,
          uf: e.uf, cep: e.cep || '', principal: e.principal,
        })),
        dataInicioDesenvolvimento: pessoaData.dataInicioDesenvolvimento || '',
        tiposMediunidade: pessoaData.tiposMediunidade || [],
        observacoesMediunidade: pessoaData.observacoesMediunidade || '',
        grupoEstudoId: pessoaData.grupoEstudoId || '',
      };
      setForm(newForm);
      initialFormRef.current = JSON.stringify(newForm);
      setIsDirty(false);
    }
  }, [pessoaData]);

  // Track form changes for dirty state
  useEffect(() => {
    const currentFormStr = JSON.stringify(form);
    setIsDirty(currentFormStr !== initialFormRef.current);
  }, [form]);

  // Autosave timer (30 seconds)
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    if (isDirty && mode === 'edit' && pessoaId) {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = setTimeout(() => {
        handleSaveDraft(true);
      }, 30000);
    }
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [isDirty, form, mode, pessoaId]);

  // Browser beforeunload protection
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Mutations
  const createMutation = trpc.pessoas.create.useMutation({
    onSuccess: (data) => {
      toast.success('Pessoa cadastrada com sucesso!');
      utils.pessoas.list.invalidate();
      initialFormRef.current = JSON.stringify(form);
      setIsDirty(false);
      onSuccess?.(data.id);
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.pessoas.update.useMutation({
    onSuccess: () => {
      toast.success('Dados atualizados!');
      utils.pessoas.list.invalidate();
      utils.pessoas.getFullById.invalidate(pessoaId);
      initialFormRef.current = JSON.stringify(form);
      setIsDirty(false);
      setLastSaved(new Date());
      onSuccess?.(pessoaId!);
    },
    onError: (err) => toast.error(err.message),
  });

  const saveDraftMutation = trpc.pessoas.saveDraft.useMutation({
    onSuccess: (data) => {
      if (!isSavingDraft) toast.success('Rascunho salvo!');
      setLastSaved(new Date());
      initialFormRef.current = JSON.stringify(form);
      setIsDirty(false);
      if (data.created && !pessoaId) {
        onSuccess?.(data.id);
      }
    },
    onError: (err) => {
      if (!isSavingDraft) toast.error(err.message);
    },
  });

  const addDocumentoMutation = trpc.pessoas.addDocumento.useMutation({
    onSuccess: () => utils.pessoas.getFullById.invalidate(pessoaId),
    onError: (err) => toast.error(err.message),
  });

  const removeDocumentoMutation = trpc.pessoas.removeDocumento.useMutation({
    onSuccess: () => utils.pessoas.getFullById.invalidate(pessoaId),
  });

  const addContatoMutation = trpc.pessoas.addContato.useMutation({
    onSuccess: () => utils.pessoas.getFullById.invalidate(pessoaId),
    onError: (err) => toast.error(err.message),
  });

  const removeContatoMutation = trpc.pessoas.removeContato.useMutation({
    onSuccess: () => utils.pessoas.getFullById.invalidate(pessoaId),
  });

  const addEnderecoMutation = trpc.pessoas.addEndereco.useMutation({
    onSuccess: () => utils.pessoas.getFullById.invalidate(pessoaId),
    onError: (err) => toast.error(err.message),
  });

  const removeEnderecoMutation = trpc.pessoas.removeEndereco.useMutation({
    onSuccess: () => utils.pessoas.getFullById.invalidate(pessoaId),
  });

  // Handle save draft
  const handleSaveDraft = useCallback((silent = false) => {
    if (silent) setIsSavingDraft(true);
    saveDraftMutation.mutate({
      id: pessoaId,
      tipo: form.tipo,
      nome: form.nome,
      nomeFantasia: form.nomeFantasia,
      observacoes: form.observacoes,
    }, {
      onSettled: () => setIsSavingDraft(false),
    });
  }, [form, pessoaId, saveDraftMutation]);

  // Check duplicity on document blur
  const handleDocumentoBlur = useCallback(async (doc: Documento) => {
    if ((doc.tipo === 'cpf' || doc.tipo === 'cnpj') && doc.numero.length >= 11) {
      try {
        const result = await utils.client.pessoas.checkDuplicidade.query({
          documento: doc.numero,
          tipo: doc.tipo,
          excluirPessoaId: pessoaId,
        });
        if (result.encontrado && !ignorarDuplicidade) {
          setDuplicidade(result);
        } else {
          setDuplicidade(null);
        }
      } catch {
        // Ignore errors
      }
    }
  }, [pessoaId, ignorarDuplicidade, utils.client.pessoas.checkDuplicidade]);

  // Check duplicity on name blur
  const handleNomeBlur = useCallback(async () => {
    if (form.nome.length >= 5 && !ignorarDuplicidadeNome) {
      try {
        const result = await utils.client.pessoas.checkDuplicidadeNome.query({
          nome: form.nome,
          excluirPessoaId: pessoaId,
        });
        if (result.possiveis.length > 0) {
          setDuplicidadeNome(result);
        } else {
          setDuplicidadeNome(null);
        }
      } catch {
        // Ignore errors
      }
    }
  }, [form.nome, pessoaId, ignorarDuplicidadeNome, utils.client.pessoas.checkDuplicidadeNome]);

  // Calculate warnings (non-blocking)
  const calculateWarnings = useCallback((): Warning[] => {
    const w: Warning[] = [];
    
    // Check CPF/CNPJ
    const temCpfCnpj = form.documentos.some(d => (d.tipo === 'cpf' || d.tipo === 'cnpj') && d.numero.length >= 11);
    if (!temCpfCnpj) {
      w.push({
        campo: 'documento',
        mensagem: form.tipo === 'fisica' ? 'CPF não informado. Isso limitará emissão de recibos.' : 'CNPJ não informado.',
        tipo: 'warning',
      });
    }

    // Check contato principal
    if (form.contatos.length > 0 && !form.contatos.some(c => c.principal)) {
      w.push({
        campo: 'contato',
        mensagem: 'Nenhum contato marcado como principal.',
        tipo: 'warning',
      });
    }

    // No contacts
    if (form.contatos.length === 0) {
      w.push({
        campo: 'contato',
        mensagem: 'Nenhum contato cadastrado.',
        tipo: 'info',
      });
    }

    // No address
    if (form.enderecos.length === 0) {
      w.push({
        campo: 'endereco',
        mensagem: 'Nenhum endereço cadastrado.',
        tipo: 'info',
      });
    }

    return w;
  }, [form]);

  useEffect(() => {
    setWarnings(calculateWarnings());
  }, [calculateWarnings]);

  // Validation (blocking only critical)
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!form.nome.trim() || form.nome.length < 3) {
      newErrors.nome = 'Nome deve ter no mínimo 3 caracteres';
    }
    
    // Validate documents with CPF/CNPJ digit verification
    form.documentos.forEach((doc, i) => {
      if (doc.numero.length > 0) {
        const result = validateDocument(doc.tipo, doc.numero);
        if (!result.valid && result.message) {
          newErrors[`doc_${i}`] = result.message;
        }
      }
    });

    // Validate contacts with email and phone validation
    form.contatos.forEach((cont, i) => {
      if (cont.valor.length > 0) {
        const result = validateContact(cont.tipo, cont.valor);
        if (!result.valid && result.message) {
          newErrors[`contato_${i}`] = result.message;
        }
      }
    });

    // Validate addresses
    form.enderecos.forEach((end, i) => {
      if (!end.logradouro.trim()) newErrors[`end_${i}_logradouro`] = 'Logradouro é obrigatório';
      if (!end.cidade.trim()) newErrors[`end_${i}_cidade`] = 'Cidade é obrigatória';
      if (!end.uf) newErrors[`end_${i}_uf`] = 'UF é obrigatório';
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle cancel with dirty check
  const handleCancel = () => {
    if (isDirty) {
      setExitAction(() => onCancel);
      setShowExitModal(true);
    } else {
      onCancel?.();
    }
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      // Focus first field with error
      const firstError = document.querySelector('[class*="border-destructive"]') as HTMLElement;
      if (firstError) {
        firstError.focus();
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      toast.error('Verifique os campos destacados e corrija os erros');
      return;
    }

    if (mode === 'create') {
      createMutation.mutate({
        nome: form.nome.trim(),
        tipo: form.tipo,
        cpfCnpj: form.documentos.find(d => d.tipo === 'cpf' || d.tipo === 'cnpj')?.numero,
        email: form.contatos.find(c => c.tipo === 'email')?.valor,
        telefone: form.contatos.find(c => c.tipo === 'celular' || c.tipo === 'telefone')?.valor,
        observacoes: form.observacoes || undefined,
      });
    } else {
      updateMutation.mutate({
        id: pessoaId!,
        nome: form.nome.trim(),
        nomeFantasia: form.nomeFantasia || null,
        tipo: form.tipo,
        observacoes: form.observacoes || null,
        dataInicioDesenvolvimento: form.dataInicioDesenvolvimento || null,
        tiposMediunidade: form.tiposMediunidade.length > 0 ? form.tiposMediunidade : null,
        observacoesMediunidade: form.observacoesMediunidade || null,
        grupoEstudoId: form.grupoEstudoId || null,
      });
    }
  };

  // Document handlers
  const addDocumento = () => {
    const defaultTipo = form.tipo === 'fisica' ? 'cpf' : 'cnpj';
    if (mode === 'edit' && pessoaId) {
      addDocumentoMutation.mutate({ pessoaId, tipo: defaultTipo, numero: '' });
    } else {
      setForm(f => ({ ...f, documentos: [...f.documentos, { tipo: defaultTipo, numero: '' }] }));
    }
  };

  const removeDocumento = (index: number) => {
    const doc = form.documentos[index];
    if (doc.id && mode === 'edit') {
      removeDocumentoMutation.mutate(doc.id);
    }
    setForm(f => ({ ...f, documentos: f.documentos.filter((_, i) => i !== index) }));
  };

  // Contact handlers
  const addContato = () => {
    if (mode === 'edit' && pessoaId) {
      addContatoMutation.mutate({ pessoaId, tipo: 'celular', valor: '', principal: form.contatos.length === 0 });
    } else {
      setForm(f => ({ ...f, contatos: [...f.contatos, { tipo: 'celular', valor: '', principal: f.contatos.length === 0 }] }));
    }
  };

  const removeContato = (index: number) => {
    const cont = form.contatos[index];
    if (cont.id && mode === 'edit') {
      removeContatoMutation.mutate(cont.id);
    }
    setForm(f => ({ ...f, contatos: f.contatos.filter((_, i) => i !== index) }));
  };

  // Address handlers
  const addEndereco = () => {
    const newEnd: Endereco = { tipo: 'residencial', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '', cep: '', principal: form.enderecos.length === 0 };
    if (mode === 'edit' && pessoaId) {
      addEnderecoMutation.mutate({ pessoaId, ...newEnd });
    } else {
      setForm(f => ({ ...f, enderecos: [...f.enderecos, newEnd] }));
    }
  };

  const removeEndereco = (index: number) => {
    const end = form.enderecos[index];
    if (end.id && mode === 'edit') {
      removeEnderecoMutation.mutate(end.id);
    }
    setForm(f => ({ ...f, enderecos: f.enderecos.filter((_, i) => i !== index) }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const isPending = createMutation.isPending || updateMutation.isPending || saveDraftMutation.isPending;
  const totalPendencias = warnings.length;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Status Bar */}
      <div className="flex items-center justify-between gap-3 px-1 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          {isDirty && (
            <span className="flex items-center gap-1 text-amber-600">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              Alterações não salvas
            </span>
          )}
          {lastSaved && !isDirty && (
            <span className="flex items-center gap-1 text-emerald-600">
              <Check className="h-3 w-3" />
              Salvo às {lastSaved.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          {isSavingDraft && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3 animate-spin" />
              Salvando...
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {mode === 'create' && (
            <Badge variant="outline" className="text-[10px]">Novo cadastro</Badge>
          )}
        </div>
      </div>

      {/* Pendências Banner */}
      {totalPendencias > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-sm text-amber-800">
                {totalPendencias} {totalPendencias === 1 ? 'item pendente' : 'itens pendentes'} para cadastro completo
              </p>
              <ul className="mt-1 space-y-0.5">
                {warnings.map((w, i) => (
                  <li key={i} className={cn(
                    'text-xs flex items-center gap-1.5',
                    w.tipo === 'warning' ? 'text-amber-700' : 'text-amber-600'
                  )}>
                    <span className={cn(
                      'w-1.5 h-1.5 rounded-full',
                      w.tipo === 'warning' ? 'bg-amber-500' : 'bg-amber-400'
                    )} />
                    {w.mensagem}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Duplicidade Banner */}
      {duplicidade?.encontrado && !ignorarDuplicidade && (
        <div className={cn(
          'rounded-lg border p-4',
          duplicidade.ativo ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-slate-50'
        )}>
          <div className="flex items-start gap-3">
            <AlertTriangle className={cn('h-5 w-5 shrink-0', duplicidade.ativo ? 'text-amber-600' : 'text-slate-500')} />
            <div className="flex-1">
              <p className="font-medium text-sm">
                {duplicidade.ativo ? 'Cadastro existente encontrado' : 'Encontramos cadastro inativo'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {duplicidade.nome} ({duplicidade.documentoMascarado})
              </p>
              <div className="flex gap-2 mt-3">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    // Navigate to existing pessoa
                    window.open(`/pessoas?id=${duplicidade.pessoaId}`, '_blank');
                  }}
                >
                  <ExternalLink className="h-3 w-3 mr-1.5" />
                  Ver cadastro
                </Button>
                {duplicidade.inativo && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-emerald-500 text-emerald-600"
                    onClick={() => {
                      // TODO: Implement reactivate
                      toast.info('Reativar pelo cadastro existente');
                    }}
                  >
                    <RotateCcw className="h-3 w-3 mr-1.5" />
                    Reativar
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-muted-foreground"
                  onClick={() => {
                    setIgnorarDuplicidade(true);
                    setDuplicidade(null);
                  }}
                >
                  É outra pessoa
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Duplicidade por Nome Banner */}
      {duplicidadeNome && duplicidadeNome.possiveis.length > 0 && !ignorarDuplicidadeNome && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-blue-600" />
            <div className="flex-1">
              <p className="font-medium text-sm text-blue-800">
                Possíveis cadastros similares encontrados
              </p>
              <p className="text-xs text-blue-600 mt-0.5">
                Verifique se algum destes já é a pessoa que você está cadastrando:
              </p>
              <div className="mt-2 space-y-1">
                {duplicidadeNome.possiveis.map(p => (
                  <div key={p.id} className="flex items-center gap-2 text-sm">
                    <span className={cn(!p.ativo && 'text-muted-foreground line-through')}>
                      {p.nome}
                    </span>
                    {!p.ativo && <Badge variant="outline" className="text-[10px]">Inativo</Badge>}
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-xs text-blue-600"
                      onClick={() => window.open(`/pessoas?id=${p.id}`, '_blank')}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Ver
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="mt-2 text-muted-foreground"
                onClick={() => {
                  setIgnorarDuplicidadeNome(true);
                  setDuplicidadeNome(null);
                }}
              >
                Nenhum destes é a pessoa
              </Button>
            </div>
          </div>
        </div>
      )}

      <Accordion type="multiple" value={openSections} onValueChange={setOpenSections} className="space-y-2">
        {/* Dados Básicos */}
        <AccordionItem value="dados-basicos" className="border rounded-lg px-4">
          <AccordionTrigger icon={form.tipo === 'fisica' ? '👤' : '🏢'}>
            Dados Básicos
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pt-2">
              <FormRow>
                <FormField error={errors.tipo}>
                  <LabelWithHelp htmlFor="tipo" label="Tipo de Pessoa" help="Pessoa Física: indivíduo (CPF). Pessoa Jurídica: empresa (CNPJ)." required />
                  <Select value={form.tipo} onValueChange={(v: 'fisica' | 'juridica') => setForm(f => ({ ...f, tipo: v }))}>
                    <SelectTrigger id="tipo">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fisica"><User className="h-4 w-4 inline mr-2" />Pessoa Física</SelectItem>
                      <SelectItem value="juridica"><Building2 className="h-4 w-4 inline mr-2" />Pessoa Jurídica</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
              </FormRow>

              <FormField error={errors.nome}>
                <LabelWithHelp htmlFor="nome" label={form.tipo === 'fisica' ? 'Nome Completo' : 'Razão Social'} 
                  help={form.tipo === 'fisica' ? 'Nome completo conforme documento de identidade.' : 'Razão social conforme CNPJ.'} required />
                <Input id="nome" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  onBlur={handleNomeBlur}
                  placeholder={form.tipo === 'fisica' ? 'Ex: Maria da Silva Santos' : 'Ex: Empresa ABC Ltda'}
                  className={cn(errors.nome && 'border-destructive')} />
              </FormField>

              <FormField>
                <LabelWithHelp htmlFor="nomeFantasia" label={form.tipo === 'fisica' ? 'Apelido' : 'Nome Fantasia'}
                  help={form.tipo === 'fisica' ? 'Como a pessoa é conhecida na comunidade.' : 'Nome fantasia da empresa.'} />
                <Input id="nomeFantasia" value={form.nomeFantasia} onChange={e => setForm(f => ({ ...f, nomeFantasia: e.target.value }))}
                  placeholder={form.tipo === 'fisica' ? 'Ex: Dona Maria' : 'Ex: Loja do Zé'} />
              </FormField>

              <FormField>
                <LabelWithHelp htmlFor="observacoes" label="Observações" help="Anotações internas sobre esta pessoa. Não aparece em documentos." />
                <Textarea id="observacoes" value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
                  placeholder="Anotações livres..." rows={2} />
              </FormField>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Documentos */}
        <AccordionItem value="documentos" className="border rounded-lg px-4">
          <AccordionTrigger icon="📄" badge={form.documentos.length > 0 ? <Badge variant="secondary">{form.documentos.length}</Badge> : undefined}>
            Documentos
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pt-2">
              <p className="text-xs text-muted-foreground">
                {form.tipo === 'fisica' ? 'CPF é necessário para emissão de recibos de doação.' : 'CNPJ é obrigatório para empresas.'}
              </p>
              
              <DynamicList
                items={form.documentos}
                onAdd={addDocumento}
                onRemove={removeDocumento}
                addLabel="Adicionar Documento"
                emptyMessage="Nenhum documento cadastrado"
                maxItems={5}
                renderItem={(doc, index) => (
                  <div className="flex gap-3 items-start">
                    <div className="w-32">
                      <Select value={doc.tipo} onValueChange={(v: Documento['tipo']) => {
                        setForm(f => ({ ...f, documentos: f.documentos.map((d, i) => i === index ? { ...d, tipo: v } : d) }));
                      }}>
                        <SelectTrigger className="text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(DOCUMENTO_LABELS).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1">
                      <Input 
                        value={formatDocument(doc.tipo, doc.numero)} 
                        onChange={e => {
                          const rawValue = e.target.value.replace(/\D/g, '');
                          setForm(f => ({ ...f, documentos: f.documentos.map((d, i) => i === index ? { ...d, numero: rawValue } : d) }));
                        }}
                        onBlur={() => handleDocumentoBlur(doc)}
                        placeholder={doc.tipo === 'cpf' ? '000.000.000-00' : doc.tipo === 'cnpj' ? '00.000.000/0000-00' : 'Número'} 
                        className={cn(errors[`doc_${index}`] && 'border-destructive')} 
                        maxLength={doc.tipo === 'cpf' ? 14 : doc.tipo === 'cnpj' ? 18 : 20} />
                      {errors[`doc_${index}`] && <p className="text-xs text-destructive mt-1">{errors[`doc_${index}`]}</p>}
                    </div>
                  </div>
                )}
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Contatos */}
        <AccordionItem value="contatos" className="border rounded-lg px-4">
          <AccordionTrigger icon="📞" badge={form.contatos.length > 0 ? <Badge variant="secondary">{form.contatos.length}</Badge> : undefined}>
            Contatos
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pt-2">
              <p className="text-xs text-muted-foreground">
                E-mail é importante para envio de recibos digitais. Marque o contato principal.
              </p>
              
              <DynamicList
                items={form.contatos}
                onAdd={addContato}
                onRemove={removeContato}
                addLabel="Adicionar Contato"
                emptyMessage="Nenhum contato cadastrado"
                maxItems={10}
                renderItem={(cont, index) => (
                  <div className="space-y-2">
                    <div className="flex gap-3 items-start">
                      <div className="w-36">
                        <Select value={cont.tipo} onValueChange={(v: Contato['tipo']) => {
                          setForm(f => ({ ...f, contatos: f.contatos.map((c, i) => i === index ? { ...c, tipo: v } : c) }));
                        }}>
                          <SelectTrigger className="text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(CONTATO_LABELS).map(([k, v]) => (
                              <SelectItem key={k} value={k}>{v}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex-1">
                        <Input value={cont.tipo === 'email' ? cont.valor : formatContact(cont.tipo, cont.valor)} 
                          onChange={e => {
                            const value = cont.tipo === 'email' ? e.target.value : e.target.value.replace(/\D/g, '');
                            setForm(f => ({ ...f, contatos: f.contatos.map((c, i) => i === index ? { ...c, valor: value } : c) }));
                          }} placeholder={cont.tipo === 'email' ? 'email@exemplo.com' : '(00) 00000-0000'} 
                          className={cn(errors[`contato_${index}`] && 'border-destructive')}
                          maxLength={cont.tipo === 'email' ? 100 : 15} />
                        {errors[`contato_${index}`] && <p className="text-xs text-destructive mt-1">{errors[`contato_${index}`]}</p>}
                      </div>
                    </div>
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <Checkbox checked={cont.principal} onCheckedChange={(checked) => {
                        setForm(f => ({ ...f, contatos: f.contatos.map((c, i) => ({ ...c, principal: i === index ? !!checked : false })) }));
                      }} />
                      <Star className={cn('h-3 w-3', cont.principal ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground')} />
                      <span>Contato principal</span>
                    </label>
                  </div>
                )}
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Endereços */}
        <AccordionItem value="enderecos" className="border rounded-lg px-4">
          <AccordionTrigger icon="📍" badge={form.enderecos.length > 0 ? <Badge variant="secondary">{form.enderecos.length}</Badge> : undefined}>
            Endereços
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pt-2">
              <p className="text-xs text-muted-foreground">
                Endereço completo é necessário para emissão de recibos e correspondências oficiais.
              </p>
              
              <DynamicList
                items={form.enderecos}
                onAdd={addEndereco}
                onRemove={removeEndereco}
                addLabel="Adicionar Endereço"
                emptyMessage="Nenhum endereço cadastrado"
                maxItems={5}
                renderItem={(end, index) => (
                  <div className="space-y-3">
                    <div className="flex gap-3 items-center">
                      <Select value={end.tipo} onValueChange={(v: Endereco['tipo']) => {
                        setForm(f => ({ ...f, enderecos: f.enderecos.map((e, i) => i === index ? { ...e, tipo: v } : e) }));
                      }}>
                        <SelectTrigger className="w-44 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(ENDERECO_LABELS).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <label className="flex items-center gap-2 text-xs cursor-pointer ml-auto">
                        <Checkbox checked={end.principal} onCheckedChange={(checked) => {
                          setForm(f => ({ ...f, enderecos: f.enderecos.map((e, i) => ({ ...e, principal: i === index ? !!checked : false })) }));
                        }} />
                        <Star className={cn('h-3 w-3', end.principal ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground')} />
                        <span>Principal</span>
                      </label>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                      <div className="sm:col-span-3">
                        <Input value={end.logradouro} onChange={e => {
                          setForm(f => ({ ...f, enderecos: f.enderecos.map((en, i) => i === index ? { ...en, logradouro: e.target.value } : en) }));
                        }} placeholder="Rua, Avenida, Praça..." className={cn('text-sm', errors[`end_${index}_logradouro`] && 'border-destructive')} />
                      </div>
                      <Input value={end.numero} onChange={e => {
                        setForm(f => ({ ...f, enderecos: f.enderecos.map((en, i) => i === index ? { ...en, numero: e.target.value } : en) }));
                      }} placeholder="Nº" className="text-sm" />
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <Input value={end.complemento} onChange={e => {
                        setForm(f => ({ ...f, enderecos: f.enderecos.map((en, i) => i === index ? { ...en, complemento: e.target.value } : en) }));
                      }} placeholder="Complemento" className="text-sm" />
                      <Input value={end.bairro} onChange={e => {
                        setForm(f => ({ ...f, enderecos: f.enderecos.map((en, i) => i === index ? { ...en, bairro: e.target.value } : en) }));
                      }} placeholder="Bairro" className="text-sm" />
                      <Input value={end.cidade} onChange={e => {
                        setForm(f => ({ ...f, enderecos: f.enderecos.map((en, i) => i === index ? { ...en, cidade: e.target.value } : en) }));
                      }} placeholder="Cidade" className={cn('text-sm', errors[`end_${index}_cidade`] && 'border-destructive')} />
                      <Select value={end.uf} onValueChange={(v) => {
                        setForm(f => ({ ...f, enderecos: f.enderecos.map((en, i) => i === index ? { ...en, uf: v } : en) }));
                      }}>
                        <SelectTrigger className={cn('text-sm', errors[`end_${index}_uf`] && 'border-destructive')}>
                          <SelectValue placeholder="UF" />
                        </SelectTrigger>
                        <SelectContent>
                          {UFS.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <Input value={end.cep} onChange={e => {
                      setForm(f => ({ ...f, enderecos: f.enderecos.map((en, i) => i === index ? { ...en, cep: e.target.value } : en) }));
                    }} placeholder="CEP (00000-000)" className="text-sm w-32" />
                  </div>
                )}
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Mediunidade - Centro Espírita */}
        {form.tipo === 'fisica' && (
          <AccordionItem value="mediunidade" className="border rounded-lg px-4">
            <AccordionTrigger icon="✨" badge={form.tiposMediunidade.length > 0 ? <Badge variant="secondary">{form.tiposMediunidade.length}</Badge> : undefined}>
              Mediunidade
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 pt-2">
                <p className="text-xs text-muted-foreground">
                  Informações sobre o desenvolvimento mediúnico. Estes dados são sensíveis e tratados conforme LGPD.
                </p>
                
                <FormField>
                  <LabelWithHelp htmlFor="dataInicioDesenvolvimento" label="Início do Desenvolvimento"
                    help="Data que iniciou o desenvolvimento mediúnico na casa." />
                  <Input id="dataInicioDesenvolvimento" type="date" value={form.dataInicioDesenvolvimento}
                    onChange={e => setForm(f => ({ ...f, dataInicioDesenvolvimento: e.target.value }))} className="w-44" />
                </FormField>

                <FormField>
                  <LabelWithHelp label="Tipos de Mediunidade" help="Selecione os tipos de mediunidade identificados." />
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {MEDIUNIDADE_TIPOS.map(tipo => (
                      <label key={tipo.value} className={cn(
                        'flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors text-sm',
                        form.tiposMediunidade.includes(tipo.value) 
                          ? 'bg-violet-100 border-violet-300 text-violet-800' 
                          : 'hover:bg-muted/50'
                      )}>
                        <Checkbox 
                          checked={form.tiposMediunidade.includes(tipo.value)}
                          onCheckedChange={(checked) => {
                            setForm(f => ({
                              ...f,
                              tiposMediunidade: checked 
                                ? [...f.tiposMediunidade, tipo.value]
                                : f.tiposMediunidade.filter(t => t !== tipo.value)
                            }));
                          }}
                        />
                        <span>{tipo.label}</span>
                      </label>
                    ))}
                  </div>
                </FormField>

                <FormField>
                  <LabelWithHelp label="Grupo de Estudo" help="Grupo de estudo doutrinário que a pessoa participa." />
                  <Select value={form.grupoEstudoId} onValueChange={(v) => setForm(f => ({ ...f, grupoEstudoId: v === 'none' ? '' : v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um grupo..." />
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
                </FormField>

                <FormField>
                  <LabelWithHelp htmlFor="observacoesMediunidade" label="Observações sobre Mediunidade"
                    help="Anotações do dirigente sobre o desenvolvimento mediúnico." />
                  <Textarea id="observacoesMediunidade" value={form.observacoesMediunidade}
                    onChange={e => setForm(f => ({ ...f, observacoesMediunidade: e.target.value }))}
                    placeholder="Observações reservadas sobre o desenvolvimento..." rows={3} />
                </FormField>
              </div>
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>

      {/* Actions */}
      <div className="flex justify-between gap-3 pt-4 border-t">
        <div className="flex gap-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancelar
            </Button>
          )}
          {mode === 'edit' && isDirty && (
            <Button 
              type="button" 
              variant="ghost" 
              onClick={() => handleSaveDraft(false)}
              disabled={isPending}
              className="text-muted-foreground"
            >
              <Save className="h-4 w-4 mr-2" />
              Salvar rascunho
            </Button>
          )}
        </div>
        <Button type="submit" disabled={isPending} className="bg-violet-600 hover:bg-violet-700">
          {isPending ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Salvando...
            </>
          ) : (
            <>
              <Check className="h-4 w-4 mr-2" />
              {mode === 'create' ? 'Cadastrar' : 'Salvar Alterações'}
            </>
          )}
        </Button>
      </div>

      {/* Exit Confirmation Modal */}
      <Dialog open={showExitModal} onOpenChange={setShowExitModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Alterações não salvas
            </DialogTitle>
            <DialogDescription>
              Você tem alterações que ainda não foram salvas. O que deseja fazer?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => {
              setShowExitModal(false);
              exitAction?.();
            }}>
              Sair sem salvar
            </Button>
            <Button variant="outline" onClick={() => {
              handleSaveDraft(false);
              setShowExitModal(false);
              exitAction?.();
            }}>
              <Save className="h-4 w-4 mr-2" />
              Salvar rascunho e sair
            </Button>
            <Button onClick={() => setShowExitModal(false)}>
              Continuar editando
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}
