import { useState, useMemo } from 'react';
import { usePatrimonioWizard } from '../PatrimonioWizardProvider';
import { Input } from '@/components/ui/input';
import { FormSection, FormField } from '@/components/ui/form-section';
import { LabelWithHelp } from '@/components/ui/tooltip-help';
import { trpc } from '@/lib/trpc';
import { Search, ChevronRight, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function StepContabilizacao() {
  const { form, updateField, errors, fieldRefs } = usePatrimonioWizard();
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  
  // Fetch contas contábeis
  const { data: accounts, isLoading } = trpc.accounts.list.useQuery();
  
  // Filter only ativo accounts that are analíticas
  const contasAtivo = useMemo(() => {
    if (!accounts) return [];
    return accounts.filter(a => 
      a.code?.startsWith('1.2') && // Ativo Não Circulante / Imobilizado
      a.type === 'ativo'
    );
  }, [accounts]);
  
  const filteredContas = useMemo(() => {
    if (!searchTerm) return contasAtivo;
    const term = searchTerm.toLowerCase();
    return contasAtivo.filter(c => 
      c.code?.toLowerCase().includes(term) || 
      c.name?.toLowerCase().includes(term)
    );
  }, [contasAtivo, searchTerm]);
  
  const selectedConta = contasAtivo.find(c => String(c.id) === form.contaAtivoId);
  
  // Build breadcrumb from code
  const buildBreadcrumb = (code: string) => {
    const parts = code.split('.');
    const breadcrumb = [];
    for (let i = 1; i <= parts.length; i++) {
      breadcrumb.push(parts.slice(0, i).join('.'));
    }
    return breadcrumb;
  };
  
  const handleSelect = (contaId: string) => {
    updateField('contaAtivoId', contaId);
    setIsOpen(false);
    setSearchTerm('');
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2 mb-1">
          📊 Contabilização
        </h2>
        <p className="text-sm text-muted-foreground">
          Selecione a conta contábil do ativo onde o bem será registrado.
        </p>
      </div>
      
      <FormSection title="Conta do Ativo" icon="📒">
        <FormField error={errors.contaAtivoId}>
          <LabelWithHelp
            label="Conta do Ativo"
            help="Conta analítica do plano de contas onde o bem será registrado. Determina classificação no balanço patrimonial e relatórios contábeis."
            required
          />
          
          <div className="relative">
            <button
              type="button"
              ref={(el) => { fieldRefs.current.contaAtivoId = el; }}
              onClick={() => setIsOpen(!isOpen)}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 rounded-md border text-left",
                "hover:bg-muted/50 transition-colors",
                errors.contaAtivoId ? "border-destructive" : "border-input",
                isOpen && "ring-2 ring-ring"
              )}
            >
              {selectedConta ? (
                <div className="flex-1 min-w-0">
                  <span className="font-mono text-sm text-muted-foreground">{selectedConta.code}</span>
                  <span className="mx-2">-</span>
                  <span className="font-medium">{selectedConta.name}</span>
                </div>
              ) : (
                <span className="text-muted-foreground">Selecione uma conta...</span>
              )}
              <ChevronRight className={cn("h-4 w-4 text-muted-foreground transition-transform", isOpen && "rotate-90")} />
            </button>
            
            {isOpen && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg max-h-80 overflow-hidden">
                {/* Search */}
                <div className="p-2 border-b sticky top-0 bg-white">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Buscar por código ou nome..."
                      className="pl-9"
                      autoFocus
                    />
                  </div>
                </div>
                
                {/* Options */}
                <div className="max-h-60 overflow-y-auto">
                  {isLoading ? (
                    <div className="p-4 text-center text-muted-foreground">
                      Carregando contas...
                    </div>
                  ) : filteredContas.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      {searchTerm ? 'Nenhuma conta encontrada' : 'Nenhuma conta de ativo disponível'}
                    </div>
                  ) : (
                    filteredContas.map((conta) => (
                      <button
                        key={conta.id}
                        type="button"
                        onClick={() => handleSelect(String(conta.id))}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-muted/50 transition-colors",
                          form.contaAtivoId === String(conta.id) && "bg-blue-50"
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm text-blue-600">{conta.code}</span>
                            <span className="font-medium text-sm">{conta.name}</span>
                          </div>
                        </div>
                        {form.contaAtivoId === String(conta.id) && (
                          <Check className="h-4 w-4 text-blue-600" />
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </FormField>
      </FormSection>
      
      {/* Breadcrumb da conta selecionada */}
      {selectedConta && (
        <div className="rounded-xl border bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
          <p className="text-xs font-medium text-blue-700 mb-2">Classificação Contábil</p>
          
          {/* Breadcrumb visual */}
          <div className="flex items-center gap-1 flex-wrap text-sm">
            {buildBreadcrumb(selectedConta.code || '').map((code, idx, arr) => {
              const conta = accounts?.find(a => a.code === code);
              const isLast = idx === arr.length - 1;
              return (
                <div key={code} className="flex items-center gap-1">
                  <span className={cn(
                    "px-2 py-1 rounded",
                    isLast ? "bg-blue-600 text-white font-medium" : "bg-white border text-muted-foreground"
                  )}>
                    {code}
                    {conta && !isLast && <span className="ml-1 text-xs">({conta.name})</span>}
                  </span>
                  {!isLast && <ChevronRight className="h-3 w-3 text-blue-400" />}
                </div>
              );
            })}
          </div>
          
          <div className="mt-3 pt-3 border-t border-blue-200">
            <p className="font-medium text-blue-800">{selectedConta.name}</p>
            <p className="text-xs text-blue-600 mt-1">
              Esta conta registrará o valor de aquisição do bem no balanço patrimonial.
            </p>
          </div>
        </div>
      )}
      
      {/* Alerta se não houver contas */}
      {!isLoading && contasAtivo.length === 0 && (
        <div className="flex items-start gap-3 p-4 rounded-xl border-2 border-amber-200 bg-amber-50">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">Nenhuma conta de ativo configurada</p>
            <p className="text-sm text-amber-700 mt-1">
              Configure contas no Plano de Contas com código iniciando em "1.2" (Ativo Não Circulante).
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

