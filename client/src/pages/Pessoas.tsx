import { useState } from 'react';
import { Users, Search, UserCheck, UserX, Heart, Plus, ChevronRight, AlertTriangle, Mail, Phone, FileText, MapPin, X, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader, Pagination } from '@/components/ui/page-header';
import { GlassCard } from '@/components/ui/glass-card';
import { PessoaDetail, PessoaWizard } from '@/components/pessoas';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import { QueryError } from '@/components/ui/query-error';

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatCurrencyCompact(value: number): string {
  if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `R$ ${(value / 1000).toFixed(1)}K`;
  return formatCurrency(value);
}

// Detectar gênero pelo primeiro nome para avatares
function detectGender(nome: string): 'male' | 'female' | 'neutral' {
  const firstName = nome.trim().split(' ')[0].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const maleNames = ['jose', 'joao', 'antonio', 'francisco', 'carlos', 'paulo', 'pedro', 'lucas', 'luiz', 'marcos', 'luis', 'gabriel', 'rafael', 'daniel', 'marcelo', 'bruno', 'eduardo', 'felipe', 'raimundo', 'edson'];
  const femaleNames = ['maria', 'ana', 'francisca', 'antonia', 'adriana', 'juliana', 'marcia', 'fernanda', 'patricia', 'aline', 'sandra', 'camila', 'amanda', 'bruna', 'jessica', 'leticia', 'julia', 'luciana'];
  if (maleNames.includes(firstName)) return 'male';
  if (femaleNames.includes(firstName)) return 'female';
  if (firstName.endsWith('a') && !['luca', 'mica'].includes(firstName)) return 'female';
  if (firstName.endsWith('o') || firstName.endsWith('son') || firstName.endsWith('ton')) return 'male';
  return 'neutral';
}

// Avatar com emoji de gênero
function PersonAvatar({ nome, size = 'md' }: { nome: string; size?: 'sm' | 'md' | 'lg' }) {
  const gender = detectGender(nome);
  const sizeClasses = { sm: 'w-8 h-8 text-lg', md: 'w-10 h-10 text-xl', lg: 'w-14 h-14 text-2xl' };
  const emoji = gender === 'female' ? '👩' : gender === 'male' ? '👨' : '🧑';
  const bgClass = gender === 'female' ? 'bg-gradient-to-br from-pink-100 to-rose-100' 
    : gender === 'male' ? 'bg-gradient-to-br from-blue-100 to-indigo-100'
    : 'bg-gradient-to-br from-violet-100 to-purple-100';
  
  return (
    <div className={cn('rounded-full flex items-center justify-center shrink-0', sizeClasses[size], bgClass)}>
      {emoji}
    </div>
  );
}

// Calculate status cadastro based on data
function getStatusCadastro(pessoa: any): 'completo' | 'pendencias' | 'rascunho' {
  // Rascunho: nome é "Rascunho" ou muito curto
  if (!pessoa.nome || pessoa.nome === 'Rascunho' || pessoa.nome.length < 3) {
    return 'rascunho';
  }
  // Pendencias: sem documento principal
  if (!pessoa.temDocumento) {
    return 'pendencias';
  }
  return 'completo';
}

// Status badge component
function StatusBadge({ status }: { status: 'completo' | 'pendencias' | 'rascunho' }) {
  if (status === 'completo') return null;
  if (status === 'rascunho') {
    return <Badge className="bg-slate-100 text-slate-600 text-[10px] px-1.5 py-0">Rascunho</Badge>;
  }
  return <Badge className="bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0">Pendências</Badge>;
}

// Componente de Lista de Pessoas (lado esquerdo do master-detail)
function PessoasList({ 
  pessoas, 
  selectedId, 
  onSelect,
  isLoading 
}: { 
  pessoas: any[]; 
  selectedId: string | null;
  onSelect: (pessoa: any) => void;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="animate-pulse p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (pessoas.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <span className="text-5xl">🔍</span>
        <p className="mt-3 text-sm">Nenhuma pessoa encontrada</p>
        <p className="text-xs mt-1">Tente outros termos de busca ou limpe os filtros</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {pessoas.map((pessoa) => {
        const statusCadastro = getStatusCadastro(pessoa);
        const isInativo = !pessoa.ativo;
        
        return (
          <button
            key={pessoa.id}
            onClick={() => onSelect(pessoa)}
            className={cn(
              'w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all',
              'hover:bg-violet-50 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-1',
              selectedId === pessoa.id && 'bg-violet-100 ring-2 ring-violet-500',
              isInativo && 'opacity-60'
            )}
          >
            <PersonAvatar nome={pessoa.nome} size="md" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="font-medium text-sm truncate">{pessoa.nome}</p>
                {pessoa.totalContribuicoes > 5 && <span title="Doador frequente">💝</span>}
                {isInativo && <Badge variant="outline" className="text-[10px] px-1 py-0 border-slate-300">Inativo</Badge>}
              </div>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <StatusBadge status={statusCadastro} />
                {pessoa.isAssociado ? (
                  <Badge className="bg-violet-100 text-violet-700 text-[10px] px-1.5 py-0">
                    <UserCheck className="h-2.5 w-2.5 mr-0.5" />Associado
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Não Assoc.</Badge>
                )}
                {pessoa.valorTotal > 0 && (
                  <span className="text-[10px] font-medium text-emerald-600">
                    {formatCurrencyCompact(pessoa.valorTotal)}
                  </span>
                )}
              </div>
            </div>
            <ChevronRight className={cn('h-4 w-4 text-slate-300 shrink-0 transition-transform', 
              selectedId === pessoa.id && 'text-violet-500 rotate-90')} />
          </button>
        );
      })}
    </div>
  );
}

// Quick Stats compactos
function QuickStats({ stats, healthStats, filtroAssociados, setFiltroAssociados }: { 
  stats: any; 
  healthStats: any;
  filtroAssociados: boolean | undefined;
  setFiltroAssociados: (v: boolean | undefined) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <button 
        onClick={() => setFiltroAssociados(undefined)}
        className={cn(
          'p-3 rounded-lg text-center transition-all',
          filtroAssociados === undefined 
            ? 'bg-violet-100 ring-2 ring-violet-500' 
            : 'bg-muted/50 hover:bg-muted'
        )}
      >
        <span className="text-lg">👥</span>
        <p className="text-lg font-bold">{stats?.total || 0}</p>
        <p className="text-[10px] text-muted-foreground">Total</p>
      </button>
      
      <button 
        onClick={() => setFiltroAssociados(filtroAssociados === true ? undefined : true)}
        className={cn(
          'p-3 rounded-lg text-center transition-all',
          filtroAssociados === true 
            ? 'bg-violet-100 ring-2 ring-violet-500' 
            : 'bg-muted/50 hover:bg-muted'
        )}
      >
        <span className="text-lg">🤝</span>
        <p className="text-lg font-bold text-violet-600">{stats?.associados || 0}</p>
        <p className="text-[10px] text-muted-foreground">Associados</p>
      </button>
      
      <button 
        onClick={() => setFiltroAssociados(filtroAssociados === false ? undefined : false)}
        className={cn(
          'p-3 rounded-lg text-center transition-all',
          filtroAssociados === false 
            ? 'bg-slate-200 ring-2 ring-slate-500' 
            : 'bg-muted/50 hover:bg-muted'
        )}
      >
        <span className="text-lg">👤</span>
        <p className="text-lg font-bold text-slate-600">{stats?.naoAssociados || 0}</p>
        <p className="text-[10px] text-muted-foreground">Não Assoc.</p>
      </button>
    </div>
  );
}

// Saúde dos Dados compacta
function DataHealthCompact({ healthStats }: { healthStats: any }) {
  if (!healthStats) return null;
  
  const items = [
    { label: 'CPF', value: healthStats.percentualCpf, icon: <FileText className="h-3 w-3" /> },
    { label: 'Email', value: healthStats.percentualEmail, icon: <Mail className="h-3 w-3" /> },
    { label: 'Tel.', value: healthStats.percentualTelefone, icon: <Phone className="h-3 w-3" /> },
    { label: 'End.', value: healthStats.percentualEndereco, icon: <MapPin className="h-3 w-3" /> },
  ];

  return (
    <div className="p-3 rounded-lg bg-slate-50 border">
      <p className="text-xs font-medium text-muted-foreground mb-2">📊 Saúde dos Dados</p>
      <div className="grid grid-cols-4 gap-2">
        {items.map(item => (
          <div key={item.label} className="text-center">
            <div className={cn(
              'text-sm font-bold',
              item.value > 50 ? 'text-emerald-600' : 'text-rose-500'
            )}>
              {item.value}%
            </div>
            <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-0.5">
              {item.icon} {item.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// Estado vazio quando nenhuma pessoa está selecionada
function EmptySelection({ onNewPessoa }: { onNewPessoa: () => void }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-8">
      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center mb-6">
        <Users className="h-12 w-12 text-violet-500" />
      </div>
      <h3 className="text-xl font-semibold text-slate-800 mb-2">Selecione uma pessoa</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        Clique em uma pessoa na lista ao lado para ver seus detalhes, editar informações ou gerenciar o vínculo de associado.
      </p>
      <Button onClick={onNewPessoa} className="bg-violet-600 hover:bg-violet-700">
        <Plus className="h-4 w-4 mr-2" />
        Nova Pessoa
      </Button>
    </div>
  );
}

// Componente Principal
export default function Pessoas() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [filtroAssociados, setFiltroAssociados] = useState<boolean | undefined>(undefined);
  const [selectedPessoaId, setSelectedPessoaId] = useState<string | null>(null);
  const [showNovaModal, setShowNovaModal] = useState(false);
  const [showMobileDetail, setShowMobileDetail] = useState(false);

  const { data, isLoading, isError, error, refetch } = trpc.pessoas.list.useQuery({
    search: search || undefined,
    apenasAssociados: filtroAssociados,
    page,
    limit: 20,
  });

  const { data: stats } = trpc.pessoas.stats.useQuery();
  const { data: healthStats } = trpc.pessoas.healthStats.useQuery();
  const { data: inconsistencias } = trpc.pessoas.inconsistencias.useQuery();

  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Cadastro de Pessoas" description="Gerencie doadores, associados e membros" icon="👥" />
        <QueryError error={error} onRetry={() => refetch()} />
      </div>
    );
  }

  const pessoas = data?.pessoas || [];
  const totalPages = data?.pages || 1;

  const handleSelectPessoa = (pessoa: any) => {
    setSelectedPessoaId(pessoa.id);
    // No mobile, show as overlay
    if (window.innerWidth < 1024) {
      setShowMobileDetail(true);
    }
  };

  const handleNewPessoaSuccess = (pessoaId: string) => {
    setShowNovaModal(false);
    setSelectedPessoaId(pessoaId);
  };

  const handleCloseMobileDetail = () => {
    setShowMobileDetail(false);
    setSelectedPessoaId(null);
  };

  // Alertas críticos
  const alertasCriticos = healthStats?.alertas?.filter((a: any) => a.tipo === 'critico') || [];

  return (
    <div className="h-[calc(100vh-theme(spacing.16)-theme(spacing.8))] lg:h-[calc(100vh-theme(spacing.8))] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-4 shrink-0">
        <PageHeader
          title="Cadastro de Pessoas"
          description="Gerencie doadores, associados e membros da instituição"
          icon={<span className="text-3xl">👥</span>}
        />
        <Button onClick={() => setShowNovaModal(true)} className="bg-violet-600 hover:bg-violet-700 gap-2">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Nova Pessoa</span>
        </Button>
      </div>

      {/* Alertas de Emergência */}
      {alertasCriticos.length > 0 && (
        <div className="mb-4 shrink-0">
          {alertasCriticos.slice(0, 1).map((alerta: any, idx: number) => (
            <GlassCard key={idx} className="border-red-200 bg-gradient-to-r from-red-50 to-rose-50">
              <div className="flex items-center gap-3 p-3">
                <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-red-800 text-sm">{alerta.titulo}</span>
                  <span className="text-red-600 text-xs ml-2 hidden sm:inline">{alerta.descricao}</span>
                </div>
                <Badge className="bg-red-600 text-white shrink-0">Crítico</Badge>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Card de Inconsistências */}
      {(inconsistencias?.stats?.titulosSemPessoa || 0) > 0 && (
        <Card className="mb-4 shrink-0 border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
              <div className="flex-1">
                <span className="font-medium text-amber-800 text-sm">
                  {inconsistencias?.stats?.titulosSemPessoa} contribuições sem pessoa vinculada
                </span>
              </div>
              <Button size="sm" className="bg-amber-600 hover:bg-amber-700">Resolver</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Master-Detail Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">
        {/* Lista (Master) */}
        <Card className="lg:col-span-5 xl:col-span-4 flex flex-col overflow-hidden">
          <CardHeader className="py-3 px-4 shrink-0 border-b">
            <div className="space-y-3">
              {/* Busca */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <Input
                  placeholder="Buscar por nome ou CPF/CNPJ..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="pl-10 h-9"
                  aria-label="Buscar pessoas por nome ou documento"
                />
                {search && (
                  <button 
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label="Limpar busca"
                    type="button"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Stats rápidos */}
              <QuickStats 
                stats={stats} 
                healthStats={healthStats} 
                filtroAssociados={filtroAssociados} 
                setFiltroAssociados={(v) => { setFiltroAssociados(v); setPage(1); }} 
              />

              {/* Saúde dos dados */}
              <DataHealthCompact healthStats={healthStats} />
            </div>
          </CardHeader>
          
          <CardContent className="flex-1 overflow-y-auto p-2">
            <PessoasList 
              pessoas={pessoas} 
              selectedId={selectedPessoaId} 
              onSelect={handleSelectPessoa}
              isLoading={isLoading}
            />
          </CardContent>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="p-3 border-t shrink-0">
              <Pagination
                page={page}
                totalPages={totalPages}
                totalItems={data?.total || 0}
                itemsShown={pessoas.length}
                onPageChange={setPage}
                itemLabel="pessoas"
              />
            </div>
          )}
        </Card>

        {/* Detalhes (Detail) - Desktop */}
        <Card className="hidden lg:flex lg:col-span-7 xl:col-span-8 flex-col overflow-hidden">
          {selectedPessoaId ? (
            <div className="h-full overflow-hidden">
              <PessoaDetail 
                pessoaId={selectedPessoaId} 
                onClose={() => setSelectedPessoaId(null)}
                onUpdated={() => {}}
              />
            </div>
          ) : (
            <EmptySelection onNewPessoa={() => setShowNovaModal(true)} />
          )}
        </Card>
      </div>

      {/* Detail Mobile Overlay */}
      {showMobileDetail && selectedPessoaId && (
        <div className="lg:hidden">
          <PessoaDetail 
            pessoaId={selectedPessoaId} 
            onClose={handleCloseMobileDetail}
            onUpdated={() => {}}
          />
        </div>
      )}

      {/* Modal Nova Pessoa - Wizard Full-Screen */}
      <PessoaWizard 
        open={showNovaModal} 
        onOpenChange={setShowNovaModal}
        onSuccess={handleNewPessoaSuccess}
      />
    </div>
  );
}
