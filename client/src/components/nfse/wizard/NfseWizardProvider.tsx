import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode, useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

// Types
export type TipoTributacao = 'T' | 'F' | 'A' | 'B' | 'M' | 'N' | 'X';

export interface EnderecoForm {
  tipoLogradouro: string;
  logradouro: string;
  numeroEndereco: string;
  complementoEndereco: string;
  bairro: string;
  cidade: number | null;
  uf: string;
  cep: string;
}

export interface TomadorForm {
  cpfCnpj: string;
  razaoSocial: string;
  inscricaoMunicipal: string;
  email: string;
  endereco: EnderecoForm;
}

export interface NfseFormData {
  serieRPS: string;
  numeroRPS: string;
  dataEmissao: string;
  tributacao: TipoTributacao;
  valorServicos: string;
  valorDeducoes: string;
  codigoServico: string;
  aliquota: string;
  issRetido: boolean;
  discriminacao: string;
  tomador: TomadorForm;
  valorPIS: string;
  valorCOFINS: string;
  valorINSS: string;
  valorIR: string;
  valorCSLL: string;
}

export interface Warning {
  campo: string;
  mensagem: string;
  tipo: 'info' | 'warning' | 'bloqueio';
  step?: number;
}

export type StepId = 'tomador' | 'servico' | 'tributacao' | 'revisao';

export interface StepConfig {
  id: StepId;
  label: string;
  icon: string;
}

const STEPS: StepConfig[] = [
  { id: 'tomador', label: 'Tomador', icon: '👤' },
  { id: 'servico', label: 'Serviço', icon: '📋' },
  { id: 'tributacao', label: 'Tributação', icon: '💰' },
  { id: 'revisao', label: 'Revisão', icon: '✅' },
];

const getInitialFormData = (): NfseFormData => ({
  serieRPS: 'NF',
  numeroRPS: '',
  dataEmissao: new Date().toISOString().split('T')[0],
  tributacao: 'T',
  valorServicos: '',
  valorDeducoes: '0',
  codigoServico: '',
  aliquota: '0.05',
  issRetido: false,
  discriminacao: '',
  tomador: {
    cpfCnpj: '',
    razaoSocial: '',
    inscricaoMunicipal: '',
    email: '',
    endereco: {
      tipoLogradouro: 'R',
      logradouro: '',
      numeroEndereco: '',
      complementoEndereco: '',
      bairro: '',
      cidade: null,
      uf: 'SP',
      cep: '',
    },
  },
  valorPIS: '',
  valorCOFINS: '',
  valorINSS: '',
  valorIR: '',
  valorCSLL: '',
});

// Context
interface NfseWizardContextValue {
  form: NfseFormData;
  setForm: React.Dispatch<React.SetStateAction<NfseFormData>>;
  updateField: <K extends keyof NfseFormData>(key: K, value: NfseFormData[K]) => void;
  updateTomador: <K extends keyof TomadorForm>(key: K, value: TomadorForm[K]) => void;
  updateEndereco: <K extends keyof EnderecoForm>(key: K, value: EnderecoForm[K]) => void;
  
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
  isSubmitting: boolean;
  submitResult: { sucesso: boolean; numeroNFe?: string; codigoVerificacao?: string; mensagem?: string } | null;
  
  submit: () => Promise<boolean>;
  reset: () => void;
  
  fieldRefs: React.MutableRefObject<Record<string, HTMLElement | null>>;
  focusField: (fieldId: string) => void;
}

const NfseWizardContext = createContext<NfseWizardContextValue | null>(null);

export function useNfseWizard() {
  const ctx = useContext(NfseWizardContext);
  if (!ctx) throw new Error('useNfseWizard must be used within NfseWizardProvider');
  return ctx;
}

// Provider
interface NfseWizardProviderProps {
  children: ReactNode;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function NfseWizardProvider({ children, onSuccess }: NfseWizardProviderProps) {
  const [form, setForm] = useState<NfseFormData>(getInitialFormData);
  const [currentStep, setCurrentStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ sucesso: boolean; numeroNFe?: string; codigoVerificacao?: string; mensagem?: string } | null>(null);
  
  const initialFormRef = useRef<string>(JSON.stringify(getInitialFormData()));
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});
  
  const steps = STEPS;
  const totalSteps = steps.length;
  
  // Mutation
  const emitirMutation = trpc.nfse.spEmitir.useMutation({
    onSuccess: (data) => {
      setSubmitResult(data);
      if (data.sucesso) {
        toast.success(`NFS-e ${data.numeroNFe} emitida com sucesso!`);
        onSuccess?.();
      } else {
        toast.error(data.mensagem || 'Erro ao emitir NFS-e');
      }
    },
    onError: (err) => {
      toast.error(err.message);
      setSubmitResult({ sucesso: false, mensagem: err.message });
    },
  });
  
  // Track dirty state
  useEffect(() => {
    const currentFormStr = JSON.stringify(form);
    setIsDirty(currentFormStr !== initialFormRef.current);
  }, [form]);
  
  // Calculate warnings
  const calculateWarnings = useCallback((): Warning[] => {
    const w: Warning[] = [];
    
    if (!form.tomador.cpfCnpj) {
      w.push({
        campo: 'cpfCnpj',
        mensagem: 'CPF/CNPJ do tomador é obrigatório',
        tipo: 'bloqueio',
        step: 0,
      });
    }
    
    if (form.tributacao === 'A') {
      w.push({
        campo: 'tributacao',
        mensagem: 'Isenção (A) requer cadastro no GBF da prefeitura',
        tipo: 'warning',
        step: 2,
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
    
    if (step.id === 'tomador') {
      const cpfCnpj = form.tomador.cpfCnpj.replace(/\D/g, '');
      if (!cpfCnpj) {
        newErrors['tomador.cpfCnpj'] = 'CPF ou CNPJ é obrigatório';
      } else if (cpfCnpj.length !== 11 && cpfCnpj.length !== 14) {
        newErrors['tomador.cpfCnpj'] = 'CPF deve ter 11 dígitos ou CNPJ 14 dígitos';
      }
      
      if (cpfCnpj.length === 14 && !form.tomador.razaoSocial) {
        newErrors['tomador.razaoSocial'] = 'Razão social é obrigatória para CNPJ';
      }
    }
    
    if (step.id === 'servico') {
      if (!form.codigoServico) {
        newErrors.codigoServico = 'Código do serviço é obrigatório';
      }
      
      if (!form.valorServicos || parseFloat(form.valorServicos) <= 0) {
        newErrors.valorServicos = 'Valor dos serviços deve ser maior que zero';
      }
      
      if (!form.discriminacao || form.discriminacao.length < 10) {
        newErrors.discriminacao = 'Discriminação deve ter no mínimo 10 caracteres';
      }
      
      if (form.discriminacao.length > 2000) {
        newErrors.discriminacao = 'Discriminação deve ter no máximo 2000 caracteres';
      }
    }
    
    if (step.id === 'tributacao') {
      const aliquota = parseFloat(form.aliquota) || 0;
      if (form.tributacao === 'T' && aliquota <= 0) {
        newErrors.aliquota = 'Alíquota deve ser maior que zero para tributação em SP';
      }
      
      if (!form.numeroRPS) {
        newErrors.numeroRPS = 'Número do RPS é obrigatório';
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
  
  // Field update helpers
  const updateField = <K extends keyof NfseFormData>(key: K, value: NfseFormData[K]) => {
    setForm(f => ({ ...f, [key]: value }));
  };
  
  const updateTomador = <K extends keyof TomadorForm>(key: K, value: TomadorForm[K]) => {
    setForm(f => ({ ...f, tomador: { ...f.tomador, [key]: value } }));
  };
  
  const updateEndereco = <K extends keyof EnderecoForm>(key: K, value: EnderecoForm[K]) => {
    setForm(f => ({
      ...f,
      tomador: {
        ...f.tomador,
        endereco: { ...f.tomador.endereco, [key]: value },
      },
    }));
  };
  
  // Focus field
  const focusField = (fieldId: string) => {
    const el = fieldRefs.current[fieldId];
    if (el) {
      el.focus();
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };
  
  // Reset
  const reset = () => {
    setForm(getInitialFormData());
    setCurrentStep(0);
    setErrors({});
    setIsDirty(false);
    setSubmitResult(null);
    initialFormRef.current = JSON.stringify(getInitialFormData());
  };
  
  // Submit
  const submit = async (): Promise<boolean> => {
    // Validate all steps
    for (let i = 0; i < totalSteps - 1; i++) {
      if (!validateStep(i)) {
        setCurrentStep(i);
        toast.error('Corrija os erros antes de emitir');
        return false;
      }
    }
    
    setIsSubmitting(true);
    
    try {
      const cpfCnpj = form.tomador.cpfCnpj.replace(/\D/g, '');
      const cep = form.tomador.endereco.cep.replace(/\D/g, '');
      
      await emitirMutation.mutateAsync({
        serieRPS: form.serieRPS,
        numeroRPS: parseInt(form.numeroRPS),
        dataEmissao: form.dataEmissao,
        tributacao: form.tributacao,
        valorServicos: parseFloat(form.valorServicos),
        valorDeducoes: parseFloat(form.valorDeducoes) || 0,
        codigoServico: form.codigoServico,
        aliquota: parseFloat(form.aliquota),
        issRetido: form.issRetido,
        discriminacao: form.discriminacao,
        tomador: {
          cpfCnpj,
          razaoSocial: form.tomador.razaoSocial || undefined,
          inscricaoMunicipal: form.tomador.inscricaoMunicipal || undefined,
          email: form.tomador.email || undefined,
          endereco: form.tomador.endereco.logradouro ? {
            tipoLogradouro: form.tomador.endereco.tipoLogradouro || undefined,
            logradouro: form.tomador.endereco.logradouro || undefined,
            numeroEndereco: form.tomador.endereco.numeroEndereco || undefined,
            complementoEndereco: form.tomador.endereco.complementoEndereco || undefined,
            bairro: form.tomador.endereco.bairro || undefined,
            cidade: form.tomador.endereco.cidade || undefined,
            uf: form.tomador.endereco.uf || undefined,
            cep: cep ? parseInt(cep) : undefined,
          } : undefined,
        },
        valorPIS: form.valorPIS ? parseFloat(form.valorPIS) : undefined,
        valorCOFINS: form.valorCOFINS ? parseFloat(form.valorCOFINS) : undefined,
        valorINSS: form.valorINSS ? parseFloat(form.valorINSS) : undefined,
        valorIR: form.valorIR ? parseFloat(form.valorIR) : undefined,
        valorCSLL: form.valorCSLL ? parseFloat(form.valorCSLL) : undefined,
      });
      
      return true;
    } catch {
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const value: NfseWizardContextValue = useMemo(() => ({
    form,
    setForm,
    updateField,
    updateTomador,
    updateEndereco,
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
    isSubmitting,
    submitResult,
    submit,
    reset,
    fieldRefs,
    focusField,
  }), [form, currentStep, errors, warnings, isDirty, isSubmitting, submitResult, canProceed]);
  
  return (
    <NfseWizardContext.Provider value={value}>
      {children}
    </NfseWizardContext.Provider>
  );
}

