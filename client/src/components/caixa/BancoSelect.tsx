import { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronsUpDown, Building2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface Banco {
  codigo: string;
  nome: string;
  nomeReduzido: string;
}

// Lista FEBRABAN dos principais bancos brasileiros
export const BANCOS_FEBRABAN: Banco[] = [
  { codigo: '001', nome: 'Banco do Brasil S.A.', nomeReduzido: 'BB' },
  { codigo: '003', nome: 'Banco da Amazônia S.A.', nomeReduzido: 'BASA' },
  { codigo: '004', nome: 'Banco do Nordeste do Brasil S.A.', nomeReduzido: 'BNB' },
  { codigo: '021', nome: 'Banestes S.A. Banco do Estado do Espírito Santo', nomeReduzido: 'Banestes' },
  { codigo: '024', nome: 'Banco Bandepe S.A.', nomeReduzido: 'Bandepe' },
  { codigo: '025', nome: 'Banco Alfa S.A.', nomeReduzido: 'Alfa' },
  { codigo: '033', nome: 'Banco Santander (Brasil) S.A.', nomeReduzido: 'Santander' },
  { codigo: '036', nome: 'Banco Bradesco BBI S.A.', nomeReduzido: 'Bradesco BBI' },
  { codigo: '037', nome: 'Banco do Estado do Pará S.A.', nomeReduzido: 'Banpará' },
  { codigo: '041', nome: 'Banco do Estado do Rio Grande do Sul S.A.', nomeReduzido: 'Banrisul' },
  { codigo: '047', nome: 'Banco do Estado de Sergipe S.A.', nomeReduzido: 'Banese' },
  { codigo: '070', nome: 'BRB - Banco de Brasília S.A.', nomeReduzido: 'BRB' },
  { codigo: '077', nome: 'Banco Inter S.A.', nomeReduzido: 'Inter' },
  { codigo: '082', nome: 'Banco Topazio S.A.', nomeReduzido: 'Topazio' },
  { codigo: '084', nome: 'Uniprime Norte do Paraná', nomeReduzido: 'Uniprime' },
  { codigo: '085', nome: 'Cooperativa Central de Crédito Urbano', nomeReduzido: 'Cecred' },
  { codigo: '104', nome: 'Caixa Econômica Federal', nomeReduzido: 'Caixa' },
  { codigo: '133', nome: 'Confederação Nacional das Cooperativas Centrais de Crédito', nomeReduzido: 'Cresol' },
  { codigo: '136', nome: 'Confederação Nacional das Cooperativas Centrais Unicred', nomeReduzido: 'Unicred' },
  { codigo: '197', nome: 'Stone Pagamentos S.A.', nomeReduzido: 'Stone' },
  { codigo: '208', nome: 'Banco BTG Pactual S.A.', nomeReduzido: 'BTG' },
  { codigo: '212', nome: 'Banco Original S.A.', nomeReduzido: 'Original' },
  { codigo: '218', nome: 'Banco BS2 S.A.', nomeReduzido: 'BS2' },
  { codigo: '237', nome: 'Banco Bradesco S.A.', nomeReduzido: 'Bradesco' },
  { codigo: '246', nome: 'Banco ABC Brasil S.A.', nomeReduzido: 'ABC Brasil' },
  { codigo: '260', nome: 'Nu Pagamentos S.A. (Nubank)', nomeReduzido: 'Nubank' },
  { codigo: '269', nome: 'HSBC Brasil S.A. Banco de Investimento', nomeReduzido: 'HSBC' },
  { codigo: '290', nome: 'PagSeguro Internet S.A.', nomeReduzido: 'PagBank' },
  { codigo: '318', nome: 'Banco BMG S.A.', nomeReduzido: 'BMG' },
  { codigo: '323', nome: 'Mercado Pago', nomeReduzido: 'Mercado Pago' },
  { codigo: '336', nome: 'Banco C6 S.A.', nomeReduzido: 'C6 Bank' },
  { codigo: '341', nome: 'Itaú Unibanco S.A.', nomeReduzido: 'Itaú' },
  { codigo: '356', nome: 'Banco Real S.A.', nomeReduzido: 'Real' },
  { codigo: '389', nome: 'Banco Mercantil do Brasil S.A.', nomeReduzido: 'Mercantil' },
  { codigo: '399', nome: 'HSBC Bank Brasil S.A.', nomeReduzido: 'HSBC' },
  { codigo: '422', nome: 'Banco Safra S.A.', nomeReduzido: 'Safra' },
  { codigo: '453', nome: 'Banco Rural S.A.', nomeReduzido: 'Rural' },
  { codigo: '633', nome: 'Banco Rendimento S.A.', nomeReduzido: 'Rendimento' },
  { codigo: '652', nome: 'Itaú Unibanco Holding S.A.', nomeReduzido: 'Itaú Holding' },
  { codigo: '655', nome: 'Banco Votorantim S.A.', nomeReduzido: 'Votorantim' },
  { codigo: '707', nome: 'Banco Daycoval S.A.', nomeReduzido: 'Daycoval' },
  { codigo: '741', nome: 'Banco Ribeirão Preto S.A.', nomeReduzido: 'BRP' },
  { codigo: '745', nome: 'Banco Citibank S.A.', nomeReduzido: 'Citibank' },
  { codigo: '746', nome: 'Banco Modal S.A.', nomeReduzido: 'Modal' },
  { codigo: '748', nome: 'Banco Cooperativo Sicredi S.A.', nomeReduzido: 'Sicredi' },
  { codigo: '756', nome: 'Banco Cooperativo do Brasil S.A.', nomeReduzido: 'Sicoob' },
];

interface BancoSelectProps {
  value: string;
  onChange: (banco: Banco | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function BancoSelect({
  value,
  onChange,
  placeholder = 'Selecione o banco...',
  disabled = false,
  className,
}: BancoSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

  const selectedBanco = useMemo(
    () => BANCOS_FEBRABAN.find((b) => b.codigo === value),
    [value]
  );

  const filteredBancos = useMemo(() => {
    if (!search) return BANCOS_FEBRABAN;
    const term = search.toLowerCase();
    return BANCOS_FEBRABAN.filter(
      (b) =>
        b.codigo.includes(term) ||
        b.nome.toLowerCase().includes(term) ||
        b.nomeReduzido.toLowerCase().includes(term)
    );
  }, [search]);

  // Update dropdown position when opening
  useEffect(() => {
    if (open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const dropdownHeight = 350; // approximate height
      
      // Decide if dropdown should open above or below
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      const openAbove = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;
      
      setDropdownPosition({
        top: openAbove ? rect.top - dropdownHeight - 4 : rect.bottom + 4,
        left: rect.left,
        width: Math.max(rect.width, 380),
      });
      
      // Focus search input
      setTimeout(() => searchInputRef.current?.focus(), 0);
    }
  }, [open]);

  // Close on escape
  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setSearch('');
        triggerRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [open]);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleSelect = (banco: Banco) => {
    onChange(banco.codigo === value ? null : banco);
    setOpen(false);
    setSearch('');
    triggerRef.current?.focus();
  };

  return (
    <>
      <Button
        ref={triggerRef}
        type="button"
        variant="outline"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className={cn('w-full h-12 justify-between font-normal text-base', className)}
      >
        {selectedBanco ? (
          <span className="flex items-center gap-2 truncate">
            <span className="font-mono text-muted-foreground">{selectedBanco.codigo}</span>
            <span className="truncate">{selectedBanco.nomeReduzido}</span>
          </span>
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
      
      {/* Portal dropdown */}
      {open && createPortal(
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-[100]" 
            onClick={() => { setOpen(false); setSearch(''); }}
          />
          
          {/* Dropdown */}
          <div 
            ref={dropdownRef}
            className="fixed z-[101] rounded-xl border bg-popover shadow-2xl animate-in fade-in-0 zoom-in-95"
            style={{
              top: dropdownPosition.top,
              left: dropdownPosition.left,
              width: dropdownPosition.width,
              maxWidth: 'calc(100vw - 32px)',
            }}
            role="listbox"
            aria-label="Lista de bancos"
          >
            {/* Search */}
            <div className="p-3 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={searchInputRef}
                  placeholder="Buscar por código ou nome..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-10"
                  aria-label="Buscar banco"
                />
              </div>
            </div>
            
            {/* List */}
            <div className="max-h-[280px] overflow-y-auto p-2">
              {filteredBancos.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Nenhum banco encontrado para "{search}"
                </p>
              ) : (
                filteredBancos.map((banco) => (
                  <button
                    key={banco.codigo}
                    type="button"
                    role="option"
                    aria-selected={value === banco.codigo}
                    onClick={() => handleSelect(banco)}
                    className={cn(
                      'flex w-full items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer',
                      'hover:bg-accent transition-colors text-left',
                      value === banco.codigo && 'bg-violet-50 hover:bg-violet-100'
                    )}
                  >
                    <div className={cn(
                      "flex items-center justify-center w-10 h-10 rounded-lg",
                      value === banco.codigo ? "bg-violet-100" : "bg-muted"
                    )}>
                      <Building2 className={cn(
                        "h-5 w-5",
                        value === banco.codigo ? "text-violet-600" : "text-muted-foreground"
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">{banco.codigo}</span>
                        <span className="font-medium">{banco.nomeReduzido}</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{banco.nome}</p>
                    </div>
                    {value === banco.codigo && (
                      <Check className="h-5 w-5 text-violet-600 shrink-0" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
}

// Utility para buscar banco por código
export function getBancoByCodigo(codigo: string): Banco | undefined {
  return BANCOS_FEBRABAN.find((b) => b.codigo === codigo);
}
