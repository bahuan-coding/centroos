/**
 * Aba de Procurações do Integra Contador
 * 
 * Lista e gerencia procurações eletrônicas recebidas
 */

import { useState } from 'react';
import { 
  ScrollText, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  XCircle,
  RefreshCw,
  Building2,
  Filter,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export function ProcuracoesTab() {
  const [filter, setFilter] = useState<'all' | 'active' | 'expiring' | 'expired'>('all');
  
  const { data, isLoading, refetch, error } = trpc.serpro.procuracoes.listar.useQuery();
  const { data: codigosData } = trpc.serpro.procuracoes.codigos.useQuery();

  const codigos = codigosData || [];
  
  // Filtrar procurações
  const procuracoes = data?.procuracoes || [];
  const filteredProcuracoes = procuracoes.filter(p => {
    switch (filter) {
      case 'active':
        return p.status === 'ATIVA' && !p.proximaExpiracao;
      case 'expiring':
        return p.proximaExpiracao;
      case 'expired':
        return p.expirada || p.status !== 'ATIVA';
      default:
        return true;
    }
  });

  // Contadores
  const counts = {
    all: procuracoes.length,
    active: procuracoes.filter(p => p.status === 'ATIVA' && !p.proximaExpiracao).length,
    expiring: procuracoes.filter(p => p.proximaExpiracao).length,
    expired: procuracoes.filter(p => p.expirada || p.status !== 'ATIVA').length,
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertTitle>Erro ao carregar procurações</AlertTitle>
        <AlertDescription>
          {error.message}
          <Button 
            variant="link" 
            className="p-0 h-auto ml-2"
            onClick={() => refetch()}
          >
            Tentar novamente
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Procurações Eletrônicas</h3>
          <p className="text-sm text-muted-foreground">
            Procurações recebidas via e-CAC para acesso a dados fiscais
          </p>
        </div>
        
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Alertas */}
      {counts.expiring > 0 && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800">Procurações expirando</AlertTitle>
          <AlertDescription className="text-amber-700">
            {counts.expiring} procuração(ões) expira(m) em menos de 30 dias.
            Solicite renovação aos contribuintes.
          </AlertDescription>
        </Alert>
      )}

      {/* Filtros */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas ({counts.all})</SelectItem>
              <SelectItem value="active">Ativas ({counts.active})</SelectItem>
              <SelectItem value="expiring">Expirando ({counts.expiring})</SelectItem>
              <SelectItem value="expired">Expiradas ({counts.expired})</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabela */}
      {filteredProcuracoes.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <ScrollText className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p>Nenhuma procuração encontrada</p>
          {filter !== 'all' && (
            <Button 
              variant="link" 
              onClick={() => setFilter('all')}
              className="mt-2"
            >
              Ver todas as procurações
            </Button>
          )}
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Outorgante</TableHead>
                <TableHead>Serviços</TableHead>
                <TableHead>Validade</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProcuracoes.map((proc, idx) => (
                <TableRow 
                  key={idx}
                  className={cn(
                    proc.expirada && 'bg-rose-50/50',
                    proc.proximaExpiracao && 'bg-amber-50/50'
                  )}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{proc.outorgante.nome}</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {formatCnpj(proc.outorgante.numero)}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {proc.servicosNomes.map((servico: string) => (
                        <Badge 
                          key={servico} 
                          variant="secondary" 
                          className="text-xs"
                        >
                          {servico}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm">
                          {formatDate(proc.dataInicio)} - {formatDate(proc.dataFim)}
                        </p>
                        <p className={cn(
                          'text-xs',
                          proc.expirada && 'text-rose-600',
                          proc.proximaExpiracao && 'text-amber-600',
                          !proc.expirada && !proc.proximaExpiracao && 'text-muted-foreground'
                        )}>
                          {proc.expirada 
                            ? 'Expirada' 
                            : `${proc.diasRestantes} dias restantes`}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge 
                      status={proc.status} 
                      expiring={proc.proximaExpiracao} 
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Legenda de códigos */}
      <div className="bg-muted/50 rounded-lg p-4">
        <h4 className="font-medium text-sm mb-2">Códigos de Serviço</h4>
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          {codigos.map((c: any) => (
            <span key={c.codigo}>
              <Badge variant="outline" className="mr-1 text-xs">{c.codigo}</Badge>
              {c.nome}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status, expiring }: { status: string; expiring: boolean }) {
  if (status !== 'ATIVA') {
    return (
      <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200">
        <XCircle className="h-3 w-3 mr-1" />
        {status}
      </Badge>
    );
  }

  if (expiring) {
    return (
      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
        <AlertTriangle className="h-3 w-3 mr-1" />
        Expirando
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
      <CheckCircle className="h-3 w-3 mr-1" />
      Ativa
    </Badge>
  );
}

function formatCnpj(cnpj: string): string {
  const clean = cnpj.replace(/\D/g, '');
  if (clean.length !== 14) return cnpj;
  return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  } catch {
    return dateStr;
  }
}

