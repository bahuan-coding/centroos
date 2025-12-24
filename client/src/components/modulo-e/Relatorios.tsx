import { FileBarChart, FileText, PieChart, TrendingUp, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { trpc } from '@/lib/trpc';
import { useState } from 'react';

interface ReportCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  badge?: string;
  children: React.ReactNode;
}

function ReportCard({ title, description, icon, badge, children }: ReportCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          {icon}
          {title}
          {badge && (
            <Badge variant="outline" className="ml-auto text-xs">
              {badge}
            </Badge>
          )}
        </CardTitle>
        <CardDescription className="text-sm">{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {children}
      </CardContent>
    </Card>
  );
}

export function RelatoriosTab() {
  const { data: projetos = [] } = trpc.projeto.list.useQuery({ status: ['em_andamento', 'concluido'] });
  const { data: fundos = [] } = trpc.fundo.list.useQuery({ ativo: true });
  const { data: centros = [] } = trpc.centroCusto.list.useQuery({ ativo: true });

  const [prestacaoParams, setPrestacaoParams] = useState({
    projetoId: '',
    dataInicio: '',
    dataFim: '',
  });

  const [fundoParams, setFundoParams] = useState({
    fundoId: '',
    dataInicio: '',
    dataFim: '',
  });

  const [dreParams, setDreParams] = useState({
    centroCustoId: '',
    dataInicio: '',
    dataFim: '',
  });

  const handleGerarPrestacao = () => {
    // Placeholder - would navigate or open report
    console.log('Gerar Prestação de Contas', prestacaoParams);
    alert('Relatório de Prestação de Contas em desenvolvimento. Parâmetros: ' + JSON.stringify(prestacaoParams, null, 2));
  };

  const handleGerarFundo = () => {
    console.log('Gerar Demonstração por Fundo', fundoParams);
    alert('Relatório de Demonstração por Fundo em desenvolvimento. Parâmetros: ' + JSON.stringify(fundoParams, null, 2));
  };

  const handleGerarDRE = () => {
    console.log('Gerar DRE por Centro de Custo', dreParams);
    alert('Relatório DRE por Centro de Custo em desenvolvimento. Parâmetros: ' + JSON.stringify(dreParams, null, 2));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <FileBarChart className="h-4 w-4" />
        Selecione os parâmetros e gere relatórios conforme necessidade de prestação de contas
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Prestação de Contas por Projeto */}
        <ReportCard
          title="Prestação de Contas"
          description="Receitas e despesas por projeto — ideal para MROSC (Lei 13.019/2014)"
          icon={<FileText className="h-4 w-4 text-purple-600" />}
          badge="MROSC"
        >
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="rel-projeto" className="text-xs">Projeto</Label>
              <Select
                value={prestacaoParams.projetoId}
                onValueChange={(v) => setPrestacaoParams({ ...prestacaoParams, projetoId: v })}
              >
                <SelectTrigger id="rel-projeto" className="text-sm">
                  <SelectValue placeholder="Selecionar projeto" />
                </SelectTrigger>
                <SelectContent>
                  {projetos.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-muted px-1 rounded">{p.codigo}</code>
                        {p.nome}
                        {p.parceriaMrosc && (
                          <Badge variant="outline" className="text-[10px] ml-1">MROSC</Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="rel-prest-ini" className="text-xs">Data Início</Label>
                <Input
                  id="rel-prest-ini"
                  type="date"
                  value={prestacaoParams.dataInicio}
                  onChange={(e) => setPrestacaoParams({ ...prestacaoParams, dataInicio: e.target.value })}
                  className="text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rel-prest-fim" className="text-xs">Data Fim</Label>
                <Input
                  id="rel-prest-fim"
                  type="date"
                  value={prestacaoParams.dataFim}
                  onChange={(e) => setPrestacaoParams({ ...prestacaoParams, dataFim: e.target.value })}
                  className="text-sm"
                />
              </div>
            </div>
            <Button
              onClick={handleGerarPrestacao}
              disabled={!prestacaoParams.projetoId}
              className="w-full"
              size="sm"
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              Gerar Relatório
            </Button>
          </div>
        </ReportCard>

        {/* Demonstração por Fundo */}
        <ReportCard
          title="Demonstração por Fundo"
          description="Saldo inicial, alocações, consumos e saldo final — NBC TG 26"
          icon={<PieChart className="h-4 w-4 text-emerald-600" />}
          badge="NBC TG 26"
        >
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="rel-fundo" className="text-xs">Fundo</Label>
              <Select
                value={fundoParams.fundoId}
                onValueChange={(v) => setFundoParams({ ...fundoParams, fundoId: v })}
              >
                <SelectTrigger id="rel-fundo" className="text-sm">
                  <SelectValue placeholder="Selecionar fundo" />
                </SelectTrigger>
                <SelectContent>
                  {fundos.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-muted px-1 rounded">{f.codigo}</code>
                        {f.nome}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="rel-fund-ini" className="text-xs">Data Início</Label>
                <Input
                  id="rel-fund-ini"
                  type="date"
                  value={fundoParams.dataInicio}
                  onChange={(e) => setFundoParams({ ...fundoParams, dataInicio: e.target.value })}
                  className="text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rel-fund-fim" className="text-xs">Data Fim</Label>
                <Input
                  id="rel-fund-fim"
                  type="date"
                  value={fundoParams.dataFim}
                  onChange={(e) => setFundoParams({ ...fundoParams, dataFim: e.target.value })}
                  className="text-sm"
                />
              </div>
            </div>
            <Button
              onClick={handleGerarFundo}
              disabled={!fundoParams.fundoId}
              className="w-full"
              size="sm"
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              Gerar Relatório
            </Button>
          </div>
        </ReportCard>

        {/* DRE por Centro de Custo */}
        <ReportCard
          title="DRE por Centro de Custo"
          description="Receitas e despesas segmentadas por área — ITG 2002"
          icon={<TrendingUp className="h-4 w-4 text-blue-600" />}
          badge="ITG 2002"
        >
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="rel-cc" className="text-xs">Centro de Custo</Label>
              <Select
                value={dreParams.centroCustoId}
                onValueChange={(v) => setDreParams({ ...dreParams, centroCustoId: v })}
              >
                <SelectTrigger id="rel-cc" className="text-sm">
                  <SelectValue placeholder="Selecionar centro" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Centros</SelectItem>
                  {centros.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-muted px-1 rounded">{c.codigo}</code>
                        {c.nome}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="rel-dre-ini" className="text-xs">Data Início</Label>
                <Input
                  id="rel-dre-ini"
                  type="date"
                  value={dreParams.dataInicio}
                  onChange={(e) => setDreParams({ ...dreParams, dataInicio: e.target.value })}
                  className="text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rel-dre-fim" className="text-xs">Data Fim</Label>
                <Input
                  id="rel-dre-fim"
                  type="date"
                  value={dreParams.dataFim}
                  onChange={(e) => setDreParams({ ...dreParams, dataFim: e.target.value })}
                  className="text-sm"
                />
              </div>
            </div>
            <Button
              onClick={handleGerarDRE}
              className="w-full"
              size="sm"
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              Gerar Relatório
            </Button>
          </div>
        </ReportCard>
      </div>

      {/* Info sobre compliance */}
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <FileBarChart className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Sobre os relatórios</p>
              <ul className="space-y-1 list-disc list-inside">
                <li><strong>Prestação de Contas MROSC</strong>: Exigido pela Lei 13.019/2014 para parcerias com poder público</li>
                <li><strong>Demonstração por Fundo</strong>: NBC TG 26 exige segregação de patrimônio com/sem restrições</li>
                <li><strong>DRE por Centro de Custo</strong>: ITG 2002 para análise gerencial por área de atuação</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}













