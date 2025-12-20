import { useState, useMemo } from 'react';
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

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        role="combobox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className={cn('w-full justify-between font-normal', className)}
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
      
      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 w-[350px] rounded-md border bg-popover shadow-lg">
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por código ou nome..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9"
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-[280px] overflow-y-auto p-1">
            {filteredBancos.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Nenhum banco encontrado
              </p>
            ) : (
              filteredBancos.map((banco) => (
                <button
                  key={banco.codigo}
                  type="button"
                  onClick={() => {
                    onChange(banco.codigo === value ? null : banco);
                    setOpen(false);
                    setSearch('');
                  }}
                  className={cn(
                    'flex w-full items-center gap-3 px-3 py-2 rounded-md cursor-pointer',
                    'hover:bg-accent transition-colors text-left',
                    value === banco.codigo && 'bg-accent'
                  )}
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-md bg-muted">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{banco.codigo}</span>
                      <span className="font-medium text-sm">{banco.nomeReduzido}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{banco.nome}</p>
                  </div>
                  {value === banco.codigo && (
                    <Check className="h-4 w-4 text-primary shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
      
      {/* Backdrop to close dropdown */}
      {open && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => { setOpen(false); setSearch(''); }}
        />
      )}
    </div>
  );
}

// Utility para buscar banco por código
export function getBancoByCodigo(codigo: string): Banco | undefined {
  return BANCOS_FEBRABAN.find((b) => b.codigo === codigo);
}

