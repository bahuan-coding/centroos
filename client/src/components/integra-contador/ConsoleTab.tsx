/**
 * Aba Console do Integra Contador
 * 
 * Execução raw de chamadas à API para desenvolvimento
 */

import { useState } from 'react';
import { 
  Terminal, 
  Play,
  Loader2,
  Copy,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function ConsoleTab() {
  const [sistema, setSistema] = useState('');
  const [servico, setServico] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [dados, setDados] = useState('{}');
  const [response, setResponse] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const { data: sistemas } = trpc.serpro.console.sistemas.useQuery();
  
  const executarMutation = trpc.serpro.console.executar.useMutation({
    onSuccess: (result) => setResponse(result),
    onError: (error) => setResponse({ error: error.message }),
  });

  // Filtrar serviços do sistema selecionado
  const sistemaData = sistemas?.find((s: any) => s.id === sistema);
  const servicos = sistemaData?.servicos || [];

  const handleExecutar = () => {
    if (!sistema || !servico || !cnpj) {
      setResponse({ error: 'Preencha todos os campos obrigatórios' });
      return;
    }

    let dadosParsed = {};
    try {
      dadosParsed = JSON.parse(dados);
    } catch (e) {
      setResponse({ error: 'JSON inválido no campo "dados"' });
      return;
    }

    executarMutation.mutate({
      idSistema: sistema,
      idServico: servico,
      cnpjContribuinte: cnpj.replace(/\D/g, ''),
      dados: dadosParsed,
    });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(response, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <Alert className="border-amber-200 bg-amber-50">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-800">Modo Desenvolvedor</AlertTitle>
        <AlertDescription className="text-amber-700">
          Este console permite executar chamadas raw à API SERPRO.
          Use com cuidado - requisições são bilhetadas e cobradas.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Formulário */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Terminal className="h-4 w-4" />
              Requisição
            </CardTitle>
            <CardDescription>
              Configure e execute uma chamada à API
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sistema">Sistema (idSistema)</Label>
              <Select value={sistema} onValueChange={(v) => { setSistema(v); setServico(''); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o sistema" />
                </SelectTrigger>
                <SelectContent>
                  {sistemas?.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs">{s.id}</span>
                        <span className="text-muted-foreground">-</span>
                        <span>{s.nome}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="servico">Serviço (idServico)</Label>
              <Select value={servico} onValueChange={setServico} disabled={!sistema}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o serviço" />
                </SelectTrigger>
                <SelectContent>
                  {servicos.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs">{s.id}</span>
                        <span className="text-muted-foreground">-</span>
                        <span>{s.nome}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ do Contribuinte</Label>
              <Input
                id="cnpj"
                placeholder="00.000.000/0000-00"
                value={cnpj}
                onChange={(e) => setCnpj(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dados">Dados (JSON)</Label>
              <Textarea
                id="dados"
                placeholder='{"protocolo": "..."}'
                value={dados}
                onChange={(e) => setDados(e.target.value)}
                className="font-mono text-sm h-32"
              />
              <p className="text-xs text-muted-foreground">
                Parâmetros específicos do serviço em formato JSON
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={handleExecutar}
              disabled={executarMutation.isPending || !sistema || !servico || !cnpj}
              className="w-full"
            >
              {executarMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Executando...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Executar
                </>
              )}
            </Button>
          </CardFooter>
        </Card>

        {/* Resposta */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Resposta</CardTitle>
              {response?.httpStatus && (
                <CardDescription className="flex items-center gap-2 mt-1">
                  <Badge 
                    variant="outline"
                    className={cn(
                      'font-mono',
                      response.httpStatus >= 200 && response.httpStatus < 300 && 'bg-emerald-50 text-emerald-700 border-emerald-200',
                      response.httpStatus >= 400 && response.httpStatus < 500 && 'bg-amber-50 text-amber-700 border-amber-200',
                      response.httpStatus >= 500 && 'bg-rose-50 text-rose-700 border-rose-200'
                    )}
                  >
                    HTTP {response.httpStatus}
                  </Badge>
                  {response.rateLimit && (
                    <span className="text-xs">
                      Rate: {response.rateLimit.remaining}/{response.rateLimit.limit}
                    </span>
                  )}
                </CardDescription>
              )}
            </div>
            {response && (
              <Button variant="ghost" size="icon" onClick={handleCopy}>
                {copied ? (
                  <Check className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {!response ? (
              <div className="text-center py-8 text-muted-foreground">
                <Terminal className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>Execute uma requisição para ver a resposta</p>
              </div>
            ) : (
              <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-auto max-h-96 text-xs font-mono">
                {JSON.stringify(response, null, 2)}
              </pre>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Catálogo de Sistemas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Catálogo de Sistemas e Serviços</CardTitle>
          <CardDescription>
            Referência rápida dos sistemas disponíveis na API
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sistemas?.map((s: any) => (
              <div 
                key={s.id}
                className="border rounded-lg p-3 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{s.nome}</span>
                  <Badge variant="outline" className="font-mono text-xs">
                    {s.id}
                  </Badge>
                </div>
                <div className="space-y-1">
                  {s.servicos.map((serv: any) => (
                    <div 
                      key={serv.id}
                      className="text-xs flex items-center gap-2 text-muted-foreground"
                    >
                      <span className="font-mono bg-muted px-1 rounded">
                        {serv.nome}
                      </span>
                      <span className="truncate opacity-60" title={serv.id}>
                        {serv.id}
                      </span>
                    </div>
                  ))}
                </div>
                {s.codigoProcuracao && (
                  <div className="text-xs text-muted-foreground">
                    Procuração: código {s.codigoProcuracao}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

