/**
 * NF-e / NFC-e - Componente de Status e Simulação SEFAZ
 */

import { useState } from 'react';
import { 
  FileText, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Building2,
  ShoppingCart,
  Calculator,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { trpc } from '@/lib/trpc';

// ============================================================================
// STATUS SEFAZ
// ============================================================================

function SefazStatus() {
  const [uf, setUf] = useState('SP');
  const [ambiente, setAmbiente] = useState<'1' | '2'>('2');
  
  const statusQuery = trpc.fiscal.nfeStatus.useQuery(
    { uf, ambiente },
    { enabled: false, retry: false }
  );
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          Status SEFAZ
        </CardTitle>
        <CardDescription>
          Verifica disponibilidade dos serviços NF-e/NFC-e
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>UF</Label>
            <Select value={uf} onValueChange={setUf}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SP">São Paulo</SelectItem>
                <SelectItem value="AL">Alagoas</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Ambiente</Label>
            <Select value={ambiente} onValueChange={(v) => setAmbiente(v as '1' | '2')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2">Homologação</SelectItem>
                <SelectItem value="1">Produção</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <Button 
          onClick={() => statusQuery.refetch()} 
          disabled={statusQuery.isFetching}
          className="w-full"
        >
          {statusQuery.isFetching ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Consultar Status
        </Button>
        
        {statusQuery.data && (
          <div className={cn(
            'p-4 rounded-lg border',
            statusQuery.data.disponivel 
              ? 'bg-emerald-50 border-emerald-200' 
              : 'bg-amber-50 border-amber-200'
          )}>
            <div className="flex items-center gap-2 mb-2">
              {statusQuery.data.disponivel ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-amber-600" />
              )}
              <span className="font-medium">
                {statusQuery.data.disponivel ? 'Serviço Disponível' : 'Atenção'}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{statusQuery.data.mensagem}</p>
            {statusQuery.data.tempoMedio && (
              <p className="text-xs text-muted-foreground mt-1">
                Tempo médio: {statusQuery.data.tempoMedio}
              </p>
            )}
            {statusQuery.data.nota && (
              <p className="text-xs text-muted-foreground mt-2 italic">
                {statusQuery.data.nota}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// ENDPOINTS
// ============================================================================

function SefazEndpoints() {
  const [uf, setUf] = useState('SP');
  const [ambiente, setAmbiente] = useState<'1' | '2'>('2');
  const [expanded, setExpanded] = useState(false);
  
  const endpointsQuery = trpc.fiscal.nfeEndpoints.useQuery({ uf, ambiente });
  
  return (
    <Card>
      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <CardHeader className="pb-3">
          <CollapsibleTrigger className="w-full">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <CardTitle className="text-base">Endpoints SEFAZ</CardTitle>
              </div>
              <ChevronDown className={cn(
                'h-4 w-4 transition-transform',
                expanded && 'rotate-180'
              )} />
            </div>
          </CollapsibleTrigger>
          <CardDescription>
            Web services configurados por UF
          </CardDescription>
        </CardHeader>
        
        <CollapsibleContent>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>UF</Label>
                <Select value={uf} onValueChange={setUf}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SP">São Paulo</SelectItem>
                    <SelectItem value="AL">Alagoas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ambiente</Label>
                <Select value={ambiente} onValueChange={(v) => setAmbiente(v as '1' | '2')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">Homologação</SelectItem>
                    <SelectItem value="1">Produção</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {endpointsQuery.isLoading && (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            )}
            
            {endpointsQuery.data?.sucesso && endpointsQuery.data.endpoints && (
              <div className="space-y-2 max-h-60 overflow-auto">
                {endpointsQuery.data.endpoints.map((ep: any) => (
                  <div key={ep.servico} className="text-xs p-2 bg-muted/50 rounded">
                    <div className="font-medium">{ep.servico}</div>
                    <div className="text-muted-foreground truncate" title={ep.url}>
                      {ep.url}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

// ============================================================================
// SIMULADOR NF-e
// ============================================================================

function SimuladorNFe() {
  const [formData, setFormData] = useState({
    uf: 'SP',
    ambiente: '2' as '1' | '2',
    modelo: '55' as '55' | '65',
    serie: 1,
    numero: 1,
    naturezaOperacao: 'Venda de mercadoria',
    emitente: {
      cnpj: '',
      razaoSocial: 'Empresa Teste LTDA',
      inscricaoEstadual: '123456789012',
      crt: '3' as '1' | '2' | '3' | '4',
      endereco: {
        logradouro: 'Rua Teste',
        numero: '123',
        bairro: 'Centro',
        codigoMunicipio: '3550308',
        nomeMunicipio: 'São Paulo',
        uf: 'SP',
        cep: '01001000',
      },
    },
    destinatario: {
      tipo: 'PF' as 'PJ' | 'PF' | 'ESTRANGEIRO',
      cpfCnpj: '',
      nome: 'Cliente Teste',
      indicadorIE: '9' as '1' | '2' | '9',
    },
    itens: [{
      codigo: 'PROD001',
      descricao: 'Produto Teste',
      ncm: '84713012',
      cfop: '5102',
      unidade: 'UN',
      quantidade: 1,
      valorUnitario: 100,
      valorTotal: 100,
      origem: '0',
      tributacao: {
        regime: 'normal' as 'normal' | 'simples',
        cst: '00',
        cstPIS: '01',
        cstCOFINS: '01',
      },
    }],
    pagamentos: [{
      forma: '01',
      valor: 100,
    }],
  });
  
  const simularMutation = trpc.fiscal.nfeSimular.useMutation();
  
  const handleSimular = () => {
    simularMutation.mutate(formData);
  };
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Calculator className="h-4 w-4" />
          Simulador NF-e / NFC-e
        </CardTitle>
        <CardDescription>
          Valida dados sem emitir (certificado não necessário)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Modelo</Label>
            <Select 
              value={formData.modelo} 
              onValueChange={(v) => setFormData(f => ({ ...f, modelo: v as '55' | '65' }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="55">NF-e (55)</SelectItem>
                <SelectItem value="65">NFC-e (65)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Série</Label>
            <Input 
              type="number" 
              value={formData.serie}
              onChange={(e) => setFormData(f => ({ ...f, serie: parseInt(e.target.value) || 1 }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Número</Label>
            <Input 
              type="number" 
              value={formData.numero}
              onChange={(e) => setFormData(f => ({ ...f, numero: parseInt(e.target.value) || 1 }))}
            />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>CNPJ Emitente</Label>
            <Input 
              placeholder="00.000.000/0001-00"
              value={formData.emitente.cnpj}
              onChange={(e) => setFormData(f => ({ 
                ...f, 
                emitente: { ...f.emitente, cnpj: e.target.value } 
              }))}
            />
          </div>
          <div className="space-y-2">
            <Label>CPF/CNPJ Destinatário</Label>
            <Input 
              placeholder="000.000.000-00"
              value={formData.destinatario.cpfCnpj}
              onChange={(e) => setFormData(f => ({ 
                ...f, 
                destinatario: { ...f.destinatario, cpfCnpj: e.target.value } 
              }))}
            />
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>NCM Produto</Label>
            <Input 
              value={formData.itens[0].ncm}
              onChange={(e) => setFormData(f => ({
                ...f,
                itens: [{ ...f.itens[0], ncm: e.target.value }]
              }))}
            />
          </div>
          <div className="space-y-2">
            <Label>CFOP</Label>
            <Input 
              value={formData.itens[0].cfop}
              onChange={(e) => setFormData(f => ({
                ...f,
                itens: [{ ...f.itens[0], cfop: e.target.value }]
              }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Valor Total</Label>
            <Input 
              type="number"
              value={formData.itens[0].valorTotal}
              onChange={(e) => {
                const valor = parseFloat(e.target.value) || 0;
                setFormData(f => ({
                  ...f,
                  itens: [{ 
                    ...f.itens[0], 
                    valorTotal: valor,
                    valorUnitario: valor,
                  }],
                  pagamentos: [{ ...f.pagamentos[0], valor }]
                }));
              }}
            />
          </div>
        </div>
        
        <Button 
          onClick={handleSimular} 
          disabled={simularMutation.isPending}
          className="w-full"
        >
          {simularMutation.isPending ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <ShoppingCart className="h-4 w-4 mr-2" />
          )}
          Simular {formData.modelo === '55' ? 'NF-e' : 'NFC-e'}
        </Button>
        
        {simularMutation.data && (
          <div className={cn(
            'p-4 rounded-lg border',
            simularMutation.data.sucesso 
              ? 'bg-emerald-50 border-emerald-200' 
              : 'bg-rose-50 border-rose-200'
          )}>
            <div className="flex items-center gap-2 mb-2">
              {simularMutation.data.sucesso ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              ) : (
                <XCircle className="h-5 w-5 text-rose-600" />
              )}
              <span className="font-medium">
                {simularMutation.data.sucesso ? 'Validação OK' : 'Erros Encontrados'}
              </span>
              {simularMutation.data.modelo && (
                <Badge variant="secondary">{simularMutation.data.modelo}</Badge>
              )}
            </div>
            
            {simularMutation.data.chaveAcesso && (
              <div className="text-xs font-mono bg-white/50 p-2 rounded mt-2">
                <span className="text-muted-foreground">Chave de Acesso: </span>
                {simularMutation.data.chaveAcesso}
              </div>
            )}
            
            {simularMutation.data.erros && simularMutation.data.erros.length > 0 && (
              <ul className="text-sm text-rose-700 mt-2 space-y-1">
                {simularMutation.data.erros.map((erro: string, i: number) => (
                  <li key={i}>• {erro}</li>
                ))}
              </ul>
            )}
            
            {simularMutation.data.mensagem && (
              <p className="text-xs text-muted-foreground mt-2 italic">
                {simularMutation.data.mensagem}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function NFeSefaz() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">NF-e / NFC-e (SEFAZ)</h3>
        <p className="text-sm text-muted-foreground">
          Nota Fiscal Eletrônica de Produtos - Modelo 55 e 65
        </p>
      </div>
      
      <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
        <div className="flex gap-2">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">Certificado Digital Necessário</p>
            <p className="text-sm text-amber-700 mt-1">
              Para emitir NF-e/NFC-e em produção ou homologação SEFAZ, é necessário:
            </p>
            <ul className="text-sm text-amber-700 mt-2 list-disc list-inside">
              <li>Certificado Digital ICP-Brasil (e-CNPJ A1)</li>
              <li>Inscrição Estadual ativa na UF</li>
              <li>Credenciamento como emissor de NF-e</li>
              <li>CSC (Código de Segurança do Contribuinte) para NFC-e</li>
            </ul>
          </div>
        </div>
      </div>
      
      <div className="grid md:grid-cols-2 gap-4">
        <SefazStatus />
        <SefazEndpoints />
      </div>
      
      <SimuladorNFe />
    </div>
  );
}


