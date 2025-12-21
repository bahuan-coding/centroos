import { User, Building2, AlertTriangle, ExternalLink, RotateCcw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LabelWithHelp } from '@/components/ui/tooltip-help';
import { useWizard, Documento } from '../WizardProvider';
import { cn } from '@/lib/utils';
import { formatDocument } from '@/lib/validators';
import { toast } from 'sonner';

const DOCUMENTO_LABELS: Record<string, string> = {
  cpf: 'CPF',
  cnpj: 'CNPJ',
  rg: 'RG',
};

export function StepIdentificacao() {
  const { 
    form, 
    updateField, 
    setForm, 
    errors, 
    fieldRefs,
    duplicidade,
    setDuplicidade,
    ignorarDuplicidade,
    setIgnorarDuplicidade,
    duplicidadeNome,
    setDuplicidadeNome,
    ignorarDuplicidadeNome,
    setIgnorarDuplicidadeNome,
    checkDuplicidade,
    checkDuplicidadeNome,
  } = useWizard();
  
  const handleTipoChange = (tipo: 'fisica' | 'juridica') => {
    updateField('tipo', tipo);
    // Reset documento principal ao trocar tipo
    const docPrincipal = tipo === 'fisica' ? 'cpf' : 'cnpj';
    if (form.documentos.length === 0) {
      setForm(f => ({ ...f, documentos: [{ tipo: docPrincipal, numero: '' }] }));
    }
  };
  
  const addDocumento = () => {
    const defaultTipo = form.tipo === 'fisica' ? 'cpf' : 'cnpj';
    setForm(f => ({ ...f, documentos: [...f.documentos, { tipo: defaultTipo, numero: '' }] }));
  };
  
  const updateDocumento = (index: number, updates: Partial<Documento>) => {
    setForm(f => ({
      ...f,
      documentos: f.documentos.map((d, i) => i === index ? { ...d, ...updates } : d),
    }));
  };
  
  const removeDocumento = (index: number) => {
    setForm(f => ({ ...f, documentos: f.documentos.filter((_, i) => i !== index) }));
  };
  
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold text-zinc-900 mb-2">Identificação</h2>
        <p className="text-sm text-zinc-500">
          Informe os dados básicos e o documento principal.
        </p>
      </div>
      
      {/* Tipo de Pessoa */}
      <div className="space-y-3">
        <LabelWithHelp 
          label="Tipo de Pessoa" 
          help="Pessoa Física: indivíduo (CPF). Pessoa Jurídica: empresa (CNPJ)." 
          required 
        />
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => handleTipoChange('fisica')}
            className={cn(
              "relative flex items-center gap-4 p-5 rounded-2xl border-2 transition-all group",
              form.tipo === 'fisica' 
                ? "border-violet-500 bg-gradient-to-br from-violet-50 to-violet-100/50 shadow-lg shadow-violet-500/10" 
                : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"
            )}
          >
            <div className={cn(
              "flex items-center justify-center w-12 h-12 rounded-xl transition-all",
              form.tipo === 'fisica' 
                ? "bg-gradient-to-br from-violet-500 to-violet-600 text-white shadow-lg shadow-violet-500/25" 
                : "bg-zinc-100 text-zinc-400 group-hover:bg-zinc-200"
            )}>
              <User className="h-6 w-6" />
            </div>
            <div className="text-left">
              <div className={cn("font-semibold", form.tipo === 'fisica' ? "text-zinc-900" : "text-zinc-600")}>Pessoa Física</div>
              <div className="text-xs text-zinc-500">CPF</div>
            </div>
            {form.tipo === 'fisica' && (
              <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-violet-500" />
            )}
          </button>
          <button
            type="button"
            onClick={() => handleTipoChange('juridica')}
            className={cn(
              "relative flex items-center gap-4 p-5 rounded-2xl border-2 transition-all group",
              form.tipo === 'juridica' 
                ? "border-violet-500 bg-gradient-to-br from-violet-50 to-violet-100/50 shadow-lg shadow-violet-500/10" 
                : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"
            )}
          >
            <div className={cn(
              "flex items-center justify-center w-12 h-12 rounded-xl transition-all",
              form.tipo === 'juridica' 
                ? "bg-gradient-to-br from-violet-500 to-violet-600 text-white shadow-lg shadow-violet-500/25" 
                : "bg-zinc-100 text-zinc-400 group-hover:bg-zinc-200"
            )}>
              <Building2 className="h-6 w-6" />
            </div>
            <div className="text-left">
              <div className={cn("font-semibold", form.tipo === 'juridica' ? "text-zinc-900" : "text-zinc-600")}>Pessoa Jurídica</div>
              <div className="text-xs text-zinc-500">CNPJ</div>
            </div>
            {form.tipo === 'juridica' && (
              <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-violet-500" />
            )}
          </button>
        </div>
      </div>
      
      {/* Nome */}
      <div className="space-y-3">
        <LabelWithHelp 
          htmlFor="nome" 
          label={form.tipo === 'fisica' ? 'Nome Completo' : 'Razão Social'} 
          help={form.tipo === 'fisica' ? 'Nome completo conforme documento de identidade.' : 'Razão social conforme CNPJ.'} 
          required 
        />
        <Input
          id="nome"
          ref={el => { fieldRefs.current['nome'] = el; }}
          value={form.nome}
          onChange={e => updateField('nome', e.target.value)}
          onBlur={checkDuplicidadeNome}
          placeholder={form.tipo === 'fisica' ? 'Ex: Maria da Silva Santos' : 'Ex: Empresa ABC Ltda'}
          className={cn(
            "h-12 text-base rounded-xl border-zinc-200 bg-white placeholder:text-zinc-400 focus:border-violet-500 focus:ring-violet-500/20",
            errors.nome && "border-red-400 focus:border-red-500 focus:ring-red-500/20"
          )}
          aria-invalid={!!errors.nome}
          aria-describedby={errors.nome ? 'nome-error' : undefined}
          autoFocus
        />
        {errors.nome && (
          <p id="nome-error" className="text-sm text-red-600 flex items-center gap-1.5" role="alert" aria-live="polite">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" /> {errors.nome}
          </p>
        )}
      </div>
      
      {/* Apelido / Nome Fantasia */}
      <div className="space-y-3">
        <LabelWithHelp 
          htmlFor="nomeFantasia" 
          label={form.tipo === 'fisica' ? 'Apelido' : 'Nome Fantasia'} 
          help={form.tipo === 'fisica' ? 'Como a pessoa é conhecida na comunidade.' : 'Nome fantasia da empresa.'} 
        />
        <Input
          id="nomeFantasia"
          value={form.nomeFantasia}
          onChange={e => updateField('nomeFantasia', e.target.value)}
          placeholder={form.tipo === 'fisica' ? 'Ex: Dona Maria' : 'Ex: Loja do Zé'}
          className="h-12 rounded-xl border-zinc-200 bg-white placeholder:text-zinc-400 focus:border-violet-500 focus:ring-violet-500/20"
        />
      </div>
      
      {/* Documento Principal */}
      <div className="space-y-3">
        <LabelWithHelp 
          label={form.tipo === 'fisica' ? 'CPF' : 'CNPJ'} 
          help={form.tipo === 'fisica' ? 'CPF é necessário para emissão de recibos de doação.' : 'CNPJ é obrigatório para empresas.'} 
        />
        
        {form.documentos.length === 0 ? (
          <Button
            type="button"
            variant="outline"
            onClick={addDocumento}
            className="w-full h-12 rounded-xl border-dashed border-2 border-zinc-300 text-zinc-500 hover:border-violet-400 hover:text-violet-600 hover:bg-violet-50/50 transition-all"
          >
            + Adicionar {form.tipo === 'fisica' ? 'CPF' : 'CNPJ'}
          </Button>
        ) : (
          <div className="space-y-3">
            {form.documentos.map((doc, index) => (
              <div key={index} className="flex gap-3 items-start">
                <Select 
                  value={doc.tipo} 
                  onValueChange={(v: Documento['tipo']) => updateDocumento(index, { tipo: v })}
                >
                  <SelectTrigger className="w-28 h-12 rounded-xl border-zinc-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(DOCUMENTO_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex-1">
                  <Input
                    ref={el => { fieldRefs.current[`doc_${index}`] = el; }}
                    value={formatDocument(doc.tipo, doc.numero)}
                    onChange={e => {
                      const rawValue = e.target.value.replace(/\D/g, '');
                      updateDocumento(index, { numero: rawValue });
                    }}
                    onBlur={() => checkDuplicidade(doc)}
                    placeholder={doc.tipo === 'cpf' ? '000.000.000-00' : '00.000.000/0000-00'}
                    className={cn(
                      "h-12 rounded-xl border-zinc-200 bg-white font-mono tracking-wide placeholder:font-sans placeholder:tracking-normal focus:border-violet-500 focus:ring-violet-500/20",
                      errors[`doc_${index}`] && "border-red-400"
                    )}
                    aria-invalid={!!errors[`doc_${index}`]}
                    aria-describedby={errors[`doc_${index}`] ? `doc-${index}-error` : undefined}
                    maxLength={doc.tipo === 'cpf' ? 14 : 18}
                  />
                  {errors[`doc_${index}`] && (
                    <p id={`doc-${index}-error`} className="text-xs text-red-600 mt-1.5" role="alert">{errors[`doc_${index}`]}</p>
                  )}
                </div>
                {form.documentos.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeDocumento(index)}
                    className="h-12 w-12 rounded-xl text-zinc-400 hover:text-red-500 hover:bg-red-50"
                  >
                    ×
                  </Button>
                )}
              </div>
            ))}
            {form.documentos.length < 3 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={addDocumento}
                className="text-zinc-500 hover:text-violet-600"
              >
                + Adicionar outro documento
              </Button>
            )}
          </div>
        )}
      </div>
      
      {/* Duplicidade por Documento */}
      {duplicidade?.encontrado && !ignorarDuplicidade && (
        <div className={cn(
          'rounded-lg border p-4',
          duplicidade.ativo ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-slate-50'
        )}>
          <div className="flex items-start gap-3">
            <AlertTriangle className={cn('h-5 w-5 shrink-0', duplicidade.ativo ? 'text-amber-600' : 'text-slate-500')} />
            <div className="flex-1">
              <p className="font-medium text-sm">
                {duplicidade.ativo ? 'Cadastro existente encontrado' : 'Encontramos cadastro inativo'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {duplicidade.nome} ({duplicidade.documentoMascarado})
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(`/pessoas?id=${duplicidade.pessoaId}`, '_blank')}
                >
                  <ExternalLink className="h-3 w-3 mr-1.5" />
                  Ver cadastro
                </Button>
                {duplicidade.inativo && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-emerald-500 text-emerald-600"
                    onClick={() => toast.info('Reativar pelo cadastro existente')}
                  >
                    <RotateCcw className="h-3 w-3 mr-1.5" />
                    Reativar
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-muted-foreground"
                  onClick={() => {
                    setIgnorarDuplicidade(true);
                    setDuplicidade(null);
                  }}
                >
                  É outra pessoa
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Duplicidade por Nome */}
      {duplicidadeNome && duplicidadeNome.possiveis.length > 0 && !ignorarDuplicidadeNome && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-blue-600" />
            <div className="flex-1">
              <p className="font-medium text-sm text-blue-800">Possíveis cadastros similares</p>
              <div className="mt-2 space-y-1">
                {duplicidadeNome.possiveis.slice(0, 3).map(p => (
                  <div key={p.id} className="flex items-center gap-2 text-sm">
                    <span className={cn(!p.ativo && 'text-muted-foreground line-through')}>
                      {p.nome}
                    </span>
                    {!p.ativo && <Badge variant="outline" className="text-[10px]">Inativo</Badge>}
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-xs text-blue-600"
                      onClick={() => window.open(`/pessoas?id=${p.id}`, '_blank')}
                    >
                      Ver
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="mt-2 text-muted-foreground"
                onClick={() => {
                  setIgnorarDuplicidadeNome(true);
                  setDuplicidadeNome(null);
                }}
              >
                Nenhum destes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

