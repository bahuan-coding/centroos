import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { TooltipHelp } from '@/components/ui/tooltip-help';
import { useProjetoWizard } from '../ProjetoWizardProvider';
import { trpc } from '@/lib/trpc';
import { Building2, User, FileCheck, Info } from 'lucide-react';

export function StepVinculos() {
  const { form, updateField, fieldRefs } = useProjetoWizard();
  
  const { data: centrosCusto = [] } = trpc.centroCusto.list.useQuery({ ativo: true });
  const { data: pessoasData } = trpc.pessoas.list.useQuery();
  const pessoas = pessoasData?.pessoas ?? [];
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 mb-1">Vínculos e Governança</h2>
        <p className="text-sm text-muted-foreground">
          Vincule o projeto a centro de custo, responsável e configure parcerias.
        </p>
      </div>
      
      <div className="grid gap-6">
        {/* Centro de Custo */}
        <div className="space-y-2">
          <Label htmlFor="projeto-centro" className="flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
            Centro de Custo
            <TooltipHelp 
              content="Vincule o projeto a um centro de custo para consolidar despesas. As despesas do projeto serão contabilizadas no centro vinculado para fins de relatórios gerenciais."
            />
          </Label>
          <Select
            value={form.centroCustoId || 'none'}
            onValueChange={(v) => updateField('centroCustoId', v === 'none' ? '' : v)}
          >
            <SelectTrigger 
              id="projeto-centro"
              ref={(el) => { fieldRefs.current['centroCustoId'] = el; }}
              className="max-w-md"
            >
              <SelectValue placeholder="Selecionar centro de custo (opcional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">
                <span className="text-muted-foreground">Nenhum centro vinculado</span>
              </SelectItem>
              {centrosCusto.map((cc) => (
                <SelectItem key={cc.id} value={cc.id}>
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-muted px-1 rounded">{cc.codigo}</code>
                    <span>{cc.nome}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Responsável */}
        <div className="space-y-2">
          <Label htmlFor="projeto-responsavel" className="flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            Responsável
            <TooltipHelp 
              content="Pessoa responsável pela gestão do projeto. Será notificada sobre aprovações e poderá prestar contas. Importante para governança e auditoria."
            />
          </Label>
          <Select
            value={form.responsavelId || 'none'}
            onValueChange={(v) => updateField('responsavelId', v === 'none' ? '' : v)}
          >
            <SelectTrigger 
              id="projeto-responsavel"
              ref={(el) => { fieldRefs.current['responsavelId'] = el; }}
              className="max-w-md"
            >
              <SelectValue placeholder="Selecionar responsável (opcional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">
                <span className="text-muted-foreground">Nenhum responsável</span>
              </SelectItem>
              {pessoas.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* MROSC */}
        <div className="p-4 rounded-xl border bg-purple-50/50 border-purple-200">
          <div className="flex items-start gap-3">
            <Checkbox
              id="projeto-mrosc"
              checked={form.parceriaMrosc}
              onCheckedChange={(checked) => updateField('parceriaMrosc', !!checked)}
              className="mt-1"
            />
            <div className="flex-1">
              <Label 
                htmlFor="projeto-mrosc" 
                className="flex items-center gap-1.5 cursor-pointer font-medium text-purple-800"
              >
                <FileCheck className="h-4 w-4" />
                Parceria MROSC (Lei 13.019/2014)
                <TooltipHelp 
                  content="Marco Regulatório das Organizações da Sociedade Civil. Marque se este projeto é financiado por termo de fomento, colaboração ou acordo de cooperação com órgão público. Exige prestação de contas específica."
                  side="right"
                />
              </Label>
              <p className="text-sm text-purple-700 mt-1">
                Este projeto é financiado por parceria com órgão público
              </p>
            </div>
          </div>
          
          {form.parceriaMrosc && (
            <div className="mt-4 pt-4 border-t border-purple-200 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="projeto-termo" className="text-sm text-purple-800">
                  Número do Termo/Acordo
                </Label>
                <Input
                  id="projeto-termo"
                  value={form.numeroTermoParceria}
                  onChange={(e) => updateField('numeroTermoParceria', e.target.value)}
                  placeholder="Ex: 001/2025"
                  className="bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="projeto-orgao" className="text-sm text-purple-800">
                  Órgão Parceiro
                </Label>
                <Input
                  id="projeto-orgao"
                  value={form.orgaoParceiro}
                  onChange={(e) => updateField('orgaoParceiro', e.target.value)}
                  placeholder="Ex: Secretaria de Assistência Social"
                  className="bg-white"
                />
              </div>
            </div>
          )}
        </div>
        
        {/* Info MROSC */}
        {form.parceriaMrosc && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 border border-blue-200">
            <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-blue-800">Projeto com parceria MROSC</p>
              <p className="text-sm text-blue-700 mt-1">
                Este projeto exigirá prestação de contas específica conforme Lei 13.019/2014. 
                Mantenha documentação organizada e prazos em dia.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}









