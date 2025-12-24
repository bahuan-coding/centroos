import { User, Building2, Phone, MapPin, FileText, Sparkles, Edit2, AlertTriangle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWizard } from '../WizardProvider';
import { PendenciasPanel } from '../PendenciasPanel';
import { cn } from '@/lib/utils';
import { formatDocument, formatContact, formatCEP } from '@/lib/validators';

export function StepRevisao() {
  const { form, goToStep, warnings, steps } = useWizard();
  
  const temDados = {
    identificacao: !!form.nome,
    contatos: form.contatos.length > 0,
    enderecos: form.enderecos.length > 0,
    complementos: form.documentos.some(d => d.tipo !== 'cpf' && d.tipo !== 'cnpj') || !!form.observacoes,
    mediunidade: form.tiposMediunidade.length > 0 || !!form.dataInicioDesenvolvimento,
  };
  
  const contatoPrincipal = form.contatos.find(c => c.principal);
  const enderecoPrincipal = form.enderecos.find(e => e.principal);
  const docPrincipal = form.documentos.find(d => d.tipo === 'cpf' || d.tipo === 'cnpj');
  
  const getStepIndex = (stepId: string) => steps.findIndex(s => s.id === stepId);
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2 mb-1">
          ✅ Revisão
        </h2>
        <p className="text-sm text-muted-foreground">
          Confira os dados antes de finalizar o cadastro.
        </p>
      </div>
      
      {/* Pendências */}
      {warnings.length > 0 && (
        <PendenciasPanel />
      )}
      
      {/* Cards de Resumo */}
      <div className="space-y-3">
        
        {/* Identificação */}
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              {form.tipo === 'fisica' ? <User className="h-5 w-5 text-violet-600" /> : <Building2 className="h-5 w-5 text-violet-600" />}
              <h3 className="font-medium">Identificação</h3>
              <Check className="h-4 w-4 text-emerald-500" />
            </div>
            <Button variant="ghost" size="sm" onClick={() => goToStep(getStepIndex('identificacao'))}>
              <Edit2 className="h-3 w-3 mr-1" />
              Editar
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Nome:</span>
              <p className="font-medium">{form.nome || '—'}</p>
            </div>
            {form.nomeFantasia && (
              <div>
                <span className="text-muted-foreground">{form.tipo === 'fisica' ? 'Apelido:' : 'Nome Fantasia:'}</span>
                <p className="font-medium">{form.nomeFantasia}</p>
              </div>
            )}
            <div>
              <span className="text-muted-foreground">{form.tipo === 'fisica' ? 'CPF:' : 'CNPJ:'}</span>
              <p className="font-medium">
                {docPrincipal ? formatDocument(docPrincipal.tipo, docPrincipal.numero) : <span className="text-amber-600">Não informado</span>}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Tipo:</span>
              <p className="font-medium">{form.tipo === 'fisica' ? 'Pessoa Física' : 'Pessoa Jurídica'}</p>
            </div>
          </div>
        </div>
        
        {/* Contatos */}
        <div className={cn(
          "rounded-lg border bg-card p-4",
          !temDados.contatos && "opacity-60"
        )}>
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-violet-600" />
              <h3 className="font-medium">Contatos</h3>
              {temDados.contatos ? (
                <Badge variant="secondary" className="text-xs">{form.contatos.length}</Badge>
              ) : (
                <Badge variant="outline" className="text-xs text-amber-600">Opcional</Badge>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={() => goToStep(getStepIndex('contatos'))}>
              <Edit2 className="h-3 w-3 mr-1" />
              {temDados.contatos ? 'Editar' : 'Adicionar'}
            </Button>
          </div>
          {temDados.contatos ? (
            <div className="space-y-2 text-sm">
              {form.contatos.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className={cn(c.principal && "font-medium")}>
                    {c.tipo === 'email' ? c.valor : formatContact(c.tipo, c.valor)}
                  </span>
                  <Badge variant="outline" className="text-[10px]">{c.tipo}</Badge>
                  {c.principal && <Badge className="text-[10px] bg-violet-100 text-violet-700">Principal</Badge>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum contato cadastrado</p>
          )}
        </div>
        
        {/* Endereços */}
        <div className={cn(
          "rounded-lg border bg-card p-4",
          !temDados.enderecos && "opacity-60"
        )}>
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-violet-600" />
              <h3 className="font-medium">Endereços</h3>
              {temDados.enderecos ? (
                <Badge variant="secondary" className="text-xs">{form.enderecos.length}</Badge>
              ) : (
                <Badge variant="outline" className="text-xs text-amber-600">Opcional</Badge>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={() => goToStep(getStepIndex('enderecos'))}>
              <Edit2 className="h-3 w-3 mr-1" />
              {temDados.enderecos ? 'Editar' : 'Adicionar'}
            </Button>
          </div>
          {temDados.enderecos ? (
            <div className="space-y-2 text-sm">
              {form.enderecos.map((e, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className={cn(e.principal && "font-medium")}>
                    {e.logradouro}{e.numero && `, ${e.numero}`}
                    {e.bairro && ` - ${e.bairro}`}
                    <br />
                    <span className="text-muted-foreground">
                      {e.cidade}/{e.uf} {e.cep && `- ${formatCEP(e.cep)}`}
                    </span>
                  </div>
                  {e.principal && <Badge className="text-[10px] bg-violet-100 text-violet-700 shrink-0">Principal</Badge>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum endereço cadastrado</p>
          )}
        </div>
        
        {/* Complementos */}
        {temDados.complementos && (
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-violet-600" />
                <h3 className="font-medium">Complementos</h3>
              </div>
              <Button variant="ghost" size="sm" onClick={() => goToStep(getStepIndex('complementos'))}>
                <Edit2 className="h-3 w-3 mr-1" />
                Editar
              </Button>
            </div>
            <div className="space-y-2 text-sm">
              {form.documentos.filter(d => d.tipo !== 'cpf' && d.tipo !== 'cnpj').map((d, i) => (
                <div key={i}>
                  <span className="text-muted-foreground">{d.tipo.toUpperCase()}:</span>{' '}
                  <span className="font-medium">{d.numero}</span>
                </div>
              ))}
              {form.observacoes && (
                <div>
                  <span className="text-muted-foreground">Observações:</span>
                  <p className="text-muted-foreground italic mt-1">"{form.observacoes.slice(0, 100)}{form.observacoes.length > 100 ? '...' : ''}"</p>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Mediunidade */}
        {form.tipo === 'fisica' && temDados.mediunidade && (
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-violet-600" />
                <h3 className="font-medium">Mediunidade</h3>
                <Badge variant="outline" className="text-[10px]">LGPD</Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={() => goToStep(getStepIndex('mediunidade'))}>
                <Edit2 className="h-3 w-3 mr-1" />
                Editar
              </Button>
            </div>
            <div className="space-y-2 text-sm">
              {form.dataInicioDesenvolvimento && (
                <div>
                  <span className="text-muted-foreground">Início:</span>{' '}
                  <span className="font-medium">
                    {new Date(form.dataInicioDesenvolvimento).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              )}
              {form.tiposMediunidade.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {form.tiposMediunidade.map(t => (
                    <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Summary */}
      <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4">
        <div className="flex items-start gap-3">
          <Check className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-emerald-800">Pronto para cadastrar</p>
            <p className="text-sm text-emerald-700 mt-1">
              Clique em "Cadastrar" para finalizar. Você poderá editar os dados posteriormente.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}










