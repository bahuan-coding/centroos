import { X, User, FileText, DollarSign, Calendar, Copy, ExternalLink, XCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface NfseDetailProps {
  nota: {
    numeroNFe: string;
    codigoVerificacao: string;
    dataEmissao: string;
    valorServicos: number;
    valorDeducoes: number;
    valorISS: number;
    aliquotaServicos: number;
    issRetido: boolean;
    discriminacaoServicos: string;
    cpfCnpjTomador: string;
    razaoSocialTomador: string;
    emailTomador?: string;
    statusNFe: 'N' | 'C';
    valorPIS?: number;
    valorCOFINS?: number;
    valorINSS?: number;
    valorIR?: number;
    valorCSLL?: number;
  };
  onClose: () => void;
  onCancel: () => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export function NfseDetail({ nota, onClose, onCancel, onRefresh, isRefreshing }: NfseDetailProps) {
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
  
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };
  
  const baseCalculo = nota.valorServicos - nota.valorDeducoes;
  const isCancelled = nota.statusNFe === 'C';
  
  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className={cn(
        'flex items-center justify-between px-6 py-4 border-b shrink-0',
        isCancelled ? 'bg-red-50' : 'bg-gradient-to-r from-indigo-50 to-blue-50'
      )}>
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-12 h-12 rounded-xl flex items-center justify-center shadow-lg',
            isCancelled 
              ? 'bg-gradient-to-br from-red-500 to-red-600' 
              : 'bg-gradient-to-br from-indigo-500 to-blue-600'
          )}>
            <FileText className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">NFS-e {nota.numeroNFe}</h2>
              <Badge
                variant={isCancelled ? 'destructive' : 'default'}
                className={cn(
                  isCancelled ? '' : 'bg-emerald-100 text-emerald-800'
                )}
              >
                {isCancelled ? 'Cancelada' : 'Normal'}
              </Badge>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-muted-foreground font-mono">{nota.codigoVerificacao}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => copyToClipboard(nota.codigoVerificacao, 'Código de verificação')}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={onRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Tomador */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4" />
              Tomador do Serviço
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">CPF/CNPJ</p>
                <p className="font-mono">{formatCpfCnpj(nota.cpfCnpjTomador)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Nome/Razão Social</p>
                <p className="font-medium">{nota.razaoSocialTomador || 'Não informado'}</p>
              </div>
            </div>
            {nota.emailTomador && (
              <div>
                <p className="text-xs text-muted-foreground">E-mail</p>
                <p>{nota.emailTomador}</p>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Valores */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <DollarSign className="h-4 w-4" />
              Valores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-muted-foreground">Valor Serviços</p>
                <p className="text-lg font-bold">{formatCurrency(nota.valorServicos)}</p>
              </div>
              <div className="text-center p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-muted-foreground">Deduções</p>
                <p className="text-lg font-bold">{formatCurrency(nota.valorDeducoes)}</p>
              </div>
              <div className="text-center p-3 bg-indigo-50 rounded-lg">
                <p className="text-xs text-indigo-600">Base de Cálculo</p>
                <p className="text-lg font-bold text-indigo-700">{formatCurrency(baseCalculo)}</p>
              </div>
              <div className="text-center p-3 bg-emerald-50 rounded-lg">
                <p className="text-xs text-emerald-600">ISS</p>
                <p className="text-lg font-bold text-emerald-700">{formatCurrency(nota.valorISS)}</p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">
                Alíquota: {(nota.aliquotaServicos * 100).toFixed(2)}%
              </Badge>
              {nota.issRetido && (
                <Badge variant="secondary">ISS Retido</Badge>
              )}
            </div>
            
            {/* Retenções federais */}
            {(nota.valorPIS || nota.valorCOFINS || nota.valorINSS || nota.valorIR || nota.valorCSLL) && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs text-muted-foreground mb-2">Retenções Federais</p>
                <div className="flex flex-wrap gap-4 text-sm">
                  {nota.valorPIS && <span>PIS: {formatCurrency(nota.valorPIS)}</span>}
                  {nota.valorCOFINS && <span>COFINS: {formatCurrency(nota.valorCOFINS)}</span>}
                  {nota.valorINSS && <span>INSS: {formatCurrency(nota.valorINSS)}</span>}
                  {nota.valorIR && <span>IR: {formatCurrency(nota.valorIR)}</span>}
                  {nota.valorCSLL && <span>CSLL: {formatCurrency(nota.valorCSLL)}</span>}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Discriminação */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" />
              Discriminação dos Serviços
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 whitespace-pre-wrap bg-slate-50 p-4 rounded-lg">
              {nota.discriminacaoServicos || 'Não informado'}
            </p>
          </CardContent>
        </Card>
        
        {/* Datas */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4" />
              Datas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-6">
              <div>
                <p className="text-xs text-muted-foreground">Data de Emissão</p>
                <p className="font-medium">{formatDate(nota.dataEmissao)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Footer Actions */}
      <div className="px-6 py-4 border-t bg-slate-50 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <a
                href={`https://nfpaulistana.prefeitura.sp.gov.br/consulta/${nota.numeroNFe}/${nota.codigoVerificacao}`}
                target="_blank"
                rel="noopener noreferrer"
                className="gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Ver no Portal
              </a>
            </Button>
          </div>
          
          {!isCancelled && (
            <Button
              variant="destructive"
              size="sm"
              onClick={onCancel}
              className="gap-2"
            >
              <XCircle className="h-4 w-4" />
              Cancelar NFS-e
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

