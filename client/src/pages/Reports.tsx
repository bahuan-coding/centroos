import { useState } from 'react';
import { FileBarChart, FileCheck, FileSpreadsheet, Download, Loader2, TrendingUp, Building2, Shield, Terminal, Copy, ChevronRight, Settings, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { formatPeriod } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/ui/page-header';
import { ReportWizard, type ReportOptions } from '@/components/reports/ReportWizard';

type Category = 'contabil' | 'fiscal' | 'auditoria';

interface Report {
  id: string;
  title: string;
  description: string;
  icon: any;
  category: Category;
  color: string;
  gradient: string;
  includes: string[];
  isCli?: boolean;
  hasWizard?: boolean;
}

const reports: Report[] = [
  {
    id: 'balancete',
    title: 'Balancete Mensal',
    description: 'Saldos de todas as contas contábeis no período',
    icon: FileSpreadsheet,
    category: 'contabil',
    color: 'text-emerald-600',
    gradient: 'from-emerald-500 to-teal-600',
    includes: ['Saldos iniciais e finais', 'Movimentação débito/crédito', 'Todas as contas do plano', 'Totalizadores por grupo'],
  },
  {
    id: 'dre',
    title: 'Demonstração do Resultado (DRE)',
    description: 'Resultado do exercício com receitas e despesas agrupadas',
    icon: TrendingUp,
    category: 'contabil',
    color: 'text-orange-600',
    gradient: 'from-orange-500 to-amber-600',
    includes: ['Receitas por natureza', 'Despesas detalhadas', 'Resultado do período', 'Comparativo com anterior'],
  },
  {
    id: 'balanco_patrimonial',
    title: 'Balanço Patrimonial',
    description: 'Demonstrativo de ativos, passivos e patrimônio social',
    icon: Building2,
    category: 'contabil',
    color: 'text-indigo-600',
    gradient: 'from-indigo-500 to-violet-600',
    includes: ['Ativo circulante e não circulante', 'Passivo e obrigações', 'Patrimônio social', 'Notas explicativas'],
  },
  {
    id: 'financial_monthly',
    title: 'Relatório Financeiro Mensal',
    description: 'Demonstrativo completo de receitas, despesas e balanço',
    icon: FileBarChart,
    category: 'fiscal',
    color: 'text-blue-600',
    gradient: 'from-blue-500 to-cyan-600',
    includes: ['Capa profissional', 'KPIs e Visão Geral', 'Demonstrativo de Receitas', 'Demonstrativo de Despesas', 'Resultado e Notas'],
    hasWizard: true,
  },
  {
    id: 'nfc_compliance',
    title: 'Nota Fiscal Cidadã (NFC)',
    description: 'Demonstrativo de aplicação de recursos conforme regras NFC',
    icon: FileCheck,
    category: 'fiscal',
    color: 'text-purple-600',
    gradient: 'from-purple-500 to-fuchsia-600',
    includes: ['70% aplicação em projetos', '30% custeio administrativo', 'Detalhamento de gastos', 'Conformidade SEFAZ'],
  },
  {
    id: 'audit_contabil',
    title: 'Auditoria Contábil',
    description: 'Validação completa de integridade e conformidade',
    icon: Shield,
    category: 'auditoria',
    color: 'text-rose-600',
    gradient: 'from-rose-500 to-pink-600',
    includes: ['Verificação rawdata vs DB', 'Detecção de duplicatas', 'Conformidade ITG 2002', 'Validação partidas dobradas'],
    isCli: true,
  },
];

const categories = [
  { id: 'all' as const, label: 'Todos', icon: '📊', count: reports.length },
  { id: 'contabil' as const, label: 'Contábeis', icon: '📒', count: reports.filter(r => r.category === 'contabil').length },
  { id: 'fiscal' as const, label: 'Fiscais', icon: '📋', count: reports.filter(r => r.category === 'fiscal').length },
  { id: 'auditoria' as const, label: 'Auditoria', icon: '🛡️', count: reports.filter(r => r.category === 'auditoria').length },
];

function downloadPDF(base64: string, filename: string) {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Category Filter Component
function CategoryFilter({ selected, onSelect }: { selected: 'all' | Category; onSelect: (cat: 'all' | Category) => void }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {categories.map(cat => (
        <button
          key={cat.id}
          onClick={() => onSelect(cat.id)}
          className={cn(
            'p-3 rounded-xl text-center transition-all duration-200',
            selected === cat.id
              ? 'bg-gradient-to-br from-violet-100 to-indigo-100 ring-2 ring-violet-500 shadow-md'
              : 'bg-slate-50 hover:bg-slate-100 hover:shadow-sm'
          )}
        >
          <span className="text-xl block">{cat.icon}</span>
          <p className="text-lg font-bold mt-1">{cat.count}</p>
          <p className="text-[10px] text-muted-foreground font-medium">{cat.label}</p>
        </button>
      ))}
    </div>
  );
}

// Report Card Component
function ReportCard({ report, isSelected, onSelect }: { report: Report; isSelected: boolean; onSelect: () => void }) {
  const Icon = report.icon;
  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full p-4 rounded-xl text-left transition-all duration-200 group',
        'hover:shadow-lg hover:-translate-y-0.5',
        isSelected
          ? 'bg-gradient-to-br from-violet-50 to-indigo-50 ring-2 ring-violet-500 shadow-lg'
          : 'bg-white border border-slate-200 hover:border-violet-300'
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn('p-2.5 rounded-lg bg-gradient-to-br text-white shrink-0', report.gradient)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm truncate">{report.title}</h3>
            {report.isCli && (
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 shrink-0">CLI</Badge>
            )}
            {report.hasWizard && (
              <Badge className="text-[9px] px-1.5 py-0 shrink-0 bg-blue-100 text-blue-700 border-0">Premium</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{report.description}</p>
        </div>
        <ChevronRight className={cn(
          'h-4 w-4 text-slate-300 shrink-0 transition-all',
          isSelected && 'text-violet-500 rotate-90',
          'group-hover:text-violet-400'
        )} />
      </div>
    </button>
  );
}

// Empty Preview Component
function EmptyPreview() {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-8">
      <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-violet-100 via-indigo-100 to-purple-100 flex items-center justify-center mb-6 shadow-lg">
        <FileBarChart className="h-14 w-14 text-violet-500" />
      </div>
      <h3 className="text-xl font-semibold text-slate-800 mb-2">Selecione um Relatório</h3>
      <p className="text-sm text-muted-foreground max-w-xs">
        Escolha um relatório na lista ao lado para ver detalhes, configurar parâmetros e gerar o PDF.
      </p>
    </div>
  );
}

// Report Preview Component
function ReportPreview({ 
  report, 
  periods, 
  periodId, 
  setPeriodId,
  onGenerate,
  onOpenWizard,
  isPending 
}: { 
  report: Report;
  periods: any[];
  periodId: string;
  setPeriodId: (id: string) => void;
  onGenerate: () => void;
  onOpenWizard?: () => void;
  isPending: boolean;
}) {
  const Icon = report.icon;
  const categoryLabel = categories.find(c => c.id === report.category)?.label || '';

  return (
    <div className="h-full flex flex-col">
      {/* Header com gradiente */}
      <div className={cn('p-6 bg-gradient-to-br text-white rounded-t-xl', report.gradient)}>
        <div className="flex items-start gap-4">
          <div className="p-4 rounded-xl bg-white/20 backdrop-blur-sm">
            <Icon className="h-10 w-10" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge className="bg-white/20 text-white border-0">{categoryLabel}</Badge>
              {report.hasWizard && (
                <Badge className="bg-white/30 text-white border-0">Premium</Badge>
              )}
            </div>
            <h2 className="text-2xl font-bold">{report.title}</h2>
            <p className="text-white/80 mt-1">{report.description}</p>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        {/* O que inclui */}
        <div>
          <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            O que este relatório inclui
          </h4>
          <ul className="space-y-2">
            {report.includes.map((item, idx) => (
              <li key={idx} className="flex items-center gap-2 text-sm text-slate-600">
                <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Seletor de período (se não for CLI) */}
        {!report.isCli && (
          <div className="bg-slate-50 rounded-xl p-4">
            <Label className="text-sm font-semibold text-slate-700 mb-2 block">Período do Relatório</Label>
            <Select value={periodId} onValueChange={setPeriodId}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Selecione o período" />
              </SelectTrigger>
              <SelectContent>
                {periods.map((p) => (
                  <SelectItem key={p.id} value={p.id.toString()}>
                    {formatPeriod(p.month, p.year)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Botões de ação */}
      <div className="p-6 border-t bg-slate-50/50 space-y-2">
        {report.hasWizard && onOpenWizard ? (
          <>
            {/* Botão principal: Gerar rápido */}
            <Button 
              onClick={onGenerate} 
              disabled={isPending || !periodId}
              className={cn('w-full h-12 text-base font-semibold bg-gradient-to-r shadow-lg hover:shadow-xl transition-all', report.gradient)}
            >
              {isPending ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <Download className="mr-2 h-5 w-5" />
              )}
              Gerar PDF Rápido
            </Button>
            
            {/* Botão secundário: Wizard avançado */}
            <Button 
              onClick={onOpenWizard}
              variant="outline"
              disabled={isPending}
              className="w-full gap-2"
            >
              <Settings className="h-4 w-4" />
              Configurar Avançado
            </Button>
          </>
        ) : (
          <Button 
            onClick={onGenerate} 
            disabled={isPending || (!report.isCli && !periodId)}
            className={cn('w-full h-12 text-base font-semibold bg-gradient-to-r shadow-lg hover:shadow-xl transition-all', report.gradient)}
          >
            {isPending ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <Download className="mr-2 h-5 w-5" />
            )}
            {report.isCli ? 'Ver Comandos CLI' : 'Gerar PDF'}
          </Button>
        )}
      </div>
    </div>
  );
}

// Main Component
export default function Reports() {
  const [selectedCategory, setSelectedCategory] = useState<'all' | Category>('all');
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [periodId, setPeriodId] = useState<string>('');
  const [auditDialogOpen, setAuditDialogOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);

  const { data: periods = [] } = trpc.periods.list.useQuery();
  const financialMutation = trpc.reports.generateFinancial.useMutation();
  const financialAdvancedMutation = trpc.reports.generateFinancialAdvanced.useMutation();
  const nfcMutation = trpc.reports.generateNfc.useMutation();
  const balanceteMutation = trpc.reports.generateBalancete.useMutation();
  const dreMutation = trpc.reports.generateDRE.useMutation();
  const balancoMutation = trpc.reports.generateBalancoPatrimonial.useMutation();

  const isPending = financialMutation.isPending || financialAdvancedMutation.isPending || nfcMutation.isPending || balanceteMutation.isPending || dreMutation.isPending || balancoMutation.isPending;

  const filteredReports = selectedCategory === 'all' 
    ? reports 
    : reports.filter(r => r.category === selectedCategory);

  const selectedReport = reports.find(r => r.id === selectedReportId);

  // Set default period when periods load
  if (periods.length > 0 && !periodId) {
    setPeriodId(periods[0].id.toString());
  }

  const copyCommand = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    toast.success('Comando copiado!');
  };

  const handleGenerate = async () => {
    if (!selectedReport) return;

    if (selectedReport.isCli) {
      setAuditDialogOpen(true);
      return;
    }

    if (!periodId) return;

    try {
      const pid = parseInt(periodId);
      const period = periods.find((p) => p.id === pid);
      const periodName = period ? formatPeriod(period.month, period.year).replace(/ /g, '_') : pid;

      let result;
      switch (selectedReport.id) {
        case 'financial_monthly':
          result = await financialMutation.mutateAsync(pid);
          downloadPDF(result.pdf, `relatorio_financeiro_${periodName}.pdf`);
          break;
        case 'nfc_compliance':
          result = await nfcMutation.mutateAsync(pid);
          downloadPDF(result.pdf, `relatorio_nfc_${periodName}.pdf`);
          break;
        case 'balancete':
          result = await balanceteMutation.mutateAsync(pid);
          downloadPDF(result.pdf, `balancete_${periodName}.pdf`);
          break;
        case 'dre':
          result = await dreMutation.mutateAsync(pid);
          downloadPDF(result.pdf, `dre_${periodName}.pdf`);
          break;
        case 'balanco_patrimonial':
          result = await balancoMutation.mutateAsync(pid);
          downloadPDF(result.pdf, `balanco_patrimonial_${periodName}.pdf`);
          break;
      }

      toast.success('Relatório gerado com sucesso!');
    } catch (error) {
      toast.error('Erro ao gerar relatório');
    }
  };

  const handleGenerateAdvanced = async (options: ReportOptions) => {
    try {
      const period = periods.find((p) => p.id === options.periodId);
      const periodName = period ? formatPeriod(period.month, period.year).replace(/ /g, '_') : options.periodId;
      const suffix = options.isDraft ? '_rascunho' : '';

      const result = await financialAdvancedMutation.mutateAsync(options);
      downloadPDF(result.pdf, `relatorio_financeiro_${periodName}${suffix}.pdf`);
      
      toast.success('Relatório gerado com sucesso!');
    } catch (error) {
      toast.error('Erro ao gerar relatório');
    }
  };

  return (
    <div className="h-[calc(100vh-theme(spacing.16)-theme(spacing.8))] lg:h-[calc(100vh-theme(spacing.8))] flex flex-col">
      {/* Header */}
      <div className="mb-4 shrink-0">
        <PageHeader
          title="Relatórios"
          description="Gere relatórios contábeis, fiscais e de auditoria em PDF"
          icon={<span className="text-3xl">📊</span>}
        />
      </div>

      {/* Category Filter */}
      <div className="mb-4 shrink-0">
        <CategoryFilter selected={selectedCategory} onSelect={setSelectedCategory} />
      </div>

      {/* Master-Detail Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">
        {/* Lista de Relatórios */}
        <Card className="lg:col-span-5 xl:col-span-4 flex flex-col overflow-hidden">
          <CardContent className="flex-1 overflow-y-auto p-3 space-y-2">
            {filteredReports.map(report => (
              <ReportCard
                key={report.id}
                report={report}
                isSelected={selectedReportId === report.id}
                onSelect={() => setSelectedReportId(report.id)}
              />
            ))}
          </CardContent>
        </Card>

        {/* Preview Panel */}
        <Card className="hidden lg:flex lg:col-span-7 xl:col-span-8 flex-col overflow-hidden">
          {selectedReport ? (
            <ReportPreview
              report={selectedReport}
              periods={periods}
              periodId={periodId}
              setPeriodId={setPeriodId}
              onGenerate={handleGenerate}
              onOpenWizard={selectedReport.hasWizard ? () => setWizardOpen(true) : undefined}
              isPending={isPending}
            />
          ) : (
            <EmptyPreview />
          )}
        </Card>
      </div>

      {/* Mobile: Show preview as modal when report selected */}
      {selectedReport && (
        <Dialog open={!!selectedReportId} onOpenChange={(open) => !open && setSelectedReportId(null)}>
          <DialogContent className="lg:hidden max-w-lg p-0 overflow-hidden">
            <div className="max-h-[80vh] overflow-y-auto">
              <ReportPreview
                report={selectedReport}
                periods={periods}
                periodId={periodId}
                setPeriodId={setPeriodId}
                onGenerate={handleGenerate}
                onOpenWizard={selectedReport.hasWizard ? () => setWizardOpen(true) : undefined}
                isPending={isPending}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Wizard de Relatório Financeiro */}
      <ReportWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        periods={periods}
        onGenerate={handleGenerateAdvanced}
        isPending={financialAdvancedMutation.isPending}
        reportTitle="Relatório Financeiro Mensal"
      />

      {/* Dialog de Auditoria Contábil (CLI) */}
      <Dialog open={auditDialogOpen} onOpenChange={setAuditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 text-white">
                <Shield className="h-4 w-4" />
              </div>
              Auditoria Contábil
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              A auditoria contábil executa validações completas comparando rawdata com o banco de dados.
              Execute os comandos abaixo no terminal:
            </p>
            
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Auditoria completa (todos os meses)</Label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 bg-slate-900 text-emerald-400 px-3 py-2 rounded-lg text-sm font-mono">
                    npx tsx scripts/audit-runner.ts --ano 2025 --todos
                  </code>
                  <Button size="icon" variant="outline" onClick={() => copyCommand('npx tsx scripts/audit-runner.ts --ano 2025 --todos')}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Auditoria de um mês específico</Label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 bg-slate-900 text-emerald-400 px-3 py-2 rounded-lg text-sm font-mono">
                    npx tsx scripts/audit-runner.ts --ano 2025 --mes novembro
                  </code>
                  <Button size="icon" variant="outline" onClick={() => copyCommand('npx tsx scripts/audit-runner.ts --ano 2025 --mes novembro')}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Gerar relatório em Markdown</Label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 bg-slate-900 text-emerald-400 px-3 py-2 rounded-lg text-sm font-mono">
                    npx tsx scripts/audit-runner.ts --ano 2025 --todos --formato md --output audit.md
                  </code>
                  <Button size="icon" variant="outline" onClick={() => copyCommand('npx tsx scripts/audit-runner.ts --ano 2025 --todos --formato md --output audit.md')}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 text-sm">
              <div className="flex items-center gap-2 font-semibold mb-3">
                <Terminal className="h-4 w-4" />
                Módulos disponíveis
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2"><span className="text-violet-500">●</span> <strong>pessoas:</strong> Duplicatas, CPF</div>
                <div className="flex items-center gap-2"><span className="text-emerald-500">●</span> <strong>doacoes:</strong> Rawdata, títulos</div>
                <div className="flex items-center gap-2"><span className="text-blue-500">●</span> <strong>contabil:</strong> Partidas dobradas</div>
                <div className="flex items-center gap-2"><span className="text-orange-500">●</span> <strong>fiscal:</strong> ITG 2002, NFC</div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAuditDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
