import { useState, useEffect, useCallback } from 'react';
import { Layers, FolderKanban, Wallet, ArrowUpDown, FileBarChart, Plus, Download, Search } from 'lucide-react';
import { PageHeader, FilterBar } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { trpc } from '@/lib/trpc';
import { CentroCustoGrid, CentroCustoForm } from '@/components/modulo-e/CentroCusto';
import { ProjetoGrid, ProjetoForm, ProjetoConcluirDialog } from '@/components/modulo-e/Projeto';
import { FundoGrid, FundoForm } from '@/components/modulo-e/Fundo';
import { AlocacaoForm, ConsumoForm, AprovacaoGrid } from '@/components/modulo-e/Movimentacoes';
import { RelatoriosTab } from '@/components/modulo-e/Relatorios';

type TabValue = 'centros' | 'projetos' | 'fundos' | 'movimentacoes' | 'relatorios';

export default function ModuloE() {
  const [activeTab, setActiveTab] = useState<TabValue>('centros');
  const [searchTerm, setSearchTerm] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [concluirProjetoId, setConcluirProjetoId] = useState<string | null>(null);
  const [movSubtab, setMovSubtab] = useState<'alocar' | 'consumir' | 'aprovar'>('alocar');

  // Contagem de pendências
  const { data: pendentes } = trpc.fundoConsumo.pendentes.useQuery();
  const pendentesCount = pendentes?.length || 0;

  // Atalhos de teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      if (e.key === '/' && !isInput) {
        e.preventDefault();
        document.getElementById('modulo-e-search')?.focus();
      }
      if (e.key === 'n' && !isInput && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handleNew();
      }
      if (e.key === 'Escape') {
        setDrawerOpen(false);
        setEditingItem(null);
        setConcluirProjetoId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab]);

  const handleNew = useCallback(() => {
    setEditingItem(null);
    setDrawerOpen(true);
  }, []);

  const handleEdit = useCallback((item: any) => {
    setEditingItem(item);
    setDrawerOpen(true);
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setDrawerOpen(false);
    setEditingItem(null);
  }, []);

  const getNewButtonLabel = () => {
    switch (activeTab) {
      case 'centros': return 'Novo Centro de Custo';
      case 'projetos': return 'Novo Projeto';
      case 'fundos': return 'Novo Fundo';
      default: return null;
    }
  };

  const newButtonLabel = getNewButtonLabel();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projetos, Centros e Fundos"
        description="Controle de recursos por área, projeto e fundo — NBC TG 26, ITG 2002 e MROSC"
        icon={<Layers className="h-8 w-8 text-primary" />}
        actions={
          <div className="flex items-center gap-2">
            {newButtonLabel && activeTab !== 'movimentacoes' && activeTab !== 'relatorios' && (
              <Button onClick={handleNew} size="sm">
                <Plus className="mr-1.5 h-4 w-4" />
                {newButtonLabel}
              </Button>
            )}
            <Button variant="outline" size="sm">
              <Download className="mr-1.5 h-4 w-4" />
              Exportar
            </Button>
          </div>
        }
      />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="centros" className="flex items-center gap-2">
            <FolderKanban className="h-4 w-4" />
            <span className="hidden sm:inline">Centros de Custo</span>
            <span className="sm:hidden">Centros</span>
          </TabsTrigger>
          <TabsTrigger value="projetos" className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Projetos
          </TabsTrigger>
          <TabsTrigger value="fundos" className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            Fundos
          </TabsTrigger>
          <TabsTrigger value="movimentacoes" className="flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4" />
            <span className="hidden sm:inline">Movimentações</span>
            <span className="sm:hidden">Mov.</span>
            {pendentesCount > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs">
                {pendentesCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="relatorios" className="flex items-center gap-2">
            <FileBarChart className="h-4 w-4" />
            Relatórios
          </TabsTrigger>
        </TabsList>

        {/* Search bar for grid tabs */}
        {activeTab !== 'movimentacoes' && activeTab !== 'relatorios' && (
          <Card className="mt-4">
            <CardContent className="py-3">
              <FilterBar>
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="modulo-e-search"
                    placeholder="Buscar por código ou nome... (tecle / para focar)"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </FilterBar>
            </CardContent>
          </Card>
        )}

        {/* Tab: Centros de Custo */}
        <TabsContent value="centros" className="mt-4">
          <CentroCustoGrid
            searchTerm={searchTerm}
            onEdit={handleEdit}
          />
          <CentroCustoForm
            open={drawerOpen && activeTab === 'centros'}
            onClose={handleCloseDrawer}
            editingItem={editingItem}
          />
        </TabsContent>

        {/* Tab: Projetos */}
        <TabsContent value="projetos" className="mt-4">
          <ProjetoGrid
            searchTerm={searchTerm}
            onEdit={handleEdit}
            onConcluir={(id) => setConcluirProjetoId(id)}
          />
          <ProjetoForm
            open={drawerOpen && activeTab === 'projetos'}
            onClose={handleCloseDrawer}
            editingItem={editingItem}
          />
          <ProjetoConcluirDialog
            projetoId={concluirProjetoId}
            onClose={() => setConcluirProjetoId(null)}
          />
        </TabsContent>

        {/* Tab: Fundos */}
        <TabsContent value="fundos" className="mt-4">
          <FundoGrid
            searchTerm={searchTerm}
            onEdit={handleEdit}
          />
          <FundoForm
            open={drawerOpen && activeTab === 'fundos'}
            onClose={handleCloseDrawer}
            editingItem={editingItem}
          />
        </TabsContent>

        {/* Tab: Movimentações */}
        <TabsContent value="movimentacoes" className="mt-4">
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
        </TabsContent>

        {/* Tab: Relatórios */}
        <TabsContent value="relatorios" className="mt-4">
          <RelatoriosTab />
        </TabsContent>
      </Tabs>

      {/* Keyboard shortcuts hint */}
      <div className="text-xs text-muted-foreground text-center mt-4 opacity-60">
        Atalhos: <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">/</kbd> buscar · 
        <kbd className="px-1 py-0.5 bg-muted rounded text-[10px] ml-2">n</kbd> novo · 
        <kbd className="px-1 py-0.5 bg-muted rounded text-[10px] ml-2">Esc</kbd> fechar
      </div>
    </div>
  );
}





