import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TooltipHelp } from '@/components/ui/tooltip-help';
import { useFundoWizard, RegraFundo } from '../FundoWizardProvider';
import { RegraWizard } from '../RegraWizard';
import { Plus, Edit2, Trash2, Shield, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export function StepRegras() {
  const { form, removeRegra, updateRegra, regraConfig } = useFundoWizard();
  const [showRegraWizard, setShowRegraWizard] = useState(false);
  const [editingRegraIndex, setEditingRegraIndex] = useState<number | null>(null);
  
  const handleAddRegra = (regra: RegraFundo) => {
    setShowRegraWizard(false);
  };
  
  const handleEditRegra = (index: number) => {
    setEditingRegraIndex(index);
    setShowRegraWizard(true);
  };
  
  const handleSaveRegra = (regra: RegraFundo) => {
    if (editingRegraIndex !== null) {
      updateRegra(editingRegraIndex, regra);
    }
    setEditingRegraIndex(null);
    setShowRegraWizard(false);
  };
  
  const handleCloseRegraWizard = () => {
    setEditingRegraIndex(null);
    setShowRegraWizard(false);
  };
  
  const getImpactPreview = (regra: RegraFundo) => {
    const config = regraConfig[regra.tipoRegra];
    if (!config) return null;
    
    switch (regra.tipoRegra) {
      case 'valor_maximo':
        return `Consumos acima de R$ ${parseFloat(regra.parametroNumerico || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })} irão para aprovação`;
      case 'aprovador_obrigatorio':
        return 'Todo consumo deste fundo requer aprovação prévia';
      case 'percentual_receita':
        return `${regra.parametroNumerico}% das receitas serão automaticamente destinados a este fundo`;
      case 'categoria_permitida':
        return `Consumo permitido apenas para: ${regra.parametroTexto || 'categorias definidas'}`;
      case 'categoria_proibida':
        return `Consumo proibido para: ${regra.parametroTexto || 'categorias definidas'}`;
      default:
        return config.description;
    }
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 mb-1">Regras do Fundo</h2>
        <p className="text-sm text-muted-foreground">
          Configure regras de controle para alocação e consumo de recursos.
        </p>
      </div>
      
      {/* Info sobre regras */}
      <div className="p-4 rounded-xl bg-zinc-50 border">
        <div className="flex items-start gap-3">
          <Shield className="h-5 w-5 text-zinc-500 mt-0.5" />
          <div>
            <p className="font-medium text-sm text-zinc-700">Por que configurar regras?</p>
            <p className="text-sm text-muted-foreground mt-1">
              Regras garantem controle sobre uso dos recursos. Por exemplo: exigir aprovação para 
              consumos acima de determinado valor, ou limitar a categorias específicas.
            </p>
          </div>
        </div>
      </div>
      
      {/* Lista de regras */}
      <div className="space-y-3">
        {form.regras.length === 0 ? (
          <div className="text-center py-8 px-4 rounded-xl border-2 border-dashed">
            <Shield className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-muted-foreground mb-4">Nenhuma regra configurada</p>
            <Button onClick={() => setShowRegraWizard(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Regra
            </Button>
          </div>
        ) : (
          <>
            {form.regras.map((regra, index) => {
              const config = regraConfig[regra.tipoRegra];
              const impact = getImpactPreview(regra);
              
              return (
                <Card key={index} className={cn("p-4", !regra.ativo && "opacity-50")}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">
                          {config?.label || regra.tipoRegra}
                        </span>
                        {!regra.ativo && (
                          <Badge variant="outline" className="text-xs">Inativa</Badge>
                        )}
                      </div>
                      
                      {/* Parâmetros */}
                      <div className="text-sm text-muted-foreground mb-2">
                        {regra.parametroNumerico && (
                          <span className="font-mono bg-muted px-1.5 py-0.5 rounded">
                            {config?.needsNumeric && regra.tipoRegra === 'percentual_receita' 
                              ? `${regra.parametroNumerico}%`
                              : `R$ ${parseFloat(regra.parametroNumerico).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                            }
                          </span>
                        )}
                        {regra.parametroTexto && (
                          <span className="bg-muted px-1.5 py-0.5 rounded">
                            {regra.parametroTexto}
                          </span>
                        )}
                      </div>
                      
                      {/* Preview do impacto */}
                      {impact && (
                        <div className="flex items-start gap-2 p-2 rounded bg-blue-50 border border-blue-100">
                          <Info className="h-3.5 w-3.5 text-blue-600 mt-0.5 shrink-0" />
                          <p className="text-xs text-blue-700">{impact}</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditRegra(index)}
                        className="h-8 w-8"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeRegra(index)}
                        className="h-8 w-8 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
            
            <Button 
              variant="outline" 
              onClick={() => setShowRegraWizard(true)}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Regra
            </Button>
          </>
        )}
      </div>
      
      {/* Dica por tipo de fundo */}
      {form.tipo === 'restrito' && form.regras.length === 0 && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200">
          <h4 className="font-medium text-sm text-rose-800 mb-2">⚠️ Fundo Restrito sem Regras</h4>
          <p className="text-sm text-rose-700">
            Fundos restritos geralmente requerem regras de controle para garantir o uso 
            correto dos recursos conforme definido pelo doador. Considere adicionar pelo menos 
            uma regra de aprovação obrigatória.
          </p>
        </div>
      )}
      
      {/* Modal de regra */}
      {showRegraWizard && (
        <RegraWizard
          regra={editingRegraIndex !== null ? form.regras[editingRegraIndex] : undefined}
          onSave={editingRegraIndex !== null ? handleSaveRegra : handleAddRegra}
          onClose={handleCloseRegraWizard}
        />
      )}
    </div>
  );
}










