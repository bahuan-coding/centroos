import { Mail, Phone, Smartphone, MessageCircle, Star, Trash2, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useWizard, Contato } from '../WizardProvider';
import { cn } from '@/lib/utils';
import { formatContact } from '@/lib/validators';

const CONTATO_CONFIG = {
  email: { label: 'E-mail', icon: Mail, placeholder: 'email@exemplo.com' },
  telefone: { label: 'Telefone Fixo', icon: Phone, placeholder: '(00) 0000-0000' },
  celular: { label: 'Celular', icon: Smartphone, placeholder: '(00) 00000-0000' },
  whatsapp: { label: 'WhatsApp', icon: MessageCircle, placeholder: '(00) 00000-0000' },
};

export function StepContatos() {
  const { form, setForm, errors, fieldRefs } = useWizard();
  
  const addContato = () => {
    const newContato: Contato = {
      tipo: 'celular',
      valor: '',
      principal: form.contatos.length === 0,
    };
    setForm(f => ({ ...f, contatos: [...f.contatos, newContato] }));
  };
  
  const updateContato = (index: number, updates: Partial<Contato>) => {
    setForm(f => ({
      ...f,
      contatos: f.contatos.map((c, i) => i === index ? { ...c, ...updates } : c),
    }));
  };
  
  const removeContato = (index: number) => {
    setForm(f => {
      const newContatos = f.contatos.filter((_, i) => i !== index);
      // Se removeu o principal e ainda tem contatos, define o primeiro como principal
      if (f.contatos[index]?.principal && newContatos.length > 0) {
        newContatos[0].principal = true;
      }
      return { ...f, contatos: newContatos };
    });
  };
  
  const setPrincipal = (index: number) => {
    setForm(f => ({
      ...f,
      contatos: f.contatos.map((c, i) => ({ ...c, principal: i === index })),
    }));
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2 mb-1">
          📞 Contatos
        </h2>
        <p className="text-sm text-muted-foreground">
          E-mail é importante para envio de recibos digitais. Marque o contato principal.
        </p>
      </div>
      
      {form.contatos.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <div className="text-4xl mb-3">📱</div>
          <p className="text-muted-foreground mb-4">Nenhum contato cadastrado ainda</p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setForm(f => ({ ...f, contatos: [{ tipo: 'email', valor: '', principal: true }] }));
              }}
            >
              <Mail className="h-4 w-4 mr-2" />
              Adicionar E-mail
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setForm(f => ({ ...f, contatos: [{ tipo: 'celular', valor: '', principal: true }] }));
              }}
            >
              <Smartphone className="h-4 w-4 mr-2" />
              Adicionar Celular
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {form.contatos.map((contato, index) => {
            const config = CONTATO_CONFIG[contato.tipo];
            const Icon = config.icon;
            
            return (
              <div
                key={index}
                className={cn(
                  "relative p-4 rounded-lg border transition-all",
                  contato.principal ? "border-violet-300 bg-violet-50/50" : "border-muted bg-muted/30"
                )}
              >
                {contato.principal && (
                  <div className="absolute -top-2 left-3 px-2 bg-violet-100 text-violet-700 text-[10px] font-medium rounded-full flex items-center gap-1">
                    <Star className="h-3 w-3 fill-violet-500" />
                    Principal
                  </div>
                )}
                
                <div className="flex gap-3 items-start">
                  <div className="w-40">
                    <Select
                      value={contato.tipo}
                      onValueChange={(v: Contato['tipo']) => updateContato(index, { tipo: v })}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue>
                          <span className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {config.label}
                          </span>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(CONTATO_CONFIG).map(([k, v]) => (
                          <SelectItem key={k} value={k}>
                            <span className="flex items-center gap-2">
                              <v.icon className="h-4 w-4" />
                              {v.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex-1">
                    <Input
                      ref={el => { fieldRefs.current[`contato_${index}`] = el; }}
                      value={contato.tipo === 'email' ? contato.valor : formatContact(contato.tipo, contato.valor)}
                      onChange={e => {
                        const value = contato.tipo === 'email' ? e.target.value : e.target.value.replace(/\D/g, '');
                        updateContato(index, { valor: value });
                      }}
                      placeholder={config.placeholder}
                      className={cn("h-11", errors[`contato_${index}`] && "border-destructive")}
                      aria-invalid={!!errors[`contato_${index}`]}
                      aria-describedby={errors[`contato_${index}`] ? `contato-${index}-error` : undefined}
                      maxLength={contato.tipo === 'email' ? 100 : 15}
                    />
                    {errors[`contato_${index}`] && (
                      <p id={`contato-${index}-error`} className="text-xs text-destructive mt-1" role="alert">{errors[`contato_${index}`]}</p>
                    )}
                  </div>
                  
                  <div className="flex gap-1">
                    {!contato.principal && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setPrincipal(index)}
                        className="h-11 w-11 text-muted-foreground hover:text-violet-600"
                        title="Definir como principal"
                      >
                        <Star className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeContato(index)}
                      className="h-11 w-11 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
          
          {form.contatos.length < 10 && (
            <Button
              type="button"
              variant="outline"
              onClick={addContato}
              className="w-full h-12 border-dashed"
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Contato
            </Button>
          )}
        </div>
      )}
      
      {/* Dica */}
      <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
        💡 <strong>Dica:</strong> O contato principal será usado para comunicações importantes como envio de recibos.
      </div>
    </div>
  );
}

