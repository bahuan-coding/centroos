import { createContext, useContext, useState, useRef, useEffect, useCallback, ReactNode } from 'react';
import { Calendar, DollarSign, CheckCircle2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

// ============================================================================
// TYPES
// ============================================================================

export interface PeriodoFormData {
  mes: number | null;
  ano: number;
  saldoAbertura: string;
}

export interface Warning {
  tipo: 'warning' | 'info';
  mensagem: string;
  campo?: string;
  step?: number;
}

export interface PeriodoDraft {
  id: string;
  data: PeriodoFormData;
  updatedAt: string;
  mes: number | null;
  ano: number;
  etapa: number;
}

interface StepConfig {
  id: string;
  label: string;
  icon: ReactNode;
  optional?: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STORAGE_KEY = 'periodo_contabil_drafts';

const STEPS: StepConfig[] = [
  { id: 'competencia', label: 'Competência', icon: <Calendar className="h-5 w-5" /> },
  { id: 'saldos', label: 'Saldos', icon: <DollarSign className="h-5 w-5" />, optional: true },
  { id: 'revisao', label: 'Revisão', icon: <CheckCircle2 className="h-5 w-5" /> },
];

const initialFormData: PeriodoFormData = {
  mes: null,
  ano: new Date().getFullYear(),
  saldoAbertura: '',
};

function generateId() {
  return `draft_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// ============================================================================
// CONTEXT
// ============================================================================

interface PeriodoWizardContextValue {
  form: PeriodoFormData;
  setForm: React.Dispatch<React.SetStateAction<PeriodoFormData>>;
  currentStep: number;
  setCurrentStep: (step: number) => void;
  steps: StepConfig[];
  totalSteps: number;
  errors: Record<string, string>;
  warnings: Warning[];
  isDirty: boolean;
  isSaving: boolean;
  lastSaved: Date | null;
  isSubmitting: boolean;
  
  // Navigation
  goNext: () => void;
  goBack: () => void;
  goToStep: (step: number) => void;
  canProceed: boolean;
  
  // Field helpers
  updateField: <K extends keyof PeriodoFormData>(key: K, value: PeriodoFormData[K]) => void;
  fieldRefs: React.MutableRefObject<Record<string, HTMLElement | null>>;
  focusField: (fieldId: string) => void;
  
  // Drafts
  drafts: PeriodoDraft[];
  hasPendingDraft: boolean;
  pendingDraft: PeriodoDraft | null;
  currentDraftId: string | null;
  saveDraft: () => void;
  loadDraft: (draft: PeriodoDraft) => void;
  deleteDraft: (draftId: string) => void;
  discardCurrentDraft: () => void;
  
  // Duplicate check
  duplicateInfo: { exists: boolean; periodId?: number } | null;
  checkingDuplicate: boolean;
  
  // Submit
  submit: () => Promise<number | null>;
  
  // Existing periods for validation
  existingPeriods: Array<{ id: number; month: number; year: number; status: string }>;
}

const PeriodoWizardContext = createContext<PeriodoWizardContextValue | null>(null);

export function usePeriodoWizard() {
  const ctx = useContext(PeriodoWizardContext);
  if (!ctx) throw new Error('usePeriodoWizard must be used within PeriodoWizardProvider');
  return ctx;
}

// ============================================================================
// PROVIDER
// ============================================================================

interface PeriodoWizardProviderProps {
  children: ReactNode;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function PeriodoWizardProvider({ children, onSuccess }: PeriodoWizardProviderProps) {
  const utils = trpc.useUtils();
  
  const [form, setForm] = useState<PeriodoFormData>(initialFormData);
  const [currentStep, setCurrentStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<PeriodoDraft[]>([]);
  const [hasPendingDraft, setHasPendingDraft] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<PeriodoDraft | null>(null);
  const [duplicateInfo, setDuplicateInfo] = useState<{ exists: boolean; periodId?: number } | null>(null);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);
  
  const initialFormRef = useRef<string>(JSON.stringify(initialFormData));
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});
  const autosaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const steps = STEPS;
  const totalSteps = steps.length;
  
  // Fetch existing periods for duplicate check
  const { data: periodsData } = trpc.periods.list.useQuery();
  const existingPeriods = periodsData || [];
  
  // Mutations
  const createMutation = trpc.periods.create.useMutation({
    onSuccess: (result) => {
      toast.success('Período contábil criado com sucesso!');
      utils.periods.listWithStats.invalidate();
      utils.periods.list.invalidate();
      if (currentDraftId) deleteDraft(currentDraftId);
      onSuccess?.();
    },
    onError: (err) => toast.error(err.message),
  });
  
  // Load drafts from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as PeriodoDraft[];
        setDrafts(parsed);
        if (parsed.length > 0) {
          setHasPendingDraft(true);
          setPendingDraft(parsed[0]);
        }
      }
    } catch { /* ignore */ }
  }, []);
  
  // Track dirty state
  useEffect(() => {
    const currentFormStr = JSON.stringify(form);
    setIsDirty(currentFormStr !== initialFormRef.current);
  }, [form]);
  
  // Auto-save with debounce
  useEffect(() => {
    if (isDirty) {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
      autosaveTimeoutRef.current = setTimeout(() => {
        saveDraftInternal();
      }, 2000);
    }
    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
    };
  }, [form, isDirty]);
  
  // Check for duplicates when month/year changes
  useEffect(() => {
    if (form.mes && form.ano) {
      setCheckingDuplicate(true);
      const exists = existingPeriods.some(
        p => p.month === form.mes && p.year === form.ano
      );
      const existingPeriod = existingPeriods.find(
        p => p.month === form.mes && p.year === form.ano
      );
      setDuplicateInfo(exists ? { exists: true, periodId: existingPeriod?.id } : { exists: false });
      setCheckingDuplicate(false);
    } else {
      setDuplicateInfo(null);
    }
  }, [form.mes, form.ano, existingPeriods]);
  
  // Calculate warnings
  const calculateWarnings = useCallback(() => {
    const w: Warning[] = [];
    
    const saldoNum = parseFloat(form.saldoAbertura.replace(',', '.')) || 0;
    if (saldoNum === 0 && form.saldoAbertura !== '') {
      w.push({
        tipo: 'info',
        mensagem: 'Saldo de abertura zerado. Confirme se é o primeiro período ou se o período anterior fechou zerado.',
        campo: 'saldoAbertura',
        step: 1,
      });
    }
    
    // Check if previous period exists
    if (form.mes && form.ano) {
      const prevMonth = form.mes === 1 ? 12 : form.mes - 1;
      const prevYear = form.mes === 1 ? form.ano - 1 : form.ano;
      const prevExists = existingPeriods.some(p => p.month === prevMonth && p.year === prevYear);
      
      if (existingPeriods.length > 0 && !prevExists) {
        w.push({
          tipo: 'warning',
          mensagem: `Período anterior (${String(prevMonth).padStart(2, '0')}/${prevYear}) não existe. Considere criar em sequência.`,
          campo: 'mes',
          step: 0,
        });
      }
    }
    
    setWarnings(w);
  }, [form, existingPeriods]);
  
  useEffect(() => {
    calculateWarnings();
  }, [calculateWarnings]);
  
  // Validation
  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (step === 0) {
      if (!form.mes) newErrors.mes = 'Selecione o mês do período';
      if (!form.ano || form.ano < 2000 || form.ano > 2100) newErrors.ano = 'Ano inválido';
      if (duplicateInfo?.exists) newErrors.mes = 'Este período já existe no sistema';
    }
    
    // Step 1 (saldos) has no required validation - saldo is optional
    
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
  
  // Field helpers
  const updateField = <K extends keyof PeriodoFormData>(key: K, value: PeriodoFormData[K]) => {
    setForm(f => ({ ...f, [key]: value }));
    // Clear related errors
    if (errors[key]) {
      setErrors(e => {
        const newErrors = { ...e };
        delete newErrors[key];
        return newErrors;
      });
    }
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
    const draft: PeriodoDraft = {
      id: draftId,
      data: form,
      updatedAt: new Date().toISOString(),
      mes: form.mes,
      ano: form.ano,
      etapa: currentStep,
    };
    
    const updatedDrafts = drafts.filter(d => d.id !== draftId);
    updatedDrafts.unshift(draft);
    const trimmed = updatedDrafts.slice(0, 5);
    
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
  
  const loadDraft = (draft: PeriodoDraft) => {
    setForm(draft.data);
    setCurrentDraftId(draft.id);
    setHasPendingDraft(false);
    setPendingDraft(null);
    initialFormRef.current = JSON.stringify(draft.data);
    setIsDirty(false);
    setCurrentStep(draft.etapa || 0);
  };
  
  const deleteDraft = (draftId: string) => {
    const updated = drafts.filter(d => d.id !== draftId);
    setDrafts(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch { /* ignore */ }
    if (currentDraftId === draftId) {
      setCurrentDraftId(null);
    }
    if (pendingDraft?.id === draftId) {
      setHasPendingDraft(updated.length > 0);
      setPendingDraft(updated[0] || null);
    }
  };
  
  const discardCurrentDraft = () => {
    if (pendingDraft) {
      deleteDraft(pendingDraft.id);
    }
    setHasPendingDraft(false);
    setPendingDraft(null);
  };
  
  // Submit
  const submit = async (): Promise<number | null> => {
    for (let i = 0; i < totalSteps - 1; i++) {
      if (!validateStep(i)) {
        setCurrentStep(i);
        toast.error('Corrija os erros antes de criar o período');
        return null;
      }
    }
    
    if (!form.mes) {
      toast.error('Mês é obrigatório');
      return null;
    }
    
    setIsSubmitting(true);
    
    try {
      const saldoCentavos = Math.round((parseFloat(form.saldoAbertura.replace(',', '.')) || 0) * 100);
      
      const result = await createMutation.mutateAsync({
        month: form.mes,
        year: form.ano,
        openingBalance: saldoCentavos,
      });
      
      if (currentDraftId) deleteDraft(currentDraftId);
      return result.id;
    } catch {
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const value: PeriodoWizardContextValue = {
    form,
    setForm,
    currentStep,
    setCurrentStep,
    steps,
    totalSteps,
    errors,
    warnings,
    isDirty,
    isSaving,
    lastSaved,
    isSubmitting,
    goNext,
    goBack,
    goToStep,
    canProceed,
    updateField,
    fieldRefs,
    focusField,
    drafts,
    hasPendingDraft,
    pendingDraft,
    currentDraftId,
    saveDraft,
    loadDraft,
    deleteDraft,
    discardCurrentDraft,
    duplicateInfo,
    checkingDuplicate,
    submit,
    existingPeriods,
  };
  
  return (
    <PeriodoWizardContext.Provider value={value}>
      {children}
    </PeriodoWizardContext.Provider>
  );
}

