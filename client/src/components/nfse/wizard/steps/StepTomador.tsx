import { User, MapPin, Mail } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { MaskedInput } from '@/components/ui/masked-input';
import { FormSection, FormRow, FormField } from '@/components/ui/form-section';
import { LabelWithHelp } from '@/components/ui/tooltip-help';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNfseWizard } from '../NfseWizardProvider';

const TIPOS_LOGRADOURO = [
  { value: 'R', label: 'Rua' },
  { value: 'AV', label: 'Avenida' },
  { value: 'AL', label: 'Alameda' },
  { value: 'PCA', label: 'Praça' },
  { value: 'EST', label: 'Estrada' },
  { value: 'ROD', label: 'Rodovia' },
  { value: 'TV', label: 'Travessa' },
  { value: 'LRG', label: 'Largo' },
];

const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

export function StepTomador() {
  const { form, updateTomador, updateEndereco, errors } = useNfseWizard();
  const { tomador } = form;
  const cpfCnpj = tomador.cpfCnpj.replace(/\D/g, '');
  const isCNPJ = cpfCnpj.length > 11;
  
  return (
    <div className="space-y-8">
      <div className="text-center pb-4 border-b">
        <h2 className="text-xl font-semibold text-slate-900">Dados do Tomador</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Informe os dados do cliente que está contratando o serviço
        </p>
      </div>
      
      <FormSection title="Identificação" icon={<User className="h-5 w-5" />}>
        <FormRow>
          <FormField error={errors['tomador.cpfCnpj']}>
            <LabelWithHelp
              label="CPF ou CNPJ"
              help="Documento do tomador do serviço. Obrigatório para emissão da NFS-e."
              required
            />
            <MaskedInput
              maskType={isCNPJ ? 'cnpj' : 'cpf'}
              value={tomador.cpfCnpj}
              onChange={(val) => updateTomador('cpfCnpj', val)}
              showValidation
            />
          </FormField>
          
          <FormField error={errors['tomador.razaoSocial']}>
            <LabelWithHelp
              label={isCNPJ ? 'Razão Social' : 'Nome Completo'}
              help={isCNPJ ? 'Nome empresarial conforme CNPJ' : 'Nome completo do tomador pessoa física'}
              required={isCNPJ}
            />
            <Input
              value={tomador.razaoSocial}
              onChange={(e) => updateTomador('razaoSocial', e.target.value)}
              placeholder={isCNPJ ? 'Empresa Exemplo LTDA' : 'João da Silva'}
              maxLength={115}
            />
          </FormField>
        </FormRow>
        
        <FormRow>
          <FormField>
            <LabelWithHelp
              label="Inscrição Municipal (CCM)"
              help="Cadastro de Contribuintes Mobiliários do tomador, se possuir em São Paulo"
            />
            <Input
              value={tomador.inscricaoMunicipal}
              onChange={(e) => updateTomador('inscricaoMunicipal', e.target.value.replace(/\D/g, ''))}
              placeholder="00000000"
              maxLength={8}
              className="font-mono"
            />
          </FormField>
          
          <FormField>
            <LabelWithHelp
              label="E-mail"
              help="E-mail para envio da NFS-e ao tomador"
            />
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="email"
                value={tomador.email}
                onChange={(e) => updateTomador('email', e.target.value)}
                placeholder="cliente@email.com"
                className="pl-10"
              />
            </div>
          </FormField>
        </FormRow>
      </FormSection>
      
      <FormSection title="Endereço" icon={<MapPin className="h-5 w-5" />} description="Opcional para CPF, recomendado para CNPJ">
        <FormRow>
          <FormField>
            <LabelWithHelp label="CEP" help="Código de Endereçamento Postal" />
            <MaskedInput
              maskType="cep"
              value={tomador.endereco.cep}
              onChange={(val) => updateEndereco('cep', val)}
              showValidation
            />
          </FormField>
          
          <FormField>
            <LabelWithHelp label="Tipo" help="Tipo de logradouro" />
            <Select
              value={tomador.endereco.tipoLogradouro}
              onValueChange={(v) => updateEndereco('tipoLogradouro', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {TIPOS_LOGRADOURO.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </FormRow>
        
        <FormRow>
          <FormField className="sm:col-span-2">
            <LabelWithHelp label="Logradouro" help="Nome da rua, avenida, etc." />
            <Input
              value={tomador.endereco.logradouro}
              onChange={(e) => updateEndereco('logradouro', e.target.value)}
              placeholder="Nome da rua"
              maxLength={125}
            />
          </FormField>
        </FormRow>
        
        <FormRow>
          <FormField>
            <LabelWithHelp label="Número" help="Número do endereço" />
            <Input
              value={tomador.endereco.numeroEndereco}
              onChange={(e) => updateEndereco('numeroEndereco', e.target.value)}
              placeholder="123"
              maxLength={10}
            />
          </FormField>
          
          <FormField>
            <LabelWithHelp label="Complemento" help="Apartamento, sala, etc." />
            <Input
              value={tomador.endereco.complementoEndereco}
              onChange={(e) => updateEndereco('complementoEndereco', e.target.value)}
              placeholder="Sala 101"
              maxLength={30}
            />
          </FormField>
        </FormRow>
        
        <FormRow>
          <FormField>
            <LabelWithHelp label="Bairro" help="Bairro do endereço" />
            <Input
              value={tomador.endereco.bairro}
              onChange={(e) => updateEndereco('bairro', e.target.value)}
              placeholder="Centro"
              maxLength={60}
            />
          </FormField>
          
          <FormField>
            <LabelWithHelp label="UF" help="Estado" />
            <Select
              value={tomador.endereco.uf}
              onValueChange={(v) => updateEndereco('uf', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="UF" />
              </SelectTrigger>
              <SelectContent>
                {UFS.map(uf => (
                  <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </FormRow>
      </FormSection>
    </div>
  );
}

