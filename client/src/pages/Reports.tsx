import { useState } from 'react';
import { FileBarChart, FileCheck, FileSpreadsheet, Download, Loader2, TrendingUp, Building2, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader } from '@/components/ui/page-header';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { formatPeriod } from '@/lib/utils';
import { cn } from '@/lib/utils';

const reports = [
  {
    id: 'financial_monthly',
    title: 'Relatório Financeiro Mensal',
    description: 'Demonstrativo completo de receitas, despesas e balanço',
    icon: FileBarChart,
    color: 'text-blue-600 bg-blue-100',
  },
  {
    id: 'nfc_compliance',
    title: 'Relatório Nota Fiscal Cidadã',
    description: 'Demonstrativo de aplicação de recursos (70% projeto / 30% custeio)',
    icon: FileCheck,
    color: 'text-purple-600 bg-purple-100',
  },
  {
    id: 'balancete',
    title: 'Balancete Mensal',
    description: 'Saldos de todas as contas contábeis no período',
    icon: FileSpreadsheet,
    color: 'text-green-600 bg-green-100',
  },
  {
    id: 'dre',
    title: 'Demonstração do Resultado (DRE)',
    description: 'Resultado do exercício com receitas e despesas agrupadas',
    icon: TrendingUp,
    color: 'text-orange-600 bg-orange-100',
  },
  {
    id: 'balanco_patrimonial',
    title: 'Balanço Patrimonial',
    description: 'Demonstrativo de ativos, passivos e patrimônio social',
    icon: Building2,
    color: 'text-indigo-600 bg-indigo-100',
  },
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

export default function Reports() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [periodId, setPeriodId] = useState<string>('');

  const { data: periods = [] } = trpc.periods.list.useQuery();
  const financialMutation = trpc.reports.generateFinancial.useMutation();
  const nfcMutation = trpc.reports.generateNfc.useMutation();
  const balanceteMutation = trpc.reports.generateBalancete.useMutation();
  const dreMutation = trpc.reports.generateDRE.useMutation();
  const balancoMutation = trpc.reports.generateBalancoPatrimonial.useMutation();

  const isPending = financialMutation.isPending || nfcMutation.isPending || balanceteMutation.isPending || dreMutation.isPending || balancoMutation.isPending;

  const openDialog = (reportId: string) => {
    setSelectedReport(reportId);
    setPeriodId(periods[0]?.id.toString() || '');
    setDialogOpen(true);
  };

  const handleGenerate = async () => {
    if (!periodId || !selectedReport) return;

    try {
      const pid = parseInt(periodId);
      const period = periods.find((p) => p.id === pid);
      const periodName = period ? formatPeriod(period.month, period.year).replace(/ /g, '_') : pid;

      let result;
      switch (selectedReport) {
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
      setDialogOpen(false);
    } catch (error) {
      toast.error('Erro ao gerar relatório');
    }
  };

  const selectedReportInfo = reports.find((r) => r.id === selectedReport);

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Relatórios"
        description="Gere relatórios contábeis e de compliance em PDF"
        icon={<BarChart3 className="h-6 w-6 sm:h-8 sm:w-8 text-primary shrink-0" />}
      />

      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
        {reports.map((report) => (
          <Card key={report.id} className="hover:shadow-lg transition-shadow flex flex-col">
            <CardHeader className="pb-2 sm:pb-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className={cn('p-2 sm:p-3 rounded-lg shrink-0', report.color)}>
                  <report.icon className="h-4 w-4 sm:h-6 sm:w-6" />
                </div>
                <CardTitle className="text-sm sm:text-lg leading-tight">{report.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex-1 pb-2 sm:pb-4">
              <CardDescription className="text-xs sm:text-sm">{report.description}</CardDescription>
            </CardContent>
            <CardFooter className="pt-0">
              <Button className="w-full touch-target" size="sm" onClick={() => openDialog(report.id)}>
                <Download className="mr-1 sm:mr-2 h-4 w-4" />
                <span className="hidden xs:inline">Gerar </span>PDF
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              {selectedReportInfo && (
                <>
                  <div className={cn('p-1.5 sm:p-2 rounded-lg shrink-0', selectedReportInfo.color)}>
                    <selectedReportInfo.icon className="h-3 w-3 sm:h-4 sm:w-4" />
                  </div>
                  <span className="truncate">{selectedReportInfo.title}</span>
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm">Período</Label>
              <Select value={periodId} onValueChange={setPeriodId}>
                <SelectTrigger>
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
            {selectedReportInfo && (
              <p className="text-xs sm:text-sm text-muted-foreground">{selectedReportInfo.description}</p>
            )}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button onClick={handleGenerate} disabled={isPending || !periodId} className="w-full sm:w-auto">
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Gerar PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
