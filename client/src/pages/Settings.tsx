import { useState, useEffect, useCallback } from 'react';
import { 
  Settings as SettingsIcon, Building2, DollarSign, Calculator, Bell, FileUp,
  ChevronRight, Save, RefreshCw, Check, AlertCircle, Plus, Trash2, Edit2,
  ShieldCheck, Upload, X
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { PageHeader } from '@/components/ui/page-header';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

type CategoryId = 'entidade' | 'certificado' | 'financeiro' | 'contabilidade' | 'notificacoes' | 'importacao';

interface Category {
  id: CategoryId;
  label: string;
  description: string;
  icon: typeof SettingsIcon;
  color: string;
  bgColor: string;
}

const CATEGORIES: Category[] = [
  { id: 'entidade', label: 'Entidade', description: 'Dados da organização', icon: Building2, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  { id: 'certificado', label: 'Certificado Digital', description: 'e-CNPJ para NFS-e', icon: ShieldCheck, color: 'text-teal-600', bgColor: 'bg-teal-100' },
  { id: 'financeiro', label: 'Financeiro', description: 'Parâmetros financeiros', icon: DollarSign, color: 'text-emerald-600', bgColor: 'bg-emerald-100' },
  { id: 'contabilidade', label: 'Contabilidade', description: 'Regime e exercício', icon: Calculator, color: 'text-violet-600', bgColor: 'bg-violet-100' },
  { id: 'notificacoes', label: 'Notificações', description: 'Alertas e emails', icon: Bell, color: 'text-amber-600', bgColor: 'bg-amber-100' },
  { id: 'importacao', label: 'Importação', description: 'Regras de classificação', icon: FileUp, color: 'text-slate-600', bgColor: 'bg-slate-100' },
];

// ============================================================================
// SIDEBAR COMPONENT
// ============================================================================

function SettingsSidebar({ 
  activeCategory, 
  onSelectCategory,
  configStats
}: { 
  activeCategory: CategoryId; 
  onSelectCategory: (id: CategoryId) => void;
  configStats: Record<string, number>;
}) {
  return (
    <div className="space-y-1">
      {CATEGORIES.map((cat) => {
        const Icon = cat.icon;
        const isActive = activeCategory === cat.id;
        const count = configStats[cat.id] || 0;
        
        return (
          <button
            key={cat.id}
            onClick={() => onSelectCategory(cat.id)}
            className={cn(
              'w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all',
              'hover:bg-violet-50 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-1',
              isActive && 'bg-violet-100 ring-2 ring-violet-500'
            )}
          >
            <div className={cn('p-2 rounded-lg', cat.bgColor)}>
              <Icon className={cn('h-5 w-5', cat.color)} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm">{cat.label}</p>
              <p className="text-xs text-muted-foreground truncate">{cat.description}</p>
            </div>
            <div className="flex items-center gap-2">
              {count > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{count}</Badge>
              )}
              <ChevronRight className={cn(
                'h-4 w-4 text-slate-300 shrink-0 transition-transform',
                isActive && 'text-violet-500 rotate-90'
              )} />
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ============================================================================
// ENTIDADE FORM
// ============================================================================

function EntidadeForm() {
  const [form, setForm] = useState({ 
    name: '', cnpj: '', address: '', city: '', state: '', zipCode: '', phone: '', email: '' 
  });
  const [isDirty, setIsDirty] = useState(false);

  const utils = trpc.useUtils();
  const { data: org, isLoading } = trpc.organization.get.useQuery();
  const updateMutation = trpc.organization.update.useMutation({ 
    onSuccess: () => { 
      utils.organization.get.invalidate(); 
      toast.success('Dados da entidade salvos com sucesso');
      setIsDirty(false);
    },
    onError: (e) => toast.error(e.message),
  });

  useEffect(() => {
    if (org) {
      setForm({
        name: org.name || '',
        cnpj: org.cnpj || '',
        address: org.address || '',
        city: org.city || '',
        state: org.state || '',
        zipCode: org.zipCode || '',
        phone: org.phone || '',
        email: org.email || '',
      });
    }
  }, [org]);

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(form as any);
  };

  if (isLoading) {
    return <FormSkeleton />;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600" />
            Dados da Entidade
          </h2>
          <p className="text-sm text-muted-foreground">Informações que aparecerão nos relatórios e documentos oficiais</p>
        </div>
        {isDirty && (
          <Badge className="bg-amber-100 text-amber-700">Alterações não salvas</Badge>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Label className="text-sm font-medium">Nome da Entidade *</Label>
          <Input 
            value={form.name} 
            onChange={(e) => handleChange('name', e.target.value)} 
            placeholder="Centro Espírita..." 
            required 
            className="mt-1" 
          />
        </div>
        
        <div>
          <Label className="text-sm font-medium">CNPJ</Label>
          <Input 
            value={form.cnpj} 
            onChange={(e) => handleChange('cnpj', e.target.value)} 
            placeholder="00.000.000/0000-00" 
            className="mt-1" 
          />
        </div>
        
        <div>
          <Label className="text-sm font-medium">Telefone</Label>
          <Input 
            value={form.phone} 
            onChange={(e) => handleChange('phone', e.target.value)} 
            placeholder="(00) 00000-0000" 
            className="mt-1" 
          />
        </div>
        
        <div className="md:col-span-2">
          <Label className="text-sm font-medium">E-mail</Label>
          <Input 
            type="email" 
            value={form.email} 
            onChange={(e) => handleChange('email', e.target.value)} 
            placeholder="contato@entidade.org.br" 
            className="mt-1" 
          />
        </div>
      </div>

      <div className="pt-2 border-t">
        <h3 className="text-sm font-medium mb-3">Endereço</h3>
        <div className="space-y-4">
          <div>
            <Label className="text-sm">Logradouro</Label>
            <Textarea 
              value={form.address} 
              onChange={(e) => handleChange('address', e.target.value)} 
              placeholder="Rua, número, bairro" 
              className="mt-1 min-h-[80px]" 
            />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <Label className="text-sm">Cidade</Label>
              <Input 
                value={form.city} 
                onChange={(e) => handleChange('city', e.target.value)} 
                className="mt-1" 
              />
            </div>
            <div>
              <Label className="text-sm">UF</Label>
              <Input 
                value={form.state} 
                onChange={(e) => handleChange('state', e.target.value.toUpperCase())} 
                maxLength={2} 
                className="mt-1" 
              />
            </div>
            <div>
              <Label className="text-sm">CEP</Label>
              <Input 
                value={form.zipCode} 
                onChange={(e) => handleChange('zipCode', e.target.value)} 
                placeholder="00000-000" 
                className="mt-1" 
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t">
        <Button type="submit" disabled={updateMutation.isPending || !isDirty} className="gap-2">
          {updateMutation.isPending ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Salvar Alterações
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

// ============================================================================
// FINANCEIRO FORM
// ============================================================================

function FinanceiroForm() {
  const utils = trpc.useUtils();
  const { data: configs, isLoading } = trpc.configSistema.list.useQuery();
  
  const updateMutation = trpc.configSistema.update.useMutation({
    onSuccess: () => {
      toast.success('Configuração atualizada');
      utils.configSistema.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const financeiroConfigs = configs?.financeiro || [];
  
  const getValue = (chave: string): any => {
    const config = financeiroConfigs.find((c: any) => c.chave === chave);
    return config?.valor ?? '';
  };

  const handleUpdate = (chave: string, valor: any) => {
    updateMutation.mutate({ chave, valor });
  };

  if (isLoading) {
    return <FormSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-emerald-600" />
          Configurações Financeiras
        </h2>
        <p className="text-sm text-muted-foreground">Parâmetros para gestão de contribuições e pagamentos</p>
      </div>

      <div className="space-y-4">
        <ConfigField
          label="Dia de Vencimento Padrão"
          description="Dia do mês para vencimento de contribuições mensais (1-28)"
          type="number"
          value={getValue('financeiro.dia_vencimento_padrao')}
          onChange={(v) => handleUpdate('financeiro.dia_vencimento_padrao', parseInt(v) || 10)}
          min={1}
          max={28}
          isPending={updateMutation.isPending}
        />

        <ConfigField
          label="Dias de Tolerância"
          description="Dias após o vencimento antes de considerar como atraso"
          type="number"
          value={getValue('financeiro.tolerancia_vencimento')}
          onChange={(v) => handleUpdate('financeiro.tolerancia_vencimento', parseInt(v) || 5)}
          min={0}
          max={30}
          isPending={updateMutation.isPending}
        />

        <ConfigField
          label="Valor Mínimo de Contribuição"
          description="Valor mínimo aceito para contribuições (em R$)"
          type="number"
          value={getValue('financeiro.valor_minimo_contribuicao')}
          onChange={(v) => handleUpdate('financeiro.valor_minimo_contribuicao', parseFloat(v) || 10)}
          min={0}
          isPending={updateMutation.isPending}
        />
      </div>

      <div className="pt-4 border-t">
        <h3 className="text-sm font-medium mb-3">Formas de Pagamento Aceitas</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {['Dinheiro', 'PIX', 'Boleto', 'Transferência', 'Cartão Débito', 'Cartão Crédito'].map((forma) => (
            <div key={forma} className="flex items-center gap-2 p-3 rounded-lg border bg-muted/30">
              <Switch defaultChecked={forma !== 'Cartão Crédito'} />
              <span className="text-sm">{forma}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// CONTABILIDADE FORM
// ============================================================================

function ContabilidadeForm() {
  const utils = trpc.useUtils();
  const { data: configs, isLoading } = trpc.configSistema.list.useQuery();
  
  const updateMutation = trpc.configSistema.update.useMutation({
    onSuccess: () => {
      toast.success('Configuração atualizada');
      utils.configSistema.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const contabilConfigs = configs?.contabilidade || [];
  
  const getValue = (chave: string): any => {
    const config = contabilConfigs.find((c: any) => c.chave === chave);
    return config?.valor ?? '';
  };

  const handleUpdate = (chave: string, valor: any) => {
    updateMutation.mutate({ chave, valor });
  };

  if (isLoading) {
    return <FormSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Calculator className="h-5 w-5 text-violet-600" />
          Configurações de Contabilidade
        </h2>
        <p className="text-sm text-muted-foreground">Parâmetros contábeis conforme ITG 2002 para entidades sem fins lucrativos</p>
      </div>

      <div className="space-y-4">
        <div className="p-4 rounded-lg border bg-muted/30">
          <Label className="text-sm font-medium">Mês de Início do Exercício Contábil</Label>
          <p className="text-xs text-muted-foreground mb-2">Mês que inicia o exercício fiscal da entidade</p>
          <Select 
            defaultValue={String(getValue('contabilidade.inicio_exercicio') || 1)}
            onValueChange={(v) => handleUpdate('contabilidade.inicio_exercicio', parseInt(v))}
          >
            <SelectTrigger className="w-full sm:w-48 mt-1">
              <SelectValue placeholder="Selecione o mês" />
            </SelectTrigger>
            <SelectContent>
              {['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'].map((mes, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>{mes}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="p-4 rounded-lg border bg-muted/30">
          <Label className="text-sm font-medium">Regime Contábil</Label>
          <p className="text-xs text-muted-foreground mb-2">Define o momento de reconhecimento de receitas e despesas</p>
          <Select 
            defaultValue={getValue('contabilidade.regime') || 'competencia'}
            onValueChange={(v) => handleUpdate('contabilidade.regime', v)}
          >
            <SelectTrigger className="w-full sm:w-64 mt-1">
              <SelectValue placeholder="Selecione o regime" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="competencia">Regime de Competência</SelectItem>
              <SelectItem value="caixa">Regime de Caixa</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="p-4 rounded-lg border bg-muted/30">
          <Label className="text-sm font-medium">Plano de Contas</Label>
          <p className="text-xs text-muted-foreground mb-2">Estrutura de contas contábeis utilizada</p>
          <div className="flex items-center gap-2 mt-2">
            <Badge className="bg-violet-100 text-violet-700">ITG 2002</Badge>
            <span className="text-sm text-muted-foreground">Padrão para entidades sem fins lucrativos</span>
          </div>
        </div>

        <div className="p-4 rounded-lg border bg-muted/30">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Fechamento Automático de Período</Label>
              <p className="text-xs text-muted-foreground">Bloquear períodos anteriores automaticamente</p>
            </div>
            <Switch defaultChecked />
          </div>
        </div>

        <div className="p-4 rounded-lg border bg-muted/30">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Exigir Documento em Lançamentos</Label>
              <p className="text-xs text-muted-foreground">Obrigar anexo de nota fiscal ou recibo</p>
            </div>
            <Switch />
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// NOTIFICACOES FORM
// ============================================================================

function NotificacoesForm() {
  const utils = trpc.useUtils();
  const { data: configs, isLoading } = trpc.configSistema.list.useQuery();
  
  const updateMutation = trpc.configSistema.update.useMutation({
    onSuccess: () => {
      toast.success('Configuração atualizada');
      utils.configSistema.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const notifConfigs = configs?.notificacoes || [];
  
  const getValue = (chave: string): any => {
    const config = notifConfigs.find((c: any) => c.chave === chave);
    return config?.valor ?? '';
  };

  const handleUpdate = (chave: string, valor: any) => {
    updateMutation.mutate({ chave, valor });
  };

  if (isLoading) {
    return <FormSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Bell className="h-5 w-5 text-amber-600" />
          Configurações de Notificações
        </h2>
        <p className="text-sm text-muted-foreground">Alertas automáticos e destinatários de email</p>
      </div>

      <div className="space-y-4">
        <ConfigField
          label="E-mail do Financeiro"
          description="Endereço para receber alertas de vencimentos e cobranças"
          type="email"
          value={getValue('notificacoes.email_financeiro')}
          onChange={(v) => handleUpdate('notificacoes.email_financeiro', v)}
          placeholder="financeiro@entidade.org.br"
          isPending={updateMutation.isPending}
        />

        <ConfigField
          label="Antecedência de Alerta (dias)"
          description="Quantos dias antes do vencimento enviar lembrete"
          type="number"
          value={getValue('notificacoes.vencimentos_antecedencia')}
          onChange={(v) => handleUpdate('notificacoes.vencimentos_antecedencia', parseInt(v) || 7)}
          min={1}
          max={30}
          isPending={updateMutation.isPending}
        />
      </div>

      <div className="pt-4 border-t">
        <h3 className="text-sm font-medium mb-3">Tipos de Notificação</h3>
        <div className="space-y-3">
          {[
            { label: 'Vencimentos próximos', desc: 'Títulos a vencer nos próximos dias', enabled: true },
            { label: 'Títulos vencidos', desc: 'Alertas de inadimplência', enabled: true },
            { label: 'Fechamento de período', desc: 'Lembrete de fechamento mensal', enabled: false },
            { label: 'Conciliação pendente', desc: 'Transações não conciliadas', enabled: false },
          ].map((notif) => (
            <div key={notif.label} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
              <div>
                <p className="text-sm font-medium">{notif.label}</p>
                <p className="text-xs text-muted-foreground">{notif.desc}</p>
              </div>
              <Switch defaultChecked={notif.enabled} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// CERTIFICADO DIGITAL FORM
// ============================================================================

function CertificadoForm() {
  const [showUpload, setShowUpload] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [senha, setSenha] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const utils = trpc.useUtils();
  const { data: cert, isLoading } = trpc.certificado.get.useQuery();
  const { data: validation } = trpc.certificado.validate.useQuery();

  const uploadMutation = trpc.certificado.upload.useMutation({
    onSuccess: () => {
      toast.success('Certificado carregado com sucesso');
      utils.certificado.get.invalidate();
      utils.certificado.validate.invalidate();
      setShowUpload(false);
      setFile(null);
      setSenha('');
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.certificado.delete.useMutation({
    onSuccess: () => {
      toast.success('Certificado removido');
      utils.certificado.get.invalidate();
      utils.certificado.validate.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleFileChange = useCallback((selectedFile: File | null) => {
    if (selectedFile && selectedFile.name.endsWith('.pfx')) {
      setFile(selectedFile);
    } else if (selectedFile) {
      toast.error('Apenas arquivos .pfx são aceitos');
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    handleFileChange(droppedFile);
  }, [handleFileChange]);

  const handleUpload = async () => {
    if (!file || !senha) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      uploadMutation.mutate({ arquivo: base64, senha, tipo: 'e_cnpj_a1' });
    };
    reader.readAsDataURL(file);
  };

  const getStatusBadge = () => {
    if (!cert) return null;
    const hoje = new Date();
    const validade = new Date(cert.validadeFim);
    const diasRestantes = Math.ceil((validade.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

    if (diasRestantes < 0) return <Badge className="bg-red-100 text-red-700">Expirado</Badge>;
    if (diasRestantes <= 30) return <Badge className="bg-amber-100 text-amber-700">Expira em {diasRestantes}d</Badge>;
    return <Badge className="bg-emerald-100 text-emerald-700">Ativo</Badge>;
  };

  if (isLoading) return <FormSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-teal-600" />
            Certificado Digital
          </h2>
          <p className="text-sm text-muted-foreground">e-CNPJ A1 para emissão de NFS-e e assinatura de documentos fiscais</p>
        </div>
        {!cert && (
          <Button onClick={() => setShowUpload(true)} size="sm" className="gap-1">
            <Upload className="h-4 w-4" />
            Carregar
          </Button>
        )}
      </div>

      {cert ? (
        <div className="space-y-4">
          <div className="p-4 rounded-lg border bg-muted/30">
            <div className="flex items-start justify-between">
              <div className="space-y-3 flex-1">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-8 w-8 text-teal-600" />
                  <div>
                    <p className="font-medium">{cert.razaoSocial}</p>
                    <p className="text-sm text-muted-foreground">CNPJ: {cert.cnpj?.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')}</p>
                  </div>
                  {getStatusBadge()}
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Tipo</p>
                    <p className="font-medium">{cert.tipo === 'e_cnpj_a1' ? 'e-CNPJ A1' : 'e-CNPJ A3'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Validade</p>
                    <p className="font-medium">{new Date(cert.validadeFim).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Emissor</p>
                    <p className="font-medium">{cert.emissor}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Nº Série</p>
                    <p className="font-medium font-mono text-xs">{cert.serialNumber?.slice(0, 20)}...</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-4 pt-4 border-t">
              <Button variant="outline" size="sm" onClick={() => setShowUpload(true)}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Substituir
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-destructive hover:text-destructive"
                onClick={() => cert.id && deleteMutation.mutate(cert.id)}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Remover
              </Button>
            </div>
          </div>

          {validation && !validation.valid && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <span className="text-sm text-red-700">{validation.error}</span>
            </div>
          )}
        </div>
      ) : (
        <div 
          className={cn(
            'border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer',
            dragOver ? 'border-teal-500 bg-teal-50' : 'border-muted-foreground/25 hover:border-muted-foreground/50'
          )}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => setShowUpload(true)}
        >
          <ShieldCheck className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">Nenhum certificado configurado</p>
          <p className="text-xs text-muted-foreground mt-1">Clique ou arraste um arquivo .pfx</p>
        </div>
      )}

      {/* Dialog Upload */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Carregar Certificado Digital
            </DialogTitle>
            <DialogDescription>
              Selecione o arquivo .pfx do seu e-CNPJ A1 e informe a senha
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div
              className={cn(
                'border-2 border-dashed rounded-lg p-6 text-center transition-colors',
                dragOver ? 'border-teal-500 bg-teal-50' : 'border-muted-foreground/25'
              )}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              {file ? (
                <div className="flex items-center justify-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-teal-600" />
                  <span className="text-sm font-medium">{file.name}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setFile(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">Arraste o arquivo .pfx aqui</p>
                  <label className="mt-2 inline-block">
                    <span className="text-sm text-teal-600 hover:underline cursor-pointer">ou selecione</span>
                    <input 
                      type="file" 
                      accept=".pfx" 
                      className="hidden" 
                      onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                    />
                  </label>
                </>
              )}
            </div>

            <div>
              <Label>Senha do Certificado</Label>
              <Input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Digite a senha do certificado"
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowUpload(false); setFile(null); setSenha(''); }}>
              Cancelar
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!file || !senha || uploadMutation.isPending}
            >
              {uploadMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Validando...
                </>
              ) : (
                'Carregar Certificado'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// IMPORTACAO/REGRAS FORM
// ============================================================================

function ImportacaoForm() {
  const [showAddRule, setShowAddRule] = useState(false);
  const [newPattern, setNewPattern] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');

  const utils = trpc.useUtils();
  const { data: rules, isLoading } = trpc.rules.list.useQuery();
  const { data: accounts } = trpc.accounts.list.useQuery();
  
  const createMutation = trpc.rules.create.useMutation({
    onSuccess: () => {
      toast.success('Regra criada');
      utils.rules.list.invalidate();
      setShowAddRule(false);
      setNewPattern('');
      setSelectedAccountId('');
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.rules.delete.useMutation({
    onSuccess: () => {
      toast.success('Regra removida');
      utils.rules.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleAddRule = () => {
    if (!newPattern || !selectedAccountId) return;
    createMutation.mutate({ 
      pattern: newPattern, 
      accountId: parseInt(selectedAccountId), 
      priority: 0 
    });
  };

  if (isLoading) {
    return <FormSkeleton />;
  }

  const rulesList = rules || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FileUp className="h-5 w-5 text-slate-600" />
            Regras de Classificação
          </h2>
          <p className="text-sm text-muted-foreground">Mapeamento automático de transações bancárias para contas contábeis</p>
        </div>
        <Button onClick={() => setShowAddRule(true)} size="sm" className="gap-1">
          <Plus className="h-4 w-4" />
          Nova Regra
        </Button>
      </div>

      {rulesList.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/30">
          <FileUp className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">Nenhuma regra de classificação cadastrada</p>
          <p className="text-xs text-muted-foreground mt-1">Adicione regras para classificar transações automaticamente</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rulesList.map((item: any) => (
            <div key={item.rule.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <code className="text-sm bg-muted px-2 py-0.5 rounded font-mono">{item.rule.pattern}</code>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  <Badge variant="secondary" className="text-xs">
                    {item.account?.code} - {item.account?.name}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Usado {item.rule.usageCount || 0} vezes
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={() => deleteMutation.mutate(item.rule.id)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog: Nova Regra */}
      <Dialog open={showAddRule} onOpenChange={setShowAddRule}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Nova Regra de Classificação
            </DialogTitle>
            <DialogDescription>
              Defina um padrão de texto e a conta de destino
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Padrão de Busca</Label>
              <Input
                value={newPattern}
                onChange={(e) => setNewPattern(e.target.value)}
                placeholder="Ex: PIX RECEBIDO, TED, TRANSFERENCIA"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Texto que aparece na descrição do extrato bancário
              </p>
            </div>
            <div>
              <Label>Conta Contábil</Label>
              <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione a conta" />
                </SelectTrigger>
                <SelectContent>
                  {(accounts || []).filter((a: any) => a.active).map((acc: any) => (
                    <SelectItem key={acc.id} value={String(acc.id)}>
                      {acc.code} - {acc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddRule(false)}>Cancelar</Button>
            <Button 
              onClick={handleAddRule} 
              disabled={createMutation.isPending || !newPattern || !selectedAccountId}
            >
              {createMutation.isPending ? 'Criando...' : 'Criar Regra'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function ConfigField({ 
  label, 
  description, 
  type, 
  value, 
  onChange, 
  isPending,
  ...inputProps 
}: { 
  label: string; 
  description: string; 
  type: 'text' | 'number' | 'email';
  value: any;
  onChange: (value: string) => void;
  isPending?: boolean;
  [key: string]: any;
}) {
  const [localValue, setLocalValue] = useState(String(value || ''));
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    setLocalValue(String(value || ''));
    setIsDirty(false);
  }, [value]);

  const handleSave = () => {
    onChange(localValue);
    setIsDirty(false);
  };

  return (
    <div className="p-4 rounded-lg border bg-muted/30">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <Label className="text-sm font-medium">{label}</Label>
          <p className="text-xs text-muted-foreground mb-2">{description}</p>
          <Input
            type={type}
            value={localValue}
            onChange={(e) => { setLocalValue(e.target.value); setIsDirty(true); }}
            className="w-full sm:w-64"
            {...inputProps}
          />
        </div>
        {isDirty && (
          <Button 
            size="sm" 
            onClick={handleSave} 
            disabled={isPending}
            className="mt-6"
          >
            {isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          </Button>
        )}
      </div>
    </div>
  );
}

function FormSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 bg-muted rounded w-48" />
      <div className="h-4 bg-muted rounded w-72" />
      <div className="space-y-3 pt-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="p-4 rounded-lg border bg-muted/30">
            <div className="h-4 bg-muted rounded w-32 mb-2" />
            <div className="h-3 bg-muted rounded w-48 mb-3" />
            <div className="h-9 bg-muted rounded w-64" />
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ onSelectCategory }: { onSelectCategory: (id: CategoryId) => void }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-8">
      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center mb-6">
        <SettingsIcon className="h-12 w-12 text-violet-500" />
      </div>
      <h3 className="text-xl font-semibold text-slate-800 mb-2">Configurações do Sistema</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        Selecione uma categoria ao lado para gerenciar as configurações da sua entidade.
      </p>
      <Button onClick={() => onSelectCategory('entidade')} className="bg-violet-600 hover:bg-violet-700">
        <Building2 className="h-4 w-4 mr-2" />
        Começar pela Entidade
      </Button>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function Settings() {
  const [activeCategory, setActiveCategory] = useState<CategoryId>('entidade');
  const [showMobileContent, setShowMobileContent] = useState(false);

  const { data: configs } = trpc.configSistema.list.useQuery();
  const { data: rules } = trpc.rules.list.useQuery();

  // Calcula estatísticas por categoria
  const configStats: Record<string, number> = {
    entidade: 8, // Campos fixos
    financeiro: configs?.financeiro?.length || 0,
    contabilidade: configs?.contabilidade?.length || 0,
    notificacoes: configs?.notificacoes?.length || 0,
    importacao: (rules || []).length,
  };

  const handleSelectCategory = (id: CategoryId) => {
    setActiveCategory(id);
    if (window.innerWidth < 1024) {
      setShowMobileContent(true);
    }
  };

  const renderContent = () => {
    switch (activeCategory) {
      case 'entidade':
        return <EntidadeForm />;
      case 'certificado':
        return <CertificadoForm />;
      case 'financeiro':
        return <FinanceiroForm />;
      case 'contabilidade':
        return <ContabilidadeForm />;
      case 'notificacoes':
        return <NotificacoesForm />;
      case 'importacao':
        return <ImportacaoForm />;
      default:
        return <EmptyState onSelectCategory={handleSelectCategory} />;
    }
  };

  return (
    <div className="h-[calc(100vh-theme(spacing.16)-theme(spacing.8))] lg:h-[calc(100vh-theme(spacing.8))] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-4 shrink-0">
        <PageHeader
          title="Configurações"
          description="Gerencie os parâmetros da sua organização"
          icon={<SettingsIcon className="h-6 w-6 sm:h-8 sm:w-8 text-violet-600" />}
        />
      </div>

      {/* Master-Detail Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">
        {/* Sidebar (Master) */}
        <Card className="lg:col-span-4 xl:col-span-3 flex flex-col overflow-hidden">
          <CardHeader className="py-3 px-4 shrink-0 border-b">
            <CardTitle className="text-sm font-medium text-muted-foreground">Categorias</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-2">
            <SettingsSidebar 
              activeCategory={activeCategory} 
              onSelectCategory={handleSelectCategory}
              configStats={configStats}
            />
          </CardContent>
        </Card>

        {/* Content (Detail) - Desktop */}
        <Card className="hidden lg:flex lg:col-span-8 xl:col-span-9 flex-col overflow-hidden">
          <CardContent className="flex-1 overflow-y-auto p-6">
            {renderContent()}
          </CardContent>
        </Card>
      </div>

      {/* Content Mobile Overlay */}
      {showMobileContent && (
        <div className="lg:hidden fixed inset-0 z-50 bg-background">
          <div className="h-full flex flex-col">
            <div className="flex items-center gap-3 p-4 border-b">
              <Button variant="ghost" size="icon" onClick={() => setShowMobileContent(false)}>
                <ChevronRight className="h-5 w-5 rotate-180" />
              </Button>
              <h2 className="font-semibold">
                {CATEGORIES.find(c => c.id === activeCategory)?.label}
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {renderContent()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
