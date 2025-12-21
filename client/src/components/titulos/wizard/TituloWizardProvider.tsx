import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode, useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

// Simple ID generator
const generateId = () => Math.random().toString(36).substring(2) + Date.now().toString(36);

// ============================================================================
// TYPES
// ============================================================================

export interface TituloFormData {
  tipo: 'pagar' | 'receber';
  natureza: string;
  descricao: string;
  valorOriginal: string;
  valorDesconto: string;
  valorAcrescimo: string;
  dataEmissao: string;
  dataCompetencia: string;
  dataVencimento: string;
  numeroDocumento: string;
  serieDocumento: string;
  pessoaId: string;
  contaContabilId: string;
  centroCustoId: string;
  projetoId: string;
  fundoId: string;
  observacoes: string;
  status: string;
  parcelas: number;
  intervaloParcelas: number;
}

export interface Warning {
  campo: string;
  mensagem: string;
  tipo: 'info' | 'warning' | 'bloqueio';
  step?: number;
}

export interface TituloDraft {
  id: string;
  data: TituloFormData;
  updatedAt: string;
  tipo: 'pagar' | 'receber';
  valorLiquido: number;
  descricao: string;
}

export type StepId = 'identificacao' | 'valores' | 'datas' | 'revisao';

export interface StepConfig {
  id: StepId;
  label: string;
  icon: string;
  optional?: boolean;
}

const STEPS: StepConfig[] = [
  { id: 'identificacao', label: 'Identificação', icon: '📋' },
  { id: 'valores', label: 'Valores', icon: '💰' },
  { id: 'datas', label: 'Datas', icon: '📅' },
  { id: 'revisao', label: 'Revisão', icon: '✅' },
];

const STORAGE_KEY = 'centroos:titulo-drafts';

// ============================================================================
// INITIAL STATE
// ============================================================================

const getInitialFormData = (): TituloFormData => ({
  tipo: 'receber',
  natureza: '',
  descricao: '',
  valorOriginal: '',
  valorDesconto: '0',
  valorAcrescimo: '0',
  dataEmissao: new Date().toISOString().split('T')[0],
  dataCompetencia: new Date().toISOString().split('T')[0].slice(0, 7) + '-01',
  dataVencimento: '',
  numeroDocumento: '',
  serieDocumento: '',
  pessoaId: '',
  contaContabilId: '',
  centroCustoId: '',
  projetoId: '',
  fundoId: '',
  observacoes: '',
  status: 'rascunho',
  parcelas: 1,
  intervaloParcelas: 1,
});

// ============================================================================
// CONTEXT
// ============================================================================

interface TituloWizardContextValue {
  // Form state
  form: TituloFormData;
  setForm: React.Dispatch<React.SetStateAction<TituloFormData>>;
  updateField: <K extends keyof TituloFormData>(key: K, value: TituloFormData[K]) => void;
  
  // Computed
  valorLiquido: number;
  
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
  isSubmitting: boolean;
  
  // Draft
  currentDraftId: string | null;
  drafts: TituloDraft[];
  saveDraft: () => void;
  loadDraft: (draft: TituloDraft) => void;
  deleteDraft: (draftId: string) => void;
  discardCurrentDraft: () => void;
  hasPendingDraft: boolean;
  pendingDraft: TituloDraft | null;
  
  // Actions
  submit: () => Promise<boolean>;
  reset: () => void;
  
  // Refs for focus
  fieldRefs: React.MutableRefObject<Record<string, HTMLElement | null>>;
  focusField: (fieldId: string) => void;
}

const TituloWizardContext = createContext<TituloWizardContextValue | null>(null);

export function useTituloWizard() {
  const ctx = useContext(TituloWizardContext);
  if (!ctx) throw new Error('useTituloWizard must be used within TituloWizardProvider');
  return ctx;
}

// ============================================================================
// PROVIDER
// ============================================================================

interface TituloWizardProviderProps {
  children: ReactNode;
  tituloId?: string | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function TituloWizardProvider({ children, tituloId, onSuccess }: TituloWizardProviderProps) {
  const utils = trpc.useUtils();
  
  const [form, setForm] = useState<TituloFormData>(getInitialFormData);
  const [currentStep, setCurrentStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<TituloDraft[]>([]);
  const [hasPendingDraft, setHasPendingDraft] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<TituloDraft | null>(null);
  
  const initialFormRef = useRef<string>(JSON.stringify(getInitialFormData()));
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});
  const autosaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const steps = STEPS;
  const totalSteps = steps.length;
  
  // Load existing titulo for edit
  const { data: titulo } = trpc.titulos.getById.useQuery(tituloId!, { enabled: !!tituloId });
  
  // Mutations
  const createMutation = trpc.titulos.create.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.count} título(s) criado(s) com sucesso`);
      utils.titulos.list.invalidate();
      utils.titulos.stats.invalidate();
      if (currentDraftId) deleteDraft(currentDraftId);
      onSuccess?.();
    },
    onError: (err) => toast.error(err.message),
  });
  
  const updateMutation = trpc.titulos.update.useMutation({
    onSuccess: () => {
      toast.success('Título atualizado');
      utils.titulos.list.invalidate();
      utils.titulos.stats.invalidate();
      onSuccess?.();
    },
    onError: (err) => toast.error(err.message),
  });
  
  // Valor líquido calculado
  const valorLiquido = useMemo(() => {
    const original = parseFloat(form.valorOriginal) || 0;
    const desconto = parseFloat(form.valorDesconto) || 0;
    const acrescimo = parseFloat(form.valorAcrescimo) || 0;
    return original - desconto + acrescimo;
  }, [form.valorOriginal, form.valorDesconto, form.valorAcrescimo]);
  
  // Load drafts from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as TituloDraft[];
        setDrafts(parsed);
        // Check for most recent draft (if not editing existing titulo)
        if (!tituloId && parsed.length > 0) {
          const mostRecent = parsed.sort((a, b) => 
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          )[0];
          // Only show pending if less than 24h old
          const ageMs = Date.now() - new Date(mostRecent.updatedAt).getTime();
          if (ageMs < 24 * 60 * 60 * 1000) {
            setHasPendingDraft(true);
            setPendingDraft(mostRecent);
          }
        }
      }
    } catch { /* ignore */ }
  }, [tituloId]);
  
  // Load existing titulo
  useEffect(() => {
    if (titulo) {
      setForm({
        tipo: titulo.tipo,
        natureza: titulo.natureza,
        descricao: titulo.descricao,
        valorOriginal: titulo.valorOriginal,
        valorDesconto: titulo.valorDesconto || '0',
        valorAcrescimo: titulo.valorAcrescimo || '0',
        dataEmissao: titulo.dataEmissao,
        dataCompetencia: titulo.dataCompetencia,
        dataVencimento: titulo.dataVencimento,
        numeroDocumento: titulo.numeroDocumento || '',
        serieDocumento: titulo.serieDocumento || '',
        pessoaId: titulo.pessoaId || '',
        contaContabilId: titulo.contaContabilId || '',
        centroCustoId: titulo.centroCustoId || '',
        projetoId: titulo.projetoId || '',
        fundoId: titulo.fundoId || '',
        observacoes: titulo.observacoes || '',
        status: titulo.status,
        parcelas: 1,
        intervaloParcelas: 1,
      });
      initialFormRef.current = JSON.stringify(form);
    }
  }, [titulo]);
  
  // Track dirty state
  useEffect(() => {
    const currentFormStr = JSON.stringify(form);
    setIsDirty(currentFormStr !== initialFormRef.current);
  }, [form]);
  
  // Autosave with debounce
  useEffect(() => {
    if (!isDirty || tituloId) return;
    
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
  }, [form, isDirty, tituloId]);
  
  // Calculate warnings
  const calculateWarnings = useCallback((): Warning[] => {
    const w: Warning[] = [];
    
    if (form.natureza === 'doacao' && form.tipo === 'receber' && !form.pessoaId) {
      w.push({
        campo: 'pessoaId',
        mensagem: 'Doação sem pessoa vinculada não gera recibo para IR',
        tipo: 'warning',
        step: 3,
      });
    }
    
    if (!form.descricao || form.descricao.length < 5) {
      w.push({
        campo: 'descricao',
        mensagem: 'Descrição curta dificulta identificação futura',
        tipo: 'info',
        step: 0,
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
      if (!form.natureza) newErrors.natureza = 'Selecione a natureza do título';
      if (!form.descricao || form.descricao.length < 3) {
        newErrors.descricao = 'Descrição deve ter no mínimo 3 caracteres';
      }
    }
    
    if (step.id === 'valores') {
      if (!form.valorOriginal || parseFloat(form.valorOriginal) <= 0) {
        newErrors.valorOriginal = 'Valor original deve ser maior que zero';
      }
      if (valorLiquido <= 0) {
        newErrors.valorLiquido = 'Valor líquido deve ser positivo (desconto maior que original?)';
      }
    }
    
    if (step.id === 'datas') {
      if (!form.dataVencimento) {
        newErrors.dataVencimento = 'Data de vencimento é obrigatória';
      }
      if (form.dataVencimento && form.dataEmissao && form.dataVencimento < form.dataEmissao) {
        newErrors.dataVencimento = 'Vencimento não pode ser anterior à emissão';
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
  const updateField = <K extends keyof TituloFormData>(key: K, value: TituloFormData[K]) => {
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
    const draft: TituloDraft = {
      id: draftId,
      data: form,
      updatedAt: new Date().toISOString(),
      tipo: form.tipo,
      valorLiquido,
      descricao: form.descricao || 'Sem descrição',
    };
    
    const updatedDrafts = drafts.filter(d => d.id !== draftId);
    updatedDrafts.unshift(draft);
    
    // Keep max 10 drafts
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
  
  const loadDraft = (draft: TituloDraft) => {
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
    // Validate all steps
    for (let i = 0; i < totalSteps - 1; i++) {
      if (!validateStep(i)) {
        setCurrentStep(i);
        toast.error('Corrija os erros antes de cadastrar');
        return false;
      }
    }
    
    setIsSubmitting(true);
    
    try {
      if (tituloId) {
        await updateMutation.mutateAsync({
          id: tituloId,
          descricao: form.descricao,
          valorDesconto: parseFloat(form.valorDesconto) || 0,
          valorAcrescimo: parseFloat(form.valorAcrescimo) || 0,
          dataVencimento: form.dataVencimento,
          numeroDocumento: form.numeroDocumento || undefined,
          serieDocumento: form.serieDocumento || undefined,
          pessoaId: form.pessoaId || null,
          contaContabilId: form.contaContabilId || null,
          observacoes: form.observacoes || undefined,
        });
      } else {
        await createMutation.mutateAsync({
          tipo: form.tipo,
          natureza: form.natureza as any,
          descricao: form.descricao,
          valorOriginal: parseFloat(form.valorOriginal),
          valorDesconto: parseFloat(form.valorDesconto) || 0,
          valorAcrescimo: parseFloat(form.valorAcrescimo) || 0,
          dataEmissao: form.dataEmissao,
          dataCompetencia: form.dataCompetencia,
          dataVencimento: form.dataVencimento,
          numeroDocumento: form.numeroDocumento || undefined,
          serieDocumento: form.serieDocumento || undefined,
          pessoaId: form.pessoaId || undefined,
          contaContabilId: form.contaContabilId || undefined,
          centroCustoId: form.centroCustoId || undefined,
          projetoId: form.projetoId || undefined,
          fundoId: form.fundoId || undefined,
          observacoes: form.observacoes || undefined,
          status: form.status as any,
          parcelas: form.parcelas > 1 ? form.parcelas : undefined,
          intervaloParcelas: form.intervaloParcelas,
        });
      }
      return true;
    } catch {
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const value: TituloWizardContextValue = {
    form,
    setForm,
    updateField,
    valorLiquido,
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
  };
  
  return (
    <TituloWizardContext.Provider value={value}>
      {children}
    </TituloWizardContext.Provider>
  );
}

