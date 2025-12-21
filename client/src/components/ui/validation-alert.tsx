import { AlertTriangle, XCircle, Info, CheckCircle2, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

type AlertType = 'error' | 'warning' | 'info' | 'success';

interface ValidationAlertProps {
  type: AlertType;
  title?: string;
  message: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
}

const ALERT_CONFIG = {
  error: {
    icon: XCircle,
    containerClass: 'bg-rose-500/10 border-rose-500/20',
    iconClass: 'text-rose-600',
    titleClass: 'text-rose-700',
    messageClass: 'text-rose-600',
  },
  warning: {
    icon: AlertTriangle,
    containerClass: 'bg-amber-500/10 border-amber-500/20',
    iconClass: 'text-amber-600',
    titleClass: 'text-amber-700',
    messageClass: 'text-amber-600',
  },
  info: {
    icon: Info,
    containerClass: 'bg-blue-500/10 border-blue-500/20',
    iconClass: 'text-blue-600',
    titleClass: 'text-blue-700',
    messageClass: 'text-blue-600',
  },
  success: {
    icon: CheckCircle2,
    containerClass: 'bg-emerald-500/10 border-emerald-500/20',
    iconClass: 'text-emerald-600',
    titleClass: 'text-emerald-700',
    messageClass: 'text-emerald-600',
  },
};

export function ValidationAlert({
  type,
  title,
  message,
  actionLabel,
  actionHref,
  onAction,
  className,
}: ValidationAlertProps) {
  const config = ALERT_CONFIG[type];
  const Icon = config.icon;

  return (
    <div className={cn(
      'flex items-start gap-3 p-3 rounded-lg border',
      config.containerClass,
      className
    )}>
      <Icon className={cn('h-5 w-5 shrink-0 mt-0.5', config.iconClass)} />
      <div className="flex-1 min-w-0">
        {title && (
          <p className={cn('font-medium text-sm', config.titleClass)}>{title}</p>
        )}
        <p className={cn('text-xs', title ? 'mt-0.5' : '', config.messageClass)}>
          {message}
        </p>
        {(actionLabel && (onAction || actionHref)) && (
          <button
            onClick={onAction}
            className={cn(
              'flex items-center gap-1 text-xs font-medium hover:underline mt-1.5',
              config.messageClass
            )}
          >
            <span>{actionLabel}</span>
            <ExternalLink className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}

// Field-level validation message
interface FieldValidationProps {
  type: 'error' | 'warning';
  message: string;
}

export function FieldValidation({ type, message }: FieldValidationProps) {
  return (
    <p className={cn(
      'text-xs mt-1 flex items-center gap-1',
      type === 'error' ? 'text-rose-600' : 'text-amber-600'
    )}>
      {type === 'error' ? (
        <XCircle className="h-3 w-3" />
      ) : (
        <AlertTriangle className="h-3 w-3" />
      )}
      {message}
    </p>
  );
}

// Draft recovery banner
interface DraftRecoveryBannerProps {
  entityName: string;
  onRecover: () => void;
  onDiscard: () => void;
}

export function DraftRecoveryBanner({ entityName, onRecover, onDiscard }: DraftRecoveryBannerProps) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10 border border-primary/20">
      <div className="flex items-center gap-3">
        <Info className="h-5 w-5 text-primary" />
        <div>
          <p className="text-sm font-medium text-primary">Rascunho encontrado</p>
          <p className="text-xs text-primary/80">
            Você tem um rascunho de "{entityName}" não salvo.
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onDiscard}>
          Descartar
        </Button>
        <Button size="sm" onClick={onRecover}>
          Retomar
        </Button>
      </div>
    </div>
  );
}

// Validation messages dictionary (pt-BR)
export const VALIDATION_MESSAGES = {
  // Conta Financeira - Bloqueios
  tipoBancarioSemDados: 'Informe os dados bancários para contas de banco',
  codigoFebrabanInvalido: 'Código de banco inválido. Use 3 dígitos (ex: 001)',
  agenciaContaDuplicada: (nome: string) => `Esta conta já está cadastrada: ${nome}`,
  inativarComSaldo: (saldo: number) => `Conta tem saldo de R$ ${saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. Zere o saldo para inativar`,
  inativarComExtratos: (count: number) => `Existem ${count} extrato${count !== 1 ? 's' : ''} pendente${count !== 1 ? 's' : ''} de conciliação`,
  
  // Conta Financeira - Alertas
  contaContabilNaoVinculada: 'Recomendamos vincular conta contábil para lançamentos automáticos',
  chavePixInvalida: 'Formato de chave PIX parece incorreto',
  
  // Extrato - Bloqueios
  arquivoOfxInvalido: 'Arquivo não é um OFX válido. Baixe novamente do banco',
  extratoJaImportado: (data: string) => `Este extrato já foi importado em ${data}`,
  linhaJaConciliada: 'Linha já está conciliada',
  
  // Extrato - Alertas
  periodoSobrepoe: (mes: string) => `Período sobrepõe extrato de ${mes}. Linhas duplicadas serão marcadas`,
  valorDifere: (valorExtrato: number, valorTitulo: number) => 
    `Valor do extrato (R$ ${valorExtrato.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) difere do título (R$ ${valorTitulo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}). Confirma?`,
  ajusteSaldoGrande: (valor: number) => `Ajuste de R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} é significativo. Confirme a justificativa`,
  
  // Conciliação
  justificativaCurta: (atual: number, min: number) => `Justificativa muito curta (${atual}/${min} caracteres)`,
  
  // Genéricos
  campoObrigatorio: 'Este campo é obrigatório',
  valorInvalido: 'Valor inválido',
  dataInvalida: 'Data inválida',
  erroRede: 'Erro ao salvar. Verifique sua conexão e tente novamente',
} as const;

// Success messages dictionary (pt-BR)
export const SUCCESS_MESSAGES = {
  contaCriada: 'Conta criada com sucesso',
  contaAtualizada: 'Conta atualizada com sucesso',
  contaInativada: 'Conta inativada com sucesso',
  extratoImportado: (linhas: number) => `Extrato importado: ${linhas} linhas prontas para conciliação`,
  linhaConciliada: 'Linha conciliada. Próxima pendente em foco.',
  linhasConciliadas: (count: number, restantes: number) => `${count} sugestões aplicadas. ${restantes} linhas restantes.`,
  linhaIgnorada: 'Linha marcada como ignorada',
  extratoFechado: 'Extrato fechado com sucesso',
} as const;





