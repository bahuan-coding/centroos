/**
 * Simulador do Decisor Fiscal
 * 
 * Permite testar qual documento fiscal será emitido para uma operação.
 */

import { useState } from 'react';
import { 
  FileText, 
  Building2, 
  User, 
  MapPin,
  ShoppingCart,
  Briefcase,
  ArrowRight,
  CheckCircle,
  Info,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useDecisaoFiscal, DecisaoFiscalInput } from '@/lib/hooks/useFiscal';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

type TipoOperacao = 'SERVICO' | 'MERCADORIA' | 'MISTO';
type TipoDestinatario = 'PJ' | 'PF' | 'ESTRANGEIRO';
type LocalVenda = 'PRESENCIAL' | 'INTERNET' | 'TELEFONE' | 'DOMICILIO';
type RegimeTributario = 'SIMPLES_NACIONAL' | 'LUCRO_PRESUMIDO' | 'LUCRO_REAL' | 'MEI';

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function FiscalDecisor() {
  // Estado do formulário
  const [tipoOperacao, setTipoOperacao] = useState<TipoOperacao>('SERVICO');
  const [tipoDestinatario, setTipoDestinatario] = useState<TipoDestinatario>('PJ');
  const [isConsumidorFinal, setIsConsumidorFinal] = useState(false);
  const [localVenda, setLocalVenda] = useState<LocalVenda>('PRESENCIAL');
  const [valorTotal, setValorTotal] = useState(1000);
  const [codigoMunicipio, setCodigoMunicipio] = useState('3550308'); // São Paulo
  const [uf, setUf] = useState('SP');
  const [codigoServico, setCodigoServico] = useState('17.01');
  const [ncm, setNcm] = useState('84715010');
  const [cfop, setCfop] = useState('5102');

  // Montar input
  const [executar, setExecutar] = useState(false);
  
  const input: DecisaoFiscalInput | undefined = executar ? {
    tipoOperacao,
    emitente: {
      cpfCnpj: '12345678000190',
      uf,
      codigoMunicipio,
      inscricaoMunicipal: '12345678',
      regimeTributario: 'SIMPLES_NACIONAL',
    },
    destinatario: {
      tipo: tipoDestinatario,
      cpfCnpj: tipoDestinatario === 'PJ' ? '98765432000110' : '12345678901',
      isConsumidorFinal,
      uf,
      codigoMunicipio,
    },
    localVenda,
    valorTotal,
    servico: tipoOperacao === 'SERVICO' || tipoOperacao === 'MISTO' 
      ? { codigoLC116: codigoServico }
      : undefined,
    mercadoria: tipoOperacao === 'MERCADORIA' || tipoOperacao === 'MISTO'
      ? { ncm, cfop }
      : undefined,
  } : undefined;

  const { data: decisao, isLoading, error } = useDecisaoFiscal(input, executar);

  const handleSimular = () => {
    setExecutar(true);
  };

  const resetar = () => {
    setExecutar(false);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold">Simulador de Decisão Fiscal</h3>
        <p className="text-sm text-muted-foreground">
          Descubra qual documento fiscal será emitido para uma operação
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Formulário */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Dados da Operação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Tipo de Operação */}
            <div className="space-y-2">
              <Label>Tipo de Operação</Label>
              <RadioGroup 
                value={tipoOperacao} 
                onValueChange={(v: string) => { setTipoOperacao(v as TipoOperacao); resetar(); }}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="SERVICO" id="servico" />
                  <Label htmlFor="servico" className="text-sm cursor-pointer">
                    <Briefcase className="h-3 w-3 inline mr-1" />
                    Serviço
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="MERCADORIA" id="mercadoria" />
                  <Label htmlFor="mercadoria" className="text-sm cursor-pointer">
                    <ShoppingCart className="h-3 w-3 inline mr-1" />
                    Mercadoria
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="MISTO" id="misto" />
                  <Label htmlFor="misto" className="text-sm cursor-pointer">
                    Misto
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Destinatário */}
            <div className="space-y-2">
              <Label>Destinatário</Label>
              <Select 
                value={tipoDestinatario} 
                onValueChange={(v) => { setTipoDestinatario(v as TipoDestinatario); resetar(); }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PJ">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Pessoa Jurídica
                    </div>
                  </SelectItem>
                  <SelectItem value="PF">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Pessoa Física
                    </div>
                  </SelectItem>
                  <SelectItem value="ESTRANGEIRO">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Estrangeiro
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Consumidor Final */}
            <div className="flex items-center justify-between">
              <Label htmlFor="consumidorFinal">Consumidor Final</Label>
              <Switch
                id="consumidorFinal"
                checked={isConsumidorFinal}
                onCheckedChange={(v) => { setIsConsumidorFinal(v); resetar(); }}
              />
            </div>

            {/* Local de Venda */}
            <div className="space-y-2">
              <Label>Local de Venda</Label>
              <Select 
                value={localVenda} 
                onValueChange={(v) => { setLocalVenda(v as LocalVenda); resetar(); }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRESENCIAL">Presencial</SelectItem>
                  <SelectItem value="INTERNET">Internet</SelectItem>
                  <SelectItem value="TELEFONE">Telefone</SelectItem>
                  <SelectItem value="DOMICILIO">Domicílio</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Município */}
            <div className="space-y-2">
              <Label>Município (Código IBGE)</Label>
              <Input
                value={codigoMunicipio}
                onChange={(e) => { setCodigoMunicipio(e.target.value); resetar(); }}
                placeholder="3550308"
              />
              <p className="text-[10px] text-muted-foreground">
                3550308 = São Paulo
              </p>
            </div>

            {/* Valor */}
            <div className="space-y-2">
              <Label>Valor Total</Label>
              <Input
                type="number"
                value={valorTotal}
                onChange={(e) => { setValorTotal(Number(e.target.value)); resetar(); }}
                min={0}
                step={100}
              />
            </div>

            {/* Botão Simular */}
            <Button 
              onClick={handleSimular} 
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Simulando...' : 'Simular Decisão'}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>

        {/* Resultado */}
        <Card className={cn(
          'transition-all',
          decisao && 'border-2 border-primary'
        )}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Resultado da Decisão</CardTitle>
            <CardDescription>
              O motor fiscal determinou o documento apropriado
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!executar ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mb-4 opacity-20" />
                <p className="text-sm">Configure os dados e clique em Simular</p>
              </div>
            ) : isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : error ? (
              <Alert variant="destructive">
                <AlertDescription>
                  {error.message}
                </AlertDescription>
              </Alert>
            ) : decisao ? (
              <div className="space-y-4">
                {/* Tipo de Documento */}
                <div className="text-center py-4 bg-primary/5 rounded-lg">
                  <Badge 
                    variant="default" 
                    className={cn(
                      'text-lg px-4 py-2',
                      decisao.isNFSe && 'bg-blue-600',
                      decisao.tipoDocumento === 'NFE' && 'bg-emerald-600',
                      decisao.tipoDocumento === 'NFCE' && 'bg-purple-600'
                    )}
                  >
                    {decisao.tipoDocumento}
                  </Badge>
                  {decisao.modelo && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Modelo {decisao.modelo}
                    </p>
                  )}
                </div>

                {/* Motivo */}
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase">Motivo</p>
                  <p className="text-sm">{decisao.motivo}</p>
                </div>

                {/* Regras Aplicadas */}
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase">Regras Aplicadas</p>
                  <div className="flex flex-wrap gap-1">
                    {decisao.regras.map((regra: string) => (
                      <Badge key={regra} variant="secondary" className="text-xs">
                        {regra}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Info */}
                <Alert className="bg-muted/50">
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    {decisao.isNFSe && 'Este documento é uma Nota Fiscal de Serviço Eletrônica'}
                    {decisao.tipoDocumento === 'NFE' && 'Este documento é uma Nota Fiscal Eletrônica (modelo 55)'}
                    {decisao.tipoDocumento === 'NFCE' && 'Este documento é uma Nota Fiscal de Consumidor (modelo 65)'}
                  </AlertDescription>
                </Alert>

                {/* Sucesso */}
                <div className="flex items-center gap-2 text-emerald-600 text-sm">
                  <CheckCircle className="h-4 w-4" />
                  Decisão determinística concluída
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default FiscalDecisor;

