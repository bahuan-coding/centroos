import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode, useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

const generateId = () => Math.random().toString(36).substring(2) + Date.now().toString(36);

// ============================================================================
// TYPES
// ============================================================================

export interface ContaContabilFormData {
  codigo: string;
  nome: string;
  tipo: 'ativo' | 'passivo' | 'patrimonio_social' | 'receita' | 'despesa';
  naturezaSaldo: 'devedora' | 'credora';
  classificacao: 'sintetica' | 'analitica';
  contaPaiId: string;
  descricao: string;
  tags: string[];
}

export interface Warning {
  campo: string;
  mensagem: string;
  tipo: 'info' | 'warning' | 'bloqueio';
  step?: number;
}

export interface ContaContabilDraft {
  id: string;
  data: ContaContabilFormData;
  updatedAt: string;
  codigo: string;
  nome: string;
  tipo: ContaContabilFormData['tipo'];
}

export type StepId = 'identificacao' | 'classificacao' | 'detalhes' | 'revisao';

export interface StepConfig {
  id: StepId;
  label: string;
  icon: string;
  optional?: boolean;
}

const STEPS: StepConfig[] = [
  { id: 'identificacao', label: 'Identificação', icon: '🏷️' },
  { id: 'classificacao', label: 'Classificação', icon: '📊' },
  { id: 'detalhes', label: 'Detalhes', icon: '📝', optional: true },
  { id: 'revisao', label: 'Revisão', icon: '✅' },
];

const STORAGE_KEY = 'centroos:conta-contabil-drafts';

// ============================================================================
// INITIAL STATE
// ============================================================================

const getInitialFormData = (): ContaContabilFormData => ({
  codigo: '',
  nome: '',
  tipo: 'despesa',
  naturezaSaldo: 'devedora',
  classificacao: 'analitica',
  contaPaiId: '',
  descricao: '',
  tags: [],
});

// ============================================================================
// CONTEXT
// ============================================================================

interface ContaContabilWizardContextValue {
  form: ContaContabilFormData;
  setForm: React.Dispatch<React.SetStateAction<ContaContabilFormData>>;
  updateField: <K extends keyof ContaContabilFormData>(key: K, value: ContaContabilFormData[K]) => void;
  
  currentStep: number;
  setCurrentStep: (step: number) => void;
  steps: StepConfig[];
  totalSteps: number;
  goNext: () => void;
  goBack: () => void;
  goToStep: (step: number) => void;
  canProceed: boolean;
  
  errors: Record<string, string>;
  warnings: Warning[];
  validateCurrentStep: () => boolean;
  
  isDirty: boolean;
  isSaving: boolean;
  lastSaved: Date | null;
  isSubmitting: boolean;
  
  currentDraftId: string | null;
  drafts: ContaContabilDraft[];
  saveDraft: () => void;
  loadDraft: (draft: ContaContabilDraft) => void;
  deleteDraft: (draftId: string) => void;
  discardCurrentDraft: () => void;
  hasPendingDraft: boolean;
  pendingDraft: ContaContabilDraft | null;
  
  submit: () => Promise<boolean>;
  reset: () => void;
  
  fieldRefs: React.MutableRefObject<Record<string, HTMLElement | null>>;
  focusField: (fieldId: string) => void;
  
  // Hierarquia
  contaPaiBreadcrumb: string[];
  contasDisponiveis: Array<{ id: string; codigo: string; nome: string; tipo: string; nivel: number }>;
}

const ContaContabilWizardContext = createContext<ContaContabilWizardContextValue | null>(null);

export function useContaContabilWizard() {
  const ctx = useContext(ContaContabilWizardContext);
  if (!ctx) throw new Error('useContaContabilWizard must be used within ContaContabilWizardProvider');
  return ctx;
}

// ============================================================================
// PROVIDER
// ============================================================================

interface ContaContabilWizardProviderProps {
  children: ReactNode;
  onSuccess?: (contaId: string) => void;
  onCancel?: () => void;
}

export function ContaContabilWizardProvider({ children, onSuccess }: ContaContabilWizardProviderProps) {
  const utils = trpc.useUtils();
  
  const [form, setForm] = useState<ContaContabilFormData>(getInitialFormData);
  const [currentStep, setCurrentStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<ContaContabilDraft[]>([]);
  const [hasPendingDraft, setHasPendingDraft] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<ContaContabilDraft | null>(null);
  
  const initialFormRef = useRef<string>(JSON.stringify(getInitialFormData()));
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});
  const autosaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const steps = STEPS;
  const totalSteps = steps.length;
  
  // Query contas para hierarquia
  const { data: contasTree = [] } = trpc.accounts.planoContasHierarchy.useQuery();
  
  // Mutations
  const createMutation = trpc.accounts.planoContasCreate.useMutation({
    onSuccess: (data) => {
      toast.success('Conta contábil criada com sucesso!');
      utils.accounts.planoContasTree.invalidate();
      utils.accounts.planoContasStats.invalidate();
      utils.accounts.planoContasHierarchy.invalidate();
      if (currentDraftId) deleteDraft(currentDraftId);
      onSuccess?.(data.id);
    },
    onError: (err) => toast.error(err.message),
  });
  
  // Natureza de saldo auto-calculada baseada no tipo
  useEffect(() => {
    const natureza = ['ativo', 'despesa'].includes(form.tipo) ? 'devedora' : 'credora';
    if (form.naturezaSaldo !== natureza) {
      setForm(f => ({ ...f, naturezaSaldo: natureza }));
    }
  }, [form.tipo]);
  
  // Contas disponíveis filtradas por tipo (apenas mesmo tipo ou vazio)
  const contasDisponiveis = useMemo(() => {
    return contasTree.filter(c => !form.tipo || c.tipo === form.tipo);
  }, [contasTree, form.tipo]);
  
  // Breadcrumb da conta pai
  const contaPaiBreadcrumb = useMemo(() => {
    if (!form.contaPaiId) return [];
    const crumbs: string[] = [];
    let currentId = form.contaPaiId;
    const contasMap = new Map(contasTree.map(c => [c.id, c]));
    
    while (currentId) {
      const conta = contasMap.get(currentId);
      if (!conta) break;
      crumbs.unshift(conta.nome);
      // Procurar pai pelo código
      const parentConta = contasTree.find(c => conta.codigo.startsWith(c.codigo + '.') && c.id !== conta.id);
      currentId = parentConta?.id || '';
    }
    return crumbs;
  }, [form.contaPaiId, contasTree]);
  
  // Load drafts from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as ContaContabilDraft[];
        setDrafts(parsed);
        if (parsed.length > 0) {
          const mostRecent = parsed.sort((a, b) => 
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          )[0];
          const ageMs = Date.now() - new Date(mostRecent.updatedAt).getTime();
          if (ageMs < 24 * 60 * 60 * 1000) {
            setHasPendingDraft(true);
            setPendingDraft(mostRecent);
          }
        }
      }
    } catch { /* ignore */ }
  }, []);
  
  // Track dirty state
  useEffect(() => {
    const currentFormStr = JSON.stringify(form);
    setIsDirty(currentFormStr !== initialFormRef.current);
  }, [form]);
  
  // Autosave with debounce
  useEffect(() => {
    if (!isDirty) return;
    
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }
    
    autosaveTimeoutRef.current = setTimeout(() => {
      saveDraftInternal();
    }, 2000);
    
    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
    };
  }, [form, isDirty]);
  
  // Calculate warnings
  const calculateWarnings = useCallback((): Warning[] => {
    const w: Warning[] = [];
    
    if (!form.descricao || form.descricao.length < 10) {
      w.push({
        campo: 'descricao',
        mensagem: 'Descrição curta pode dificultar identificação futura',
        tipo: 'info',
        step: 2,
      });
    }
    
    if (form.classificacao === 'sintetica' && !form.contaPaiId) {
      w.push({
        campo: 'contaPaiId',
        mensagem: 'Conta sintética de nível raiz - verifique se é intencional',
        tipo: 'info',
        step: 1,
      });
    }
    
    return w;
  }, [form]);
  
  useEffect(() => {
    setWarnings(calculateWarnings());
  }, [calculateWarnings]);
  
  // Validation per step
  const validateStep = (stepIndex: number): boolean => {
    const newErrors: Record<string, string> = {};
    const step = steps[stepIndex];
    
    if (step.id === 'identificacao') {
      if (!form.codigo || form.codigo.length < 1) {
        newErrors.codigo = 'Código é obrigatório';
      } else if (!/^[0-9]+(\.[0-9]+)*$/.test(form.codigo)) {
        newErrors.codigo = 'Código deve seguir o formato numérico (ex: 1.1.1)';
      }
      if (!form.nome || form.nome.length < 3) {
        newErrors.nome = 'Nome deve ter no mínimo 3 caracteres';
      }
    }
    
    if (step.id === 'classificacao') {
      if (!form.tipo) {
        newErrors.tipo = 'Selecione o tipo da conta';
      }
      // Validar se código é consistente com conta pai
      if (form.contaPaiId) {
        const contaPai = contasTree.find(c => c.id === form.contaPaiId);
        if (contaPai && !form.codigo.startsWith(contaPai.codigo + '.')) {
          newErrors.codigo = `Código deve iniciar com ${contaPai.codigo}.`;
        }
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const validateCurrentStep = () => validateStep(currentStep);
  
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
  const updateField = <K extends keyof ContaContabilFormData>(key: K, value: ContaContabilFormData[K]) => {
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
  
  // Draft functions
  const saveDraftInternal = () => {
    const draftId = currentDraftId || generateId();
    const draft: ContaContabilDraft = {
      id: draftId,
      data: form,
      updatedAt: new Date().toISOString(),
      codigo: form.codigo || 'Sem código',
      nome: form.nome || 'Sem nome',
      tipo: form.tipo,
    };
    
    const updatedDrafts = drafts.filter(d => d.id !== draftId);
    updatedDrafts.unshift(draft);
    const trimmed = updatedDrafts.slice(0, 10);
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
      setDrafts(trimmed);
      setCurrentDraftId(draftId);
      setLastSaved(new Date());
      setIsDirty(false);
      initialFormRef.current = JSON.stringify(form);
    } catch { /* ignore */ }
  };
  
  const saveDraft = () => {
    setIsSaving(true);
    saveDraftInternal();
    toast.success('Rascunho salvo');
    setIsSaving(false);
  };
  
  const loadDraft = (draft: ContaContabilDraft) => {
    setForm(draft.data);
    setCurrentDraftId(draft.id);
    setHasPendingDraft(false);
    setPendingDraft(null);
    initialFormRef.current = JSON.stringify(draft.data);
    setCurrentStep(0);
  };
  
  const deleteDraft = (draftId: string) => {
    const updatedDrafts = drafts.filter(d => d.id !== draftId);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedDrafts));
      setDrafts(updatedDrafts);
      if (currentDraftId === draftId) {
        setCurrentDraftId(null);
      }
    } catch { /* ignore */ }
  };
  
  const discardCurrentDraft = () => {
    if (pendingDraft) {
      deleteDraft(pendingDraft.id);
    }
    setHasPendingDraft(false);
    setPendingDraft(null);
    setForm(getInitialFormData());
    initialFormRef.current = JSON.stringify(getInitialFormData());
  };
  
  // Reset
  const reset = () => {
    setForm(getInitialFormData());
    setCurrentStep(0);
    setErrors({});
    setCurrentDraftId(null);
    setIsDirty(false);
    initialFormRef.current = JSON.stringify(getInitialFormData());
  };
  
  // Submit
  const submit = async (): Promise<boolean> => {
    // Validate all steps except revisao
    for (let i = 0; i < totalSteps - 1; i++) {
      if (!validateStep(i)) {
        setCurrentStep(i);
        toast.error('Corrija os erros antes de criar');
        return false;
      }
    }
    
    setIsSubmitting(true);
    
    try {
      await createMutation.mutateAsync({
        codigo: form.codigo,
        nome: form.nome,
        tipo: form.tipo,
        naturezaSaldo: form.naturezaSaldo,
        classificacao: form.classificacao,
        contaPaiId: form.contaPaiId || undefined,
        descricao: form.descricao || undefined,
        tags: form.tags.length > 0 ? form.tags : undefined,
      });
      return true;
    } catch {
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const value: ContaContabilWizardContextValue = {
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
    isSubmitting,
    currentDraftId,
    drafts,
    saveDraft,
    loadDraft,
    deleteDraft,
    discardCurrentDraft,
    hasPendingDraft,
    pendingDraft,
    submit,
    reset,
    fieldRefs,
    focusField,
    contaPaiBreadcrumb,
    contasDisponiveis,
  };
  
  return (
    <ContaContabilWizardContext.Provider value={value}>
      {children}
    </ContaContabilWizardContext.Provider>
  );
}






