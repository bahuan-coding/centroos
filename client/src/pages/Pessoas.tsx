import { useState } from 'react';
import { Users, Search, UserCheck, UserX, Heart, TrendingUp, Plus, Calendar, X, ChevronRight, AlertTriangle, Mail, Phone, FileText, MapPin, Link2, UserPlus, CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, ResponsiveTable, TableCardView } from '@/components/ui/table';
import { PageHeader, FilterBar, Pagination } from '@/components/ui/page-header';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { GlassCard } from '@/components/ui/glass-card';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';

ChartJS.register(ArcElement, Tooltip, Legend);

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatCurrencyCompact(value: number): string {
  if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `R$ ${(value / 1000).toFixed(1)}K`;
  return formatCurrency(value);
}

function formatDate(date: string | null): string {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('pt-BR');
}

function formatMonthLabel(mes: string | null | undefined): string {
  if (!mes) return '-';
  
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  
  // Handle both formats: 'MM/YYYY' (from backend) and 'YYYY-MM'
  if (mes.includes('/')) {
    const [month, year] = mes.split('/');
    const monthIdx = parseInt(month) - 1;
    return monthIdx >= 0 && monthIdx < 12 ? `${months[monthIdx]}/${year.slice(-2)}` : mes;
  } else if (mes.includes('-')) {
    const [year, month] = mes.split('-');
    const monthIdx = parseInt(month) - 1;
    return monthIdx >= 0 && monthIdx < 12 ? `${months[monthIdx]}/${year.slice(-2)}` : mes;
  }
  return mes;
}

// Detectar gênero pelo primeiro nome para avatares
function detectGender(nome: string): 'male' | 'female' | 'neutral' {
  const firstName = nome.trim().split(' ')[0].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  // Nomes comuns masculinos
  const maleNames = ['jose', 'joao', 'antonio', 'francisco', 'carlos', 'paulo', 'pedro', 'lucas', 'luiz', 'marcos', 'luis', 'gabriel', 'rafael', 'daniel', 'marcelo', 'bruno', 'eduardo', 'felipe', 'raimundo', 'edson', 'geraldo', 'adriano', 'sergio', 'rodrigo', 'claudio', 'fernando', 'gustavo', 'andre', 'jorge', 'manoel', 'manuel', 'roberto', 'fabio', 'ricardo', 'alex', 'jailton', 'mauricio', 'henrique', 'gilberto'];
  
  // Nomes comuns femininos
  const femaleNames = ['maria', 'ana', 'francisca', 'antonia', 'adriana', 'juliana', 'marcia', 'fernanda', 'patricia', 'aline', 'sandra', 'camila', 'amanda', 'bruna', 'jessica', 'leticia', 'julia', 'luciana', 'vanessa', 'mariana', 'gabriela', 'rafaela', 'daniela', 'renata', 'priscila', 'carla', 'cristina', 'claudia', 'lucia', 'regina', 'vera', 'rosa', 'rita', 'elizabeth', 'beatriz', 'luana', 'debora', 'raquel', 'simone', 'elaine', 'jaqueline', 'rosilene', 'rosangela', 'celia', 'marlene', 'edna', 'tatiane', 'nazidir', 'claudinete'];

  if (maleNames.includes(firstName)) return 'male';
  if (femaleNames.includes(firstName)) return 'female';
  
  // Heurísticas: nomes terminando em 'a' geralmente femininos
  if (firstName.endsWith('a') && !['luca', 'mica'].includes(firstName)) return 'female';
  if (firstName.endsWith('o') || firstName.endsWith('son') || firstName.endsWith('ton')) return 'male';
  
  return 'neutral';
}

// Avatar com emoji de gênero
function PersonAvatar({ nome, size = 'md' }: { nome: string; size?: 'sm' | 'md' | 'lg' }) {
  const gender = detectGender(nome);
  const sizeClasses = {
    sm: 'w-8 h-8 text-lg',
    md: 'w-10 h-10 text-xl',
    lg: 'w-14 h-14 text-2xl',
  };
  
  const emoji = gender === 'female' ? '👩' : gender === 'male' ? '👨' : '🧑';
  const bgClass = gender === 'female' 
    ? 'bg-gradient-to-br from-pink-100 to-rose-100' 
    : gender === 'male' 
    ? 'bg-gradient-to-br from-blue-100 to-indigo-100'
    : 'bg-gradient-to-br from-violet-100 to-purple-100';
  
  return (
    <div className={cn(
      'rounded-full flex items-center justify-center shrink-0',
      sizeClasses[size],
      bgClass
    )}>
      {emoji}
    </div>
  );
}

// Drawer de perfil da pessoa
function PessoaDrawer({ pessoa, onClose }: { pessoa: any; onClose: () => void }) {
  const { data: historico, isLoading } = trpc.pessoas.historico.useQuery(pessoa.id);
  const gender = detectGender(pessoa.nome);
  
  const validPorMes = historico?.porMes?.filter(m => m.total > 0) || [];
  const maxValor = validPorMes.length 
    ? Math.max(...validPorMes.map(m => m.total)) 
    : 0;

  return (
    <div className="fixed inset-0 z-40 flex justify-end pt-16">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-background shadow-2xl animate-in slide-in-from-right duration-300 overflow-y-auto rounded-tl-2xl">
        {/* Header */}
        <div className={cn(
          "sticky top-0 text-white p-6 z-10 rounded-tl-2xl",
          gender === 'female' 
            ? "bg-gradient-to-br from-pink-500 to-rose-600" 
            : gender === 'male'
            ? "bg-gradient-to-br from-blue-500 to-indigo-600"
            : "bg-gradient-to-br from-violet-600 to-indigo-700"
        )}>
          <button 
            onClick={onClose} 
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/20 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-3xl">
              {gender === 'female' ? '👩' : gender === 'male' ? '👨' : '🧑'}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold truncate">{pessoa.nome}</h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge variant="outline" className="border-white/40 text-white text-xs">
                  {pessoa.tipo === 'fisica' ? 'Pessoa Física' : 'Pessoa Jurídica'}
                </Badge>
                {pessoa.isAssociado && (
                  <Badge className="bg-white/20 text-white text-xs">
                    <UserCheck className="h-3 w-3 mr-1" />
                    {pessoa.associado?.categoria || 'Associado'}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          {/* Stats no header */}
          {historico?.stats && (
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="text-center">
                <div className="text-2xl font-bold">{historico.stats.totalDoacoes}</div>
                <div className="text-xs text-white/70">Doações 💝</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{formatCurrencyCompact(historico.stats.valorTotal)}</div>
                <div className="text-xs text-white/70">Total 💰</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{formatCurrency(historico.stats.mediaDoacao)}</div>
                <div className="text-xs text-white/70">Média</div>
              </div>
            </div>
          )}
        </div>

        {/* Conteúdo */}
        <div className="p-6 space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <>
              {/* Gráfico de barras */}
              {historico?.porMes && historico.porMes.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3">📊 Contribuições por Mês</h3>
                  <div className="flex items-end gap-1 h-32">
                    {historico.porMes.map((m, idx) => {
                      const height = maxValor > 0 ? (m.total / maxValor) * 100 : 0;
                      return (
                        <div key={m.mes} className="flex-1 flex flex-col items-center gap-1">
                          <div 
                            className={cn(
                              "w-full rounded-t transition-all duration-500",
                              idx === historico.porMes.length - 1 
                                ? gender === 'female' 
                                  ? "bg-gradient-to-t from-pink-500 to-pink-400"
                                  : gender === 'male'
                                  ? "bg-gradient-to-t from-blue-500 to-blue-400"
                                  : "bg-gradient-to-t from-violet-500 to-violet-400"
                                : "bg-gradient-to-t from-slate-300 to-slate-200"
                            )}
                            style={{ 
                              height: `${Math.max(height, 4)}%`,
                              animationDelay: `${idx * 50}ms`
                            }}
                            title={`${formatMonthLabel(m.mes)}: ${formatCurrency(m.total)}`}
                          />
                          <span className="text-[9px] text-muted-foreground">
                            {formatMonthLabel(m.mes).split('/')[0]}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Timeline de doações */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">💝 Histórico de Doações</h3>
                {historico?.doacoes && historico.doacoes.length > 0 ? (
                  <div className="relative space-y-0">
                    <div className="absolute left-[11px] top-3 bottom-3 w-0.5 bg-gradient-to-b from-violet-200 via-slate-200 to-transparent" />
                    {historico.doacoes.map((doacao, idx) => (
                      <div 
                        key={doacao.id} 
                        className="relative flex items-start gap-4 py-3"
                        style={{ animationDelay: `${idx * 30}ms` }}
                      >
                        <div className={cn(
                          "relative z-10 w-6 h-6 rounded-full flex items-center justify-center shrink-0",
                          idx === 0 
                            ? gender === 'female' ? "bg-pink-500 text-white" : gender === 'male' ? "bg-blue-500 text-white" : "bg-violet-500 text-white"
                            : "bg-slate-100 border-2 border-slate-200"
                        )}>
                          <Heart className={cn("h-3 w-3", idx === 0 ? "fill-white" : "text-slate-400")} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-sm">
                              {formatCurrency(doacao.valor)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(doacao.dataCompetencia)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {doacao.descricao || doacao.natureza}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <span className="text-4xl">💔</span>
                    <p className="text-sm mt-2">Nenhuma doação registrada</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Modal de cadastro
function NovaPessoaModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const utils = trpc.useUtils();
  const createMutation = trpc.pessoas.create.useMutation({
    onSuccess: () => {
      utils.pessoas.list.invalidate();
      utils.pessoas.stats.invalidate();
      utils.pessoas.healthStats.invalidate();
      onClose();
      setForm({ nome: '', tipo: 'fisica', cpfCnpj: '', email: '', telefone: '', observacoes: '', tornarAssociado: false, categoria: '' });
    },
  });

  const [form, setForm] = useState({
    nome: '',
    tipo: 'fisica' as 'fisica' | 'juridica',
    cpfCnpj: '',
    email: '',
    telefone: '',
    observacoes: '',
    tornarAssociado: false,
    categoria: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      nome: form.nome,
      tipo: form.tipo,
      cpfCnpj: form.cpfCnpj || undefined,
      email: form.email || undefined,
      telefone: form.telefone || undefined,
      observacoes: form.observacoes || undefined,
      tornarAssociado: form.tornarAssociado,
      categoria: form.tornarAssociado && form.categoria 
        ? form.categoria as 'trabalhador' | 'frequentador' | 'benemerito' | 'honorario' 
        : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-xl">➕</span>
            Nova Pessoa
          </DialogTitle>
          <DialogDescription>
            Cadastre uma nova pessoa no sistema
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome completo *</Label>
            <Input
              id="nome"
              value={form.nome}
              onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
              placeholder="Nome da pessoa"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={(v: 'fisica' | 'juridica') => setForm(f => ({ ...f, tipo: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fisica">👤 Pessoa Física</SelectItem>
                  <SelectItem value="juridica">🏢 Pessoa Jurídica</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cpfCnpj">{form.tipo === 'fisica' ? 'CPF' : 'CNPJ'}</Label>
              <Input
                id="cpfCnpj"
                value={form.cpfCnpj}
                onChange={e => setForm(f => ({ ...f, cpfCnpj: e.target.value }))}
                placeholder={form.tipo === 'fisica' ? '000.000.000-00' : '00.000.000/0000-00'}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">📧 E-mail</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="email@exemplo.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefone">📱 Telefone</Label>
              <Input
                id="telefone"
                value={form.telefone}
                onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))}
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-violet-50 border border-violet-200">
            <Checkbox 
              id="tornarAssociado" 
              checked={form.tornarAssociado}
              onCheckedChange={(checked) => setForm(f => ({ ...f, tornarAssociado: !!checked }))}
            />
            <div className="flex-1">
              <Label htmlFor="tornarAssociado" className="font-medium cursor-pointer">
                🤝 Tornar associado
              </Label>
              <p className="text-xs text-muted-foreground">Cadastrar também como membro da instituição</p>
            </div>
          </div>

          {form.tornarAssociado && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
              <Label>Categoria do associado</Label>
              <Select value={form.categoria} onValueChange={v => setForm(f => ({ ...f, categoria: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trabalhador">⚙️ Trabalhador</SelectItem>
                  <SelectItem value="frequentador">🙏 Frequentador</SelectItem>
                  <SelectItem value="benemerito">⭐ Benemérito</SelectItem>
                  <SelectItem value="honorario">🏆 Honorário</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={createMutation.isPending || !form.nome.trim() || (form.tornarAssociado && !form.categoria)}
              className="bg-violet-600 hover:bg-violet-700"
            >
              {createMutation.isPending ? 'Salvando...' : '✓ Cadastrar'}
            </Button>
          </DialogFooter>

          {createMutation.isError && (
            <p className="text-sm text-destructive text-center">
              {createMutation.error.message}
            </p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Componente de Saúde dos Dados (Donut Chart)
function DataHealthChart({ healthStats }: { healthStats: any }) {
  const chartData = {
    labels: ['Com CPF', 'Com Email', 'Com Telefone', 'Com Endereço'],
    datasets: [{
      data: [
        healthStats.percentualCpf,
        healthStats.percentualEmail,
        healthStats.percentualTelefone,
        healthStats.percentualEndereco,
      ],
      backgroundColor: [
        healthStats.percentualCpf > 50 ? 'rgba(34, 197, 94, 0.8)' : 'rgba(239, 68, 68, 0.8)',
        healthStats.percentualEmail > 50 ? 'rgba(34, 197, 94, 0.8)' : 'rgba(239, 68, 68, 0.8)',
        healthStats.percentualTelefone > 50 ? 'rgba(34, 197, 94, 0.8)' : 'rgba(239, 68, 68, 0.8)',
        healthStats.percentualEndereco > 50 ? 'rgba(34, 197, 94, 0.8)' : 'rgba(239, 68, 68, 0.8)',
      ],
      borderWidth: 0,
    }],
  };

  return (
    <div className="h-40">
      <Doughnut 
        data={chartData} 
        options={{
          responsive: true,
          maintainAspectRatio: false,
          cutout: '60%',
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => `${ctx.label}: ${ctx.raw}%`
              }
            }
          },
        }} 
      />
    </div>
  );
}

// Modal de Inconsistências
function InconsistenciasModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const utils = trpc.useUtils();
  const { data: inconsistencias, isLoading } = trpc.pessoas.inconsistencias.useQuery(undefined, { enabled: open });
  const [searchNome, setSearchNome] = useState('');
  const [selectedTitulo, setSelectedTitulo] = useState<any>(null);
  
  const { data: similares } = trpc.pessoas.buscarSimilares.useQuery(
    { nome: searchNome },
    { enabled: searchNome.length >= 2 }
  );
  
  const vincularMutation = trpc.pessoas.vincularTitulo.useMutation({
    onSuccess: () => {
      utils.pessoas.inconsistencias.invalidate();
      utils.pessoas.list.invalidate();
      setSelectedTitulo(null);
      setSearchNome('');
    },
  });
  
  const criarEVincularMutation = trpc.pessoas.criarEVincular.useMutation({
    onSuccess: () => {
      utils.pessoas.inconsistencias.invalidate();
      utils.pessoas.list.invalidate();
      setSelectedTitulo(null);
      setSearchNome('');
    },
  });

  const handleVincular = (pessoaId: string) => {
    if (!selectedTitulo) return;
    vincularMutation.mutate({ tituloId: selectedTitulo.id, pessoaId });
  };

  const handleCriarEVincular = () => {
    if (!selectedTitulo || !searchNome.trim()) return;
    criarEVincularMutation.mutate({
      tituloId: selectedTitulo.id,
      nome: searchNome.trim(),
      tipo: 'fisica',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-xl">🔗</span>
            Central de Inconsistências
          </DialogTitle>
          <DialogDescription>
            Títulos sem pessoa vinculada e pessoas sem doações registradas
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-6 pr-2">
            {/* Estatísticas */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  <span className="font-semibold text-amber-800">Títulos sem Pessoa</span>
                </div>
                <div className="text-2xl font-bold text-amber-600 mt-1">
                  {inconsistencias?.stats?.titulosSemPessoa || 0}
                </div>
              </div>
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-slate-600" />
                  <span className="font-semibold text-slate-800">Pessoas sem Doações</span>
                </div>
                <div className="text-2xl font-bold text-slate-600 mt-1">
                  {inconsistencias?.stats?.pessoasSemTitulo || 0}
                </div>
              </div>
            </div>

            {/* Lista de títulos sem pessoa */}
            {inconsistencias?.titulosSemPessoa && inconsistencias.titulosSemPessoa.length > 0 && (
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Contribuições para Vincular ({inconsistencias.titulosSemPessoa.length})
                </h3>
                <div className="space-y-2">
                  {inconsistencias.titulosSemPessoa.slice(0, 20).map((titulo: any) => (
                    <div 
                      key={titulo.id}
                      className={cn(
                        "p-3 rounded-lg border transition-all cursor-pointer",
                        selectedTitulo?.id === titulo.id 
                          ? "border-violet-500 bg-violet-50" 
                          : "border-slate-200 hover:border-violet-300 hover:bg-slate-50"
                      )}
                      onClick={() => {
                        setSelectedTitulo(titulo);
                        // Extrair nome da descrição se possível
                        const match = titulo.descricao?.match(/Contribuição\s+(?:Associado|Não Associado)\s*-?\s*(.+)/i);
                        if (match) setSearchNome(match[1].trim());
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{titulo.descricao || 'Sem descrição'}</p>
                          <p className="text-xs text-muted-foreground">
                            {titulo.dataCompetencia ? new Date(titulo.dataCompetencia).toLocaleDateString('pt-BR') : '-'}
                            {' • '}
                            <span className="text-emerald-600 font-medium">{formatCurrency(titulo.valor)}</span>
                          </p>
                        </div>
                        {selectedTitulo?.id === titulo.id ? (
                          <CheckCircle2 className="h-5 w-5 text-violet-600 shrink-0" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Painel de vinculação */}
            {selectedTitulo && (
              <div className="p-4 rounded-lg bg-violet-50 border border-violet-200 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-violet-800 flex items-center gap-2">
                    <Link2 className="h-4 w-4" />
                    Vincular Contribuição
                  </h4>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedTitulo(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="text-sm text-violet-700 bg-white/50 p-2 rounded">
                  <strong>{selectedTitulo.descricao}</strong>
                  <br />
                  {formatCurrency(selectedTitulo.valor)} em {new Date(selectedTitulo.dataCompetencia).toLocaleDateString('pt-BR')}
                </div>
                
                <div className="space-y-2">
                  <Label>Buscar pessoa existente:</Label>
                  <Input
                    placeholder="Digite o nome para buscar..."
                    value={searchNome}
                    onChange={(e) => setSearchNome(e.target.value)}
                  />
                </div>
                
                {similares && similares.length > 0 && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Pessoas encontradas:</Label>
                    {similares.map((pessoa: any) => (
                      <button
                        key={pessoa.id}
                        onClick={() => handleVincular(pessoa.id)}
                        disabled={vincularMutation.isPending}
                        className="w-full p-2 text-left rounded border border-slate-200 hover:border-violet-400 hover:bg-violet-50 transition-all flex items-center justify-between"
                      >
                        <span className="text-sm font-medium">{pessoa.nome}</span>
                        <Badge variant="outline" className="text-xs">
                          {Math.round((pessoa.score || 0) * 100)}% match
                        </Badge>
                      </button>
                    ))}
                  </div>
                )}
                
                {searchNome.length >= 2 && (!similares || similares.length === 0) && (
                  <div className="text-sm text-muted-foreground italic">
                    Nenhuma pessoa encontrada com esse nome
                  </div>
                )}
                
                {searchNome.length >= 2 && (
                  <Button
                    onClick={handleCriarEVincular}
                    disabled={criarEVincularMutation.isPending}
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Criar "{searchNome}" e Vincular
                  </Button>
                )}
              </div>
            )}

            {/* Lista de pessoas sem doações */}
            {inconsistencias?.pessoasSemDoacoes && inconsistencias.pessoasSemDoacoes.length > 0 && (
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4 text-slate-500" />
                  Pessoas Cadastradas sem Doações ({inconsistencias.pessoasSemDoacoes.length})
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {inconsistencias.pessoasSemDoacoes.slice(0, 12).map((pessoa: any) => (
                    <div 
                      key={pessoa.id}
                      className="p-2 rounded border border-slate-200 text-sm"
                    >
                      <p className="font-medium truncate">{pessoa.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {pessoa.isAssociado ? '🤝 Associado' : '👤 Não associado'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Mensagem de sucesso */}
            {inconsistencias?.titulosSemPessoa?.length === 0 && inconsistencias?.pessoasSemDoacoes?.length === 0 && (
              <div className="text-center py-8">
                <span className="text-5xl">🎉</span>
                <p className="mt-3 font-medium text-emerald-700">Tudo em ordem!</p>
                <p className="text-sm text-muted-foreground">Não há inconsistências para resolver.</p>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Pessoas() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [filtroAssociados, setFiltroAssociados] = useState<boolean | undefined>(undefined);
  const [selectedPessoa, setSelectedPessoa] = useState<any>(null);
  const [showNovaModal, setShowNovaModal] = useState(false);
  const [showInconsistencias, setShowInconsistencias] = useState(false);

  const { data, isLoading } = trpc.pessoas.list.useQuery({
    search: search || undefined,
    apenasAssociados: filtroAssociados,
    page,
    limit: 20,
  });

  const { data: stats } = trpc.pessoas.stats.useQuery();
  const { data: healthStats } = trpc.pessoas.healthStats.useQuery();
  const { data: topDoadores } = trpc.pessoas.topDoadores.useQuery(5);
  const { data: inconsistencias } = trpc.pessoas.inconsistencias.useQuery();

  const pessoas = data?.pessoas || [];
  const totalPages = data?.pages || 1;

  // Alertas críticos
  const alertasCriticos = healthStats?.alertas?.filter(a => a.tipo === 'critico') || [];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <PageHeader
          title="Pessoas"
          description="Cadastro de doadores e associados 👥"
          icon={<span className="text-3xl">👥</span>}
        />
        <Button 
          onClick={() => setShowNovaModal(true)}
          className="bg-violet-600 hover:bg-violet-700 gap-2"
        >
          <Plus className="h-4 w-4" />
          Nova Pessoa
        </Button>
      </div>

      {/* Alertas de Emergência */}
      {alertasCriticos.length > 0 && (
        <div className="space-y-3">
          {alertasCriticos.map((alerta, idx) => (
            <GlassCard 
              key={idx} 
              className="border-red-200 bg-gradient-to-r from-red-50 to-rose-50"
            >
              <div className="flex items-start gap-4 p-4">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-red-800 flex items-center gap-2">
                    🚨 {alerta.titulo}
                  </h3>
                  <p className="text-sm text-red-600 mt-1">{alerta.descricao}</p>
                </div>
                <Badge className="bg-red-600 text-white shrink-0">
                  Crítico
                </Badge>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Stats Row 1 - Pessoas */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card 
          className={cn(
            "cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02]",
            filtroAssociados === undefined && "ring-2 ring-violet-500 ring-offset-2"
          )} 
          onClick={() => setFiltroAssociados(undefined)}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-2xl">👥</span>
              <span className="text-xs text-muted-foreground">Total</span>
            </div>
            <div className="text-2xl font-bold mt-2 bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
              {stats?.total || 0}
            </div>
          </CardContent>
        </Card>

        <Card 
          className={cn(
            'cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02]',
            filtroAssociados === true && 'ring-2 ring-violet-500 ring-offset-2'
          )}
          onClick={() => setFiltroAssociados(filtroAssociados === true ? undefined : true)}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-2xl">🤝</span>
              <UserCheck className="h-4 w-4 text-violet-600" />
            </div>
            <div className="text-2xl font-bold mt-2 text-violet-600">{stats?.associados || 0}</div>
            <span className="text-xs text-muted-foreground">Associados</span>
          </CardContent>
        </Card>

        <Card 
          className={cn(
            'cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02]',
            filtroAssociados === false && 'ring-2 ring-slate-500 ring-offset-2'
          )}
          onClick={() => setFiltroAssociados(filtroAssociados === false ? undefined : false)}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-2xl">👤</span>
              <UserX className="h-4 w-4 text-slate-500" />
            </div>
            <div className="text-2xl font-bold mt-2 text-slate-600">{stats?.naoAssociados || 0}</div>
            <span className="text-xs text-muted-foreground">Não Assoc.</span>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-2xl">💝</span>
              <Heart className="h-4 w-4 text-rose-500" />
            </div>
            <div className="text-2xl font-bold mt-2 text-rose-600">{healthStats?.comDoacoes || 0}</div>
            <span className="text-xs text-muted-foreground">Doadores</span>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-2xl">💰</span>
            </div>
            <div className="text-xl font-bold mt-2 text-emerald-600">
              {healthStats ? formatCurrencyCompact(healthStats.totalArrecadado) : '-'}
            </div>
            <span className="text-xs text-muted-foreground">Arrecadado</span>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-2xl">📊</span>
            </div>
            <div className="text-xl font-bold mt-2 text-blue-600">
              {healthStats ? formatCurrency(healthStats.mediaPorDoacao) : '-'}
            </div>
            <span className="text-xs text-muted-foreground">Média/Doação</span>
          </CardContent>
        </Card>
      </div>

      {/* Card de Inconsistências - Destaque */}
      {(inconsistencias?.stats?.titulosSemPessoa || 0) > 0 && (
        <Card 
          className="cursor-pointer transition-all duration-200 hover:shadow-lg border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50"
          onClick={() => setShowInconsistencias(true)}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-amber-800">
                    {inconsistencias?.stats?.titulosSemPessoa || 0} Inconsistências Encontradas
                  </h3>
                  <p className="text-sm text-amber-600">
                    Clique para vincular contribuições às pessoas corretas
                  </p>
                </div>
              </div>
              <Button className="bg-amber-600 hover:bg-amber-700">
                <Link2 className="h-4 w-4 mr-2" />
                Resolver
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Row com Top Doadores e Saúde dos Dados */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top Doadores - 2 colunas */}
        {topDoadores && topDoadores.length > 0 && (
          <Card className="lg:col-span-2 overflow-hidden">
            <CardHeader className="pb-3 bg-gradient-to-r from-amber-50 to-orange-50 border-b">
              <div className="flex items-center gap-2">
                <span className="text-xl">🏆</span>
                <CardTitle className="text-sm font-medium">Top Contribuidores</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {topDoadores.map((doador, idx) => {
                  const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}º`;
                  return (
                    <button
                      key={doador.id}
                      onClick={() => setSelectedPessoa(doador)}
                      className="w-full flex items-center gap-4 p-4 hover:bg-amber-50/50 transition-colors text-left"
                    >
                      <span className="text-2xl w-8 text-center">{medal}</span>
                      <PersonAvatar nome={doador.nome} size="md" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{doador.nome}</p>
                        <p className="text-xs text-muted-foreground">
                          {doador.totalContribuicoes} doações 💝
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-emerald-600">{formatCurrency(doador.valorTotal)}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Saúde dos Dados - 1 coluna */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
            <div className="flex items-center gap-2">
              <span className="text-xl">📋</span>
              <CardTitle className="text-sm font-medium">Saúde dos Dados</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            {healthStats ? (
              <div className="space-y-4">
                {/* Verifica se todos os percentuais são 0 */}
                {(healthStats.percentualCpf + healthStats.percentualEmail + healthStats.percentualTelefone + healthStats.percentualEndereco) === 0 ? (
                  <div className="text-center py-4 space-y-3">
                    <div className="w-16 h-16 mx-auto rounded-full bg-slate-100 flex items-center justify-center">
                      <span className="text-3xl">📝</span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-700">Dados de contato não preenchidos</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Os cadastros foram importados sem CPF, email, telefone ou endereço.
                        <br />Clique em uma pessoa para completar seus dados.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs pt-2">
                      <div className="p-2 rounded bg-rose-50 text-rose-700 flex items-center gap-2">
                        <FileText className="h-3 w-3" /> 0% com CPF
                      </div>
                      <div className="p-2 rounded bg-rose-50 text-rose-700 flex items-center gap-2">
                        <Mail className="h-3 w-3" /> 0% com Email
                      </div>
                      <div className="p-2 rounded bg-rose-50 text-rose-700 flex items-center gap-2">
                        <Phone className="h-3 w-3" /> 0% com Tel.
                      </div>
                      <div className="p-2 rounded bg-rose-50 text-rose-700 flex items-center gap-2">
                        <MapPin className="h-3 w-3" /> 0% com End.
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <DataHealthChart healthStats={healthStats} />
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-slate-400" />
                          Com CPF
                        </span>
                        <Badge variant={healthStats.percentualCpf > 50 ? "default" : "destructive"}>
                          {healthStats.percentualCpf}%
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-slate-400" />
                          Com Email
                        </span>
                        <Badge variant={healthStats.percentualEmail > 50 ? "default" : "destructive"}>
                          {healthStats.percentualEmail}%
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-slate-400" />
                          Com Telefone
                        </span>
                        <Badge variant={healthStats.percentualTelefone > 50 ? "default" : "destructive"}>
                          {healthStats.percentualTelefone}%
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-slate-400" />
                          Com Endereço
                        </span>
                        <Badge variant={healthStats.percentualEndereco > 50 ? "default" : "destructive"}>
                          {healthStats.percentualEndereco}%
                        </Badge>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Search and Table */}
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <FilterBar showClear={filtroAssociados !== undefined} onClear={() => setFiltroAssociados(undefined)}>
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="🔍 Buscar por nome..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-10 w-full"
              />
            </div>
          </FilterBar>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : pessoas.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground px-4">
              <span className="text-5xl">🔍</span>
              <p className="mt-3">Nenhuma pessoa encontrada</p>
              <Button 
                variant="link" 
                className="mt-2 text-violet-600"
                onClick={() => setShowNovaModal(true)}
              >
                ➕ Cadastrar nova pessoa
              </Button>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block">
                <ResponsiveTable stickyHeader density="normal">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Pessoa</TableHead>
                        <TableHead className="col-priority-medium">Tipo</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Total Doado</TableHead>
                        <TableHead className="text-center col-priority-low">Doações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pessoas.map((pessoa: any) => (
                        <TableRow 
                          key={pessoa.id} 
                          className="cursor-pointer hover:bg-violet-50/50 transition-colors"
                          onClick={() => setSelectedPessoa(pessoa)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <PersonAvatar nome={pessoa.nome} size="sm" />
                              <div>
                                <span className="font-medium hover:text-violet-600 transition-colors flex items-center gap-1">
                                  {pessoa.nome}
                                  {pessoa.totalContribuicoes > 5 && (
                                    <span title="Doador frequente">💝</span>
                                  )}
                                </span>
                                {pessoa.associado?.categoria && (
                                  <span className="text-xs text-muted-foreground capitalize block">
                                    {pessoa.associado.categoria}
                                  </span>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="col-priority-medium">
                            <Badge variant="outline" className="text-xs">
                              {pessoa.tipo === 'fisica' ? '👤 PF' : '🏢 PJ'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {pessoa.isAssociado ? (
                              <Badge className="bg-violet-100 text-violet-700 text-xs">
                                🤝 Associado
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">Não Assoc.</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {pessoa.valorTotal > 0 ? (
                              <span className="font-semibold text-emerald-600">
                                {formatCurrency(pessoa.valorTotal)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-xs">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center col-priority-low">
                            {pessoa.totalContribuicoes > 0 ? (
                              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                                <Heart className="h-3 w-3 text-rose-400" />
                                <span>{pessoa.totalContribuicoes}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ResponsiveTable>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden px-4">
                <TableCardView
                  data={pessoas}
                  keyExtractor={(p: any) => p.id}
                  renderCard={(pessoa: any) => (
                    <button
                      onClick={() => setSelectedPessoa(pessoa)}
                      className="w-full flex items-center gap-3 text-left"
                    >
                      <PersonAvatar nome={pessoa.nome} size="md" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <p className="font-medium text-sm truncate">{pessoa.nome}</p>
                          {pessoa.totalContribuicoes > 5 && (
                            <span className="shrink-0">💝</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {pessoa.isAssociado ? (
                            <Badge className="bg-violet-100 text-violet-700 text-[10px]">🤝 Associado</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px]">Não Assoc.</Badge>
                          )}
                          {pessoa.valorTotal > 0 && (
                            <span className="text-xs font-medium text-emerald-600">
                              {formatCurrency(pessoa.valorTotal)}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                    </button>
                  )}
                />
              </div>

              {/* Pagination */}
              <div className="px-4 sm:px-0">
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  totalItems={data?.total || 0}
                  itemsShown={pessoas.length}
                  onPageChange={setPage}
                  itemLabel="pessoas"
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Drawer de perfil */}
      {selectedPessoa && (
        <PessoaDrawer pessoa={selectedPessoa} onClose={() => setSelectedPessoa(null)} />
      )}

      {/* Modal de cadastro */}
      <NovaPessoaModal open={showNovaModal} onClose={() => setShowNovaModal(false)} />

      {/* Modal de inconsistências */}
      <InconsistenciasModal open={showInconsistencias} onClose={() => setShowInconsistencias(false)} />
    </div>
  );
}
