import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode, useMemo } from 'react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';

const generateId = () => Math.random().toString(36).substring(2) + Date.now().toString(36);

// ============================================================================
// TYPES
// ============================================================================

export interface ProjetoFormData {
  codigo: string;
  nome: string;
  status: 'planejamento' | 'em_andamento' | 'suspenso' | 'concluido' | 'cancelado';
  descricao: string;
  dataInicio: string;
  dataFimPrevista: string;
  orcamentoPrevisto: string;
  centroCustoId: string;
  responsavelId: string;
  parceriaMrosc: boolean;
  numeroTermoParceria: string;
  orgaoParceiro: string;
}

export interface Warning {
  campo: string;
  mensagem: string;
  tipo: 'info' | 'warning' | 'bloqueio';
  step?: number;
}

export interface ProjetoDraft {
  id: string;
  data: ProjetoFormData;
  updatedAt: string;
  codigo: string;
  nome: string;
  status: string;
  currentStep: number;
}

export type StepId = 'identificacao' | 'escopo' | 'cronograma' | 'orcamento' | 'vinculos' | 'revisao';

export interface StepConfig {
  id: StepId;
  label: string;
  icon: string;
  optional?: boolean;
}

const STEPS: StepConfig[] = [
  { id: 'identificacao', label: 'Identificação', icon: '🏷️' },
  { id: 'escopo', label: 'Escopo', icon: '📋', optional: true },
  { id: 'cronograma', label: 'Cronograma', icon: '📅' },
  { id: 'orcamento', label: 'Orçamento', icon: '💰', optional: true },
  { id: 'vinculos', label: 'Vínculos', icon: '🔗' },
  { id: 'revisao', label: 'Revisão', icon: '✅' },
];

const STORAGE_KEY = 'centroos:projeto-drafts';

export const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  planejamento: { label: 'Planejamento', color: 'text-slate-700', bg: 'bg-slate-100' },
  em_andamento: { label: 'Em Andamento', color: 'text-blue-700', bg: 'bg-blue-100' },
  suspenso: { label: 'Suspenso', color: 'text-amber-700', bg: 'bg-amber-100' },
  concluido: { label: 'Concluído', color: 'text-emerald-700', bg: 'bg-emerald-100' },
  cancelado: { label: 'Cancelado', color: 'text-rose-700', bg: 'bg-rose-100' },
};

// ============================================================================
// INITIAL STATE
// ============================================================================

const getInitialFormData = (): ProjetoFormData => ({
  codigo: '',
  nome: '',
  status: 'planejamento',
  descricao: '',
  dataInicio: '',
  dataFimPrevista: '',
  orcamentoPrevisto: '',
  centroCustoId: '',
  responsavelId: '',
  parceriaMrosc: false,
  numeroTermoParceria: '',
  orgaoParceiro: '',
});

// ============================================================================
// CONTEXT
// ============================================================================

interface ProjetoWizardContextValue {
  form: ProjetoFormData;
  setForm: React.Dispatch<React.SetStateAction<ProjetoFormData>>;
  updateField: <K extends keyof ProjetoFormData>(key: K, value: ProjetoFormData[K]) => void;
  
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
  drafts: ProjetoDraft[];
  saveDraft: () => void;
  loadDraft: (draft: ProjetoDraft) => void;
  deleteDraft: (draftId: string) => void;
  discardCurrentDraft: () => void;
  hasPendingDraft: boolean;
  pendingDraft: ProjetoDraft | null;
  
  submit: () => Promise<boolean>;
  reset: () => void;
  
  fieldRefs: React.MutableRefObject<Record<string, HTMLElement | null>>;
  focusField: (fieldId: string) => void;
  
  statusConfig: typeof statusConfig;
}

const ProjetoWizardContext = createContext<ProjetoWizardContextValue | null>(null);

export function useProjetoWizard() {
  const ctx = useContext(ProjetoWizardContext);
  if (!ctx) throw new Error('useProjetoWizard must be used within ProjetoWizardProvider');
  return ctx;
}

// ============================================================================
// PROVIDER
// ============================================================================

interface ProjetoWizardProviderProps {
  children: ReactNode;
  projetoId?: string | null;
  initialData?: Partial<ProjetoFormData>;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ProjetoWizardProvider({ children, projetoId, initialData, onSuccess }: ProjetoWizardProviderProps) {
  const utils = trpc.useUtils();
  const isEditMode = !!projetoId;
  
  const [form, setForm] = useState<ProjetoFormData>(() => {
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
  const [drafts, setDrafts] = useState<ProjetoDraft[]>([]);
  const [hasPendingDraft, setHasPendingDraft] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<ProjetoDraft | null>(null);
  
  const initialFormRef = useRef<string>(JSON.stringify(getInitialFormData()));
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});
  const autosaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const steps = STEPS;
  const totalSteps = steps.length;
  
  // Mutations
  const createMutation = trpc.projeto.create.useMutation({
    onSuccess: () => {
      toast.success('Projeto criado com sucesso');
      utils.projeto.list.invalidate();
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

  const updateMutation = trpc.projeto.update.useMutation({
    onSuccess: () => {
      toast.success('Projeto atualizado');
      utils.projeto.list.invalidate();
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
        const parsed = JSON.parse(stored) as ProjetoDraft[];
        setDrafts(parsed);
        if (!projetoId && parsed.length > 0) {
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
  }, [projetoId]);
  
  // Track dirty state
  useEffect(() => {
    const currentFormStr = JSON.stringify(form);
    setIsDirty(currentFormStr !== initialFormRef.current);
  }, [form]);
  
  // Autosave with debounce
  useEffect(() => {
    if (!isDirty || projetoId) return;
    
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
  }, [form, isDirty, projetoId]);
  
  // Calculate warnings
  const calculateWarnings = useCallback((): Warning[] => {
    const w: Warning[] = [];
    
    if (!form.descricao || form.descricao.length < 20) {
      w.push({
        campo: 'descricao',
        mensagem: 'Descrição curta pode dificultar o entendimento do escopo',
        tipo: 'info',
        step: 1,
      });
    }
    
    if (!form.dataInicio) {
      w.push({
        campo: 'dataInicio',
        mensagem: 'Data de início não definida',
        tipo: 'info',
        step: 2,
      });
    }
    
    if (!form.orcamentoPrevisto) {
      w.push({
        campo: 'orcamentoPrevisto',
        mensagem: 'Orçamento não definido dificulta controle financeiro',
        tipo: 'info',
        step: 3,
      });
    }
    
    if (!form.centroCustoId) {
      w.push({
        campo: 'centroCustoId',
        mensagem: 'Sem centro de custo vinculado',
        tipo: 'info',
        step: 4,
      });
    }
    
    if (!form.responsavelId) {
      w.push({
        campo: 'responsavelId',
        mensagem: 'Sem responsável definido para governança',
        tipo: 'info',
        step: 4,
      });
    }
    
    // Date validation warning
    if (form.dataInicio && form.dataFimPrevista) {
      const inicio = new Date(form.dataInicio);
      const fim = new Date(form.dataFimPrevista);
      if (fim < inicio) {
        w.push({
          campo: 'dataFimPrevista',
          mensagem: 'Data de término anterior à data de início',
          tipo: 'warning',
          step: 2,
        });
      }
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
  
  const updateField = <K extends keyof ProjetoFormData>(key: K, value: ProjetoFormData[K]) => {
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
    const draft: ProjetoDraft = {
      id: draftId,
      data: form,
      updatedAt: new Date().toISOString(),
      codigo: form.codigo || 'Sem código',
      nome: form.nome || 'Sem nome',
      status: form.status,
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
  
  const loadDraft = (draft: ProjetoDraft) => {
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
    if (!validateStep(0)) {
      setCurrentStep(0);
      toast.error('Corrija os erros antes de salvar');
      return false;
    }
    
    setIsSubmitting(true);
    
    const orcamento = form.orcamentoPrevisto 
      ? parseFloat(form.orcamentoPrevisto.replace(/[^\d,.-]/g, '').replace(',', '.')) 
      : undefined;
    
    try {
      if (isEditMode && projetoId) {
        await updateMutation.mutateAsync({
          id: projetoId,
          nome: form.nome,
          descricao: form.descricao || null,
          status: form.status,
          dataInicio: form.dataInicio || undefined,
          dataFimPrevista: form.dataFimPrevista || undefined,
          orcamentoPrevisto: orcamento,
          centroCustoId: form.centroCustoId || null,
          responsavelId: form.responsavelId || null,
          parceriaMrosc: form.parceriaMrosc,
          numeroTermoParceria: form.numeroTermoParceria || null,
          orgaoParceiro: form.orgaoParceiro || null,
        });
      } else {
        await createMutation.mutateAsync({
          codigo: form.codigo,
          nome: form.nome,
          descricao: form.descricao || undefined,
          status: form.status,
          dataInicio: form.dataInicio || undefined,
          dataFimPrevista: form.dataFimPrevista || undefined,
          orcamentoPrevisto: orcamento,
          centroCustoId: form.centroCustoId || undefined,
          responsavelId: form.responsavelId || undefined,
          parceriaMrosc: form.parceriaMrosc,
          numeroTermoParceria: form.numeroTermoParceria || undefined,
          orgaoParceiro: form.orgaoParceiro || undefined,
        });
      }
      return true;
    } catch {
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const value: ProjetoWizardContextValue = {
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
    statusConfig,
  };
  
  return (
    <ProjetoWizardContext.Provider value={value}>
      {children}
    </ProjetoWizardContext.Provider>
  );
}












