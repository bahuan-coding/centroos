import { useState } from 'react';
import { FileBarChart, FileCheck, FileSpreadsheet, ArrowRight, Download, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { formatPeriod } from '@/lib/utils';

const reports = [
  {
    id: 'financial_monthly',
    title: 'Relatório Financeiro Mensal',
    description: 'Demonstrativo completo de receitas, despesas, balanço e saldos bancários',
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
    description: 'Saldos de todas as contas no período',
    icon: FileSpreadsheet,
    color: 'text-green-600 bg-green-100',
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

  const isPending = financialMutation.isPending || nfcMutation.isPending || balanceteMutation.isPending;

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
      if (selectedReport === 'financial_monthly') {
        result = await financialMutation.mutateAsync(pid);
        downloadPDF(result.pdf, `relatorio_financeiro_${periodName}.pdf`);
      } else if (selectedReport === 'nfc_compliance') {
        result = await nfcMutation.mutateAsync(pid);
        downloadPDF(result.pdf, `relatorio_nfc_${periodName}.pdf`);
      } else if (selectedReport === 'balancete') {
        result = await balanceteMutation.mutateAsync(pid);
        downloadPDF(result.pdf, `balancete_${periodName}.pdf`);
      }

      toast.success('Relatório gerado com sucesso!');
      setDialogOpen(false);
    } catch (error) {
      toast.error('Erro ao gerar relatório');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Relatórios</h1>
        <p className="text-muted-foreground">Gere relatórios contábeis e de compliance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.map((report) => (
          <Card key={report.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-lg ${report.color}`}>
                  <report.icon className="h-6 w-6" />
                </div>
                <CardTitle className="text-lg">{report.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>{report.description}</CardDescription>
            </CardContent>
            <CardFooter>
              <Button className="w-full" onClick={() => openDialog(report.id)}>
                <Download className="mr-2 h-4 w-4" />
                Gerar PDF
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Demonstrações Contábeis Anuais</CardTitle>
          <CardDescription>Relatórios obrigatórios conforme ITG 2002</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button variant="outline" className="justify-start h-auto py-4">
              <div className="text-left">
                <p className="font-medium">Demonstração do Resultado</p>
                <p className="text-sm text-muted-foreground">DRP - Anual</p>
              </div>
            </Button>
            <Button variant="outline" className="justify-start h-auto py-4">
              <div className="text-left">
                <p className="font-medium">Balanço Patrimonial</p>
                <p className="text-sm text-muted-foreground">Anual</p>
              </div>
            </Button>
            <Button variant="outline" className="justify-start h-auto py-4">
              <div className="text-left">
                <p className="font-medium">Fluxo de Caixa</p>
                <p className="text-sm text-muted-foreground">DFC - Anual</p>
              </div>
            </Button>
            <Button variant="outline" className="justify-start h-auto py-4">
              <div className="text-left">
                <p className="font-medium">Mutações do Patrimônio</p>
                <p className="text-sm text-muted-foreground">DMPS - Anual</p>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerar Relatório</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Período</Label>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleGenerate} disabled={isPending || !periodId}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Gerar PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
