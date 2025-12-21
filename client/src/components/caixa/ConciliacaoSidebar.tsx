import { useState } from 'react';
import { X, Link2, Plus, FileText, XCircle, Loader2, Search, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { LabelWithHelp } from '@/components/ui/tooltip-help';
import { cn } from '@/lib/utils';

type ConciliacaoTipo = 'vincular' | 'criar' | 'lancamento' | 'ignorar';

interface LinhaExtrato {
  id: string;
  data: string;
  descricao: string;
  valor: number;
  tipo: 'credito' | 'debito';
}

interface Titulo {
  id: string;
  descricao: string;
  pessoa?: string;
  valor: number;
  dataVencimento: string;
  tipo: 'pagar' | 'receber';
}

interface ConciliacaoSidebarProps {
  linha: LinhaExtrato | null;
  titulos: Titulo[];
  onClose: () => void;
  onVincular: (linhaId: string, tituloId: string) => void;
  onCriarTitulo: (linhaId: string, data: any) => void;
  onLancamentoManual: (linhaId: string, data: any) => void;
  onIgnorar: (linhaId: string, motivo: string) => void;
  isLoading?: boolean;
}

const TIPOS_LANCAMENTO = [
  { value: 'tarifa', label: 'Tarifa Bancária', debito: '5.1.2 Despesas Bancárias', credito: 'auto' },
  { value: 'rendimento', label: 'Rendimento', debito: 'auto', credito: '4.2.1 Receitas Financeiras' },
  { value: 'iof', label: 'IOF', debito: '5.1.3 Impostos', credito: 'auto' },
  { value: 'outro', label: 'Outro', debito: '', credito: '' },
];

const MOTIVOS_IGNORAR = [
  { value: 'transferencia', label: 'Transferência entre contas próprias' },
  { value: 'estorno', label: 'Estorno de movimento já tratado' },
  { value: 'erro_banco', label: 'Movimento incorreto do banco (contestar)' },
  { value: 'outro', label: 'Outro motivo' },
];

export function ConciliacaoSidebar({
  linha,
  titulos,
  onClose,
  onVincular,
  onCriarTitulo,
  onLancamentoManual,
  onIgnorar,
  isLoading = false,
}: ConciliacaoSidebarProps) {
  const [tipo, setTipo] = useState<ConciliacaoTipo>('vincular');
  const [selectedTituloId, setSelectedTituloId] = useState<string>('');
  const [tituloSearch, setTituloSearch] = useState('');
  const [lancamentoTipo, setLancamentoTipo] = useState('tarifa');
  const [lancamentoHistorico, setLancamentoHistorico] = useState('');
  const [ignorarMotivo, setIgnorarMotivo] = useState('transferencia');
  const [ignorarObservacao, setIgnorarObservacao] = useState('');

  if (!linha) return null;

  const filteredTitulos = titulos.filter(t => {
    if (!tituloSearch) return true;
    const search = tituloSearch.toLowerCase();
    return (
      t.descricao.toLowerCase().includes(search) ||
      t.pessoa?.toLowerCase().includes(search) ||
      t.valor.toString().includes(search)
    );
  });

  const handleConfirm = () => {
    switch (tipo) {
      case 'vincular':
        if (selectedTituloId) onVincular(linha.id, selectedTituloId);
        break;
      case 'criar':
        onCriarTitulo(linha.id, { /* form data */ });
        break;
      case 'lancamento':
        onLancamentoManual(linha.id, {
          tipo: lancamentoTipo,
          historico: lancamentoHistorico,
        });
        break;
      case 'ignorar':
        const motivo = ignorarMotivo === 'outro' ? ignorarObservacao : MOTIVOS_IGNORAR.find(m => m.value === ignorarMotivo)?.label || '';
        onIgnorar(linha.id, motivo);
        break;
    }
  };

  const canConfirm = () => {
    switch (tipo) {
      case 'vincular':
        return !!selectedTituloId;
      case 'criar':
        return true; // Add form validation
      case 'lancamento':
        return !!lancamentoTipo;
      case 'ignorar':
        return ignorarMotivo !== 'outro' || ignorarObservacao.length >= 10;
    }
  };

  return (
    <div className="w-80 border-l bg-background flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold text-sm">Conciliar Linha</h3>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Linha Info */}
      <div className="p-4 bg-muted/50 border-b">
        <p className="font-medium text-sm truncate" title={linha.descricao}>
          {linha.descricao}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-muted-foreground font-mono">{linha.data}</span>
          <span className={cn(
            'font-mono font-bold text-sm',
            linha.tipo === 'credito' ? 'text-emerald-600' : 'text-rose-600'
          )}>
            {linha.tipo === 'credito' ? '+' : '-'}R$ {linha.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Tipo de Conciliação */}
      <div className="p-4 border-b">
        <p className="text-xs text-muted-foreground mb-2">Tipo de conciliação:</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: 'vincular', label: 'Vincular título', icon: Link2 },
            { value: 'criar', label: 'Criar título', icon: Plus },
            { value: 'lancamento', label: 'Lanç. manual', icon: FileText },
            { value: 'ignorar', label: 'Ignorar', icon: XCircle },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTipo(opt.value as ConciliacaoTipo)}
              className={cn(
                'flex items-center gap-2 p-2 rounded-lg border text-xs transition-all',
                tipo === opt.value
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'hover:bg-muted/50'
              )}
            >
              <opt.icon className="h-3.5 w-3.5" />
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content based on type */}
      <div className="flex-1 overflow-y-auto p-4">
        {tipo === 'vincular' && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar título..."
                value={tituloSearch}
                onChange={(e) => setTituloSearch(e.target.value)}
                className="pl-8 h-9"
              />
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {filteredTitulos.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  Nenhum título encontrado
                </p>
              ) : (
                filteredTitulos.map((titulo) => (
                  <button
                    key={titulo.id}
                    onClick={() => setSelectedTituloId(titulo.id)}
                    className={cn(
                      'w-full flex items-center gap-2 p-2 rounded-lg border text-left transition-all',
                      selectedTituloId === titulo.id
                        ? 'border-primary bg-primary/5'
                        : 'hover:bg-muted/50'
                    )}
                  >
                    <div className={cn(
                      'w-1 h-8 rounded-full shrink-0',
                      titulo.tipo === 'receber' ? 'bg-emerald-500' : 'bg-rose-500'
                    )} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{titulo.descricao}</p>
                      {titulo.pessoa && (
                        <p className="text-[10px] text-muted-foreground truncate">{titulo.pessoa}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className={cn(
                        'font-mono text-xs font-medium',
                        titulo.tipo === 'receber' ? 'text-emerald-600' : 'text-rose-600'
                      )}>
                        R$ {titulo.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {tipo === 'criar' && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Criar um novo título a partir desta linha:
            </p>
            <Button variant="outline" className="w-full" onClick={() => onCriarTitulo(linha.id, {})}>
              <Plus className="h-4 w-4 mr-2" />
              Abrir formulário de título
            </Button>
          </div>
        )}

        {tipo === 'lancamento' && (
          <div className="space-y-3">
            <div>
              <LabelWithHelp
                label="Tipo rápido"
                help="Selecione um tipo para preencher as contas automaticamente"
              />
              <Select value={lancamentoTipo} onValueChange={setLancamentoTipo}>
                <SelectTrigger className="h-9 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_LANCAMENTO.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {lancamentoTipo && (
              <div className="p-3 rounded-lg bg-muted/50 text-xs space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Débito:</span>
                  <span className="font-medium">
                    {TIPOS_LANCAMENTO.find(t => t.value === lancamentoTipo)?.debito || '—'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Crédito:</span>
                  <span className="font-medium">
                    {TIPOS_LANCAMENTO.find(t => t.value === lancamentoTipo)?.credito || '—'}
                  </span>
                </div>
              </div>
            )}

            <div>
              <LabelWithHelp label="Histórico" help="Descrição do lançamento contábil" />
              <Input
                value={lancamentoHistorico}
                onChange={(e) => setLancamentoHistorico(e.target.value)}
                placeholder={`Ex: ${TIPOS_LANCAMENTO.find(t => t.value === lancamentoTipo)?.label} ${linha.data}`}
                className="h-9 mt-1"
              />
            </div>
          </div>
        )}

        {tipo === 'ignorar' && (
          <div className="space-y-3">
            <div>
              <LabelWithHelp label="Motivo" help="Por que esta linha deve ser ignorada" />
              <Select value={ignorarMotivo} onValueChange={setIgnorarMotivo}>
                <SelectTrigger className="h-9 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MOTIVOS_IGNORAR.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {ignorarMotivo === 'outro' && (
              <div>
                <LabelWithHelp label="Observação" help="Mínimo 10 caracteres" />
                <Textarea
                  value={ignorarObservacao}
                  onChange={(e) => setIgnorarObservacao(e.target.value)}
                  placeholder="Explique o motivo..."
                  className="mt-1 min-h-[80px]"
                />
                {ignorarObservacao.length > 0 && ignorarObservacao.length < 10 && (
                  <p className="text-xs text-rose-600 mt-1">
                    Mínimo 10 caracteres ({ignorarObservacao.length}/10)
                  </p>
                )}
              </div>
            )}

            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs">
              <p className="text-amber-700">
                Linhas ignoradas não são contabilizadas. Use apenas quando o movimento não deve gerar lançamento.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-4 border-t bg-muted/30">
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            className={cn(
              'flex-1',
              tipo === 'ignorar' && 'bg-rose-600 hover:bg-rose-700',
              tipo === 'vincular' && 'bg-emerald-600 hover:bg-emerald-700'
            )}
            onClick={handleConfirm}
            disabled={!canConfirm() || isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                {tipo === 'vincular' && <Link2 className="h-4 w-4 mr-1" />}
                {tipo === 'ignorar' && <XCircle className="h-4 w-4 mr-1" />}
                {tipo === 'vincular' && 'Vincular'}
                {tipo === 'criar' && 'Criar'}
                {tipo === 'lancamento' && 'Lançar'}
                {tipo === 'ignorar' && 'Ignorar'}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}




