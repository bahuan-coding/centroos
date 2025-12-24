import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode, useMemo } from 'react';
import { toast } from 'sonner';

const generateId = () => Math.random().toString(36).substring(2) + Date.now().toString(36);

// ============================================================================
// TYPES
// ============================================================================

export interface BemFormData {
  codigo: string;
  descricao: string;
  categoria: 'imovel' | 'veiculo' | 'equipamento' | 'mobiliario' | 'informatica' | 'outro';
  dataAquisicao: string;
  valorAquisicao: string;
  valorResidual: string;
  vidaUtilMeses: number;
  metodoDepreciacao: 'linear' | 'nenhum';
  contaAtivoId: string;
  localizacao: string;
  responsavelId: string;
  fornecedorId: string;
  numeroNotaFiscal: string;
  projetoId: string;
  fundoId: string;
}

export interface Warning {
  campo: string;
  mensagem: string;
  tipo: 'info' | 'warning' | 'bloqueio';
  step?: number;
}

export interface BemDraft {
  id: string;
  data: BemFormData;
  updatedAt: string;
  codigo: string;
  categoria: string;
  valorAquisicao: number;
  currentStep: number;
}

export type StepId = 'identificacao' | 'aquisicao' | 'depreciacao' | 'contabilizacao' | 'localizacao' | 'revisao';

export interface StepConfig {
  id: StepId;
  label: string;
  icon: string;
  optional?: boolean;
}

const STEPS: StepConfig[] = [
  { id: 'identificacao', label: 'Identificação', icon: '🏷️' },
  { id: 'aquisicao', label: 'Aquisição', icon: '💰' },
  { id: 'depreciacao', label: 'Depreciação', icon: '📉', optional: true },
  { id: 'contabilizacao', label: 'Contabilização', icon: '📊' },
  { id: 'localizacao', label: 'Localização', icon: '📍', optional: true },
  { id: 'revisao', label: 'Revisão', icon: '✅' },
];

const STORAGE_KEY = 'centroos:bem-patrimonial-drafts';

const categoriaConfig: Record<string, { label: string; vidaUtilPadrao: number }> = {
  imovel: { label: 'Imóvel', vidaUtilPadrao: 300 },
  veiculo: { label: 'Veículo', vidaUtilPadrao: 60 },
  equipamento: { label: 'Equipamento', vidaUtilPadrao: 120 },
  mobiliario: { label: 'Mobiliário', vidaUtilPadrao: 120 },
  informatica: { label: 'Informática', vidaUtilPadrao: 60 },
  outro: { label: 'Outro', vidaUtilPadrao: 60 },
};

// ============================================================================
// INITIAL STATE
// ============================================================================

const getInitialFormData = (): BemFormData => ({
  codigo: '',
  descricao: '',
  categoria: 'equipamento',
  dataAquisicao: new Date().toISOString().split('T')[0],
  valorAquisicao: '',
  valorResidual: '0',
  vidaUtilMeses: 60,
  metodoDepreciacao: 'linear',
  contaAtivoId: '',
  localizacao: '',
  responsavelId: '',
  fornecedorId: '',
  numeroNotaFiscal: '',
  projetoId: '',
  fundoId: '',
});

// ============================================================================
// CONTEXT
// ============================================================================

interface PatrimonioWizardContextValue {
  form: BemFormData;
  setForm: React.Dispatch<React.SetStateAction<BemFormData>>;
  updateField: <K extends keyof BemFormData>(key: K, value: BemFormData[K]) => void;
  
  depreciacaoMensalEstimada: number;
  valorContabilEstimado: number;
  
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
  isEditMode: boolean;
  
  currentDraftId: string | null;
  drafts: BemDraft[];
  saveDraft: () => void;
  loadDraft: (draft: BemDraft) => void;
  deleteDraft: (draftId: string) => void;
  discardCurrentDraft: () => void;
  hasPendingDraft: boolean;
  pendingDraft: BemDraft | null;
  
  submit: () => Promise<boolean>;
  reset: () => void;
  
  fieldRefs: React.MutableRefObject<Record<string, HTMLElement | null>>;
  focusField: (fieldId: string) => void;
  
  categoriaConfig: typeof categoriaConfig;
}

const PatrimonioWizardContext = createContext<PatrimonioWizardContextValue | null>(null);

export function usePatrimonioWizard() {
  const ctx = useContext(PatrimonioWizardContext);
  if (!ctx) throw new Error('usePatrimonioWizard must be used within PatrimonioWizardProvider');
  return ctx;
}

// ============================================================================
// PROVIDER
// ============================================================================

interface PatrimonioWizardProviderProps {
  children: ReactNode;
  bemId?: string | null;
  initialData?: Partial<BemFormData>;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function PatrimonioWizardProvider({ children, bemId, initialData, onSuccess }: PatrimonioWizardProviderProps) {
  const isEditMode = !!bemId;
  
  const [form, setForm] = useState<BemFormData>(() => {
    const initial = getInitialFormData();
    if (initialData) {
      return { ...initial, ...initialData };
    }
    return initial;
  });
  const [currentStep, setCurrentStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<BemDraft[]>([]);
  const [hasPendingDraft, setHasPendingDraft] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<BemDraft | null>(null);
  
  const initialFormRef = useRef<string>(JSON.stringify(getInitialFormData()));
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});
  const autosaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const steps = STEPS;
  const totalSteps = steps.length;
  
  // Computed values
  const valorAquisicaoNum = parseFloat(form.valorAquisicao) || 0;
  const valorResidualNum = parseFloat(form.valorResidual) || 0;
  
  const depreciacaoMensalEstimada = useMemo(() => {
    if (form.metodoDepreciacao === 'nenhum' || form.vidaUtilMeses <= 0) return 0;
    return Math.round(((valorAquisicaoNum - valorResidualNum) / form.vidaUtilMeses) * 100) / 100;
  }, [valorAquisicaoNum, valorResidualNum, form.vidaUtilMeses, form.metodoDepreciacao]);
  
  const valorContabilEstimado = useMemo(() => {
    return valorAquisicaoNum;
  }, [valorAquisicaoNum]);
  
  // Load drafts from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as BemDraft[];
        setDrafts(parsed);
        if (!bemId && parsed.length > 0) {
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
  }, [bemId]);
  
  // Track dirty state
  useEffect(() => {
    const currentFormStr = JSON.stringify(form);
    setIsDirty(currentFormStr !== initialFormRef.current);
  }, [form]);
  
  // Autosave with debounce
  useEffect(() => {
    if (!isDirty || bemId) return;
    
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
  }, [form, isDirty, bemId]);
  
  // Calculate warnings
  const calculateWarnings = useCallback((): Warning[] => {
    const w: Warning[] = [];
    
    if (!form.descricao || form.descricao.length < 10) {
      w.push({
        campo: 'descricao',
        mensagem: 'Descrição curta pode dificultar inventário',
        tipo: 'info',
        step: 0,
      });
    }
    
    if (form.metodoDepreciacao === 'linear' && valorResidualNum >= valorAquisicaoNum && valorAquisicaoNum > 0) {
      w.push({
        campo: 'valorResidual',
        mensagem: 'Valor residual maior ou igual à aquisição impede depreciação',
        tipo: 'warning',
        step: 2,
      });
    }
    
    if (!form.localizacao) {
      w.push({
        campo: 'localizacao',
        mensagem: 'Localização não informada dificulta inventário',
        tipo: 'info',
        step: 4,
      });
    }
    
    if (!form.responsavelId) {
      w.push({
        campo: 'responsavelId',
        mensagem: 'Sem responsável definido para auditoria',
        tipo: 'info',
        step: 4,
      });
    }
    
    return w;
  }, [form, valorAquisicaoNum, valorResidualNum]);
  
  useEffect(() => {
    setWarnings(calculateWarnings());
  }, [calculateWarnings]);
  
  // Validation per step
  const validateStep = (stepIndex: number): boolean => {
    const newErrors: Record<string, string> = {};
    const step = steps[stepIndex];
    
    if (step.id === 'identificacao') {
      if (!form.codigo || form.codigo.trim().length < 2) {
        newErrors.codigo = 'Código deve ter no mínimo 2 caracteres';
      }
      if (!form.descricao || form.descricao.trim().length < 3) {
        newErrors.descricao = 'Descrição deve ter no mínimo 3 caracteres';
      }
    }
    
    if (step.id === 'aquisicao') {
      if (!form.dataAquisicao) {
        newErrors.dataAquisicao = 'Data de aquisição é obrigatória';
      }
      if (!form.valorAquisicao || valorAquisicaoNum <= 0) {
        newErrors.valorAquisicao = 'Valor de aquisição deve ser maior que zero';
      }
    }
    
    if (step.id === 'contabilizacao') {
      if (!form.contaAtivoId) {
        newErrors.contaAtivoId = 'Conta do ativo é obrigatória';
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
  
  const updateField = <K extends keyof BemFormData>(key: K, value: BemFormData[K]) => {
    setForm(f => {
      const newForm = { ...f, [key]: value };
      // Auto-update vida útil when category changes
      if (key === 'categoria' && typeof value === 'string') {
        const config = categoriaConfig[value];
        if (config) {
          newForm.vidaUtilMeses = config.vidaUtilPadrao;
        }
      }
      return newForm;
    });
  };
  
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
    const draft: BemDraft = {
      id: draftId,
      data: form,
      updatedAt: new Date().toISOString(),
      codigo: form.codigo || 'Sem código',
      categoria: form.categoria,
      valorAquisicao: valorAquisicaoNum,
      currentStep,
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
  
  const loadDraft = (draft: BemDraft) => {
    setForm(draft.data);
    setCurrentDraftId(draft.id);
    setHasPendingDraft(false);
    setPendingDraft(null);
    initialFormRef.current = JSON.stringify(draft.data);
    setCurrentStep(draft.currentStep || 0);
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
  
  const reset = () => {
    setForm(getInitialFormData());
    setCurrentStep(0);
    setErrors({});
    setCurrentDraftId(null);
    setIsDirty(false);
    initialFormRef.current = JSON.stringify(getInitialFormData());
  };
  
  const submit = async (): Promise<boolean> => {
    // Validate all required steps
    const requiredSteps = [0, 1, 3]; // identificacao, aquisicao, contabilizacao
    for (const i of requiredSteps) {
      if (!validateStep(i)) {
        setCurrentStep(i);
        toast.error('Corrija os erros antes de cadastrar');
        return false;
      }
    }
    
    setIsSubmitting(true);
    
    try {
      // TODO: Implement actual API call when backend is ready
      await new Promise(resolve => setTimeout(resolve, 500));
      
      toast.success(isEditMode ? 'Bem atualizado com sucesso' : 'Bem cadastrado com sucesso');
      if (currentDraftId) deleteDraft(currentDraftId);
      onSuccess?.();
      return true;
    } catch (err) {
      toast.error('Erro ao salvar bem');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const value: PatrimonioWizardContextValue = {
    form,
    setForm,
    updateField,
    depreciacaoMensalEstimada,
    valorContabilEstimado,
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
    isEditMode,
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
    categoriaConfig,
  };
  
  return (
    <PatrimonioWizardContext.Provider value={value}>
      {children}
    </PatrimonioWizardContext.Provider>
  );
}












