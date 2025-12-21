import { createContext, useContext, useState, useRef, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { Hash, Layers, FileText, CheckCircle2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

// ============================================================================
// TYPES
// ============================================================================

export interface PlanoContasFormData {
  codigo: string;
  nome: string;
  tipo: 'ativo' | 'passivo' | 'patrimonio_social' | 'receita' | 'despesa';
  naturezaSaldo: 'devedora' | 'credora';
  classificacao: 'sintetica' | 'analitica';
  contaPaiId: string;
  descricao: string;
}

export interface Warning {
  tipo: 'warning' | 'info';
  mensagem: string;
  campo?: string;
  step?: number;
}

export interface PlanoContasDraft {
  id: string;
  data: PlanoContasFormData;
  updatedAt: string;
  codigo: string;
  nome: string;
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

const STORAGE_KEY = 'plano_contas_drafts';

const STEPS: StepConfig[] = [
  { id: 'identificacao', label: 'Identificação', icon: <Hash className="h-5 w-5" /> },
  { id: 'classificacao', label: 'Classificação', icon: <Layers className="h-5 w-5" /> },
  { id: 'detalhes', label: 'Detalhes', icon: <FileText className="h-5 w-5" />, optional: true },
  { id: 'revisao', label: 'Revisão', icon: <CheckCircle2 className="h-5 w-5" /> },
];

const initialFormData: PlanoContasFormData = {
  codigo: '',
  nome: '',
  tipo: 'despesa',
  naturezaSaldo: 'devedora',
  classificacao: 'analitica',
  contaPaiId: '',
  descricao: '',
};

function generateId() {
  return `draft_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// ============================================================================
// CONTEXT
// ============================================================================

interface PlanoContasWizardContextValue {
  form: PlanoContasFormData;
  setForm: React.Dispatch<React.SetStateAction<PlanoContasFormData>>;
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
  updateField: <K extends keyof PlanoContasFormData>(key: K, value: PlanoContasFormData[K]) => void;
  fieldRefs: React.MutableRefObject<Record<string, HTMLElement | null>>;
  focusField: (fieldId: string) => void;
  
  // Drafts
  drafts: PlanoContasDraft[];
  hasPendingDraft: boolean;
  pendingDraft: PlanoContasDraft | null;
  currentDraftId: string | null;
  saveDraft: () => void;
  loadDraft: (draft: PlanoContasDraft) => void;
  deleteDraft: (draftId: string) => void;
  discardCurrentDraft: () => void;
  
  // Submit
  submit: () => Promise<string | null>;
  
  // Hierarchy data
  hierarchy: any[];
  contaPai: any | null;
  contaPaiBreadcrumb: string[];
}

const PlanoContasWizardContext = createContext<PlanoContasWizardContextValue | null>(null);

export function usePlanoContasWizard() {
  const ctx = useContext(PlanoContasWizardContext);
  if (!ctx) throw new Error('usePlanoContasWizard must be used within PlanoContasWizardProvider');
  return ctx;
}

// ============================================================================
// PROVIDER
// ============================================================================

interface PlanoContasWizardProviderProps {
  children: ReactNode;
  contaId?: string | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function PlanoContasWizardProvider({ children, contaId, onSuccess }: PlanoContasWizardProviderProps) {
  const utils = trpc.useUtils();
  
  const [form, setForm] = useState<PlanoContasFormData>(initialFormData);
  const [currentStep, setCurrentStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<PlanoContasDraft[]>([]);
  const [hasPendingDraft, setHasPendingDraft] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<PlanoContasDraft | null>(null);
  
  const initialFormRef = useRef<string>(JSON.stringify(initialFormData));
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});
  const autosaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const steps = STEPS;
  const totalSteps = steps.length;
  
  // Fetch hierarchy for Conta Pai
  const { data: hierarchy = [] } = trpc.accounts.planoContasHierarchy.useQuery();
  
  // Mutations
  const createMutation = trpc.accounts.planoContasCreate.useMutation({
    onSuccess: () => {
      toast.success('Conta criada com sucesso!');
      utils.accounts.planoContasTree.invalidate();
      utils.accounts.planoContasHierarchy.invalidate();
      if (currentDraftId) deleteDraft(currentDraftId);
      onSuccess?.();
    },
    onError: (err) => toast.error(err.message),
  });
  
  const updateMutation = trpc.accounts.planoContasUpdate.useMutation({
    onSuccess: () => {
      toast.success('Conta atualizada!');
      utils.accounts.planoContasTree.invalidate();
      utils.accounts.planoContasHierarchy.invalidate();
      onSuccess?.();
    },
    onError: (err) => toast.error(err.message),
  });
  
  // Load drafts from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as PlanoContasDraft[];
        setDrafts(parsed);
        if (parsed.length > 0 && !contaId) {
          setHasPendingDraft(true);
          setPendingDraft(parsed[0]);
        }
      }
    } catch { /* ignore */ }
  }, [contaId]);
  
  // Track dirty state
  useEffect(() => {
    const currentFormStr = JSON.stringify(form);
    setIsDirty(currentFormStr !== initialFormRef.current);
  }, [form]);
  
  // Auto-save with debounce
  useEffect(() => {
    if (isDirty && !contaId) {
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
  }, [form, isDirty, contaId]);
  
  // Calculate warnings
  const calculateWarnings = useCallback(() => {
    const w: Warning[] = [];
    
    if (form.classificacao === 'sintetica' && !form.descricao) {
      w.push({
        tipo: 'info',
        mensagem: 'Contas sintéticas geralmente têm descrição do agrupamento',
        campo: 'descricao',
        step: 2,
      });
    }
    
    if (form.classificacao === 'analitica' && form.contaPaiId === '') {
      w.push({
        tipo: 'warning',
        mensagem: 'Recomenda-se vincular a uma conta pai para manter a hierarquia',
        campo: 'contaPaiId',
        step: 1,
      });
    }
    
    setWarnings(w);
  }, [form]);
  
  useEffect(() => {
    calculateWarnings();
  }, [calculateWarnings]);
  
  // Get conta pai info
  const contaPai = useMemo(() => {
    if (!form.contaPaiId) return null;
    return hierarchy.find((h: any) => h.id === form.contaPaiId) || null;
  }, [form.contaPaiId, hierarchy]);
  
  const contaPaiBreadcrumb = useMemo(() => {
    if (!contaPai) return [];
    const path: string[] = [];
    let current: any = contaPai;
    while (current) {
      path.unshift(`${current.codigo} - ${current.nome}`);
      current = hierarchy.find((h: any) => h.id === current.contaPaiId);
    }
    return path;
  }, [contaPai, hierarchy]);
  
  // Validation
  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (step === 0) {
      if (!form.codigo.trim()) newErrors.codigo = 'Código é obrigatório';
      else if (!/^[\d.]+$/.test(form.codigo)) newErrors.codigo = 'Código deve conter apenas números e pontos';
      if (!form.nome.trim()) newErrors.nome = 'Nome é obrigatório';
      else if (form.nome.length < 3) newErrors.nome = 'Nome deve ter ao menos 3 caracteres';
    }
    
    if (step === 1) {
      if (!form.tipo) newErrors.tipo = 'Tipo é obrigatório';
      if (!form.naturezaSaldo) newErrors.naturezaSaldo = 'Natureza é obrigatória';
      if (!form.classificacao) newErrors.classificacao = 'Classificação é obrigatória';
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
  
  // Field helpers
  const updateField = <K extends keyof PlanoContasFormData>(key: K, value: PlanoContasFormData[K]) => {
    setForm(f => ({ ...f, [key]: value }));
    
    // Auto-adjust natureza based on tipo
    if (key === 'tipo') {
      const tipo = value as string;
      const nat = ['ativo', 'despesa'].includes(tipo) ? 'devedora' : 'credora';
      setForm(f => ({ ...f, naturezaSaldo: nat as 'devedora' | 'credora' }));
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
    const draft: PlanoContasDraft = {
      id: draftId,
      data: form,
      updatedAt: new Date().toISOString(),
      codigo: form.codigo || 'Sem código',
      nome: form.nome || 'Sem nome',
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
  
  const loadDraft = (draft: PlanoContasDraft) => {
    setForm(draft.data);
    setCurrentDraftId(draft.id);
    setHasPendingDraft(false);
    setPendingDraft(null);
    initialFormRef.current = JSON.stringify(draft.data);
    setIsDirty(false);
    setCurrentStep(0);
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
  const submit = async (): Promise<string | null> => {
    for (let i = 0; i < totalSteps - 1; i++) {
      if (!validateStep(i)) {
        setCurrentStep(i);
        toast.error('Corrija os erros antes de criar a conta');
        return null;
      }
    }
    
    setIsSubmitting(true);
    
    try {
      const payload = {
        codigo: form.codigo.trim(),
        nome: form.nome.trim(),
        tipo: form.tipo,
        naturezaSaldo: form.naturezaSaldo,
        classificacao: form.classificacao,
        contaPaiId: form.contaPaiId || undefined,
        descricao: form.descricao.trim() || undefined,
      };
      
      if (contaId) {
        await updateMutation.mutateAsync({
          id: contaId,
          nome: payload.nome,
          descricao: payload.descricao,
        });
        return contaId;
      } else {
        const result = await createMutation.mutateAsync(payload);
        if (currentDraftId) deleteDraft(currentDraftId);
        return result.id;
      }
    } catch {
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const value: PlanoContasWizardContextValue = {
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
    submit,
    hierarchy,
    contaPai,
    contaPaiBreadcrumb,
  };
  
  return (
    <PlanoContasWizardContext.Provider value={value}>
      {children}
    </PlanoContasWizardContext.Provider>
  );
}

