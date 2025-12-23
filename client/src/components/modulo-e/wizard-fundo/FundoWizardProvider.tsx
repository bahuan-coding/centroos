import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode, useMemo } from 'react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';

const generateId = () => Math.random().toString(36).substring(2) + Date.now().toString(36);

// ============================================================================
// TYPES
// ============================================================================

export interface RegraFundo {
  id?: string;
  tipoRegra: string;
  parametroNumerico: string;
  parametroTexto: string;
  ativo: boolean;
}

export interface FundoFormData {
  codigo: string;
  nome: string;
  tipo: 'livre' | 'restrito' | 'designado';
  descricao: string;
  finalidade: string;
  dataInicio: string;
  dataLimite: string;
  metaValor: string;
  saldoInicial: string;
  regras: RegraFundo[];
}

export interface Warning {
  campo: string;
  mensagem: string;
  tipo: 'info' | 'warning' | 'bloqueio';
  step?: number;
}

export interface FundoDraft {
  id: string;
  data: FundoFormData;
  updatedAt: string;
  codigo: string;
  nome: string;
  tipo: string;
  currentStep: number;
}

export type StepId = 'identificacao' | 'finalidade' | 'vigencia' | 'saldo' | 'regras' | 'revisao';

export interface StepConfig {
  id: StepId;
  label: string;
  icon: string;
  optional?: boolean;
}

const STEPS: StepConfig[] = [
  { id: 'identificacao', label: 'Identificação', icon: '🏷️' },
  { id: 'finalidade', label: 'Finalidade', icon: '📋', optional: true },
  { id: 'vigencia', label: 'Vigência e Meta', icon: '📅', optional: true },
  { id: 'saldo', label: 'Saldo Inicial', icon: '💰', optional: true },
  { id: 'regras', label: 'Regras', icon: '📜', optional: true },
  { id: 'revisao', label: 'Revisão', icon: '✅' },
];

const STORAGE_KEY = 'centroos:fundo-drafts';

export const tipoConfig: Record<string, { label: string; color: string; bg: string; description: string }> = {
  livre: { 
    label: 'Livre', 
    color: 'text-emerald-700', 
    bg: 'bg-emerald-100',
    description: 'Sem restrição de uso. A organização decide como aplicar.'
  },
  designado: { 
    label: 'Designado', 
    color: 'text-amber-700', 
    bg: 'bg-amber-100',
    description: 'Uso definido pela diretoria. Pode ser redesignado com ata.'
  },
  restrito: { 
    label: 'Restrito', 
    color: 'text-rose-700', 
    bg: 'bg-rose-100',
    description: 'Uso definido pelo doador. Não pode ser alterado.'
  },
};

export const regraConfig: Record<string, { label: string; description: string; needsNumeric: boolean; needsText: boolean }> = {
  percentual_receita: { 
    label: 'Destinar % das Receitas', 
    description: 'Automaticamente destina percentual das receitas para este fundo',
    needsNumeric: true,
    needsText: false,
  },
  categoria_permitida: { 
    label: 'Categorias Permitidas', 
    description: 'Limita consumo apenas às categorias informadas',
    needsNumeric: false,
    needsText: true,
  },
  categoria_proibida: { 
    label: 'Categorias Proibidas', 
    description: 'Impede consumo nas categorias informadas',
    needsNumeric: false,
    needsText: true,
  },
  valor_maximo: { 
    label: 'Limite por Consumo', 
    description: 'Consumos acima deste valor requerem aprovação',
    needsNumeric: true,
    needsText: false,
  },
  aprovador_obrigatorio: { 
    label: 'Requer Aprovação', 
    description: 'Todo consumo deste fundo requer aprovação prévia',
    needsNumeric: false,
    needsText: true,
  },
};

// ============================================================================
// INITIAL STATE
// ============================================================================

const getInitialFormData = (): FundoFormData => ({
  codigo: '',
  nome: '',
  tipo: 'livre',
  descricao: '',
  finalidade: '',
  dataInicio: new Date().toISOString().split('T')[0],
  dataLimite: '',
  metaValor: '',
  saldoInicial: '',
  regras: [],
});

// ============================================================================
// CONTEXT
// ============================================================================

interface FundoWizardContextValue {
  form: FundoFormData;
  setForm: React.Dispatch<React.SetStateAction<FundoFormData>>;
  updateField: <K extends keyof FundoFormData>(key: K, value: FundoFormData[K]) => void;
  
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
  tipoLocked: boolean;
  
  currentDraftId: string | null;
  drafts: FundoDraft[];
  saveDraft: () => void;
  loadDraft: (draft: FundoDraft) => void;
  deleteDraft: (draftId: string) => void;
  discardCurrentDraft: () => void;
  hasPendingDraft: boolean;
  pendingDraft: FundoDraft | null;
  
  // Regras
  addRegra: (regra: RegraFundo) => void;
  updateRegra: (index: number, regra: RegraFundo) => void;
  removeRegra: (index: number) => void;
  
  submit: () => Promise<boolean>;
  reset: () => void;
  
  fieldRefs: React.MutableRefObject<Record<string, HTMLElement | null>>;
  focusField: (fieldId: string) => void;
  
  tipoConfig: typeof tipoConfig;
  regraConfig: typeof regraConfig;
}

const FundoWizardContext = createContext<FundoWizardContextValue | null>(null);

export function useFundoWizard() {
  const ctx = useContext(FundoWizardContext);
  if (!ctx) throw new Error('useFundoWizard must be used within FundoWizardProvider');
  return ctx;
}

// ============================================================================
// PROVIDER
// ============================================================================

interface FundoWizardProviderProps {
  children: ReactNode;
  fundoId?: string | null;
  initialData?: Partial<FundoFormData>;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function FundoWizardProvider({ children, fundoId, initialData, onSuccess }: FundoWizardProviderProps) {
  const utils = trpc.useUtils();
  const isEditMode = !!fundoId;
  
  // Fetch existing rules when editing
  const { data: existingRegras } = trpc.fundoRegra.list.useQuery(fundoId || '', {
    enabled: !!fundoId,
  });
  
  const [form, setForm] = useState<FundoFormData>(() => {
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
  const [drafts, setDrafts] = useState<FundoDraft[]>([]);
  const [hasPendingDraft, setHasPendingDraft] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<FundoDraft | null>(null);
  
  // Tipo locked when editing restrito fund
  const tipoLocked = isEditMode && initialData?.tipo === 'restrito';
  
  const initialFormRef = useRef<string>(JSON.stringify(getInitialFormData()));
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});
  const autosaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const steps = STEPS;
  const totalSteps = steps.length;
  
  // Load existing rules
  useEffect(() => {
    if (existingRegras && isEditMode) {
      setForm(f => ({
        ...f,
        regras: existingRegras.map(r => ({
          id: r.id,
          tipoRegra: r.tipoRegra,
          parametroNumerico: r.parametroNumerico?.toString() || '',
          parametroTexto: r.parametroTexto || '',
          ativo: r.ativo,
        })),
      }));
    }
  }, [existingRegras, isEditMode]);
  
  // Mutations
  const createMutation = trpc.fundo.create.useMutation({
    onSuccess: () => {
      toast.success('Fundo criado com sucesso');
      utils.fundo.list.invalidate();
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

  const updateMutation = trpc.fundo.update.useMutation({
    onSuccess: () => {
      toast.success('Fundo atualizado');
      utils.fundo.list.invalidate();
      onSuccess?.();
    },
    onError: (err) => {
      toast.error('Erro ao atualizar', { description: err.message });
    },
  });
  
  const createRegraMutation = trpc.fundoRegra.create.useMutation();
  const updateRegraMutation = trpc.fundoRegra.update.useMutation();
  const deleteRegraMutation = trpc.fundoRegra.delete.useMutation();
  
  // Load drafts from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as FundoDraft[];
        setDrafts(parsed);
        if (!fundoId && parsed.length > 0) {
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
  }, [fundoId]);
  
  // Track dirty state
  useEffect(() => {
    const currentFormStr = JSON.stringify(form);
    setIsDirty(currentFormStr !== initialFormRef.current);
  }, [form]);
  
  // Autosave with debounce
  useEffect(() => {
    if (!isDirty || fundoId) return;
    
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
  }, [form, isDirty, fundoId]);
  
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
    
    if (!form.finalidade && form.tipo === 'restrito') {
      w.push({
        campo: 'finalidade',
        mensagem: 'Fundo restrito sem finalidade específica definida',
        tipo: 'warning',
        step: 1,
      });
    }
    
    if (form.dataInicio && form.dataLimite) {
      const inicio = new Date(form.dataInicio);
      const limite = new Date(form.dataLimite);
      if (limite < inicio) {
        w.push({
          campo: 'dataLimite',
          mensagem: 'Data limite anterior à data de criação',
          tipo: 'warning',
          step: 2,
        });
      }
    }
    
    if (form.regras.length === 0 && form.tipo === 'restrito') {
      w.push({
        campo: 'regras',
        mensagem: 'Fundo restrito sem regras de controle configuradas',
        tipo: 'info',
        step: 4,
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
  
  const updateField = <K extends keyof FundoFormData>(key: K, value: FundoFormData[K]) => {
    setForm(f => ({ ...f, [key]: value }));
  };
  
  const focusField = (fieldId: string) => {
    const el = fieldRefs.current[fieldId];
    if (el) {
      el.focus();
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };
  
  // Regras functions
  const addRegra = (regra: RegraFundo) => {
    setForm(f => ({ ...f, regras: [...f.regras, regra] }));
  };
  
  const updateRegra = (index: number, regra: RegraFundo) => {
    setForm(f => {
      const updated = [...f.regras];
      updated[index] = regra;
      return { ...f, regras: updated };
    });
  };
  
  const removeRegra = (index: number) => {
    setForm(f => ({
      ...f,
      regras: f.regras.filter((_, i) => i !== index),
    }));
  };
  
  // Draft functions
  const saveDraftInternal = () => {
    const draftId = currentDraftId || generateId();
    const draft: FundoDraft = {
      id: draftId,
      data: form,
      updatedAt: new Date().toISOString(),
      codigo: form.codigo || 'Sem código',
      nome: form.nome || 'Sem nome',
      tipo: form.tipo,
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
  
  const loadDraft = (draft: FundoDraft) => {
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
    
    const meta = form.metaValor 
      ? parseFloat(form.metaValor.replace(/[^\d,.-]/g, '').replace(',', '.')) 
      : undefined;
    const saldo = form.saldoInicial 
      ? parseFloat(form.saldoInicial.replace(/[^\d,.-]/g, '').replace(',', '.')) 
      : 0;
    
    try {
      if (isEditMode && fundoId) {
        await updateMutation.mutateAsync({
          id: fundoId,
          nome: form.nome,
          descricao: form.descricao || null,
          tipo: tipoLocked ? undefined : form.tipo,
          finalidade: form.finalidade || null,
          dataLimite: form.dataLimite || undefined,
          metaValor: meta,
        });
        
        // Update rules
        for (const regra of form.regras) {
          if (regra.id) {
            await updateRegraMutation.mutateAsync({
              id: regra.id,
              parametroNumerico: regra.parametroNumerico ? parseFloat(regra.parametroNumerico) : undefined,
              parametroTexto: regra.parametroTexto || undefined,
              ativo: regra.ativo,
            });
          } else {
            await createRegraMutation.mutateAsync({
              fundoId,
              tipoRegra: regra.tipoRegra as any,
              parametroNumerico: regra.parametroNumerico ? parseFloat(regra.parametroNumerico) : undefined,
              parametroTexto: regra.parametroTexto || undefined,
            });
          }
        }
        
        // Delete removed rules
        if (existingRegras) {
          for (const existingRegra of existingRegras) {
            if (!form.regras.find(r => r.id === existingRegra.id)) {
              await deleteRegraMutation.mutateAsync(existingRegra.id);
            }
          }
        }
      } else {
        await createMutation.mutateAsync({
          codigo: form.codigo,
          nome: form.nome,
          descricao: form.descricao || undefined,
          tipo: form.tipo,
          finalidade: form.finalidade || undefined,
          dataInicio: form.dataInicio || undefined,
          dataLimite: form.dataLimite || undefined,
          metaValor: meta,
          saldoInicial: saldo,
          regras: form.regras.map(r => ({
            tipoRegra: r.tipoRegra as any,
            parametroNumerico: r.parametroNumerico ? parseFloat(r.parametroNumerico) : undefined,
            parametroTexto: r.parametroTexto || undefined,
          })),
        });
      }
      return true;
    } catch {
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const value: FundoWizardContextValue = {
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
    tipoLocked,
    currentDraftId,
    drafts,
    saveDraft,
    loadDraft,
    deleteDraft,
    discardCurrentDraft,
    hasPendingDraft,
    pendingDraft,
    addRegra,
    updateRegra,
    removeRegra,
    submit,
    reset,
    fieldRefs,
    focusField,
    tipoConfig,
    regraConfig,
  };
  
  return (
    <FundoWizardContext.Provider value={value}>
      {children}
    </FundoWizardContext.Provider>
  );
}





