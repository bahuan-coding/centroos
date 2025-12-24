import { useState, useCallback } from 'react';
import { Search, Loader2, Check, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { fetchCep, ViaCepResponse } from '@/lib/viaCep';
import { formatCEP } from '@/lib/validators';
import { cn } from '@/lib/utils';

interface CepInputProps {
  value: string;
  onChange: (cep: string) => void;
  onAddressFound: (data: ViaCepResponse) => void;
  className?: string;
  error?: string;
}

export function CepInput({ value, onChange, onAddressFound, className, error }: CepInputProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  
  const handleSearch = useCallback(async () => {
    const cleanCep = value.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;
    
    setIsLoading(true);
    setStatus('idle');
    
    const data = await fetchCep(cleanCep);
    
    setIsLoading(false);
    
    if (data) {
      setStatus('success');
      onAddressFound(data);
      setTimeout(() => setStatus('idle'), 2000);
    } else {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  }, [value, onAddressFound]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    onChange(rawValue);
    setStatus('idle');
  };
  
  const handleBlur = () => {
    const cleanCep = value.replace(/\D/g, '');
    if (cleanCep.length === 8 && status === 'idle') {
      handleSearch();
    }
  };
  
  return (
    <div className="space-y-1">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            value={formatCEP(value)}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="00000-000"
            className={cn(
              "h-11 pr-10",
              error && "border-destructive",
              status === 'success' && "border-emerald-500",
              status === 'error' && "border-destructive",
              className
            )}
            maxLength={9}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            {status === 'success' && <Check className="h-4 w-4 text-emerald-500" />}
            {status === 'error' && <X className="h-4 w-4 text-destructive" />}
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleSearch}
          disabled={isLoading || value.replace(/\D/g, '').length !== 8}
          className="h-11 w-11"
        >
          <Search className="h-4 w-4" />
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {status === 'error' && <p className="text-xs text-destructive">CEP não encontrado</p>}
      {status === 'success' && <p className="text-xs text-emerald-600">Endereço preenchido automaticamente</p>}
    </div>
  );
}










