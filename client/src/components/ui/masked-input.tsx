import * as React from 'react';
import { NumericFormat, PatternFormat } from 'react-number-format';
import { cn } from '@/lib/utils';
import { Check, X } from 'lucide-react';

export type MaskType = 'banco' | 'agencia' | 'conta' | 'cpf' | 'cnpj' | 'telefone' | 'cep' | 'moeda' | 'uuid';

interface MaskConfig {
  format: string;
  placeholder: string;
  mask: string;
  validate?: (value: string) => boolean;
}

const MASK_CONFIGS: Record<MaskType, MaskConfig> = {
  banco: {
    format: '###',
    placeholder: '000',
    mask: '_',
    validate: (v) => v.length === 3,
  },
  agencia: {
    format: '####-#',
    placeholder: '0000-0',
    mask: '_',
    validate: (v) => v.length >= 4,
  },
  conta: {
    format: '########-#',
    placeholder: '00000000-0',
    mask: '_',
    validate: (v) => v.length >= 5,
  },
  cpf: {
    format: '###.###.###-##',
    placeholder: '000.000.000-00',
    mask: '_',
    validate: (v) => v.length === 11,
  },
  cnpj: {
    format: '##.###.###/####-##',
    placeholder: '00.000.000/0000-00',
    mask: '_',
    validate: (v) => v.length === 14,
  },
  telefone: {
    format: '(##) #####-####',
    placeholder: '(00) 00000-0000',
    mask: '_',
    validate: (v) => v.length >= 10,
  },
  cep: {
    format: '#####-###',
    placeholder: '00000-000',
    mask: '_',
    validate: (v) => v.length === 8,
  },
  moeda: {
    format: '',
    placeholder: 'R$ 0,00',
    mask: '',
  },
  uuid: {
    format: '########-####-####-####-############',
    placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    mask: '_',
  },
};

export interface MaskedInputProps {
  maskType: MaskType;
  value: string;
  onChange: (value: string, formattedValue: string) => void;
  onBlur?: () => void;
  showValidation?: boolean;
  className?: string;
  disabled?: boolean;
  id?: string;
  name?: string;
  autoFocus?: boolean;
}

const baseInputClasses = 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono';

export function MaskedInput({
  maskType,
  value,
  onChange,
  onBlur,
  showValidation = false,
  className,
  disabled,
  id,
  name,
  autoFocus,
}: MaskedInputProps) {
  const config = MASK_CONFIGS[maskType];
  const isValid = config.validate ? config.validate(value.replace(/\D/g, '')) : true;
  const showStatus = showValidation && value.length > 0;

  if (maskType === 'moeda') {
    return (
      <div className="relative">
        <NumericFormat
          id={id}
          name={name}
          value={value ? parseFloat(value) : ''}
          onValueChange={(values) => {
            onChange(values.value, values.formattedValue);
          }}
          onBlur={onBlur}
          thousandSeparator="."
          decimalSeparator=","
          decimalScale={2}
          fixedDecimalScale
          prefix="R$ "
          allowNegative={false}
          placeholder={config.placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          className={cn(
            baseInputClasses,
            showStatus && (isValid ? 'border-emerald-500 pr-10' : 'border-rose-500 pr-10'),
            className
          )}
        />
        {showStatus && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {isValid ? (
              <Check className="h-4 w-4 text-emerald-500" />
            ) : (
              <X className="h-4 w-4 text-rose-500" />
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <PatternFormat
        id={id}
        name={name}
        format={config.format}
        mask={config.mask}
        value={value}
        onValueChange={(values) => {
          onChange(values.value, values.formattedValue);
        }}
        onBlur={onBlur}
        placeholder={config.placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        allowEmptyFormatting={false}
        className={cn(
          baseInputClasses,
          showStatus && (isValid ? 'border-emerald-500 pr-10' : 'border-rose-500 pr-10'),
          className
        )}
      />
      {showStatus && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {isValid ? (
            <Check className="h-4 w-4 text-emerald-500" />
          ) : (
            <X className="h-4 w-4 text-rose-500" />
          )}
        </div>
      )}
    </div>
  );
}

// Componente auxiliar para exibir valor formatado (read-only)
export function FormattedValue({ maskType, value }: { maskType: MaskType; value: string }) {
  const config = MASK_CONFIGS[maskType];
  
  if (maskType === 'moeda') {
    const num = parseFloat(value) || 0;
    return <span className="font-mono">{`R$ ${num.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}</span>;
  }

  // Apply mask manually for display
  let formatted = value;
  const format = config.format;
  let valueIndex = 0;
  let result = '';
  
  for (let i = 0; i < format.length && valueIndex < value.length; i++) {
    if (format[i] === '#') {
      result += value[valueIndex];
      valueIndex++;
    } else {
      result += format[i];
    }
  }

  return <span className="font-mono">{result || value}</span>;
}










