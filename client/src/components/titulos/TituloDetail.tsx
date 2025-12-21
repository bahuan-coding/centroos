import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  ArrowUpRight,
  ArrowDownRight,
  Building2,
  Calendar,
  FileText,
  CreditCard,
  Edit2,
  RotateCcw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Wallet,
  ArrowRight,
} from 'lucide-react';

// ============================================================================
// CONSTANTES
// ============================================================================

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  rascunho: { label: 'Rascunho', color: 'text-slate-600', bgColor: 'bg-slate-100' },
  pendente_aprovacao: { label: 'Aguardando Aprovação', color: 'text-amber-600', bgColor: 'bg-amber-100' },
  aprovado: { label: 'Aprovado', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  parcial: { label: 'Parcialmente Pago', color: 'text-orange-600', bgColor: 'bg-orange-100' },
  quitado: { label: 'Quitado', color: 'text-emerald-600', bgColor: 'bg-emerald-100' },
  cancelado: { label: 'Cancelado', color: 'text-slate-400', bgColor: 'bg-slate-100' },
  vencido: { label: 'Vencido', color: 'text-rose-600', bgColor: 'bg-rose-100' },
};

const naturezaLabels: Record<string, string> = {
  contribuicao: 'Contribuição/Mensalidade',
  doacao: 'Doação',
  evento: 'Evento',
  convenio: 'Convênio/Subvenção',
  servico: 'Serviço',
  utilidade: 'Utilidade',
  taxa: 'Taxa/Tarifa',
  imposto: 'Imposto',
  material: 'Material',
  outros: 'Outros',
};

const formaPagamentoLabels: Record<string, string> = {
  dinheiro: 'Dinheiro',
  pix: 'PIX',
  ted: 'TED',
  doc: 'DOC',
  boleto: 'Boleto',
  debito: 'Cartão Débito',
  credito: 'Cartão Crédito',
  cheque: 'Cheque',
};

function formatCurrency(value: number | string): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('pt-BR');
}

interface TituloDetailProps {
  tituloId: string;
  onBaixar: () => void;
  onEdit: () => void;
}

export default function TituloDetail({ tituloId, onBaixar, onEdit }: TituloDetailProps) {
  const [confirmEstorno, setConfirmEstorno] = useState<string | null>(null);

  const utils = trpc.useUtils();

  const { data: titulo, isLoading } = trpc.titulos.getById.useQuery(tituloId);

  const estornarMutation = trpc.titulos.estornarBaixa.useMutation({
    onSuccess: (data) => {
      toast.success(`Baixa estornada. Título agora está ${data.novoStatus}`);
      utils.titulos.getById.invalidate(tituloId);
      setConfirmEstorno(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const handleEstornar = (baixaId: string) => {
    const motivo = prompt('Informe o motivo do estorno (mínimo 10 caracteres):');
    if (motivo && motivo.length >= 10) {
      estornarMutation.mutate({ baixaId, motivo });
    } else if (motivo) {
      toast.error('Motivo deve ter no mínimo 10 caracteres');
    }
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Carregando...</div>;
  }

  if (!titulo) {
    return <div className="text-center py-8 text-rose-600">Título não encontrado</div>;
  }

  const isPagar = titulo.tipo === 'pagar';
  const statusInfo = statusConfig[titulo.status] || statusConfig.rascunho;
  const isVencido = new Date(titulo.dataVencimento) < new Date() && !['quitado', 'cancelado'].includes(titulo.status);
  const canBaixar = ['aprovado', 'parcial', 'vencido'].includes(titulo.status);
  const canEdit = !['quitado', 'cancelado'].includes(titulo.status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={cn(
        'p-4 rounded-lg border-2',
        isPagar ? 'border-rose-200 bg-rose-50' : 'border-emerald-200 bg-emerald-50'
      )}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-12 h-12 rounded-lg flex items-center justify-center',
              isPagar ? 'bg-rose-100' : 'bg-emerald-100'
            )}>
              {isPagar ? (
                <ArrowDownRight className="h-6 w-6 text-rose-600" />
              ) : (
                <ArrowUpRight className="h-6 w-6 text-emerald-600" />
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{isPagar ? 'A Pagar' : 'A Receber'}</p>
              <p className={cn('text-2xl font-bold', isPagar ? 'text-rose-700' : 'text-emerald-700')}>
                {formatCurrency(titulo.valorLiquido)}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <Badge className={cn(statusInfo.bgColor, statusInfo.color)}>
              {statusInfo.label}
            </Badge>
            {isVencido && titulo.status !== 'vencido' && (
              <Badge className="bg-rose-100 text-rose-700">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Vencido
              </Badge>
            )}
          </div>
        </div>

        <p className="mt-3 font-medium">{titulo.descricao}</p>

        {titulo.parcelaNumero && (
          <Badge variant="outline" className="mt-2">
            Parcela {titulo.parcelaNumero} de {titulo.parcelaTotal}
          </Badge>
        )}
      </div>

      {/* Informações Principais */}
      <div className="grid grid-cols-2 gap-4">
        {/* Pessoa */}
        <div className="p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Building2 className="h-3 w-3" />
            {isPagar ? 'Fornecedor/Credor' : 'Doador/Pagador'}
          </div>
          <p className="font-medium text-sm">
            {titulo.pessoa?.nome || <span className="text-muted-foreground italic">Não informado</span>}
          </p>
        </div>

        {/* Natureza */}
        <div className="p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <FileText className="h-3 w-3" />
            Natureza
          </div>
          <p className="font-medium text-sm">{naturezaLabels[titulo.natureza] || titulo.natureza}</p>
        </div>
      </div>

      {/* Datas */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Calendar className="h-3 w-3" />
            Emissão
          </div>
          <p className="font-medium text-sm">{formatDate(titulo.dataEmissao)}</p>
        </div>

        <div className="p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Calendar className="h-3 w-3" />
            Competência
          </div>
          <p className="font-medium text-sm">{formatDate(titulo.dataCompetencia)}</p>
        </div>

        <div className={cn(
          'p-3 rounded-lg',
          isVencido ? 'bg-rose-100' : 'bg-muted/50'
        )}>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Clock className="h-3 w-3" />
            Vencimento
          </div>
          <p className={cn('font-medium text-sm', isVencido && 'text-rose-700')}>
            {formatDate(titulo.dataVencimento)}
          </p>
        </div>
      </div>

      {/* Valores */}
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-muted/50 px-4 py-2 text-sm font-medium">
          <Wallet className="h-4 w-4 inline mr-2" />
          Valores
        </div>
        <div className="p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span>Valor Original</span>
            <span className="font-mono">{formatCurrency(titulo.valorOriginal)}</span>
          </div>
          {Number(titulo.valorDesconto) > 0 && (
            <div className="flex justify-between text-sm text-emerald-600">
              <span>(-) Desconto</span>
              <span className="font-mono">- {formatCurrency(titulo.valorDesconto)}</span>
            </div>
          )}
          {Number(titulo.valorAcrescimo) > 0 && (
            <div className="flex justify-between text-sm text-rose-600">
              <span>(+) Acréscimo</span>
              <span className="font-mono">+ {formatCurrency(titulo.valorAcrescimo)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm font-medium pt-2 border-t">
            <span>Valor Líquido</span>
            <span className="font-mono">{formatCurrency(titulo.valorLiquido)}</span>
          </div>
          
          {titulo.totalBaixado > 0 && (
            <>
              <div className="flex justify-between text-sm text-emerald-600">
                <span>(-) Já Pago</span>
                <span className="font-mono">- {formatCurrency(titulo.totalBaixado)}</span>
              </div>
              <div className={cn(
                'flex justify-between text-sm font-bold pt-2 border-t',
                titulo.saldoPendente > 0 ? 'text-amber-600' : 'text-emerald-600'
              )}>
                <span>Saldo Pendente</span>
                <span className="font-mono">{formatCurrency(titulo.saldoPendente)}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Documento */}
      {(titulo.numeroDocumento || titulo.serieDocumento) && (
        <div className="p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <FileText className="h-3 w-3" />
            Documento Fiscal
          </div>
          <p className="font-medium text-sm">
            {titulo.numeroDocumento}
            {titulo.serieDocumento && <span className="text-muted-foreground"> (Série {titulo.serieDocumento})</span>}
          </p>
        </div>
      )}

      {/* Observações */}
      {titulo.observacoes && (
        <div className="p-3 bg-muted/50 rounded-lg">
          <p className="text-xs text-muted-foreground mb-1">Observações</p>
          <p className="text-sm whitespace-pre-wrap">{titulo.observacoes}</p>
        </div>
      )}

      {/* Conta Contábil */}
      {titulo.contaContabil && (
        <div className="p-3 bg-muted/50 rounded-lg">
          <p className="text-xs text-muted-foreground mb-1">Conta Contábil</p>
          <p className="text-sm font-mono">
            {titulo.contaContabil.codigo} - {titulo.contaContabil.nome}
          </p>
        </div>
      )}

      {/* Histórico de Baixas */}
      {titulo.baixas.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-muted/50 px-4 py-2 text-sm font-medium flex items-center justify-between">
            <div>
              <CreditCard className="h-4 w-4 inline mr-2" />
              Histórico de Baixas
            </div>
            <Badge variant="outline">{titulo.baixas.length}</Badge>
          </div>
          <div className="divide-y">
            {titulo.baixas.map((baixa) => {
              const totalBaixa = Number(baixa.valorPago) + Number(baixa.valorJuros) + Number(baixa.valorMulta) - Number(baixa.valorDesconto);
              const isEstorno = baixa.estorno;

              return (
                <div
                  key={baixa.id}
                  className={cn(
                    'p-3 flex items-center gap-3',
                    isEstorno && 'bg-rose-50/50'
                  )}
                >
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                    isEstorno ? 'bg-rose-100' : 'bg-emerald-100'
                  )}>
                    {isEstorno ? (
                      <RotateCcw className="h-4 w-4 text-rose-600" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {formatDate(baixa.dataPagamento)}
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {formaPagamentoLabels[baixa.formaPagamento] || baixa.formaPagamento}
                      </Badge>
                      {isEstorno && (
                        <Badge className="bg-rose-100 text-rose-700 text-[10px]">Estorno</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {baixa.contaFinanceira?.nome || 'Conta não especificada'}
                      {baixa.documentoReferencia && ` · ${baixa.documentoReferencia}`}
                    </div>
                    {baixa.estornoMotivo && (
                      <p className="text-xs text-rose-600 mt-1">
                        Motivo: {baixa.estornoMotivo}
                      </p>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <p className={cn(
                      'font-mono font-bold',
                      isEstorno ? 'text-rose-600' : 'text-emerald-600'
                    )}>
                      {isEstorno ? '-' : '+'}{formatCurrency(totalBaixa)}
                    </p>
                  </div>

                  {/* Botão estornar */}
                  {!isEstorno && titulo.status !== 'cancelado' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                      onClick={() => handleEstornar(baixa.id)}
                      disabled={estornarMutation.isPending}
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Estornar
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Ações */}
      <div className="flex justify-between gap-3 pt-4 border-t">
        <div>
          {canEdit && (
            <Button variant="outline" onClick={onEdit}>
              <Edit2 className="h-4 w-4 mr-2" />
              Editar
            </Button>
          )}
        </div>

        <div className="flex gap-2">
          {canBaixar && titulo.saldoPendente > 0 && (
            <Button onClick={onBaixar}>
              <CreditCard className="h-4 w-4 mr-2" />
              Registrar {isPagar ? 'Pagamento' : 'Recebimento'}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}




