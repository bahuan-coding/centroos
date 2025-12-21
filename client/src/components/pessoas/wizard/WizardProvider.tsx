import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { validateDocument, validateContact } from '@/lib/validators';

// Types
export interface Documento {
  id?: string;
  tipo: 'cpf' | 'cnpj' | 'rg' | 'ie' | 'im';
  numero: string;
}

export interface Contato {
  id?: string;
  tipo: 'email' | 'telefone' | 'celular' | 'whatsapp';
  valor: string;
  principal: boolean;
}

export interface Endereco {
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

export interface PessoaFormData {
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

export interface Warning {
  campo: string;
  mensagem: string;
  tipo: 'info' | 'warning' | 'bloqueio';
  step?: number;
}

export interface DuplicidadeInfo {
  encontrado: boolean;
  pessoaId?: string;
  nome?: string;
  ativo?: boolean;
  inativo?: boolean;
  documentoMascarado?: string;
}

export interface DuplicidadeNomeInfo {
  possiveis: { id: string; nome: string; ativo: boolean }[];
}

export type StepId = 'identificacao' | 'contatos' | 'enderecos' | 'complementos' | 'mediunidade' | 'revisao';

export interface StepConfig {
  id: StepId;
  label: string;
  icon: string;
  optional?: boolean;
}

const STEPS_PF: StepConfig[] = [
  { id: 'identificacao', label: 'Identificação', icon: '👤' },
  { id: 'contatos', label: 'Contatos', icon: '📞' },
  { id: 'enderecos', label: 'Endereços', icon: '📍' },
  { id: 'complementos', label: 'Complementos', icon: '📄', optional: true },
  { id: 'mediunidade', label: 'Mediunidade', icon: '✨', optional: true },
  { id: 'revisao', label: 'Revisão', icon: '✅' },
];

const STEPS_PJ: StepConfig[] = [
  { id: 'identificacao', label: 'Identificação', icon: '🏢' },
  { id: 'contatos', label: 'Contatos', icon: '📞' },
  { id: 'enderecos', label: 'Endereços', icon: '📍' },
  { id: 'complementos', label: 'Complementos', icon: '📄', optional: true },
  { id: 'revisao', label: 'Revisão', icon: '✅' },
];

interface WizardContextValue {
  // Form state
  form: PessoaFormData;
  setForm: React.Dispatch<React.SetStateAction<PessoaFormData>>;
  updateField: <K extends keyof PessoaFormData>(key: K, value: PessoaFormData[K]) => void;
  
  // Navigation
  currentStep: number;
  setCurrentStep: (step: number) => void;
  steps: StepConfig[];
  totalSteps: number;
  goNext: () => void;
  goBack: () => void;
  goToStep: (step: number) => void;
  canProceed: boolean;
  
  // Validation
  errors: Record<string, string>;
  warnings: Warning[];
  validateCurrentStep: () => boolean;
  
  // State
  isDirty: boolean;
  isSaving: boolean;
  lastSaved: Date | null;
  
  // Duplicity
  duplicidade: DuplicidadeInfo | null;
  setDuplicidade: React.Dispatch<React.SetStateAction<DuplicidadeInfo | null>>;
  ignorarDuplicidade: boolean;
  setIgnorarDuplicidade: React.Dispatch<React.SetStateAction<boolean>>;
  duplicidadeNome: DuplicidadeNomeInfo | null;
  setDuplicidadeNome: React.Dispatch<React.SetStateAction<DuplicidadeNomeInfo | null>>;
  ignorarDuplicidadeNome: boolean;
  setIgnorarDuplicidadeNome: React.Dispatch<React.SetStateAction<boolean>>;
  checkDuplicidade: (doc: Documento) => Promise<void>;
  checkDuplicidadeNome: () => Promise<void>;
  
  // Actions
  saveDraft: () => Promise<void>;
  submit: () => Promise<string | null>;
  
  // Refs for focus
  fieldRefs: React.MutableRefObject<Record<string, HTMLElement | null>>;
  focusField: (fieldId: string) => void;
}

const WizardContext = createContext<WizardContextValue | null>(null);

export function useWizard() {
  const ctx = useContext(WizardContext);
  if (!ctx) throw new Error('useWizard must be used within WizardProvider');
  return ctx;
}

const initialFormData: PessoaFormData = {
  tipo: 'fisica',
  nome: '',
  nomeFantasia: '',
  observacoes: '',
  documentos: [],
  contatos: [],
  enderecos: [],
  dataInicioDesenvolvimento: '',
  tiposMediunidade: [],
  observacoesMediunidade: '',
  grupoEstudoId: '',
};

interface WizardProviderProps {
  children: ReactNode;
  onSuccess?: (pessoaId: string) => void;
  onCancel?: () => void;
}

export function WizardProvider({ children, onSuccess }: WizardProviderProps) {
  const utils = trpc.useUtils();
  
  const [form, setForm] = useState<PessoaFormData>(initialFormData);
  const [currentStep, setCurrentStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  // Duplicity
  const [duplicidade, setDuplicidade] = useState<DuplicidadeInfo | null>(null);
  const [ignorarDuplicidade, setIgnorarDuplicidade] = useState(false);
  const [duplicidadeNome, setDuplicidadeNome] = useState<DuplicidadeNomeInfo | null>(null);
  const [ignorarDuplicidadeNome, setIgnorarDuplicidadeNome] = useState(false);
  
  const initialFormRef = useRef<string>(JSON.stringify(initialFormData));
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});
  
  // Steps based on tipo
  const steps = form.tipo === 'fisica' ? STEPS_PF : STEPS_PJ;
  const totalSteps = steps.length;
  
  // Mutations
  const createMutation = trpc.pessoas.createComplete.useMutation({
    onSuccess: (data) => {
      toast.success('Pessoa cadastrada com sucesso!');
      utils.pessoas.list.invalidate();
      initialFormRef.current = JSON.stringify(form);
      setIsDirty(false);
      onSuccess?.(data.id);
    },
    onError: (err) => toast.error(err.message),
  });
  
  const saveDraftMutation = trpc.pessoas.saveDraft.useMutation({
    onSuccess: () => {
      setLastSaved(new Date());
      initialFormRef.current = JSON.stringify(form);
      setIsDirty(false);
    },
    onError: (err) => toast.error(err.message),
  });
  
  // Track dirty state
  useEffect(() => {
    const currentFormStr = JSON.stringify(form);
    setIsDirty(currentFormStr !== initialFormRef.current);
  }, [form]);
  
  // Calculate warnings
  const calculateWarnings = useCallback((): Warning[] => {
    const w: Warning[] = [];
    
    const temCpfCnpj = form.documentos.some(d => (d.tipo === 'cpf' || d.tipo === 'cnpj') && d.numero.length >= 11);
    if (!temCpfCnpj) {
      w.push({
        campo: 'documento',
        mensagem: form.tipo === 'fisica' ? 'CPF não informado. Isso limitará emissão de recibos.' : 'CNPJ não informado.',
        tipo: 'warning',
        step: 0,
      });
    }
    
    if (form.contatos.length === 0) {
      w.push({ campo: 'contato', mensagem: 'Nenhum contato cadastrado.', tipo: 'info', step: 1 });
    } else if (!form.contatos.some(c => c.principal)) {
      w.push({ campo: 'contato', mensagem: 'Nenhum contato marcado como principal.', tipo: 'warning', step: 1 });
    }
    
    if (form.enderecos.length === 0) {
      w.push({ campo: 'endereco', mensagem: 'Nenhum endereço cadastrado.', tipo: 'info', step: 2 });
    }
    
    return w;
  }, [form]);
  
  useEffect(() => {
    setWarnings(calculateWarnings());
  }, [calculateWarnings]);
  
  // Validation
  const validateStep = (stepIndex: number): boolean => {
    const newErrors: Record<string, string> = {};
    const step = steps[stepIndex];
    
    if (step.id === 'identificacao') {
      if (!form.nome.trim() || form.nome.length < 3) {
        newErrors.nome = 'Nome deve ter no mínimo 3 caracteres';
      }
      form.documentos.forEach((doc, i) => {
        if (doc.numero.length > 0) {
          const result = validateDocument(doc.tipo, doc.numero);
          if (!result.valid && result.message) {
            newErrors[`doc_${i}`] = result.message;
          }
        }
      });
    }
    
    if (step.id === 'contatos') {
      form.contatos.forEach((cont, i) => {
        if (cont.valor.length > 0) {
          const result = validateContact(cont.tipo, cont.valor);
          if (!result.valid && result.message) {
            newErrors[`contato_${i}`] = result.message;
          }
        }
      });
    }
    
    if (step.id === 'enderecos') {
      form.enderecos.forEach((end, i) => {
        if (!end.logradouro.trim()) newErrors[`end_${i}_logradouro`] = 'Logradouro é obrigatório';
        if (!end.cidade.trim()) newErrors[`end_${i}_cidade`] = 'Cidade é obrigatória';
        if (!end.uf) newErrors[`end_${i}_uf`] = 'UF é obrigatório';
      });
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const validateCurrentStep = () => validateStep(currentStep);
  
  // Check duplicity
  const checkDuplicidade = async (doc: Documento) => {
    if ((doc.tipo === 'cpf' || doc.tipo === 'cnpj') && doc.numero.length >= 11) {
      try {
        const result = await utils.client.pessoas.checkDuplicidade.query({
          documento: doc.numero,
          tipo: doc.tipo,
        });
        if (result.encontrado && !ignorarDuplicidade) {
          setDuplicidade(result);
        } else {
          setDuplicidade(null);
        }
      } catch { /* ignore */ }
    }
  };
  
  const checkDuplicidadeNome = async () => {
    if (form.nome.length >= 5 && !ignorarDuplicidadeNome) {
      try {
        const result = await utils.client.pessoas.checkDuplicidadeNome.query({ nome: form.nome });
        if (result.possiveis.length > 0) {
          setDuplicidadeNome(result);
        } else {
          setDuplicidadeNome(null);
        }
      } catch { /* ignore */ }
    }
  };
  
  // Navigation
  const goNext = () => {
    if (validateCurrentStep() && currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    }
  };
  
  const goBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  const goToStep = (step: number) => {
    if (step >= 0 && step < totalSteps) {
      // Validate all previous steps
      for (let i = 0; i < step; i++) {
        if (!validateStep(i)) {
          setCurrentStep(i);
          return;
        }
      }
      setCurrentStep(step);
    }
  };
  
  const canProceed = Object.keys(errors).length === 0;
  
  // Update field helper
  const updateField = <K extends keyof PessoaFormData>(key: K, value: PessoaFormData[K]) => {
    setForm(f => ({ ...f, [key]: value }));
  };
  
  // Focus field
  const focusField = (fieldId: string) => {
    const el = fieldRefs.current[fieldId];
    if (el) {
      el.focus();
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };
  
  // Save draft
  const saveDraft = async () => {
    setIsSaving(true);
    try {
      await saveDraftMutation.mutateAsync({
        tipo: form.tipo,
        nome: form.nome,
        nomeFantasia: form.nomeFantasia,
        observacoes: form.observacoes,
      });
      toast.success('Rascunho salvo!');
    } finally {
      setIsSaving(false);
    }
  };
  
  // Submit
  const submit = async (): Promise<string | null> => {
    // Validate all steps
    for (let i = 0; i < totalSteps - 1; i++) {
      if (!validateStep(i)) {
        setCurrentStep(i);
        toast.error('Corrija os erros antes de cadastrar');
        return null;
      }
    }
    
    try {
      const result = await createMutation.mutateAsync({
        tipo: form.tipo,
        nome: form.nome.trim(),
        nomeFantasia: form.nomeFantasia?.trim() || undefined,
        observacoes: form.observacoes?.trim() || undefined,
        documentos: form.documentos
          .filter(d => d.numero.length > 0)
          .map(d => ({ tipo: d.tipo, numero: d.numero })),
        contatos: form.contatos
          .filter(c => c.valor.length > 0)
          .map(c => ({ tipo: c.tipo, valor: c.valor, principal: c.principal })),
        enderecos: form.enderecos
          .filter(e => e.logradouro.length > 0 && e.cidade.length > 0)
          .map(e => ({
            tipo: e.tipo,
            logradouro: e.logradouro,
            numero: e.numero || undefined,
            complemento: e.complemento || undefined,
            bairro: e.bairro || undefined,
            cidade: e.cidade,
            uf: e.uf,
            cep: e.cep || undefined,
            principal: e.principal,
          })),
        dataInicioDesenvolvimento: form.dataInicioDesenvolvimento || undefined,
        tiposMediunidade: form.tiposMediunidade.length > 0 ? form.tiposMediunidade : undefined,
        grupoEstudoId: form.grupoEstudoId || undefined,
        observacoesMediunidade: form.observacoesMediunidade?.trim() || undefined,
      });
      return result.id;
    } catch {
      return null;
    }
  };
  
  const value: WizardContextValue = {
    form,
    setForm,
    updateField,
    currentStep,
    setCurrentStep,
    steps,
    totalSteps,
    goNext,
    goBack,
    goToStep,
    canProceed,
    errors,
    warnings,
    validateCurrentStep,
    isDirty,
    isSaving,
    lastSaved,
    duplicidade,
    setDuplicidade,
    ignorarDuplicidade,
    setIgnorarDuplicidade,
    duplicidadeNome,
    setDuplicidadeNome,
    ignorarDuplicidadeNome,
    setIgnorarDuplicidadeNome,
    checkDuplicidade,
    checkDuplicidadeNome,
    saveDraft,
    submit,
    fieldRefs,
    focusField,
  };
  
  return <WizardContext.Provider value={value}>{children}</WizardContext.Provider>;
}

