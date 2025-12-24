import { FileText, Loader2 } from 'lucide-react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, ResponsiveTable } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface NfseItem {
  numeroNFe: string;
  codigoVerificacao: string;
  dataEmissao: string;
  valorServicos: number;
  razaoSocialTomador: string;
  cpfCnpjTomador: string;
  statusNFe: 'N' | 'C';
  discriminacaoServicos: string;
}

interface NfseListProps {
  notas: NfseItem[];
  selectedId: string | null;
  onSelect: (nota: NfseItem) => void;
  isLoading?: boolean;
}

export function NfseList({ notas, selectedId, onSelect, isLoading }: NfseListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  if (notas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
          <FileText className="h-6 w-6 text-slate-400" />
        </div>
        <p className="text-sm text-muted-foreground">Nenhuma NFS-e encontrada</p>
        <p className="text-xs text-muted-foreground mt-1">Ajuste os filtros ou emita uma nova nota</p>
      </div>
    );
  }
  
  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };
  
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR');
    } catch {
      return dateStr;
    }
  };
  
  const formatCpfCnpj = (doc: string) => {
    if (!doc) return '-';
    if (doc.length === 11) {
      return doc.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    if (doc.length === 14) {
      return doc.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return doc;
  };
  
  return (
    <ResponsiveTable stickyHeader density="compact">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80px]">Nº</TableHead>
            <TableHead>Tomador</TableHead>
            <TableHead className="w-[100px]">Data</TableHead>
            <TableHead className="w-[120px] text-right">Valor</TableHead>
            <TableHead className="w-[80px] text-center">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {notas.map((nota) => (
            <TableRow
              key={nota.numeroNFe}
              onClick={() => onSelect(nota)}
              className={cn(
                'cursor-pointer transition-colors',
                selectedId === nota.numeroNFe && 'bg-indigo-50'
              )}
            >
              <TableCell className="font-mono font-medium text-indigo-600">
                {nota.numeroNFe}
              </TableCell>
              <TableCell>
                <div className="min-w-0">
                  <p className="font-medium truncate max-w-[200px]">
                    {nota.razaoSocialTomador || 'Não informado'}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {formatCpfCnpj(nota.cpfCnpjTomador)}
                  </p>
                </div>
              </TableCell>
              <TableCell className="text-sm">
                {formatDate(nota.dataEmissao)}
              </TableCell>
              <TableCell className="text-right font-mono">
                {formatCurrency(nota.valorServicos)}
              </TableCell>
              <TableCell className="text-center">
                <Badge
                  variant={nota.statusNFe === 'N' ? 'default' : 'destructive'}
                  className={cn(
                    'text-xs',
                    nota.statusNFe === 'N' && 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100'
                  )}
                >
                  {nota.statusNFe === 'N' ? 'Normal' : 'Cancelada'}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ResponsiveTable>
  );
}

