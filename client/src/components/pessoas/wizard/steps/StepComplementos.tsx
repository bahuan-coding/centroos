import { FileText, Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LabelWithHelp } from '@/components/ui/tooltip-help';
import { useWizard, Documento } from '../WizardProvider';
import { cn } from '@/lib/utils';
import { formatDocument } from '@/lib/validators';

const DOCUMENTO_LABELS: Record<string, string> = {
  rg: 'RG',
  ie: 'Inscrição Estadual',
  im: 'Inscrição Municipal',
};

export function StepComplementos() {
  const { form, setForm, updateField, errors, fieldRefs } = useWizard();
  
  // Filtrar documentos extras (sem CPF/CNPJ que já foi preenchido na etapa 1)
  const documentosExtras = form.documentos.filter(d => d.tipo !== 'cpf' && d.tipo !== 'cnpj');
  
  const addDocumento = () => {
    setForm(f => ({ ...f, documentos: [...f.documentos, { tipo: 'rg', numero: '' }] }));
  };
  
  const updateDocumento = (docIndex: number, updates: Partial<Documento>) => {
    // Encontrar o índice real no array completo
    let realIndex = 0;
    let extrasCount = 0;
    for (let i = 0; i < form.documentos.length; i++) {
      if (form.documentos[i].tipo !== 'cpf' && form.documentos[i].tipo !== 'cnpj') {
        if (extrasCount === docIndex) {
          realIndex = i;
          break;
        }
        extrasCount++;
      }
    }
    
    setForm(f => ({
      ...f,
      documentos: f.documentos.map((d, i) => i === realIndex ? { ...d, ...updates } : d),
    }));
  };
  
  const removeDocumento = (docIndex: number) => {
    let realIndex = 0;
    let extrasCount = 0;
    for (let i = 0; i < form.documentos.length; i++) {
      if (form.documentos[i].tipo !== 'cpf' && form.documentos[i].tipo !== 'cnpj') {
        if (extrasCount === docIndex) {
          realIndex = i;
          break;
        }
        extrasCount++;
      }
    }
    
    setForm(f => ({ ...f, documentos: f.documentos.filter((_, i) => i !== realIndex) }));
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2 mb-1">
          📄 Complementos
        </h2>
        <p className="text-sm text-muted-foreground">
          Documentos adicionais e observações gerais (opcional).
        </p>
      </div>
      
      {/* Documentos Extras */}
      <div className="space-y-4">
        <LabelWithHelp 
          label="Documentos Adicionais" 
          help="RG, Inscrição Estadual/Municipal ou outros documentos." 
        />
        
        {documentosExtras.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed rounded-lg">
            <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-3">Nenhum documento adicional</p>
            <Button type="button" variant="outline" size="sm" onClick={addDocumento}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Documento
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {documentosExtras.map((doc, index) => (
              <div key={index} className="flex gap-2 items-start p-3 rounded-lg border bg-muted/30">
                <Select 
                  value={doc.tipo} 
                  onValueChange={(v: Documento['tipo']) => updateDocumento(index, { tipo: v })}
                >
                  <SelectTrigger className="w-40 h-11">
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
                    value={formatDocument(doc.tipo, doc.numero)}
                    onChange={e => {
                      const rawValue = e.target.value.replace(/\D/g, '');
                      updateDocumento(index, { numero: rawValue });
                    }}
                    placeholder="Número do documento"
                    className="h-11"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeDocumento(index)}
                  className="h-11 w-11 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            
            {documentosExtras.length < 5 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={addDocumento}
                className="text-muted-foreground"
              >
                <Plus className="h-4 w-4 mr-1" />
                Adicionar outro documento
              </Button>
            )}
          </div>
        )}
      </div>
      
      {/* Observações */}
      <div className="space-y-2">
        <LabelWithHelp 
          htmlFor="observacoes" 
          label="Observações" 
          help="Anotações internas sobre esta pessoa. Não aparece em documentos oficiais." 
        />
        <Textarea
          id="observacoes"
          ref={el => { fieldRefs.current['observacoes'] = el; }}
          value={form.observacoes}
          onChange={e => updateField('observacoes', e.target.value)}
          placeholder="Anotações livres sobre esta pessoa..."
          rows={4}
          className="resize-none"
        />
        <p className="text-xs text-muted-foreground">
          {form.observacoes.length}/500 caracteres
        </p>
      </div>
    </div>
  );
}












