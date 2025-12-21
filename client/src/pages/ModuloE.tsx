import { useState, useEffect, useMemo, useCallback } from 'react';
import { Layers, Plus, Download, Search, X, ArrowUpDown, FileBarChart } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Pagination } from '@/components/ui/page-header';
import { 
  ModuloEList, 
  ModuloEDetail, 
  EmptySelection,
  QuickStats, 
  HealthStats,
  CentroCustoForm, 
  ProjetoForm, 
  FundoForm,
  AlocacaoForm,
  ConsumoForm,
  AprovacaoGrid,
  RelatoriosTab
} from '@/components/modulo-e';
import type { EntityType, UnifiedItem } from '@/components/modulo-e/ModuloEList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';

type ViewMode = 'list' | 'movimentacoes' | 'relatorios';

export default function ModuloE() {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<EntityType | null>(null);
  const [selectedItem, setSelectedItem] = useState<UnifiedItem | null>(null);
  const [showMobileDetail, setShowMobileDetail] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  
  // Form states
  const [showNewCentroForm, setShowNewCentroForm] = useState(false);
  const [showNewProjetoForm, setShowNewProjetoForm] = useState(false);
  const [showNewFundoForm, setShowNewFundoForm] = useState(false);
  const [movSubtab, setMovSubtab] = useState<'alocar' | 'consumir' | 'aprovar'>('alocar');

  // Fetch all data
  const { data: centros = [], isLoading: loadingCentros } = trpc.centroCusto.list.useQuery({
    busca: searchTerm || undefined,
  });
  const { data: projetos = [], isLoading: loadingProjetos } = trpc.projeto.list.useQuery({
    busca: searchTerm || undefined,
  });
  const { data: fundos = [], isLoading: loadingFundos } = trpc.fundo.list.useQuery({
    busca: searchTerm || undefined,
  });
  const { data: pendentes } = trpc.fundoConsumo.pendentes.useQuery();
  const pendentesCount = pendentes?.length || 0;

  const isLoading = loadingCentros || loadingProjetos || loadingFundos;

  // Combine and filter items
  const unifiedItems = useMemo(() => {
    const items: UnifiedItem[] = [];
    
    if (!typeFilter || typeFilter === 'centro') {
      centros.forEach(c => items.push({
        id: c.id,
        tipo: 'centro',
        codigo: c.codigo,
        nome: c.nome,
        ativo: c.ativo,
        projetosCount: c.projetosCount,
      }));
    }
    
    if (!typeFilter || typeFilter === 'projeto') {
      projetos.forEach(p => items.push({
        id: p.id,
        tipo: 'projeto',
        codigo: p.codigo,
        nome: p.nome,
        ativo: p.status !== 'cancelado',
        status: p.status,
        saldo: p.orcamentoPrevisto,
        parceriaMrosc: p.parceriaMrosc,
      }));
    }
    
    if (!typeFilter || typeFilter === 'fundo') {
      fundos.forEach(f => items.push({
        id: f.id,
        tipo: 'fundo',
        codigo: f.codigo,
        nome: f.nome,
        ativo: f.ativo,
        status: f.tipo,
        saldo: f.saldoAtual,
      }));
    }
    
    return items.sort((a, b) => a.codigo.localeCompare(b.codigo));
  }, [centros, projetos, fundos, typeFilter]);

  // Stats
  const stats = useMemo(() => {
    const ativosCC = centros.filter(c => c.ativo).length;
    const ativosPJ = projetos.filter(p => p.status !== 'cancelado').length;
    const ativosFD = fundos.filter(f => f.ativo).length;
    const total = centros.length + projetos.length + fundos.length;
    const totalAtivos = ativosCC + ativosPJ + ativosFD;
    
    const fundosComSaldo = fundos.filter(f => {
      const saldo = typeof f.saldoAtual === 'string' ? parseFloat(f.saldoAtual) : f.saldoAtual;
      return saldo && saldo > 0;
    }).length;
    
    const projetosEmAndamento = projetos.filter(p => p.status === 'em_andamento').length;
    
    return {
      centrosCount: centros.length,
      projetosCount: projetos.length,
      fundosCount: fundos.length,
      ativosPercent: total > 0 ? Math.round((totalAtivos / total) * 100) : 0,
      comSaldoPercent: fundos.length > 0 ? Math.round((fundosComSaldo / fundos.length) * 100) : 0,
      projetosEmAndamento,
      pendentesAprovacao: pendentesCount,
    };
  }, [centros, projetos, fundos, pendentesCount]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      if (e.key === '/' && !isInput) {
        e.preventDefault();
        document.getElementById('modulo-e-search')?.focus();
      }
      if (e.key === 'Escape') {
        setSelectedItem(null);
        setShowMobileDetail(false);
        setShowNewCentroForm(false);
        setShowNewProjetoForm(false);
        setShowNewFundoForm(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSelectItem = useCallback((item: UnifiedItem) => {
    setSelectedItem(item);
    if (window.innerWidth < 1024) {
      setShowMobileDetail(true);
    }
  }, []);

  const handleNewFromEmpty = useCallback((type: EntityType) => {
    if (type === 'centro') setShowNewCentroForm(true);
    else if (type === 'projeto') setShowNewProjetoForm(true);
    else setShowNewFundoForm(true);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedItem(null);
    setShowMobileDetail(false);
  }, []);

  const handleUpdated = useCallback(() => {
    // Refetch happens automatically via invalidation in mutations
  }, []);

  // Render list view (master-detail)
  if (viewMode === 'list') {
    return (
      <div className="h-[calc(100vh-theme(spacing.16)-theme(spacing.8))] lg:h-[calc(100vh-theme(spacing.8))] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-4 shrink-0">
          <PageHeader
            title="Projetos, Centros e Fundos"
            description="Controle de recursos por área, projeto e fundo"
            icon={<Layers className="h-8 w-8 text-primary" />}
          />
          <div className="flex items-center gap-2">
            <Button onClick={() => setShowNewCentroForm(true)} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Centro</span>
            </Button>
            <Button onClick={() => setShowNewProjetoForm(true)} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Projeto</span>
            </Button>
            <Button onClick={() => setShowNewFundoForm(true)} className="bg-violet-600 hover:bg-violet-700" size="sm">
              <Plus className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Fundo</span>
            </Button>
          </div>
        </div>

        {/* View Mode Tabs */}
        <div className="mb-4 shrink-0 flex items-center gap-2">
          <Button 
            variant={viewMode === 'list' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <Layers className="h-4 w-4 mr-1.5" />
            Cadastros
          </Button>
          <Button 
            variant={viewMode === 'movimentacoes' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setViewMode('movimentacoes')}
            className="relative"
          >
            <ArrowUpDown className="h-4 w-4 mr-1.5" />
            Movimentações
            {pendentesCount > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs">
                {pendentesCount}
              </Badge>
            )}
          </Button>
          <Button 
            variant={viewMode === 'relatorios' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setViewMode('relatorios')}
          >
            <FileBarChart className="h-4 w-4 mr-1.5" />
            Relatórios
          </Button>
          <div className="flex-1" />
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-1.5" />
            Exportar
          </Button>
        </div>

        {/* Master-Detail Layout */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">
          {/* Lista (Master) */}
          <Card className="lg:col-span-5 xl:col-span-4 flex flex-col overflow-hidden">
            <CardHeader className="py-3 px-4 shrink-0 border-b">
              <div className="space-y-3">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="modulo-e-search"
                    placeholder="Buscar por código ou nome..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-9"
                    aria-label="Buscar centros, projetos ou fundos"
                  />
                  {searchTerm && (
                    <button 
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label="Limpar busca"
                      type="button"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Quick Stats */}
                <QuickStats 
                  centrosCount={stats.centrosCount}
                  projetosCount={stats.projetosCount}
                  fundosCount={stats.fundosCount}
                  activeFilter={typeFilter}
                  onFilterChange={setTypeFilter}
                />

                {/* Health Stats */}
                <HealthStats 
                  ativosPercent={stats.ativosPercent}
                  comSaldoPercent={stats.comSaldoPercent}
                  projetosEmAndamento={stats.projetosEmAndamento}
                  pendentesAprovacao={stats.pendentesAprovacao}
                />
              </div>
            </CardHeader>
            
            <CardContent className="flex-1 overflow-y-auto p-2">
              <ModuloEList 
                items={unifiedItems} 
                selectedId={selectedItem?.id || null} 
                onSelect={handleSelectItem}
                isLoading={isLoading}
              />
            </CardContent>

            {/* Pagination hint */}
            {unifiedItems.length > 0 && (
              <div className="p-3 border-t shrink-0 text-center">
                <p className="text-xs text-muted-foreground">
                  Mostrando {unifiedItems.length} itens
                </p>
              </div>
            )}
          </Card>

          {/* Detail (Desktop) */}
          <Card className="hidden lg:flex lg:col-span-7 xl:col-span-8 flex-col overflow-hidden">
            {selectedItem ? (
              <ModuloEDetail 
                item={selectedItem} 
                onClose={handleCloseDetail}
                onUpdated={handleUpdated}
              />
            ) : (
              <EmptySelection onNew={handleNewFromEmpty} />
            )}
          </Card>
        </div>

        {/* Mobile Detail Overlay */}
        {showMobileDetail && selectedItem && (
          <div className="lg:hidden">
            <ModuloEDetail 
              item={selectedItem} 
              onClose={handleCloseDetail}
              onUpdated={handleUpdated}
            />
          </div>
        )}

        {/* Forms */}
        <CentroCustoForm 
          open={showNewCentroForm} 
          onClose={() => setShowNewCentroForm(false)} 
          editingItem={null} 
        />
        <ProjetoForm 
          open={showNewProjetoForm} 
          onClose={() => setShowNewProjetoForm(false)} 
          editingItem={null} 
        />
        <FundoForm 
          open={showNewFundoForm} 
          onClose={() => setShowNewFundoForm(false)} 
          editingItem={null} 
        />

        {/* Keyboard shortcuts hint */}
        <div className="text-xs text-muted-foreground text-center mt-4 opacity-60 shrink-0">
          Atalhos: <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">/</kbd> buscar · 
          <kbd className="px-1 py-0.5 bg-muted rounded text-[10px] ml-2">Esc</kbd> fechar
        </div>
      </div>
    );
  }

  // Movimentações view
  if (viewMode === 'movimentacoes') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <PageHeader
            title="Movimentações"
            description="Alocação e consumo de recursos"
            icon={<ArrowUpDown className="h-8 w-8 text-primary" />}
          />
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setViewMode('list')}>
              <Layers className="h-4 w-4 mr-1.5" />
              Cadastros
            </Button>
            <Button variant="outline" size="sm" onClick={() => setViewMode('relatorios')}>
              <FileBarChart className="h-4 w-4 mr-1.5" />
              Relatórios
            </Button>
          </div>
        </div>

        <Tabs value={movSubtab} onValueChange={(v) => setMovSubtab(v as any)}>
          <TabsList>
            <TabsTrigger value="alocar">Alocar</TabsTrigger>
            <TabsTrigger value="consumir">Consumir</TabsTrigger>
            <TabsTrigger value="aprovar" className="flex items-center gap-2">
              Aprovações
              {pendentesCount > 0 && (
                <Badge variant="destructive" className="h-5 px-1.5 text-xs">
                  {pendentesCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="alocar" className="mt-4">
            <AlocacaoForm />
          </TabsContent>

          <TabsContent value="consumir" className="mt-4">
            <ConsumoForm />
          </TabsContent>

          <TabsContent value="aprovar" className="mt-4">
            <AprovacaoGrid />
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // Relatórios view
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <PageHeader
          title="Relatórios"
          description="Análises e demonstrativos"
          icon={<FileBarChart className="h-8 w-8 text-primary" />}
        />
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setViewMode('list')}>
            <Layers className="h-4 w-4 mr-1.5" />
            Cadastros
          </Button>
          <Button variant="outline" size="sm" onClick={() => setViewMode('movimentacoes')}>
            <ArrowUpDown className="h-4 w-4 mr-1.5" />
            Movimentações
          </Button>
        </div>
      </div>

      <RelatoriosTab />
    </div>
  );
}
