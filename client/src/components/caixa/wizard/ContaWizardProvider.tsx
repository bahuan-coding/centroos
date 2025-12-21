import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

// Types
export type TipoConta = 'caixa' | 'conta_corrente' | 'poupanca' | 'aplicacao' | 'cartao';
export type TipoPix = 'cpf' | 'cnpj' | 'email' | 'telefone' | 'aleatoria';

export interface ContaFinanceiraFormData {
  tipo: TipoConta;
  nome: string;
  bancoCodigo: string;
  bancoNome: string;
  agencia: string;
  contaNumero: string;
  contaDigito: string;
  pixTipo: TipoPix | '';
  pixChave: string;
  saldoInicial: string;
  dataSaldoInicial: string;
  contaContabilId: string;
}

export interface Warning {
  campo: string;
  mensagem: string;
  tipo: 'info' | 'warning';
  step?: number;
}

export type StepId = 'identificacao' | 'dados-bancarios' | 'saldo-inicial' | 'extras' | 'revisao';

export interface StepConfig {
  id: StepId;
  label: string;
  icon: string;
  optional?: boolean;
}

const ALL_STEPS: StepConfig[] = [
  { id: 'identificacao', label: 'Identificação', icon: '🏦' },
  { id: 'dados-bancarios', label: 'Dados Bancários', icon: '🏛️' },
  { id: 'saldo-inicial', label: 'Saldo Inicial', icon: '💰' },
  { id: 'extras', label: 'Extras', icon: '⚡', optional: true },
  { id: 'revisao', label: 'Revisão', icon: '✅' },
];

const CAIXA_STEPS: StepConfig[] = [
  { id: 'identificacao', label: 'Identificação', icon: '🏦' },
  { id: 'saldo-inicial', label: 'Saldo Inicial', icon: '💰' },
  { id: 'extras', label: 'Extras', icon: '⚡', optional: true },
  { id: 'revisao', label: 'Revisão', icon: '✅' },
];

function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

const initialFormData: ContaFinanceiraFormData = {
  tipo: 'conta_corrente',
  nome: '',
  bancoCodigo: '',
  bancoNome: '',
  agencia: '',
  contaNumero: '',
  contaDigito: '',
  pixTipo: '',
  pixChave: '',
  saldoInicial: '0',
  dataSaldoInicial: getTodayDate(),
  contaContabilId: '',
};

interface ContaWizardContextValue {
  // Form state
  form: ContaFinanceiraFormData;
  setForm: React.Dispatch<React.SetStateAction<ContaFinanceiraFormData>>;
  updateField: <K extends keyof ContaFinanceiraFormData>(key: K, value: ContaFinanceiraFormData[K]) => void;
  
  // Navigation
  currentStep: number;
  setCurrentStep: (step: number) => void;
  steps: StepConfig[];
  totalSteps: number;
  goNext: () => void;
  goBack: () => void;
  goToStep: (step: number) => void;
  
  // Validation
  errors: Record<string, string>;
  warnings: Warning[];
  validateCurrentStep: () => boolean;
  
  // State
  isDirty: boolean;
  isSaving: boolean;
  lastSaved: Date | null;
  isSubmitting: boolean;
  
  // Actions
  saveDraft: () => Promise<void>;
  submit: () => Promise<string | null>;
  
  // Refs for focus
  fieldRefs: React.MutableRefObject<Record<string, HTMLElement | null>>;
  focusField: (fieldId: string) => void;
  
  // Mode
  mode: 'create' | 'edit';
  contaId?: string;
}

const ContaWizardContext = createContext<ContaWizardContextValue | null>(null);

export function useContaWizard() {
  const ctx = useContext(ContaWizardContext);
  if (!ctx) throw new Error('useContaWizard must be used within ContaWizardProvider');
  return ctx;
}

interface ContaWizardProviderProps {
  children: ReactNode;
  onSuccess?: (contaId: string) => void;
  onCancel?: () => void;
  initialData?: Partial<ContaFinanceiraFormData>;
  contaId?: string;
  mode?: 'create' | 'edit';
}

export function ContaWizardProvider({ 
  children, 
  onSuccess,
  initialData,
  contaId,
  mode = 'create',
}: ContaWizardProviderProps) {
  const utils = trpc.useUtils();
  
  const [form, setForm] = useState<ContaFinanceiraFormData>(() => ({
    ...initialFormData,
    ...initialData,
  }));
  const [currentStep, setCurrentStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const initialFormRef = useRef<string>(JSON.stringify({ ...initialFormData, ...initialData }));
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});
  
  // Steps based on tipo (Caixa skips dados bancários)
  const steps = form.tipo === 'caixa' ? CAIXA_STEPS : ALL_STEPS;
  const totalSteps = steps.length;
  
  // Mutations
  const createMutation = trpc.contasFinanceiras.create.useMutation({
    onSuccess: (data) => {
      toast.success('Conta criada com sucesso!');
      utils.contasFinanceiras.invalidate();
      initialFormRef.current = JSON.stringify(form);
      setIsDirty(false);
      onSuccess?.(data.id);
    },
    onError: (err) => toast.error(err.message || 'Erro ao criar conta'),
  });
  
  const updateMutation = trpc.contasFinanceiras.update.useMutation({
    onSuccess: () => {
      toast.success('Conta atualizada com sucesso!');
      utils.contasFinanceiras.invalidate();
      initialFormRef.current = JSON.stringify(form);
      setIsDirty(false);
      onSuccess?.(contaId!);
    },
    onError: (err) => toast.error(err.message || 'Erro ao atualizar conta'),
  });
  
  // Track dirty state
  useEffect(() => {
    const currentFormStr = JSON.stringify(form);
    setIsDirty(currentFormStr !== initialFormRef.current);
  }, [form]);
  
  // Calculate warnings
  const calculateWarnings = useCallback((): Warning[] => {
    const w: Warning[] = [];
    
    // PIX não cadastrado
    if (!form.pixTipo || !form.pixChave) {
      w.push({
        campo: 'pix',
        mensagem: 'Chave PIX não cadastrada (opcional, mas facilita a conciliação)',
        tipo: 'info',
        step: steps.findIndex(s => s.id === 'extras'),
      });
    }
    
    // Vínculo contábil desabilitado por enquanto (aguardando integração com plano de contas)
    // Não exibir warning pois a feature não está disponível ainda
    
    return w;
  }, [form, steps]);
  
  useEffect(() => {
    setWarnings(calculateWarnings());
  }, [calculateWarnings]);
  
  // Validation per step
  const validateStep = (stepIndex: number): boolean => {
    const newErrors: Record<string, string> = {};
    const step = steps[stepIndex];
    
    if (step.id === 'identificacao') {
      if (!form.nome.trim() || form.nome.length < 2) {
        newErrors.nome = 'Nome deve ter no mínimo 2 caracteres';
      }
    }
    
    if (step.id === 'dados-bancarios') {
      if (!form.bancoCodigo) {
        newErrors.bancoCodigo = 'Selecione o banco';
      }
      if (!form.agencia || form.agencia.length < 4) {
        newErrors.agencia = 'Informe a agência (mínimo 4 dígitos)';
      }
      if (!form.contaNumero || form.contaNumero.length < 4) {
        newErrors.contaNumero = 'Informe o número da conta';
      }
    }
    
    if (step.id === 'saldo-inicial') {
      if (!form.saldoInicial) {
        newErrors.saldoInicial = 'Informe o saldo inicial';
      }
      if (!form.dataSaldoInicial) {
        newErrors.dataSaldoInicial = 'Informe a data do saldo';
      }
    }
    
    if (step.id === 'extras') {
      if (form.pixTipo && !form.pixChave) {
        newErrors.pixChave = 'Informe a chave PIX ou remova o tipo selecionado';
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
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  
  const goBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  
  const goToStep = (step: number) => {
    if (step >= 0 && step < totalSteps && step <= currentStep) {
      setCurrentStep(step);
    }
  };
  
  // Update field helper
  const updateField = <K extends keyof ContaFinanceiraFormData>(key: K, value: ContaFinanceiraFormData[K]) => {
    setForm(f => ({ ...f, [key]: value }));
    // Clear error for this field
    if (errors[key]) {
      setErrors(e => {
        const newErrors = { ...e };
        delete newErrors[key];
        return newErrors;
      });
    }
  };
  
  // Focus field
  const focusField = (fieldId: string) => {
    const el = fieldRefs.current[fieldId];
    if (el) {
      el.focus();
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };
  
  // Save draft (localStorage)
  const saveDraft = async () => {
    setIsSaving(true);
    try {
      localStorage.setItem('conta_financeira_draft', JSON.stringify(form));
      setLastSaved(new Date());
      toast.success('Rascunho salvo!');
    } finally {
      setIsSaving(false);
    }
  };
  
  // Submit
  const submit = async (): Promise<string | null> => {
    // Validate all steps except review
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
        tipo: form.tipo,
        nome: form.nome.trim(),
        bancoCodigo: form.bancoCodigo || undefined,
        bancoNome: form.bancoNome || undefined,
        agencia: form.agencia || undefined,
        contaNumero: form.contaNumero || undefined,
        contaDigito: form.contaDigito || undefined,
        pixTipo: form.pixTipo || undefined,
        pixChave: form.pixChave || undefined,
        saldoInicial: form.saldoInicial,
        dataSaldoInicial: form.dataSaldoInicial,
        // TODO: integrar com API de plano de contas para obter UUIDs válidos
        // contaContabilId: form.contaContabilId (requer UUID válido)
        contaContabilId: undefined,
      };
      
      if (mode === 'edit' && contaId) {
        await updateMutation.mutateAsync({
          id: contaId,
          nome: payload.nome,
          pixTipo: payload.pixTipo as any,
          pixChave: payload.pixChave,
          // contaContabilId: requires UUID from API
          contaContabilId: undefined,
        });
        // Clear draft on success
        localStorage.removeItem('conta_financeira_draft');
        return contaId;
      } else {
        const result = await createMutation.mutateAsync(payload as any);
        // Clear draft on success
        localStorage.removeItem('conta_financeira_draft');
        return result.id;
      }
    } catch {
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const value: ContaWizardContextValue = {
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
    errors,
    warnings,
    validateCurrentStep,
    isDirty,
    isSaving,
    lastSaved,
    isSubmitting,
    saveDraft,
    submit,
    fieldRefs,
    focusField,
    mode,
    contaId,
  };
  
  return <ContaWizardContext.Provider value={value}>{children}</ContaWizardContext.Provider>;
}

