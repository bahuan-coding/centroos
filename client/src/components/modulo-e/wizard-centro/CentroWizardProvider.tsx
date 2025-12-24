import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode, useMemo } from 'react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';

const generateId = () => Math.random().toString(36).substring(2) + Date.now().toString(36);

// ============================================================================
// TYPES
// ============================================================================

export interface CentroFormData {
  codigo: string;
  nome: string;
  descricao: string;
  responsavelId: string;
}

export interface Warning {
  campo: string;
  mensagem: string;
  tipo: 'info' | 'warning' | 'bloqueio';
  step?: number;
}

export interface CentroDraft {
  id: string;
  data: CentroFormData;
  updatedAt: string;
  codigo: string;
  nome: string;
  currentStep: number;
}

export type StepId = 'identificacao' | 'detalhes' | 'revisao';

export interface StepConfig {
  id: StepId;
  label: string;
  icon: string;
  optional?: boolean;
}

const STEPS: StepConfig[] = [
  { id: 'identificacao', label: 'Identificação', icon: '🏷️' },
  { id: 'detalhes', label: 'Detalhes', icon: '📋', optional: true },
  { id: 'revisao', label: 'Revisão', icon: '✅' },
];

const STORAGE_KEY = 'centroos:centro-custo-drafts';

// ============================================================================
// INITIAL STATE
// ============================================================================

const getInitialFormData = (): CentroFormData => ({
  codigo: '',
  nome: '',
  descricao: '',
  responsavelId: '',
});

// ============================================================================
// CONTEXT
// ============================================================================

interface CentroWizardContextValue {
  form: CentroFormData;
  setForm: React.Dispatch<React.SetStateAction<CentroFormData>>;
  updateField: <K extends keyof CentroFormData>(key: K, value: CentroFormData[K]) => void;
  
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
  drafts: CentroDraft[];
  saveDraft: () => void;
  loadDraft: (draft: CentroDraft) => void;
  deleteDraft: (draftId: string) => void;
  discardCurrentDraft: () => void;
  hasPendingDraft: boolean;
  pendingDraft: CentroDraft | null;
  
  submit: () => Promise<boolean>;
  reset: () => void;
  
  fieldRefs: React.MutableRefObject<Record<string, HTMLElement | null>>;
  focusField: (fieldId: string) => void;
}

const CentroWizardContext = createContext<CentroWizardContextValue | null>(null);

export function useCentroWizard() {
  const ctx = useContext(CentroWizardContext);
  if (!ctx) throw new Error('useCentroWizard must be used within CentroWizardProvider');
  return ctx;
}

// ============================================================================
// PROVIDER
// ============================================================================

interface CentroWizardProviderProps {
  children: ReactNode;
  centroId?: string | null;
  initialData?: Partial<CentroFormData>;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function CentroWizardProvider({ children, centroId, initialData, onSuccess }: CentroWizardProviderProps) {
  const utils = trpc.useUtils();
  const isEditMode = !!centroId;
  
  const [form, setForm] = useState<CentroFormData>(() => {
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
  const [drafts, setDrafts] = useState<CentroDraft[]>([]);
  const [hasPendingDraft, setHasPendingDraft] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<CentroDraft | null>(null);
  
  const initialFormRef = useRef<string>(JSON.stringify(getInitialFormData()));
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});
  const autosaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const steps = STEPS;
  const totalSteps = steps.length;
  
  // Mutations
  const createMutation = trpc.centroCusto.create.useMutation({
    onSuccess: () => {
      toast.success('Centro de custo criado com sucesso');
      utils.centroCusto.list.invalidate();
      if (currentDraftId) deleteDraftInternal(currentDraftId);
      onSuccess?.();
    },
    onError: (err) => {
      if (err.message.includes('código')) {
        setErrors({ codigo: err.message });
        setCurrentStep(0);
      } else {
        toast.error('Erro ao criar', { description: err.message });
      }
    },
  });

  const updateMutation = trpc.centroCusto.update.useMutation({
    onSuccess: () => {
      toast.success('Centro de custo atualizado');
      utils.centroCusto.list.invalidate();
      onSuccess?.();
    },
    onError: (err) => {
      toast.error('Erro ao atualizar', { description: err.message });
    },
  });
  
  // Load drafts from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as CentroDraft[];
        setDrafts(parsed);
        if (!centroId && parsed.length > 0) {
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
  }, [centroId]);
  
  // Track dirty state
  useEffect(() => {
    const currentFormStr = JSON.stringify(form);
    setIsDirty(currentFormStr !== initialFormRef.current);
  }, [form]);
  
  // Autosave with debounce
  useEffect(() => {
    if (!isDirty || centroId) return;
    
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
  }, [form, isDirty, centroId]);
  
  // Calculate warnings
  const calculateWarnings = useCallback((): Warning[] => {
    const w: Warning[] = [];
    
    if (!form.descricao || form.descricao.length < 10) {
      w.push({
        campo: 'descricao',
        mensagem: 'Descrição curta pode dificultar entendimento',
        tipo: 'info',
        step: 1,
      });
    }
    
    if (!form.responsavelId) {
      w.push({
        campo: 'responsavelId',
        mensagem: 'Sem responsável definido para governança',
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
      if (!form.codigo || form.codigo.trim().length < 2) {
        newErrors.codigo = 'Código deve ter no mínimo 2 caracteres';
      }
      if (form.codigo.length > 20) {
        newErrors.codigo = 'Código deve ter no máximo 20 caracteres';
      }
      if (!form.nome || form.nome.trim().length < 3) {
        newErrors.nome = 'Nome deve ter no mínimo 3 caracteres';
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
  
  const updateField = <K extends keyof CentroFormData>(key: K, value: CentroFormData[K]) => {
    setForm(f => ({ ...f, [key]: value }));
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
    const draft: CentroDraft = {
      id: draftId,
      data: form,
      updatedAt: new Date().toISOString(),
      codigo: form.codigo || 'Sem código',
      nome: form.nome || 'Sem nome',
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
  
  const loadDraft = (draft: CentroDraft) => {
    setForm(draft.data);
    setCurrentDraftId(draft.id);
    setHasPendingDraft(false);
    setPendingDraft(null);
    initialFormRef.current = JSON.stringify(draft.data);
    setCurrentStep(draft.currentStep || 0);
  };
  
  const deleteDraftInternal = (draftId: string) => {
    const updatedDrafts = drafts.filter(d => d.id !== draftId);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedDrafts));
      setDrafts(updatedDrafts);
      if (currentDraftId === draftId) {
        setCurrentDraftId(null);
      }
    } catch { /* ignore */ }
  };
  
  const deleteDraft = (draftId: string) => {
    deleteDraftInternal(draftId);
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
    // Validate required step
    if (!validateStep(0)) {
      setCurrentStep(0);
      toast.error('Corrija os erros antes de salvar');
      return false;
    }
    
    setIsSubmitting(true);
    
    try {
      if (isEditMode && centroId) {
        await updateMutation.mutateAsync({
          id: centroId,
          nome: form.nome,
          descricao: form.descricao || null,
          responsavelId: form.responsavelId || null,
          ativo: true,
        });
      } else {
        await createMutation.mutateAsync({
          codigo: form.codigo,
          nome: form.nome,
          descricao: form.descricao || undefined,
          responsavelId: form.responsavelId || undefined,
        });
      }
      return true;
    } catch {
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const value: CentroWizardContextValue = {
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
  };
  
  return (
    <CentroWizardContext.Provider value={value}>
      {children}
    </CentroWizardContext.Provider>
  );
}










