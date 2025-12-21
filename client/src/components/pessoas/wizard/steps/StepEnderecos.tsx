import { MapPin, Home, Building, Mail, Star, Trash2, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useWizard, Endereco } from '../WizardProvider';
import { CepInput } from '../../shared/CepInput';
import { cn } from '@/lib/utils';
import { ViaCepResponse } from '@/lib/viaCep';

const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];

const ENDERECO_CONFIG = {
  residencial: { label: 'Residencial', icon: Home },
  comercial: { label: 'Comercial', icon: Building },
  correspondencia: { label: 'Correspondência', icon: Mail },
};

export function StepEnderecos() {
  const { form, setForm, errors, fieldRefs } = useWizard();
  
  const addEndereco = () => {
    const newEndereco: Endereco = {
      tipo: 'residencial',
      logradouro: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      uf: '',
      cep: '',
      principal: form.enderecos.length === 0,
    };
    setForm(f => ({ ...f, enderecos: [...f.enderecos, newEndereco] }));
  };
  
  const updateEndereco = (index: number, updates: Partial<Endereco>) => {
    setForm(f => ({
      ...f,
      enderecos: f.enderecos.map((e, i) => i === index ? { ...e, ...updates } : e),
    }));
  };
  
  const removeEndereco = (index: number) => {
    setForm(f => {
      const newEnderecos = f.enderecos.filter((_, i) => i !== index);
      if (f.enderecos[index]?.principal && newEnderecos.length > 0) {
        newEnderecos[0].principal = true;
      }
      return { ...f, enderecos: newEnderecos };
    });
  };
  
  const setPrincipal = (index: number) => {
    setForm(f => ({
      ...f,
      enderecos: f.enderecos.map((e, i) => ({ ...e, principal: i === index })),
    }));
  };
  
  const handleCepFound = (index: number, data: ViaCepResponse) => {
    updateEndereco(index, {
      logradouro: data.logradouro || '',
      bairro: data.bairro || '',
      cidade: data.localidade || '',
      uf: data.uf || '',
    });
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2 mb-1">
          📍 Endereços
        </h2>
        <p className="text-sm text-muted-foreground">
          Endereço completo é necessário para emissão de recibos e correspondências oficiais.
        </p>
      </div>
      
      {form.enderecos.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground mb-4">Nenhum endereço cadastrado ainda</p>
          <Button type="button" variant="outline" onClick={addEndereco}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Endereço
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {form.enderecos.map((endereco, index) => {
            const config = ENDERECO_CONFIG[endereco.tipo];
            const Icon = config.icon;
            
            return (
              <div
                key={index}
                className={cn(
                  "relative p-4 rounded-lg border transition-all",
                  endereco.principal ? "border-violet-300 bg-violet-50/50" : "border-muted bg-muted/30"
                )}
              >
                {endereco.principal && (
                  <div className="absolute -top-2 left-3 px-2 bg-violet-100 text-violet-700 text-[10px] font-medium rounded-full flex items-center gap-1">
                    <Star className="h-3 w-3 fill-violet-500" />
                    Principal
                  </div>
                )}
                
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <Select
                      value={endereco.tipo}
                      onValueChange={(v: Endereco['tipo']) => updateEndereco(index, { tipo: v })}
                    >
                      <SelectTrigger className="w-44 h-10">
                        <SelectValue>
                          <span className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {config.label}
                          </span>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(ENDERECO_CONFIG).map(([k, v]) => (
                          <SelectItem key={k} value={k}>
                            <span className="flex items-center gap-2">
                              <v.icon className="h-4 w-4" />
                              {v.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <div className="flex gap-1">
                      {!endereco.principal && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setPrincipal(index)}
                          className="text-muted-foreground hover:text-violet-600"
                        >
                          <Star className="h-4 w-4 mr-1" />
                          Principal
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeEndereco(index)}
                        className="h-9 w-9 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* CEP */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">CEP</label>
                      <CepInput
                        value={endereco.cep}
                        onChange={cep => updateEndereco(index, { cep })}
                        onAddressFound={data => handleCepFound(index, data)}
                      />
                    </div>
                  </div>
                  
                  {/* Logradouro + Número */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="sm:col-span-3">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Logradouro</label>
                      <Input
                        ref={el => { fieldRefs.current[`end_${index}_logradouro`] = el; }}
                        value={endereco.logradouro}
                        onChange={e => updateEndereco(index, { logradouro: e.target.value })}
                        placeholder="Rua, Avenida, Praça..."
                        className={cn("h-11", errors[`end_${index}_logradouro`] && "border-destructive")}
                        aria-invalid={!!errors[`end_${index}_logradouro`]}
                        aria-describedby={errors[`end_${index}_logradouro`] ? `end-${index}-logradouro-error` : undefined}
                      />
                      {errors[`end_${index}_logradouro`] && (
                        <p id={`end-${index}-logradouro-error`} className="text-xs text-destructive mt-1" role="alert">{errors[`end_${index}_logradouro`]}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Número</label>
                      <Input
                        value={endereco.numero}
                        onChange={e => updateEndereco(index, { numero: e.target.value })}
                        placeholder="Nº"
                        className="h-11"
                      />
                    </div>
                  </div>
                  
                  {/* Complemento + Bairro */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Complemento</label>
                      <Input
                        value={endereco.complemento}
                        onChange={e => updateEndereco(index, { complemento: e.target.value })}
                        placeholder="Apto, Sala, Bloco..."
                        className="h-11"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Bairro</label>
                      <Input
                        value={endereco.bairro}
                        onChange={e => updateEndereco(index, { bairro: e.target.value })}
                        placeholder="Bairro"
                        className="h-11"
                      />
                    </div>
                  </div>
                  
                  {/* Cidade + UF */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Cidade</label>
                      <Input
                        ref={el => { fieldRefs.current[`end_${index}_cidade`] = el; }}
                        value={endereco.cidade}
                        onChange={e => updateEndereco(index, { cidade: e.target.value })}
                        placeholder="Cidade"
                        className={cn("h-11", errors[`end_${index}_cidade`] && "border-destructive")}
                        aria-invalid={!!errors[`end_${index}_cidade`]}
                        aria-describedby={errors[`end_${index}_cidade`] ? `end-${index}-cidade-error` : undefined}
                      />
                      {errors[`end_${index}_cidade`] && (
                        <p id={`end-${index}-cidade-error`} className="text-xs text-destructive mt-1" role="alert">{errors[`end_${index}_cidade`]}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">UF</label>
                      <Select
                        value={endereco.uf}
                        onValueChange={uf => updateEndereco(index, { uf })}
                      >
                        <SelectTrigger 
                          ref={el => { if (el) fieldRefs.current[`end_${index}_uf`] = el; }}
                          className={cn("h-11", errors[`end_${index}_uf`] && "border-destructive")}
                          aria-invalid={!!errors[`end_${index}_uf`]}
                          aria-describedby={errors[`end_${index}_uf`] ? `end-${index}-uf-error` : undefined}
                        >
                          <SelectValue placeholder="UF" />
                        </SelectTrigger>
                        <SelectContent>
                          {UFS.map(uf => (
                            <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors[`end_${index}_uf`] && (
                        <p id={`end-${index}-uf-error`} className="text-xs text-destructive mt-1" role="alert">{errors[`end_${index}_uf`]}</p>
                      )}
                    </div>
                  </div>
                  
                  {/* Sem número */}
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={endereco.numero === 'S/N'}
                      onCheckedChange={checked => updateEndereco(index, { numero: checked ? 'S/N' : '' })}
                    />
                    <span className="text-muted-foreground">Sem número</span>
                  </label>
                </div>
              </div>
            );
          })}
          
          {form.enderecos.length < 5 && (
            <Button
              type="button"
              variant="outline"
              onClick={addEndereco}
              className="w-full h-12 border-dashed"
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Endereço
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

