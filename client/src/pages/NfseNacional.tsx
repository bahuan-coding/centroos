import { useState } from 'react';
import { 
  FileText, 
  Search, 
  Plus, 
  Calendar,
  RefreshCw,
  CheckCircle,
  XCircle,
  Globe,
  Building2,
  Download,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { GlassCard } from '@/components/ui/glass-card';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR');
  } catch {
    return dateStr;
  }
}

function StatusBadge({ status }: { status: string }) {
  const styles = {
    normal: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    cancelada: 'bg-rose-100 text-rose-700 border-rose-200',
    substituida: 'bg-amber-100 text-amber-700 border-amber-200',
  };
  
  const labels = {
    normal: 'Normal',
    cancelada: 'Cancelada',
    substituida: 'Substituída',
  };
  
  return (
    <span className={cn(
      'px-2 py-0.5 rounded-full text-xs font-medium border',
      styles[status as keyof typeof styles] || styles.normal
    )}>
      {labels[status as keyof typeof labels] || status}
    </span>
  );
}

export default function NfseNacional() {
  const [chaveConsulta, setChaveConsulta] = useState('');
  const [municipioConsulta, setMunicipioConsulta] = useState('');
  const [nfseData, setNfseData] = useState<any>(null);
  
  // Validar conexão
  const { data: conexao, isLoading: loadingConexao } = trpc.nfse.nacionalValidar.useQuery();
  
  // Consultar NFS-e
  const consultarMutation = trpc.nfse.nacionalConsultar.useMutation({
    onSuccess: (data) => {
      setNfseData(data);
      toast.success('NFS-e encontrada!');
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao consultar NFS-e');
    },
  });
  
  // Consultar parâmetros município
  const { data: parametros, isLoading: loadingParametros } = trpc.nfse.nacionalParametros.useQuery(
    { codigoMunicipio: municipioConsulta },
    { enabled: municipioConsulta.length === 7 }
  );
  
  // Cancelar NFS-e
  const cancelarMutation = trpc.nfse.nacionalCancelar.useMutation({
    onSuccess: () => {
      toast.success('NFS-e cancelada com sucesso!');
      setNfseData(null);
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao cancelar NFS-e');
    },
  });
  
  // Baixar DANFSE
  const danfseMutation = trpc.nfse.nacionalDanfse.useMutation({
    onSuccess: (data) => {
      // Converter base64 para blob e download
      const blob = new Blob([Uint8Array.from(atob(data.pdf), c => c.charCodeAt(0))], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `danfse-${chaveConsulta.slice(-10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('DANFSE baixado!');
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao baixar DANFSE');
    },
  });
  
  const handleConsultar = () => {
    if (chaveConsulta.length < 44) {
      toast.error('Chave de acesso deve ter no mínimo 44 caracteres');
      return;
    }
    consultarMutation.mutate({ chaveAcesso: chaveConsulta });
  };
  
  const handleCancelar = () => {
    if (!nfseData?.chaveAcesso) return;
    if (!confirm('Tem certeza que deseja cancelar esta NFS-e? Esta ação não pode ser desfeita.')) return;
    
    const motivo = prompt('Informe o motivo do cancelamento:');
    if (!motivo) return;
    
    cancelarMutation.mutate({
      chaveAcesso: nfseData.chaveAcesso,
      codigoMotivo: '1',
      descricaoMotivo: motivo,
    });
  };
  
  const handleDownloadDanfse = () => {
    if (!nfseData?.chaveAcesso) return;
    danfseMutation.mutate({ chaveAcesso: nfseData.chaveAcesso });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 p-6">
      <PageHeader
        title="NFS-e Nacional"
        subtitle="Sistema Nacional de Notas Fiscais de Serviço (ADN)"
        icon={<Globe className="h-8 w-8 text-indigo-600" />}
      />
      
      {/* Status da Conexão */}
      <div className="mb-6">
        <GlassCard className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                'w-3 h-3 rounded-full',
                loadingConexao ? 'bg-amber-400 animate-pulse' :
                conexao?.sucesso ? 'bg-emerald-400' : 'bg-rose-400'
              )} />
              <div>
                <p className="font-medium text-sm">
                  {loadingConexao ? 'Verificando conexão...' :
                   conexao?.sucesso ? 'Conectado ao ADN' : 'Desconectado'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Ambiente: {conexao?.ambiente || 'producaoRestrita'}
                </p>
              </div>
            </div>
            {!conexao?.sucesso && !loadingConexao && (
              <div className="flex items-center gap-2 text-amber-600">
                <AlertCircle className="h-4 w-4" />
                <span className="text-xs">{conexao?.mensagem}</span>
              </div>
            )}
          </div>
        </GlassCard>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Painel de Consulta */}
        <div className="lg:col-span-1 space-y-6">
          {/* Consulta por Chave */}
          <GlassCard>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Search className="h-5 w-5 text-indigo-600" />
                <h3 className="font-semibold">Consultar NFS-e</h3>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Chave de Acesso (44 caracteres)
                </label>
                <Input
                  value={chaveConsulta}
                  onChange={(e) => setChaveConsulta(e.target.value.replace(/\D/g, ''))}
                  placeholder="NFSe35250612345678000195..."
                  className="mt-1 font-mono text-xs"
                  maxLength={50}
                />
              </div>
              <Button 
                onClick={handleConsultar}
                disabled={chaveConsulta.length < 44 || consultarMutation.isPending}
                className="w-full"
              >
                {consultarMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Search className="h-4 w-4 mr-2" />
                )}
                Consultar
              </Button>
            </CardContent>
          </GlassCard>
          
          {/* Consulta Parâmetros Município */}
          <GlassCard>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-indigo-600" />
                <h3 className="font-semibold">Parâmetros Municipais</h3>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Código IBGE (7 dígitos)
                </label>
                <Input
                  value={municipioConsulta}
                  onChange={(e) => setMunicipioConsulta(e.target.value.replace(/\D/g, '').slice(0, 7))}
                  placeholder="3550308 (São Paulo)"
                  className="mt-1 font-mono"
                  maxLength={7}
                />
              </div>
              
              {loadingParametros && municipioConsulta.length === 7 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Consultando...
                </div>
              )}
              
              {parametros && (
                <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                  <p className="font-medium">{parametros.nomeNunicipio}</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-1">
                      {parametros.conveniado ? (
                        <CheckCircle className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-rose-500" />
                      )}
                      <span>{parametros.conveniado ? 'Conveniado' : 'Não conveniado'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {parametros.ativo ? (
                        <CheckCircle className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-rose-500" />
                      )}
                      <span>{parametros.ativo ? 'Ativo' : 'Inativo'}</span>
                    </div>
                  </div>
                  {parametros.prazoCancelamento && (
                    <p className="text-xs text-muted-foreground">
                      Prazo cancelamento: {parametros.prazoCancelamento} dias
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </GlassCard>
        </div>
        
        {/* Detalhes da NFS-e */}
        <div className="lg:col-span-2">
          <GlassCard className="h-full">
            {!nfseData ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 min-h-[400px]">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-100 to-blue-100 flex items-center justify-center mb-6">
                  <Globe className="h-12 w-12 text-indigo-500" />
                </div>
                <h3 className="text-xl font-semibold text-slate-800 mb-2">NFS-e Nacional</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Consulte uma NFS-e pela chave de acesso para visualizar detalhes, 
                  baixar o DANFSE ou registrar eventos.
                </p>
              </div>
            ) : (
              <>
                <CardHeader className="border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold">NFS-e #{nfseData.numero}</h3>
                      <p className="text-sm text-muted-foreground font-mono">
                        {nfseData.chaveAcesso}
                      </p>
                    </div>
                    <StatusBadge status={nfseData.status} />
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-2 gap-6">
                    {/* Dados Gerais */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                        Dados Gerais
                      </h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Série</span>
                          <span className="font-medium">{nfseData.serie}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Data Emissão</span>
                          <span className="font-medium">{formatDate(nfseData.dataEmissao)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Competência</span>
                          <span className="font-medium">{nfseData.competencia}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Município</span>
                          <span className="font-medium">{nfseData.municipioEmissor}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Valores */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                        Valores
                      </h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Valor Serviço</span>
                          <span className="font-medium">{formatCurrency(nfseData.valorServico)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Deduções</span>
                          <span className="font-medium">{formatCurrency(nfseData.valorDeducoes)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Base Cálculo</span>
                          <span className="font-medium">{formatCurrency(nfseData.baseCalculo)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Alíquota ISS</span>
                          <span className="font-medium">{(nfseData.aliquotaISS * 100).toFixed(2)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Valor ISS</span>
                          <span className="font-medium">{formatCurrency(nfseData.valorISS)}</span>
                        </div>
                        <div className="flex justify-between text-lg border-t pt-2 mt-2">
                          <span className="font-semibold">Valor Líquido</span>
                          <span className="font-bold text-indigo-600">{formatCurrency(nfseData.valorLiquido)}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Prestador */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                        Prestador
                      </h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">CPF/CNPJ</span>
                          <span className="font-mono text-sm">{nfseData.prestador.cpfCnpj}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Razão Social</span>
                          <span className="font-medium text-right max-w-[200px] truncate">
                            {nfseData.prestador.razaoSocial}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Tomador */}
                    {nfseData.tomador && (
                      <div className="space-y-4">
                        <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                          Tomador
                        </h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">CPF/CNPJ</span>
                            <span className="font-mono text-sm">{nfseData.tomador.cpfCnpj}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Nome</span>
                            <span className="font-medium text-right max-w-[200px] truncate">
                              {nfseData.tomador.razaoSocial}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Serviço */}
                    <div className="col-span-2 space-y-4">
                      <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                        Serviço
                      </h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Código</span>
                          <span className="font-mono">{nfseData.codigoServico}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Descrição</span>
                          <p className="mt-1 text-sm bg-muted/50 p-3 rounded-lg">
                            {nfseData.descricaoServico}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Ações */}
                  <div className="flex gap-3 mt-8 pt-6 border-t">
                    <Button 
                      onClick={handleDownloadDanfse}
                      disabled={danfseMutation.isPending}
                      variant="outline"
                      className="flex-1"
                    >
                      {danfseMutation.isPending ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4 mr-2" />
                      )}
                      Baixar DANFSE
                    </Button>
                    
                    {nfseData.status === 'normal' && (
                      <Button 
                        onClick={handleCancelar}
                        disabled={cancelarMutation.isPending}
                        variant="destructive"
                        className="flex-1"
                      >
                        {cancelarMutation.isPending ? (
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <XCircle className="h-4 w-4 mr-2" />
                        )}
                        Cancelar NFS-e
                      </Button>
                    )}
                  </div>
                </CardContent>
              </>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

