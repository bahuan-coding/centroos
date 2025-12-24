import { toast as sonnerToast } from 'sonner';

// Wrapper com estilos padronizados para consistência
export const toast = {
  success: (message: string, description?: string) => {
    sonnerToast.success(message, {
      description,
      duration: 4000,
    });
  },

  error: (message: string, description?: string) => {
    sonnerToast.error(message, {
      description,
      duration: 6000,
    });
  },

  warning: (message: string, description?: string) => {
    sonnerToast.warning(message, {
      description,
      duration: 5000,
    });
  },

  info: (message: string, description?: string) => {
    sonnerToast.info(message, {
      description,
      duration: 4000,
    });
  },

  loading: (message: string) => {
    return sonnerToast.loading(message);
  },

  dismiss: (id?: string | number) => {
    sonnerToast.dismiss(id);
  },

  promise: <T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((err: unknown) => string);
    }
  ) => {
    return sonnerToast.promise(promise, messages);
  },
};

// Mensagens padrão para operações comuns
export const TOAST_MESSAGES = {
  save: {
    loading: 'Salvando...',
    success: 'Salvo com sucesso!',
    error: 'Erro ao salvar. Tente novamente.',
  },
  delete: {
    loading: 'Excluindo...',
    success: 'Excluído com sucesso!',
    error: 'Erro ao excluir. Tente novamente.',
  },
  create: {
    loading: 'Criando...',
    success: 'Criado com sucesso!',
    error: 'Erro ao criar. Tente novamente.',
  },
  update: {
    loading: 'Atualizando...',
    success: 'Atualizado com sucesso!',
    error: 'Erro ao atualizar. Tente novamente.',
  },
  export: {
    loading: 'Gerando arquivo...',
    success: 'Arquivo gerado com sucesso!',
    error: 'Erro ao gerar arquivo. Tente novamente.',
  },
} as const;

